import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether, PageBreak
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
            # Suppress header and footer on cover page
            return

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running Header
        self.drawString(54, letter[1] - 36, "EduNet Analyzer — Project Flow & Working Documentation")
        self.drawRightString(letter[0] - 54, letter[1] - 36, "NS-2 Simulation & Telemetry Platform")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)

        # Running Footer
        self.line(54, 45, letter[0] - 54, 45)
        self.drawString(54, 32, "Computer Networks & Internet Protocols Laboratory")
        self.drawRightString(letter[0] - 54, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom typography
    c_primary = colors.HexColor("#1E3A8A")     # Navy
    c_blue = colors.HexColor("#2563EB")        # Royal Blue
    c_dark = colors.HexColor("#0F172A")        # Slate 900
    c_muted = colors.HexColor("#64748B")       # Slate 500
    c_bg_light = colors.HexColor("#F8FAFC")    # Slate 50
    c_border = colors.HexColor("#E2E8F0")

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=c_primary,
        alignment=1, # Center
        spaceAfter=12
    )

    subtitle_style = ParagraphStyle(
        'CoverSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_muted,
        alignment=1,
        spaceAfter=20
    )

    tagline_style = ParagraphStyle(
        'CoverTagline',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=c_blue,
        alignment=1,
        spaceAfter=25
    )

    h1_style = ParagraphStyle(
        'DocH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_primary,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_dark,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=c_dark,
        spaceAfter=6
    )

    code_style = ParagraphStyle(
        'DocCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=6
    )

    callout_style = ParagraphStyle(
        'DocCallout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1E40AF")
    )

    viva_q_style = ParagraphStyle(
        'VivaQ',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=c_primary,
        spaceBefore=6,
        spaceAfter=2
    )

    viva_a_style = ParagraphStyle(
        'VivaA',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_dark,
        spaceAfter=6
    )

    story = []

    # -------------------------------------------------------------------------
    # COVER PAGE
    # -------------------------------------------------------------------------
    story.append(Spacer(1, 40))
    story.append(Paragraph("EduNet Analyzer", title_style))
    story.append(Paragraph("<b>Network Performance Analysis of a University E-Learning System</b>", ParagraphStyle('CoverH2', parent=title_style, fontSize=16, leading=20, textColor=c_dark)))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Simulate. Measure. Compare. Optimize.", tagline_style))
    story.append(Paragraph("Comprehensive Project Flow, Architecture, Discrete-Event NS-2 Simulation Pipeline & Working Documentation", subtitle_style))

    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="80%", thickness=2, color=c_blue, spaceBefore=5, spaceAfter=25))

    meta_table_data = [
        [Paragraph("<b>Project Platform:</b>", body_style), Paragraph("EduNet Analyzer Full-Stack Telemetry Suite", body_style)],
        [Paragraph("<b>Core Simulation Engine:</b>", body_style), Paragraph("NS-2.35 (Network Simulator 2 Discrete-Event Engine)", body_style)],
        [Paragraph("<b>Target Environment:</b>", body_style), Paragraph("University Computer Networks & Internet Protocols Laboratory", body_style)],
        [Paragraph("<b>Academic Alignment:</b>", body_style), Paragraph("VTU / Anna Univ / JNTU / AICTE / ABET Network Engineering Lab", body_style)],
        [Paragraph("<b>Full-Stack Framework:</b>", body_style), Paragraph("React 18 + TypeScript + Vite + Tailwind CSS + FastAPI + SQLite", body_style)],
        [Paragraph("<b>Author / Developer:</b>", body_style), Paragraph("Devaraj B (@Devarajb049)", body_style)],
        [Paragraph("<b>Date of Publication:</b>", body_style), Paragraph("October 2026", body_style)],
    ]
    meta_table = Table(meta_table_data, colWidths=[160, 320])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 40))
    callout_box = [
        [Paragraph("<b>CRITICAL ENGINEERING MANDATE:</b><br/>This project models an academic campus e-learning network using authentic discrete-event NS-2 discrete simulations. It is strictly NOT physical Wi-Fi monitoring or packet sniffing. Live Mode dynamically generates valid OTcl scripts, runs the NS-2 binary, parses actual .tr trace files, and computes mathematical metrics. Demo Mode provides isolated offline calibrated laboratory benchmarks without fake random numbers.", callout_style)]
    ]
    cbox_table = Table(callout_box, colWidths=[480])
    cbox_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#BFDBFE")),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(cbox_table)

    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # SECTION 1 & 2: PROBLEM STATEMENT & OBJECTIVES
    # -------------------------------------------------------------------------
    story.append(Paragraph("1. Project Problem Statement & Background", h1_style))
    story.append(Paragraph(
        "A modern university provides a variety of centralized academic services including live video streaming lectures, Learning Management Systems (LMS — Moodle, Canvas), student registration portals, and online examination engines. When hundreds of students access these services concurrently (such as during 9:00 AM class start times or timed mid-term examinations), the shared campus network infrastructure suffers severe congestion, buffer overflow at access routers, increased delay, and high packet drop rates.",
        body_style
    ))
    story.append(Paragraph(
        "This project develops a <b>Network Performance Analysis System (EduNet Analyzer)</b> to investigate how varying student user cohorts (10 to 200 nodes) and traffic data rates (100 Kbps to 10 Mbps) impact bottleneck communication performance using <b>NS-2 (Network Simulator 2)</b>.",
        body_style
    ))

    story.append(Paragraph("2. Core Project Objectives", h1_style))
    objectives = [
        "1. <b>Campus Topology Modeling:</b> Model university e-learning dynamics with $N$ student workstations, an Access Gateway Router ($R_1$), a Core Distribution Router ($R_2$), and a central LMS streaming server.",
        "2. <b>Live Discrete-Event Simulation:</b> Dynamically generate authentic NS-2 OTcl scripts and execute simulations natively or via WSL2 Ubuntu.",
        "3. <b>Automated Trace Ingestion:</b> Parse NS-2 packet event records (+, -, r, d) across all network links without synthetic approximations.",
        "4. <b>Metric Telemetry:</b> Compute mathematically verified Throughput (Kbps), Packet Delivery Ratio (PDR %), Packet Loss Rate (%), and Average End-to-End Latency (ms).",
        "5. <b>Protocol Engineering:</b> Contrast connection-oriented TCP (NewReno) with flow control against connectionless UDP (CBR) streaming.",
        "6. <b>Flow & Congestion Control Demonstration:</b> Provide interactive laboratory visualizers for Sliding Window flow control, Go-Back-N ARQ error recovery, and Leaky Bucket traffic shaping.",
        "7. <b>Academic Reporting:</b> Generate publication-grade PDF experiment records and raw CSV telemetry logs."
    ]
    for obj in objectives:
        story.append(Paragraph(obj, body_style))

    # -------------------------------------------------------------------------
    # SECTION 3: NETWORK TOPOLOGY
    # -------------------------------------------------------------------------
    story.append(Spacer(1, 8))
    story.append(Paragraph("3. Campus E-Learning Network Topology", h1_style))
    story.append(Paragraph(
        "The simulated university network represents distributed student client workstations accessing central campus servers through tiered network switches and routers:",
        body_style
    ))

    topo_table_data = [
        [Paragraph("<b>Topology Segment</b>", body_style), Paragraph("<b>Link Bandwidth</b>", body_style), Paragraph("<b>Propagation Delay</b>", body_style), Paragraph("<b>Queue Discipline</b>", body_style)],
        [Paragraph("Student Workstations (0..N-1) &rarr; Access Router R1", body_style), Paragraph("10 Mbps", body_style), Paragraph("5 ms", body_style), Paragraph("DropTail (FIFO)", body_style)],
        [Paragraph("<b>Bottleneck Core Trunk (R1 &rarr; R2)</b>", body_style), Paragraph("<b>100 Kbps &ndash; 10 Mbps</b>", body_style), Paragraph("<b>20 ms</b>", body_style), Paragraph("<b>DropTail / RED (Limit: 25)</b>", body_style)],
        [Paragraph("Core Router R2 &rarr; LMS Server (N+2)", body_style), Paragraph("100 Mbps", body_style), Paragraph("2 ms", body_style), Paragraph("DropTail", body_style)],
    ]
    topo_table = Table(topo_table_data, colWidths=[180, 100, 90, 110])
    topo_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(topo_table)

    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # SECTION 4: SYSTEM ARCHITECTURE & COMPLETE FLOW
    # -------------------------------------------------------------------------
    story.append(Paragraph("4. Complete System Architecture & Data Flow", h1_style))
    story.append(Paragraph(
        "The system coordinates four distinct operational layers: Browser Client, Application Gateway, Simulation Service, and Persistence Engine.",
        body_style
    ))

    arch_steps = [
        "<b>1. User Configuration (React 18 SPA):</b> Student selects student count (10-200), protocol (TCP/UDP), data rate, and duration on `/simulation/new`.",
        "<b>2. REST Dispatch (FastAPI):</b> Payload sent via `POST /api/simulations/run`. Backend inserts experiment with status `preparing`.",
        "<b>3. Dynamic Tcl Generation (Python):</b> Constructs valid NS-2 OTcl script configuring node objects, links, DropTail queues, and agents (`EXP-XXX.tcl`).",
        "<b>4. NS-2 Subprocess Execution:</b> Asynchronously executes `ns EXP-XXX.tcl` natively or via `wsl -d Ubuntu -- ns ...`. Output written to `EXP-XXX.tr`.",
        "<b>5. Trace Event Ingestion:</b> Reads packet events into memory. Matches packet IDs to extract sent timestamps, received timestamps, and dropped packets.",
        "<b>6. Mathematical Calculation:</b> Computes Throughput, Loss, Delay, and PDR. Generates 1-second time-series slices for graphing.",
        "<b>7. SQLite Persistence:</b> Persists metrics into `edunet.db` (WAL mode) and broadcasts completion event across WebSockets to the UI."
    ]
    for s in arch_steps:
        story.append(Paragraph(s, body_style))

    # -------------------------------------------------------------------------
    # SECTION 5: MATHEMATICAL METRICS
    # -------------------------------------------------------------------------
    story.append(Spacer(1, 8))
    story.append(Paragraph("5. Telemetry & Mathematical Metric Formulations", h1_style))
    story.append(Paragraph(
        "All metrics displayed in Live Mode are mathematically derived from the authentic `.tr` trace events:",
        body_style
    ))

    metrics_table_data = [
        [Paragraph("<b>Metric</b>", body_style), Paragraph("<b>Mathematical Formula</b>", body_style), Paragraph("<b>Engineering Meaning</b>", body_style)],
        [
            Paragraph("<b>Throughput (Kbps)</b>", body_style),
            Paragraph("<b>T = (Bytes Recv &times; 8) / (Duration &times; 1000)</b>", code_style),
            Paragraph("Rate of successfully delivered payload data at destination LMS server.", body_style)
        ],
        [
            Paragraph("<b>Packet Delivery Ratio (PDR %)</b>", body_style),
            Paragraph("<b>PDR = (Pkts Recv / Pkts Sent) &times; 100</b>", code_style),
            Paragraph("Fraction of transmitted packets arriving intact; reflects link reliability.", body_style)
        ],
        [
            Paragraph("<b>Packet Loss Rate (%)</b>", body_style),
            Paragraph("<b>Loss = (Pkts Dropped / Pkts Sent) &times; 100</b>", code_style),
            Paragraph("Percentage of packets discarded due to bottleneck router queue overflow.", body_style)
        ],
        [
            Paragraph("<b>Average End-to-End Delay (ms)</b>", body_style),
            Paragraph("<b>D = &Sigma;(T_recv - T_send) / N_recv &times; 1000</b>", code_style),
            Paragraph("Mean elapsed time traversing student workstation, link, and server queue.", body_style)
        ],
    ]
    m_table = Table(metrics_table_data, colWidths=[120, 180, 180])
    m_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(m_table)

    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # SECTION 6: PROTOCOL ENGINEERING & EXPERIMENTAL RESULTS
    # -------------------------------------------------------------------------
    story.append(Paragraph("6. Protocol Dynamics: TCP NewReno vs UDP CBR", h1_style))
    story.append(Paragraph(
        "EduNet Analyzer rigorously compares connection-oriented flow control against unregulated datagram streaming:",
        body_style
    ))

    protocol_data = [
        [Paragraph("<b>Attribute</b>", body_style), Paragraph("<b>TCP (Agent/TCP/NewReno)</b>", body_style), Paragraph("<b>UDP (Agent/UDP + CBR)</b>", body_style)],
        [Paragraph("Connection State", body_style), Paragraph("Connection-oriented (3-way handshake)", body_style), Paragraph("Connectionless datagram", body_style)],
        [Paragraph("Flow Regulation", body_style), Paragraph("Dynamic Sliding Window ($N$ frames)", body_style), Paragraph("None (Sends at fixed constant rate)", body_style)],
        [Paragraph("Congestion Avoidance", body_style), Paragraph("AIMD (Halves cwnd on packet drop)", body_style), Paragraph("Zero backoff (Pushes full rate)", body_style)],
        [Paragraph("Loss Behavior", body_style), Paragraph("Fast Retransmit & RTO recovery", body_style), Paragraph("Packets permanently lost", body_style)],
        [Paragraph("Typical Laboratory PDR", body_style), Paragraph("<b>92.0% &ndash; 99.8%</b>", body_style), Paragraph("<b>70.0% &ndash; 88.0%</b>", body_style)],
        [Paragraph("Academic Use Case", body_style), Paragraph("Exams, LMS quizzes, grade queries", body_style), Paragraph("Live video lecture broadcast", body_style)],
    ]
    proto_table = Table(protocol_data, colWidths=[120, 180, 180])
    proto_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(proto_table)

    story.append(Spacer(1, 10))
    story.append(Paragraph("7. User Scalability Benchmarks (10 to 200 Students)", h1_style))
    story.append(Paragraph(
        "Simulated discrete-event performance scaling as student concurrency increases across a 1 Mbps bottleneck link (20ms delay, DropTail queue = 25 packets):",
        body_style
    ))

    user_bench_data = [
        [Paragraph("<b>Student Cohort</b>", body_style), Paragraph("<b>Throughput (Kbps)</b>", body_style), Paragraph("<b>Packet Loss (%)</b>", body_style), Paragraph("<b>Avg Delay (ms)</b>", body_style), Paragraph("<b>PDR (%)</b>", body_style), Paragraph("<b>Queuing Status</b>", body_style)],
        [Paragraph("10 Students (Low)", body_style), Paragraph("820.0 Kbps", body_style), Paragraph("0.2%", body_style), Paragraph("27.4 ms", body_style), Paragraph("99.8%", body_style), Paragraph("Under-utilized", body_style)],
        [Paragraph("25 Students (Low)", body_style), Paragraph("910.0 Kbps", body_style), Paragraph("0.8%", body_style), Paragraph("31.2 ms", body_style), Paragraph("99.2%", body_style), Paragraph("Optimal", body_style)],
        [Paragraph("50 Students (Medium)", body_style), Paragraph("845.0 Kbps", body_style), Paragraph("3.4%", body_style), Paragraph("46.8 ms", body_style), Paragraph("96.6%", body_style), Paragraph("Queue filling", body_style)],
        [Paragraph("100 Students (High)", body_style), Paragraph("790.0 Kbps", body_style), Paragraph("8.2%", body_style), Paragraph("74.5 ms", body_style), Paragraph("91.8%", body_style), Paragraph("Buffer overflow", body_style)],
        [Paragraph("200 Students (High)", body_style), Paragraph("680.0 Kbps", body_style), Paragraph("18.5%", body_style), Paragraph("112.4 ms", body_style), Paragraph("81.5%", body_style), Paragraph("Severe congestion", body_style)],
    ]
    u_table = Table(user_bench_data, colWidths=[110, 85, 75, 75, 65, 70])
    u_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(u_table)

    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # SECTION 8: FLOW & CONGESTION CONTROL
    # -------------------------------------------------------------------------
    story.append(Paragraph("8. Reliable Transmission & Traffic Control Modules", h1_style))

    story.append(Paragraph("A. Sliding Window Protocol Simulator (/sliding-window)", h2_style))
    story.append(Paragraph(
        "Demonstrates pipelined transmission where up to $N$ frames (default $N=4$) can be in-flight before requiring an acknowledgment. Interactive controls allow stepping frames, changing window size, and simulating packet drop to observe sender window freezing until an ACK is received.",
        body_style
    ))

    story.append(Paragraph("B. Go-Back-N ARQ Protocol Simulator (/go-back-n)", h2_style))
    story.append(Paragraph(
        "Demonstrates cumulative ACK behavior and error recovery. If frame $k$ is dropped in the bottleneck link, the receiver (buffer capacity = 1) discards subsequent frames $k+1, k+2$. Upon Retransmission Timeout (RTO), the sender rewinds its window and re-sends all frames starting from $k$.",
        body_style
    ))

    story.append(Paragraph("C. Leaky Bucket Traffic Shaper (/leaky-bucket)", h2_style))
    story.append(Paragraph(
        "Models an access router queue tank (Capacity $C=40$ packets). Irregular student traffic arrivals (bursts up to 24 pkts/s) enter the bucket; packets are discharged onto the campus core trunk at a steady, constant bit rate (8 pkts/s). When arrival volume exceeds capacity, excess packets are dropped, protecting downstream links from collapse.",
        body_style
    ))

    # -------------------------------------------------------------------------
    # SECTION 9: COMPLETE LIST OF 16 SYSTEM PAGES
    # -------------------------------------------------------------------------
    story.append(Spacer(1, 8))
    story.append(Paragraph("9. Complete System Pages & Route Specifications", h1_style))

    pages_data = [
        [Paragraph("<b>Route</b>", body_style), Paragraph("<b>Page Title</b>", body_style), Paragraph("<b>Functional Responsibility</b>", body_style)],
        [Paragraph("<b>/</b> or <b>/dashboard</b>", code_style), Paragraph("Dashboard", body_style), Paragraph("High-level KPIs, user scalability trends, recent experiments.", body_style)],
        [Paragraph("<b>/simulation/new</b>", code_style), Paragraph("New Simulation", body_style), Paragraph("Form for students, data rate, protocol, queue, and duration.", body_style)],
        [Paragraph("<b>/simulation/monitor</b>", code_style), Paragraph("Simulation Monitor", body_style), Paragraph("Live 6-stage execution console via real-time WebSocket.", body_style)],
        [Paragraph("<b>/experiments</b>", code_style), Paragraph("Experiments History", body_style), Paragraph("Full historical registry, multi-parameter search, deletion.", body_style)],
        [Paragraph("<b>/experiments/:id</b>", code_style), Paragraph("Experiment Details", body_style), Paragraph("Deep-dive metrics report, packet counters, and time-series.", body_style)],
        [Paragraph("<b>/comparison</b>", code_style), Paragraph("Experiment Comparison", body_style), Paragraph("Side-by-side matrices and charts comparing 2-5 runs.", body_style)],
        [Paragraph("<b>/performance</b>", code_style), Paragraph("Performance Analysis", body_style), Paragraph("User load scaling analysis across 10, 25, 50, 100, 200 nodes.", body_style)],
        [Paragraph("<b>/tcp-udp</b>", code_style), Paragraph("TCP vs UDP", body_style), Paragraph("Direct comparative evaluation of TCP NewReno and UDP CBR.", body_style)],
        [Paragraph("<b>/congestion</b>", code_style), Paragraph("Congestion Analysis", body_style), Paragraph("Router buffer queue behavior, DropTail vs RED drop curves.", body_style)],
        [Paragraph("<b>/sliding-window</b>", code_style), Paragraph("Sliding Window", body_style), Paragraph("Interactive frame flow control animator with window $N$.", body_style)],
        [Paragraph("<b>/go-back-n</b>", code_style), Paragraph("Go-Back-N", body_style), Paragraph("Step-by-step frame loss injection and window rewind.", body_style)],
        [Paragraph("<b>/leaky-bucket</b>", code_style), Paragraph("Leaky Bucket", body_style), Paragraph("Visual buffer tank smoothing bursts to constant bit rate.", body_style)],
        [Paragraph("<b>/network</b>", code_style), Paragraph("Network Visualization", body_style), Paragraph("Interactive SVG campus topology showing nodes and links.", body_style)],
        [Paragraph("<b>/reports</b>", code_style), Paragraph("Reports", body_style), Paragraph("Download automated laboratory PDF reports and raw CSV traces.", body_style)],
        [Paragraph("<b>/settings</b>", code_style), Paragraph("System Status", body_style), Paragraph("API health, SQLite WAL mode, database reseeding controls.", body_style)],
        [Paragraph("<b>/settings/ns2</b>", code_style), Paragraph("NS-2 Setup", body_style), Paragraph("WSL2 Ubuntu setup guide, version check, and viva Q&A.", body_style)],
    ]
    pages_table = Table(pages_data, colWidths=[120, 110, 250])
    pages_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(pages_table)

    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # SECTION 10: VIVA VOCE PREPARATION (CRITICAL Q&A)
    # -------------------------------------------------------------------------
    story.append(Paragraph("10. Comprehensive Laboratory Viva Voce Examination Q&A", h1_style))
    story.append(Paragraph(
        "Essential conceptual and technical questions prepared for academic project defense and laboratory examinations:",
        body_style
    ))

    viva_qa = [
        (
            "Q1. What specific problem does EduNet Analyzer address?",
            "EduNet Analyzer evaluates how simultaneous student access to university e-learning services (LMS, live video, exam portals) saturates campus bottleneck links, causing router queue overflow, latency inflation, and packet drops. It uses discrete-event simulation to quantify these metrics under controlled, reproducible conditions."
        ),
        (
            "Q2. Why is NS-2 used instead of capturing physical Wi-Fi packets with Wireshark?",
            "Physical Wi-Fi captures only represent a single laptop's current channel conditions with uncontrollable background noise. NS-2 allows exact academic modeling of 10, 50, 100, or 200 student nodes, customizable queue capacities (DropTail/RED), and deterministic propagation delays."
        ),
        (
            "Q3. Explain the internal dual-language architecture of NS-2 (C++ vs OTcl).",
            "NS-2 uses C++ for per-packet processing, byte manipulation, and routing algorithms for maximum execution speed, while Object Tcl (OTcl) acts as the high-level scripting language used to assemble topology nodes, configure link delays, and schedule traffic sources without recompiling C++ code."
        ),
        (
            "Q4. What do the four primary flags (+, -, r, d) represent in an NS-2 trace file?",
            "'+' denotes a packet arriving and enqueuing in a link output buffer. '-' denotes the packet leaving the buffer and beginning link transmission. 'r' denotes the packet being successfully received at the next hop. 'd' denotes a dropped packet due to queue buffer exhaustion or collision."
        ),
        (
            "Q5. How is Throughput calculated from the trace file?",
            "By iterating through the trace file, identifying all 'r' (receive) events destined for the central LMS server node, summing their payload byte sizes, multiplying by 8 to obtain total bits, and dividing by total simulation duration in seconds: Throughput (Kbps) = (Bytes * 8) / (Time * 1000)."
        ),
        (
            "Q6. How is Average End-to-End Delay determined?",
            "For every unique packet ID $i$, the timestamp of its initial enqueue event at the originating student node ($T_{send}$) is recorded. When the packet arrives at the server, its arrival timestamp ($T_{recv}$) is recorded. Delay = $T_{recv} - T_{send}$. The average across all delivered packets gives the mean delay in milliseconds."
        ),
        (
            "Q7. What is Packet Delivery Ratio (PDR) and why is it important?",
            "PDR is the percentage of packets successfully delivered to the destination relative to the total number of packets transmitted by sources: PDR = (Received / Sent) * 100. It measures overall network transmission reliability."
        ),
        (
            "Q8. Why does TCP experience lower throughput than UDP during heavy congestion?",
            "TCP implements AIMD (Additive Increase Multiplicative Decrease) congestion avoidance. Upon detecting packet loss at the router, TCP cuts its congestion window (cwnd) in half and reduces its sending rate. UDP has no feedback mechanism and continues flooding packets at a constant rate, achieving higher raw throughput but inflicting heavy packet drops."
        ),
        (
            "Q9. What is the fundamental difference between DropTail and RED queuing?",
            "DropTail is a simple FIFO buffer that accepts packets until full (100%), then drops all arriving packets, causing severe TCP global synchronization. RED (Random Early Detection) monitors average queue size and drops packets probabilistically before the buffer fills up, signaling senders to gently throttle back."
        ),
        (
            "Q10. How does Go-Back-N ARQ handle a lost packet?",
            "The receiver maintains a buffer size of 1 and only accepts in-order frames. If frame 2 is lost, frames 3, 4, 5 are discarded as out-of-order. When the sender's timeout timer expires, it rewinds its window and retransmits frames 2, 3, 4, 5."
        ),
        (
            "Q11. How does Leaky Bucket traffic shaping reduce congestion?",
            "It smooths bursty, unpredictable student traffic into a regulated, constant bit-rate output. Bursts are held in an access router buffer tank and discharged at a fixed leak rate, preventing downstream trunk overload."
        ),
        (
            "Q12. Why is WSL2 Ubuntu used on Windows hosts?",
            "NS-2 is a POSIX/Linux application. WSL2 runs a genuine Linux kernel inside Windows 10/11 with zero overhead, allowing FastAPI to execute the native `ns` binary while translating filesystem paths seamlessly."
        ),
    ]

    for q, a in viva_qa:
        story.append(Paragraph(q, viva_q_style))
        story.append(Paragraph(a, viva_a_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] PDF Generated successfully: {filename}")

if __name__ == "__main__":
    out_pdf = os.path.join(os.path.dirname(os.path.abspath(__file__)), "EduNet_Analyzer_Project_Flow_and_Working_Documentation.pdf")
    build_pdf(out_pdf)
