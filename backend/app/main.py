import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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

# Enable CORS (support CORS_ORIGINS env var or wildcard by default)
cors_env = os.getenv("CORS_ORIGINS", "*")
if cors_env.strip() == "*":
    origins = ["*"]
else:
    origins = [orig.strip() for orig in cors_env.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

# Static file serving & SPA Fallback for production deployment
STATIC_DIR = os.getenv("STATIC_DIR")
if not STATIC_DIR:
    possible_paths = [
        # In unified container or standard repo layout where frontend dist is compiled
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "static"),
        "/app/frontend/dist"
    ]
    for p in possible_paths:
        if os.path.exists(p) and os.path.isdir(p):
            STATIC_DIR = p
            break

if STATIC_DIR and os.path.exists(STATIC_DIR):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API routes to be handled by routers
        if full_path.startswith("api/"):
            return {"error": "API route not found", "path": full_path}
        file_path = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_path = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"error": "Frontend build not found", "path": full_path}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=True)
