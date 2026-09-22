import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    exp_code = Column(String(32), unique=True, index=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    users = Column(Integer, nullable=False, default=10)
    protocol = Column(String(16), nullable=False, default="TCP")
    traffic_level = Column(String(32), nullable=False, default="Medium")
    data_rate = Column(String(32), nullable=False, default="1 Mbps")
    simulation_time = Column(Float, nullable=False, default=60.0)
    experiment_type = Column(String(64), nullable=False, default="Normal Traffic")
    status = Column(String(32), nullable=False, default="PENDING")
    is_demo = Column(Boolean, default=False)
    trace_file = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    result = relationship("Result", back_populates="experiment", uselist=False, cascade="all, delete-orphan")

class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False, unique=True)
    throughput_kbps = Column(Float, nullable=False, default=0.0)
    packet_loss_percent = Column(Float, nullable=False, default=0.0)
    packet_delivery_ratio = Column(Float, nullable=False, default=0.0)
    average_delay_ms = Column(Float, nullable=False, default=0.0)
    packets_sent = Column(Integer, nullable=False, default=0)
    packets_received = Column(Integer, nullable=False, default=0)
    packets_dropped = Column(Integer, nullable=False, default=0)
    data_rate_kbps = Column(Float, nullable=False, default=0.0)
    time_series_json = Column(Text, nullable=True)
    summary_notes = Column(Text, nullable=True)

    experiment = relationship("Experiment", back_populates="result")
