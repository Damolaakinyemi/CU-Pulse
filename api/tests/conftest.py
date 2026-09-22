import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from pipeline.metrics import derive  # noqa: E402

PANEL = ROOT / "data" / "processed" / "call_reports.csv.gz"


@pytest.fixture(scope="session")
def panel():
    return derive(pd.read_csv(PANEL))


def quarter_row(cu, quarter, **values):
    base = {"cu_number": cu, "cu_type": 1, "cu_name": f"TEST {cu}", "city": "Testville", "state": "VA",
            "ncua_peer_group": 5, "quarter": quarter, "total_assets": 1000.0, "total_shares_deposits": 800.0,
            "total_loans": 600.0, "delinquent_loans": 6.0, "members": 100.0, "charge_offs_ytd": 0.0,
            "recoveries_ytd": 0.0, "net_income_ytd": 0.0, "net_worth": 100.0, "nwr_reported_bp": 1000.0}
    base.update(values)
    return base
