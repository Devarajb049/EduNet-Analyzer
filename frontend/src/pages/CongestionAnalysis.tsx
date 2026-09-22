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
  AlertTriangle
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

export const CongestionAnalysis: React.FC = () => {
  const { mode, isDemo, setMode } = useSimulationMode();
  const dataService = useDataService();

  const [realExperiments, setRealExperiments] = useState<Experiment[]>([]);
  const [selectedExp, setSelectedExp] = useState<Experiment | null>(null);

  // Leaky Bucket Interactive Parameters (Demo Mode)
  const [bucketCapacity, setBucketCapacity] = useState<number>(40);
  const [leakRate, setLeakRate] = useState<number>(8);
  const [currentBuffer, setCurrentBuffer] = useState<number>(10);
  const [droppedCount, setDroppedCount] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Time-series history for Inflow vs Outflow rate chart
  const [history, setHistory] = useState<
    { time: number; inflow: number; outflow: number; buffer: number }[]
  >([]);

  // Load real experiments for congestion control
  useEffect(() => {
    dataService.getExperiments({ limit: 50 }).then((data) => {
      setRealExperiments(data);
      const leaky = data.find((e) => e.experiment_type === 'Leaky Bucket' || e.exp_code.includes('006')) || data[0];
      if (leaky) {
        setSelectedExp(leaky);
      }
    }).catch(() => null);
  }, [mode]);

  // Simulation tick loop for interactive demo mode
  useEffect(() => {
    let tickCount = 0;
    const interval = setInterval(() => {
      if (!isRunning) return;

      tickCount += 1;

      // Base inflow + occasional bursty student spike
      const isBurst = Math.random() > 0.78;
      const incoming = isBurst ? Math.floor(Math.random() * 18) + 6 : Math.floor(Math.random() * 5) + 2;

      setCurrentBuffer((prevBuffer) => {
        const potential = prevBuffer + incoming;
        let newBuffer = potential;
        let dropped = 0;

        if (potential > bucketCapacity) {
          dropped = potential - bucketCapacity;
          newBuffer = bucketCapacity;
          setDroppedCount((d) => d + dropped);
        }

        // Leak packets at fixed output rate
        const actualLeak = Math.min(newBuffer, leakRate);
        const remaining = Math.max(0, newBuffer - actualLeak);

        setHistory((prevHist) => {
          const nextHist = [
            ...prevHist,
            {
              time: tickCount,
              inflow: incoming * 12,
              outflow: actualLeak * 12,
              buffer: remaining,
            },
          ];
          return nextHist.slice(-30);
        });

        return remaining;
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isRunning, bucketCapacity, leakRate]);

  const handleTriggerBurst = () => {
    setCurrentBuffer((prev) => {
      const burstSize = 25;
      const potential = prev + burstSize;
      if (potential > bucketCapacity) {
        setDroppedCount((d) => d + (potential - bucketCapacity));
        return bucketCapacity;
      }
      return potential;
    });
  };

  const handleReset = () => {
    setCurrentBuffer(5);
    setDroppedCount(0);
    setHistory([]);
  };

  // Prepare real-time chart data if real experiment has time_series
  const realChartData = selectedExp?.result?.time_series?.map((p) => ({
    time: `${p.time}s`,
    throughput: p.throughput_kbps,
    delay: p.delay_ms,
    drops: p.packets_dropped,
  })) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0F172A]">Congestion Control: Leaky Bucket Traffic Shaping</h2>
                <ModeBadge isDemo={isDemo} />
              </div>
              <p className="text-xs text-[#64748B]">
                {isDemo
                  ? 'Interactive token/leaky bucket queue simulation modeling burst absorption and drop dynamics'
                  : 'Actual NS-2 queue metrics derived from discrete-event traffic shaping traces'}
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
      </div>

      {/* Actual Simulation Result Section (When in Real-Time Mode) */}
      {!isDemo && (
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Actual NS-2 Leaky Bucket & RED Queue Simulation Results
              </h3>
            </div>
            {selectedExp && (
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                {selectedExp.exp_code} (50 Nodes • {selectedExp.protocol})
              </span>
            )}
          </div>

          {selectedExp?.result ? (
            <>
              {/* Telemetry Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase block font-bold">Throughput</span>
                  <span className="font-bold text-blue-700 text-base">{selectedExp.result.throughput_kbps} Kbps</span>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Shaped at border router</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase block font-bold">Packets Dropped</span>
                  <span className="font-bold text-rose-600 text-base">{selectedExp.result.packets_dropped.toLocaleString()} pkts</span>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">Loss: {selectedExp.result.packet_loss_percent}%</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase block font-bold">Packets Delivered</span>
                  <span className="font-bold text-emerald-700 text-base">{selectedExp.result.packets_received.toLocaleString()} pkts</span>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">PDR: {selectedExp.result.packet_delivery_ratio}%</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase block font-bold">Average Queue Delay</span>
                  <span className="font-bold text-amber-700 text-base">{selectedExp.result.average_delay_ms} ms</span>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">DropTail / RED smoothing</p>
                </div>
              </div>

              {/* Time Series Chart from Live NS-2 Trace */}
              {realChartData.length > 0 && (
                <div className="pt-3">
                  <h4 className="text-xs font-bold text-slate-700 mb-2">
                    Delivered Throughput & Latency Progression (NS-2 Trace Telemetry)
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={realChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} label={{ value: 'Kbps', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Area type="monotone" dataKey="throughput" name="Throughput (Kbps)" stroke="#2563EB" fill="#3B82F6" fillOpacity={0.15} />
                        <Area type="monotone" dataKey="delay" name="Delay (ms)" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500 text-center">
              No real-time congestion control simulation recorded yet. Run a simulation to populate actual metrics.
            </div>
          )}
        </div>
      )}

      {/* Interactive Queue & Leaky Bucket Simulator */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Interactive Leaky Bucket Mechanism ({isDemo ? 'Demo Mode' : 'Conceptual Simulator'})
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Buffer: {currentBuffer} / {bucketCapacity} packets
          </span>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Pause Flow' : 'Resume Flow'}</span>
            </button>

            <button
              onClick={handleTriggerBurst}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate Peak Burst (+25 pkts)</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-2">
              <span>Bucket Depth:</span>
              <select
                value={bucketCapacity}
                onChange={(e) => setBucketCapacity(parseInt(e.target.value, 10))}
                className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white font-mono"
              >
                <option value={25}>25 pkts (Tight DropTail)</option>
                <option value={40}>40 pkts (Standard RED)</option>
                <option value={60}>60 pkts (Deep Buffer)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span>Drain Rate:</span>
              <select
                value={leakRate}
                onChange={(e) => setLeakRate(parseInt(e.target.value, 10))}
                className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white font-mono"
              >
                <option value={4}>4 pkts/tick (512 Kbps)</option>
                <option value={8}>8 pkts/tick (1 Mbps)</option>
                <option value={16}>16 pkts/tick (2 Mbps)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Visual Bucket Graphic */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-1 flex flex-col items-center">
            <span className="text-xs font-bold text-slate-700 mb-2">Router Buffer Occupancy</span>
            <div className="w-36 h-48 border-4 border-slate-700 border-t-0 rounded-b-2xl p-2 relative bg-slate-100 flex flex-col justify-end overflow-hidden shadow-inner">
              <div
                className={`w-full transition-all duration-300 rounded-b-lg ${
                  currentBuffer >= bucketCapacity * 0.85 ? 'bg-rose-500 animate-pulse' : 'bg-blue-600'
                }`}
                style={{ height: `${(currentBuffer / bucketCapacity) * 100}%` }}
              >
                <div className="text-center text-white font-mono font-bold text-xs pt-1">
                  {currentBuffer} pkts
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-mono text-center">
              Capacity: {bucketCapacity} | Drops: <strong className="text-rose-600">{droppedCount}</strong>
            </div>
          </div>

          {/* Time-Series Chart */}
          <div className="md:col-span-2 space-y-2">
            <span className="text-xs font-bold text-slate-700 block">
              Bursty Inflow vs Shaped Outflow (Packets/Second)
            </span>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="inflow" name="Unshaped Student Inflow" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="outflow" name="Shaped Bottleneck Outflow" stroke="#10B981" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
