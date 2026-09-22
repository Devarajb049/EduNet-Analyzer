import json
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Experiment, Result
from ..schemas import DashboardSummary, DashboardKPIs, ExperimentResponse, ResultResponse
from ..services.simulation_service import check_ns2_installation

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(mode: Optional[str] = None, db: Session = Depends(get_db)):
    exp_query = db.query(Experiment)
    if mode:
        m = mode.lower()
        if m in ("realtime", "live"):
            exp_query = exp_query.filter(Experiment.is_demo == False)
        elif m == "demo":
            exp_query = exp_query.filter(Experiment.is_demo == True)

    experiments = exp_query.order_by(Experiment.created_at.desc()).all()
    exp_ids = [e.id for e in experiments]
    results = db.query(Result).filter(Result.experiment_id.in_(exp_ids)).all() if exp_ids else []

    total_exps = len(experiments)

    if results:
        avg_tp = round(sum(r.throughput_kbps for r in results) / len(results), 2)
        avg_loss = round(sum(r.packet_loss_percent for r in results) / len(results), 2)
        avg_delay = round(sum(r.average_delay_ms for r in results) / len(results), 2)
        avg_pdr = round(sum(r.packet_delivery_ratio for r in results) / len(results), 2)
    else:
        avg_tp = avg_loss = avg_delay = avg_pdr = 0.0

    kpis = DashboardKPIs(
        total_experiments=total_exps,
        avg_throughput_kbps=avg_tp,
        avg_packet_loss_percent=avg_loss,
        avg_delay_ms=avg_delay,
        avg_pdr_percent=avg_pdr
    )

    # Format recent experiments
    recent_responses = []
    for exp in experiments[:8]:
        res_resp = None
        if exp.result:
            ts = json.loads(exp.result.time_series_json) if exp.result.time_series_json else []
            res_resp = ResultResponse(
                id=exp.result.id,
                experiment_id=exp.result.experiment_id,
                throughput_kbps=exp.result.throughput_kbps,
                packet_loss_percent=exp.result.packet_loss_percent,
                packet_delivery_ratio=exp.result.packet_delivery_ratio,
                average_delay_ms=exp.result.average_delay_ms,
                packets_sent=exp.result.packets_sent,
                packets_received=exp.result.packets_received,
                packets_dropped=exp.result.packets_dropped,
                data_rate_kbps=exp.result.data_rate_kbps,
                summary_notes=exp.result.summary_notes,
                time_series=ts
            )
        recent_responses.append(ExperimentResponse(
            id=exp.id,
            exp_code=exp.exp_code,
            name=exp.name,
            description=exp.description,
            users=exp.users,
            protocol=exp.protocol,
            traffic_level=exp.traffic_level,
            data_rate=exp.data_rate,
            simulation_time=exp.simulation_time,
            experiment_type=exp.experiment_type,
            status=exp.status,
            is_demo=exp.is_demo,
            trace_file=exp.trace_file,
            created_at=exp.created_at,
            result=res_resp
        ))

    # Calculate trends vs users for charts
    user_buckets = sorted(list(set(e.users for e in experiments if e.result)))
    tp_vs_users = []
    loss_vs_users = []
    delay_vs_users = []

    for u in user_buckets:
        tcp_exps = [e for e in experiments if e.users == u and e.protocol == "TCP" and e.result]
        udp_exps = [e for e in experiments if e.users == u and e.protocol == "UDP" and e.result]

        tcp_tp = round(sum(e.result.throughput_kbps for e in tcp_exps) / len(tcp_exps), 2) if tcp_exps else None
        udp_tp = round(sum(e.result.throughput_kbps for e in udp_exps) / len(udp_exps), 2) if udp_exps else None
        tp_vs_users.append({"users": u, "tcp": tcp_tp, "udp": udp_tp})

        tcp_loss = round(sum(e.result.packet_loss_percent for e in tcp_exps) / len(tcp_exps), 2) if tcp_exps else None
        udp_loss = round(sum(e.result.packet_loss_percent for e in udp_exps) / len(udp_exps), 2) if udp_exps else None
        loss_vs_users.append({"users": u, "tcp": tcp_loss, "udp": udp_loss})

        tcp_delay = round(sum(e.result.average_delay_ms for e in tcp_exps) / len(tcp_exps), 2) if tcp_exps else None
        udp_delay = round(sum(e.result.average_delay_ms for e in udp_exps) / len(udp_exps), 2) if udp_exps else None
        delay_vs_users.append({"users": u, "tcp": tcp_delay, "udp": udp_delay})

    # TCP vs UDP summary comparison
    all_tcp = [e.result for e in experiments if e.protocol == "TCP" and e.result]
    all_udp = [e.result for e in experiments if e.protocol == "UDP" and e.result]

    tcp_summary = {
        "throughput": round(sum(r.throughput_kbps for r in all_tcp) / len(all_tcp), 2) if all_tcp else 0.0,
        "loss": round(sum(r.packet_loss_percent for r in all_tcp) / len(all_tcp), 2) if all_tcp else 0.0,
        "delay": round(sum(r.average_delay_ms for r in all_tcp) / len(all_tcp), 2) if all_tcp else 0.0,
        "pdr": round(sum(r.packet_delivery_ratio for r in all_tcp) / len(all_tcp), 2) if all_tcp else 0.0,
        "count": len(all_tcp)
    }

    udp_summary = {
        "throughput": round(sum(r.throughput_kbps for r in all_udp) / len(all_udp), 2) if all_udp else 0.0,
        "loss": round(sum(r.packet_loss_percent for r in all_udp) / len(all_udp), 2) if all_udp else 0.0,
        "delay": round(sum(r.average_delay_ms for r in all_udp) / len(all_udp), 2) if all_udp else 0.0,
        "pdr": round(sum(r.packet_delivery_ratio for r in all_udp) / len(all_udp), 2) if all_udp else 0.0,
        "count": len(all_udp)
    }

    ns_info = check_ns2_installation()
    if mode and mode.lower() in ("realtime", "live"):
        mode_str = "NS-2 LIVE SIMULATION" if ns_info["installed"] else "REAL-TIME SIMULATION (NS-2 Required)"
    elif mode and mode.lower() == "demo":
        mode_str = "DEMO MODE — Sample Data"
    else:
        mode_str = "NS-2 LIVE SIMULATION" if ns_info["installed"] else "DEMO MODE — Sample Data"

    return DashboardSummary(
        kpis=kpis,
        recent_experiments=recent_responses,
        throughput_vs_users=tp_vs_users,
        loss_vs_users=loss_vs_users,
        delay_vs_users=delay_vs_users,
        tcp_vs_udp={"tcp": tcp_summary, "udp": udp_summary},
        system_mode=mode_str,
        is_ns2_available=ns_info["installed"]
    )
