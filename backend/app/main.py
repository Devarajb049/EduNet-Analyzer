import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, SessionLocal
from .models import Experiment
from .services.seed_data import seed_database
from .api import dashboard, experiments, simulations, reports, system

# Application lifespan for DB init and initial seeding
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    
    # Check and automatically seed calibrated academic benchmarks if DB is fresh
    db = SessionLocal()
    try:
        if db.query(Experiment).count() == 0:
            print("[EduNet Analyzer] First run detected: Seeding academic laboratory baseline experiments...")
            seed_database(db, force=False)
            print("[EduNet Analyzer] Database seeded successfully.")
    finally:
        db.close()
    
    yield

app = FastAPI(
    title="EduNet Analyzer API",
    description="University E-Learning Network Performance Simulation & Analysis Engine",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers under /api
app.include_router(dashboard.router, prefix="/api")
app.include_router(experiments.router, prefix="/api")
app.include_router(simulations.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(system.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "EduNet Analyzer API",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
