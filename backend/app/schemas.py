from typing import List, Optional, Any, Dict
import datetime
from pydantic import BaseModel, Field

class TimeSeriesPoint(BaseModel):
    time: float
    throughput_kbps: float
    delay_ms: float
    packets_dropped: int

class ResultBase(BaseModel):
    throughput_kbps: float
    packet_loss_percent: float
    packet_delivery_ratio: float
    average_delay_ms: float
    packets_sent: int
    packets_received: int
    packets_dropped: int
    data_rate_kbps: float
    summary_notes: Optional[str] = None

class ResultResponse(ResultBase):
    id: int
    experiment_id: int
    time_series: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True

class SimulationConfigCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    description: Optional[str] = Field(default="")
    users: int = Field(default=10, ge=1, le=200)
    protocol: str = Field(default="TCP") # "TCP" or "UDP"
    traffic_level: str = Field(default="Medium") # "Low", "Medium", "High", "Custom"
    data_rate: str = Field(default="1 Mbps")
    simulation_time: float = Field(default=60.0, ge=5.0, le=300.0)
    experiment_type: str = Field(default="Normal Traffic")
    force_demo: Optional[bool] = False

class ExperimentResponse(BaseModel):
    id: int
    exp_code: str
    name: str
    description: Optional[str] = None
    users: int
    protocol: str
    traffic_level: str
    data_rate: str
    simulation_time: float
    experiment_type: str
    status: str
    is_demo: bool
    trace_file: Optional[str] = None
    created_at: datetime.datetime
    result: Optional[ResultResponse] = None

    class Config:
        from_attributes = True

class DashboardKPIs(BaseModel):
    total_experiments: int
    avg_throughput_kbps: float
    avg_packet_loss_percent: float
    avg_delay_ms: float
    avg_pdr_percent: float

class DashboardSummary(BaseModel):
    kpis: DashboardKPIs
    recent_experiments: List[ExperimentResponse]
    throughput_vs_users: List[Dict[str, Any]]
    loss_vs_users: List[Dict[str, Any]]
    delay_vs_users: List[Dict[str, Any]]
    tcp_vs_udp: Dict[str, Any]
    system_mode: str
    is_ns2_available: bool

class ComparisonRequest(BaseModel):
    experiment_ids: List[int]

class ComparisonResponse(BaseModel):
    experiments: List[ExperimentResponse]
    metrics_table: List[Dict[str, Any]]
    comparison_charts: Dict[str, Any]
    analysis_summary: str

class SimulationStatusResponse(BaseModel):
    id: int
    exp_code: str
    status: str
    progress_percent: int
    current_stage: str
    stage_message: str
    logs: List[str]
    error: Optional[str] = None
    result: Optional[ResultResponse] = None

class SystemStatusResponse(BaseModel):
    ns2_installed: bool
    ns2_path: Optional[str] = None
    execution_mode: str # "NS-2 LIVE SIMULATION" or "DEMO MODE — Sample Data"
    wsl_detected: bool
    wsl_distro: Optional[str] = None
    python_version: str
    db_connected: bool
    database_path: str
    total_experiments: int
