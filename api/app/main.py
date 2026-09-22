"""CU Pulse API: NCUA 5300 Call Report data, peers and forecasts.

Build the data first:  .venv/bin/python -m pipeline.ncua --download
"""

import threading
from functools import lru_cache
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import FastAPI, HTTPException, Query

from pipeline.forecast import MODELS, SERIES, forecast_cu
from pipeline.metrics import DEFINITIONS, HEADLINE, METRICS, PCA_TIERS, derive, pca_tier, peer_stats

DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "processed" / "call_reports.csv.gz"
DEFAULT_CU = 5536  # Navy Federal Credit Union

app = FastAPI(title="CU Pulse API", version="1.0.0")

BALANCES = ["total_assets", "total_loans", "total_shares_deposits", "net_worth", "delinquent_loans", "members",
            "net_income_ytd"]


@lru_cache(maxsize=1)
def dataset() -> pd.DataFrame:
    if not DATA_FILE.exists():
        raise HTTPException(status_code=503, detail="Call Report data has not been built yet. "
                                                    "Run: python -m pipeline.ncua --download")
    return derive(pd.read_csv(DATA_FILE))


def latest_frame() -> pd.DataFrame:
    df = dataset()
    return df[df["quarter"] == df["quarter"].max()]


def num(value):
    return None if value is None or pd.isna(value) else float(value)


def require_cu(cu_number: int) -> pd.DataFrame:
    rows = dataset()[dataset()["cu_number"] == cu_number]
    if rows.empty:
        raise HTTPException(status_code=404, detail=f"No federally insured credit union with charter {cu_number} "
                                                    f"appears in the Call Report data.")
    return rows.sort_values("quarter")


@lru_cache(maxsize=512)
def cached_forecast(cu_number: int) -> dict:
    return forecast_cu(require_cu(cu_number))


@app.on_event("startup")
def warm() -> None:
    # Load the panel and pre-compute the default institution off the request path.
    threading.Thread(target=lambda: cached_forecast(DEFAULT_CU), daemon=True).start()


@app.get("/api/meta")
def meta():
    df = dataset()
    latest = latest_frame()
    by_q = df.groupby("quarter").agg(count=("cu_number", "nunique"), assets=("total_assets", "sum"),
                                     net_worth=("net_worth", "sum"))
    return {
        "source": "NCUA 5300 Call Report, quarterly public data files",
        "source_url": "https://ncua.gov/analysis/credit-union-corporate-call-report-data/quarterly-data",
        "first_quarter": df["quarter"].min(),
        "latest_quarter": df["quarter"].max(),
        "active_count": int(latest["cu_number"].nunique()),
        "industry_assets": float(latest["total_assets"].sum()),
        "industry": [
            {"quarter": q, "count": int(r["count"]), "total_assets": float(r["assets"]),
             "net_worth_ratio": float(r["net_worth"] / r["assets"])}
            for q, r in by_q.iterrows()
        ],
        "default_cu": DEFAULT_CU,
        "definitions": DEFINITIONS,
        "headline": HEADLINE,
        "pca_tiers": [{"label": t["label"], "min": None if t["min"] == float("-inf") else t["min"]} for t in PCA_TIERS],
        "forecast": {"series": {k: v["label"] for k, v in SERIES.items()}, "models": MODELS},
    }


@app.get("/api/credit-unions")
def search(q: Optional[str] = Query(None, description="Name, city, charter number or state"), limit: int = 12):
    latest = latest_frame()
    if q and q.strip():
        needle = q.strip().lower()
        name = latest["display_name"].str.lower()
        mask = (name.str.contains(needle, regex=False) | latest["cu_number"].astype(str).str.startswith(needle)
                | latest["city"].str.lower().str.startswith(needle) | (latest["state"].str.lower() == needle))
        latest = latest[mask].assign(_starts=name[mask].str.startswith(needle))
        latest = latest.sort_values(["_starts", "total_assets"], ascending=[False, False])
    else:
        latest = latest.sort_values("total_assets", ascending=False)
    return {
        "total": int(len(latest)),
        "results": [
            {"cu_number": int(r.cu_number), "name": r.display_name, "city": r.city, "state": r.state,
             "total_assets": float(r.total_assets)}
            for r in latest.head(max(1, min(limit, 50))).itertuples()
        ],
    }


@app.get("/api/credit-unions/{cu_number}")
def institution(cu_number: int):
    rows = require_cu(cu_number)
    last = rows.iloc[-1]
    latest = latest_frame()
    active = last["quarter"] == latest["quarter"].iloc[0]
    rank = int((latest["total_assets"] > last["total_assets"]).sum() + 1) if active else None
    return {
        "cu_number": cu_number,
        "name": last["display_name"],
        "city": last["city"],
        "state": last["state"],
        "charter_type": {1: "Federal charter", 2: "State charter"}.get(int(last["cu_type"]), f"NCUA charter type {int(last['cu_type'])}"),
        "ncua_peer_group": num(last["ncua_peer_group"]),
        "active": bool(active),
        "latest_quarter": last["quarter"],
        "asset_rank": rank,
        "active_count": int(len(latest)),
        "pca_tier": pca_tier(last["net_worth_ratio"]) if pd.notna(last["net_worth_ratio"]) else None,
        "quarters": [
            {"quarter": r["quarter"], **{k: num(r[k]) for k in BALANCES + METRICS}}
            for _, r in rows.iterrows()
        ],
    }


@app.get("/api/credit-unions/{cu_number}/peers")
def peers(cu_number: int):
    require_cu(cu_number)
    return peer_stats(dataset(), cu_number)


@app.get("/api/credit-unions/{cu_number}/forecast")
def forecast(cu_number: int):
    require_cu(cu_number)
    return cached_forecast(cu_number)
