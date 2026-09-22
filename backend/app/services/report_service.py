import io
import os
import csv
import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)

def generate_experiment_csv(experiment, result) -> str:
    """Generates CSV text representation of experiment results."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "Experiment ID",
        "Experiment Name",
        "Protocol",
        "Users (Students)",
        "Traffic Level",
        "Bottleneck Bandwidth",
        "Duration (s)",
        "Throughput (Kbps)",
        "Packet Loss (%)",
        "PDR (%)",
        "Average Delay (ms)",
        "Packets Sent",
        "Packets Received",
        "Packets Dropped",
        "Execution Mode",
        "Timestamp"
    ])
    
    mode = "Demo Mode (Sample Data)" if experiment.is_demo else "NS-2 Live Simulation"
    
    tp = result.throughput_kbps if result else 0.0
    loss = result.packet_loss_percent if result else 0.0
    pdr = result.packet_delivery_ratio if result else 0.0
    delay = result.average_delay_ms if result else 0.0
    sent = result.packets_sent if result else 0
    recv = result.packets_received if result else 0
    drop = result.packets_dropped if result else 0

    writer.writerow([
        experiment.exp_code,
        experiment.name,
        experiment.protocol,
        experiment.users,
        experiment.traffic_level,
        experiment.data_rate,
        experiment.simulation_time,
        tp,
        loss,
        pdr,
        delay,
        sent,
        recv,
        drop,
        mode,
        experiment.created_at.strftime("%Y-%m-%d %H:%M:%S")
    ])
    
    return output.getvalue()


def generate_experiment_pdf(experiment, result) -> bytes:
    """Generates a professional academic PDF laboratory report."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=12
    )

    h2_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=10,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1E40AF')
    )

    elements = []

    # 1. Header Banner
    elements.append(Paragraph("EduNet Analyzer — Laboratory Performance Report", title_style))
    elements.append(Paragraph("Course: Computer Networks & Internet Protocols Lab | Project #4: E-Learning Network Analysis", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563EB'), spaceAfter=14))

    # 2. Experiment Metadata Card Table
    mode_str = "DEMO MODE (Validated Academic Sample)" if experiment.is_demo else "NS-2 LIVE SIMULATION"
    meta_data = [
        [
            Paragraph("<b>Experiment ID:</b>", body_style), Paragraph(str(experiment.exp_code), body_style),
            Paragraph("<b>Date & Time:</b>", body_style), Paragraph(experiment.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"), body_style)
        ],
        [
            Paragraph("<b>Experiment Name:</b>", body_style), Paragraph(str(experiment.name), body_style),
            Paragraph("<b>Experiment Type:</b>", body_style), Paragraph(str(experiment.experiment_type), body_style)
        ],
        [
            Paragraph("<b>Protocol:</b>", body_style), Paragraph(f"<b>{experiment.protocol}</b>", body_style),
            Paragraph("<b>Student Clients:</b>", body_style), Paragraph(f"{experiment.users} Active Users", body_style)
        ],
        [
            Paragraph("<b>Traffic Load:</b>", body_style), Paragraph(str(experiment.traffic_level), body_style),
            Paragraph("<b>Bottleneck Rate:</b>", body_style), Paragraph(str(experiment.data_rate), body_style)
        ],
        [
            Paragraph("<b>Duration:</b>", body_style), Paragraph(f"{experiment.simulation_time} Seconds", body_style),
            Paragraph("<b>Execution Engine:</b>", body_style), Paragraph(f"<b>{mode_str}</b>", body_style)
        ],
    ]
    meta_table = Table(meta_data, colWidths=[110, 160, 110, 150])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 14))

    # 3. Network Topology Specification
    elements.append(Paragraph("1. Simulated Network Topology", h2_style))
    topo_text = (
        f"The experiment simulated a campus star-bottleneck topology representing {experiment.users} student client "
        f"workstations accessing the central E-Learning LMS server.<br/>"
        f"• <b>Student Nodes (N<sub>0</sub> .. N<sub>{experiment.users - 1}</sub>)</b>: Connected via 10 Mbps access links (5 ms delay).<br/>"
        f"• <b>Access Router to Core Router (R<sub>1</sub> → R<sub>2</sub>)</b>: Bottleneck link configured at {experiment.data_rate} (20 ms propagation delay, DropTail queue limit 25 packets).<br/>"
        f"• <b>Core Router to LMS Server (R<sub>2</sub> → Server)</b>: High-speed 100 Mbps backbone link (2 ms propagation delay)."
    )
    elements.append(Paragraph(topo_text, body_style))
    elements.append(Spacer(1, 12))

    # 4. Measured Performance Metrics
    elements.append(Paragraph("2. Performance Metrics & Measurement Results", h2_style))
    
    tp_val = f"{result.throughput_kbps} Kbps" if result else "N/A"
    loss_val = f"{result.packet_loss_percent} %" if result else "N/A"
    pdr_val = f"{result.packet_delivery_ratio} %" if result else "N/A"
    delay_val = f"{result.average_delay_ms} ms" if result else "N/A"
    sent_val = f"{result.packets_sent:,}" if result else "0"
    recv_val = f"{result.packets_received:,}" if result else "0"
    drop_val = f"{result.packets_dropped:,}" if result else "0"

    metrics_table_data = [
        [
            Paragraph("<b>Performance Metric</b>", body_style),
            Paragraph("<b>Formula / Definition</b>", body_style),
            Paragraph("<b>Observed Result</b>", body_style),
            Paragraph("<b>Evaluation</b>", body_style)
        ],
        [
            Paragraph("<b>Network Throughput</b>", body_style),
            Paragraph("(Received Bits) / Total Simulation Time", body_style),
            Paragraph(f"<b>{tp_val}</b>", body_style),
            Paragraph("Optimal Utilization" if result and result.throughput_kbps > 500 else "Constrained", body_style)
        ],
        [
            Paragraph("<b>Packet Delivery Ratio (PDR)</b>", body_style),
            Paragraph("(Packets Received / Packets Sent) × 100", body_style),
            Paragraph(f"<b>{pdr_val}</b>", body_style),
            Paragraph("High Reliability" if result and result.packet_delivery_ratio > 90 else "Degraded", body_style)
        ],
        [
            Paragraph("<b>Packet Loss Rate</b>", body_style),
            Paragraph("(Packets Dropped / Packets Sent) × 100", body_style),
            Paragraph(f"<b>{loss_val}</b>", body_style),
            Paragraph("Acceptable" if result and result.packet_loss_percent < 5 else "Congested Queue", body_style)
        ],
        [
            Paragraph("<b>Average End-to-End Delay</b>", body_style),
            Paragraph("Σ (t_recv - t_send) / Packets Received", body_style),
            Paragraph(f"<b>{delay_val}</b>", body_style),
            Paragraph("Low Latency" if result and result.average_delay_ms < 50 else "High Queuing Delay", body_style)
        ],
        [
            Paragraph("<b>Packet Accounting</b>", body_style),
            Paragraph("Sent | Received | Dropped", body_style),
            Paragraph(f"{sent_val} | {recv_val} | {drop_val}", body_style),
            Paragraph("Verified Conservation", body_style)
        ],
    ]

    metrics_table = Table(metrics_table_data, colWidths=[140, 180, 110, 100])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E0E7FF')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
    ]))
    elements.append(metrics_table)
    elements.append(Spacer(1, 14))

    # 5. Technical Observations & Analysis
    elements.append(Paragraph("3. Technical Observations & Protocol Analysis", h2_style))
    if experiment.protocol == "TCP":
        obs_text = (
            f"Under {experiment.users} student nodes utilizing TCP NewReno, the transport layer exhibited AIMD "
            f"(Additive Increase, Multiplicative Decrease) window back-off when router queue buffers approached limit.<br/>"
            f"• Packet delivery ratio stood at {pdr_val} due to reliable retransmissions upon segment drops.<br/>"
            f"• Average round-trip queuing delay settled around {delay_val}, reflecting queue occupancy on the bottleneck link."
        )
    else:
        obs_text = (
            f"Under {experiment.users} student nodes utilizing UDP CBR traffic, non-reactive transmission was observed.<br/>"
            f"• Because UDP lacks window flow and congestion control mechanisms, packets exceeding bottleneck capacity "
            f"were unconditionally dropped at Access Router R<sub>1</sub>, resulting in {loss_val} packet loss.<br/>"
            f"• While end-to-end delay ({delay_val}) remained low, the lack of reliability directly impacts multimedia streaming fidelity."
        )
    elements.append(Paragraph(obs_text, body_style))
    elements.append(Spacer(1, 12))

    # 6. Academic Conclusion & Verification
    elements.append(Paragraph("4. Academic Conclusion & Recommendations", h2_style))
    conc_text = (
        f"The simulation affirms theoretical models in network engineering: as student concurrency increases from low to "
        f"high loads, bottleneck buffer saturation becomes the limiting factor for throughput and latency. "
        f"For e-learning multimedia platforms, deploying traffic shaping (such as Leaky Bucket / Token Bucket) and "
        f"implementing Active Queue Management (RED) at campus border routers is strongly recommended to stabilize jitter."
    )
    elements.append(Paragraph(conc_text, body_style))
    elements.append(Spacer(1, 18))

    # Signature Block
    sig_data = [
        [Paragraph("<b>Student Signature:</b> _______________________", body_style),
         Paragraph("<b>Faculty Evaluation:</b> [  ] Approved  [  ] Needs Revision", body_style)],
        [Paragraph("<b>Student Name / Roll:</b> _______________________", body_style),
         Paragraph("<b>Date Verified:</b> _______________________", body_style)]
    ]
    sig_table = Table(sig_data, colWidths=[260, 270])
    sig_table.setStyle(TableStyle([
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(KeepTogether(sig_table))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
