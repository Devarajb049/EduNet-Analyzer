import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlayCircle,
  Activity,
  History,
  GitCompare,
  Network,
  ShieldCheck,
  Gauge,
  FileText,
  Settings,
  Server,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { SystemStatusResponse } from '../types';
import { AppLogo } from '../components/AppLogo';
import { useSimulationMode } from '../context/SimulationModeContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/simulate', label: 'New Simulation', icon: PlayCircle },
  { path: '/monitor', label: 'Simulation Monitor', icon: Activity },
  { path: '/experiments', label: 'Experiments', icon: History },
  { path: '/compare', label: 'Comparisons', icon: GitCompare },
  { path: '/topology', label: 'Network Visualization', icon: Network },
  { path: '/reliable-transmission', label: 'Reliable Transmission', icon: ShieldCheck, badge: 'Sliding / GBN' },
  { path: '/congestion', label: 'Congestion Analysis', icon: Gauge, badge: 'Leaky Bucket' },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const { isDemo, isLive } = useSimulationMode();

  useEffect(() => {
    api.getSystemStatus().then(setStatus).catch(() => null);
  }, []);

  return (
    <aside className="w-64 bg-white border-r border-[#E2E8F0] flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <AppLogo className="w-10 h-10 shadow-sm shadow-blue-200 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-base text-[#0F172A] tracking-tight leading-none">EduNet Analyzer</h1>
            <p className="text-[11px] text-[#64748B] mt-1 font-medium">E-Learning Network Lab</p>
          </div>
        </div>
        <div className="mt-3 text-[10px] text-blue-700 bg-blue-50 px-2 py-1 rounded font-medium border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            Simulate • Measure • Compare
          </div>
          <span className="font-mono font-bold text-[9px] px-1.5 py-0.2 rounded bg-white text-blue-800 border border-blue-200">
            {isDemo ? 'DEMO' : 'LIVE'}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
          Simulation Laboratory
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                }`
              }
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Engine Status Card */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#475569]">Active Mode</span>
            {isDemo ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                DEMO MODE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                LIVE NS-2
              </span>
            )}
          </div>
          <div className="mt-2 text-[10px] text-[#64748B] flex items-center gap-1 leading-tight">
            <Info className="w-3 h-3 text-slate-400 flex-shrink-0" />
            {isDemo
              ? 'Predefined verified lab sample data.'
              : 'Real NS-2 simulation engine mode.'}
          </div>
        </div>
      </div>
    </aside>
  );
};
