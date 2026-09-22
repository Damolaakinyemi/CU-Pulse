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
refit on the full history. Intervals are Gaussian in log space, widening
with the square root of the horizon from the model's one-step residual
spread; the backtest reports how often the realized values actually fell
inside them, so the intervals are checked rather than assumed.

The net worth ratio is forecast in levels (percentage points), not logs.
"""

import warnings

import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing

HORIZON = 4
ORIGINS = 8
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


def _backtest(model: str, y: np.ndarray, log: bool, quarters: list) -> dict:
    back = lambda v: np.exp(v) if log else v
    errors, hits, trail = [], {k: [] for k in Z}, []
    by_h = {h: [] for h in range(1, HORIZON + 1)}
    n = len(y)
    for origin in range(n - HORIZON - ORIGINS + 1, n - HORIZON + 1):
        point, sigma = _fit(model, y[:origin])
        actual = y[origin:origin + HORIZON]
        for h in range(HORIZON):
            spread = sigma * np.sqrt(h + 1)
            real, pred = back(actual[h]), back(point[h])
            err = abs(pred - real) / abs(real) if log else abs(pred - real)
            errors.append(err)
            by_h[h + 1].append(err)
            for k, z in Z.items():
                hits[k].append(abs(actual[h] - point[h]) <= z * spread)
            trail.append({"origin": quarters[origin - 1], "quarter": quarters[origin + h], "h": h + 1,
                          "predicted": float(pred), "actual": float(real),
                          "lo80": float(back(point[h] - Z["80"] * spread)),
                          "hi80": float(back(point[h] + Z["80"] * spread))})
    return {
        "trail": trail,
        "error": float(np.mean(errors)),
        "error_by_horizon": {str(h): float(np.mean(v)) for h, v in by_h.items()},
        **{f"coverage{k}": float(np.mean(v)) for k, v in hits.items()},
    }


def _next_quarters(last: str) -> list:
    p = pd.Period(last, freq="Q")
    return [str(p + h) for h in range(1, HORIZON + 1)]


def forecast_series(history: pd.Series, log: bool) -> dict:
    """history: values indexed by quarter string, oldest first, no gaps."""
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
            **{f"lo{k}": float(back(point[h] - z * spread)) for k, z in Z.items()},
            **{f"hi{k}": float(back(point[h] + z * spread)) for k, z in Z.items()},
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
    }


def forecast_cu(rows: pd.DataFrame) -> dict:
    rows = rows.sort_values("quarter").set_index("quarter")
    # Use the longest run of consecutive quarters ending at the latest filing.
    periods = pd.PeriodIndex(rows.index, freq="Q")
    breaks = np.where(np.diff(periods.asi8) != 1)[0]
    if len(breaks):
        rows = rows.iloc[breaks[-1] + 1:]
    out = {}
    for key, spec in SERIES.items():
        history = rows[key].dropna()
        if spec["log"]:
            history = history[history > 0]
        if len(history) < HORIZON + ORIGINS + 2:
            out[key] = None
            continue
        out[key] = {"label": spec["label"], "accounts": spec["accounts"], **forecast_series(history, spec["log"])}
    return {"horizon": HORIZON, "origins": ORIGINS, "series": out}
