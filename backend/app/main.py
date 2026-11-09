import os
import mimetypes
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

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

# Register web MIME types to prevent browser nosniff rejection
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("image/x-icon", ".ico")

# Static file serving & SPA Fallback for production deployment
def resolve_static_dir() -> Optional[str]:
    # 1. Check explicit environment variable (support absolute and relative)
    env_dir = os.getenv("STATIC_DIR")
    if env_dir:
        clean_env = env_dir.strip()
        if os.path.exists(clean_env) and os.path.isdir(clean_env):
            return os.path.abspath(clean_env)
        repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        rel_to_repo = os.path.join(repo_root, clean_env.lstrip("./").lstrip(".\\"))
        if os.path.exists(rel_to_repo) and os.path.isdir(rel_to_repo):
            return os.path.abspath(rel_to_repo)

    # 2. Check candidate directories
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app_dir = os.path.dirname(os.path.abspath(__file__))

    possible_paths = [
        os.path.join(repo_root, "frontend", "dist"),
        os.path.join(repo_root, "dist"),
        os.path.join(backend_dir, "dist"),
        os.path.join(backend_dir, "frontend", "dist"),
        os.path.join(app_dir, "static"),
        "/app/frontend/dist",
        "/app/dist",
        os.path.join(os.getcwd(), "frontend", "dist"),
        os.path.join(os.getcwd(), "dist"),
    ]

    # Prioritize candidate with index.html
    for p in possible_paths:
        if os.path.exists(p) and os.path.isdir(p) and os.path.exists(os.path.join(p, "index.html")):
            return os.path.abspath(p)

    for p in possible_paths:
        if os.path.exists(p) and os.path.isdir(p):
            return os.path.abspath(p)

    return None

STATIC_DIR = resolve_static_dir()

if STATIC_DIR and os.path.exists(STATIC_DIR):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    @app.head("/")
    async def serve_root():
        index_path = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path, media_type="text/html")
        return HTMLResponse(
            "<html><body><h1>EduNet Analyzer</h1><p>Frontend assets not found. Please run <code>npm run build</code>.</p></body></html>",
            status_code=503
        )

    @app.get("/{full_path:path}")
    @app.head("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Do not capture API routes
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail=f"API route not found: /{full_path}")
        file_path = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            mime_type, _ = mimetypes.guess_type(file_path)
            return FileResponse(file_path, media_type=mime_type)
        index_path = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path, media_type="text/html")
        raise HTTPException(status_code=404, detail=f"Resource not found: /{full_path}")
else:
    @app.get("/")
    async def fallback_root():
        return {
            "status": "online",
            "service": "EduNet Analyzer API",
            "message": "Backend API is online. Frontend static build directory was not located.",
            "health_check": "/api/health",
            "api_docs": "/docs"
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=True)
