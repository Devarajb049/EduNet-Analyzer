import os
import json
import datetime
from sqlalchemy.orm import Session
from ..models import Experiment, Result
from .simulation_service import (
    TRACES_DIR, generate_calibrated_demo_trace, generate_tcl_script
)
from .trace_parser import parse_ns2_trace_file

SAMPLE_CONFIGS = [
    {
        "code": "EXP-001",
        "name": "Baseline TCP E-Learning Workload",
        "description": "Baseline evaluation of 10 student clients streaming e-learning courseware over TCP NewReno.",
        "users": 10,
        "protocol": "TCP",
        "traffic_level": "Low",
        "data_rate": "1 Mbps",
        "simulation_time": 60.0,
        "experiment_type": "Normal Traffic",
        "is_demo": True
    },
    {
        "code": "EXP-002",
        "name": "Baseline UDP Video Stream",
        "description": "Uncontrolled CBR video stream transmission for 10 users over UDP to inspect baseline packet delivery.",
        "users": 10,
        "protocol": "UDP",
        "traffic_level": "Low",
        "data_rate": "1 Mbps",
        "simulation_time": 60.0,
        "experiment_type": "TCP vs UDP",
        "is_demo": True
    },
    {
        "code": "EXP-003",
        "name": "Medium Traffic Class Lecture (TCP)",
        "description": "Mid-sized cohort of 50 simultaneous students interacting with online quiz portal.",
        "users": 50,
        "protocol": "TCP",
        "traffic_level": "Medium",
        "data_rate": "1 Mbps",
        "simulation_time": 60.0,
        "experiment_type": "Normal Traffic",
        "is_demo": True
    },
    {
        "code": "EXP-004",
        "name": "High Traffic Campus Peak Load (TCP)",
        "description": "Peak campus load of 100 students accessing multimedia laboratory resources simultaneously.",
        "users": 100,
        "protocol": "TCP",
        "traffic_level": "High",
        "data_rate": "1 Mbps",
        "simulation_time": 60.0,
        "experiment_type": "High Traffic",
        "is_demo": True
    },
    {
        "code": "EXP-005",
        "name": "High Traffic Video Broadcast (UDP)",
        "description": "Stress testing bottleneck core link with 100 simultaneous UDP lecture video streams.",
        "users": 100,
        "protocol": "UDP",
        "traffic_level": "High",
        "data_rate": "1 Mbps",
        "simulation_time": 60.0,
        "experiment_type": "TCP vs UDP",
        "is_demo": True
    },
    {
        "code": "EXP-006",
        "name": "Leaky Bucket Congestion Control",
        "description": "Traffic shaping demonstration using RED / Leaky Bucket queue smoothing at the border router.",
        "users": 50,
        "protocol": "TCP",
        "traffic_level": "High",
        "data_rate": "1 Mbps",
        "simulation_time": 60.0,
        "experiment_type": "Leaky Bucket",
        "is_demo": True
    },
    {
        "code": "EXP-007",
        "name": "Sliding Window Reliability Benchmark",
        "description": "Analysis of sliding window flow control dynamics with 25 students accessing assignment repository.",
        "users": 25,
        "protocol": "TCP",
        "traffic_level": "Medium",
        "data_rate": "1 Mbps",
        "simulation_time": 60.0,
        "experiment_type": "Sliding Window",
        "is_demo": True
    },
    {
        "code": "EXP-008",
        "name": "Go-Back-N Protocol Retransmission",
        "description": "Evaluation of cumulative acknowledgement and recovery behavior across 50 nodes.",
        "users": 50,
        "protocol": "TCP",
        "traffic_level": "High",
        "data_rate": "1 Mbps",
        "simulation_time": 60.0,
        "experiment_type": "Go-Back-N",
        "is_demo": True
    },
    {
        "code": "EXP-009",
        "name": "University E-Learning Performance Test",
        "description": "Campus-wide concurrent lecture streaming workload evaluating TCP Reno congestion behavior across 100 student nodes under peak university lecture load.",
        "users": 100,
        "protocol": "TCP",
        "traffic_level": "High",
        "data_rate": "1 Mbps",
        "simulation_time": 60.0,
        "experiment_type": "High Traffic",
        "is_demo": True,
        "fixed_results": {
            "throughput_kbps": 82.4,
            "packet_loss_percent": 7.8,
            "packet_delivery_ratio": 92.2,
            "average_delay_ms": 24.6,
            "packets_sent": 1000,
            "packets_received": 922,
            "packets_dropped": 78,
            "data_rate_kbps": 82.4,
            "summary_notes": "University E-Learning Performance Test (Demo): 100 student nodes under High traffic load achieved 82.4 Kbps throughput, 92.2% packet delivery ratio, and 24.6 ms average latency with 7.8% packet loss."
        }
    }
]

def seed_database(db: Session, force: bool = False):
    """Populates calibrated academic laboratory baseline experiments."""
    existing_count = db.query(Experiment).count()
    if existing_count >= len(SAMPLE_CONFIGS) and not force:
        # Check if EXP-009 exists
        exp9 = db.query(Experiment).filter(Experiment.id == 9).first()
        if exp9:
            return

    if force or existing_count == 0:
        db.query(Result).delete()
        db.query(Experiment).delete()
        db.commit()

    base_time = datetime.datetime.utcnow() - datetime.timedelta(hours=6)

    for i, cfg in enumerate(SAMPLE_CONFIGS):
        exp = Experiment(
            exp_code=cfg["code"],
            name=cfg["name"],
            description=cfg["description"],
            users=cfg["users"],
            protocol=cfg["protocol"],
            traffic_level=cfg["traffic_level"],
            data_rate=cfg["data_rate"],
            simulation_time=cfg["simulation_time"],
            experiment_type=cfg["experiment_type"],
            status="COMPLETED",
            is_demo=cfg["is_demo"],
            created_at=base_time + datetime.timedelta(minutes=i * 25)
        )
        db.add(exp)
        db.commit()
        db.refresh(exp)

        # Generate actual .tcl and .tr trace files on disk
        generate_tcl_script(
            experiment_id=exp.id,
            users=exp.users,
            protocol=exp.protocol,
            bottleneck_bw=exp.data_rate,
            sim_time=exp.simulation_time,
            experiment_type=exp.experiment_type
        )

        tr_filename = f"experiment_{exp.id}.tr"
        tr_path = os.path.join(TRACES_DIR, tr_filename)
        generate_calibrated_demo_trace(
            trace_path=tr_path,
            users=exp.users,
            protocol=exp.protocol,
            data_rate_str=exp.data_rate,
            sim_duration=exp.simulation_time,
            experiment_type=exp.experiment_type
        )
        exp.trace_file = tr_path
        db.commit()

        # Parse trace file to generate real metrics
        server_id = exp.users + 2
        metrics = parse_ns2_trace_file(
            trace_path=tr_path,
            server_node_id=server_id,
            simulation_duration=exp.simulation_time
        )

        if "fixed_results" in cfg:
            fixed = cfg["fixed_results"]
            summary = fixed["summary_notes"]
            result = Result(
                experiment_id=exp.id,
                throughput_kbps=fixed["throughput_kbps"],
                packet_loss_percent=fixed["packet_loss_percent"],
                packet_delivery_ratio=fixed["packet_delivery_ratio"],
                average_delay_ms=fixed["average_delay_ms"],
                packets_sent=fixed["packets_sent"],
                packets_received=fixed["packets_received"],
                packets_dropped=fixed["packets_dropped"],
                data_rate_kbps=fixed["data_rate_kbps"],
                time_series_json=json.dumps(metrics["time_series"]),
                summary_notes=summary
            )
        else:
            summary = (
                f"{exp.protocol} transmission with {exp.users} student nodes achieved "
                f"{metrics['throughput_kbps']} Kbps throughput, {metrics['packet_delivery_ratio']}% PDR, "
                f"and {metrics['average_delay_ms']} ms average delay under {exp.traffic_level} traffic load."
            )

            result = Result(
                experiment_id=exp.id,
                throughput_kbps=metrics["throughput_kbps"],
                packet_loss_percent=metrics["packet_loss_percent"],
                packet_delivery_ratio=metrics["packet_delivery_ratio"],
                average_delay_ms=metrics["average_delay_ms"],
                packets_sent=metrics["packets_sent"],
                packets_received=metrics["packets_received"],
                packets_dropped=metrics["packets_dropped"],
                data_rate_kbps=metrics["data_rate_kbps"],
                time_series_json=json.dumps(metrics["time_series"]),
                summary_notes=summary
            )
        db.add(result)
        db.commit()
