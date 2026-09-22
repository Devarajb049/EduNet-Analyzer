import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Cpu,
  Database,
  Info,
  Sliders
} from 'lucide-react';
import { api } from '../services/api';
import { SystemStatusResponse } from '../types';
import { ModeBadge, ModeSelector, useSimulationMode } from '../context/SimulationModeContext';

export const Settings: React.FC = () => {
  const { mode, isDemo, setMode } = useSimulationMode();
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reseeding, setReseeding] = useState(false);
  const [reseedMsg, setReseedMsg] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const fetchStatus = () => {
    setLoading(true);
    api.getSystemStatus()
      .then(setStatus)
      .catch(() => null)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCopyCommand = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleReseed = async () => {
    if (!window.confirm('Reset all experiments and restore initial laboratory benchmarks?')) return;
    setReseeding(true);
    setReseedMsg(null);
    try {
      const res = await api.seedSystemData(true);
      setReseedMsg(res.message);
      fetchStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to reseed database.');
    } finally {
      setReseeding(false);
    }
  };

  const wslCmd = 'sudo apt-get update && sudo apt-get install -y ns2';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0F172A]">System Settings & NS-2 Configuration</h2>
                <ModeBadge isDemo={isDemo} />
              </div>
              <p className="text-xs text-[#64748B]">
                Engine diagnostics, global mode switching, and native/WSL NS-2 pipeline integration
              </p>
            </div>
          </div>

          <ModeSelector compact />
        </div>
      </div>

      {/* Global Mode Switcher Card */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F1F5F9]">
          <Sliders className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Global Execution Environment
          </h3>
        </div>
        <ModeSelector />
      </div>

      {/* Diagnostics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Simulation Engine Status */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase">Simulation Engine State</span>
            <Cpu className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-center gap-2">
            {status?.ns2_installed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                NATIVE NS-2 BINARY DETECTED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                NS-2 UNAVAILABLE ON SYSTEM PATH
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B]">
            {status?.ns2_installed
              ? `NS-2 binary located at: ${status.ns2_path}`
              : 'Native NS-2 binary not found. Real-Time Mode requires NS-2 or WSL. Demo Mode works completely offline.'}
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-1">
            Execution Mode: <strong>{isDemo ? 'DEMO (Predefined Datasets)' : status?.execution_mode || 'REAL-TIME NS-2'}</strong>
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase">SQLite Laboratory Database</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              DATABASE CONNECTED
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            Real-time experiments and metrics are stored in SQLite. Demo records are isolated in <code>demoExperiments.ts</code>.
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-1">
            Path: <span className="text-slate-700 truncate">{status?.database_path || 'edunet.db'}</span>
          </div>
        </div>
      </div>

      {/* WSL Configuration Guide */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F1F5F9]">
          <Terminal className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            WSL (Windows Subsystem for Linux) NS-2 Setup Guide
          </h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          If you are on Windows and wish to run native NS-2 simulations in <strong>Real-Time Mode</strong>, you can install NS-2 inside WSL Ubuntu. EduNet Analyzer automatically detects and invokes <code>wsl -d Ubuntu -- ns</code>.
        </p>

        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700">1. Install NS-2 in WSL Ubuntu:</span>
          <div className="flex items-center justify-between bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs">
            <code>{wslCmd}</code>
            <button
              onClick={() => handleCopyCommand(wslCmd)}
              className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 transition-colors"
            >
              {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-1 text-xs text-slate-500">
          <p><strong>2. Verify installation:</strong> Open PowerShell and run <code>wsl -d Ubuntu -- which ns</code>.</p>
          <p><strong>3. Switch Mode:</strong> Once installed, select <strong>🟢 Real-Time Mode</strong> in the application header to run discrete-event simulations.</p>
        </div>
      </div>

      {/* Database Maintenance */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Database Seed & Reset</h3>
            <p className="text-xs text-slate-500 mt-0.5">Reset database and restore predefined benchmark experiments</p>
          </div>
          <button
            onClick={handleReseed}
            disabled={reseeding}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{reseeding ? 'Resetting Database...' : 'Restore Benchmark Seed'}</span>
          </button>
        </div>

        {reseedMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{reseedMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
