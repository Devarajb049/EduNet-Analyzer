import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  Trash2,
  Eye,
  GitCompare,
  Download,
  FileText,
  Plus,
  RefreshCw,
  AlertCircle,
  PlayCircle
} from 'lucide-react';
import { useDataService } from '../services/dataService';
import { Experiment } from '../types';
import { ModeBadge, useSimulationMode } from '../context/SimulationModeContext';

export const ExperimentHistory: React.FC = () => {
  const navigate = useNavigate();
  const { mode, isDemo, setMode } = useSimulationMode();
  const dataService = useDataService();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (protocol, scenario, search)
  const [search, setSearch] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchExperiments = async () => {
    setLoading(true);
    try {
      const data = await dataService.getExperiments({
        protocol: protocolFilter || undefined,
        experiment_type: typeFilter || undefined,
        search: search || undefined,
      });
      setExperiments(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch experiment history');
    } finally {
      setLoading(false);
    }
  };

  // Clear selections and reload when active mode or filters change
  useEffect(() => {
    setSelectedIds([]);
    fetchExperiments();
  }, [mode, protocolFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExperiments();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete Experiment #${id}?`)) return;
    try {
      await dataService.deleteExperiment(id);
      setExperiments((prev) => prev.filter((e) => e.id !== id));
      setSelectedIds((prev) => prev.filter((selId) => selId !== id));
    } catch (err: any) {
      // In demo mode or if server failed
      setExperiments((prev) => prev.filter((e) => e.id !== id));
      setSelectedIds((prev) => prev.filter((selId) => selId !== id));
    }
  };

  const handleToggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } else {
      if (selectedIds.length >= 4) {
        alert('You can select a maximum of 4 experiments for comparison.');
        return;
      }
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleCompareSelected = () => {
    if (selectedIds.length < 2) {
      alert('Please select at least 2 experiments to compare.');
      return;
    }
    navigate(`/compare?ids=${selectedIds.join(',')}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-base font-bold text-[#0F172A]">Experiment Records & History</h2>
            <ModeBadge isDemo={isDemo} />
          </div>
          <p className="text-xs text-[#64748B]">
            {isDemo
              ? 'Displaying predefined laboratory demonstration records (DEMO-001 through DEMO-009)'
              : 'Displaying live discrete-event NS-2 simulation records (EXP-xxx)'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length >= 2 && (
            <button
              onClick={handleCompareSelected}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-all shadow-xs"
            >
              <GitCompare className="w-4 h-4" />
              <span>Compare Selected ({selectedIds.length})</span>
            </button>
          )}

          <Link
            to="/simulate"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-all shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            <span>New Simulation</span>
          </Link>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={isDemo ? 'Search demo experiments (e.g. DEMO-009)...' : 'Search live experiments (e.g. EXP-001)...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#F8FAFC]"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          {/* Active Mode Indicator */}
          <div className="hidden sm:flex items-center">
            {isDemo ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                DEMO DATASET
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE NS-2 DATABASE
              </span>
            )}
          </div>

          {/* Protocol Filter */}
          <select
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-700"
          >
            <option value="">All Protocols</option>
            <option value="TCP">TCP (NewReno)</option>
            <option value="UDP">UDP (CBR)</option>
          </select>

          {/* Scenario Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-700"
          >
            <option value="">All Scenarios</option>
            <option value="Normal Traffic">Normal Traffic</option>
            <option value="High Traffic">High Traffic</option>
            <option value="TCP vs UDP">TCP vs UDP</option>
            <option value="Leaky Bucket">Leaky Bucket</option>
            <option value="Sliding Window">Sliding Window</option>
            <option value="Go-Back-N">Go-Back-N</option>
          </select>

          <button
            onClick={() => fetchExperiments()}
            className="p-1.5 text-slate-500 hover:text-[#0F172A] rounded-lg border border-[#CBD5E1] hover:bg-slate-50 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2">
            {!isDemo && (
              <button
                onClick={() => setMode('demo')}
                className="underline font-semibold text-blue-700 hover:text-blue-900"
              >
                Use Demo Mode (Sample Data)
              </button>
            )}
            <button onClick={fetchExperiments} className="underline font-semibold hover:text-amber-950">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Experiments Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#64748B] font-semibold border-b border-[#E2E8F0]">
              <tr>
                <th className="p-4 w-10 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Experiment</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Protocol</th>
                <th className="px-4 py-3">Traffic</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Throughput</th>
                <th className="px-4 py-3">Packet Loss</th>
                <th className="px-4 py-3">Delay</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading && (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Loading {isDemo ? 'demo' : 'real-time'} experiment records...</span>
                  </td>
                </tr>
              )}

              {!loading && experiments.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-500">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="font-semibold text-slate-700">
                        {isDemo
                          ? 'No demo experiments found matching your filters.'
                          : 'No real-time NS-2 simulations recorded yet.'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {isDemo
                          ? 'Clear your filters to view the predefined laboratory benchmarks.'
                          : 'Run a live NS-2 simulation to generate discrete-event traces, or switch to Demo Mode to view predefined datasets.'}
                      </p>
                      <div className="pt-2 flex items-center justify-center gap-3">
                        {!isDemo && (
                          <button
                            type="button"
                            onClick={() => setMode('demo')}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs"
                          >
                            Use Demo Mode (Sample Data)
                          </button>
                        )}
                        <Link
                          to="/simulate"
                          className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                        >
                          New Simulation
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                experiments.map((exp) => {
                  const isSelected = selectedIds.includes(exp.id);
                  const createdAtDate = new Date(exp.created_at);
                  const formattedDate = !isNaN(createdAtDate.getTime())
                    ? createdAtDate.toLocaleDateString()
                    : 'Predefined';

                  return (
                    <tr
                      key={exp.id}
                      className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(exp.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                        <Link to={`/experiments/${exp.id}`} className="hover:underline">
                          {exp.exp_code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#0F172A] max-w-xs">
                        <div className="truncate font-semibold">{exp.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{exp.data_rate}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ModeBadge isDemo={exp.is_demo} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono">{exp.users} nodes</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                            exp.protocol === 'TCP'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {exp.protocol}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#475569]">{exp.traffic_level}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-[#64748B]">
                        {exp.experiment_type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {exp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-[#0F172A] whitespace-nowrap">
                        {exp.result ? `${exp.result.throughput_kbps} Kbps` : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-rose-600 font-semibold whitespace-nowrap">
                        {exp.result ? `${exp.result.packet_loss_percent}%` : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                        {exp.result ? `${exp.result.average_delay_ms} ms` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {formattedDate}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/experiments/${exp.id}`}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded transition-colors"
                            title="View Details"
                          >
                            View
                          </Link>
                          <Link
                            to={`/compare?primary=${exp.id}`}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-white hover:bg-slate-700 border border-slate-200 rounded transition-colors"
                            title="Compare"
                          >
                            Compare
                          </Link>
                          <a
                            href={dataService.getReportCsvUrl(exp.id)}
                            download
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:text-white hover:bg-emerald-600 border border-emerald-200 rounded transition-colors"
                            title="Export CSV"
                          >
                            Export
                          </a>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Experiment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
