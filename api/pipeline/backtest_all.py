"""Industry-wide forecast evaluation: every active credit union, honestly scored.

For each credit union with enough unbroken history, `honest_eval` picks a model
on the earliest four backtest origins and scores it on the last four, which the
choice never saw. Results are summarised overall and by asset size and written
to data/processed/backtest_summary.json for the app.

Interval calibration: for each series and horizon, the standardized errors
(|error| / spread) of every credit union over the six most recent backtest
origins whose outcome is already known set the 50/80/95% interval multipliers
(written to data/processed/interval_calibration.json for the live forecasts).
To score this honestly, each of the last four backtest origins is judged with
multipliers built only from outcomes known when it was made, and coverage is
reported next to the plain Gaussian coverage it replaces.

Run from api/:  .venv/bin/python -m pipeline.backtest_all   (about 20 minutes on 8 cores)
"""

from __future__ import annotations

import json
import os
import sys
import time
from multiprocessing import Pool

import numpy as np
import pandas as pd

from pipeline.forecast import CAL_WINDOW, CALIBRATION_FILE, HORIZON, LEVELS, MODELS, ORIGINS, SERIES, Z, _unbroken, honest_eval
from pipeline.metrics import derive

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PANEL = os.path.join(ROOT, "data", "processed", "call_reports.csv.gz")
OUT = os.path.join(ROOT, "data", "processed", "backtest_summary.json")

BANDS = [(0, 50e6, "Under $50M"), (50e6, 500e6, "$50M–$500M"), (500e6, 10e9, "$500M–$10B"), (10e9, float("inf"), "Over $10B")]


def band(assets: float) -> str:
    return next(label for lo, hi, label in BANDS if lo <= assets < hi)


def evaluate(args):
    cu_number, rows = args
    rows = _unbroken(rows)
    out = {"cu_number": int(cu_number), "band": band(rows["total_assets"].iloc[-1])}
    for key, spec in SERIES.items():
        history = rows[key].dropna()
        if spec["log"]:
            history = history[history > 0]
        if len(history) < HORIZON + ORIGINS + 2:
            continue
        try:
            out[key] = honest_eval(history, spec["log"])
        except Exception:
            continue
    return out


MIN_ERRORS = 200  # fewer standardized errors than this: leave the Gaussian multiplier in force


def calibration_table(results: list, series: str, newest: str) -> dict:
    """{horizon: {level: multiplier}} from the CAL_WINDOW origins ending at `newest`, pooled over credit unions."""
    end = pd.Period(newest, freq="Q")
    labels = [str(end - i) for i in range(CAL_WINDOW)]
    table = {}
    for h in range(1, HORIZON + 1):
        zs = [r[series]["z"][lab][h - 1] for r in results if series in r and r[series]["error"] is not None
              for lab in labels if lab in r[series]["z"]]
        zs = np.array([z for z in zs if np.isfinite(z)])
        if len(zs) >= MIN_ERRORS:
            table[str(h)] = {k: float(np.quantile(zs, q)) for k, q in LEVELS.items()}
    return table


def causal_tables(results: list, series: str, late: list) -> dict:
    """For each scored origin, the table an analyst could have built then: only origins four quarters back or earlier."""
    return {lab: calibration_table(results, series, str(pd.Period(lab, freq="Q") - HORIZON)) for lab in late}


def live_widen(calibration: dict) -> dict:
    """How much wider today's 80% forward ranges are than the model's own Gaussian ranges, per series, horizons 1-4."""
    return {k: [round(t[str(h)]["80"] / Z["80"], 2) if str(h) in t else 1.0 for h in range(1, HORIZON + 1)]
            for k, t in calibration.items()}


def coverage(row: dict, tables: dict | None, level: str) -> float:
    """Share of a credit union's scored forecasts inside the range: causal calibrated multipliers, or Gaussian if tables is None."""
    hits = []
    for lab in row["late_origins"]:
        for h, z in enumerate(row["z"][lab], start=1):
            k = Z[level] if tables is None else tables[lab].get(str(h), {}).get(level, Z[level])
            hits.append(z <= k)
    return float(np.mean(hits))


def width_ratio(row: dict, tables: dict, level: str) -> float:
    return float(np.mean([tables[lab].get(str(h), {}).get(level, Z[level]) / Z[level]
                          for lab in row["late_origins"] for h in range(1, HORIZON + 1)]))


def summarise(results: list, series: str, tables: dict) -> dict:
    rows = [r[series] for r in results if series in r and r[series]["error"] is not None]
    if not rows:
        return None
    err = np.array([r["error"] for r in rows])
    base = np.array([r["drift_error"] for r in rows])
    cov_raw = np.array([coverage(r, None, "80") for r in rows])
    cov = np.array([coverage(r, tables, "80") for r in rows])
    skill = 1 - np.median(err) / np.median(base)
    return {
        "n": len(rows),
        "median_error": float(np.median(err)),
        "median_drift_error": float(np.median(base)),
        "skill_vs_drift": float(skill),
        "beats_drift_share": float(np.mean(err < base)),
        "ties_drift_share": float(np.mean(err == base)),
        "coverage80_mean": float(np.mean(cov)),
        "coverage80_uncalibrated_mean": float(np.mean(cov_raw)),
        "coverage_calibrated": {k: float(np.mean([coverage(r, tables, k) for r in rows])) for k in LEVELS},
        "validation_width_ratio80": float(np.mean([width_ratio(r, tables, "80") for r in rows])),
        "coverage_uncalibrated": {k: float(np.mean([coverage(r, None, k) for r in rows])) for k in LEVELS},
        "chosen_share": {m: float(np.mean([r["chosen"] == m for r in rows])) for m in MODELS},
    }


def main():
    df = derive(pd.read_csv(PANEL))
    latest_q = df["quarter"].max()
    active = df.loc[df["quarter"] == latest_q, "cu_number"].unique()
    groups = [(n, g) for n, g in df[df["cu_number"].isin(active)].groupby("cu_number")]
    start = time.time()
    results = []
    with Pool(max(1, (os.cpu_count() or 2) - 1)) as pool:
        for i, r in enumerate(pool.imap_unordered(evaluate, groups, chunksize=8), 1):
            results.append(r)
            if i % 250 == 0:
                print(f"{i}/{len(groups)} credit unions · {time.time() - start:.0f}s", file=sys.stderr)
    finish(results, latest_q, start)


def finish(results: list, latest_q: str, start: float) -> None:
    live_origin = str(pd.Period(latest_q, freq="Q") - HORIZON)  # newest origin whose 4-quarter outcome is known
    calibration = {k: calibration_table(results, k, live_origin) for k in SERIES}
    tables = {k: causal_tables(results, k, sorted({lab for r in results if k in r and r[k]["error"] is not None
                                                   for lab in r[k]["late_origins"]})) for k in SERIES}
    with open(CALIBRATION_FILE, "w") as fh:
        json.dump({
            "as_of": latest_q,
            "method": f"Quantiles of |forecast error| / model spread, pooled across credit unions over the {CAL_WINDOW} most recent backtest origins whose four-quarter outcome is known, per series and horizon.",
            "newest_origin": live_origin,
            "calibration": calibration,
        }, fh, indent=1)
    summary = {
        "as_of": latest_q,
        "credit_unions": len(results),
        "method": "Model chosen on the earliest 4 of 8 rolling origins; scored on the last 4 (16 forecasts per series per credit union, 1–4 quarters ahead) against a random walk with drift.",
        "error_metric": {k: ("MAPE" if v["log"] else "MAE, ratio points") for k, v in SERIES.items()},
        "labels": {k: v["label"] for k, v in SERIES.items()},
        "models": MODELS,
        "interval_method": f"Forward ranges use multipliers recalibrated from the {CAL_WINDOW} most recent origins with known outcomes. Coverage is scored on the last 4 backtest origins, each with multipliers built only from outcomes known when it was made; 'uncalibrated' is the plain Gaussian range. Those scoring windows reached back to older, noisier origins, so the score flatters today's ranges, which are the widths in live_widen80.",
        "live_widen80": live_widen(calibration),
        "overall": {k: summarise(results, k, tables[k]) for k in SERIES},
        "by_band": {label: {k: summarise([r for r in results if r["band"] == label], k, tables[k]) for k in SERIES}
                    for _, _, label in BANDS},
        "runtime_seconds": round(time.time() - start),
    }
    with open(OUT, "w") as fh:
        json.dump(summary, fh, indent=1)
    print(json.dumps(summary["overall"], indent=1))


if __name__ == "__main__":
    main()
