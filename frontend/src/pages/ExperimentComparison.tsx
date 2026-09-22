import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  GitCompare,
  CheckCircle2,
  TrendingDown,
  Clock,
  Zap,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Play,
  Layers
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { useDataService } from '../services/dataService';
import { Experiment, ComparisonResponse } from '../types';
import { ModeBadge, useSimulationMode } from '../context/SimulationModeContext';

export const ExperimentComparison: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { mode, isDemo, setMode } = useSimulationMode();
  const dataService = useDataService();

  const [allExperiments, setAllExperiments] = useState<Experiment[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available experiments whenever mode changes
  useEffect(() => {
    setSelectedIds([]);
    setComparison(null);
    setError(null);
    setLoading(true);

    dataService
      .getExperiments({ limit: 50 })
      .then((data) => {
        setAllExperiments(data);

        // Check query params
        const idsParam = searchParams.get('ids');
        const primaryParam = searchParams.get('primary');

        if (idsParam) {
          const parsed = idsParam
            .split(',')
            .map((x) => parseInt(x, 10))
            .filter((x) => !isNaN(x) && data.some((e) => e.id === x));
          if (parsed.length >= 2) {
            setSelectedIds(parsed);
            return;
          }
        }

        if (primaryParam && data.length >= 2) {
          const pId = parseInt(primaryParam, 10);
          const hasP = data.some((e) => e.id === pId);
          if (hasP) {
            const second = data.find((e) => e.id !== pId);
            if (second) {
              setSelectedIds([pId, second.id]);
              return;
            }
          }
        }

        // Default select first two experiments in the active mode
        if (data.length >= 2) {
          setSelectedIds([data[0].id, data[1].id]);
        }
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to load experiments for comparison');
      })
      .finally(() => setLoading(false));
  }, [mode]);

  // Fetch comparison data whenever selectedIds change
  useEffect(() => {
    if (selectedIds.length < 2) {
      setComparison(null);
      return;
    }

    setLoading(true);
    dataService
      .compareExperiments(selectedIds)
      .then((res) => {
        setComparison(res);
        setError(null);
      })
      .catch((err: any) => {
        setError(err.message || 'Comparison failed');
      })
      .finally(() => setLoading(false));
  }, [selectedIds, mode]);

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= 2) {
        alert('You must keep at least two experiments selected for comparison.');
        return;
      }
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      if (selectedIds.length >= 4) {
        alert('Maximum of 4 experiments can be compared simultaneously.');
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Radar chart normalized metrics (0-100 scale)
  const radarMetrics = [
    { subject: 'Throughput (Scaled)', fullMark: 100 },
    { subject: 'Reliability (PDR %)', fullMark: 100 },
    { subject: 'Low Latency Score', fullMark: 100 },
    { subject: 'Queue Stability', fullMark: 100 },
  ];

  const radarData = radarMetrics.map((rm, idx) => {
    const item: any = { subject: rm.subject };
    comparison?.experiments.forEach((exp) => {
      const r = exp.result;
      if (!r) return;
      if (idx === 0) {
        item[exp.exp_code] = Math.min(Math.round((r.throughput_kbps / 1000) * 100), 100);
      } else if (idx === 1) {
        item[exp.exp_code] = Math.round(r.packet_delivery_ratio);
      } else if (idx === 2) {
        item[exp.exp_code] = Math.max(0, Math.round(100 - r.average_delay_ms));
      } else if (idx === 3) {
        item[exp.exp_code] = Math.max(0, Math.round(100 - r.packet_loss_percent));
      }
    });
    return item;
  });

  const radarColors = ['#2563EB', '#F59E0B', '#10B981', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0F172A]">Multi-Experiment Comparison</h2>
                <ModeBadge isDemo={isDemo} />
              </div>
              <p className="text-xs text-[#64748B]">
                {isDemo
                  ? 'Comparing verified laboratory demonstration benchmarks (deterministic sample data)'
                  : 'Comparing live recorded NS-2 discrete-event simulation runs'}
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
                Switch to Demo Mode (9 Predefined Benchmarks)
              </button>
            )}
          </div>
        </div>

        {/* Experiment Selector Pills */}
        {allExperiments.length >= 2 ? (
          <div className="mt-5 pt-5 border-t border-[#F1F5F9]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#64748B]">
                Select Experiments to Compare (2 - 4 runs):
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {selectedIds.length} of {allExperiments.length} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allExperiments.map((exp) => {
                const isSelected = selectedIds.includes(exp.id);
                return (
                  <button
                    key={exp.id}
                    onClick={() => toggleSelect(exp.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-white border-[#CBD5E1] text-[#475569] hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-mono">{exp.exp_code}</span>
                    <span>
                      ({exp.protocol} - {exp.users}u)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : !loading && allExperiments.length < 2 && (
          <div className="mt-5 pt-5 border-t border-[#F1F5F9]">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Insufficient real-time experiments for comparison
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  At least 2 real-time simulations must be recorded in the database. Currently {allExperiments.length} run found.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('demo')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs"
                >
                  Use Demo Mode (Sample Data)
                </button>
                <Link
                  to="/simulate"
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                >
                  Run New Simulation
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs font-medium">Computing comparative metrics...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          {!isDemo && (
            <button
              onClick={() => setMode('demo')}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs transition-colors"
            >
              Use Demo Mode (Sample Data)
            </button>
          )}
        </div>
      )}

      {comparison && !loading && (
        <>
          {/* Comparative Metrics Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A]">Comparative Benchmark Matrix</h3>
              <span className="text-[11px] font-mono text-slate-500">
                Source: {isDemo ? 'PREDEFINED DEMO BENCHMARKS' : 'LIVE NS-2 SIMULATIONS'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-5 py-3">Experiment</th>
                    <th className="px-5 py-3">Mode</th>
                    <th className="px-5 py-3">Protocol</th>
                    <th className="px-5 py-3">Students</th>
                    <th className="px-5 py-3">Throughput</th>
                    <th className="px-5 py-3">Packet Loss</th>
                    <th className="px-5 py-3">PDR</th>
                    <th className="px-5 py-3">Avg Delay</th>
                    <th className="px-5 py-3">Sent / Recv / Drop</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {comparison.metrics_table.map((row) => {
                    const matchedExp = comparison.experiments.find((e) => e.id === row.id);
                    const isDemoRun = matchedExp ? matchedExp.is_demo : false;
                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-semibold text-[#0F172A]">
                          <span className="font-mono text-blue-700 font-bold mr-2">{row.exp_code}</span>
                          {row.name}
                        </td>
                        <td className="px-5 py-3">
                          <ModeBadge isDemo={isDemoRun} />
                        </td>
                        <td className="px-5 py-3 font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              row.protocol === 'TCP'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {row.protocol}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium text-[#475569]">{row.users} nodes</td>
                        <td className="px-5 py-3 font-mono font-bold text-[#0F172A]">
                          {row.throughput_kbps} Kbps
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-rose-600">
                          {row.packet_loss_percent}%
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-emerald-700">
                          {row.pdr_percent}%
                        </td>
                        <td className="px-5 py-3 font-mono text-amber-700 font-semibold">
                          {row.average_delay_ms} ms
                        </td>
                        <td className="px-5 py-3 font-mono text-slate-500 text-[11px]">
                          {row.packets_sent.toLocaleString()} / {row.packets_received.toLocaleString()} /{' '}
                          {row.packets_dropped.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Comparative Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Throughput Comparison */}
            <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
              <h3 className="text-sm font-bold text-[#0F172A] mb-1">Delivered Throughput Comparison</h3>
              <p className="text-xs text-[#64748B] mb-4">
                Throughput (Kbps) measured at LMS server ({isDemo ? 'Demo Model' : 'Live NS-2'})
              </p>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison.comparison_charts.throughput}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Kbps', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8F0',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="throughput" name="Throughput (Kbps)" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Packet Loss Comparison */}
            <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
              <h3 className="text-sm font-bold text-[#0F172A] mb-1">Packet Loss Rate Comparison</h3>
              <p className="text-xs text-[#64748B] mb-4">
                Drop percentage at bottleneck router ({isDemo ? 'Demo Model' : 'Live NS-2'})
              </p>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison.comparison_charts.loss}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Loss %', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8F0',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="loss" name="Packet Loss %" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* End-to-End Delay Comparison */}
            <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
              <h3 className="text-sm font-bold text-[#0F172A] mb-1">End-to-End Latency Comparison</h3>
              <p className="text-xs text-[#64748B] mb-4">
                Average packet transit time in milliseconds ({isDemo ? 'Demo Model' : 'Live NS-2'})
              </p>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison.comparison_charts.delay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      label={{ value: 'ms', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8F0',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="delay" name="Delay (ms)" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Multi-Dimensional Radar Comparison */}
            <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
              <h3 className="text-sm font-bold text-[#0F172A] mb-1">Holistic Performance Radar</h3>
              <p className="text-xs text-[#64748B] mb-4">
                Multi-attribute scoring (Throughput, PDR, Latency, Stability)
              </p>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    {comparison.experiments.map((exp, i) => (
                      <Radar
                        key={exp.id}
                        name={exp.exp_code}
                        dataKey={exp.exp_code}
                        stroke={radarColors[i % radarColors.length]}
                        fill={radarColors[i % radarColors.length]}
                        fillOpacity={0.25}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Analytical Observation Box */}
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Comparative Evaluation & Observations ({isDemo ? 'Demo Mode' : 'Live NS-2'})</span>
            </h4>
            <p className="text-xs text-blue-800 leading-relaxed font-medium">
              {comparison.analysis_summary}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
