import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Terminal,
  Activity,
  Zap
} from 'lucide-react';
import { ModeBadge, useSimulationMode } from '../context/SimulationModeContext';

export const SlidingWindow: React.FC = () => {
  const { mode, isDemo } = useSimulationMode();

  // Sliding Window Simulation State
  const totalPackets = 12;
  const [windowSize, setWindowSize] = useState<number>(4);
  const [base, setBase] = useState<number>(0);
  const [nextSeq, setNextSeq] = useState<number>(0);
  const [ackedPackets, setAckedPackets] = useState<number[]>([]);
  const [inFlightPackets, setInFlightPackets] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [simSpeedMs, setSimSpeedMs] = useState<number>(1200);
  const [rttProgress, setRttProgress] = useState<number>(0);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([
    'Sliding Window Engine initialized. Window size = 4 frames.',
  ]);

  // Handle Play Animation Loop
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        handleStepForward();
      }, simSpeedMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, base, nextSeq, inFlightPackets, ackedPackets, windowSize, simSpeedMs, dropTarget]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const handleStepForward = () => {
    // Check if finished
    if (ackedPackets.length >= totalPackets) {
      setIsPlaying(false);
      addLog('All packets successfully delivered and acknowledged!');
      return;
    }

    // Step 1: Can we transmit a new frame inside the window?
    if (nextSeq < base + windowSize && nextSeq < totalPackets) {
      const pkt = nextSeq;
      setNextSeq((prev) => prev + 1);
      setInFlightPackets((prev) => [...prev, pkt]);

      if (dropTarget === pkt) {
        addLog(`Frame #${pkt} injected into channel -> ❌ SIMULATED PACKET LOSS!`);
      } else {
        addLog(`Transmitted Frame #${pkt} [Seq: ${pkt}]. In-flight window [${base}..${base + windowSize - 1}].`);
      }
      return;
    }

    // Step 2: Receive ACK for the oldest in-flight frame
    if (inFlightPackets.length > 0) {
      const oldestInFlight = inFlightPackets[0];

      if (oldestInFlight === dropTarget) {
        // Packet was lost! Timeout triggers retransmission
        addLog(`⏱️ RTO Timeout for Frame #${oldestInFlight}! Packet lost. Retransmitting from Frame #${oldestInFlight}...`);
        setNextSeq(oldestInFlight);
        setInFlightPackets([]);
        setDropTarget(null); // Clear drop target after simulating loss once
        return;
      }

      // Successful ACK
      setInFlightPackets((prev) => prev.slice(1));
      setAckedPackets((prev) => (prev.includes(oldestInFlight) ? prev : [...prev, oldestInFlight]));
      setBase((prev) => prev + 1);
      addLog(`Received ACK for Frame #${oldestInFlight} -> Window slid to [${base + 1}..${base + 1 + windowSize - 1}].`);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setBase(0);
    setNextSeq(0);
    setAckedPackets([]);
    setInFlightPackets([]);
    setRttProgress(0);
    setLogs(['Sliding Window simulator reset. Ready for transmission.']);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              Sliding Window Protocol Simulator
            </h1>
            <ModeBadge />
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Interactive visualization of reliable sliding window flow control, sequence numbering, and cumulative ACK propagation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/go-back-n"
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition"
          >
            Switch to Go-Back-N
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition ${
              isPlaying ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Start Simulation'}
          </button>

          <button
            onClick={handleStepForward}
            disabled={isPlaying || ackedPackets.length >= totalPackets}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <SkipForward className="w-4 h-4" />
            Step Frame
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {/* Configuration Parameters */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Window Size (N):</span>
            <select
              value={windowSize}
              onChange={(e) => {
                setWindowSize(Number(e.target.value));
                handleReset();
              }}
              disabled={isPlaying}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
            >
              <option value={2}>2 Frames</option>
              <option value={4}>4 Frames</option>
              <option value={6}>6 Frames</option>
              <option value={8}>8 Frames</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Inject Loss:</span>
            <select
              value={dropTarget === null ? 'none' : dropTarget}
              onChange={(e) => setDropTarget(e.target.value === 'none' ? null : Number(e.target.value))}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-rose-700"
            >
              <option value="none">No Loss (Ideal Channel)</option>
              <option value={2}>Drop Frame #2</option>
              <option value={4}>Drop Frame #4</option>
              <option value={6}>Drop Frame #6</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Speed:</span>
            <select
              value={simSpeedMs}
              onChange={(e) => setSimSpeedMs(Number(e.target.value))}
              className="px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-medium"
            >
              <option value={1800}>0.5x (Slow)</option>
              <option value={1200}>1.0x (Normal)</option>
              <option value={600}>2.0x (Fast)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Frame Sequence Buffer Visualization */}
      <div className="p-6 bg-white rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Sender Frame Buffer & Window Boundaries</h3>
            <p className="text-xs text-slate-500">
              Active window: <span className="font-mono font-bold text-blue-600">[{base} .. {Math.min(base + windowSize - 1, totalPackets - 1)}]</span> (Capacity: {windowSize} frames)
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Acknowledged</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> In-Flight</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-400" /> Window Available</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" /> Pending</div>
          </div>
        </div>

        {/* Frames Visual Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-2">
          {Array.from({ length: totalPackets }).map((_, idx) => {
            const isAcked = ackedPackets.includes(idx);
            const isInFlight = inFlightPackets.includes(idx);
            const isInsideWindow = idx >= base && idx < base + windowSize;

            let bgColor = 'bg-slate-50 border-slate-200 text-slate-400';
            if (isAcked) bgColor = 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold';
            else if (isInFlight) bgColor = 'bg-blue-600 border-blue-700 text-white font-bold animate-pulse';
            else if (isInsideWindow) bgColor = 'bg-blue-50 border-blue-300 text-blue-700 font-semibold';

            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border-2 text-center transition-all relative ${bgColor}`}
              >
                <div className="text-[10px] uppercase font-mono opacity-80">Frame</div>
                <div className="text-base font-bold">#{idx}</div>
                <div className="text-[9px] mt-1 truncate">
                  {isAcked ? 'ACKed' : isInFlight ? 'In-Flight' : isInsideWindow ? 'In Window' : 'Queued'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Communication Link Diagram */}
      <div className="p-6 bg-slate-900 rounded-xl text-white shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold">Transmission Link & Propagation Plane</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Packets Acked: {ackedPackets.length} / {totalPackets}
          </span>
        </div>

        <div className="relative py-8 px-4">
          <div className="flex justify-between items-center relative z-10">
            {/* Sender Node */}
            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 text-center w-36">
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Sender Node</span>
              <div className="text-sm font-bold mt-1 text-slate-100">Student Workstation</div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">Base: {base} | Next: {nextSeq}</div>
            </div>

            {/* Flight Channel */}
            <div className="flex-1 mx-6 relative h-20 flex flex-col justify-center">
              {/* Channel Line */}
              <div className="h-1 bg-slate-800 w-full relative">
                {/* Active in-flight packets */}
                {inFlightPackets.map((pkt, i) => (
                  <div
                    key={pkt}
                    className="absolute -top-3 w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/50 animate-bounce"
                    style={{ left: `${25 + i * 20}%` }}
                  >
                    #{pkt}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
                <span>Forward Channel (Frames)</span>
                <span>Reverse Channel (ACKs)</span>
              </div>
            </div>

            {/* Receiver Node */}
            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 text-center w-36">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Receiver Node</span>
              <div className="text-sm font-bold mt-1 text-slate-100">LMS Server</div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">Expecting: #{base}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Protocol Telemetry Console */}
      <div className="p-5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-[#0F172A]">Event Log & Viva Explanation</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Real-time ARQ trace</span>
        </div>

        <div className="bg-slate-950 text-slate-200 p-4 rounded-lg font-mono text-xs h-40 overflow-y-auto space-y-1">
          {logs.map((log, i) => (
            <div key={i} className="leading-relaxed">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
