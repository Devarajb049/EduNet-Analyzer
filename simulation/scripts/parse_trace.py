#!/usr/bin/env python3
"""
EduNet Analyzer — Standalone Python Trace Parser for NS-2 Trace Files
Usage:
    python parse_trace.py <path_to_trace.tr> [server_node_id] [simulation_duration]
"""
import sys
import os

# Add backend directory to sys.path to reuse parse_ns2_trace_file
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.trace_parser import parse_ns2_trace_file

def main():
    if len(sys.argv) < 2:
        print("Usage: python parse_trace.py <trace_file.tr> [server_node_id] [simulation_duration]")
        sys.exit(1)

    trace_file = sys.argv[1]
    server_id = int(sys.argv[2]) if len(sys.argv) > 2 else 12
    duration = float(sys.argv[3]) if len(sys.argv) > 3 else 60.0

    if not os.path.exists(trace_file):
        print(f"Error: Trace file '{trace_file}' not found.")
        sys.exit(1)

    metrics = parse_ns2_trace_file(trace_file, server_node_id=server_id, simulation_duration=duration)

    print("==========================================================")
    print(" EduNet Analyzer — Trace File Performance Metrics")
    print("==========================================================")
    print(f" Trace File            : {trace_file}")
    print(f" Simulation Duration   : {duration} seconds")
    print(f" Total Packets Sent    : {metrics['packets_sent']:,}")
    print(f" Total Packets Received: {metrics['packets_received']:,}")
    print(f" Total Packets Dropped : {metrics['packets_dropped']:,}")
    print("----------------------------------------------------------")
    print(f" Network Throughput    : {metrics['throughput_kbps']} Kbps")
    print(f" Packet Delivery Ratio : {metrics['packet_delivery_ratio']}%")
    print(f" Packet Loss Rate      : {metrics['packet_loss_percent']}%")
    print(f" Average Delay         : {metrics['average_delay_ms']} ms")
    print("==========================================================")

if __name__ == "__main__":
    main()
