import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import Experiment, Result
from app.services.simulation_service import run_full_analysis_pipeline

async def main():
    Base.metadata.create_all(bind=engine)
    
    print("==================================================================")
    print("STEP 4: RUNNING REAL NS-2 SIMULATION PIPELINE IN WSL2 (UBUNTU)")
    print("Presets: LOW (10 nodes), MEDIUM (50 nodes), HIGH (150 nodes)")
    print("Protocols: TCP vs UDP (256K, 512K, 1M, 2M, 5M)")
    print("Advanced: Go-Back-N (Tahoe) + Leaky Bucket (Bounded DropTail)")
    print("==================================================================")
    
    pipeline_res = await run_full_analysis_pipeline(SessionLocal)
    
    print("\nSimulation Pipeline Completed Successfully!")
    
    # Query database for the latest LOW, MEDIUM, and HIGH runs
    db = SessionLocal()
    try:
        exps = db.query(Experiment).filter(Experiment.is_demo == False).order_by(Experiment.id.desc()).all()
        
        print("\n\n=========================================================================================================")
        print("STEP 4 VERIFIED METRICS TABLE (REAL NS-2 DISCRETE-EVENT SIMULATION RESULTS)")
        print("=========================================================================================================")
        print(f"| {'Traffic Tier':<14} | {'Students':<8} | {'Protocol':<8} | {'Bottleneck BW':<13} | {'Throughput (Kbps)':<18} | {'Loss (%)':<10} | {'Delay (ms)':<12} | {'PDR (%)':<8} |")
        print(f"|{'-'*16}|{'-'*10}|{'-'*10}|{'-'*15}|{'-'*20}|{'-'*12}|{'-'*14}|{'-'*10}|")
        
        # Display Presets
        low_m = pipeline_res["low_preset"]
        med_m = pipeline_res["med_preset"]
        high_m = pipeline_res["high_preset"]
        
        print(f"| {'LOW':<14} | {'10':<8} | {'TCP':<8} | {'512Kbps':<13} | {low_m['throughput_kbps']:<18.2f} | {low_m['packet_loss_percent']:<9.2f}% | {low_m['average_delay_ms']:<12.2f} | {low_m['packet_delivery_ratio']:<7.2f}% |")
        print(f"| {'MEDIUM':<14} | {'50':<8} | {'TCP':<8} | {'1Mbps':<13} | {med_m['throughput_kbps']:<18.2f} | {med_m['packet_loss_percent']:<9.2f}% | {med_m['average_delay_ms']:<12.2f} | {med_m['packet_delivery_ratio']:<7.2f}% |")
        print(f"| {'HIGH':<14} | {'150':<8} | {'TCP':<8} | {'2Mbps':<13} | {high_m['throughput_kbps']:<18.2f} | {high_m['packet_loss_percent']:<9.2f}% | {high_m['average_delay_ms']:<12.2f} | {high_m['packet_delivery_ratio']:<7.2f}% |")
        
        print("=========================================================================================================\n")
        
        # Display Multi-Rate Summary
        print("MULTI-RATE TCP vs UDP NS-2 RESULTS:")
        print(f"| {'Bandwidth Rate':<16} | {'TCP Throughput':<16} | {'UDP Throughput':<16} | {'TCP Loss':<10} | {'UDP Loss':<10} | {'TCP PDR':<10} | {'UDP PDR':<10} |")
        print(f"|{'-'*18}|{'-'*18}|{'-'*18}|{'-'*12}|{'-'*12}|{'-'*12}|{'-'*12}|")
        for item in pipeline_res["tcp_udp_results"]:
            tcp_tp = item.get("tcp_throughput", item.get("tcpThroughput", 0.0))
            udp_tp = item.get("udp_throughput", item.get("udpThroughput", 0.0))
            tcp_loss = item.get("tcp_loss", item.get("tcpLoss", 0.0))
            udp_loss = item.get("udp_loss", item.get("udpLoss", 0.0))
            tcp_pdr = item.get("tcp_pdr", item.get("tcpPdr", 0.0))
            udp_pdr = item.get("udp_pdr", item.get("udpPdr", 0.0))
            print(f"| {item['rate']:<16} | {tcp_tp:<14.2f}Kbps | {udp_tp:<14.2f}Kbps | {tcp_loss:<9.2f}% | {udp_loss:<9.2f}% | {tcp_pdr:<9.2f}% | {udp_pdr:<9.2f}% |")
        print("=========================================================================================================\n")
        
        # Display Go-Back-N
        gbn = pipeline_res["gbn_results"]
        print(f"GO-BACK-N ARQ (Agent/TCP Tahoe): Sent={gbn['packets_sent']}, Dropped={gbn['packets_dropped']}, Retransmissions={gbn['retransmissions']}")
        
        # Display Leaky Bucket
        lb = pipeline_res["leaky_bucket_results"]
        print(f"LEAKY BUCKET TRAFFIC SHAPING: Unshaped={lb['unshaped_throughput_kbps']} Kbps (Loss {lb['unshaped_loss_percent']}%) vs Shaped={lb['shaped_throughput_kbps']} Kbps (Loss {lb['shaped_loss_percent']}%)")
        print("=========================================================================================================\n")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
