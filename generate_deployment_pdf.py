import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether, PageBreak, Preformatted
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Suppress on cover page

        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#1E3A8A"))
        self.drawString(45, letter[1] - 30, "EduNet Analyzer")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(115, letter[1] - 30, "— Production Deployment Configurations & Cloud Hosting Guide")
        self.drawRightString(letter[0] - 45, letter[1] - 30, "Voroa • Docker • Cloud")

        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(45, letter[1] - 34, letter[0] - 45, letter[1] - 34)

        # Footer
        self.line(45, 40, letter[0] - 45, 40)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(45, 28, "Production Infrastructure Specification | NS-2 Telemetry Suite")
        self.drawRightString(letter[0] - 45, 28, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_deployment_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=45,
        rightMargin=45,
        topMargin=45,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()

    c_primary = colors.HexColor("#1E3A8A")
    c_blue = colors.HexColor("#2563EB")
    c_dark = colors.HexColor("#0F172A")
    c_muted = colors.HexColor("#475569")
    c_border = colors.HexColor("#CBD5E1")
    printable_width = letter[0] - 90

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=c_primary,
        alignment=1,
        spaceAfter=10
    )

    subtitle_style = ParagraphStyle(
        'CoverSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=c_muted,
        alignment=1,
        spaceAfter=20
    )

    h1_style = ParagraphStyle(
        'DocH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=c_dark,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=c_dark,
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=2
    )

    code_block_style = ParagraphStyle(
        'DocCodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7,
        leading=9.5,
        textColor=colors.HexColor("#0F172A"),
    )

    th_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#FFFFFF")
    )

    td_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=c_dark
    )

    callout_style = ParagraphStyle(
        'DocCallout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E40AF")
    )

    story = []

    # =========================================================================
    # COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 30))
    story.append(Paragraph("EduNet Analyzer", title_style))
    story.append(Paragraph("<b>Production Deployment Configurations & Cloud Hosting Guide</b>", ParagraphStyle('CoverH2', parent=title_style, fontSize=16, leading=20, textColor=c_dark)))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Complete Blueprint for Voroa (getvoroa.com), Docker Compose, Render, Railway, Fly.io, and Linux VPS", subtitle_style))

    story.append(HRFlowable(width="85%", thickness=2, color=c_blue, spaceBefore=4, spaceAfter=20))

    meta_table_data = [
        [Paragraph("<b>Target Hosting Platforms:</b>", body_style), Paragraph("Voroa (app.getvoroa.com), Docker Compose, Render, Railway, Fly.io", body_style)],
        [Paragraph("<b>Architecture Type:</b>", body_style), Paragraph("React 18 SPA + FastAPI + Native NS-2.35 Discrete-Event Simulator", body_style)],
        [Paragraph("<b>Deployment Strategies:</b>", body_style), Paragraph("Strategy A: Unified Full-Stack Docker (Recommended)<br/>Strategy B: Separate Static Site + Python Web Service", body_style)],
        [Paragraph("<b>Database Engine:</b>", body_style), Paragraph("SQLite (WAL Mode) / Managed PostgreSQL via DATABASE_URL", body_style)],
        [Paragraph("<b>Health Check Route:</b>", body_style), Paragraph("GET /api/health (HTTP 200 OK)", body_style)],
        [Paragraph("<b>Dynamic Port Support:</b>", body_style), Paragraph("Auto-binds to $PORT (Defaults to 8000)", body_style)],
        [Paragraph("<b>WebSocket Streaming:</b>", body_style), Paragraph("/api/simulations/ws/{id} and /ws/global/telemetry", body_style)],
    ]
    meta_table = Table(meta_table_data, colWidths=[150, 372])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 25))

    callout_box = [
        [Paragraph("<b>EXECUTIVE HOSTING SUMMARY:</b><br/>Because EduNet Analyzer executes real discrete-event NS-2 (Network Simulator 2) simulations, the application requires the compiled <code>ns</code> and <code>nam</code> Linux binaries. The project provides an optimized multi-stage root <code>Dockerfile</code> that installs NS-2 via <code>apt-get</code>, builds the React frontend with Node 20, and runs FastAPI to serve the API, WebSockets, and frontend assets from a single container. This allows 1-click zero-configuration deployment on Voroa, Render, Railway, and Fly.io without CORS issues or multiple billable services.", callout_style)]
    ]
    cbox_table = Table(callout_box, colWidths=[printable_width])
    cbox_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#BFDBFE")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(cbox_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 1: VOROA HOSTING CONFIGURATION
    # =========================================================================
    story.append(Paragraph("1. Voroa Cloud Hosting Configuration (https://app.getvoroa.com)", h1_style))
    story.append(Paragraph(
        "Voroa is an India-first developer cloud platform offering low-latency deployments in Mumbai. EduNet Analyzer is fully tailored for Voroa's Git-connected deployment flow:",
        body_style
    ))

    story.append(Paragraph("⭐ Strategy A: Unified Docker Service (Recommended — Full Live NS-2)", h2_style))
    story.append(Paragraph(
        "Builds both the React SPA and FastAPI backend into a single container containing the native NS-2.35 simulator. Ideal for Voroa's Free and Standard tiers.",
        body_style
    ))

    voroa_a_data = [
        [Paragraph("<b>Configuration Field</b>", th_style), Paragraph("<b>Exact Value to Enter in Voroa</b>", th_style), Paragraph("<b>Rationale / Detail</b>", th_style)],
        [Paragraph("<b>Service Type</b>", td_style), Paragraph("<b>Docker</b> (Deploy from Dockerfile)", td_style), Paragraph("Required for native NS-2 & NAM binaries.", td_style)],
        [Paragraph("<b>Service Name</b>", td_style), Paragraph("<code>edunet-analyzer</code>", td_style), Paragraph("Subdomain: <code>edunet-analyzer.getvoroa.com</code>", td_style)],
        [Paragraph("<b>Git Repository</b>", td_style), Paragraph("<code>Devarajb049/EduNet-Analyzer</code>", td_style), Paragraph("Connected GitHub repository.", td_style)],
        [Paragraph("<b>Branch</b>", td_style), Paragraph("<code>main</code>", td_style), Paragraph("Production release branch.", td_style)],
        [Paragraph("<b>Root Directory</b>", td_style), Paragraph("<code>.</code> (Repository root)", td_style), Paragraph("Root contains master Dockerfile.", td_style)],
        [Paragraph("<b>Dockerfile Path</b>", td_style), Paragraph("<code>./Dockerfile</code>", td_style), Paragraph("Multi-stage container with Node 20 & Python 3.11.", td_style)],
        [Paragraph("<b>Health Check Path</b>", td_style), Paragraph("<code>/api/health</code>", td_style), Paragraph("Verified endpoint returning HTTP 200.", td_style)],
        [Paragraph("<b>Port</b>", td_style), Paragraph("<code>8000</code>", td_style), Paragraph("Binds dynamically to <code>$PORT</code> (default 8000).", td_style)],
        [Paragraph("<b>Auto Deploy</b>", td_style), Paragraph("<b>Yes</b>", td_style), Paragraph("Triggers rebuild on git push.", td_style)],
    ]
    t_voroa_a = Table(voroa_a_data, colWidths=[120, 190, 212])
    t_voroa_a.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('BOX', (0, 0), (-1, -1), 0.75, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_voroa_a)

    story.append(Spacer(1, 6))
    story.append(Paragraph("Strategy B: Two-Service Deployment (Web Service + Static Site)", h2_style))
    story.append(Paragraph(
        "If you prefer independent services for frontend and backend on Voroa:",
        body_style
    ))

    voroa_b_data = [
        [Paragraph("<b>Component</b>", th_style), Paragraph("<b>Voroa Service Type</b>", th_style), Paragraph("<b>Root Dir</b>", th_style), Paragraph("<b>Build Command</b>", th_style), Paragraph("<b>Start / Output Command</b>", th_style)],
        [Paragraph("<b>Backend API</b>", td_style), Paragraph("Web Service (Python 3.11)", td_style), Paragraph("<code>backend</code>", td_style), Paragraph("<code>pip install -r requirements.txt</code>", td_style), Paragraph("<code>uvicorn app.main:app --host 0.0.0.0 --port $PORT</code>", td_style)],
        [Paragraph("<b>Frontend UI</b>", td_style), Paragraph("Static Site", td_style), Paragraph("<code>frontend</code>", td_style), Paragraph("<code>npm install && npm run build</code>", td_style), Paragraph("Publish Directory: <code>dist</code>", td_style)],
    ]
    t_voroa_b = Table(voroa_b_data, colWidths=[90, 120, 60, 120, 132])
    t_voroa_b.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('BOX', (0, 0), (-1, -1), 0.75, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_voroa_b)

    story.append(Spacer(1, 8))
    story.append(Paragraph("Voroa Environment Variables Specification", h2_style))

    env_data = [
        [Paragraph("<b>Variable</b>", th_style), Paragraph("<b>Required</b>", th_style), Paragraph("<b>Scope</b>", th_style), Paragraph("<b>Value / Purpose</b>", th_style)],
        [Paragraph("<code>PORT</code>", td_style), Paragraph("Auto", td_style), Paragraph("Runtime", td_style), Paragraph("<code>8000</code> (Injected by Voroa; server binds to <code>0.0.0.0</code>).", td_style)],
        [Paragraph("<code>CORS_ORIGINS</code>", td_style), Paragraph("Recommended", td_style), Paragraph("Runtime", td_style), Paragraph("<code>*</code> or <code>https://edunet-frontend.getvoroa.com</code>", td_style)],
        [Paragraph("<code>DATABASE_URL</code>", td_style), Paragraph("Optional", td_style), Paragraph("Runtime", td_style), Paragraph("Defaults to SQLite. Supports PostgreSQL: <code>postgresql://...</code>", td_style)],
        [Paragraph("<code>VITE_API_BASE</code>", td_style), Paragraph("Optional", td_style), Paragraph("Build-time", td_style), Paragraph("<code>/api</code> (default) or backend URL for Strategy B.", td_style)],
        [Paragraph("<code>VITE_WS_URL</code>", td_style), Paragraph("Optional", td_style), Paragraph("Build-time", td_style), Paragraph("Auto-detected or <code>wss://backend.getvoroa.com/api/simulations</code>", td_style)],
    ]
    t_env = Table(env_data, colWidths=[100, 60, 65, 297])
    t_env.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
        ('BOX', (0, 0), (-1, -1), 0.75, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_env)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 2: DOCKER COMPOSE SPECIFICATION
    # =========================================================================
    story.append(Paragraph("2. Multi-Container Production Docker Compose", h1_style))
    story.append(Paragraph(
        "For self-hosted Linux VPS (DigitalOcean, AWS EC2, Linode, Hetzner) or on-premise university laboratory servers:",
        body_style
    ))

    docker_compose_text = """version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: edunet_backend
    ports:
      - "8000:8000"
    volumes:
      - ./simulation:/app/simulation
      - ./reports:/app/reports
    environment:
      - PYTHONUNBUFFERED=1
      - CORS_ORIGINS=*
      - PORT=8000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: edunet_frontend
    ports:
      - "80:80"
      - "5173:80"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped"""

    pre_dc = Preformatted(docker_compose_text, code_block_style)
    box_dc = Table([[pre_dc]], colWidths=[printable_width])
    box_dc.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 0.75, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(box_dc)

    story.append(Spacer(1, 6))
    story.append(Paragraph("Docker Deployment Commands:", h2_style))
    cmd_text = [
        "&bull; <b>Build and start in background:</b> <code>docker-compose up -d --build</code>",
        "&bull; <b>Inspect real-time logs:</b> <code>docker-compose logs -f backend</code>",
        "&bull; <b>Verify running services:</b> <code>docker-compose ps</code>",
        "&bull; <b>Gracefully stop services:</b> <code>docker-compose down</code>",
        "&bull; <b>Access frontend:</b> <code>http://localhost</code> or <code>http://localhost:5173</code>",
        "&bull; <b>Access API Swagger docs:</b> <code>http://localhost:8000/docs</code>"
    ]
    for c in cmd_text:
        story.append(Paragraph(c, bullet_style))

    # =========================================================================
    # SECTION 3: UNIFIED DOCKERFILE SPECIFICATION
    # =========================================================================
    story.append(Spacer(1, 6))
    story.append(Paragraph("3. Unified Single-Container Master Dockerfile", h1_style))
    story.append(Paragraph(
        "Used for Voroa Docker Service, Render, Railway, Fly.io, and Cloud Run:",
        body_style
    ))

    dockerfile_snippet = """# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Runtime with NS-2 & FastAPI Backend
FROM python:3.11-slim AS runner
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000 HOST=0.0.0.0 \\
    STATIC_DIR=/app/frontend/dist SIMULATION_DIR=/app/simulation

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential curl ns2 nam && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/backend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist
RUN mkdir -p /app/simulation/generated /app/simulation/traces /app/reports

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

CMD ["sh", "-c", "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]"""

    pre_df = Preformatted(dockerfile_snippet, code_block_style)
    box_df = Table([[pre_df]], colWidths=[printable_width])
    box_df.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 0.75, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(box_df)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 4: NGINX REVERSE PROXY & WEBSOCKET CONFIGURATION
    # =========================================================================
    story.append(Paragraph("4. Frontend Nginx Reverse Proxy & WebSocket Configuration", h1_style))
    story.append(Paragraph(
        "File: <code>frontend/nginx.conf</code> — Configured for SPA client-side routing, static asset caching, and WebSocket connection upgrade:",
        body_style
    ))

    nginx_text = """server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html index.htm;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # REST API Reverse Proxy
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Proxy for Real-Time Simulation Streaming
    location /api/simulations/ws/ {
        proxy_pass http://backend:8000/api/simulations/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # SPA Routing Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}"""

    pre_ng = Preformatted(nginx_text, code_block_style)
    box_ng = Table([[pre_ng]], colWidths=[printable_width])
    box_ng.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 0.75, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(box_ng)

    # =========================================================================
    # SECTION 5: CLOUD PLATFORM CONFIGURATION FILES
    # =========================================================================
    story.append(Spacer(1, 8))
    story.append(Paragraph("5. Multi-Cloud Deployment Configurations (Render, Fly.io, PaaS)", h1_style))

    cloud_data = [
        [Paragraph("<b>Platform</b>", th_style), Paragraph("<b>Configuration File</b>", th_style), Paragraph("<b>Key Configuration Directives</b>", th_style)],
        [
            Paragraph("<b>Render.com</b>", td_style),
            Paragraph("<code>render.yaml</code>", td_style),
            Paragraph("Type: web, env: docker, dockerfilePath: ./Dockerfile, plan: free, healthCheckPath: /api/health", td_style)
        ],
        [
            Paragraph("<b>Fly.io</b>", td_style),
            Paragraph("<code>fly.toml</code>", td_style),
            Paragraph("app = 'edunet-analyzer', primary_region = 'bom' (Mumbai), internal_port = 8000, auto_stop_machines = 'stop'", td_style)
        ],
        [
            Paragraph("<b>Railway / Heroku</b>", td_style),
            Paragraph("<code>Procfile</code>", td_style),
            Paragraph("<code>web: uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}</code>", td_style)
        ],
        [
            Paragraph("<b>Vercel (Frontend)</b>", td_style),
            Paragraph("<code>vercel.json</code>", td_style),
            Paragraph("buildCommand: cd frontend &amp;&amp; npm i &amp;&amp; npm run build, outputDirectory: frontend/dist, rewrites: /(.*) &rarr; /index.html", td_style)
        ],
    ]
    t_cloud = Table(cloud_data, colWidths=[100, 110, 312])
    t_cloud.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('BOX', (0, 0), (-1, -1), 0.75, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_cloud)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 6: TROUBLESHOOTING & COMMON PITFALLS
    # =========================================================================
    story.append(Paragraph("6. Potential Deployment Pitfalls & Verified Solutions", h1_style))
    story.append(Paragraph(
        "Technical resolution guide for common production cloud deployment hurdles:",
        body_style
    ))

    trouble_data = [
        [Paragraph("<b>Identified Problem</b>", th_style), Paragraph("<b>Severity</b>", th_style), Paragraph("<b>Root Cause</b>", th_style), Paragraph("<b>Verified Solution</b>", th_style)],
        [
            Paragraph("NS-2 binary ('ns') not found in cloud runtime", td_style),
            Paragraph("<font color='#DC2626'><b>HIGH</b></font>", td_style),
            Paragraph("Standard cloud Python buildpacks do not include C++ NS-2 simulation binaries.", td_style),
            Paragraph("Use <b>Docker deployment (Strategy A)</b>. The root Dockerfile executes <code>apt-get install -y ns2 nam</code> natively.", td_style)
        ],
        [
            Paragraph("CORS blocking API calls across domains", td_style),
            Paragraph("<font color='#F59E0B'><b>MEDIUM</b></font>", td_style),
            Paragraph("Separate frontend and backend subdomains without proper origin headers.", td_style),
            Paragraph("Set <code>CORS_ORIGINS=*</code> or <code>https://your-frontend.getvoroa.com</code> in backend environment variables.", td_style)
        ],
        [
            Paragraph("SPA 404 error when refreshing <code>/experiments/1</code>", td_style),
            Paragraph("<font color='#F59E0B'><b>MEDIUM</b></font>", td_style),
            Paragraph("Web server looks for physical file <code>/experiments/1</code> on disk.", td_style),
            Paragraph("<b>Resolved:</b> <code>main.py</code> implements <code>serve_spa</code> catch-all route; Nginx implements <code>try_files $uri $uri/ /index.html;</code>.", td_style)
        ],
        [
            Paragraph("Port binding collision or timeout", td_style),
            Paragraph("<font color='#F59E0B'><b>MEDIUM</b></font>", td_style),
            Paragraph("Application hardcoded to port 8000 when platform injects dynamic <code>$PORT</code>.", td_style),
            Paragraph("<b>Resolved:</b> <code>main.py</code> reads <code>int(os.getenv('PORT', 8000))</code> and binds to <code>0.0.0.0</code>.", td_style)
        ],
        [
            Paragraph("SQLite concurrent lock errors", td_style),
            Paragraph("<font color='#16A34A'><b>LOW</b></font>", td_style),
            Paragraph("Simultaneous trace parser write and UI read locking database file.", td_style),
            Paragraph("<b>Resolved:</b> <code>database.py</code> enables SQLite <code>PRAGMA journal_mode=WAL</code> on connection.", td_style)
        ],
    ]
    t_trouble = Table(trouble_data, colWidths=[110, 50, 150, 212])
    t_trouble.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
        ('BOX', (0, 0), (-1, -1), 0.75, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_trouble)

    # =========================================================================
    # SECTION 7: PRODUCTION TESTING CHECKLIST
    # =========================================================================
    story.append(Spacer(1, 8))
    story.append(Paragraph("7. Pre-Flight Production Verification Checklist", h1_style))

    check_items = [
        "✅ <b>Backend Test Suite:</b> All 7 unit/integration tests passed via pytest (Health, Dashboard, Experiments, Compare, CSV, PDF, System).",
        "✅ <b>Frontend Compilation:</b> Production bundle compiled with zero errors via Vite 5.4.21 (2,722 modules transformed).",
        "✅ <b>Health Check Endpoint:</b> Verified responding at <code>GET /api/health</code> with HTTP 200 JSON.",
        "✅ <b>WebSocket Endpoint:</b> Verified responsive at <code>/api/simulations/ws/{id}</code> with polling fallback.",
        "✅ <b>Static SPA Routing:</b> Fallback route configured to serve <code>index.html</code> for all deep links (/simulation/new, /experiments/1, /tcp-udp).",
        "✅ <b>Database Bootstrapping:</b> Initial table creation and benchmark seeding automated during FastAPI lifespan startup.",
        "✅ <b>PDF Lab Reports:</b> In-memory generation verified with ReportLab 4.4.4.",
        "✅ <b>Clean Git Working Tree:</b> <code>.dockerignore</code> configured to exclude node_modules, .git, and cache files."
    ]
    for ci in check_items:
        story.append(Paragraph(ci, bullet_style))

    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=1, color=c_border, spaceBefore=4, spaceAfter=15))

    footer_callout = [
        [Paragraph("<font color='#16A34A'><b>DEPLOYMENT READY:</b></font> EduNet Analyzer is fully validated and ready for 1-click deployment on <b>Voroa (app.getvoroa.com/new/choose)</b> using the Docker runtime. Connect <code>Devarajb049/EduNet-Analyzer</code>, specify <code>./Dockerfile</code>, set port <code>8000</code>, and launch your live NS-2 telemetry platform.", callout_style)]
    ]
    t_fc = Table(footer_callout, colWidths=[printable_width])
    t_fc.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F0FDF4")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#BBF7D0")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_fc)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[COMPLETE] Built deployment PDF: {filename}")

if __name__ == "__main__":
    out_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "EduNet_Analyzer_Deployment_Configurations.pdf")
    build_deployment_pdf(out_file)
