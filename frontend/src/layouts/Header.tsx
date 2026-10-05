import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Menu } from 'lucide-react';
import { api } from '../services/api';
import { SystemStatusResponse } from '../types';
import { ModeSelector, useSimulationMode } from '../context/SimulationModeContext';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const location = useLocation();
  const { isDemo } = useSimulationMode();

  const fetchStatus = () => {
    api.getSystemStatus().then(setStatus).catch(() => null);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Laboratory Dashboard';
      case '/dashboard': return 'Laboratory Dashboard';
      case '/simulation/new': return 'Configure New Simulation';
      case '/simulate': return 'Configure New Simulation';
      case '/simulation/monitor': return 'Simulation Monitor & Console';
      case '/monitor': return 'Simulation Monitor & Console';
      case '/experiments': return 'Experiment Records & History';
      case '/comparison': return 'Multi-Experiment Comparison';
      case '/compare': return 'Multi-Experiment Comparison';
      case '/performance': return 'Performance Analysis';
      case '/tcp-udp': return 'TCP vs UDP Comparison';
      case '/congestion': return 'Congestion Control: Leaky Bucket';
      case '/sliding-window': return 'Sliding Window Protocol';
      case '/go-back-n': return 'Go-Back-N ARQ Protocol';
      case '/network': return 'E-Learning Network Topology';
      case '/topology': return 'E-Learning Network Topology';
      case '/reports': return 'Laboratory Reports Hub';
      case '/settings': return 'System Settings';
      case '/settings/ns2': return 'NS-2 WSL Configuration';
      default:
        if (location.pathname.startsWith('/experiments/')) return 'Experiment Results';
        if (location.pathname.startsWith('/simulation/')) return 'Simulation Monitor';
        return 'EduNet Analyzer';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      {/* Left: Mobile Menu Toggle & Page Titles */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 sm:p-2 -ml-1 rounded-lg text-slate-600 hover:text-[#0F172A] hover:bg-slate-100 transition-colors flex-shrink-0"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight truncate">
            {getPageTitle()}
          </h2>
          <p className="text-[10px] sm:text-[11px] text-[#64748B] truncate hidden sm:block">
            Computer Networks & Internet Protocols Lab — Project #4
          </p>
        </div>
      </div>

      {/* Right: Controls & Actions */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-shrink-0">
        {/* Global Simulation Mode Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden xl:inline">
            Mode:
          </span>
          <ModeSelector compact />
        </div>

        {/* Mode Status Pill */}
        <div className="hidden md:flex items-center">
          {isDemo ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>DEMO MODE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>LIVE NS-2</span>
            </div>
          )}
        </div>

        {/* New Simulation CTA */}
        {location.pathname !== '/simulation/new' && location.pathname !== '/simulate' && (
          <Link
            to="/simulation/new"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">New Simulation</span>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
