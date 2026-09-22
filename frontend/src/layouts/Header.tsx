import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { SystemStatusResponse } from '../types';

import { ModeSelector, useSimulationMode } from '../context/SimulationModeContext';

export const Header: React.FC = () => {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const location = useLocation();
  const { isDemo, isLive } = useSimulationMode();

  const fetchStatus = () => {
    api.getSystemStatus().then(setStatus).catch(() => null);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Laboratory Dashboard';
      case '/simulate': return 'Configure New Simulation';
      case '/monitor': return 'Simulation Monitor & Console';
      case '/experiments': return 'Experiment Records & History';
      case '/compare': return 'Multi-Experiment Comparison';
      case '/topology': return 'E-Learning Network Topology';
      case '/reliable-transmission': return 'Reliable Protocols: Sliding Window & Go-Back-N';
      case '/congestion': return 'Congestion Control: Leaky Bucket Traffic Shaping';
      case '/reports': return 'Laboratory Reports Hub';
      case '/settings': return 'System Settings & NS-2 Configuration';
      default:
        if (location.pathname.startsWith('/experiments/')) return 'Experiment Results & Trace Analytics';
        return 'EduNet Analyzer';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-base font-semibold text-[#0F172A] tracking-tight">{getPageTitle()}</h2>
        <p className="text-[11px] text-[#64748B]">Computer Networks & Internet Protocols Lab — Project #4</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Global Simulation Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:inline">
            Mode:
          </span>
          <ModeSelector compact />
        </div>

        {/* Mode Status Pill */}
        <div className="hidden sm:flex items-center">
          {isDemo ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>DEMO MODE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>LIVE NS-2 SIMULATION</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {location.pathname !== '/simulate' && (
          <Link
            to="/simulate"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            <span>New Simulation</span>
          </Link>
        )}
      </div>
    </header>
  );
};
