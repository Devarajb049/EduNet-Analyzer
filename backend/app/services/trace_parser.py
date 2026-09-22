import os
import json
from typing import Dict, Any, List, Optional

def parse_ns2_trace_file(
    trace_path: str,
    server_node_id: int,
    simulation_duration: float
) -> Dict[str, Any]:
    """
    Parses a standard NS-2 wired trace file (.tr).
    
    Standard NS-2 Trace Format:
    [0] event: '+' (enqueue), '-' (dequeue), 'r' (receive), 'd' (drop)
    [1] time: float (seconds)
    [2] from_node: int
    [3] to_node: int
    [4] pkt_type: str (e.g. 'tcp', 'cbr', 'ack')
    [5] pkt_size: int (bytes)
    [6] flags: str
    [7] fid: int
    [8] src_addr: str (e.g. '0.0')
    [9] dst_addr: str (e.g. '2.0')
    [10] seq_num: int
    [11] pkt_id: int
    """
    if not os.path.exists(trace_path):
        raise FileNotFoundError(f"Trace file not found at {trace_path}")

    sent_packets = 0
    received_packets = 0
    dropped_packets = 0
    total_received_bytes = 0

    packet_send_times: Dict[int, float] = {}
    packet_delays: List[float] = []

    # Time series aggregation per 1-second buckets
    max_sec = int(simulation_duration) + 2
    time_series_data = [
        {"time": sec, "throughput_kbps": 0.0, "delay_ms": 0.0, "packets_dropped": 0, "bytes_received": 0, "packets_received": 0, "delay_sum": 0.0}
        for sec in range(max_sec)
    ]

    with open(trace_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 12:
                continue

            event = parts[0]
            try:
                time_sec = float(parts[1])
                from_node = int(parts[2])
                to_node = int(parts[3])
                pkt_type = parts[4]
                pkt_size = int(parts[5])
                pkt_id = int(parts[11])
            except (ValueError, IndexError):
                continue

            # Skip routing protocol overhead or pure ACKs for data throughput calculation if desired,
            # but preserve TCP/CBR data packet accounting.
            if pkt_type.lower() == "ack":
                continue

            sec_bucket = min(int(time_sec), max_sec - 1)

            # Enqueue at source (first hop out of student nodes)
            if event == "+":
                if pkt_id not in packet_send_times:
                    sent_packets += 1
                    packet_send_times[pkt_id] = time_sec

            # Receive at destination e-learning server
            elif event == "r" and to_node == server_node_id:
                received_packets += 1
                total_received_bytes += pkt_size

                # End-to-end delay calculation
                if pkt_id in packet_send_times:
                    delay = time_sec - packet_send_times[pkt_id]
                    if delay >= 0:
                        packet_delays.append(delay)
                        time_series_data[sec_bucket]["delay_sum"] += delay
                        time_series_data[sec_bucket]["packets_received"] += 1

                time_series_data[sec_bucket]["bytes_received"] += pkt_size

            # Packet dropped at any intermediate queue
            elif event == "d":
                dropped_packets += 1
                time_series_data[sec_bucket]["packets_dropped"] += 1

    # Aggregate calculations
    effective_duration = max(simulation_duration, 1.0)
    
    # Throughput (Kbps) = (bytes * 8) / (duration * 1000)
    throughput_kbps = round((total_received_bytes * 8.0) / (effective_duration * 1000.0), 2)

    # Packet Delivery Ratio (PDR %) and Packet Loss
    # Packet Loss = Packets Sent - Packets Received
    # PDR = Packets Received / Packets Sent * 100
    if sent_packets > 0:
        pdr_percent = round((received_packets / sent_packets) * 100.0, 2)
        packets_lost = max(0, sent_packets - received_packets)
        packet_loss_percent = round((packets_lost / sent_packets) * 100.0, 2)
    else:
        pdr_percent = 0.0
        packet_loss_percent = 0.0

    # Average Delay (ms)
    if packet_delays:
        avg_delay_ms = round((sum(packet_delays) / len(packet_delays)) * 1000.0, 2)
    else:
        avg_delay_ms = 0.0

    # Format time-series data for frontend charts
    final_time_series = []
    for bucket in time_series_data:
        if bucket["time"] > simulation_duration:
            continue
        tp_kbps = round((bucket["bytes_received"] * 8.0) / 1000.0, 2)
        avg_d = round((bucket["delay_sum"] / bucket["packets_received"]) * 1000.0, 2) if bucket["packets_received"] > 0 else 0.0
        final_time_series.append({
            "time": bucket["time"],
            "throughput_kbps": tp_kbps,
            "delay_ms": avg_d,
            "packets_dropped": bucket["packets_dropped"]
        })

    return {
        "throughput_kbps": throughput_kbps,
        "packet_loss_percent": packet_loss_percent,
        "packet_delivery_ratio": pdr_percent,
        "average_delay_ms": avg_delay_ms,
        "packets_sent": sent_packets,
        "packets_received": received_packets,
        "packets_dropped": dropped_packets,
        "data_rate_kbps": throughput_kbps,
        "time_series": final_time_series
    }
