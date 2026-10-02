# ==============================================================================
# EduNet Analyzer - Production Unified Dockerfile
# Full-Stack: React 18 (Vite) + FastAPI + NS-2 (Network Simulator 2)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Assets
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime with NS-2 & Python Backend
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS runner

# Environment settings
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    STATIC_DIR=/app/frontend/dist \
    SIMULATION_DIR=/app/simulation

WORKDIR /app

# Install system utilities, build tools, and NS-2 simulation engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ns2 \
    nam \
    && rm -rf /var/lib/apt/lists/*

# Verify NS-2 discrete-event simulator availability
RUN ns -v || true

# Install Python backend dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY backend/ /app/backend

# Copy compiled frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Prepare simulation and report storage directories
RUN mkdir -p /app/simulation/generated /app/simulation/traces /app/reports

# Default HTTP/WebSocket port
EXPOSE 8000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Start FastAPI application with dynamic PORT assignment (compatible with Voroa, Render, Railway, Cloud Run)
CMD ["sh", "-c", "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
