import React, { useEffect, useState } from 'react';
import {
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Server,
  Database,
  Cpu,
  Info,
  ExternalLink,
  BookOpen,
  HelpCircle,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { SystemStatusResponse } from '../types';
import { ModeBadge, useSimulationMode } from '../context/SimulationModeContext';

export const Ns2Setup: React.FC = () => {
  const { mode, isDemo } = useSimulationMode();
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              NS-2 Engine Setup & System Telemetry
            </h1>
            <ModeBadge />
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Configure, verify, and diagnose your Windows Subsystem for Linux (WSL2) Ubuntu NS-2.35 discrete-event simulation pipeline.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Engine Diagnostics
        </button>
      </div>

      {/* System Health Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {/* Backend API */}
        <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <Server className="w-5 h-5 text-blue-600" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-xs text-slate-500 font-medium">Backend API</div>
          <div className="text-sm font-bold text-slate-900 mt-0.5">FastAPI Online</div>
          <span className="text-[10px] text-slate-400">Port 8000 (Uvicorn)</span>
        </div>

        {/* Database */}
        <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <span className={`w-2.5 h-2.5 rounded-full ${status?.db_connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </div>
          <div className="text-xs text-slate-500 font-medium">Database</div>
          <div className="text-sm font-bold text-slate-900 mt-0.5">
            {status?.db_connected ? 'SQLite WAL Mode' : 'Disconnected'}
          </div>
          <span className="text-[10px] text-slate-400">edunet.db</span>
        </div>

        {/* WSL2 Host */}
        <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <Cpu className="w-5 h-5 text-amber-600" />
            <span className={`w-2.5 h-2.5 rounded-full ${status?.wsl_detected || status?.wsl_available ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </div>
          <div className="text-xs text-slate-500 font-medium">WSL2 Subsystem</div>
          <div className="text-sm font-bold text-slate-900 mt-0.5">
            {status?.wsl_detected || status?.wsl_available ? 'WSL2 Active' : 'Not Detected'}
          </div>
          <span className="text-[10px] text-slate-400">Windows Virtualization</span>
        </div>

        {/* Ubuntu Linux */}
        <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <Terminal className="w-5 h-5 text-orange-600" />
            <span className={`w-2.5 h-2.5 rounded-full ${Boolean(status?.wsl_distro) || status?.ubuntu_distro_found ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </div>
          <div className="text-xs text-slate-500 font-medium">Ubuntu Instance</div>
          <div className="text-sm font-bold text-slate-900 mt-0.5">
            {status?.wsl_distro || (status?.ubuntu_distro_found ? 'Ubuntu Ready' : 'Distro Missing')}
          </div>
          <span className="text-[10px] text-slate-400">WSL Ubuntu 22.04+</span>
        </div>

        {/* NS-2 Engine */}
        <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span className={`w-2.5 h-2.5 rounded-full ${status?.ns2_installed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </div>
          <div className="text-xs text-slate-500 font-medium">NS-2 Simulator</div>
          <div className="text-sm font-bold text-slate-900 mt-0.5">
            {status?.ns2_installed ? `NS-2 (${status.execution_mode})` : 'Offline / Demo Mode'}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {status?.ns2_path || 'Simulated engine fallback'}
          </span>
        </div>
      </div>

      {/* Guided 3-Step Setup Instructions */}
      <div className="p-6 bg-white rounded-xl border border-[#E2E8F0] shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-[#0F172A]">
            Windows 10/11 WSL2 & NS-2.35 Installation Guide
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Follow these three commands to equip your Windows PC with native discrete-event NS-2 capabilities for Live Simulation mode.
          </p>
        </div>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                Step 1: Install WSL2 Ubuntu (PowerShell as Admin)
              </span>
              <button
                onClick={() => handleCopy('wsl --install -d Ubuntu', 'step1')}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-mono"
              >
                {copiedCmd === 'step1' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCmd === 'step1' ? 'Copied!' : 'Copy Command'}
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
              wsl --install -d Ubuntu
            </pre>
            <p className="text-[11px] text-slate-500 mt-2">
              Open PowerShell as Administrator, execute the command above, and restart your computer if prompted.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                Step 2: Install NS-2 & NAM (Inside Ubuntu Terminal)
              </span>
              <button
                onClick={() => handleCopy('sudo apt update && sudo apt install -y ns2 nam', 'step2')}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-mono"
              >
                {copiedCmd === 'step2' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCmd === 'step2' ? 'Copied!' : 'Copy Command'}
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
              sudo apt update && sudo apt install -y ns2 nam
            </pre>
            <p className="text-[11px] text-slate-500 mt-2">
              Launch Ubuntu from your Start menu and run this command to install the official Network Simulator 2 suite.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Step 3: Verify NS-2 Version & Execution
              </span>
              <button
                onClick={() => handleCopy('ns -version', 'step3')}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-mono"
              >
                {copiedCmd === 'step3' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCmd === 'step3' ? 'Copied!' : 'Copy Command'}
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
              ns -version
            </pre>
            <p className="text-[11px] text-slate-500 mt-2">
              If NS-2 outputs its version number or displays a <code>%</code> prompt, your simulator is fully operational!
            </p>
          </div>
        </div>
      </div>

      {/* Academic Viva Voce Preparation Section */}
      <div className="p-6 bg-white rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b pb-3 border-slate-100">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Computer Networks Laboratory: Viva Voce & Theory Q&A
            </h2>
            <p className="text-xs text-slate-500">
              Essential questions on discrete-event network simulation, queuing theory, and NS-2 internal architecture.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-[#0F172A] mb-1 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              1. What is a Discrete-Event Simulator?
            </h4>
            <p className="text-slate-600 leading-relaxed">
              Unlike real-time clocks, a discrete-event simulator like NS-2 maintains an ordered event queue. The simulation time advances instantaneously from the timestamp of one event (e.g. packet arrival) to the next, allowing hours of network traffic to be computed in seconds.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-[#0F172A] mb-1 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              2. Why does NS-2 use both C++ and OTcl?
            </h4>
            <p className="text-slate-600 leading-relaxed">
              NS-2 uses a dual-language architecture: <strong>C++</strong> handles per-packet byte manipulation and routing algorithms for maximum execution speed, while <strong>OTcl (Object Tcl)</strong> acts as the scripting interface to configure nodes, links, and parameters without recompiling.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-[#0F172A] mb-1 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              3. Explain the four basic NS-2 trace flags (+, -, r, d).
            </h4>
            <p className="text-slate-600 leading-relaxed">
              <code>+</code>: Packet enrolled into link output queue.<br/>
              <code>-</code>: Packet departed queue and transmitted over link.<br/>
              <code>r</code>: Packet successfully received at next-hop node.<br/>
              <code>d</code>: Packet dropped due to queue buffer exhaustion or timeout.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-[#0F172A] mb-1 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              4. Difference between DropTail and RED Queuing?
            </h4>
            <p className="text-slate-600 leading-relaxed">
              <strong>DropTail</strong> accepts packets until the buffer is 100% full, then drops all incoming packets (causing global TCP synchronization). <strong>RED (Random Early Detection)</strong> drops packets probabilistically before the queue fills up, signaling senders to gently reduce rates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
