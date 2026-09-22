"""NCUA zip parsing and the update check, without touching the network."""

import io
import json
import zipfile

import pandas as pd
import pytest

from pipeline import ncua


def fake_zip(path, cu_rows):
    foicu = pd.DataFrame([{"CU_NUMBER": n, "CU_TYPE": 1, "CU_NAME": f" CU {n} ", "CITY": "VIENNA", "STATE": "VA",
                           "Peer_Group": 6} for n in cu_rows])
    fs220 = pd.DataFrame([{"CU_NUMBER": n, "ACCT_010": 1000 * n, "ACCT_018": 800 * n, "ACCT_025B": 600 * n,
                           "ACCT_041B": 6 * n, "ACCT_083": 10 * n, "ACCT_550": 2, "ACCT_551": 1, "ACCT_999": 0}
                          for n in cu_rows])
    fs220a = pd.DataFrame([{"CU_NUMBER": n, "Acct_661A": 5, "Acct_997": 100 * n, "Acct_998": 1000} for n in cu_rows])
    with zipfile.ZipFile(path, "w") as z:
        for name, frame in [("FOICU.txt", foicu), ("FS220.txt", fs220), ("FS220A.txt", fs220a)]:
            z.writestr(name, frame.to_csv(index=False))


def test_read_cycle_maps_accounts_and_quarter(tmp_path):
    fake_zip(tmp_path / "2026-06.zip", [1, 2])
    frame = ncua.read_cycle(tmp_path / "2026-06.zip")
    assert list(frame.quarter.unique()) == ["2026Q2"]
    row = frame.set_index("cu_number").loc[2]
    assert row.total_assets == 2000 and row.total_loans == 1200 and row.net_worth == 200
    assert row.nwr_reported_bp == 1000 and row.net_income_ytd == 5
    assert row.cu_name == "CU 2" and row.city == "Vienna"
    assert "ACCT_999" not in frame.columns  # only the accounts CU Pulse uses


def test_cycles_and_next_cycle():
    assert ncua.cycles("2025-12", "2026-06") == ["2025-12", "2026-03", "2026-06"]
    assert ncua._next_cycle("2026-12") == "2027-03"


def test_update_fetches_new_quarters_until_404_and_rebuilds(tmp_path, monkeypatch):
    monkeypatch.setattr(ncua, "RAW", tmp_path)
    monkeypatch.setattr(ncua, "MANIFEST", tmp_path / "manifest.json")
    for c in ["2026-03", "2026-06"]:
        fake_zip(tmp_path / f"{c}.zip", [1])
    (tmp_path / "manifest.json").write_text(json.dumps({"2026-03": "a", "2026-06": "b"}))
    published = {"2026-03": "a", "2026-06": "b", "2026-09": "c"}
    fetched, built = [], []
    monkeypatch.setattr(ncua, "_remote_modified", lambda c: published.get(c))
    monkeypatch.setattr(ncua, "_fetch", lambda c, m, man: (fetched.append(c), man.__setitem__(c, m)))
    monkeypatch.setattr(ncua, "merge", lambda cycles: built.append(cycles))
    result = ncua.update()
    assert fetched == ["2026-09"] and built == [["2026-09"]]
    assert result["changed"] == ["2026-09"] and result["awaiting"] == "2026-12"


def test_update_redownloads_amended_quarter_and_skips_rebuild_when_unchanged(tmp_path, monkeypatch):
    monkeypatch.setattr(ncua, "RAW", tmp_path)
    monkeypatch.setattr(ncua, "MANIFEST", tmp_path / "manifest.json")
    for c in ["2026-03", "2026-06"]:
        fake_zip(tmp_path / f"{c}.zip", [1])
    (tmp_path / "manifest.json").write_text(json.dumps({"2026-03": "a", "2026-06": "b"}))
    fetched, built = [], []
    monkeypatch.setattr(ncua, "_fetch", lambda c, m, man: (fetched.append(c), man.__setitem__(c, m)))
    monkeypatch.setattr(ncua, "merge", lambda cycles: built.append(cycles))

    monkeypatch.setattr(ncua, "_remote_modified", lambda c: {"2026-03": "a", "2026-06": "b"}.get(c))
    assert ncua.update()["changed"] == [] and built == []

    monkeypatch.setattr(ncua, "_remote_modified", lambda c: {"2026-03": "a", "2026-06": "b2"}.get(c))
    assert ncua.update()["changed"] == ["2026-06 (amended)"] and fetched == ["2026-06"] and built == [["2026-06"]]


def test_merge_replaces_only_changed_quarters(tmp_path, monkeypatch):
    monkeypatch.setattr(ncua, "RAW", tmp_path)
    out = tmp_path / "panel.csv.gz"
    monkeypatch.setattr(ncua, "OUT", out)
    pd.DataFrame([{"cu_number": 1, "quarter": "2026Q1", "total_assets": 5.0},
                  {"cu_number": 1, "quarter": "2026Q2", "total_assets": 6.0}]).to_csv(out, index=False, compression="gzip")
    fake_zip(tmp_path / "2026-06.zip", [1, 2])
    panel = ncua.merge(["2026-06"])
    assert sorted(panel.quarter.unique()) == ["2026Q1", "2026Q2"]
    assert panel[panel.quarter == "2026Q1"].total_assets.tolist() == [5.0]
    assert sorted(panel[panel.quarter == "2026Q2"].total_assets.tolist()) == [1000.0, 2000.0]


def test_update_without_raw_zips_uses_panel_quarters(tmp_path, monkeypatch):
    monkeypatch.setattr(ncua, "RAW", tmp_path / "raw")
    monkeypatch.setattr(ncua, "MANIFEST", tmp_path / "raw" / "manifest.json")
    out = tmp_path / "panel.csv.gz"
    monkeypatch.setattr(ncua, "OUT", out)
    pd.DataFrame([{"cu_number": 1, "quarter": q, "total_assets": 1.0} for q in ["2026Q1", "2026Q2"]]).to_csv(out, index=False, compression="gzip")
    monkeypatch.setattr(ncua, "_remote_modified", lambda c: {"2026-03": "a", "2026-06": "b"}.get(c))
    result = ncua.update()
    assert result["changed"] == [] and result["awaiting"] == "2026-09"
