import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Gauge,
  Play,
  Pause,
  RotateCcw,
  Zap,
  TrendingDown,
  Info,
  Sliders,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useDataService } from '../services/dataService';
import { Experiment } from '../types';
import { ModeBadge, useSimulationMode } from '../context/SimulationModeContext';

export const LeakyBucket: React.FC = () => {
  const { mode, isDemo } = useSimulationMode();
  const dataService = useDataService();

  // Leaky Bucket Interactive State
  const [bucketCapacity, setBucketCapacity] = useState<number>(40);
  const [leakRate, setLeakRate] = useState<number>(8); // Packets leaked per tick
  const [burstRate, setBurstRate] = useState<number>(14);
  const [currentBuffer, setCurrentBuffer] = useState<number>(12);
  const [totalInflow, setTotalInflow] = useState<number>(0);
  const [totalOutflow, setTotalOutflow] = useState<number>(0);
  const [droppedCount, setDroppedCount] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Time-series history for charts
  const [history, setHistory] = useState<
    { time: number; inflow: number; outflow: number; buffer: number }[]
  >([]);

  // Simulation tick loop
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        // Random burstiness
        const isBurst = Math.random() > 0.65;
        const incoming = isBurst ? Math.floor(burstRate * (0.8 + Math.random() * 0.5)) : Math.floor(burstRate * 0.3);

        setCurrentBuffer((prev) => {
          const newTotal = prev + incoming;
          let dropped = 0;
          let stored = newTotal;

          if (newTotal > bucketCapacity) {
            dropped = newTotal - bucketCapacity;
            stored = bucketCapacity;
          }

          const processed = Math.min(stored, leakRate);
          const remaining = stored - processed;

          setTotalInflow((t) => t + incoming);
          setTotalOutflow((t) => t + processed);
          if (dropped > 0) {
            setDroppedCount((d) => d + dropped);
          }

          setHistory((hist) => {
            const nextTime = hist.length > 0 ? hist[hist.length - 1].time + 1 : 1;
            const entry = {
              time: nextTime,
              inflow: incoming,
              outflow: processed,
              buffer: remaining,
            };
            return [...hist.slice(-25), entry];
          });

          return remaining;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, bucketCapacity, leakRate, burstRate]);

  const handleReset = () => {
    setCurrentBuffer(10);
    setTotalInflow(0);
    setTotalOutflow(0);
    setDroppedCount(0);
    setHistory([]);
  };

  const bufferPercentage = Math.min(100, Math.round((currentBuffer / bucketCapacity) * 100));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              Leaky Bucket Traffic Shaping & Congestion Control
            </h1>
            <ModeBadge />
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Simulate constant bit-rate traffic smoothing at campus access routers to mitigate sudden exam or class start bursts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/congestion"
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition"
          >
            Congestion Analysis
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Control Panel */}
      <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition ${
              isRunning ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Pause Traffic' : 'Resume Traffic'}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Counters
          </button>
        </div>

        {/* Sliders */}
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Bucket Capacity:</span>
            <input
              type="range"
              min="20"
              max="80"
              value={bucketCapacity}
              onChange={(e) => setBucketCapacity(Number(e.target.value))}
              className="w-24 accent-blue-600"
            />
            <strong className="w-8">{bucketCapacity} pkts</strong>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Leak Rate:</span>
            <input
              type="range"
              min="4"
              max="16"
              value={leakRate}
              onChange={(e) => setLeakRate(Number(e.target.value))}
              className="w-24 accent-blue-600"
            />
            <strong className="w-8">{leakRate} pkts/s</strong>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Burst Inflow:</span>
            <input
              type="range"
              min="6"
              max="24"
              value={burstRate}
              onChange={(e) => setBurstRate(Number(e.target.value))}
              className="w-24 accent-purple-600"
            />
            <strong className="w-8">{burstRate} pkts/s</strong>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Ingested Packets</span>
          <div className="text-xl font-bold text-[#0F172A] mt-1">{totalInflow}</div>
          <span className="text-[10px] text-slate-400">Arrived from student clients</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Smooth Outflow Packets</span>
          <div className="text-xl font-bold text-emerald-600 mt-1">{totalOutflow}</div>
          <span className="text-[10px] text-slate-400">Forwarded at constant bit rate</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Current Buffer Fill</span>
          <div className="text-xl font-bold text-blue-600 mt-1">{currentBuffer} / {bucketCapacity}</div>
          <span className="text-[10px] text-slate-400">{bufferPercentage}% capacity used</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Dropped Packets (Overflow)</span>
          <div className={`text-xl font-bold mt-1 ${droppedCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
            {droppedCount}
          </div>
          <span className="text-[10px] text-slate-400">Exceeded bucket storage</span>
        </div>
      </div>

      {/* Physical Water Tank Metaphor & Visual Flow */}
      <div className="p-6 bg-white rounded-xl border border-[#E2E8F0] shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Step 1: Burst Inflow */}
        <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Unregulated Traffic</span>
          <div className="text-base font-bold text-[#0F172A] mt-1">Student Burst Inflow</div>
          <div className="text-xs text-slate-500 mt-1">Video streaming & quizzes</div>
          <div className="mt-3 flex justify-center">
            <Zap className="w-8 h-8 text-purple-500 animate-pulse" />
          </div>
          <div className="text-xs font-mono font-semibold text-purple-600 mt-2">
            Peak: up to {burstRate} pkts/s
          </div>
        </div>

        {/* Step 2: Leaky Bucket Tank */}
        <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 text-white text-center flex flex-col items-center">
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Router Buffer Tank</span>
          <div className="text-sm font-bold mt-1">Leaky Bucket Buffer</div>

          {/* Visual Tank Gauge */}
          <div className="w-28 h-36 border-4 border-slate-600 rounded-b-xl border-t-0 my-3 relative overflow-hidden flex flex-col justify-end bg-slate-950">
            <div
              className={`w-full transition-all duration-500 ${
                bufferPercentage > 85 ? 'bg-rose-500' : bufferPercentage > 50 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ height: `${bufferPercentage}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs shadow-xs">
              {currentBuffer} / {bucketCapacity}
            </div>
          </div>

          <span className="text-[10px] text-slate-400 font-mono">
            {bufferPercentage}% Tank Volume
          </span>
        </div>

        {/* Step 3: Constant Outflow */}
        <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Shaped Traffic</span>
          <div className="text-base font-bold text-[#0F172A] mt-1">Constant Bit Rate (CBR)</div>
          <div className="text-xs text-slate-500 mt-1">Forwarded to Core Trunk</div>
          <div className="mt-3 flex justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <div className="text-xs font-mono font-semibold text-emerald-600 mt-2">
            Constant: {leakRate} pkts/s
          </div>
        </div>
      </div>

      {/* Real-time Inflow vs Outflow Rate Chart */}
      <div className="p-5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Real-Time Traffic Smoothing (Inflow vs Outflow)</h3>
            <p className="text-[11px] text-slate-500">Notice how wild burst inflow is converted into flat, constant bit-rate output</p>
          </div>
          <TrendingUp className="w-4 h-4 text-blue-600" />
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333EA" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#9333EA" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit=" pkts" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="inflow" stroke="#9333EA" fill="url(#inflowGrad)" name="Burst Inflow (pkts)" strokeWidth={2} />
              <Area type="monotone" dataKey="outflow" stroke="#16A34A" fill="url(#outflowGrad)" name="Shaped Outflow (pkts)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
