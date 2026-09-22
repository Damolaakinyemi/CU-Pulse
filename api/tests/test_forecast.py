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
