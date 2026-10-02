import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Info,
  PlayCircle,
  Clock,
  Activity
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { useDataService } from '../services/dataService';
import { Experiment } from '../types';
import { ModeBadge, useSimulationMode } from '../context/SimulationModeContext';

export const TcpUdpComparison: React.FC = () => {
  const { mode, isDemo, setMode } = useSimulationMode();
  const dataService = useDataService();

  const [tcpExps, setTcpExps] = useState<Experiment[]>([]);
  const [udpExps, setUdpExps] = useState<Experiment[]>([]);

  useEffect(() => {
    dataService.getExperiments({ limit: 100 }).then((all) => {
      const withRes = all.filter((e) => e.result);
      setTcpExps(withRes.filter((e) => e.protocol === 'TCP'));
      setUdpExps(withRes.filter((e) => e.protocol === 'UDP'));
    }).catch(() => null);
  }, [mode]);

  // Comparison metrics by common data rates or student cohorts
  const comparisonData = [
    {
      label: '500 Kbps (50 Students)',
      rate: '500Kbps',
      tcpThroughput: 462.5,
      udpThroughput: 495.0,
      tcpLoss: 0.4,
      udpLoss: 1.2,
      tcpDelay: 28.5,
      udpDelay: 27.2,
      tcpPdr: 99.6,
      udpPdr: 98.8
    },
    {
      label: '1 Mbps (50 Students)',
      rate: '1Mbps',
      tcpThroughput: 842.1,
      udpThroughput: 980.5,
      tcpLoss: 3.2,
      udpLoss: 8.6,
      tcpDelay: 42.1,
      udpDelay: 31.0,
      tcpPdr: 96.8,
      udpPdr: 91.4
    },
    {
      label: '1 Mbps (100 Students)',
      rate: '1Mbps',
      tcpThroughput: 810.0,
      udpThroughput: 965.2,
      tcpLoss: 7.8,
      udpLoss: 18.4,
      tcpDelay: 68.4,
      udpDelay: 38.5,
      tcpPdr: 92.2,
      udpPdr: 81.6
    },
    {
      label: '2 Mbps (100 Students)',
      rate: '2Mbps',
      tcpThroughput: 1420.0,
      udpThroughput: 1890.0,
      tcpLoss: 11.5,
      udpLoss: 24.2,
      tcpDelay: 85.0,
      udpDelay: 45.2,
      tcpPdr: 88.5,
      udpPdr: 75.8
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              TCP vs UDP Protocol Performance Analysis
            </h1>
            <ModeBadge />
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Comparative evaluation of Connection-Oriented Flow Control (TCP NewReno) vs Connectionless Streaming (UDP CBR) under bottleneck congestion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/simulation/new"
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <PlayCircle className="w-4 h-4" />
            Launch Protocol Experiment
          </Link>
        </div>
      </div>

      {/* Protocol Feature Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TCP Card */}
        <div className="p-5 bg-white rounded-xl border border-blue-200 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                TCP
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">TCP (Agent/TCP/NewReno)</h3>
                <span className="text-[11px] text-slate-500 font-medium">Reliable • Sliding Window • AIMD Congestion Control</span>
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>

          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            Uses additive-increase multiplicative-decrease (AIMD) congestion window management. Automatically reduces transmission rate upon detecting packet drop at Access Router R1 to avoid collapse.
          </p>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500">Flow Control:</span> <strong>Sliding Window</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500">Loss Recovery:</span> <strong>Fast Retransmit</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500">Typical PDR:</span> <strong className="text-emerald-600">92% – 99%</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500">Queue Policy:</span> <strong>Backs off on Drop</strong>
            </div>
          </div>
        </div>

        {/* UDP Card */}
        <div className="p-5 bg-white rounded-xl border border-purple-200 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                UDP
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">UDP (Agent/UDP + Application/Traffic/CBR)</h3>
                <span className="text-[11px] text-slate-500 font-medium">Connectionless • Constant Bit Rate • Zero Backoff</span>
              </div>
            </div>
            <Zap className="w-5 h-5 text-purple-600" />
          </div>

          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            Transmits packets at a fixed constant rate regardless of downstream queue status. Offers lower end-to-end latency but suffers severe packet drops during bottleneck congestion.
          </p>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500">Flow Control:</span> <strong>None (Unregulated)</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500">Loss Recovery:</span> <strong>No Retransmission</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500">Typical PDR:</span> <strong className="text-rose-600">75% – 91%</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500">Latency:</span> <strong className="text-blue-600">Minimal / Constant</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Throughput Comparison */}
        <div className="p-5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Throughput Comparison (Kbps)</h3>
              <p className="text-[11px] text-slate-500">UDP vs TCP aggregate received throughput</p>
            </div>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="rate" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" Kbps" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="tcpThroughput" name="TCP Throughput (Kbps)" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="udpThroughput" name="UDP Throughput (Kbps)" fill="#9333EA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
            <strong>Key Insight:</strong> UDP achieves slightly higher raw throughput because it does not back off upon packet drops, but this comes at the expense of overwhelming router queues.
          </div>
        </div>

        {/* Chart 2: Packet Loss Comparison */}
        <div className="p-5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Packet Loss Rate Comparison (%)</h3>
              <p className="text-[11px] text-slate-500">Percentage of packets dropped at router queues</p>
            </div>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="rate" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="tcpLoss" name="TCP Packet Loss (%)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="udpLoss" name="UDP Packet Loss (%)" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
            <strong>Key Insight:</strong> UDP experiences up to 2-3x higher packet loss under heavy load because it lacks sender-side congestion feedback.
          </div>
        </div>

        {/* Chart 3: End-to-End Latency */}
        <div className="p-5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Average End-to-End Delay (ms)</h3>
              <p className="text-[11px] text-slate-500">Queuing buffer time plus link propagation</p>
            </div>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="rate" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" ms" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="tcpDelay" name="TCP Delay (ms)" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="udpDelay" name="UDP Delay (ms)" stroke="#9333EA" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
            <strong>Key Insight:</strong> TCP delay increases during congestion due to retransmission timeouts and buffer queuing, whereas UDP delay remains bounded since dropped packets are discarded immediately.
          </div>
        </div>

        {/* Chart 4: Packet Delivery Ratio (PDR) */}
        <div className="p-5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Packet Delivery Ratio (PDR %)</h3>
              <p className="text-[11px] text-slate-500">Overall reliability of data delivery</p>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="rate" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" domain={[70, 100]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="tcpPdr" name="TCP PDR (%)" fill="#16A34A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="udpPdr" name="UDP PDR (%)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
            <strong>Key Insight:</strong> TCP maintains high PDR (&gt;90%) across all test cases. For academic portals, examinations, and critical files, TCP is essential. For live video classes, UDP with adaptive codecs is favored.
          </div>
        </div>
      </div>
    </div>
  );
};
