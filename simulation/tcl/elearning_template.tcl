# ==============================================================================
# EduNet Analyzer — NS-2 Campus E-Learning Simulation Template
# Topology: N Student Workstations -> Access Router R1 -> Core Router R2 -> LMS Server
# Course: Computer Networks and Internet Protocols Laboratory
# ==============================================================================

# Initialization
set ns [new Simulator]

# Open Trace and NAM Animation Files
set tracefile [open "simulation_output.tr" w]
$ns trace-all $tracefile
set namfile [open "simulation_output.nam" w]
$ns namtrace-all $namfile

# Global Parameters
set num_students 25
set sim_duration 60.0
set bottleneck_bw "1Mb"
set bottleneck_delay "20ms"
set access_bw "10Mb"
set access_delay "5ms"

# 1. Create Student Nodes (0 to num_students - 1)
for {set i 0} {$i < $num_students} {incr i} {
    set student($i) [$ns node]
}

# 2. Create Routers and Destination Server
set r1 [$ns node]      ;# Access Gateway Router (ID: num_students)
set r2 [$ns node]      ;# Datacenter Core Router (ID: num_students + 1)
set server [$ns node]  ;# Central LMS Server     (ID: num_students + 2)

# 3. Establish Physical and Logical Links
# Access Links: Student -> Access Router R1
for {set i 0} {$i < $num_students} {incr i} {
    $ns duplex-link $student($i) $r1 $access_bw $access_delay DropTail
}

# Campus Bottleneck Trunk Link: R1 -> R2
# Can configure DropTail or RED (Random Early Detection) for Leaky Bucket simulation
$ns duplex-link $r1 $r2 $bottleneck_bw $bottleneck_delay DropTail
$ns queue-limit $r1 $r2 25

# Backbone Link: R2 -> LMS Server
$ns duplex-link $r2 $server 100Mb 2ms DropTail

# 4. Attach Transport Protocol Agents and Traffic Generators
# Staggered FTP over TCP NewReno
for {set i 0} {$i < $num_students} {incr i} {
    # Sender Agent
    set tcp($i) [new Agent/TCP/Newreno]
    $tcp($i) set window_ 32
    $tcp($i) set packetSize_ 1024
    $ns attach-agent $student($i) $tcp($i)

    # Receiver Sink Agent at Server
    set sink($i) [new Agent/TCPSink]
    $ns attach-agent $server $sink($i)
    $ns connect $tcp($i) $sink($i)

    # Application Traffic Layer
    set ftp($i) [new Application/FTP]
    $ftp($i) attach-agent $tcp($i)

    # Stagger transmission start times to model real student arrival
    set start_time [expr 0.1 + ($i * 0.05)]
    $ns at $start_time "$ftp($i) start"
    $ns at [expr $sim_duration - 0.5] "$ftp($i) stop"
}

# 5. Simulation Termination Procedure
$ns at $sim_duration "finish"
proc finish {} {
    global ns tracefile namfile
    $ns flush-trace
    close $tracefile
    close $namfile
    puts "NS-2 Simulation finished successfully."
    exit 0
}

# Run Simulator Engine
$ns run
