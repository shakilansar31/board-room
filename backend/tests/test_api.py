import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

def test_health_endpoint():
    with TestClient(app) as client:
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "configured_model" in data

def test_list_and_create_business():
    with TestClient(app) as client:
        # List seeded businesses
        res = client.get("/api/businesses")
        assert res.status_code == 200
        b_list = res.json()
        assert len(b_list) >= 3

        # Create new custom business
        payload = {
            "name": "Acme Widgets Inc",
            "industry": "Manufacturing",
            "location": "Chicago, IL",
            "currency": "USD",
            "description": "Custom widget manufacturer evaluating supply chain automation.",
            "goals": "Automate inventory reordering and improve fulfillment speed.",
            "constraints": "Cap capex at $50k"
        }
        create_res = client.post("/api/businesses", json=payload)
        assert create_res.status_code == 201
        created = create_res.json()
        assert created["name"] == "Acme Widgets Inc"
        assert created["is_sample"] == 0

        # Get by ID
        get_res = client.get(f"/api/businesses/{created['id']}")
        assert get_res.status_code == 200
        assert get_res.json()["industry"] == "Manufacturing"

        # Cleanup
        del_res = client.delete(f"/api/businesses/{created['id']}")
        assert del_res.status_code == 204

def test_financial_metrics_endpoint():
    with TestClient(app) as client:
        # Use first seeded business (Apex Hardware)
        b_list = client.get("/api/businesses").json()
        apex = next(b for b in b_list if "Apex" in b["name"])

        metrics_res = client.get(f"/api/businesses/{apex['id']}/metrics")
        assert metrics_res.status_code == 200
        metrics = metrics_res.json()
        assert metrics["total_revenue"] > 0
        assert metrics["total_expenses"] > 0
        assert len(metrics["monthly_trend"]) >= 6
        assert len(metrics["category_breakdown"]) > 0

def test_meeting_creation_and_task_generation():
    with TestClient(app) as client:
        b_list = client.get("/api/businesses").json()
        target_biz = b_list[0]

        # Create meeting
        meeting_payload = {
            "question": "How should we adjust supplier payment terms to restore cash runway?"
        }
        m_res = client.post(f"/api/businesses/{target_biz['id']}/meetings", json=meeting_payload)
        assert m_res.status_code == 201
        meeting = m_res.json()
        assert meeting["status"] == "created"
        assert meeting["question"] == meeting_payload["question"]

        # Reopen meeting
        get_m = client.get(f"/api/meetings/{meeting['id']}")
        assert get_m.status_code == 200
        assert get_m.json()["id"] == meeting["id"]
