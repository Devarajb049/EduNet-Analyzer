import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Sliders, Info, Network, AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import { useDataService } from '../services/dataService';
import { SimulationConfig } from '../types';
import { useSimulationMode, ModeBadge, ModeSelector } from '../context/SimulationModeContext';

export const NewSimulation: React.FC = () => {
  const navigate = useNavigate();
  const { mode, isDemo, setMode } = useSimulationMode();
  const dataService = useDataService();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: boolean }>({});

  const [formData, setFormData] = useState<SimulationConfig>({
    name: isDemo ? 'Demo Scenario: 25 Students (TCP)' : 'Live NS-2 Simulation: Campus Workload',
    description: isDemo
      ? 'Predefined demonstration workload evaluating e-learning stream reliability.'
      : 'Live discrete-event NS-2 simulation modeling campus LMS traffic.',
    users: 25,
    traffic_level: 'Medium',
    protocol: 'TCP',
    data_rate: '1 Mbps',
    simulation_time: 60,
    experiment_type: 'Normal Traffic',
    packet_size: 1024,
    window_size: 32,
    force_demo: isDemo,
  });

  const handleDemoPreset = (users: number) => {
    let traffic: 'Low' | 'Medium' | 'High' = 'Medium';
    if (users <= 10) traffic = 'Low';
    else if (users >= 100) traffic = 'High';

    setFormData({
      ...formData,
      users,
      traffic_level: traffic,
      name: `Demo Scenario: ${users} Students (${formData.protocol})`,
      description: `Predefined ${users}-student laboratory simulation benchmark over ${formData.protocol}.`,
    });
  };

  const handleTrafficPreset = (level: 'Low' | 'Medium' | 'High' | 'Custom') => {
    let rate = formData.data_rate;
    if (level === 'Low') {
      rate = '512 Kbps';
    } else if (level === 'Medium') {
      rate = '1 Mbps';
    } else if (level === 'High') {
      rate = '2 Mbps';
    }
    setFormData({
      ...formData,
      traffic_level: level,
      data_rate: rate,
    });
  };

  const validateConfig = (): boolean => {
    const errs: { [key: string]: boolean } = {};

    // 1. Number of students > 0
    if (!formData.users || formData.users <= 0) {
      errs.users = true;
    }

    // 2. Data rate is valid
    if (!formData.data_rate || !formData.data_rate.trim()) {
      errs.data_rate = true;
    }

    // 3. Duration > 0
    if (!formData.simulation_time || formData.simulation_time <= 0) {
      errs.simulation_time = true;
    }

    // 4. Packet size is valid
    if (!formData.packet_size || formData.packet_size <= 0 || formData.packet_size > 65535) {
      errs.packet_size = true;
    }

    // 5. Protocol is supported
    if (!['TCP', 'UDP'].includes(formData.protocol)) {
      errs.protocol = true;
    }

    // 6. Experiment type is supported
    const supportedTypes = [
      'Normal Traffic',
      'High Traffic',
      'TCP vs UDP',
      'Leaky Bucket',
      'Sliding Window',
      'Go-Back-N',
    ];
    if (!supportedTypes.includes(formData.experiment_type)) {
      errs.experiment_type = true;
    }

    // Name check
    if (!formData.name.trim()) {
      errs.name = true;
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateConfig()) {
      setError('❌ Invalid Simulation Configuration\n\nPlease correct the highlighted fields.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: SimulationConfig = {
        ...formData,
        force_demo: isDemo,
      };

      const response = await dataService.runSimulation(payload);

      if (isDemo) {
        // In demo mode: instant results
        navigate(`/experiments/${response.id}`);
      } else {
        // In real-time mode: navigate to simulation monitor
        navigate(`/monitor?id=${response.id}`);
      }
    } catch (err: any) {
      if (!isDemo) {
        setError(
          '❌ LIVE NS-2 SIMULATION UNAVAILABLE: Actual NS-2 execution could not complete. Check your NS-2 installation in Settings or switch to Demo Mode.'
        );
      } else {
        setError(err.message || 'Failed to start demo simulation.');
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0F172A]">
                  {isDemo ? 'Demo Scenario Quick Runner' : 'Configure Real-Time NS-2 Simulation'}
                </h2>
                <ModeBadge isDemo={isDemo} />
              </div>
              <p className="text-xs text-[#64748B]">
                {isDemo
                  ? 'Instantly select and execute a verified demonstration scenario (zero NS-2 dependency)'
                  : 'Configure discrete-event simulation: Generates dynamic Tcl, runs NS-2, and parses actual trace (.tr)'}
              </p>
            </div>
          </div>
          <ModeSelector compact />
        </div>
      </div>

      {/* Demo Mode Scenario Selector */}
      {isDemo && (
        <div className="p-5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-600" />
              Predefined Demo Scenarios
            </span>
            <span className="text-[11px] font-mono text-blue-700">Instant Execution</span>
          </div>
          <p className="text-xs text-blue-800">
            Select a predefined concurrency level to load calibrated laboratory metrics without running NS-2:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {[10, 25, 50, 100, 200].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => handleDemoPreset(count)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  formData.users === count
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-white border border-blue-200 text-blue-800 hover:bg-blue-100'
                }`}
              >
                {count} Users
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Validation / Execution Notice */}
      {error && (
        <div className="p-5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs space-y-2 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-rose-950 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>Simulation Configuration Notice</span>
          </div>
          <p className="font-semibold whitespace-pre-line">{error}</p>
          {!isDemo && (
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
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
                className="px-3.5 py-2 bg-white border border-rose-300 hover:bg-rose-100 text-rose-900 font-semibold rounded-lg text-xs transition-colors"
              >
                Check NS-2 Setup Guide
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-[#0F172A] border-b border-[#F1F5F9] pb-3">
            Simulation Parameters
          </h3>

          {/* Name & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Experiment Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (validationErrors.name) setValidationErrors({ ...validationErrors, name: false });
                }}
                className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#F8FAFC] ${
                  validationErrors.name ? 'border-rose-500 ring-2 ring-rose-200' : 'border-[#CBD5E1]'
                }`}
                placeholder="e.g. 50-Node Peak Lecture Simulation"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#F8FAFC]"
                placeholder="Evaluation objectives and link attributes"
              />
            </div>
          </div>

          {/* Network Load Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Student Clients */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Number of Students (Nodes) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={250}
                value={formData.users}
                onChange={(e) => {
                  setFormData({ ...formData, users: parseInt(e.target.value, 10) || 0 });
                  if (validationErrors.users) setValidationErrors({ ...validationErrors, users: false });
                }}
                className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono ${
                  validationErrors.users ? 'border-rose-500 ring-2 ring-rose-200' : 'border-[#CBD5E1]'
                }`}
              />
              <p className="text-[11px] text-slate-400 mt-1">Concurrently active student nodes</p>
            </div>

            {/* Transport Protocol */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Protocol <span className="text-rose-500">*</span></label>
              <select
                value={formData.protocol}
                onChange={(e) => setFormData({ ...formData, protocol: e.target.value as 'TCP' | 'UDP' })}
                className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold ${
                  validationErrors.protocol ? 'border-rose-500 ring-2 ring-rose-200' : 'border-[#CBD5E1]'
                }`}
              >
                <option value="TCP">TCP (NewReno with Congestion Control)</option>
                <option value="UDP">UDP (CBR Constant Bit Rate Stream)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                {formData.protocol === 'TCP' ? 'Reliable sliding window stream' : 'Uncontrolled loss-tolerant stream'}
              </p>
            </div>

            {/* Bottleneck Data Rate */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Data Rate <span className="text-rose-500">*</span></label>
              <select
                value={formData.data_rate}
                onChange={(e) => {
                  setFormData({ ...formData, data_rate: e.target.value });
                  if (validationErrors.data_rate) setValidationErrors({ ...validationErrors, data_rate: false });
                }}
                className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono ${
                  validationErrors.data_rate ? 'border-rose-500 ring-2 ring-rose-200' : 'border-[#CBD5E1]'
                }`}
              >
                <option value="256 Kbps">256 Kbps (Severe Bottleneck)</option>
                <option value="512 Kbps">512 Kbps (Constrained Campus)</option>
                <option value="1 Mbps">1 Mbps (Standard Campus)</option>
                <option value="2 Mbps">2 Mbps (High Speed)</option>
                <option value="5 Mbps">5 Mbps (High Concurrency)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Bandwidth between R1 and R2</p>
            </div>
          </div>

          {/* Traffic Level & Experiment Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Traffic Level</label>
              <select
                value={formData.traffic_level}
                onChange={(e) => handleTrafficPreset(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
              >
                <option value="Low">Low (Light student browsing)</option>
                <option value="Medium">Medium (Moderate classroom stream)</option>
                <option value="High">High (Campus-wide lecture peak)</option>
                <option value="Custom">Custom (Configured link limit)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Experiment Type <span className="text-rose-500">*</span></label>
              <select
                value={formData.experiment_type}
                onChange={(e) => setFormData({ ...formData, experiment_type: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                  validationErrors.experiment_type ? 'border-rose-500 ring-2 ring-rose-200' : 'border-[#CBD5E1]'
                }`}
              >
                <option value="Normal Traffic">Normal Traffic (Standard E-Learning)</option>
                <option value="High Traffic">High Traffic (Peak Lecture Load)</option>
                <option value="TCP vs UDP">TCP vs UDP Protocol Benchmark</option>
                <option value="Leaky Bucket">Leaky Bucket / RED Congestion Control</option>
                <option value="Sliding Window">Sliding Window Reliability Analysis</option>
                <option value="Go-Back-N">Go-Back-N Retransmission</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Simulation Duration <span className="text-rose-500">*</span></label>
              <select
                value={formData.simulation_time}
                onChange={(e) => setFormData({ ...formData, simulation_time: parseFloat(e.target.value) })}
                className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                  validationErrors.simulation_time ? 'border-rose-500 ring-2 ring-rose-200' : 'border-[#CBD5E1]'
                }`}
              >
                <option value={10}>10 Seconds (Rapid test)</option>
                <option value={30}>30 Seconds (Fast check)</option>
                <option value={60}>60 Seconds (Standard Lab)</option>
                <option value={90}>90 Seconds (Steady State)</option>
              </select>
            </div>
          </div>

          {/* Packet Size & Window Size Tuning */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Packet Size (Bytes) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={64}
                max={9000}
                value={formData.packet_size || 1024}
                onChange={(e) => {
                  setFormData({ ...formData, packet_size: parseInt(e.target.value, 10) || 0 });
                  if (validationErrors.packet_size) setValidationErrors({ ...validationErrors, packet_size: false });
                }}
                className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono ${
                  validationErrors.packet_size ? 'border-rose-500 ring-2 ring-rose-200' : 'border-[#CBD5E1]'
                }`}
                placeholder="1024"
              />
              <p className="text-[11px] text-slate-400 mt-1">Payload MTU size per packet</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                TCP Window Size (Packets)
              </label>
              <input
                type="number"
                min={1}
                max={128}
                value={formData.window_size || 32}
                onChange={(e) => setFormData({ ...formData, window_size: parseInt(e.target.value, 10) || 32 })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                placeholder="32"
              />
              <p className="text-[11px] text-slate-400 mt-1">Maximum unacknowledged packets inflight</p>
            </div>
          </div>
        </div>

        {/* Topology Summary Preview */}
        <div className="bg-slate-50 p-5 rounded-xl border border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Network className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-[#0F172A]">Simulated NS-2 Topology Plan</h4>
              <p className="text-[11px] text-[#64748B]">
                {formData.users} Student Nodes (10Mb, 5ms) ➔ Access Router R1 ➔ [{formData.data_rate}, 20ms, {formData.experiment_type === 'Leaky Bucket' ? 'RED' : 'DropTail'}] ➔ Core Router R2 ➔ LMS Server (100Mb)
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded whitespace-nowrap">
            {formData.protocol} • {formData.simulation_time}s
          </span>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={submitting}
            className={`flex items-center gap-2 font-bold text-xs px-6 py-3 rounded-lg shadow-sm transition-all disabled:opacity-50 text-white ${
              isDemo
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
            }`}
          >
            <Play className="w-4 h-4 fill-white" />
            <span>
              {submitting
                ? isDemo
                  ? 'Loading Demo Experiment...'
                  : 'Executing Live NS-2 Engine...'
                : isDemo
                ? '▶ Run Demo Experiment'
                : '▶ RUN LIVE NS-2 SIMULATION'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
