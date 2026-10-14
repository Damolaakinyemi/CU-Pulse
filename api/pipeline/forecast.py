"""Four-quarter-ahead forecasts with a rolling-origin backtest.

For each balance-sheet series, three candidate models are fitted:

  drift  random walk with drift on log levels (the benchmark)
  ets    Holt-Winters exponential smoothing on log levels: additive damped
         trend, additive quarterly seasonality
  arima  ARIMA(1,1,0) with drift on log levels

Each candidate is scored on a rolling-origin backtest: from each of the last
eight origins it forecasts four quarters it has not seen, and the errors are
compared with what was actually reported. The model with the lowest mean
absolute percentage error across all origins and horizons is selected and
refit on the full history. Intervals are centred on the point forecast and
widen with the square root of the horizon from the model's one-step residual
spread. That spread is measured in-sample, and forecast errors drift over time
(recently they have run larger than the spread implies), so Gaussian
multipliers leave the ranges too narrow and no fixed correction holds.

The forward ranges are therefore recalibrated from recent errors. For each
series and horizon, `pipeline.backtest_all` pools the standardized out-of-sample
errors (|error| / spread) of every credit union over the six most recent
backtest origins whose outcome is already known, and stores the quantiles that
contain 50/80/95% of them. Forward ranges use those multipliers; without a
calibration file they fall back to Gaussian. The per-credit-union backtest
tables stay on the plain Gaussian ranges, so they are never graded with
multipliers fitted to the same errors. The industry-wide run scores the
recalibration causally: each forecast is judged with multipliers built only
from outcomes known when it was made.

The net worth ratio is forecast in levels (percentage points), not logs.
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing

CALIBRATION_FILE = Path(__file__).resolve().parent.parent / "data" / "processed" / "interval_calibration.json"
LEVELS = {"50": 0.5, "80": 0.8, "95": 0.95}
HORIZON = 4
ORIGINS = 8          # scoring window: the model is chosen on the first 4 of these origins and scored on the last 4
CAL_ORIGINS = 12     # backtest depth for calibration: the 8 above plus 4 earlier origins
CAL_WINDOW = 6       # recent, fully known origins whose errors set the multipliers
MIN_HISTORY = 16
Z = {"50": 0.6745, "80": 1.2816, "95": 1.9600}

SERIES = {
    "total_assets": {"label": "Total assets", "log": True, "accounts": ["ACCT_010"]},
    "total_loans": {"label": "Total loans and leases", "log": True, "accounts": ["ACCT_025B"]},
    "total_shares_deposits": {"label": "Total shares and deposits", "log": True, "accounts": ["ACCT_018"]},
    "net_worth_ratio": {"label": "Net worth ratio", "log": False, "accounts": ["ACCT_997", "ACCT_010"]},
}
MODELS = {
    "drift": "Random walk with drift",
    "ets": "Exponential smoothing (damped trend, quarterly seasonal)",
    "arima": "ARIMA(1,1,0) with drift",
}


def load_calibration(path: Path = CALIBRATION_FILE) -> dict | None:
    """{series: {horizon: {level: multiplier}}}, or None when no calibration has been built."""
    try:
        return json.loads(Path(path).read_text())["calibration"]
    except (OSError, ValueError, KeyError):
        return None


def _mult(calib: dict | None, h: int, level: str) -> float:
    """Interval multiplier at horizon h (1-based): calibrated if available, else Gaussian."""
    try:
        return float(calib[str(h)][level])
    except (TypeError, KeyError):
        return Z[level]


def _fit(model: str, y: np.ndarray):
    """Return (point forecasts for 1..HORIZON, one-step residual std) on the transformed scale."""
    if model == "drift":
        diffs = np.diff(y)[-12:]
        step = diffs.mean()
        return y[-1] + step * np.arange(1, HORIZON + 1), diffs.std(ddof=1)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        if model == "ets":
            fit = ExponentialSmoothing(y, trend="add", damped_trend=True, seasonal="add", seasonal_periods=4,
                                       initialization_method="estimated").fit()
            resid = y - fit.fittedvalues
        else:
            fit = ARIMA(y, order=(1, 1, 0), trend="t").fit()
            resid = fit.resid[1:]
    return np.asarray(fit.forecast(HORIZON)), np.std(resid[-16:], ddof=1)


def _backtest(model: str, y: np.ndarray, log: bool, quarters: list, origins: int = ORIGINS) -> dict:
    """Rolling-origin backtest on plain Gaussian ranges (never graded with fitted multipliers)."""
    back = lambda v: np.exp(v) if log else v
    errors, hits, trail = [], {k: [] for k in Z}, []
    by_h = {h: [] for h in range(1, HORIZON + 1)}
    n = len(y)
    for origin in range(n - HORIZON - origins + 1, n - HORIZON + 1):
        point, sigma = _fit(model, y[:origin])
        actual = y[origin:origin + HORIZON]
        for h in range(HORIZON):
            spread = sigma * np.sqrt(h + 1)
            real, pred = back(actual[h]), back(point[h])
            err = abs(pred - real) / abs(real) if log else abs(pred - real)
            errors.append(err)
            by_h[h + 1].append(err)
            miss = abs(actual[h] - point[h])
            for k, z in Z.items():
                hits[k].append(miss <= z * spread)
            w80 = Z["80"] * spread
            trail.append({"origin": quarters[origin - 1], "quarter": quarters[origin + h], "h": h + 1,
                          "predicted": float(pred), "actual": float(real),
                          "lo80": float(back(point[h] - w80)), "hi80": float(back(point[h] + w80)),
                          "z": float(miss / spread) if spread > 0 else (0.0 if miss == 0 else float("inf"))})
    return {
        "trail": trail,
        "error": float(np.mean(errors)),
        "error_by_horizon": {str(h): float(np.mean(v)) for h, v in by_h.items()},
        **{f"coverage{k}": float(np.mean(v)) for k, v in hits.items()},
    }


def _next_quarters(last: str) -> list:
    p = pd.Period(last, freq="Q")
    return [str(p + h) for h in range(1, HORIZON + 1)]


def forecast_series(history: pd.Series, log: bool, calib: dict | None = None) -> dict:
    """history: values indexed by quarter string, oldest first, no gaps.

    calib: {horizon: {level: multiplier}} for this series, or None for Gaussian multipliers. It sets the
    forward ranges only; the backtest stays on Gaussian ranges.
    """
    y = np.log(history.values) if log else history.values.astype(float)
    candidates = ["drift", "ets", "arima"] if len(y) >= MIN_HISTORY + HORIZON else ["drift"]
    scores = {}
    for model in candidates:
        try:
            scores[model] = _backtest(model, y, log, list(history.index))
        except Exception:  # a model that cannot fit this series simply drops out
            continue
    chosen = min(scores, key=lambda m: scores[m]["error"])
    point, sigma = _fit(chosen, y)
    back = (lambda v: np.exp(v)) if log else (lambda v: v)
    path = []
    for h, quarter in enumerate(_next_quarters(history.index[-1])):
        spread = sigma * np.sqrt(h + 1)
        path.append({
            "quarter": quarter,
            "point": float(back(point[h])),
            **{f"lo{k}": float(back(point[h] - _mult(calib, h + 1, k) * spread)) for k in Z},
            **{f"hi{k}": float(back(point[h] + _mult(calib, h + 1, k) * spread)) for k in Z},
        })
    benchmark = scores.get("drift", {}).get("error")
    return {
        "model": chosen,
        "model_label": MODELS[chosen],
        "error_metric": "MAPE" if log else "MAE (ratio points)",
        "skill_vs_drift": None if not benchmark or chosen == "drift" else float(1 - scores[chosen]["error"] / benchmark),
        "backtest": {m: {"label": MODELS[m], **{k: v for k, v in s.items() if k != "trail"}} for m, s in scores.items()},
        "trail": scores[chosen]["trail"],
        "origin": history.index[-1],
        "path": path,
        # how far the forward ranges were widened relative to the model's own Gaussian ranges (80% level)
        "interval": {"calibrated": bool(calib), "widen80": [round(_mult(calib, h, "80") / Z["80"], 2) for h in range(1, HORIZON + 1)]},
    }


def _unbroken(rows: pd.DataFrame) -> pd.DataFrame:
    """The longest run of consecutive quarters ending at the latest filing."""
    rows = rows.sort_values("quarter").set_index("quarter")
    periods = pd.PeriodIndex(rows.index, freq="Q")
    breaks = np.where(np.diff(periods.asi8) != 1)[0]
    return rows.iloc[breaks[-1] + 1:] if len(breaks) else rows


def honest_eval(history: pd.Series, log: bool, select_on: int = 4) -> dict:
    """Out-of-sample check that does not grade the model on the data used to pick it.

    Every candidate is backtested from the usual eight origins. The model is
    chosen on the earliest `select_on` origins only, then it and the drift
    benchmark are scored on the later origins, which played no part in the choice.

    The chosen model's standardized errors (|error| / spread, by origin and
    horizon) are also returned, from up to `CAL_ORIGINS` origins, so the
    industry-wide run can calibrate intervals from errors that were already
    known at each point in time. The extra origins never affect the choice or the score.
    """
    y = np.log(history.values) if log else history.values.astype(float)
    quarters = list(history.index)
    candidates = ["drift", "ets", "arima"] if len(y) >= MIN_HISTORY + HORIZON else ["drift"]
    trails = {}
    for model in candidates:
        try:
            trails[model] = _backtest(model, y, log, quarters)["trail"]
        except Exception:
            continue
    origins = sorted({t["origin"] for t in trails["drift"]})
    early, late = set(origins[:select_on]), set(origins[select_on:])

    def err(trail, keep):
        e = [abs(t["predicted"] - t["actual"]) / abs(t["actual"]) if log else abs(t["predicted"] - t["actual"])
             for t in trail if t["origin"] in keep]
        return float(np.mean(e)) if e else None

    def cover(trail, keep):
        hits = [t["lo80"] <= t["actual"] <= t["hi80"] for t in trail if t["origin"] in keep]
        return float(np.mean(hits)) if hits else None

    chosen = min(trails, key=lambda m: err(trails[m], early))
    deep = trails[chosen]
    if len(y) >= CAL_ORIGINS + HORIZON + MIN_HISTORY - 1:
        try:
            deep = _backtest(chosen, y, log, quarters, origins=CAL_ORIGINS)["trail"]
        except Exception:  # keep the eight origins already in hand
            pass
    z = {}
    for t in deep:
        z.setdefault(t["origin"], []).append(t["z"])
    return {
        "chosen": chosen,
        "error": err(trails[chosen], late),
        "drift_error": err(trails["drift"], late),
        "coverage80": cover(trails[chosen], late),
        "z": z,
        "late_origins": sorted(late),
    }


def forecast_cu(rows: pd.DataFrame) -> dict:
    rows = _unbroken(rows)
    calibration = load_calibration()
    out = {}
    for key, spec in SERIES.items():
        history = rows[key].dropna()
        if spec["log"]:
            history = history[history > 0]
        if len(history) < HORIZON + ORIGINS + 2:
            out[key] = None
            continue
        out[key] = {"label": spec["label"], "accounts": spec["accounts"],
                    **forecast_series(history, spec["log"], (calibration or {}).get(key))}
    return {"horizon": HORIZON, "origins": ORIGINS, "series": out}
