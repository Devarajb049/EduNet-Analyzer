import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from ..database import get_db, SessionLocal
from ..models import Experiment, Result
from ..schemas import (
    SimulationConfigCreate, SimulationStatusResponse, ResultResponse, ExperimentResponse
)
from ..services.simulation_service import (
    active_simulations, run_simulation_task, check_ns2_installation, ws_manager
)
from .experiments import format_experiment_response

router = APIRouter(prefix="/simulations", tags=["Simulations"])

@router.post("/run", response_model=SimulationStatusResponse)
def trigger_simulation(
    config: SimulationConfigCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    total = db.query(Experiment).count()
    exp_code = f"EXP-{total + 1:03d}"

    # If user explicitly selected demo mode, set is_demo=True, otherwise keep False for Live NS-2 run
    is_demo = bool(config.force_demo)

    exp = Experiment(
        exp_code=exp_code,
        name=config.name,
        description=config.description,
        users=config.users,
        protocol=config.protocol.upper(),
        traffic_level=config.traffic_level,
        data_rate=config.data_rate,
        simulation_time=config.simulation_time,
        experiment_type=config.experiment_type,
        status="PENDING",
        is_demo=is_demo
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)

    # Initialize in-memory status
    active_simulations[exp.id] = {
        "status": "PENDING",
        "progress_percent": 5,
        "current_stage": "PREPARING",
        "stage_message": "Simulation queued. Initializing parameters...",
        "logs": [f"Created experiment record {exp.exp_code}"],
        "error": None
    }

    # Dispatch asynchronous background task
    background_tasks.add_task(run_simulation_task, exp.id, SessionLocal)

    return SimulationStatusResponse(
        id=exp.id,
        exp_code=exp.exp_code,
        status="PENDING",
        progress_percent=5,
        current_stage="PREPARING",
        stage_message="Simulation queued. Initializing parameters...",
        logs=active_simulations[exp.id]["logs"],
        error=None,
        result=None
    )

@router.get("/{id}/status", response_model=SimulationStatusResponse)
def get_simulation_status(id: int, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == id).first()
    if not exp:
        raise HTTPException(status_code=404, detail=f"Simulation with ID {id} not found")

    res_resp = None
    if exp.result:
        ts = json.loads(exp.result.time_series_json) if exp.result.time_series_json else []
        res_resp = ResultResponse(
            id=exp.result.id,
            experiment_id=exp.result.experiment_id,
            throughput_kbps=exp.result.throughput_kbps,
            packet_loss_percent=exp.result.packet_loss_percent,
            packet_delivery_ratio=exp.result.packet_delivery_ratio,
            average_delay_ms=exp.result.average_delay_ms,
            packets_sent=exp.result.packets_sent,
            packets_received=exp.result.packets_received,
            packets_dropped=exp.result.packets_dropped,
            data_rate_kbps=exp.result.data_rate_kbps,
            summary_notes=exp.result.summary_notes,
            time_series=ts
        )

    # Check active memory status
    state = active_simulations.get(id)
    if state:
        return SimulationStatusResponse(
            id=exp.id,
            exp_code=exp.exp_code,
            status=state["status"],
            progress_percent=state["progress_percent"],
            current_stage=state["current_stage"],
            stage_message=state["stage_message"],
            logs=state["logs"],
            error=state.get("error"),
            result=res_resp
        )

    # If completed and not in active memory
    progress = 100 if exp.status == "COMPLETED" else 0
    return SimulationStatusResponse(
        id=exp.id,
        exp_code=exp.exp_code,
        status=exp.status,
        progress_percent=progress,
        current_stage="COMPLETED" if exp.status == "COMPLETED" else exp.status,
        stage_message="Simulation completed." if exp.status == "COMPLETED" else f"Status: {exp.status}",
        logs=[f"Simulation {exp.exp_code} status: {exp.status}"],
        error=None,
        result=res_resp
    )

@router.get("/{id}/results", response_model=ExperimentResponse)
def get_simulation_results(id: int, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == id).first()
    if not exp:
        raise HTTPException(status_code=404, detail=f"Simulation with ID {id} not found")
    return format_experiment_response(exp)

@router.websocket("/ws/{id}")
async def simulation_websocket_endpoint(websocket: WebSocket, id: int):
    """Real-time streaming of simulation stages and console logs via WebSocket."""
    await ws_manager.connect_sim(id, websocket)
    try:
        # Immediately send current state if available
        if id in active_simulations:
            await websocket.send_json(active_simulations[id])
        else:
            # Check database for status
            db = SessionLocal()
            try:
                exp = db.query(Experiment).filter(Experiment.id == id).first()
                if exp:
                    await websocket.send_json({
                        "status": exp.status,
                        "progress_percent": 100 if exp.status == "COMPLETED" else 0,
                        "current_stage": exp.status,
                        "stage_message": f"Simulation status: {exp.status}",
                        "logs": [f"Simulation {exp.exp_code} status: {exp.status}"]
                    })
            finally:
                db.close()

        # Keep connection open and handle client ping/heartbeat
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_sim(id, websocket)
    except Exception:
        ws_manager.disconnect_sim(id, websocket)

@router.websocket("/ws/global/telemetry")
async def telemetry_websocket_endpoint(websocket: WebSocket):
    """Global telemetry broadcaster for live completed simulations and aggregate stats."""
    await ws_manager.connect_global(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_global(websocket)
    except Exception:
        ws_manager.disconnect_global(websocket)
