import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.services.seed_data import seed_database
from app.services.trace_parser import parse_ns2_trace_file

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db, force=True)
    db.close()
    yield

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"

def test_dashboard_summary():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert data["kpis"]["total_experiments"] >= 8
    assert data["kpis"]["avg_throughput_kbps"] > 0
    assert "recent_experiments" in data
    assert "tcp_vs_udp" in data

def test_experiments_list():
    response = client.get("/api/experiments")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 8
    assert data[0]["exp_code"].startswith("EXP-")
    assert data[0]["result"] is not None

def test_experiments_compare():
    response = client.get("/api/experiments")
    exps = response.json()
    ids = [exps[0]["id"], exps[1]["id"]]
    
    comp_resp = client.post("/api/experiments/compare", json={"experiment_ids": ids})
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()
    assert len(comp_data["experiments"]) == 2
    assert "metrics_table" in comp_data
    assert "comparison_charts" in comp_data

def test_csv_report():
    response = client.get("/api/reports/1/csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    content = response.text
    assert "Throughput (Kbps)" in content
    assert "EXP-001" in content

def test_pdf_report():
    response = client.get("/api/reports/1/pdf")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert len(response.content) > 1000

def test_system_status():
    response = client.get("/api/system/status")
    assert response.status_code == 200
    data = response.json()
    assert "execution_mode" in data
    assert data["db_connected"] is True

def test_gbn_simulation():
    response = client.post("/api/simulations/run-gbn", json={"window_size": 4, "loss_rate": 0.05, "simulation_time": 4.0})
    assert response.status_code == 200
    data = response.json()
    assert "packets_sent" in data
    assert "trace_points" in data
    assert data["window_size"] == 4

def test_leaky_bucket_simulation():
    response = client.post("/api/simulations/run-leaky-bucket", json={"bucket_size": 15, "leak_rate": "512Kbps", "simulation_time": 4.0})
    assert response.status_code == 200
    data = response.json()
    assert "shaped_throughput_kbps" in data
    assert "comparison_series" in data

def test_spa_root_and_fallback_routes():
    # Test root endpoint
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "EduNet Analyzer" in response.text

    # Test client-side route fallback
    dash_resp = client.get("/dashboard")
    assert dash_resp.status_code == 200
    assert "text/html" in dash_resp.headers["content-type"]
    assert "EduNet Analyzer" in dash_resp.text

    # Test nested client-side route fallback
    sim_resp = client.get("/simulation/new")
    assert sim_resp.status_code == 200
    assert "text/html" in sim_resp.headers["content-type"]

def test_api_404_not_masked_by_spa():
    # Unmatched API routes must return 404 JSON, not HTML or 200
    response = client.get("/api/unknown_endpoint_xyz")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data


