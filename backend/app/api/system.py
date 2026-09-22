import sys
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db, DB_PATH
from ..models import Experiment
from ..schemas import SystemStatusResponse
from ..services.simulation_service import check_ns2_installation
from ..services.seed_data import seed_database

router = APIRouter(prefix="/system", tags=["System"])

@router.get("/status", response_model=SystemStatusResponse)
def get_system_status(db: Session = Depends(get_db)):
    ns_info = check_ns2_installation()
    total_exps = db.query(Experiment).count()
    mode = "NS-2 LIVE SIMULATION" if ns_info["installed"] else "DEMO MODE — Sample Data"

    return SystemStatusResponse(
        ns2_installed=ns_info["installed"],
        ns2_path=ns_info["path"],
        execution_mode=mode,
        wsl_detected=(ns_info["mode"] == "wsl" or os.path.exists(r"C:\Windows\System32\wsl.exe")),
        wsl_distro="Ubuntu" if ns_info["mode"] == "wsl" else None,
        python_version=sys.version.split()[0],
        db_connected=True,
        database_path=DB_PATH,
        total_experiments=total_exps
    )

@router.post("/seed")
def seed_system_data(force: bool = False, db: Session = Depends(get_db)):
    seed_database(db, force=force)
    total = db.query(Experiment).count()
    return {"message": "Database successfully seeded with academic baseline experiments", "total_experiments": total}
