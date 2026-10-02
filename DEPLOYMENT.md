# 🚀 EduNet Analyzer - Production Deployment Guide

This guide covers complete deployment workflows for **EduNet Analyzer**, with specific instructions for **Voroa (`https://app.getvoroa.com`)**, **Docker Compose**, and major cloud platforms (**Render, Railway, Fly.io, AWS/GCP**).

---

## 🇮🇳 1. Deploying on Voroa (`https://app.getvoroa.com/new/choose`)

Voroa is an India-first developer cloud hosting platform that connects directly to GitHub. 

EduNet Analyzer provides two deployment options on Voroa:

### ⭐ Option A: Docker Service (Recommended — All-in-One + Live NS-2)
> **Why Recommended:** This deploys the React Frontend, FastAPI Backend, and the authentic **NS-2 (Network Simulator 2)** discrete-event simulator inside a single optimized container on low-latency Indian servers.

1. Go to [https://app.getvoroa.com/new/choose](https://app.getvoroa.com/new/choose)
2. Select **Docker Service** (or **Deploy from Dockerfile**).
3. Connect your GitHub repository: `Devarajb049/EduNet-Analyzer`.
4. Configure the service settings:
   - **Service Name**: `edunet-analyzer`
   - **Branch**: `main`
   - **Dockerfile Path**: `./Dockerfile` (or leave default `Dockerfile`)
   - **Port**: `8000`
5. Environment Variables:
   ```env
   PORT=8000
   CORS_ORIGINS=*
   ```
6. Click **Deploy**.
7. Once deployment finishes, Voroa will provide your live URL: `https://edunet-analyzer.getvoroa.com` (or your chosen subdomain).
8. Visit the URL in your browser — your full-stack application with live NS-2 telemetry is live!

---

### Option B: Separate Web Service (Backend) + Static Site (Frontend)

If you prefer deploying the frontend and backend as two independent Voroa services:

#### Step 1: Deploy Backend (Web Service)
1. At [https://app.getvoroa.com/new/choose](https://app.getvoroa.com/new/choose), choose **Web Service**.
2. Connect `Devarajb049/EduNet-Analyzer`.
3. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3.11+`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Deploy and note your backend URL (e.g. `https://edunet-api.getvoroa.com`).

#### Step 2: Deploy Frontend (Static Site)
1. At [https://app.getvoroa.com/new/choose](https://app.getvoroa.com/new/choose), choose **Static Site**.
2. Connect `Devarajb049/EduNet-Analyzer`.
3. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variables**:
     ```env
     VITE_API_BASE=https://edunet-api.getvoroa.com/api
     VITE_WS_URL=wss://edunet-api.getvoroa.com/api/simulations
     ```
4. Click **Deploy**.

---

## 🐳 2. Local & VPS Deployment with Docker Compose

EduNet Analyzer includes production multi-container Docker Compose with Nginx reverse proxy, automatic WebSocket upgrade, and native NS-2:

```bash
# Clone the repository
git clone https://github.com/Devarajb049/EduNet-Analyzer.git
cd EduNet-Analyzer

# Build and start services in detached mode
docker-compose up -d --build
```

### Verified Endpoints:
- **Frontend SPA**: `http://localhost` (or `http://localhost:5173`)
- **Backend API & Swagger Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/health`

To stop:
```bash
docker-compose down
```

---

## ☁️ 3. Other Cloud Hosting Platforms

### Render (1-Click Blueprint)
1. Create a New Web Service on [Render](https://render.com).
2. Connect repository and select **Docker**.
3. Render automatically picks up `Dockerfile` and `render.yaml`.
4. Set health check path: `/api/health`.

### Railway / Fly.io
- **Railway**: Connect GitHub repo. Railway auto-detects `Dockerfile` and binds `$PORT`.
- **Fly.io**: Run `fly launch` in project root. It will use the provided [fly.toml](file:///f:/EduNet%20Analyzer/fly.toml).

---

## ⚙️ Environment Variables Reference

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `8000` | HTTP port for backend / container |
| `HOST` | `0.0.0.0` | Host bind address |
| `CORS_ORIGINS` | `*` | Allowed CORS origins (comma-separated or `*`) |
| `DATABASE_URL` | `sqlite:///./edunet.db` | SQLite or PostgreSQL connection string |
| `SIMULATION_DIR` | `./simulation` | Directory where NS-2 Tcl and trace files are stored |
| `STATIC_DIR` | `./frontend/dist` | Directory containing compiled React SPA files |
| `VITE_API_BASE` | `/api` | Base path for frontend API calls |
| `VITE_WS_URL` | *(Derived from host)* | WebSocket endpoint for real-time telemetry |

---

## 🛡️ Production Verification Checklist

- [x] All 7 backend automated tests passing (`pytest`)
- [x] Frontend TypeScript types & production build passing (`npm run build`)
- [x] Multi-stage root `Dockerfile` bundling Node build + Python 3.11 + NS-2
- [x] Nginx reverse-proxy configuration with WebSocket proxying (`Upgrade`/`Connection`)
- [x] CORS configurable via `CORS_ORIGINS`
- [x] Healthcheck endpoint `/api/health`
- [x] Static SPA serving with route fallback in single-container mode
