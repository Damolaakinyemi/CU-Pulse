"""Derive CU Pulse ratios from Call Report balances, and build peer sets.

Every ratio is a decimal (0.105 = 10.5%). Flows reported year-to-date are
annualized (x 4 / quarter number) and divided by the average of the current
balance and the prior year-end balance, as in NCUA's Financial Performance
Report. Definitions are served to the UI from DEFINITIONS so each figure can
name its source accounts.
"""

import re

import numpy as np
import pandas as pd

DEFINITIONS = {
    "net_worth_ratio": {
        "label": "Net worth ratio",
        "formula": "As reported to NCUA (ACCT_998); total net worth ÷ total assets where not reported",
        "accounts": ["ACCT_998", "ACCT_997", "ACCT_010"],
        "better": "higher",
    },
    "loan_growth_yoy": {
        "label": "Loan growth",
        "formula": "Total loans and leases ÷ same quarter prior year − 1",
        "accounts": ["ACCT_025B"],
        "better": None,
    },
    "deposit_growth_yoy": {
        "label": "Share & deposit growth",
        "formula": "Total shares and deposits ÷ same quarter prior year − 1",
        "accounts": ["ACCT_018"],
        "better": None,
    },
    "delinquency_rate": {
        "label": "Delinquency rate",
        "formula": "Loans delinquent 60+ days ÷ total loans and leases",
        "accounts": ["ACCT_041B", "ACCT_025B"],
        "better": "lower",
    },
    "roa": {
        "label": "Return on assets",
        "formula": "Annualized YTD net income ÷ average assets (current and prior year-end)",
        "accounts": ["ACCT_661A", "ACCT_010"],
        "better": "higher",
    },
    "net_charge_off_rate": {
        "label": "Net charge-off rate",
        "formula": "Annualized YTD charge-offs less recoveries ÷ average loans",
        "accounts": ["ACCT_550", "ACCT_551", "ACCT_025B"],
        "better": "lower",
    },
    "loan_to_share": {
        "label": "Loan-to-share ratio",
        "formula": "Total loans and leases ÷ total shares and deposits",
        "accounts": ["ACCT_025B", "ACCT_018"],
        "better": None,
    },
}
METRICS = list(DEFINITIONS)
HEADLINE = ["net_worth_ratio", "loan_growth_yoy", "deposit_growth_yoy", "delinquency_rate", "roa"]

PEER_COUNT = 25

# NCUA Prompt Corrective Action net worth categories, 12 CFR 702.102.
PCA_TIERS = [
    {"label": "Well capitalized", "min": 0.07},
    {"label": "Adequately capitalized", "min": 0.06},
    {"label": "Undercapitalized", "min": 0.04},
    {"label": "Significantly undercapitalized", "min": 0.02},
    {"label": "Critically undercapitalized", "min": float("-inf")},
]

_UPPER = {"FCU", "CU", "USA", "US", "IBM", "USAA", "NASA", "TVA", "SECU", "PSECU", "GTE", "DC", "NY", "NJ", "PA", "VA",
          "MD", "TX", "CA", "FL", "GA", "NC", "SC", "IBEW", "UAW", "AFL", "CIO", "TCU", "ECU", "FAA", "HP", "II", "III", "IV"}
_LOWER = {"of", "and", "the", "for", "at", "in", "on", "de"}


def display_name(raw: str) -> str:
    """NCUA publishes names in upper case; render them as an analyst would type them."""
    words = []
    for i, token in enumerate(str(raw).split()):
        bare = re.sub(r"[^A-Za-z]", "", token)
        if bare.upper() in _UPPER or (bare and not re.search(r"[AEIOUY]", bare.upper())):
            words.append(token.upper())
        elif i > 0 and token.lower() in _LOWER:
            words.append(token.lower())
        else:
            words.append("-".join(part.capitalize() for part in token.lower().split("-")))
    return " ".join(words)


def pca_tier(ratio: float) -> str:
    for tier in PCA_TIERS:
        if ratio >= tier["min"]:
            return tier["label"]
    return PCA_TIERS[-1]["label"]


def derive(raw: pd.DataFrame) -> pd.DataFrame:
    df = raw.sort_values(["cu_number", "quarter"]).copy()
    df["year"] = df["quarter"].str[:4].astype(int)
    df["qnum"] = df["quarter"].str[-1].astype(int)
    df["period"] = df["year"] * 4 + df["qnum"]  # consecutive integers per quarter

    prior_year = df[["cu_number", "period", "total_loans", "total_shares_deposits", "total_assets"]].copy()
    prior_year["period"] += 4
    df = df.merge(prior_year, on=["cu_number", "period"], how="left", suffixes=("", "_py"))

    year_end = df.loc[df["qnum"] == 4, ["cu_number", "year", "total_assets", "total_loans"]].copy()
    year_end["year"] += 1
    df = df.merge(year_end, on=["cu_number", "year"], how="left", suffixes=("", "_ye"))

    annualize = 4 / df["qnum"]
    avg_assets = (df["total_assets"] + df["total_assets_ye"].fillna(df["total_assets"])) / 2
    avg_loans = (df["total_loans"] + df["total_loans_ye"].fillna(df["total_loans"])) / 2

    with np.errstate(divide="ignore", invalid="ignore"):
        df["loan_growth_yoy"] = df["total_loans"] / df["total_loans_py"] - 1
        df["deposit_growth_yoy"] = df["total_shares_deposits"] / df["total_shares_deposits_py"] - 1
        df["asset_growth_yoy"] = df["total_assets"] / df["total_assets_py"] - 1
        # NCUA's reported ratio is authoritative for PCA: credit unions may measure total
        # assets as an average rather than quarter-end, and CECL transition relief adds to
        # net worth. The simple quotient is kept as a fallback and for transparency.
        df["net_worth_ratio_computed"] = df["net_worth"] / df["total_assets"]
        reported = df["nwr_reported_bp"] / 10000 if "nwr_reported_bp" in df else pd.Series(np.nan, index=df.index)
        df["net_worth_ratio_source"] = np.where(reported.notna(), "reported", "computed")
        df["net_worth_ratio"] = reported.fillna(df["net_worth_ratio_computed"])
        df["delinquency_rate"] = df["delinquent_loans"] / df["total_loans"]
        df["roa"] = df["net_income_ytd"] * annualize / avg_assets
        df["net_charge_off_rate"] = (df["charge_offs_ytd"] - df["recoveries_ytd"]) * annualize / avg_loans
        df["loan_to_share"] = df["total_loans"] / df["total_shares_deposits"]
    df = df.replace([np.inf, -np.inf], np.nan)
    df["display_name"] = df["cu_name"].map(display_name)
    return df.drop(columns=[c for c in df.columns if c.endswith(("_py", "_ye"))] + ["year", "qnum", "period"]).reset_index(drop=True)


def peer_ids(df: pd.DataFrame, cu_number: int, count: int = PEER_COUNT) -> list:
    """The `count` active credit unions nearest the target in log total assets, latest quarter."""
    latest = df[df["quarter"] == df["quarter"].max()]
    target = latest.loc[latest["cu_number"] == cu_number, "total_assets"]
    if target.empty:
        return []
    others = latest[latest["cu_number"] != cu_number]
    distance = (np.log(others["total_assets"]) - np.log(target.iloc[0])).abs()
    return others.loc[distance.nsmallest(count).index, "cu_number"].tolist()


def peer_stats(df: pd.DataFrame, cu_number: int) -> dict:
    """Per-quarter peer quartiles and the target's percentile rank, per metric."""
    ids = peer_ids(df, cu_number)
    peers = df[df["cu_number"].isin(ids)]
    target = df[df["cu_number"] == cu_number].set_index("quarter")
    series = {}
    for metric in METRICS:
        points = []
        for quarter, values in peers.groupby("quarter")[metric]:
            values = values.dropna()
            own = target[metric].get(quarter)
            if len(values) < 5:
                continue
            points.append({
                "quarter": quarter,
                "p25": float(values.quantile(0.25)),
                "median": float(values.median()),
                "p75": float(values.quantile(0.75)),
                "percentile": None if own is None or pd.isna(own) else float((values < own).mean() * 100),
            })
        series[metric] = points

    latest_q = df["quarter"].max()
    latest = df[(df["quarter"] == latest_q) & df["cu_number"].isin(ids)].sort_values("total_assets", ascending=False)
    members = [
        {
            "cu_number": int(r.cu_number),
            "name": r.display_name,
            "state": r.state,
            "total_assets": float(r.total_assets),
            **{m: (None if pd.isna(getattr(r, m)) else float(getattr(r, m))) for m in METRICS},
        }
        for r in latest.itertuples()
    ]
    assets = latest["total_assets"]
    return {
        "method": f"{PEER_COUNT} nearest active credit unions by total assets (log distance), {latest_q}",
        "peer_count": len(ids),
        "asset_range": [float(assets.min()), float(assets.max())] if len(assets) else None,
        "as_of": latest_q,
        "series": series,
        "members": members,
    }
