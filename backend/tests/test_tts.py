import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_list_executive_voices():
    response = client.get("/api/tts/voices")
    assert response.status_code == 200
    data = response.json()
    assert "voices" in data
    assert len(data["voices"]) == 5
    executives = [v["executive"] for v in data["voices"]]
    assert "ceo" in executives
    assert "cfo" in executives
    assert "cmo" in executives
    assert "coo" in executives
    assert "cto" in executives

def test_speak_empty_text():
    response = client.post("/api/tts/speak", json={"text": "", "executive": "ceo"})
    assert response.status_code == 400
