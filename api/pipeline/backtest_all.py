"""Industry-wide forecast evaluation: every active credit union, honestly scored.

For each credit union with enough unbroken history, `honest_eval` picks a model
on the earliest four backtest origins and scores it on the last four, which the
choice never saw. Results are summarised overall and by asset size and written
to data/processed/backtest_summary.json for the app.

Run from api/:  .venv/bin/python -m pipeline.backtest_all   (about 20 minutes on 8 cores)
"""

import json
import os
import sys
import time
from multiprocessing import Pool

import numpy as np
import pandas as pd

from pipeline.forecast import HORIZON, MODELS, ORIGINS, SERIES, _unbroken, honest_eval
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


def summarise(results: list, series: str) -> dict:
    rows = [r[series] for r in results if series in r and r[series]["error"] is not None]
    if not rows:
        return None
    err = np.array([r["error"] for r in rows])
    base = np.array([r["drift_error"] for r in rows])
    cov = np.array([r["coverage80"] for r in rows])
    skill = 1 - np.median(err) / np.median(base)
    return {
        "n": len(rows),
        "median_error": float(np.median(err)),
        "median_drift_error": float(np.median(base)),
        "skill_vs_drift": float(skill),
        "beats_drift_share": float(np.mean(err < base)),
        "ties_drift_share": float(np.mean(err == base)),
        "coverage80_mean": float(np.mean(cov)),
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
    summary = {
        "as_of": latest_q,
        "credit_unions": len(results),
        "method": "Model chosen on the earliest 4 of 8 rolling origins; scored on the last 4 (16 forecasts per series per credit union, 1–4 quarters ahead) against a random walk with drift.",
        "error_metric": {k: ("MAPE" if v["log"] else "MAE, ratio points") for k, v in SERIES.items()},
        "labels": {k: v["label"] for k, v in SERIES.items()},
        "models": MODELS,
        "overall": {k: summarise(results, k) for k in SERIES},
        "by_band": {label: {k: summarise([r for r in results if r["band"] == label], k) for k in SERIES}
                    for _, _, label in BANDS},
        "runtime_seconds": round(time.time() - start),
    }
    with open(OUT, "w") as fh:
        json.dump(summary, fh, indent=1)
    print(json.dumps(summary["overall"], indent=1))


if __name__ == "__main__":
    main()
