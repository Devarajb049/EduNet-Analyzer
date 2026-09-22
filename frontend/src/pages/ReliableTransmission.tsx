import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  AlertOctagon,
  CheckCircle2,
  Clock,
  ArrowRight,
  Info,
  Terminal,
  Layers,
  Zap
} from 'lucide-react';
import { useDataService } from '../services/dataService';
import { Experiment } from '../types';
import { ModeBadge, useSimulationMode } from '../context/SimulationModeContext';

export const ReliableTransmission: React.FC = () => {
  const { mode, isDemo, setMode } = useSimulationMode();
  const dataService = useDataService();

  const [activeTab, setActiveTab] = useState<'sliding' | 'gbn'>('sliding');
  const [realExperiments, setRealExperiments] = useState<Experiment[]>([]);

  // --- Sliding Window State ---
  const [windowSize, setWindowSize] = useState<number>(4);
  const totalPackets = 12;
  const [base, setBase] = useState<number>(0);
  const [nextSeq, setNextSeq] = useState<number>(0);
  const [ackedPackets, setAckedPackets] = useState<number[]>([]);
  const [inFlightPackets, setInFlightPackets] = useState<number[]>([]);
  const [isSwPlaying, setIsSwPlaying] = useState<boolean>(false);
  const [simSpeedMs, setSimSpeedMs] = useState<number>(1000);
  const [rttProgress, setRttProgress] = useState<number>(0);

  // --- Go-Back-N State ---
  const gbnWindowSize = 4;
  const gbnTotal = 10;
  const [gbnBase, setGbnBase] = useState<number>(0);
  const [gbnNext, setGbnNext] = useState<number>(0);
  const [dropTarget, setDropTarget] = useState<number | null>(2); // Drop packet 2 (3rd packet)
  const [isGbnPlaying, setIsGbnPlaying] = useState<boolean>(false);
  const [gbnStage, setGbnStage] = useState<string>('Ready to begin transmission');
  const [gbnLogs, setGbnLogs] = useState<string[]>([
    'System ready. Drop target set to Packet #2.',
  ]);

  // Load real experiments for reliable protocol benchmarks (EXP-007 / EXP-008)
  useEffect(() => {
    dataService.getExperiments({ limit: 50 }).then((data) => {
      setRealExperiments(data);
    }).catch(() => null);
  }, [mode]);

  const slidingExp = realExperiments.find(
    (e) => e.experiment_type === 'Sliding Window' || e.exp_code === 'EXP-007' || e.exp_code === 'DEMO-007'
  );
  const gbnExp = realExperiments.find(
    (e) => e.experiment_type === 'Go-Back-N' || e.exp_code === 'EXP-008' || e.exp_code === 'DEMO-008'
  );

  const handleSwStep = () => {
    if (inFlightPackets.length > 0) {
      const acked = inFlightPackets[0];
      setAckedPackets((prev) => [...prev, acked]);
      setInFlightPackets((prev) => prev.slice(1));
      setBase((prev) => prev + 1);
    } else if (nextSeq < totalPackets && nextSeq < base + windowSize) {
      setInFlightPackets((prev) => [...prev, nextSeq]);
      setNextSeq((prev) => prev + 1);
    } else if (nextSeq >= totalPackets && base >= totalPackets) {
      setIsSwPlaying(false);
    }
  };

  const handleSwReset = () => {
    setBase(0);
    setNextSeq(0);
    setAckedPackets([]);
    setInFlightPackets([]);
    setIsSwPlaying(false);
  };

  // Auto-play interval for Sliding Window
  useEffect(() => {
    let timer: any = null;
    let rttTimer: any = null;

    if (isSwPlaying) {
      timer = setInterval(() => {
        handleSwStep();
        setRttProgress(0);
      }, simSpeedMs);

      rttTimer = setInterval(() => {
        setRttProgress((p) => (p >= 100 ? 0 : p + 10));
      }, simSpeedMs / 10);
    }
    return () => {
      if (timer) clearInterval(timer);
      if (rttTimer) clearInterval(rttTimer);
    };
  }, [isSwPlaying, base, nextSeq, inFlightPackets, windowSize, simSpeedMs]);

  // Auto-play interval for Go-Back-N
  useEffect(() => {
    let timer: any = null;
    if (isGbnPlaying) {
      timer = setInterval(() => {
        handleGbnStep();
      }, simSpeedMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isGbnPlaying, gbnBase, gbnNext, dropTarget, simSpeedMs]);

  const handleGbnStep = () => {
    if (gbnBase >= gbnTotal) {
      setGbnStage('All packets delivered successfully!');
      return;
    }

    if (gbnNext < gbnBase + gbnWindowSize && gbnNext < gbnTotal) {
      const p = gbnNext;
      if (p === dropTarget) {
        setGbnLogs((prev) => [
          `[Sender] Transmitted Packet #${p} ➔ [CHANNEL DROPPED PACKET]!`,
          ...prev,
        ]);
        setGbnStage(`Packet #${p} was DROPPED by the channel!`);
        setDropTarget(null);
      } else {
        setGbnLogs((prev) => [
          `[Sender] Transmitted Packet #${p} across network...`,
          ...prev,
        ]);
      }
      setGbnNext((prev) => prev + 1);
      return;
    }

    if (gbnBase < gbnNext) {
      setGbnLogs((prev) => [
        `[Timer Expired] Timeout on unACKed base Packet #${gbnBase}! Initiating Go-Back-N retransmission...`,
        `[Go-Back-N] Rewinding sender pointer from #${gbnNext} back to #${gbnBase}!`,
        ...prev,
      ]);
      setGbnStage(`Timeout! Retransmitting from Packet #${gbnBase}`);
      setGbnNext(gbnBase);
      return;
    }
  };

  const handleGbnReset = () => {
    setGbnBase(0);
    setGbnNext(0);
    setDropTarget(2);
    setGbnStage('Reset complete. Drop target set to Packet #2.');
    setGbnLogs(['System reset. Click Step to observe packet transmission and loss handling.']);
  };

  const handleGbnAck = () => {
    if (gbnBase < gbnNext) {
      const acked = gbnBase;
      setGbnBase((prev) => prev + 1);
      setGbnLogs((prev) => [`[Receiver] Sent cumulative ACK for Packet #${acked}. Window slides forward.`, ...prev]);
      setGbnStage(`ACK received for Packet #${acked}`);
    }
  };

  const currentLiveExp = activeTab === 'sliding' ? slidingExp : gbnExp;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0F172A]">Reliable Transport Protocols: Sliding Window & Go-Back-N</h2>
                <ModeBadge isDemo={isDemo} />
              </div>
              <p className="text-xs text-[#64748B]">
                {isDemo
                  ? 'Interactive educational simulators with deterministic packet transmission and timeout rewinding'
                  : 'Live discrete-event NS-2 simulation results paired with protocol concept visualizer'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isDemo && (
              <button
                type="button"
                onClick={() => setMode('demo')}
                className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                Switch to Demo Mode
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-3 mt-5 pt-5 border-t border-[#F1F5F9]">
          <button
            onClick={() => setActiveTab('sliding')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sliding'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            1. Sliding Window Flow Control
          </button>
          <button
            onClick={() => setActiveTab('gbn')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'gbn'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            2. Go-Back-N (GBN) Retransmission
          </button>
        </div>
      </div>

      {/* Actual NS-2 Result Section (Distinguished from Concept Visualizer) */}
      <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {isDemo ? 'Predefined Benchmark Telemetry' : 'Actual NS-2 Simulation Result'}
            </h3>
          </div>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              isDemo ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {isDemo ? '🟦 PREDEFINED BENCHMARK' : '🟢 ACTUAL NS-2 RESULT'}
          </span>
        </div>

        {currentLiveExp ? (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 text-[10px] uppercase block font-bold">Experiment</span>
              <span className="font-bold text-blue-700 text-sm">{currentLiveExp.exp_code}</span>
              <p className="text-[10px] text-slate-500 font-sans truncate mt-0.5">{currentLiveExp.name}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 text-[10px] uppercase block font-bold">Throughput</span>
              <span className="font-bold text-emerald-700 text-sm">{currentLiveExp.result?.throughput_kbps ?? 0} Kbps</span>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">{currentLiveExp.users} active nodes</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 text-[10px] uppercase block font-bold">Packet Delivery Ratio</span>
              <span className="font-bold text-blue-800 text-sm">{currentLiveExp.result?.packet_delivery_ratio ?? 0}%</span>
              <p className="text-[10px] text-rose-600 font-sans mt-0.5">Loss: {currentLiveExp.result?.packet_loss_percent ?? 0}%</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 text-[10px] uppercase block font-bold">Average Delay</span>
              <span className="font-bold text-amber-700 text-sm">{currentLiveExp.result?.average_delay_ms ?? 0} ms</span>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">Bottleneck: {currentLiveExp.data_rate}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 flex items-center justify-between">
            <span>No simulation record currently mapped for this protocol scenario.</span>
            <Link to="/simulate" className="font-semibold text-blue-600 hover:underline">
              Run New Simulation →
            </Link>
          </div>
        )}
      </div>

      {/* Protocol Concept Interactive Visualizer */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Protocol Concept Interactive Visualizer ({activeTab === 'sliding' ? 'Sliding Window' : 'Go-Back-N'})
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Educational Interactive Model
          </span>
        </div>

        {activeTab === 'sliding' ? (
          /* Sliding Window Visualizer */
          <div className="space-y-6">
            {/* Window Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSwPlaying(!isSwPlaying)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  {isSwPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isSwPlaying ? 'Pause Animation' : 'Auto Play'}</span>
                </button>

                <button
                  onClick={handleSwStep}
                  disabled={isSwPlaying}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Step Forward</span>
                </button>

                <button
                  onClick={handleSwReset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <span>Window Size:</span>
                  <select
                    value={windowSize}
                    onChange={(e) => setWindowSize(parseInt(e.target.value, 10))}
                    className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white font-mono"
                  >
                    <option value={2}>2 Packets</option>
                    <option value={4}>4 Packets (Standard)</option>
                    <option value={6}>6 Packets</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span>Speed:</span>
                  <select
                    value={simSpeedMs}
                    onChange={(e) => setSimSpeedMs(parseInt(e.target.value, 10))}
                    className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white font-mono"
                  >
                    <option value={1500}>0.7x (Slow)</option>
                    <option value={1000}>1.0x (Normal)</option>
                    <option value={600}>1.6x (Fast)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Visual Pipeline */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Sender Sequence Buffer [Base: #{base} | NextSeq: #{nextSeq}]
              </span>

              <div className="flex items-center gap-2 overflow-x-auto p-4 bg-slate-50 border border-slate-200 rounded-xl">
                {Array.from({ length: totalPackets }, (_, i) => {
                  const isAcked = ackedPackets.includes(i);
                  const isInFlight = inFlightPackets.includes(i);
                  const isInWindow = i >= base && i < base + windowSize;

                  let badgeColor = 'bg-white border-slate-300 text-slate-400';
                  let statusText = 'Unsent';

                  if (isAcked) {
                    badgeColor = 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs';
                    statusText = 'ACKed';
                  } else if (isInFlight) {
                    badgeColor = 'bg-amber-50 border-amber-500 text-amber-700 animate-pulse';
                    statusText = 'In-Flight';
                  } else if (isInWindow) {
                    badgeColor = 'bg-blue-50 border-blue-500 text-blue-700';
                    statusText = 'Ready';
                  }

                  return (
                    <div
                      key={i}
                      className={`flex-1 min-w-[70px] p-3 rounded-lg border text-center transition-all ${badgeColor} ${
                        isInWindow ? 'ring-2 ring-blue-400/30' : ''
                      }`}
                    >
                      <div className="text-[10px] font-mono text-slate-400">Pkt #{i}</div>
                      <div className="text-xs font-bold mt-0.5">{statusText}</div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-500"></span>
                  <span className="text-slate-600">Delivered & ACKed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-100 border border-amber-500"></span>
                  <span className="text-slate-600">In-Flight across Channel</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-100 border border-blue-500 ring-1 ring-blue-300"></span>
                  <span className="text-slate-600">Inside Sliding Window</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Go-Back-N Visualizer */
          <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsGbnPlaying(!isGbnPlaying)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  {isGbnPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isGbnPlaying ? 'Pause' : 'Auto Play'}</span>
                </button>

                <button
                  onClick={handleGbnStep}
                  disabled={isGbnPlaying}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Step Transmission</span>
                </button>

                <button
                  onClick={handleGbnAck}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Send ACK</span>
                </button>

                <button
                  onClick={handleGbnReset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">Simulate Channel Drop on:</span>
                <select
                  value={dropTarget !== null ? dropTarget : ''}
                  onChange={(e) => setDropTarget(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white font-mono font-bold text-rose-600"
                >
                  <option value="">No Drop (Clean link)</option>
                  <option value={1}>Drop Packet #1</option>
                  <option value={2}>Drop Packet #2 (Standard Test)</option>
                  <option value={3}>Drop Packet #3</option>
                  <option value={4}>Drop Packet #4</option>
                </select>
              </div>
            </div>

            {/* Pipeline Display */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider">
                  GBN Sender Window [Base: #{gbnBase} | Next: #{gbnNext} | Limit: {gbnWindowSize} pkts]
                </span>
                <span className="font-mono text-blue-700 font-semibold">{gbnStage}</span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto p-4 bg-slate-50 border border-slate-200 rounded-xl">
                {Array.from({ length: gbnTotal }, (_, i) => {
                  const isAcked = i < gbnBase;
                  const isSentUnacked = i >= gbnBase && i < gbnNext;
                  const isInWindow = i >= gbnBase && i < gbnBase + gbnWindowSize;

                  let badgeColor = 'bg-white border-slate-300 text-slate-400';
                  let status = 'Unsent';

                  if (isAcked) {
                    badgeColor = 'bg-emerald-50 border-emerald-500 text-emerald-700';
                    status = 'ACKed';
                  } else if (isSentUnacked) {
                    badgeColor = 'bg-amber-50 border-amber-500 text-amber-700';
                    status = 'Sent';
                  } else if (isInWindow) {
                    badgeColor = 'bg-blue-50 border-blue-400 text-blue-700';
                    status = 'Can Send';
                  }

                  return (
                    <div
                      key={i}
                      className={`flex-1 min-w-[70px] p-3 rounded-lg border text-center transition-all ${badgeColor} ${
                        isInWindow ? 'ring-2 ring-blue-300' : ''
                      }`}
                    >
                      <div className="text-[10px] font-mono text-slate-400">Pkt #{i}</div>
                      <div className="text-xs font-bold mt-0.5">{status}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Protocol Event Logs */}
            <div className="bg-[#0F172A] text-slate-300 p-4 rounded-xl font-mono text-xs max-h-48 overflow-y-auto space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-500 pb-1 border-b border-slate-800">
                Go-Back-N Protocol State Log
              </div>
              {gbnLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.includes('DROPPED') || log.includes('Timeout')
                      ? 'text-rose-400 font-semibold'
                      : log.includes('ACK')
                      ? 'text-emerald-400 font-semibold'
                      : 'text-slate-300'
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
