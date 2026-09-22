"""Ratio definitions, checked on hand-built filings and against NCUA's own figures."""

import numpy as np
import pandas as pd
import pytest

from conftest import quarter_row
from pipeline.metrics import PCA_TIERS, derive, display_name, pca_tier, peer_ids, peer_stats


def test_year_over_year_growth_uses_same_quarter_prior_year():
    rows = [quarter_row(1, "2024Q2", total_loans=500.0, total_shares_deposits=700.0),
            quarter_row(1, "2025Q1", total_loans=540.0),
            quarter_row(1, "2025Q2", total_loans=550.0, total_shares_deposits=770.0)]
    df = derive(pd.DataFrame(rows)).set_index("quarter")
    assert df.loc["2025Q2", "loan_growth_yoy"] == pytest.approx(0.10)
    assert df.loc["2025Q2", "deposit_growth_yoy"] == pytest.approx(0.10)
    assert np.isnan(df.loc["2025Q1", "loan_growth_yoy"])  # no 2024Q1 filing


def test_roa_annualizes_ytd_income_over_average_assets():
    rows = [quarter_row(1, "2024Q4", total_assets=900.0),
            quarter_row(1, "2025Q2", total_assets=1100.0, net_income_ytd=10.0)]
    df = derive(pd.DataFrame(rows)).set_index("quarter")
    # 10 of income in two quarters -> 20 a year, over average assets (1100 + 900) / 2
    assert df.loc["2025Q2", "roa"] == pytest.approx(20 / 1000)


def test_net_charge_off_rate_nets_recoveries():
    rows = [quarter_row(1, "2025Q1", total_loans=600.0, charge_offs_ytd=4.0, recoveries_ytd=1.0)]
    df = derive(pd.DataFrame(rows))
    assert df.loc[0, "net_charge_off_rate"] == pytest.approx(3 * 4 / 600)


def test_net_worth_ratio_prefers_reported_and_falls_back():
    rows = [quarter_row(1, "2025Q2", net_worth=66.0, total_assets=1000.0, nwr_reported_bp=1086.0),
            quarter_row(2, "2025Q2", net_worth=80.0, total_assets=1000.0, nwr_reported_bp=np.nan)]
    df = derive(pd.DataFrame(rows)).set_index("cu_number")
    assert df.loc[1, "net_worth_ratio"] == pytest.approx(0.1086)
    assert df.loc[1, "net_worth_ratio_computed"] == pytest.approx(0.066)
    assert df.loc[1, "net_worth_ratio_source"] == "reported"
    assert df.loc[2, "net_worth_ratio"] == pytest.approx(0.08)
    assert df.loc[2, "net_worth_ratio_source"] == "computed"


def test_division_by_zero_becomes_missing_not_infinite():
    df = derive(pd.DataFrame([quarter_row(1, "2025Q2", total_loans=0.0)]))
    assert np.isnan(df.loc[0, "delinquency_rate"])


@pytest.mark.parametrize("ratio,tier", [(0.07, "Well capitalized"), (0.0699, "Adequately capitalized"),
                                        (0.06, "Adequately capitalized"), (0.045, "Undercapitalized"),
                                        (0.03, "Significantly undercapitalized"), (0.01, "Critically undercapitalized")])
def test_pca_tiers_follow_12_cfr_702_102(ratio, tier):
    assert pca_tier(ratio) == tier
    assert [t["label"] for t in PCA_TIERS][0] == "Well capitalized"


def test_display_name():
    assert display_name("NAVY FEDERAL CREDIT UNION") == "Navy Federal Credit Union"
    assert display_name("CREDIT UNION OF TEXAS") == "Credit Union of Texas"
    assert display_name("IBM SOUTHEAST EMPLOYEES") == "IBM Southeast Employees"


# ── Against the real panel ───────────────────────────────────────────────────

def test_navy_federal_2026q2_matches_its_filing(panel):
    nf = panel[(panel.cu_number == 5536) & (panel.quarter == "2026Q2")].iloc[0]
    assert nf.total_assets == 204_364_276_193
    assert nf.total_loans == 146_325_304_540
    assert nf.net_worth == 23_804_146_840
    assert nf.net_worth_ratio == pytest.approx(0.1165)
    assert nf.net_worth_ratio_computed == pytest.approx(0.1165, abs=5e-5)


def test_reported_and_computed_net_worth_ratio_mostly_agree(panel):
    latest = panel[panel.quarter == panel.quarter.max()]
    both = latest.dropna(subset=["nwr_reported_bp"])
    gap = (both.net_worth_ratio - both.net_worth_ratio_computed).abs()
    assert (gap <= 0.0001).mean() > 0.85  # within 1 bp for the large majority


def test_panel_has_every_quarter_and_no_duplicate_filings(panel):
    assert panel.quarter.min() == "2018Q1"
    assert not panel.duplicated(["cu_number", "quarter"]).any()
    counts = panel.groupby("quarter").cu_number.nunique()
    assert (counts > 4000).all()


def test_peers_are_nearest_by_assets_and_exclude_subject(panel):
    ids = peer_ids(panel, 5536)
    assert len(ids) == 25 and 5536 not in ids
    latest = panel[panel.quarter == panel.quarter.max()].set_index("cu_number")
    nf = np.log(latest.loc[5536, "total_assets"])
    chosen = np.abs(np.log(latest.loc[ids, "total_assets"]) - nf).max()
    rest = latest.drop(index=ids + [5536])
    assert (np.abs(np.log(rest.total_assets) - nf) >= chosen).all()


def test_peer_percentile_is_share_strictly_below(panel):
    stats = peer_stats(panel, 5536)
    point = stats["series"]["net_worth_ratio"][-1]
    values = [m["net_worth_ratio"] for m in stats["members"]]
    own = panel[(panel.cu_number == 5536) & (panel.quarter == stats["as_of"])].net_worth_ratio.iloc[0]
    assert point["percentile"] == pytest.approx(100 * np.mean(np.array(values) < own))
