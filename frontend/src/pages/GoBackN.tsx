import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Terminal,
  Activity,
  Layers,
  Repeat,
  PlayCircle,
  RefreshCw,
  TrendingDown,
  Zap
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';
import { ModeBadge, useSimulationMode } from '../context/SimulationModeContext';

export const GoBackN: React.FC = () => {
  const { mode, isDemo } = useSimulationMode();

  // Frontend Interactive Animation State
  const windowSize = 4;
  const totalFrames = 10;
  const [base, setBase] = useState<number>(0);
  const [nextSeq, setNextSeq] = useState<number>(0);
  const [lostTarget, setLostTarget] = useState<number>(2);
  const [retransmissionsCount, setRetransmissionsCount] = useState<number>(0);
  const [discardedCount, setDiscardedCount] = useState<number>(0);
  const [ackedFrames, setAckedFrames] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [simSpeedMs, setSimSpeedMs] = useState<number>(1200);

  const [logs, setLogs] = useState<string[]>([
    'Go-Back-N ARQ Engine initialized. Window size N=4. Drop target set to Frame #2.',
  ]);

  // Real NS-2 Simulation Runner State
  const [ns2Window, setNs2Window] = useState<number>(8);
  const [ns2LossRate, setNs2LossRate] = useState<number>(0.05);
  const [ns2Result, setNs2Result] = useState<any>(null);
  const [isRunningNs2, setIsRunningNs2] = useState<boolean>(false);
  const [ns2Error, setNs2Error] = useState<string | null>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    // Load latest GBN run if present
    api.getGbnLatest().then((res) => {
      if (res && res.trace_points && res.trace_points.length > 0) {
        setNs2Result(res);
      }
    }).catch(() => null);
  }, []);

  const handleRunNs2 = async () => {
    setIsRunningNs2(true);
    setNs2Error(null);
    try {
      const res = await api.runGbnSimulation({
        window_size: ns2Window,
        loss_rate: ns2LossRate,
        simulation_time: 10.0,
      });
      setNs2Result(res);
    } catch (err: any) {
      setNs2Error(err.message || 'Failed to execute NS-2 Go-Back-N');
    } finally {
      setIsRunningNs2(false);
    }
  };

  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        handleStep();
      }, simSpeedMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, base, nextSeq, ackedFrames, lostTarget, retransmissionsCount, simSpeedMs]);

  const handleStep = () => {
    if (ackedFrames.length >= totalFrames) {
      setIsPlaying(false);
      addLog('All 10 frames successfully acknowledged by LMS receiver.');
      return;
    }

    if (nextSeq < base + windowSize && nextSeq < totalFrames) {
      const pkt = nextSeq;
      setNextSeq((prev) => prev + 1);

      if (pkt === lostTarget) {
        addLog(`Frame #${pkt} DROPPED in bottleneck queue! (Lost in transit)`);
      } else if (pkt > lostTarget && !ackedFrames.includes(lostTarget)) {
        setDiscardedCount((prev) => prev + 1);
        addLog(`Receiver rejected Frame #${pkt}: Out-of-order! (Receiver expecting Frame #${lostTarget}). Discarded.`);
      } else {
        addLog(`Sender transmitted Frame #${pkt} [Seq #${pkt}].`);
      }
      return;
    }

    if (!ackedFrames.includes(lostTarget) && nextSeq >= lostTarget + 1) {
      addLog(`Timer Expired for unacknowledged Frame #${lostTarget}!`);
      addLog(`GO-BACK-N INITIATED: Rewinding sender from #${nextSeq - 1} back to Frame #${lostTarget}...`);
      setRetransmissionsCount((prev) => prev + (nextSeq - lostTarget));
      setNextSeq(lostTarget);
      setLostTarget(-1);
      return;
    }

    if (nextSeq > base && !ackedFrames.includes(base)) {
      const acked = base;
      setAckedFrames((prev) => [...prev, acked]);
      setBase((prev) => prev + 1);
      addLog(`Receiver accepted Frame #${acked} -> Sent ACK #${acked + 1}. Window slides forward.`);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setBase(0);
    setNextSeq(0);
    setAckedFrames([]);
    setRetransmissionsCount(0);
    setDiscardedCount(0);
    setLostTarget(2);
    setLogs(['Go-Back-N simulator reset. Drop target set to Frame #2. Ready to transmit.']);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              Go-Back-N ARQ Protocol Simulation
            </h1>
            <ModeBadge />
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Real NS-2 discrete-event implementation (Agent/TCP Tahoe + ErrorModel) alongside interactive frame animation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/sliding-window"
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition"
          >
            Sliding Window Simulator
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* SECTION 1: Real NS-2 Go-Back-N Simulation Engine */}
      <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <h2 className="text-base font-bold text-[#0F172A]">Real NS-2 Go-Back-N Discrete-Event Simulation</h2>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Runs native NS-2 Tahoe cumulative retransmission model with stochastic packet loss on bottleneck link.
            </p>
          </div>

          {/* NS-2 Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Window (N):</span>
              <select
                value={ns2Window}
                onChange={(e) => setNs2Window(Number(e.target.value))}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-semibold"
              >
                <option value={4}>4 packets</option>
                <option value={8}>8 packets</option>
                <option value={16}>16 packets</option>
                <option value={32}>32 packets</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Drop Rate:</span>
              <select
                value={ns2LossRate}
                onChange={(e) => setNs2LossRate(Number(e.target.value))}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-semibold"
              >
                <option value={0.02}>2% loss</option>
                <option value={0.05}>5% loss</option>
                <option value={0.10}>10% loss</option>
                <option value={0.15}>15% loss</option>
              </select>
            </div>

            <button
              onClick={handleRunNs2}
              disabled={isRunningNs2 || isDemo}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition ${
                isRunningNs2
                  ? 'bg-blue-400 text-white cursor-wait'
                  : isDemo
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isRunningNs2 ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              <span>{isRunningNs2 ? 'Running NS-2...' : 'Run NS-2 Go-Back-N'}</span>
            </button>
          </div>
        </div>

        {ns2Error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {ns2Error}
          </div>
        )}

        {/* NS-2 Real Metrics Cards */}
        {ns2Result ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500">Packets Sent</span>
              <div className="text-lg font-bold text-[#0F172A]">{ns2Result.packets_sent}</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-[11px] text-emerald-700">Packets Received</span>
              <div className="text-lg font-bold text-emerald-800">{ns2Result.packets_received}</div>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
              <span className="text-[11px] text-rose-700">Bottleneck Drops</span>
              <div className="text-lg font-bold text-rose-800">{ns2Result.packets_dropped}</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <span className="text-[11px] text-amber-700">Retransmissions</span>
              <div className="text-lg font-bold text-amber-800">{ns2Result.retransmissions}</div>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <span className="text-[11px] text-indigo-700">Delivery Ratio</span>
              <div className="text-lg font-bold text-indigo-800">
                {Math.round((ns2Result.packets_received / (ns2Result.packets_sent || 1)) * 1000) / 10}%
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-500">
            No NS-2 Go-Back-N trace loaded yet. Click &ldquo;Run NS-2 Go-Back-N&rdquo; to execute simulation in WSL2.
          </div>
        )}

        {/* NS-2 Sequence vs Time Plot */}
        {ns2Result && ns2Result.trace_points && ns2Result.trace_points.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                NS-2 Trace: Sequence Number vs Simulation Time (With Retransmissions)
              </h3>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Tahoe Sawtooth Retransmit Curve
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ns2Result.trace_points}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} label={{ value: 'Simulation Time (seconds)', position: 'insideBottom', offset: -4, fontSize: 10 }} />
                  <YAxis dataKey="seq_num" tick={{ fontSize: 10 }} label={{ value: 'Sequence #', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="seq_num" name="Transmitted Packet Sequence" stroke="#2563EB" strokeWidth={1.8} dot={{ r: 1.5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Viva Mapping Explanation Box */}
        <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-950 space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-blue-900">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Viva Defense: How Go-Back-N is Modeled in NS-2</span>
          </div>
          <p>
            NS-2 lacks a native <code>Agent/GBN</code> object. Academically and practically, Go-Back-N is simulated using <strong>Agent/TCP (Tahoe)</strong> paired with cumulative <strong>Agent/TCPSink</strong>. When a packet drops via the bottleneck <code>ErrorModel</code>, the receiver refuses out-of-order segments and continues generating duplicate ACKs for the missing frame. Upon RTO timeout, Tahoe collapses <code>cwnd</code> to 1 and retransmits starting from the lost sequence number forward, precisely executing Go-Back-N ARQ semantics.
          </p>
        </div>
      </div>

      {/* SECTION 2: Interactive Frame-by-Frame Visualizer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <Repeat className="w-4 h-4 text-blue-600" />
            Interactive Frame-by-Frame Visualizer
          </h2>
          <span className="text-xs text-slate-500">Visual Demonstration Aid</span>
        </div>

        {/* Control Toolbar */}
        <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition ${
                isPlaying ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Start Go-Back-N'}
            </button>

            <button
              onClick={handleStep}
              disabled={isPlaying || ackedFrames.length >= totalFrames}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              <SkipForward className="w-4 h-4" />
              Step Protocol
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500">Sender Window:</span> <strong>[{base} .. {Math.min(base + windowSize - 1, totalFrames - 1)}]</strong>
            </div>
            <div className="p-2 bg-rose-50 text-rose-700 rounded border border-rose-200">
              <span>Retransmissions:</span> <strong>{retransmissionsCount}</strong>
            </div>
            <div className="p-2 bg-amber-50 text-amber-700 rounded border border-amber-200">
              <span>Discarded:</span> <strong>{discardedCount}</strong>
            </div>
          </div>
        </div>

        {/* Frame Status Grid */}
        <div className="p-6 bg-white rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Frame Buffer State (Window Size = {windowSize})</h3>
              <p className="text-xs text-slate-500">
                Sender base: <strong className="font-mono text-blue-600">#{base}</strong> • Next to send: <strong className="font-mono text-blue-600">#{nextSeq}</strong>
              </p>
            </div>
            <span className="text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-1 rounded border border-rose-200">
              {lostTarget >= 0 ? `Targeted Loss: Frame #${lostTarget}` : 'No Pending Losses'}
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {Array.from({ length: totalFrames }).map((_, idx) => {
              const isAcked = ackedFrames.includes(idx);
              const isLost = idx === lostTarget && nextSeq > idx;
              const isInWindow = idx >= base && idx < base + windowSize;

              let borderClass = 'border-slate-200 bg-slate-50 text-slate-400';
              if (isAcked) borderClass = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold';
              else if (isLost) borderClass = 'border-rose-500 bg-rose-50 text-rose-700 font-bold';
              else if (isInWindow) borderClass = 'border-blue-400 bg-blue-50 text-blue-800 font-semibold';

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border-2 text-center relative transition-all ${borderClass}`}
                >
                  <div className="text-[10px] font-mono uppercase">Seq</div>
                  <div className="text-lg font-bold">#{idx}</div>
                  <div className="text-[9px] mt-1 truncate">
                    {isAcked ? 'ACKed' : isLost ? 'LOST' : isInWindow ? 'In Window' : 'Waiting'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Terminal Trace Log */}
        <div className="p-5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-[#0F172A]">Animation Protocol Telemetry</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Live trace</span>
          </div>

          <div className="bg-slate-950 text-slate-200 p-4 rounded-lg font-mono text-xs h-36 overflow-y-auto space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
