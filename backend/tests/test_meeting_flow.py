import json
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.sample_seeder import ensure_sample_files_exist

def test_complete_meeting_flow_and_pdf_export():
    ensure_sample_files_exist()
    with TestClient(app) as client:
        # 1. Fetch businesses
        b_res = client.get("/api/businesses")
        assert b_res.status_code == 200
        businesses = b_res.json()
        assert len(businesses) >= 3
        biz = businesses[0]

        # 2. Check financial metrics are computed
        m_res = client.get(f"/api/businesses/{biz['id']}/metrics")
        assert m_res.status_code == 200
        metrics = m_res.json()
        assert metrics["total_revenue"] > 0
        assert metrics["total_expenses"] > 0

        # 3. Create a boardroom meeting
        create_payload = {
            "question": "How should we reverse our 4-month margin decline?",
            "participants": ["ceo", "cfo", "cmo", "coo", "cto"]
        }
        create_res = client.post(f"/api/businesses/{biz['id']}/meetings", json=create_payload)
        assert create_res.status_code == 201
        meeting = create_res.json()
        meeting_id = meeting["id"]
        assert meeting["status"] == "created"

        # 4. Stream SSE events
        # TestClient.get on an SSE stream returns an iter_lines response
        with client.stream("GET", f"/api/meetings/{meeting_id}/events") as response:
            assert response.status_code == 200
            events_received = []
            for line in response.iter_lines():
                if line and line.startswith("event:"):
                    events_received.append(line.replace("event:", "").strip())

            # Verify that all 5 key stages were streamed
            assert "stage_start" in events_received
            assert "message" in events_received
            assert "complete" in events_received

        # 5. Verify database persistence after meeting completion
        get_res = client.get(f"/api/meetings/{meeting_id}")
        assert get_res.status_code == 200
        completed_meeting = get_res.json()
        assert completed_meeting["status"] == "completed"
        assert len(completed_meeting["messages"]) >= 5 # CEO, CFO, CMO, COO, CTO
        assert len(completed_meeting["recommendations"]) >= 1
        assert len(completed_meeting["tasks"]) >= 3

        # 6. Verify primary recommendation and update status
        rec = completed_meeting["recommendations"][0]
        assert rec["status"] == "proposed"
        rec_update = client.post(
            f"/api/meetings/{meeting_id}/recommendations/{rec['id']}",
            json={"status": "accepted"}
        )
        assert rec_update.status_code == 200
        assert rec_update.json()["status"] == "accepted"

        # 7. Verify tasks persistence and status update
        task = completed_meeting["tasks"][0]
        assert task["status"] == "todo"
        task_update = client.patch(
            f"/api/tasks/{task['id']}",
            json={"status": "done"}
        )
        assert task_update.status_code == 200
        assert task_update.json()["status"] == "done"

        # 8. Export and verify ReportLab PDF Report
        pdf_res = client.get(f"/api/meetings/{meeting_id}/report.pdf")
        assert pdf_res.status_code == 200
        assert pdf_res.headers["content-type"] == "application/pdf"
        assert pdf_res.content.startswith(b"%PDF-") # Standard PDF magic byte header
        assert len(pdf_res.content) > 1000

        # 9. Follow-up meeting creation
        follow_payload = {
            "question": "What is our contingency plan if the supplier rejects renegotiation?"
        }
        follow_res = client.post(f"/api/meetings/{meeting_id}/follow-up", json=follow_payload)
        assert follow_res.status_code == 200
        follow_meeting = follow_res.json()
        assert follow_meeting["business_id"] == biz["id"]
        assert "Follow-up to Meeting" in follow_meeting["question"]
