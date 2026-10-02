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
  Repeat
} from 'lucide-react';
import { ModeBadge, useSimulationMode } from '../context/SimulationModeContext';

export const GoBackN: React.FC = () => {
  const { mode, isDemo } = useSimulationMode();

  // Go-Back-N Protocol State
  const windowSize = 4;
  const totalFrames = 10;
  const [base, setBase] = useState<number>(0);
  const [nextSeq, setNextSeq] = useState<number>(0);
  const [lostTarget, setLostTarget] = useState<number>(2); // Default drop frame 2
  const [retransmissionsCount, setRetransmissionsCount] = useState<number>(0);
  const [discardedCount, setDiscardedCount] = useState<number>(0);
  const [ackedFrames, setAckedFrames] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [simSpeedMs, setSimSpeedMs] = useState<number>(1200);

  const [logs, setLogs] = useState<string[]>([
    'Go-Back-N ARQ Engine initialized. Window size N=4. Drop target set to Frame #2.',
  ]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
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
      addLog('✅ All 10 frames successfully acknowledged by LMS receiver.');
      return;
    }

    // Phase 1: Transmit next available frame within window
    if (nextSeq < base + windowSize && nextSeq < totalFrames) {
      const pkt = nextSeq;
      setNextSeq((prev) => prev + 1);

      if (pkt === lostTarget) {
        addLog(`❌ Frame #${pkt} DROPPED in bottleneck queue! (Lost in transit)`);
      } else if (pkt > lostTarget && !ackedFrames.includes(lostTarget)) {
        setDiscardedCount((prev) => prev + 1);
        addLog(`⚠️ Receiver rejected Frame #${pkt}: Out-of-order! (Receiver expecting Frame #${lostTarget}). Discarded.`);
      } else {
        addLog(`Sender transmitted Frame #${pkt} [Seq #${pkt}].`);
      }
      return;
    }

    // Phase 2: If we transmitted up to window limit and lostTarget was lost, trigger Go-Back-N timeout!
    if (!ackedFrames.includes(lostTarget) && nextSeq >= lostTarget + 1) {
      addLog(`⏰ Timer Expired for unacknowledged Frame #${lostTarget}!`);
      addLog(`🔄 GO-BACK-N INITIATED: Rewinding sender from #${nextSeq - 1} back to Frame #${lostTarget}...`);
      setRetransmissionsCount((prev) => prev + (nextSeq - lostTarget));
      setNextSeq(lostTarget);
      // Change lost target to avoid infinite loop
      setLostTarget(-1);
      return;
    }

    // Phase 3: Successful ACK progression
    if (nextSeq > base && !ackedFrames.includes(base)) {
      const acked = base;
      setAckedFrames((prev) => [...prev, acked]);
      setBase((prev) => prev + 1);
      addLog(`📥 Receiver accepted Frame #${acked} -> Sent ACK #${acked + 1}. Window slides forward.`);
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
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
            Demonstrate sliding-window error recovery where the receiver discards all out-of-order frames and the sender retransmits from the earliest unacknowledged frame.
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

        {/* Status Pills */}
        <div className="flex items-center gap-3 text-xs">
          <div className="p-2 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500">Sender Window:</span> <strong>[{base} .. {Math.min(base + windowSize - 1, totalFrames - 1)}]</strong>
          </div>
          <div className="p-2 bg-rose-50 text-rose-700 rounded border border-rose-200">
            <span>Retransmissions:</span> <strong>{retransmissionsCount}</strong>
          </div>
          <div className="p-2 bg-amber-50 text-amber-700 rounded border border-amber-200">
            <span>Discarded (Out-of-Order):</span> <strong>{discardedCount}</strong>
          </div>
        </div>
      </div>

      {/* Frame Status Grid */}
      <div className="p-6 bg-white rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Frame Buffer State (Window Size = {windowSize})</h3>
            <p className="text-xs text-slate-500">
              Sender base frame: <strong className="font-mono text-blue-600">#{base}</strong> • Next sequence to send: <strong className="font-mono text-blue-600">#{nextSeq}</strong>
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
            const isCurrent = idx === nextSeq;
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

      {/* Detailed Viva Q&A & Concept Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 mb-2">
            <Repeat className="w-4 h-4 text-blue-600" />
            Go-Back-N Protocol Mechanics
          </h3>
          <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside leading-relaxed">
            <li><strong>Sender Window:</strong> Up to $N$ frames can be sent pipelined without waiting for ACKs.</li>
            <li><strong>Receiver Buffer:</strong> Receiver has buffer size of <strong>1</strong>. It only accepts frames strictly in sequence.</li>
            <li><strong>Discard Policy:</strong> If frame $k$ is lost, any subsequent frames $k+1, k+2$ are discarded even if received uncorrupted.</li>
            <li><strong>Cumulative ACK:</strong> An ACK $m$ confirms receipt of all frames up to $m-1$.</li>
          </ul>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Viva / Laboratory Discussion Points
          </h3>
          <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside leading-relaxed">
            <li><strong>Why does Go-Back-N waste bandwidth?</strong> Retransmitting all $N$ frames after a single drop wastes transmission capacity on noisy links.</li>
            <li><strong>How does Selective Repeat (SR) improve this?</strong> SR buffers out-of-order frames at the receiver and retransmits only the single lost frame.</li>
            <li><strong>NS-2 Modeling:</strong> TCP Reno uses Duplicate ACKs (fast retransmit) similar to GBN + Selective recovery.</li>
          </ul>
        </div>
      </div>

      {/* Terminal Trace Log */}
      <div className="p-5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-[#0F172A]">Protocol Execution Telemetry</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Live trace</span>
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
