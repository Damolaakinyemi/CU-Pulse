"""Build the CU Pulse panel from NCUA 5300 Call Report quarterly zips.

Input:  data/raw/YYYY-MM.zip  (downloaded by `python -m pipeline.ncua --download`)
Output: data/processed/call_reports.csv.gz, one row per credit union per quarter.

Account codes (see AcctDesc.txt in any quarterly zip):
  FS220  ACCT_010   Total assets
  FS220  ACCT_018   Total shares and deposits
  FS220  ACCT_025B  Total loans and leases
  FS220  ACCT_041B  Delinquent loans and leases, two or more months
  FS220  ACCT_083   Number of current members
  FS220  ACCT_550   Loans charged off, year to date
  FS220  ACCT_551   Recoveries on charged-off loans, year to date
  FS220A ACCT_661A  Net income (loss), year to date
  FS220A ACCT_997   Total net worth
"""

import argparse
import sys
import urllib.request
import zipfile
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed" / "call_reports.csv.gz"
URL = "https://ncua.gov/files/publications/analysis/call-report-data-{cycle}.zip"

ACCOUNTS = {
    "FS220": {
        "ACCT_010": "total_assets",
        "ACCT_018": "total_shares_deposits",
        "ACCT_025B": "total_loans",
        "ACCT_041B": "delinquent_loans",
        "ACCT_083": "members",
        "ACCT_550": "charge_offs_ytd",
        "ACCT_551": "recoveries_ytd",
    },
    "FS220A": {
        "ACCT_661A": "net_income_ytd",
        "ACCT_997": "net_worth",
    },
}
PROFILE = {"CU_NUMBER": "cu_number", "CU_TYPE": "cu_type", "CU_NAME": "cu_name", "CITY": "city", "STATE": "state", "Peer_Group": "ncua_peer_group"}


def cycles(first: str, last: str) -> list:
    """Quarter-end cycles as YYYY-MM between two such strings, inclusive."""
    periods = pd.period_range(pd.Period(first, "M").asfreq("Q"), pd.Period(last, "M").asfreq("Q"), freq="Q")
    return [f"{p.year}-{p.quarter * 3:02d}" for p in periods]


def download(first: str, last: str) -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    for cycle in cycles(first, last):
        target = RAW / f"{cycle}.zip"
        if target.exists() and target.stat().st_size > 0:
            continue
        print(f"downloading {cycle}", file=sys.stderr)
        urllib.request.urlretrieve(URL.format(cycle=cycle), target)


def _member(zf: zipfile.ZipFile, table: str) -> str:
    names = {n.upper(): n for n in zf.namelist()}
    return names[f"{table}.TXT"]


def _read(zf: zipfile.ZipFile, table: str, columns: dict) -> pd.DataFrame:
    wanted = {c.upper() for c in columns} | {"CU_NUMBER"}
    df = pd.read_csv(zf.open(_member(zf, table)), usecols=lambda c: c.upper() in wanted, encoding="latin-1", low_memory=False)
    df.columns = [c.upper() for c in df.columns]
    return df.rename(columns={k.upper(): v for k, v in columns.items()} | {"CU_NUMBER": "cu_number"})


def read_cycle(path: Path) -> pd.DataFrame:
    with zipfile.ZipFile(path) as zf:
        profile = pd.read_csv(zf.open(_member(zf, "FOICU")), encoding="latin-1", low_memory=False)
        profile = profile[[c for c in PROFILE if c in profile.columns]].rename(columns=PROFILE)
        frame = profile
        for table, columns in ACCOUNTS.items():
            frame = frame.merge(_read(zf, table, columns), on="cu_number", how="left")
    year, month = path.stem.split("-")
    frame["quarter"] = f"{year}Q{int(month) // 3}"
    frame["cu_name"] = frame["cu_name"].str.strip()
    frame["city"] = frame["city"].str.strip().str.title()
    return frame


def build() -> pd.DataFrame:
    zips = sorted(RAW.glob("*.zip"))
    if not zips:
        raise SystemExit(f"no Call Report zips in {RAW}; run with --download first")
    panel = pd.concat([read_cycle(z) for z in zips], ignore_index=True)
    panel = panel.dropna(subset=["total_assets"])
    panel = panel[panel["total_assets"] > 0]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    panel.sort_values(["cu_number", "quarter"]).to_csv(OUT, index=False, compression="gzip")
    return panel


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--download", action="store_true", help="fetch missing quarterly zips from ncua.gov first")
    parser.add_argument("--first", default="2018-03", help="first cycle, YYYY-MM (default 2018-03)")
    parser.add_argument("--last", default="2026-06", help="last cycle, YYYY-MM (default 2026-06)")
    args = parser.parse_args()
    if args.download:
        download(args.first, args.last)
    panel = build()
    print(f"wrote {len(panel):,} rows · {panel.cu_number.nunique():,} credit unions · "
          f"{panel.quarter.min()}–{panel.quarter.max()} → {OUT}")
