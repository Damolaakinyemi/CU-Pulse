"""API contract: the shapes the frontend relies on."""

import pytest
from fastapi.testclient import TestClient

import app.main as main


@pytest.fixture(scope="module")
def client():
    main.UPDATES["enabled"] = False  # never reach ncua.gov from tests
    main.UPDATE_HOURS = 0
    with TestClient(main.app) as c:
        yield c


def test_meta(client):
    m = client.get("/api/meta").json()
    assert m["default_cu"] == 5536 and m["active_count"] > 4000
    assert set(m["headline"]) <= set(m["definitions"])
    assert m["pca_tiers"][0] == {"label": "Well capitalized", "min": 0.07}


def test_search_by_name_charter_and_state(client):
    assert client.get("/api/credit-unions", params={"q": "navy fed"}).json()["results"][0]["cu_number"] == 5536
    assert client.get("/api/credit-unions", params={"q": "5536"}).json()["results"][0]["cu_number"] == 5536
    va = client.get("/api/credit-unions", params={"q": "va", "limit": 50}).json()["results"]
    assert va and all(r["state"] == "VA" or "va" in r["name"].lower() or r["city"].lower().startswith("va") for r in va)


def test_institution_and_404(client):
    i = client.get("/api/credit-unions/5536").json()
    assert i["name"] == "Navy Federal Credit Union" and i["asset_rank"] == 1 and i["pca_tier"] == "Well capitalized"
    assert i["quarters"][-1]["quarter"] == i["latest_quarter"]
    missing = client.get("/api/credit-unions/99999999")
    assert missing.status_code == 404 and "charter 99999999" in missing.json()["detail"]


def test_peers_and_forecast_shapes(client):
    p = client.get("/api/credit-unions/5536/peers").json()
    assert p["peer_count"] == 25 and len(p["members"]) == 25
    f = client.get("/api/credit-unions/5536/forecast").json()
    nwr = f["series"]["net_worth_ratio"]
    assert len(nwr["path"]) == 4 and nwr["model"] in nwr["backtest"]


def test_health_answers_get_and_head(client):
    assert client.get("/api/health").status_code == 200
    assert client.head("/api/health").status_code == 200
