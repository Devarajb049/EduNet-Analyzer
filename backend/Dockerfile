# ==============================================================================
# EduNet Analyzer - Backend Dockerfile (with Native NS-2 Engine)
# ==============================================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    SIMULATION_DIR=/app/simulation

WORKDIR /app

# Install build dependencies and NS-2 (Network Simulator 2) suite
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ns2 \
    nam \
    && rm -rf /var/lib/apt/lists/*

# Copy backend dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . /app

# Create simulation and trace directories
RUN mkdir -p /app/simulation/generated /app/simulation/traces /app/reports

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Start Uvicorn backend server
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
