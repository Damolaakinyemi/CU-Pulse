"""Forecasting behaves correctly on series whose answer is known."""

import numpy as np
import pandas as pd
import pytest

from pipeline.forecast import HORIZON, forecast_series, honest_eval


def series(values, start="2018Q1"):
    idx = [str(p) for p in pd.period_range(start, periods=len(values), freq="Q")]
    return pd.Series(values, index=idx)


def test_drift_recovers_constant_growth():
    s = series(1e9 * 1.02 ** np.arange(14))  # the minimum the app forecasts; too short for ETS/ARIMA
    out = forecast_series(s, log=True)
    assert out["model"] == "drift"
    assert out["path"][0]["point"] == pytest.approx(s.iloc[-1] * 1.02, rel=1e-6)
    assert out["path"][-1]["quarter"] == "2022Q2"


def test_intervals_nest_and_widen_with_horizon():
    rng = np.random.default_rng(1)
    s = series(1e9 * np.exp(np.cumsum(0.01 + rng.normal(0, 0.01, 34))))
    path = forecast_series(s, log=True)["path"]
    for p in path:
        assert p["lo95"] < p["lo80"] < p["lo50"] <= p["point"] <= p["hi50"] < p["hi80"] < p["hi95"]
    widths = [p["hi80"] - p["lo80"] for p in path]
    assert widths == sorted(widths)
    assert len(path) == HORIZON


def test_selection_picks_the_lowest_backtest_error():
    rng = np.random.default_rng(2)
    s = series(1e9 * np.exp(np.cumsum(0.015 + rng.normal(0, 0.008, 34))))
    out = forecast_series(s, log=True)
    errors = {m: b["error"] for m, b in out["backtest"].items()}
    assert out["model"] == min(errors, key=errors.get)
    assert len(out["trail"]) == 8 * HORIZON


def test_coverage_is_near_nominal_on_a_true_random_walk():
    # On data that really is a random walk with drift, 80% intervals should cover roughly 80%.
    rng = np.random.default_rng(3)
    covers = []
    for _ in range(30):
        s = series(np.cumsum(0.001 + rng.normal(0, 0.002, 34)) + 0.1)
        covers.append(forecast_series(s, log=False)["backtest"]["drift"]["coverage80"])
    assert 0.65 < np.mean(covers) < 0.92


def test_honest_eval_scores_on_origins_the_choice_never_saw():
    rng = np.random.default_rng(4)
    s = series(1e9 * np.exp(np.cumsum(0.01 + rng.normal(0, 0.01, 34))))
    out = honest_eval(s, log=True)
    assert out["chosen"] in {"drift", "ets", "arima"}
    assert out["error"] > 0 and out["drift_error"] > 0
    assert 0 <= out["coverage80"] <= 1


def test_calibrated_multipliers_widen_forward_ranges_only():
    rng = np.random.default_rng(5)
    s = series(1e9 * np.exp(np.cumsum(0.01 + rng.normal(0, 0.01, 34))))
    wide = {str(h): {"50": 2.0, "80": 4.0, "95": 6.0} for h in range(1, HORIZON + 1)}
    plain, calibrated = forecast_series(s, log=True), forecast_series(s, log=True, calib=wide)
    assert calibrated["path"][0]["hi80"] > plain["path"][0]["hi80"]
    assert calibrated["path"][0]["lo95"] < plain["path"][0]["lo95"]
    # the backtest is never graded with fitted multipliers
    assert calibrated["backtest"] == plain["backtest"]
    assert calibrated["trail"] == plain["trail"]


def test_missing_calibration_falls_back_to_gaussian(tmp_path):
    from pipeline.forecast import Z, _mult, load_calibration
    assert load_calibration(tmp_path / "absent.json") is None
    assert _mult(None, 2, "80") == Z["80"]
    assert _mult({"3": {"80": 1.5}}, 2, "80") == Z["80"]
    assert _mult({"2": {"80": 1.5}}, 2, "80") == 1.5


def _fake_results(labels, z_for):
    """300 credit unions, one series, with standardized errors z_for(label) at every horizon."""
    return [{"x": {"error": 0.1, "chosen": "ets", "late_origins": [], "z": {lab: [z_for(lab)] * HORIZON for lab in labels}}}
            for _ in range(300)]


def test_calibration_table_pools_the_recent_window_only():
    from pipeline.backtest_all import calibration_table
    from pipeline.forecast import CAL_WINDOW
    labels = [str(p) for p in pd.period_range("2023Q1", periods=12, freq="Q")]
    newest = labels[-4]  # 2025Q1
    # errors of 3.0 inside the window, 0.1 before it, and 99 after it (not yet known, so never used)
    recent = set(labels[-4 - CAL_WINDOW + 1:-3])
    res = _fake_results(labels, lambda lab: 3.0 if lab in recent else (99.0 if lab > newest else 0.1))
    table = calibration_table(res, "x", newest)
    assert set(table) == {"1", "2", "3", "4"}
    assert table["1"]["80"] == pytest.approx(3.0)


def test_causal_tables_use_only_origins_four_quarters_back():
    from pipeline.backtest_all import causal_tables
    labels = [str(p) for p in pd.period_range("2023Q1", periods=12, freq="Q")]
    late = labels[-2:]
    # every error is 1.0 up to four quarters before each scored origin, 50 afterwards
    res = _fake_results(labels, lambda lab: 1.0 if lab <= str(pd.Period(late[0], freq="Q") - 4) else 50.0)
    tables = causal_tables(res, "x", late)
    assert tables[late[0]]["1"]["95"] == pytest.approx(1.0)
    assert tables[late[1]]["1"]["95"] > 1.0  # its window reaches one origin later, which has the large errors
