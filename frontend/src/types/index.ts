export interface TimeSeriesPoint {
  time: number;
  throughput_kbps: number;
  delay_ms: number;
  packets_dropped: number;
}

export interface Result {
  id: number;
  experiment_id: number;
  throughput_kbps: number;
  packet_loss_percent: number;
  packet_delivery_ratio: number;
  average_delay_ms: number;
  packets_sent: number;
  packets_received: number;
  packets_dropped: number;
  data_rate_kbps: number;
  summary_notes?: string;
  time_series?: TimeSeriesPoint[];
}

export interface Experiment {
  id: number;
  exp_code: string;
  name: string;
  description?: string;
  users: number;
  protocol: 'TCP' | 'UDP';
  traffic_level: 'Low' | 'Medium' | 'High' | 'Custom';
  data_rate: string;
  simulation_time: number;
  experiment_type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  is_demo: boolean;
  trace_file?: string;
  created_at: string;
  result?: Result;
}

export interface SimulationConfig {
  name: string;
  description?: string;
  users: number;
  protocol: 'TCP' | 'UDP';
  traffic_level: 'Low' | 'Medium' | 'High' | 'Custom';
  data_rate: string;
  simulation_time: number;
  experiment_type: string;
  packet_size?: number;
  window_size?: number;
  force_demo?: boolean;
}

export interface DashboardKPIs {
  total_experiments: number;
  avg_throughput_kbps: number;
  avg_packet_loss_percent: number;
  avg_delay_ms: number;
  avg_pdr_percent: number;
}

export interface GbnTracePoint {
  time: number;
  seq_num: number;
  event: string;
  is_retransmit: boolean;
}

export interface GbnSimulationResponse {
  window_size: number;
  loss_rate: number;
  packets_sent: number;
  packets_received: number;
  packets_dropped: number;
  retransmissions: number;
  trace_points: GbnTracePoint[];
  summary: string;
}

export interface LeakyBucketComparisonPoint {
  time: number;
  unshaped_throughput: number;
  shaped_throughput: number;
  unshaped_drops: number;
  shaped_drops: number;
}

export interface LeakyBucketResponse {
  bucket_size: number;
  leak_rate: string;
  unshaped_throughput_kbps: number;
  shaped_throughput_kbps: number;
  unshaped_loss_percent: number;
  shaped_loss_percent: number;
  comparison_series: LeakyBucketComparisonPoint[];
  summary: string;
}

export interface TcpUdpRateComparisonItem {
  rate: string;
  rate_kbps: number;
  tcpThroughput: number;
  udpThroughput: number;
  tcpLoss: number;
  udpLoss: number;
  tcpDelay: number;
  udpDelay: number;
  tcpPdr: number;
  udpPdr: number;
}

export interface DashboardSummary {
  kpis: DashboardKPIs;
  recent_experiments: Experiment[];
  throughput_vs_users: { users: number; tcp: number | null; udp: number | null }[];
  loss_vs_users: { users: number; tcp: number | null; udp: number | null }[];
  delay_vs_users: { users: number; tcp: number | null; udp: number | null }[];
  pdr_vs_users?: { users: number; tcp: number | null; udp: number | null }[];
  traffic_load_data?: { load: string; throughput: number; loss: number; delay: number; pdr?: number }[];
  tcp_udp_rates?: TcpUdpRateComparisonItem[];
  leaky_bucket_comparison?: LeakyBucketResponse | null;
  gbn_trace_data?: GbnTracePoint[] | null;
  tcp_vs_udp: {
    tcp: { throughput: number; loss: number; delay: number; pdr: number; count: number };
    udp: { throughput: number; loss: number; delay: number; pdr: number; count: number };
  };
  system_mode: string;
  is_ns2_available: boolean;
}


export interface ComparisonMetricItem {
  id: number;
  exp_code: string;
  name: string;
  protocol: string;
  users: number;
  traffic_level: string;
  throughput_kbps: number;
  packet_loss_percent: number;
  pdr_percent: number;
  average_delay_ms: number;
  packets_sent: number;
  packets_received: number;
  packets_dropped: number;
}

export interface ComparisonResponse {
  experiments: Experiment[];
  metrics_table: ComparisonMetricItem[];
  comparison_charts: {
    throughput: { name: string; throughput: number; users: number }[];
    loss: { name: string; loss: number; users: number }[];
    delay: { name: string; delay: number; users: number }[];
    pdr: { name: string; pdr: number; users: number }[];
  };
  analysis_summary: string;
}

export interface SimulationStatusResponse {
  id: number;
  exp_code: string;
  experiment_id?: string;
  status: string;
  progress?: number;
  progress_percent: number;
  current_stage: string;
  message?: string;
  stage_message: string;
  logs: string[];
  error?: string | null;
  result?: Result | null;
}

export interface SystemStatusResponse {
  ns2_installed: boolean;
  ns2_path?: string | null;
  execution_mode: string;
  wsl_detected: boolean;
  wsl_distro?: string | null;
  wsl_available?: boolean;
  ubuntu_distro_found?: boolean;
  python_version: string;
  db_connected: boolean;
  database_path: string;
  total_experiments: number;
}
