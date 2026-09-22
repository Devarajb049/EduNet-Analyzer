from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from ..database import get_db
from ..models import Experiment, Result
from ..services.report_service import generate_experiment_csv, generate_experiment_pdf

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/{id}/csv")
def download_experiment_csv(id: int, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == id).first()
    if not exp:
        raise HTTPException(status_code=404, detail=f"Experiment with ID {id} not found")

    csv_data = generate_experiment_csv(exp, exp.result)
    filename = f"{exp.exp_code}_report.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{id}/pdf")
def download_experiment_pdf(id: int, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == id).first()
    if not exp:
        raise HTTPException(status_code=404, detail=f"Experiment with ID {id} not found")

    pdf_bytes = generate_experiment_pdf(exp, exp.result)
    filename = f"{exp.exp_code}_academic_report.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
