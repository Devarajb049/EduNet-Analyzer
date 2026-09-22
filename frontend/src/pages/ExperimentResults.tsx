import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  TrendingDown,
  Zap,
  Layers,
  ArrowLeft,
  Share2,
  AlertTriangle,
  RefreshCw,
  GitCompare,
  Activity,
  Server,
  Play,
  Pause,
  RotateCcw,
  FileCode,
  Terminal,
  HelpCircle,
  Database
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { experimentService } from '../services/experimentService';
import { api } from '../services/api';
import { Experiment } from '../types';
import { ModeBadge, useSimulationMode } from '../context/SimulationModeContext';

export const ExperimentResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { mode, isDemo, setMode } = useSimulationMode();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExperiment = () => {
    if (!id) return;
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      setIsNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setIsNotFound(false);
    setError(null);

    experimentService
      .getExperimentById(parsedId, mode)
      .then((data) => {
        setExperiment(data);
        setIsNotFound(false);
        setError(null);
      })
      .catch((err: any) => {
        const msg = err.message || '';
        if (msg.includes('does not exist') || msg.includes('not found') || msg.includes('404')) {
          setIsNotFound(true);
        } else {
          setError('Unable to load experiment. Please check that the backend server is running.');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExperiment();
  }, [id, mode]);

  // Loading State (Section 12)
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] gap-4 text-slate-500">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#0F172A]">Loading Experiment #{id}...</p>
          <p className="text-xs text-slate-400 mt-1">Fetching simulation metrics & trace telemetry</p>
        </div>
      </div>
    );
  }

  // Not Found State (Section 14 & NextAdmin style)
  if (isNotFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[520px] px-4 text-center">
        {/* Modern NextAdmin-style Error Illustration */}
        <div className="w-24 h-24 mb-6 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-xs">
          <svg className="w-12 h-12 text-slate-400" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="10" width="32" height="28" rx="4" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 4" />
            <circle cx="20" cy="22" r="2.5" fill="currentColor" />
            <circle cx="28" cy="22" r="2.5" fill="currentColor" />
            <path d="M19 31c1.5-2 3.5-3 5-3s3.5 1 5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Experiment Not Found</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          Experiment #{id} does not exist in the active database or predefined dataset.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Link
            to="/experiments"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Experiments</span>
          </Link>
          {!isDemo && (
            <button
              onClick={() => setMode('demo')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all"
            >
              View in Demo Mode
            </button>
          )}
          <Link
            to="/"
            className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Error State (Section 13)
  if (error || !experiment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] px-4 text-center">
        <div className="w-16 h-16 mb-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h2 className="text-lg font-bold text-[#0F172A]">Unable to load experiment.</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md">
          {error || 'Please check that the backend server is running.'}
        </p>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={loadExperiment}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
          <Link
            to="/experiments"
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all"
          >
            Back to Experiments
          </Link>
        </div>
      </div>
    );
  }

  const res = experiment.result;
  const timeSeries = res?.time_series || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/experiments"
          className="flex items-center gap-2 text-xs font-semibold text-[#475569] hover:text-[#0F172A]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Experiments</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to={`/compare?primary=${experiment.id}`}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50 shadow-xs"
          >
            <GitCompare className="w-3.5 h-3.5 text-blue-600" />
            <span>Compare Run</span>
          </Link>
          <a
            href={api.getReportCsvUrl(experiment.id)}
            download
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Mode Callout Banner */}
      {experiment.is_demo ? (
        <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between text-blue-900 text-xs">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-blue-600 text-white font-mono font-bold rounded text-[10px] tracking-wide uppercase">
              DEMO MODE
            </span>
            <span>
              <strong>Sample Data Notice:</strong> These results are predefined demonstration data and were not generated by a live NS-2 simulation.
            </span>
          </div>
          <span className="font-mono text-[11px] text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded hidden sm:inline">
            Offline Verified Dataset
          </span>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900 text-xs">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-emerald-600 text-white font-mono font-bold rounded text-[10px] tracking-wide uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              LIVE NS-2
            </span>
            <span>
              <strong>Discrete-Event NS-2 Simulation:</strong> Executed live through the NS-2 binary and parsed from trace records.
            </span>
          </div>
          <span className="font-mono text-[11px] text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded hidden sm:inline">
            {experiment.trace_file ? 'Trace Verified' : 'Live Engine'}
          </span>
        </div>
      )}

      {/* Experiment Header Banner (Section 8) */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {experiment.exp_code}
              </span>
              <ModeBadge isDemo={experiment.is_demo} />
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {experiment.status}
              </span>
            </div>

            <h1 className="text-xl font-bold text-[#0F172A] mt-2">{experiment.name}</h1>
            <p className="text-xs text-[#64748B] mt-1 max-w-3xl">
              {experiment.description || 'University laboratory experiment evaluation.'}
            </p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1 font-mono text-[#475569] min-w-[200px]">
            <div><strong>Experiment ID:</strong> #{experiment.id}</div>
            <div><strong>Protocol:</strong> {experiment.protocol}</div>
            <div><strong>Students:</strong> {experiment.users} Nodes</div>
            <div><strong>Traffic Level:</strong> {experiment.traffic_level}</div>
            <div><strong>Data Rate:</strong> {experiment.data_rate}</div>
            <div><strong>Duration:</strong> {experiment.simulation_time}s</div>
            <div><strong>Type:</strong> {experiment.experiment_type}</div>
            <div className="text-[10px] text-slate-400 pt-1">
              <strong>Created:</strong> {new Date(experiment.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics Cards (Section 8) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Throughput */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] uppercase">Throughput</span>
            <Zap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#0F172A]">{res?.throughput_kbps ?? 0}</span>
            <span className="text-xs font-semibold text-emerald-600">Kbps</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">LMS Server delivery rate</p>
        </div>

        {/* Packet Loss */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] uppercase">Packet Loss</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-rose-600">{res?.packet_loss_percent ?? 0}</span>
            <span className="text-xs font-semibold text-rose-600">%</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Bottleneck drops</p>
        </div>

        {/* Packet Delivery Ratio */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] uppercase">Packet Delivery Ratio</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#0F172A]">{res?.packet_delivery_ratio ?? 0}</span>
            <span className="text-xs font-semibold text-blue-600">%</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Reliability index</p>
        </div>

        {/* Average Delay */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] uppercase">Average Delay</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#0F172A]">{res?.average_delay_ms ?? 0}</span>
            <span className="text-xs font-semibold text-amber-600">ms</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">End-to-end latency</p>
        </div>
      </div>

      {/* Packet Accounting Breakdown */}
      <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
        <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
          Packet Accounting & Flow Verification
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[11px] font-medium text-slate-500">Packets Sent</span>
            <div className="text-lg font-bold font-mono text-[#0F172A] mt-1">
              {res?.packets_sent?.toLocaleString() ?? 0}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <span className="text-[11px] font-medium text-emerald-700">Packets Received</span>
            <div className="text-lg font-bold font-mono text-emerald-800 mt-1">
              {res?.packets_received?.toLocaleString() ?? 0}
            </div>
          </div>
          <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
            <span className="text-[11px] font-medium text-rose-700">Packets Dropped</span>
            <div className="text-lg font-bold font-mono text-rose-800 mt-1">
              {res?.packets_dropped?.toLocaleString() ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Charts (Section 8: only display charts when valid result data exists) */}
      {timeSeries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Throughput Over Time */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Throughput Dynamics Over Time
                </h3>
                <p className="text-[11px] text-[#64748B]">Second-by-second throughput (Kbps)</p>
              </div>
              <span className="font-mono text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                Avg: {res?.throughput_kbps} Kbps
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries}>
                  <defs>
                    <linearGradient id="tpGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="time" label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} textAnchor="end" fontSize={11} stroke="#94A3B8" />
                  <YAxis fontSize={11} stroke="#94A3B8" />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="throughput_kbps" name="Throughput (Kbps)" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#tpGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Delay Over Time */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  End-to-End Latency Profile
                </h3>
                <p className="text-[11px] text-[#64748B]">Queueing & transmission delay (ms)</p>
              </div>
              <span className="font-mono text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                Avg: {res?.average_delay_ms} ms
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="time" label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} fontSize={11} stroke="#94A3B8" />
                  <YAxis fontSize={11} stroke="#94A3B8" />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '8px', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="delay_ms" name="Delay (ms)" stroke="#F59E0B" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Real-time NS-2 Trace Section (Section 16) */}
      {!experiment.is_demo && (
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              NS-2 Discrete-Event Trace Verification
            </h3>
          </div>
          <p className="text-xs text-[#64748B]">
            This experiment was executed natively using the discrete-event network simulator engine.
          </p>
          <div className="p-3 bg-slate-900 text-slate-200 font-mono text-xs rounded-lg space-y-1">
            <div className="text-emerald-400">
              [TRACE FILE] {experiment.trace_file || `simulation/traces/experiment_${experiment.id}.tr`}
            </div>
            <div className="text-slate-400">
              [EVENTS RECORDED] Sent: {res?.packets_sent} | Received: {res?.packets_received} | Dropped: {res?.packets_dropped}
            </div>
            <div className="text-slate-400">
              [PIPELINE STATUS] Trace parsed successfully into SQLite telemetry database.
            </div>
          </div>
        </div>
      )}

      {/* Summary Notes */}
      {res?.summary_notes && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#475569] leading-relaxed">
          <span className="font-bold text-[#0F172A]">Analytical Summary: </span>
          {res.summary_notes}
        </div>
      )}
    </div>
  );
};
