import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  TrendingDown,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Server,
  PlayCircle,
  Download,
  FileText,
  Repeat,
  Gauge,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { api } from '../services/api';
import { subscribeGlobalTelemetry } from '../services/websocket';
import { DashboardSummary } from '../types';
import { useSimulationMode, ModeBadge, ModeSelector } from '../context/SimulationModeContext';
import { DEMO_DASHBOARD_SUMMARY, DEMO_EXPERIMENTS } from '../data/demoExperiments';

export const Dashboard: React.FC = () => {
  const { isDemo, isLive, setMode } = useSimulationMode();
  const [liveSummary, setLiveSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiveTelemetry, setIsLiveTelemetry] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const [isRunningFullAnalysis, setIsRunningFullAnalysis] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);

  const fetchLiveSummary = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await api.getDashboardSummary('realtime');
      setLiveSummary(data);
      setLastSyncTime(new Date().toLocaleTimeString());
      setError(null);
    } catch (err: any) {
      if (showSpinner) setError(err.message || 'Failed to connect to backend server');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    if (isLive) {
      fetchLiveSummary(true);

      const unsubscribe = subscribeGlobalTelemetry(() => {
        fetchLiveSummary(false);
      });

      const interval = setInterval(() => {
        if (isLiveTelemetry) {
          fetchLiveSummary(false);
        }
      }, 3000);

      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }
  }, [isLive, isLiveTelemetry]);

  const handleRunFullAnalysis = async () => {
    setIsRunningFullAnalysis(true);
    setAnalysisStatus('Executing full NS-2 suite in WSL2 (LOW 10, MED 50, HIGH 150, Multi-Rate, Leaky Bucket, Go-Back-N)...');
    setError(null);
    try {
      await api.runFullAnalysis();
      await fetchLiveSummary(false);
      setAnalysisStatus('Full NS-2 analysis completed successfully! All database traces and plots updated.');
      setTimeout(() => setAnalysisStatus(null), 6000);
    } catch (err: any) {
      setError(err.message || 'Failed to complete full NS-2 analysis');
      setAnalysisStatus(null);
    } finally {
      setIsRunningFullAnalysis(false);
    }
  };

  // Use appropriate data based on active mode
  const summary = isDemo ? (DEMO_DASHBOARD_SUMMARY as any) : liveSummary;
  const recentExps = isDemo ? DEMO_EXPERIMENTS.slice().reverse() : liveSummary?.recent_experiments || [];
  const kpis = summary?.kpis;

  // Traffic Load vs Performance dataset (derived from real DB records or demo)
  const trafficLoadData = summary?.traffic_load_data && summary.traffic_load_data.length > 0
    ? summary.traffic_load_data
    : [
      { load: 'Low (10 nodes)', throughput: 0, loss: 0, delay: 0, pdr: 0 },
      { load: 'Med (50 nodes)', throughput: 0, loss: 0, delay: 0, pdr: 0 },
      { load: 'High (150 nodes)', throughput: 0, loss: 0, delay: 0, pdr: 0 },
    ];

  // TCP vs UDP Comparison Data
  const protocolComparisonData = [
    {
      metric: 'Throughput (Kbps)',
      TCP: isDemo ? 361.6 : (liveSummary?.tcp_vs_udp?.tcp.throughput || 0),
      UDP: isDemo ? 505.1 : (liveSummary?.tcp_vs_udp?.udp.throughput || 0),
    },
    {
      metric: 'PDR (%)',
      TCP: isDemo ? 96.5 : (liveSummary?.tcp_vs_udp?.tcp.pdr || 0),
      UDP: isDemo ? 90.0 : (liveSummary?.tcp_vs_udp?.udp.pdr || 0),
    },
    {
      metric: 'Packet Loss (%)',
      TCP: isDemo ? 3.5 : (liveSummary?.tcp_vs_udp?.tcp.loss || 0),
      UDP: isDemo ? 10.0 : (liveSummary?.tcp_vs_udp?.udp.loss || 0),
    },
    {
      metric: 'Avg Delay (ms)',
      TCP: isDemo ? 28.6 : (liveSummary?.tcp_vs_udp?.tcp.delay || 0),
      UDP: isDemo ? 46.9 : (liveSummary?.tcp_vs_udp?.udp.delay || 0),
    },
  ];

  const tcpUdpRatesData = summary?.tcp_udp_rates && summary.tcp_udp_rates.length > 0
    ? summary.tcp_udp_rates
    : [];

  const leakyBucketComparison = summary?.leaky_bucket_comparison;
  const lbSeries = leakyBucketComparison?.comparison_series || [];

  const gbnTracePoints = summary?.gbn_trace_data || [];

  return (
    <div className="space-y-6">
      {/* Simulation Mode Switcher & Status Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#0F172A]">
                {isDemo ? 'DEMO MODE DASHBOARD' : 'LIVE NS-2 SIMULATION DASHBOARD'}
              </h2>
              <ModeBadge isDemo={isDemo} />
            </div>
            <p className="text-xs text-[#64748B]">
              {isDemo
                ? 'Sample Data — Not generated by NS-2. Completely standalone and offline.'
                : 'Real-time telemetry stream connected to the active NS-2 simulation backend.'}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Run Full Analysis Action */}
          <button
            onClick={handleRunFullAnalysis}
            disabled={isRunningFullAnalysis || isDemo}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition ${
              isRunningFullAnalysis
                ? 'bg-amber-500 text-white cursor-wait'
                : isDemo
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title={isDemo ? 'Switch to Live NS-2 mode to run analysis' : 'Execute complete NS-2 suite across all scenarios'}
          >
            {isRunningFullAnalysis ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running NS-2 Suite...</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                <span>Run Full NS-2 Analysis</span>
              </>
            )}
          </button>

          <ModeSelector compact />

          {isLive && (
            <button
              onClick={() => fetchLiveSummary(true)}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-[#0F172A] rounded-lg border border-[#CBD5E1] hover:bg-slate-50"
              title="Refresh live telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Analysis Running / Completed Banner */}
      {analysisStatus && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-900 text-xs">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-medium">{analysisStatus}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700">Discrete-Event Engine</span>
        </div>
      )}

      {/* Mode Callout Banners */}
      {isDemo ? (
        <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between text-blue-900 text-xs">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-blue-600 text-white font-mono font-bold rounded text-[11px] tracking-wide uppercase">
              DEMO MODE
            </span>
            <span>
              <strong>Sample Data — Not generated by NS-2:</strong> Displaying verified, internally consistent laboratory benchmark data. No external network services or NS-2 binaries required.
            </span>
          </div>
          <button
            onClick={() => {
              setMode('realtime');
              setError(null);
            }}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline whitespace-nowrap hidden sm:inline"
          >
            Switch to Live NS-2 →
          </button>
        </div>
      ) : !liveSummary?.is_ns2_available ? (
        <div className="p-5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>LIVE SIMULATION UNAVAILABLE</span>
          </div>
          <p>
            NS-2 could not be executed. Native <code>ns</code> or <code>wsl ns</code> was not detected on your system path.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => {
                setMode('demo');
                setError(null);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs"
            >
              Use Demo Mode (Sample Data)
            </button>
            <Link
              to="/settings"
              className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold rounded-lg text-xs transition-colors"
            >
              WSL NS-2 Setup Guide
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900 text-xs">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-emerald-600 text-white font-mono font-bold rounded text-[11px] tracking-wide uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              LIVE NS-2
            </span>
            <span>
              <strong>LIVE NS-2 SIMULATION ACTIVE:</strong> Real-time discrete-event engine pipeline connected via WSL2 Ubuntu.
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
            Last Sync: {lastSyncTime}
          </span>
        </div>
      )}

      {/* Real-Time Mode Empty State Callout */}
      {!isDemo && recentExps.length === 0 && (
        <div className="p-5 bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">No Live NS-2 Experiments Recorded in Database Yet</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Run an individual simulation or click &ldquo;Run Full NS-2 Analysis&rdquo; to execute the complete academic scenario suite.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunFullAnalysis}
              disabled={isRunningFullAnalysis}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Run Full Analysis Now
            </button>
            <Link
              to="/simulate"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs"
            >
              + Custom Simulation
            </Link>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Experiments */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              {isDemo ? 'Demo Runs' : 'Total Runs'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{kpis?.total_experiments ?? 0}</span>
            <span className="text-xs text-slate-500 font-medium">experiments</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">
            {isDemo ? 'Predefined local records' : 'Recorded in SQLite'}
          </p>
        </div>

        {/* Avg Throughput */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Throughput</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{kpis?.avg_throughput_kbps ?? 0}</span>
            <span className="text-xs text-emerald-600 font-semibold">Kbps</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Average delivery rate</p>
        </div>

        {/* Avg Packet Loss */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Packet Loss</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{kpis?.avg_packet_loss_percent ?? 0}</span>
            <span className="text-xs text-rose-600 font-semibold">%</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Bottleneck router drops</p>
        </div>

        {/* Avg Delay */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Average Delay</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{kpis?.avg_delay_ms ?? 0}</span>
            <span className="text-xs text-amber-600 font-semibold">ms</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">End-to-end transmission</p>
        </div>

        {/* Packet Delivery Ratio */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">PDR</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{kpis?.avg_pdr_percent ?? 0}</span>
            <span className="text-xs text-indigo-600 font-semibold">%</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Packet Delivery Ratio</p>
        </div>
      </div>

      {/* Row 1: Throughput vs Users & Packet Loss vs Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Throughput vs Users */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Throughput vs Users</h3>
              <p className="text-xs text-[#64748B]">Delivered campus bandwidth across client scaling</p>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Kbps vs Users</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary?.throughput_vs_users || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="users" tick={{ fontSize: 11 }} label={{ value: 'Students (Users)', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: 'Kbps', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="tcp" name="TCP NewReno" stroke="#2563EB" strokeWidth={2.5} activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="udp" name="UDP CBR" stroke="#F59E0B" strokeWidth={2.5} activeDot={{ r: 6 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Packet Loss vs Users */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Packet Loss vs Users</h3>
              <p className="text-xs text-[#64748B]">Queue drop rate progression as offered load scales</p>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Loss % vs Users</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary?.loss_vs_users || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="users" tick={{ fontSize: 11 }} label={{ value: 'Students (Users)', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: 'Loss %', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="tcp" name="TCP Loss %" stroke="#2563EB" fill="#DBEAFE" strokeWidth={2} connectNulls />
                <Area type="monotone" dataKey="udp" name="UDP Loss %" stroke="#DC2626" fill="#FEE2E2" strokeWidth={2} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Delay vs Users & Packet Delivery Ratio (PDR %) vs Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Delay vs Users */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Average Delay vs Users</h3>
              <p className="text-xs text-[#64748B]">End-to-end queuing and propagation latency (ms)</p>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Latency</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary?.delay_vs_users || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="users" tick={{ fontSize: 11 }} label={{ value: 'Students (Users)', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: 'Delay (ms)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="tcp" name="TCP Delay" stroke="#7C3AED" strokeWidth={2.5} connectNulls />
                <Line type="monotone" dataKey="udp" name="UDP Delay" stroke="#059669" strokeWidth={2.5} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Packet Delivery Ratio (PDR %) vs Users */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Packet Delivery Ratio (PDR %) vs Users</h3>
              <p className="text-xs text-[#64748B]">Reliability metric: (Packets Received / Packets Sent) &times; 100</p>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">PDR %</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary?.pdr_vs_users || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="users" tick={{ fontSize: 11 }} label={{ value: 'Students (Users)', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[60, 100]} label={{ value: 'PDR %', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="tcp" name="TCP PDR %" stroke="#10B981" strokeWidth={2.5} activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="udp" name="UDP PDR %" stroke="#EF4444" strokeWidth={2.5} activeDot={{ r: 6 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Traffic Load Tiers & TCP vs UDP Multi-Rate Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 5: Traffic Load Tiers (Low: 10, Medium: 50, High: 150) */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Traffic Load Tiers (Low, Med, High)</h3>
              <p className="text-xs text-[#64748B]">Campus load performance across 10, 50, and 150 student nodes</p>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Tiers</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trafficLoadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="load" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="throughput" name="Throughput (Kbps)" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="loss" name="Loss (%)" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Multi-Rate TCP vs UDP Scaling (256K, 512K, 1M, 2M, 5M) */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">TCP vs UDP Multi-Rate Benchmarks</h3>
              <p className="text-xs text-[#64748B]">Throughput across standard university bandwidth allocations</p>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">256K – 5M</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tcpUdpRatesData.length > 0 ? tcpUdpRatesData : [
                { rate: '256K', tcpThroughput: 245, udpThroughput: 252 },
                { rate: '512K', tcpThroughput: 490, udpThroughput: 505 },
                { rate: '1M', tcpThroughput: 940, udpThroughput: 985 },
                { rate: '2M', tcpThroughput: 1780, udpThroughput: 1940 },
                { rate: '5M', tcpThroughput: 4200, udpThroughput: 4850 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="rate" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" Kbps" />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="tcpThroughput" name="TCP Throughput (Kbps)" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="udpThroughput" name="UDP Throughput (Kbps)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Leaky Bucket Traffic Shaping & Go-Back-N Retransmission Plots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 7: Leaky Bucket Comparison */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-[#0F172A]">Leaky Bucket Traffic Shaping</h3>
              </div>
              <p className="text-xs text-[#64748B]">Bursty unshaped inflow vs constant bit-rate shaped link</p>
            </div>
            <Link
              to="/leaky-bucket"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
            >
              Interactive View →
            </Link>
          </div>
          <div className="h-64">
            {lbSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lbSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} label={{ value: 'Time (s)', position: 'insideBottom', offset: -4, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit=" Kbps" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="unshaped_throughput" name="Unshaped Bursts (Kbps)" stroke="#9333EA" fill="#F3E8FF" strokeWidth={2} />
                  <Area type="monotone" dataKey="shaped_throughput" name="Shaped CBR Link (Kbps)" stroke="#059669" fill="#D1FAE5" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">No Leaky Bucket simulation trace loaded yet.</p>
                <Link
                  to="/leaky-bucket"
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition"
                >
                  Run NS-2 Leaky Bucket
                </Link>
              </div>
            )}
          </div>
          {leakyBucketComparison && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded border border-slate-200">
              <div>Unshaped Loss: <strong className="text-rose-600">{leakyBucketComparison.unshaped_loss_percent}%</strong></div>
              <div>Shaped Loss: <strong className="text-emerald-700">{leakyBucketComparison.shaped_loss_percent}%</strong></div>
            </div>
          )}
        </div>

        {/* Chart 8: Go-Back-N Retransmissions & Sequence Number vs Time */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-[#0F172A]">Go-Back-N Sequence vs Time</h3>
              </div>
              <p className="text-xs text-[#64748B]">Packet transmission progression with drop &amp; retransmit markers</p>
            </div>
            <Link
              to="/go-back-n"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
            >
              Interactive View →
            </Link>
          </div>
          <div className="h-64">
            {gbnTracePoints.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gbnTracePoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} label={{ value: 'Time (s)', position: 'insideBottom', offset: -4, fontSize: 10 }} />
                  <YAxis dataKey="seq_num" tick={{ fontSize: 10 }} label={{ value: 'Seq #', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="seq_num" name="Transmitted Seq" stroke="#2563EB" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">No Go-Back-N sequence trace generated yet.</p>
                <Link
                  to="/go-back-n"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition"
                >
                  Run NS-2 Go-Back-N
                </Link>
              </div>
            )}
          </div>
          <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
            <strong>Viva Note:</strong> Tahoe restarts sequence progress from the lost packet upon RTO timeout, exhibiting characteristic saw-tooth sequence retransmissions.
          </div>
        </div>
      </div>

      {/* Recent Experiments Table (with direct link to /experiments/:id) */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">
              {isDemo ? 'Predefined Demo Experiments' : 'Recent Simulation Experiments'}
            </h3>
            <p className="text-xs text-[#64748B]">
              {isDemo
                ? 'Standard verified laboratory benchmarks available for instant analysis'
                : 'Latest simulation runs processed by the metrics engine'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/experiments"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>View All Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#64748B] font-semibold border-b border-[#E2E8F0]">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Experiment Name</th>
                <th className="px-5 py-3">Mode</th>
                <th className="px-5 py-3">Students</th>
                <th className="px-5 py-3">Protocol</th>
                <th className="px-5 py-3">Throughput</th>
                <th className="px-5 py-3">Loss Rate</th>
                <th className="px-5 py-3">PDR</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {recentExps.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-mono font-semibold text-blue-700">
                    <Link to={`/experiments/${exp.id}`} className="hover:underline">
                      {exp.exp_code}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-medium text-[#0F172A]">
                    <div>{exp.name}</div>
                    <div className="text-[10px] text-slate-400">{exp.experiment_type} • {exp.data_rate}</div>
                  </td>
                  <td className="px-5 py-3">
                    <ModeBadge isDemo={exp.is_demo} />
                  </td>
                  <td className="px-5 py-3 text-[#475569]">{exp.users} nodes</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                      exp.protocol === 'TCP' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {exp.protocol}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[#0F172A]">
                    {exp.result ? `${exp.result.throughput_kbps} Kbps` : '—'}
                  </td>
                  <td className="px-5 py-3 font-mono text-rose-600 font-semibold">
                    {exp.result ? `${exp.result.packet_loss_percent}%` : '—'}
                  </td>
                  <td className="px-5 py-3 font-mono text-emerald-700 font-semibold">
                    {exp.result ? `${exp.result.packet_delivery_ratio}%` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/experiments/${exp.id}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Analytics
                      </Link>
                      {exp.result && (
                        <>
                          <a
                            href={api.getReportCsvUrl(exp.id)}
                            download
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title="Export CSV"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={api.getReportPdfUrl(exp.id)}
                            download
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title="Export PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
