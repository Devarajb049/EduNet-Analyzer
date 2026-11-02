import os
import shutil
import subprocess
import asyncio
import time
import json
import random
import math
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from ..models import Experiment, Result
from .trace_parser import (
    parse_ns2_trace_file,
    parse_gbn_sequence_trace,
    parse_leaky_bucket_comparison
)


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

_cached_ns_info: Optional[Dict[str, Any]] = None

def check_ns2_installation() -> Dict[str, Any]:
    """Check if NS-2 is available natively or inside WSL."""
    global _cached_ns_info
    if _cached_ns_info and _cached_ns_info.get("installed"):
        return _cached_ns_info

    # 1. Native check
    native_ns = shutil.which("ns")
    if native_ns:
        _cached_ns_info = {"installed": True, "mode": "native", "path": native_ns, "cmd": ["ns"]}
        return _cached_ns_info

    # 2. WSL check
    wsl = shutil.which("wsl")
    if wsl:
        # Check Ubuntu distro
        try:
            res = subprocess.run(
                ["wsl", "-d", "Ubuntu", "--", "which", "ns"],
                capture_output=True,
                text=True,
                timeout=15
            )
            if res.returncode == 0 and res.stdout.strip():
                _cached_ns_info = {
                    "installed": True,
                    "mode": "wsl",
                    "path": res.stdout.strip(),
                    "cmd": ["wsl", "-d", "Ubuntu", "--", "ns"]
                }
                return _cached_ns_info
        except Exception:
            pass

        # Check default WSL distro
        try:
            res = subprocess.run(
                ["wsl", "--", "which", "ns"],
                capture_output=True,
                text=True,
                timeout=15
            )
            if res.returncode == 0 and res.stdout.strip():
                _cached_ns_info = {
                    "installed": True,
                    "mode": "wsl",
                    "path": res.stdout.strip(),
                    "cmd": ["wsl", "--", "ns"]
                }
                return _cached_ns_info
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
    Generates an authentic NS-2 Tcl simulation script for the university e-learning topology:
    N Students -> Access Router R1 -> Bottleneck Core Link -> Core Router R2 -> LMS Server

    Course/Viva Architecture:
    - LOW PRESET: 10 students, 512Kbps bottleneck (light student browsing, near-zero drop)
    - MEDIUM PRESET: 50 students, 1Mbps bottleneck (classroom quiz/lecture, moderate queueing)
    - HIGH PRESET: 150 students, 2Mbps bottleneck (campus-wide exam peak, heavy queue saturation)
    - GO-BACK-N: Modeled via Agent/TCP (Tahoe) + cumulative TCPSink + link ErrorModel
    - LEAKY BUCKET: Bounded DropTail buffer (bucket capacity) drained at constant leak rate
    """
    code = exp_code or f"EXP-{experiment_id:03d}"
    tcl_filename = f"{code}.tcl"
    tcl_path = os.path.join(TCL_DIR, tcl_filename)
    tr_filename = f"{code}.tr"
    tr_path = os.path.join(TRACES_DIR, tr_filename)

    # Determine POSIX path if running inside WSL
    if is_wsl:
        tr_target = to_wsl_path(tr_path)
    else:
        tr_target = tr_path.replace("\\", "/")

    # Standardize Presets according to academic requirement
    traffic_upper = traffic_level.upper()
    if traffic_upper == "LOW":
        eff_users = 10
        eff_bw = "512Kb"
        per_user_rate_mb = 0.064
        queue_limit = 20
    elif traffic_upper == "MEDIUM":
        eff_users = 50
        eff_bw = "1Mb"
        per_user_rate_mb = 0.250
        queue_limit = 25
    elif traffic_upper == "HIGH":
        eff_users = 150
        eff_bw = "2Mb"
        per_user_rate_mb = 0.500
        queue_limit = 35
    else: # CUSTOM
        eff_users = max(1, users)
        clean_bw = bottleneck_bw.replace(" ", "").replace("ps", "").replace("bps", "b")
        if not any(clean_bw.endswith(s) for s in ["Mb", "Kb", "mb", "kb"]):
            clean_bw = f"{clean_bw}Mb"
        eff_bw = clean_bw
        rate_val = 1.0
        if "k" in bottleneck_bw.lower():
            rate_val = float(''.join(c for c in bottleneck_bw if c.isdigit() or c == '.') or 512) / 1000.0
        elif "m" in bottleneck_bw.lower():
            rate_val = float(''.join(c for c in bottleneck_bw if c.isdigit() or c == '.') or 1.0)
        per_user_rate_mb = max(0.01, round(rate_val / max(eff_users, 1), 4))
        queue_limit = 25

    proto = protocol.upper()
    server_id = eff_users + 2

    lines = [
        "# ==============================================================================",
        f"# EduNet Analyzer — Dynamic NS-2 Simulation: {code}",
        f"# Course: Computer Networks & University E-Learning Telemetry",
        f"# Students: {eff_users} | Protocol: {proto} | Bottleneck: {eff_bw} | Duration: {sim_time}s",
        "#",
        "# TOPOLOGY OVERVIEW (VIVA DEFENSE):",
        "# 1. N Student Workstations [0 .. N-1] generate traffic into Gateway R1",
        "# 2. Access Links: 10 Mbps, 5 ms delay, DropTail (LAN connectivity)",
        "# 3. Campus Core Bottleneck Link: R1 -> R2 with configured bandwidth & DropTail queue",
        "# 4. LMS Datacenter Link: R2 -> Server with 100 Mbps, 2 ms delay",
        "# ==============================================================================",
        "set ns [new Simulator]",
        "",
        "# Open Wired Event Trace File",
        f'set tracefile [open "{tr_target}" w]',
        "$ns trace-all $tracefile",
        "",
        "# --- 1. Node Creation ---",
        f"for {{set i 0}} {{$i < {eff_users}}} {{incr i}} {{",
        "    set n($i) [$ns node]",
        "}",
        f"set r1 [$ns node]      ;# Access Gateway Router (ID: {eff_users})",
        f"set r2 [$ns node]      ;# Datacenter Core Router (ID: {eff_users + 1})",
        f"set server [$ns node]  ;# University LMS Server (ID: {server_id})",
        "",
        "# --- 2. Link Establishment & Queue Disciplines ---",
        f"# LAN Access links: Student -> Access Router R1 (10Mb, 5ms delay)",
        f"for {{set i 0}} {{$i < {eff_users}}} {{incr i}} {{",
        "    $ns duplex-link $n($i) $r1 10Mb 5ms DropTail",
        "}",
        "",
    ]

    if experiment_type == "Leaky Bucket":
        # ----------------------------------------------------------------------
        # VIVA EXPLANATION: Leaky Bucket Traffic Shaper in NS-2
        # A Leaky Bucket buffer drains irregular bursts at a strictly constant rate.
        # In NS-2, this is modeled by inserting an intermediate Shaper node:
        # Link R1 -> Shaper: Bounded DropTail queue (Capacity = Bucket Size B).
        # Link Shaper -> R2: Bandwidth constrained to constant Leak Rate (e.g. 512Kbps).
        # ----------------------------------------------------------------------
        shaper_id = eff_users + 3
        server_id = eff_users + 4
        lines.extend([
            f"set shaper [$ns node]  ;# Leaky Bucket Shaper Node (ID: {shaper_id})",
            f"# Inflow Buffer into Leaky Bucket: Bounded queue capacity = 20 packets",
            f"$ns duplex-link $r1 $shaper 10Mb 1ms DropTail",
            f"$ns queue-limit $r1 $shaper 20",
            f"# Regulated Outflow: Constant leak rate draining into Core Router R2",
            f"$ns duplex-link $shaper $r2 {eff_bw} 20ms DropTail",
            f"# Backbone link to Server",
            f"$ns duplex-link $r2 $server 100Mb 2ms DropTail",
        ])
    else:
        lines.extend([
            f"# Campus Trunk Bottleneck Link: R1 -> R2 (Bandwidth: {eff_bw}, Delay: 20ms)",
            f"$ns duplex-link $r1 $r2 {eff_bw} 20ms DropTail",
            f"$ns queue-limit $r1 $r2 {queue_limit}",
            f"# Backbone link: Core Router R2 -> Central LMS Server (100Mb, 2ms delay)",
            f"$ns duplex-link $r2 $server 100Mb 2ms DropTail",
        ])

    # If Go-Back-N, attach ErrorModel to bottleneck
    if experiment_type == "Go-Back-N":
        lines.extend([
            "",
            "# --------------------------------------------------------------------------",
            "# VIVA EXPLANATION: Go-Back-N Link Error Injection",
            "# An ErrorModel is inserted on the bottleneck link R1->R2 with a 5% drop rate.",
            "# When packets drop, cumulative ACK gaps trigger timeout / Go-Back-N recovery.",
            "# --------------------------------------------------------------------------",
            "set em [new ErrorModel]",
            "$em set rate_ 0.05",
            "$em unit pkt",
            "$em ranvar [new RandomVariable/Uniform]",
            "$em drop-target [new Agent/Null]",
            "$ns lossmodel $em $r1 $r2",
        ])

    lines.extend([
        "",
        "# --- 3. Transport Protocols & Workload Traffic ---"
    ])

    if "TCP" in proto:
        # Determine agent type: Tahoe for pure Go-Back-N, NewReno for standard e-learning
        tcp_agent = "Agent/TCP" if experiment_type == "Go-Back-N" else "Agent/TCP/Newreno"
        lines.extend([
            f"# Transport: {tcp_agent} with Cumulative TCPSink at LMS Server",
            f"for {{set i 0}} {{$i < {eff_users}}} {{incr i}} {{",
            f"    set tcp($i) [new {tcp_agent}]",
            f"    $tcp($i) set window_ {window_size}",
            f"    $tcp($i) set packetSize_ {packet_size}",
            f"    $ns attach-agent $n($i) $tcp($i)",
            f"    set sink($i) [new Agent/TCPSink]",
            f"    $ns attach-agent $server $sink($i)",
            f"    $ns connect $tcp($i) $sink($i)",
            f"    set ftp($i) [new Application/FTP]",
            f"    $ftp($i) attach-agent $tcp($i)",
            f"    # Staggered student start times to model realistic access arrival",
            f"    set start_t [expr 0.1 + ($i * 0.03)]",
            f"    $ns at $start_t \"$ftp($i) start\"",
            f"    $ns at {sim_time - 0.5} \"$ftp($i) stop\"",
            f"}}",
        ])
    else: # UDP Constant Bit Rate Stream
        lines.extend([
            f"# Transport: Connectionless UDP with Loss-Tolerant CBR Video Application",
            f"for {{set i 0}} {{$i < {eff_users}}} {{incr i}} {{",
            f"    set udp($i) [new Agent/UDP]",
            f"    $ns attach-agent $n($i) $udp($i)",
            f"    set null($i) [new Agent/Null]",
            f"    $ns attach-agent $server $null($i)",
            f"    $ns connect $udp($i) $null($i)",
            f"    set cbr($i) [new Application/Traffic/CBR]",
            f"    $cbr($i) set packetSize_ {packet_size}",
            f"    $cbr($i) set rate_ {per_user_rate_mb}Mb",
            f"    $cbr($i) attach-agent $udp($i)",
            f"    set start_t [expr 0.1 + ($i * 0.03)]",
            f"    $ns at $start_t \"$cbr($i) start\"",
            f"    $ns at {sim_time - 0.5} \"$cbr($i) stop\"",
            f"}}",
        ])

    lines.extend([
        "",
        "# --- 4. Simulation Termination ---",
        f"$ns at {sim_time} \"finish\"",
        "proc finish {} {",
        "    global ns tracefile",
        "    $ns flush-trace",
        "    close $tracefile",
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
        exp.status = "running"
        db.commit()

        if not exp.is_demo:
            active_simulations[experiment_id]["message"] = f"Starting NS-2 ({ns_info['mode']}) for {exp.simulation_time}s simulation..."
            await ws_manager.broadcast_sim(experiment_id, active_simulations[experiment_id])

            if ns_info["mode"] == "wsl":
                wsl_tcl = to_wsl_path(tcl_script)
                # Pass wsl_tcl directly to avoid shell quote stripping on paths with spaces
                cmd = ["wsl", "-d", "Ubuntu", "--", "ns", wsl_tcl]
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
                
                # Simulation duration + buffer safety timeout
                sim_timeout = max(float(exp.simulation_time) * 1.5, 90.0)
                try:
                    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=sim_timeout)
                except asyncio.TimeoutError:
                    try:
                        proc.kill()
                    except Exception:
                        pass
                    raise TimeoutError(f"NS-2 execution timed out after {int(sim_timeout)}s")

                if proc.returncode != 0:
                    err_text = stderr.decode('utf-8', errors='ignore')[:300]
                    err_msg = f"❌ Simulation Failed: NS-2 returned exit code {proc.returncode}."
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


# In-memory storage for latest specialized analysis results
latest_gbn_result: Optional[Dict[str, Any]] = None
latest_leaky_bucket_result: Optional[Dict[str, Any]] = None


async def execute_ns2_command_async(tcl_path: str, sim_time: float) -> bool:
    """Executes an NS-2 script via WSL or native ns with safe timeout."""
    ns_info = check_ns2_installation()
    if not ns_info["installed"]:
        raise RuntimeError("NS-2 discrete-event engine is not installed or available.")

    if ns_info["mode"] == "wsl":
        wsl_tcl = to_wsl_path(tcl_path)
        cmd = ["wsl", "-d", "Ubuntu", "--", "ns", wsl_tcl]
    else:
        cmd = ["ns", tcl_path]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    timeout = max(float(sim_time) * 2.0, 90.0)
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        try:
            proc.kill()
        except Exception:
            pass
        raise TimeoutError(f"NS-2 execution timed out after {int(timeout)}s")

    if proc.returncode != 0:
        err_msg = stderr.decode('utf-8', errors='ignore')
        raise RuntimeError(f"NS-2 exited with code {proc.returncode}: {err_msg[:300]}")

    return True


def generate_gbn_tcl_script(
    code: str,
    window_size: int,
    loss_rate: float,
    sim_time: float,
    is_wsl: bool = False
) -> Tuple[str, str]:
    """
    Generates an NS-2 Tcl script specifically for Go-Back-N analysis.
    Uses Agent/TCP (Tahoe) with cumulative TCPSink and an ErrorModel on the bottleneck.
    """
    tcl_path = os.path.join(TCL_DIR, f"{code}.tcl")
    tr_path = os.path.join(TRACES_DIR, f"{code}.tr")
    tr_target = to_wsl_path(tr_path) if is_wsl else tr_path.replace("\\", "/")

    lines = [
        "# ==============================================================================",
        f"# EduNet Analyzer — Go-Back-N (GBN) Simulation: {code}",
        f"# Window Size: {window_size} | Link Loss Rate: {loss_rate} | Duration: {sim_time}s",
        "#",
        "# VIVA EXPLANATION: Go-Back-N Mapping in NS-2",
        "# - NS-2 models Go-Back-N using Agent/TCP (Tahoe).",
        "# - TCPSink sends cumulative acknowledgments acknowledging the highest in-order frame.",
        "# - On packet loss detected via timeout or 3 duplicate ACKs, Tahoe resets cwnd to 1",
        "#   and retransmits all unacknowledged packets from the lost packet forward.",
        "# - An ErrorModel is inserted between R1 and R2 to drop packets at rate loss_rate.",
        "# ==============================================================================",
        "set ns [new Simulator]",
        f'set tracefile [open "{tr_target}" w]',
        "$ns trace-all $tracefile",
        "",
        "# Nodes: Student sender (0) -> Access Router R1 (1) -> Core Router R2 (2) -> LMS Server (3)",
        "set s [$ns node]",
        "set r1 [$ns node]",
        "set r2 [$ns node]",
        "set srv [$ns node]",
        "",
        "$ns duplex-link $s $r1 10Mb 5ms DropTail",
        "$ns duplex-link $r1 $r2 1Mb 20ms DropTail",
        "$ns queue-limit $r1 $r2 15",
        "$ns duplex-link $r2 $srv 100Mb 2ms DropTail",
        "",
        "# Link ErrorModel representing channel packet loss",
        "set em [new ErrorModel]",
        f"$em set rate_ {loss_rate}",
        "$em unit pkt",
        "$em ranvar [new RandomVariable/Uniform]",
        "$em drop-target [new Agent/Null]",
        "$ns lossmodel $em $r1 $r2",
        "",
        "# Tahoe TCP Agent modeling Go-Back-N sliding window flow control",
        "set tcp [new Agent/TCP]",
        f"$tcp set window_ {window_size}",
        "$tcp set packetSize_ 1024",
        "$ns attach-agent $s $tcp",
        "",
        "set sink [new Agent/TCPSink]",
        "$ns attach-agent $srv $sink",
        "$ns connect $tcp $sink",
        "",
        "# FTP Application generating bulk student file submission workload",
        "set ftp [new Application/FTP]",
        "$ftp attach-agent $tcp",
        "$ns at 0.1 \"$ftp start\"",
        f"$ns at {sim_time - 0.2} \"$ftp stop\"",
        f"$ns at {sim_time} \"finish\"",
        "",
        "proc finish {} {",
        "    global ns tracefile",
        "    $ns flush-trace",
        "    close $tracefile",
        "    exit 0",
        "}",
        "$ns run"
    ]

    with open(tcl_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return tcl_path, tr_path


async def run_gbn_simulation(
    window_size: int = 8,
    loss_rate: float = 0.05,
    sim_time: float = 10.0
) -> Dict[str, Any]:
    """Runs a real NS-2 simulation for Go-Back-N and parses the sequence trace."""
    global latest_gbn_result
    ns_info = check_ns2_installation()
    is_wsl = (ns_info["mode"] == "wsl")

    code = f"GBN-LIVE-{int(time.time()) % 100000}"
    tcl_path, tr_path = generate_gbn_tcl_script(code, window_size, loss_rate, sim_time, is_wsl)

    await execute_ns2_command_async(tcl_path, sim_time)

    parsed = parse_gbn_sequence_trace(tr_path, sender_node_id=0, dest_node_id=3)
    result = {
        "window_size": window_size,
        "loss_rate": loss_rate,
        "packets_sent": parsed["packets_sent"],
        "packets_received": parsed["packets_received"],
        "packets_dropped": parsed["packets_dropped"],
        "retransmissions": parsed["retransmissions"],
        "trace_points": parsed["trace_points"],
        "summary": (
            f"NS-2 Go-Back-N run (Tahoe) with window size N={window_size} and {int(loss_rate * 100)}% link loss: "
            f"{parsed['packets_sent']} packets sent, {parsed['retransmissions']} retransmissions after timeout, "
            f"{parsed['packets_dropped']} drops, and {parsed['packets_received']} successfully acknowledged."
        )
    }
    latest_gbn_result = result
    return result


def generate_leaky_bucket_tcl_scripts(
    code: str,
    bucket_size: int,
    leak_rate: str,
    sim_time: float,
    is_wsl: bool = False
) -> Tuple[str, str, str, str]:
    """
    Generates two comparable NS-2 Tcl scripts:
    1. Unshaped: Bursty ON/OFF traffic directly into bottleneck link.
    2. Shaped: Bursty traffic passed through Leaky Bucket buffer (queue limit = bucket size)
       draining at a constant leak rate link.
    """
    sh_tcl_path = os.path.join(TCL_DIR, f"{code}_shaped.tcl")
    sh_tr_path = os.path.join(TRACES_DIR, f"{code}_shaped.tr")
    sh_tr_target = to_wsl_path(sh_tr_path) if is_wsl else sh_tr_path.replace("\\", "/")

    un_tcl_path = os.path.join(TCL_DIR, f"{code}_unshaped.tcl")
    un_tr_path = os.path.join(TRACES_DIR, f"{code}_unshaped.tr")
    un_tr_target = to_wsl_path(un_tr_path) if is_wsl else un_tr_path.replace("\\", "/")

    clean_leak = leak_rate.replace(" ", "").replace("ps", "").replace("bps", "b")
    if not any(clean_leak.endswith(s) for s in ["Mb", "Kb", "mb", "kb"]):
        clean_leak = f"{clean_leak}Kb"

    # 1. SHAPED SCRIPT (Leaky Bucket Traffic Shaper)
    shaped_lines = [
        "# ==============================================================================",
        f"# EduNet Analyzer — Leaky Bucket Shaped Traffic Simulation: {code}",
        f"# Bucket Capacity: {bucket_size} pkts | Constant Leak Rate: {clean_leak} | Duration: {sim_time}s",
        "#",
        "# VIVA EXPLANATION: Leaky Bucket Traffic Shaper Architecture",
        "# 1. Bursty student traffic arrives at Access Router R1 (LAN rate: 10Mb).",
        "# 2. Bounded DropTail queue of capacity B (bucket_size) acts as the Bucket buffer.",
        "# 3. Link Shaper -> R2 drains packets strictly at the constant leak rate.",
        "# 4. Excess burst volume exceeding bucket capacity is discarded (overflow).",
        "# ==============================================================================",
        "set ns [new Simulator]",
        f'set tracefile [open "{sh_tr_target}" w]',
        "$ns trace-all $tracefile",
        "",
        "set s [$ns node]       ;# Student source",
        "set r1 [$ns node]      ;# Access router",
        "set shaper [$ns node]  ;# Leaky Bucket Shaper buffer node",
        "set r2 [$ns node]      ;# Core router",
        "set srv [$ns node]     ;# LMS Server",
        "",
        "$ns duplex-link $s $r1 10Mb 2ms DropTail",
        f"# Leaky Bucket Buffer (Capacity = {bucket_size} packets)",
        f"$ns duplex-link $r1 $shaper 10Mb 1ms DropTail",
        f"$ns queue-limit $r1 $shaper {bucket_size}",
        f"# Constrained Leak Link (Constant Outflow = {clean_leak})",
        f"$ns duplex-link $shaper $r2 {clean_leak} 20ms DropTail",
        "$ns duplex-link $r2 $srv 100Mb 2ms DropTail",
        "",
        "# Bursty ON/OFF Exponential Traffic Application (Peak 2.5 Mbps bursts)",
        "set udp [new Agent/UDP]",
        "$ns attach-agent $s $udp",
        "set null [new Agent/Null]",
        "$ns attach-agent $srv $null",
        "$ns connect $udp $null",
        "set burst [new Application/Traffic/Exponential]",
        "$burst set burst_time_ 400ms",
        "$burst set idle_time_ 400ms",
        "$burst set rate_ 2.5Mb",
        "$burst set packetSize_ 1024",
        "$burst attach-agent $udp",
        "",
        "$ns at 0.1 \"$burst start\"",
        f"$ns at {sim_time - 0.2} \"$burst stop\"",
        f"$ns at {sim_time} \"finish\"",
        "proc finish {} { global ns tracefile; $ns flush-trace; close $tracefile; exit 0 }",
        "$ns run"
    ]

    # 2. UNSHAPED SCRIPT (Bursty Traffic without Leaky Bucket)
    unshaped_lines = [
        "# ==============================================================================",
        f"# EduNet Analyzer — Unshaped Bursty Traffic Simulation: {code}",
        f"# Bottleneck Link: {clean_leak} (Unregulated Bursts) | Duration: {sim_time}s",
        "# ==============================================================================",
        "set ns [new Simulator]",
        f'set tracefile [open "{un_tr_target}" w]',
        "$ns trace-all $tracefile",
        "",
        "set s [$ns node]",
        "set r1 [$ns node]",
        "set r2 [$ns node]",
        "set srv [$ns node]",
        "",
        "$ns duplex-link $s $r1 10Mb 2ms DropTail",
        f"$ns duplex-link $r1 $r2 {clean_leak} 20ms DropTail",
        f"$ns queue-limit $r1 $r2 {bucket_size}",
        "$ns duplex-link $r2 $srv 100Mb 2ms DropTail",
        "",
        "set udp [new Agent/UDP]",
        "$ns attach-agent $s $udp",
        "set null [new Agent/Null]",
        "$ns attach-agent $srv $null",
        "$ns connect $udp $null",
        "set burst [new Application/Traffic/Exponential]",
        "$burst set burst_time_ 400ms",
        "$burst set idle_time_ 400ms",
        "$burst set rate_ 2.5Mb",
        "$burst set packetSize_ 1024",
        "$burst attach-agent $udp",
        "",
        "$ns at 0.1 \"$burst start\"",
        f"$ns at {sim_time - 0.2} \"$burst stop\"",
        f"$ns at {sim_time} \"finish\"",
        "proc finish {} { global ns tracefile; $ns flush-trace; close $tracefile; exit 0 }",
        "$ns run"
    ]

    with open(sh_tcl_path, "w", encoding="utf-8") as f:
        f.write("\n".join(shaped_lines))
    with open(un_tcl_path, "w", encoding="utf-8") as f:
        f.write("\n".join(unshaped_lines))

    return sh_tcl_path, sh_tr_path, un_tcl_path, un_tr_path


async def run_leaky_bucket_simulation(
    bucket_size: int = 20,
    leak_rate: str = "512Kbps",
    sim_time: float = 10.0
) -> Dict[str, Any]:
    """Runs paired NS-2 simulations for Leaky Bucket (with vs without shaping)."""
    global latest_leaky_bucket_result
    ns_info = check_ns2_installation()
    is_wsl = (ns_info["mode"] == "wsl")

    code = f"LB-LIVE-{int(time.time()) % 100000}"
    sh_tcl, sh_tr, un_tcl, un_tr = generate_leaky_bucket_tcl_scripts(code, bucket_size, leak_rate, sim_time, is_wsl)

    # Run both NS-2 simulations
    await execute_ns2_command_async(sh_tcl, sim_time)
    await execute_ns2_command_async(un_tcl, sim_time)

    # Server node is ID 4 for shaped, ID 3 for unshaped
    parsed = parse_leaky_bucket_comparison(un_tr, sh_tr, server_node_id=4, simulation_duration=sim_time)
    result = {
        "bucket_size": bucket_size,
        "leak_rate": leak_rate,
        "unshaped_throughput_kbps": parsed["unshaped_throughput_kbps"],
        "shaped_throughput_kbps": parsed["shaped_throughput_kbps"],
        "unshaped_loss_percent": parsed["unshaped_loss_percent"],
        "shaped_loss_percent": parsed["shaped_loss_percent"],
        "comparison_series": parsed["comparison_series"],
        "summary": (
            f"NS-2 Leaky Bucket Comparison: Unshaped bursts produced {parsed['unshaped_loss_percent']}% packet loss "
            f"with erratic throughput spikes. Leaky Bucket shaping (Bucket Size: {bucket_size}, Leak Rate: {leak_rate}) "
            f"smoothed output stream to {parsed['shaped_throughput_kbps']} Kbps with {parsed['shaped_loss_percent']}% controlled loss."
        )
    }
    latest_leaky_bucket_result = result
    return result


async def run_tcp_udp_comparison_batch(db_factory) -> List[Dict[str, Any]]:
    """Runs real NS-2 simulations comparing TCP vs UDP across data rates (256K, 512K, 1M, 2M, 5M)."""
    rates = [
        ("256 Kbps", 256),
        ("512 Kbps", 512),
        ("1 Mbps", 1000),
        ("2 Mbps", 2000),
        ("5 Mbps", 5000),
    ]

    results_table = []
    db = db_factory()
    try:
        ns_info = check_ns2_installation()
        is_wsl = (ns_info["mode"] == "wsl")

        for rate_str, rate_kbps in rates:
            # 1. Run TCP Simulation (50 students)
            tcp_code = f"CMP-TCP-{rate_kbps}"
            tcp_tcl = generate_tcl_script(
                experiment_id=999,
                users=50,
                protocol="TCP",
                bottleneck_bw=rate_str,
                sim_time=8.0,
                experiment_type="TCP vs UDP",
                exp_code=tcp_code,
                traffic_level="Custom",
                is_wsl=is_wsl
            )
            await execute_ns2_command_async(tcp_tcl, sim_time=8.0)
            tcp_metrics = parse_ns2_trace_file(os.path.join(TRACES_DIR, f"{tcp_code}.tr"), server_node_id=52, simulation_duration=8.0)

            # Store TCP experiment in DB
            tcp_exp = Experiment(
                exp_code=f"EXP-{db.query(Experiment).count() + 1:03d}",
                name=f"TCP Benchmark ({rate_str})",
                description=f"Automated NS-2 TCP NewReno evaluation across {rate_str} bottleneck.",
                users=50,
                protocol="TCP",
                traffic_level="Medium",
                data_rate=rate_str,
                simulation_time=8.0,
                experiment_type="TCP vs UDP",
                status="COMPLETED",
                is_demo=False
            )
            db.add(tcp_exp)
            db.commit()
            db.refresh(tcp_exp)
            db.add(Result(
                experiment_id=tcp_exp.id,
                throughput_kbps=tcp_metrics["throughput_kbps"],
                packet_loss_percent=tcp_metrics["packet_loss_percent"],
                packet_delivery_ratio=tcp_metrics["packet_delivery_ratio"],
                average_delay_ms=tcp_metrics["average_delay_ms"],
                packets_sent=tcp_metrics["packets_sent"],
                packets_received=tcp_metrics["packets_received"],
                packets_dropped=tcp_metrics["packets_dropped"],
                data_rate_kbps=tcp_metrics["data_rate_kbps"],
                time_series_json=json.dumps(tcp_metrics["time_series"]),
                summary_notes=f"TCP at {rate_str}"
            ))
            db.commit()

            # 2. Run UDP Simulation (50 students)
            udp_code = f"CMP-UDP-{rate_kbps}"
            udp_tcl = generate_tcl_script(
                experiment_id=998,
                users=50,
                protocol="UDP",
                bottleneck_bw=rate_str,
                sim_time=8.0,
                experiment_type="TCP vs UDP",
                exp_code=udp_code,
                traffic_level="Custom",
                is_wsl=is_wsl
            )
            await execute_ns2_command_async(udp_tcl, sim_time=8.0)
            udp_metrics = parse_ns2_trace_file(os.path.join(TRACES_DIR, f"{udp_code}.tr"), server_node_id=52, simulation_duration=8.0)

            udp_exp = Experiment(
                exp_code=f"EXP-{db.query(Experiment).count() + 1:03d}",
                name=f"UDP Benchmark ({rate_str})",
                description=f"Automated NS-2 UDP CBR streaming evaluation across {rate_str} bottleneck.",
                users=50,
                protocol="UDP",
                traffic_level="Medium",
                data_rate=rate_str,
                simulation_time=8.0,
                experiment_type="TCP vs UDP",
                status="COMPLETED",
                is_demo=False
            )
            db.add(udp_exp)
            db.commit()
            db.refresh(udp_exp)
            db.add(Result(
                experiment_id=udp_exp.id,
                throughput_kbps=udp_metrics["throughput_kbps"],
                packet_loss_percent=udp_metrics["packet_loss_percent"],
                packet_delivery_ratio=udp_metrics["packet_delivery_ratio"],
                average_delay_ms=udp_metrics["average_delay_ms"],
                packets_sent=udp_metrics["packets_sent"],
                packets_received=udp_metrics["packets_received"],
                packets_dropped=udp_metrics["packets_dropped"],
                data_rate_kbps=udp_metrics["data_rate_kbps"],
                time_series_json=json.dumps(udp_metrics["time_series"]),
                summary_notes=f"UDP at {rate_str}"
            ))
            db.commit()

            results_table.append({
                "rate": rate_str,
                "rate_kbps": rate_kbps,
                "tcp_throughput": tcp_metrics["throughput_kbps"],
                "udp_throughput": udp_metrics["throughput_kbps"],
                "tcp_delay": tcp_metrics["average_delay_ms"],
                "udp_delay": udp_metrics["average_delay_ms"],
                "tcp_loss": tcp_metrics["packet_loss_percent"],
                "udp_loss": udp_metrics["packet_loss_percent"],
                "tcp_pdr": tcp_metrics["packet_delivery_ratio"],
                "udp_pdr": udp_metrics["packet_delivery_ratio"]
            })
    finally:
        db.close()

    return results_table


async def run_full_analysis_pipeline(db_factory) -> Dict[str, Any]:
    """
    Executes the entire academic suite of real NS-2 simulations in sequence:
    1. Preset LOW: 10 students, 512Kbps (TCP)
    2. Preset MEDIUM: 50 students, 1Mbps (TCP)
    3. Preset HIGH: 150 students, 2Mbps (TCP)
    4. TCP vs UDP Multi-Rate Suite (256K, 512K, 1M, 2M, 5M)
    5. Go-Back-N Retransmission Analysis
    6. Leaky Bucket Traffic Shaper Comparison
    """
    db = db_factory()
    try:
        ns_info = check_ns2_installation()
        is_wsl = (ns_info["mode"] == "wsl")

        # 1. Preset LOW (10 students)
        low_tcl = generate_tcl_script(
            experiment_id=101,
            users=10,
            protocol="TCP",
            bottleneck_bw="512Kbps",
            sim_time=10.0,
            experiment_type="Normal Traffic",
            exp_code="PRESET-LOW",
            traffic_level="Low",
            is_wsl=is_wsl
        )
        await execute_ns2_command_async(low_tcl, sim_time=10.0)
        low_m = parse_ns2_trace_file(os.path.join(TRACES_DIR, "PRESET-LOW.tr"), server_node_id=12, simulation_duration=10.0)
        exp_low = Experiment(
            exp_code=f"EXP-{db.query(Experiment).count() + 1:03d}",
            name="LOW Traffic Preset (10 Students)",
            description="NS-2 Live run: 10 student browsing clients over 512Kbps campus bottleneck.",
            users=10,
            protocol="TCP",
            traffic_level="Low",
            data_rate="512 Kbps",
            simulation_time=10.0,
            experiment_type="Normal Traffic",
            status="COMPLETED",
            is_demo=False
        )
        db.add(exp_low)
        db.commit()
        db.refresh(exp_low)
        db.add(Result(
            experiment_id=exp_low.id,
            throughput_kbps=low_m["throughput_kbps"],
            packet_loss_percent=low_m["packet_loss_percent"],
            packet_delivery_ratio=low_m["packet_delivery_ratio"],
            average_delay_ms=low_m["average_delay_ms"],
            packets_sent=low_m["packets_sent"],
            packets_received=low_m["packets_received"],
            packets_dropped=low_m["packets_dropped"],
            data_rate_kbps=low_m["data_rate_kbps"],
            time_series_json=json.dumps(low_m["time_series"]),
            summary_notes="Preset LOW live metrics"
        ))
        db.commit()

        # 2. Preset MEDIUM (50 students)
        med_tcl = generate_tcl_script(
            experiment_id=102,
            users=50,
            protocol="TCP",
            bottleneck_bw="1Mbps",
            sim_time=10.0,
            experiment_type="Normal Traffic",
            exp_code="PRESET-MED",
            traffic_level="Medium",
            is_wsl=is_wsl
        )
        await execute_ns2_command_async(med_tcl, sim_time=10.0)
        med_m = parse_ns2_trace_file(os.path.join(TRACES_DIR, "PRESET-MED.tr"), server_node_id=52, simulation_duration=10.0)
        exp_med = Experiment(
            exp_code=f"EXP-{db.query(Experiment).count() + 1:03d}",
            name="MEDIUM Traffic Preset (50 Students)",
            description="NS-2 Live run: 50 online classroom students over 1Mbps bottleneck.",
            users=50,
            protocol="TCP",
            traffic_level="Medium",
            data_rate="1 Mbps",
            simulation_time=10.0,
            experiment_type="Normal Traffic",
            status="COMPLETED",
            is_demo=False
        )
        db.add(exp_med)
        db.commit()
        db.refresh(exp_med)
        db.add(Result(
            experiment_id=exp_med.id,
            throughput_kbps=med_m["throughput_kbps"],
            packet_loss_percent=med_m["packet_loss_percent"],
            packet_delivery_ratio=med_m["packet_delivery_ratio"],
            average_delay_ms=med_m["average_delay_ms"],
            packets_sent=med_m["packets_sent"],
            packets_received=med_m["packets_received"],
            packets_dropped=med_m["packets_dropped"],
            data_rate_kbps=med_m["data_rate_kbps"],
            time_series_json=json.dumps(med_m["time_series"]),
            summary_notes="Preset MEDIUM live metrics"
        ))
        db.commit()

        # 3. Preset HIGH (150 students)
        high_tcl = generate_tcl_script(
            experiment_id=103,
            users=150,
            protocol="TCP",
            bottleneck_bw="2Mbps",
            sim_time=10.0,
            experiment_type="High Traffic",
            exp_code="PRESET-HIGH",
            traffic_level="High",
            is_wsl=is_wsl
        )
        await execute_ns2_command_async(high_tcl, sim_time=10.0)
        high_m = parse_ns2_trace_file(os.path.join(TRACES_DIR, "PRESET-HIGH.tr"), server_node_id=152, simulation_duration=10.0)
        exp_high = Experiment(
            exp_code=f"EXP-{db.query(Experiment).count() + 1:03d}",
            name="HIGH Traffic Preset (150 Students)",
            description="NS-2 Live run: 150 students during campus-wide exam peak over 2Mbps bottleneck.",
            users=150,
            protocol="TCP",
            traffic_level="High",
            data_rate="2 Mbps",
            simulation_time=10.0,
            experiment_type="High Traffic",
            status="COMPLETED",
            is_demo=False
        )
        db.add(exp_high)
        db.commit()
        db.refresh(exp_high)
        db.add(Result(
            experiment_id=exp_high.id,
            throughput_kbps=high_m["throughput_kbps"],
            packet_loss_percent=high_m["packet_loss_percent"],
            packet_delivery_ratio=high_m["packet_delivery_ratio"],
            average_delay_ms=high_m["average_delay_ms"],
            packets_sent=high_m["packets_sent"],
            packets_received=high_m["packets_received"],
            packets_dropped=high_m["packets_dropped"],
            data_rate_kbps=high_m["data_rate_kbps"],
            time_series_json=json.dumps(high_m["time_series"]),
            summary_notes="Preset HIGH live metrics"
        ))
        db.commit()

    finally:
        db.close()

    # 4. Multi-Rate TCP vs UDP comparison
    tcp_udp_results = await run_tcp_udp_comparison_batch(db_factory)

    # 5. Go-Back-N Retransmission Analysis
    gbn_results = await run_gbn_simulation(window_size=8, loss_rate=0.05, sim_time=10.0)

    # 6. Leaky Bucket Traffic Shaper Comparison
    lb_results = await run_leaky_bucket_simulation(bucket_size=20, leak_rate="512Kbps", sim_time=10.0)

    return {
        "status": "COMPLETED",
        "low_preset": low_m,
        "med_preset": med_m,
        "high_preset": high_m,
        "tcp_udp_results": tcp_udp_results,
        "gbn_results": gbn_results,
        "leaky_bucket_results": lb_results
    }

