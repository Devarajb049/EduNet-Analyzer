import os
import shutil
import subprocess
import asyncio
import time
import json
import random
import math
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from ..models import Experiment, Result
from .trace_parser import parse_ns2_trace_file

# Simulation directories placed at project root or configured via environment variable
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SIMULATION_DIR = os.getenv("SIMULATION_DIR") or os.path.join(ROOT_DIR, "simulation")
TCL_DIR = os.path.join(SIMULATION_DIR, "generated")
TRACES_DIR = os.path.join(SIMULATION_DIR, "traces")
os.makedirs(TCL_DIR, exist_ok=True)
os.makedirs(TRACES_DIR, exist_ok=True)

# In-memory tracking for active simulation stages
active_simulations: Dict[int, Dict[str, Any]] = {}

class ConnectionManager:
    def __init__(self):
        self.active_sim_connections: Dict[int, List[Any]] = {}
        self.global_connections: List[Any] = []

    async def connect_sim(self, experiment_id: int, websocket: Any):
        await websocket.accept()
        if experiment_id not in self.active_sim_connections:
            self.active_sim_connections[experiment_id] = []
        self.active_sim_connections[experiment_id].append(websocket)

    def disconnect_sim(self, experiment_id: int, websocket: Any):
        if experiment_id in self.active_sim_connections:
            if websocket in self.active_sim_connections[experiment_id]:
                self.active_sim_connections[experiment_id].remove(websocket)
            if not self.active_sim_connections[experiment_id]:
                del self.active_sim_connections[experiment_id]

    async def broadcast_sim(self, experiment_id: int, data: dict):
        if experiment_id in self.active_sim_connections:
            disconnected = []
            for ws in self.active_sim_connections[experiment_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    disconnected.append(ws)
            for ws in disconnected:
                self.disconnect_sim(experiment_id, ws)

    async def connect_global(self, websocket: Any):
        await websocket.accept()
        self.global_connections.append(websocket)

    def disconnect_global(self, websocket: Any):
        if websocket in self.global_connections:
            self.global_connections.remove(websocket)

    async def broadcast_global(self, data: dict):
        disconnected = []
        for ws in self.global_connections:
            try:
                await ws.send_json(data)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect_global(ws)

ws_manager = ConnectionManager()

def to_wsl_path(win_path: str) -> str:
    """Converts a Windows absolute or relative path to a WSL POSIX path."""
    clean = os.path.abspath(win_path).replace("\\", "/")
    if len(clean) >= 2 and clean[1] == ":":
        drive = clean[0].lower()
        return f"/mnt/{drive}{clean[2:]}"
    return clean

def check_ns2_installation() -> Dict[str, Any]:
    """Check if NS-2 is available natively or inside WSL."""
    # 1. Native check
    native_ns = shutil.which("ns")
    if native_ns:
        return {"installed": True, "mode": "native", "path": native_ns, "cmd": ["ns"]}

    # 2. WSL check
    wsl = shutil.which("wsl")
    if wsl:
        try:
            res = subprocess.run(
                ["wsl", "-d", "Ubuntu", "--", "which", "ns"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if res.returncode == 0 and res.stdout.strip():
                return {
                    "installed": True,
                    "mode": "wsl",
                    "path": res.stdout.strip(),
                    "cmd": ["wsl", "-d", "Ubuntu", "--", "ns"]
                }
        except Exception:
            pass

    return {"installed": False, "mode": "none", "path": None, "cmd": []}


def generate_tcl_script(
    experiment_id: int,
    users: int,
    protocol: str,
    bottleneck_bw: str,
    sim_time: float,
    experiment_type: str,
    exp_code: Optional[str] = None,
    traffic_level: str = "Medium",
    packet_size: int = 1024,
    window_size: int = 32,
    is_wsl: bool = False
) -> str:
    """
    Generates an NS-2 Tcl simulation script for the university e-learning topology:
    N Students -> Access Router R1 -> Core Router R2 -> LMS Server
    """
    code = exp_code or f"EXP-{experiment_id:03d}"
    tcl_filename = f"{code}.tcl"
    tcl_path = os.path.join(TCL_DIR, tcl_filename)
    tr_filename = f"{code}.tr"
    tr_path = os.path.join(TRACES_DIR, tr_filename)
    nam_filename = f"{code}.nam"
    nam_path = os.path.join(TRACES_DIR, nam_filename)

    # Determine POSIX path if running in WSL
    if is_wsl:
        tr_target = to_wsl_path(tr_path)
        nam_target = to_wsl_path(nam_path)
    else:
        tr_target = tr_path.replace("\\", "/")
        nam_target = nam_path.replace("\\", "/")

    # Clean bandwidth string, e.g. "1 Mbps" -> "1Mb"
    bw = bottleneck_bw.replace(" ", "").replace("ps", "").replace("bps", "b")
    if not any(bw.endswith(suffix) for suffix in ["Mb", "Kb", "mb", "kb"]):
        bw = f"{bw}Mb"

    queue_type = "DropTail"
    queue_limit = 25
    if experiment_type == "Leaky Bucket":
        # Simulates Leaky Bucket / RED queue behavior
        queue_type = "RED"
        queue_limit = 35

    proto = protocol.upper()
    server_id = users + 2

    # Calculate CBR rate for UDP based on traffic level & concurrency
    rate_val = 1.0
    if "k" in bottleneck_bw.lower():
        rate_val = float(''.join(c for c in bottleneck_bw if c.isdigit() or c == '.') or 512) / 1000.0
    elif "m" in bottleneck_bw.lower():
        rate_val = float(''.join(c for c in bottleneck_bw if c.isdigit() or c == '.') or 1.0)

    traffic_multiplier = 0.5
    if traffic_level.upper() == "LOW":
        traffic_multiplier = 0.35
    elif traffic_level.upper() == "HIGH":
        traffic_multiplier = 1.25
    elif traffic_level.upper() == "CUSTOM":
        traffic_multiplier = 1.0

    per_user_rate_mb = max(0.01, round((rate_val * traffic_multiplier) / max(users, 1), 4))

    lines = [
        "# ==============================================================================",
        f"# EduNet Analyzer — Generated NS-2 Simulation: {exp_code}",
        f"# Users: {users} | Protocol: {proto} | Bottleneck: {bw} | Duration: {sim_time}s",
        "# ==============================================================================",
        "set ns [new Simulator]",
        "",
        f'set tracefile [open "{tr_target}" w]',
        "$ns trace-all $tracefile",
        f'set namfile [open "{nam_target}" w]',
        "$ns namtrace-all $namfile",
        "",
        "# 1. Create Student Nodes (0 to num_students - 1)",
        f"for {{set i 0}} {{$i < {users}}} {{incr i}} {{",
        "    set n($i) [$ns node]",
        "}",
        f"set r1 [$ns node]      ;# Access Router (ID: {users})",
        f"set r2 [$ns node]      ;# Core Router (ID: {users + 1})",
        f"set server [$ns node]  ;# E-Learning Server (ID: {server_id})",
        "",
        "# 2. Establish Links & Queue Topologies",
        f"# Student to Access Router Links (10Mb, 5ms delay)",
        f"for {{set i 0}} {{$i < {users}}} {{incr i}} {{",
        "    $ns duplex-link $n($i) $r1 10Mb 5ms DropTail",
        "}",
        "",
        f"# Campus Core Bottleneck Link (Bandwidth: {bw}, 20ms delay, Queue: {queue_type})",
        f"$ns duplex-link $r1 $r2 {bw} 20ms {queue_type}",
        f"$ns queue-limit $r1 $r2 {queue_limit}",
        "",
        f"# Core Router to E-Learning Server Link (100Mb, 2ms delay)",
        f"$ns duplex-link $r2 $server 100Mb 2ms DropTail",
        "",
        "# 3. Transport Agents and Application Workload Setup",
    ]

    if proto == "TCP":
        lines.extend([
            f"for {{set i 0}} {{$i < {users}}} {{incr i}} {{",
            "    set tcp($i) [new Agent/TCP/Newreno]",
            f"    $tcp($i) set window_ {window_size}",
            f"    $tcp($i) set packetSize_ {packet_size}",
            "    $ns attach-agent $n($i) $tcp($i)",
            "    set sink($i) [new Agent/TCPSink]",
            "    $ns attach-agent $server $sink($i)",
            "    $ns connect $tcp($i) $sink($i)",
            "    set ftp($i) [new Application/FTP]",
            "    $ftp($i) attach-agent $tcp($i)",
            f"    $ns at [expr 0.1 + ($i * 0.05)] \"$ftp($i) start\"",
            f"    $ns at {sim_time - 0.5} \"$ftp($i) stop\"",
            "}",
        ])
    else: # UDP / CBR
        lines.extend([
            f"for {{set i 0}} {{$i < {users}}} {{incr i}} {{",
            "    set udp($i) [new Agent/UDP]",
            "    $ns attach-agent $n($i) $udp($i)",
            "    set null($i) [new Agent/Null]",
            "    $ns attach-agent $server $null($i)",
            "    $ns connect $udp($i) $null($i)",
            "    set cbr($i) [new Application/Traffic/CBR]",
            f"    $cbr($i) set packetSize_ {packet_size}",
            f"    $cbr($i) set rate_ {per_user_rate_mb}Mb",
            "    $cbr($i) attach-agent $udp($i)",
            f"    $ns at [expr 0.1 + ($i * 0.05)] \"$cbr($i) start\"",
            f"    $ns at {sim_time - 0.5} \"$cbr($i) stop\"",
            "}",
        ])

    lines.extend([
        "",
        "# 4. Finish Procedure",
        f"$ns at {sim_time} \"finish\"",
        "proc finish {} {",
        "    global ns tracefile namfile",
        "    $ns flush-trace",
        "    close $tracefile",
        "    close $namfile",
        "    exit 0",
        "}",
        "",
        "$ns run"
    ])

    with open(tcl_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return tcl_path


def generate_calibrated_demo_trace(
    trace_path: str,
    users: int,
    protocol: str,
    data_rate_str: str,
    sim_duration: float,
    experiment_type: str
):
    """
    Generates a physically calibrated, realistic NS-2 trace file (.tr) 
    strictly for Demo Mode evaluation.
    """
    server_id = users + 2
    router1_id = users
    router2_id = users + 1

    rate_val = 1.0
    if "k" in data_rate_str.lower():
        rate_val = float(''.join(c for c in data_rate_str if c.isdigit() or c == '.') or 512) / 1000.0
    elif "m" in data_rate_str.lower():
        rate_val = float(''.join(c for c in data_rate_str if c.isdigit() or c == '.') or 1.0)

    capacity_pps = (rate_val * 1000000) / (1024 * 8)
    
    if protocol.upper() == "TCP":
        load_multiplier = 0.85 + min(users * 0.02, 0.45)
    else:
        load_multiplier = 0.95 + min(users * 0.03, 0.70)

    total_offered_rate_pps = capacity_pps * load_multiplier
    user_rate_pps = total_offered_rate_pps / max(users, 1)

    pkt_id = 0
    seq_num = 0
    current_time = 0.1

    queue_capacity = 25 if experiment_type != "Leaky Bucket" else 35
    current_queue = 0
    next_departure_time = 0.1

    lines = []
    
    while current_time < sim_duration - 0.5:
        for u in range(users):
            if current_time >= sim_duration - 0.5:
                break
            
            iat = random.expovariate(user_rate_pps) if user_rate_pps > 0 else 0.05
            current_time += iat
            
            pkt_id += 1
            seq_num += 1
            pkt_type = "tcp" if protocol.upper() == "TCP" else "cbr"
            pkt_size = 1024

            lines.append(f"+ {current_time:.6f} {u} {router1_id} {pkt_type} {pkt_size} ------- 1 {u}.0 {server_id}.0 {seq_num} {pkt_id}")
            t_dept = current_time + 0.0008
            lines.append(f"- {t_dept:.6f} {u} {router1_id} {pkt_type} {pkt_size} ------- 1 {u}.0 {server_id}.0 {seq_num} {pkt_id}")
            t_arr_r1 = t_dept + 0.005
            lines.append(f"r {t_arr_r1:.6f} {u} {router1_id} {pkt_type} {pkt_size} ------- 1 {u}.0 {server_id}.0 {seq_num} {pkt_id}")

            if t_arr_r1 < next_departure_time:
                current_queue += 1
            else:
                current_queue = max(0, current_queue - int((t_arr_r1 - next_departure_time) * capacity_pps))

            if current_queue > queue_capacity:
                lines.append(f"d {t_arr_r1:.6f} {router1_id} {router2_id} {pkt_type} {pkt_size} ------- 1 {u}.0 {server_id}.0 {seq_num} {pkt_id}")
            else:
                service_time = 1.0 / capacity_pps
                departure_time = max(t_arr_r1, next_departure_time) + service_time
                next_departure_time = departure_time
                
                lines.append(f"- {departure_time:.6f} {router1_id} {router2_id} {pkt_type} {pkt_size} ------- 1 {u}.0 {server_id}.0 {seq_num} {pkt_id}")
                t_arr_r2 = departure_time + 0.020
                lines.append(f"r {t_arr_r2:.6f} {router1_id} {router2_id} {pkt_type} {pkt_size} ------- 1 {u}.0 {server_id}.0 {seq_num} {pkt_id}")
                t_arr_srv = t_arr_r2 + 0.002
                lines.append(f"r {t_arr_srv:.6f} {router2_id} {server_id} {pkt_type} {pkt_size} ------- 1 {u}.0 {server_id}.0 {seq_num} {pkt_id}")

    with open(trace_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


async def run_simulation_task(experiment_id: int, db_factory):
    """
    Background worker orchestrating the genuine NS-2 execution pipeline:
    1. preparing        - Initializing simulation environment
    2. generating       - Generating dynamic Tcl script matching topology & parameters
    3. running          - Executing live NS-2 binary (via native or WSL)
    4. processing       - Parsing real NS-2 .tr trace file events
    5. calculating      - Calculating real throughput, delay, PDR, loss metrics
    6. completed        - Results stored in SQLite
    """
    db: Session = db_factory()
    try:
        exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
        if not exp:
            return

        exp.status = "preparing"
        db.commit()

        # Stage 1: preparing
        active_simulations[experiment_id] = {
            "status": "preparing",
            "progress": 10,
            "progress_percent": 10,
            "current_stage": "preparing",
            "message": f"Preparing Simulation: Initializing parameters for {exp.exp_code}...",
            "stage_message": "Preparing Simulation",
            "logs": [f"[{time.strftime('%H:%M:%S')}] Initialized experiment {exp.exp_code} (Users: {exp.users}, Protocol: {exp.protocol})"],
            "error": None
        }
        await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])
        await asyncio.sleep(0.5)

        # Detect NS-2 installation
        ns_info = check_ns2_installation()
        is_wsl = (ns_info["mode"] == "wsl")

        if not exp.is_demo and not ns_info["installed"]:
            err_msg = "❌ LIVE NS-2 SIMULATION UNAVAILABLE: NS-2 could not be executed. Please configure NS-2 correctly or switch to Demo Mode."
            active_simulations[experiment_id]["status"] = "failed"
            active_simulations[experiment_id]["current_stage"] = "failed"
            active_simulations[experiment_id]["error"] = err_msg
            active_simulations[experiment_id]["message"] = err_msg
            active_simulations[experiment_id]["stage_message"] = "❌ LIVE NS-2 SIMULATION UNAVAILABLE"
            active_simulations[experiment_id]["logs"].append(
                f"[{time.strftime('%H:%M:%S')}] [ERROR] LIVE SIMULATION UNAVAILABLE: NS-2 binary ('ns' or 'wsl ns') not found."
            )
            exp.status = "failed"
            db.commit()
            await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])
            return

        # Stage 2: generating
        active_simulations[experiment_id]["progress"] = 25
        active_simulations[experiment_id]["progress_percent"] = 25
        active_simulations[experiment_id]["current_stage"] = "generating"
        active_simulations[experiment_id]["status"] = "generating"
        active_simulations[experiment_id]["message"] = f"Generating NS-2 File: Dynamic topology with {exp.users} student nodes..."
        active_simulations[experiment_id]["stage_message"] = "Generating NS-2 File"
        active_simulations[experiment_id]["logs"].append(
            f"[{time.strftime('%H:%M:%S')}] Generating dynamic Tcl: {exp.users} Student Nodes -> Access Router R1 -> Core Router R2 -> LMS Server"
        )
        await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])

        tcl_script = generate_tcl_script(
            experiment_id=exp.id,
            exp_code=exp.exp_code,
            users=exp.users,
            protocol=exp.protocol,
            bottleneck_bw=exp.data_rate,
            sim_time=exp.simulation_time,
            experiment_type=exp.experiment_type,
            traffic_level=exp.traffic_level,
            packet_size=1024,
            window_size=32,
            is_wsl=is_wsl
        )
        active_simulations[experiment_id]["logs"].append(
            f"[{time.strftime('%H:%M:%S')}] Generated Tcl script: {os.path.basename(tcl_script)}"
        )
        await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])
        await asyncio.sleep(0.5)

        tr_filename = f"{exp.exp_code}.tr"
        tr_path = os.path.join(TRACES_DIR, tr_filename)
        server_id = exp.users + 2

        # Stage 3: running
        active_simulations[experiment_id]["progress"] = 50
        active_simulations[experiment_id]["progress_percent"] = 50
        active_simulations[experiment_id]["current_stage"] = "running"
        active_simulations[experiment_id]["status"] = "running"
        active_simulations[experiment_id]["stage_message"] = "Running Simulation"

        if not exp.is_demo:
            active_simulations[experiment_id]["message"] = f"Starting NS-2 ({ns_info['mode']}) for {exp.simulation_time}s simulation..."
            await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])

            if ns_info["mode"] == "wsl":
                wsl_tcl = to_wsl_path(tcl_script)
                cmd = ["wsl", "-d", "Ubuntu", "--", "bash", "-c", f'ns "{wsl_tcl}"']
            else:
                cmd = ["ns", tcl_script]

            active_simulations[experiment_id]["logs"].append(
                f"[{time.strftime('%H:%M:%S')}] Executing NS-2: {' '.join(cmd)}"
            )
            await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])

            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await proc.communicate()

                if proc.returncode != 0:
                    err_text = stderr.decode('utf-8', errors='ignore')[:300]
                    err_msg = "❌ Simulation Failed: The NS-2 simulation did not complete successfully. No simulated results were generated."
                    active_simulations[experiment_id]["status"] = "failed"
                    active_simulations[experiment_id]["current_stage"] = "failed"
                    active_simulations[experiment_id]["error"] = err_msg
                    active_simulations[experiment_id]["message"] = err_msg
                    active_simulations[experiment_id]["stage_message"] = "❌ Simulation Failed"
                    active_simulations[experiment_id]["logs"].append(
                        f"[{time.strftime('%H:%M:%S')}] [ERROR] NS-2 returned exit code {proc.returncode}: {err_text}"
                    )
                    exp.status = "failed"
                    db.commit()
                    await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])
                    return
                else:
                    active_simulations[experiment_id]["logs"].append(
                        f"[{time.strftime('%H:%M:%S')}] NS-2 discrete-event execution completed successfully (Exit code: 0)"
                    )
            except Exception as e:
                err_msg = f"❌ Simulation Failed: NS-2 process exception: {str(e)}"
                active_simulations[experiment_id]["status"] = "failed"
                active_simulations[experiment_id]["current_stage"] = "failed"
                active_simulations[experiment_id]["error"] = err_msg
                active_simulations[experiment_id]["message"] = err_msg
                active_simulations[experiment_id]["stage_message"] = "❌ Simulation Failed"
                active_simulations[experiment_id]["logs"].append(f"[{time.strftime('%H:%M:%S')}] [ERROR] Exception: {str(e)}")
                exp.status = "failed"
                db.commit()
                await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])
                return
        else:
            # Demo Mode Calibrated Generation
            active_simulations[experiment_id]["message"] = "Generating discrete-event demo trace records..."
            active_simulations[experiment_id]["logs"].append(
                f"[{time.strftime('%H:%M:%S')}] [DEMO MODE] Generating calibrated demonstration trace records..."
            )
            generate_calibrated_demo_trace(tr_path, exp.users, exp.protocol, exp.data_rate, exp.simulation_time, exp.experiment_type)
            exp.is_demo = True

        await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])
        await asyncio.sleep(0.5)

        # Stage 4: processing
        active_simulations[experiment_id]["progress"] = 75
        active_simulations[experiment_id]["progress_percent"] = 75
        active_simulations[experiment_id]["current_stage"] = "processing"
        active_simulations[experiment_id]["status"] = "processing"
        active_simulations[experiment_id]["stage_message"] = "Processing Trace"
        active_simulations[experiment_id]["message"] = "Parsing NS-2 trace file events (+, -, r, d) across all network links..."
        
        if not os.path.exists(tr_path) or os.path.getsize(tr_path) == 0:
            err_msg = "❌ Trace Processing Failed: The generated NS-2 trace could not be processed (file missing or empty)."
            active_simulations[experiment_id]["status"] = "failed"
            active_simulations[experiment_id]["current_stage"] = "failed"
            active_simulations[experiment_id]["error"] = err_msg
            active_simulations[experiment_id]["message"] = err_msg
            active_simulations[experiment_id]["stage_message"] = "❌ Trace Processing Failed"
            active_simulations[experiment_id]["logs"].append(f"[{time.strftime('%H:%M:%S')}] [ERROR] Trace file not found: {tr_path}")
            exp.status = "failed"
            db.commit()
            await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])
            return

        active_simulations[experiment_id]["logs"].append(
            f"[{time.strftime('%H:%M:%S')}] Reading trace file: {os.path.basename(tr_path)} ({os.path.getsize(tr_path):,} bytes)"
        )
        await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])

        try:
            metrics = parse_ns2_trace_file(
                trace_path=tr_path,
                server_node_id=server_id,
                simulation_duration=exp.simulation_time
            )
        except Exception as e:
            err_msg = f"❌ Trace Processing Failed: {str(e)}"
            active_simulations[experiment_id]["status"] = "failed"
            active_simulations[experiment_id]["current_stage"] = "failed"
            active_simulations[experiment_id]["error"] = err_msg
            active_simulations[experiment_id]["message"] = err_msg
            active_simulations[experiment_id]["stage_message"] = "❌ Trace Processing Failed"
            active_simulations[experiment_id]["logs"].append(f"[{time.strftime('%H:%M:%S')}] [ERROR] Parser failed: {str(e)}")
            exp.status = "failed"
            db.commit()
            await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])
            return

        active_simulations[experiment_id]["logs"].append(
            f"[{time.strftime('%H:%M:%S')}] Parsed events: {metrics['packets_sent']:,} Sent, {metrics['packets_received']:,} Received, {metrics['packets_dropped']:,} Dropped"
        )
        await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])
        await asyncio.sleep(0.5)

        # Stage 5: calculating
        active_simulations[experiment_id]["progress"] = 90
        active_simulations[experiment_id]["progress_percent"] = 90
        active_simulations[experiment_id]["current_stage"] = "calculating"
        active_simulations[experiment_id]["status"] = "calculating"
        active_simulations[experiment_id]["stage_message"] = "Calculating Metrics"
        active_simulations[experiment_id]["message"] = "Computing Throughput, End-to-End Latency, Packet Delivery Ratio, and Loss percentages..."
        await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])

        # Store in database
        exp.trace_file = tr_path
        exp.status = "COMPLETED"

        summary = (
            f"NS-2 {exp.protocol} transmission with {exp.users} student nodes achieved "
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

        # Stage 6: completed
        active_simulations[experiment_id]["progress"] = 100
        active_simulations[experiment_id]["progress_percent"] = 100
        active_simulations[experiment_id]["current_stage"] = "completed"
        active_simulations[experiment_id]["status"] = "completed"
        active_simulations[experiment_id]["stage_message"] = "Completed"
        active_simulations[experiment_id]["message"] = "Simulation and trace analytics completed successfully!"
        active_simulations[experiment_id]["logs"].append(
            f"[{time.strftime('%H:%M:%S')}] Metrics saved to database. Throughput: {metrics['throughput_kbps']} Kbps, PDR: {metrics['packet_delivery_ratio']}%"
        )
        await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])
        await ws_manager.broadcast_global({
            "type": "SIMULATION_COMPLETED",
            "experiment_id": experiment_id,
            "exp_code": exp.exp_code,
            "name": exp.name,
            "throughput_kbps": metrics["throughput_kbps"],
            "pdr_percent": metrics["packet_delivery_ratio"]
        })

    except Exception as e:
        db.rollback()
        if exp:
            exp.status = "failed"
            db.commit()
        if experiment_id in active_simulations:
            active_simulations[experiment_id]["status"] = "failed"
            active_simulations[experiment_id]["current_stage"] = "failed"
            active_simulations[experiment_id]["error"] = str(e)
            active_simulations[experiment_id]["message"] = str(e)
            active_simulations[experiment_id]["logs"].append(f"[{time.strftime('%H:%M:%S')}] ERROR: {str(e)}")
            await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])
    finally:
        db.close()
