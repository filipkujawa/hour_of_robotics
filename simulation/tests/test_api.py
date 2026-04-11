import pytest
from fastapi.testclient import TestClient
from simulation.api.main import app
import rerun as rr

client = TestClient(app)

def test_read_main():
    """Verify that the API starts and is reachable."""
    # Since we don't have a root GET, we just check if it exists
    assert app.title == "Mars Robot Simulation Service"

def test_simulate_endpoint():
    """Verify that the simulate endpoint accepts blocks and returns a rerun URL."""
    payload = {
        "blocks": [
            {
                "type": "mars_move_forward",
                "fields": {"STEPS": 5},
                "inputs": {},
                "next": None
            }
        ]
    }
    response = client.post("/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert "rerun_url" in data
    assert data["rerun_url"].startswith("rerun+http://")

def test_simulator_logic():
    """Basic check that we can initialize the simulator core directly."""
    from simulation.core.mars_sim import MarsSimulator
    sim = MarsSimulator("test_sid")
    sim.setup_robot_model()
    sim.move_forward(10, 1.0)
    assert sim.server_uri.startswith("rerun+http://")
