# AWK Script for NS-2 Trace File Analysis in University Networks Lab
# Usage: awk -f parse_trace.awk <tracefile.tr>

BEGIN {
    sent_packets = 0;
    received_packets = 0;
    dropped_packets = 0;
    total_bytes = 0;
    start_time = 1e9;
    end_time = 0;
    total_delay = 0;
}

{
    event = $1;
    time = $2;
    from_node = $3;
    to_node = $4;
    pkt_type = $5;
    pkt_size = $6;
    pkt_id = $12;

    # Ignore pure ACKs for data packet count
    if (pkt_type == "ack") next;

    # Track time boundaries
    if (time < start_time) start_time = time;
    if (time > end_time) end_time = time;

    # 1. Packet sent from source
    if (event == "+") {
        sent_packets++;
        if (!(pkt_id in send_time)) {
            send_time[pkt_id] = time;
        }
    }

    # 2. Packet received at destination server
    if (event == "r") {
        # Check if received at destination (assuming server node ID is highest or passed)
        received_packets++;
        total_bytes += pkt_size;

        if (pkt_id in send_time) {
            delay = time - send_time[pkt_id];
            if (delay >= 0) {
                total_delay += delay;
                delay_count++;
            }
        }
    }

    # 3. Packet dropped at intermediate queue
    if (event == "d") {
        dropped_packets++;
    }
}

END {
    duration = end_time - start_time;
    if (duration <= 0) duration = 1.0;

    throughput_kbps = (total_bytes * 8.0) / (duration * 1000.0);
    pdr = (sent_packets > 0) ? (received_packets / sent_packets) * 100.0 : 0.0;
    packet_loss_pct = (sent_packets > 0) ? (dropped_packets / sent_packets) * 100.0 : 0.0;
    avg_delay_ms = (delay_count > 0) ? (total_delay / delay_count) * 1000.0 : 0.0;

    print "==========================================================";
    print " EduNet Analyzer — NS-2 Trace File Analysis Metrics";
    print "==========================================================";
    printf " Simulation Duration   : %.2f seconds\n", duration;
    printf " Packets Sent          : %d\n", sent_packets;
    printf " Packets Received      : %d\n", received_packets;
    printf " Packets Dropped       : %d\n", dropped_packets;
    print "----------------------------------------------------------";
    printf " Network Throughput    : %.2f Kbps\n", throughput_kbps;
    printf " Packet Delivery Ratio : %.2f %%\n", pdr;
    printf " Packet Loss Rate      : %.2f %%\n", packet_loss_pct;
    printf " Average Delay         : %.2f ms\n", avg_delay_ms;
    print "==========================================================";
}
