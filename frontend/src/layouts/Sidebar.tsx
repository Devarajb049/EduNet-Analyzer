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
  Settings as SettingsIcon,
  Server,
  Info,
  Users,
  Repeat,
  Sliders,
  Terminal,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { SystemStatusResponse } from '../types';
import { AppLogo } from '../components/AppLogo';
import { useSimulationMode } from '../context/SimulationModeContext';

interface NavSection {
  title?: string;
  items: {
    path: string;
    label: string;
    icon: any;
    badge?: string;
  }[];
}

const navSections: NavSection[] = [
  {
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Simulation',
    items: [
      { path: '/simulation/new', label: 'New Simulation', icon: PlayCircle },
      { path: '/simulation/monitor', label: 'Simulation Monitor', icon: Activity },
      { path: '/experiments', label: 'Experiments', icon: History },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { path: '/performance', label: 'Performance Analysis', icon: Users, badge: 'Load' },
      { path: '/tcp-udp', label: 'TCP vs UDP', icon: Zap },
      { path: '/congestion', label: 'Congestion Analysis', icon: Gauge },
    ],
  },
  {
    title: 'Reliable Transmission',
    items: [
      { path: '/sliding-window', label: 'Sliding Window', icon: ShieldCheck },
      { path: '/go-back-n', label: 'Go-Back-N', icon: Repeat },
    ],
  },
  {
    title: 'Traffic Control',
    items: [
      { path: '/leaky-bucket', label: 'Leaky Bucket', icon: Sliders },
    ],
  },
  {
    title: 'Network',
    items: [
      { path: '/network', label: 'Network Visualization', icon: Network },
    ],
  },
  {
    items: [
      { path: '/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    title: 'Settings',
    items: [
      { path: '/settings', label: 'System Status', icon: SettingsIcon },
      { path: '/settings/ns2', label: 'NS-2 Setup', icon: Terminal, badge: 'WSL2' },
    ],
  },
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
      <div className="p-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <AppLogo className="w-9 h-9 shadow-sm shadow-blue-200 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-sm text-[#0F172A] tracking-tight leading-none">EduNet Analyzer</h1>
            <p className="text-[10px] text-[#64748B] mt-1 font-medium">E-Learning Network Lab</p>
          </div>
        </div>
        <div className="mt-2.5 text-[10px] text-blue-700 bg-blue-50 px-2 py-1 rounded font-medium border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse flex-shrink-0"></span>
            <span className="truncate">Simulate • Measure • Compare</span>
          </div>
          <span className="font-mono font-bold text-[9px] px-1.5 py-0.2 rounded bg-white text-blue-800 border border-blue-200 ml-1">
            {isDemo ? 'DEMO' : 'LIVE'}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto text-xs">
        {navSections.map((sec, secIdx) => (
          <div key={secIdx} className="space-y-1">
            {sec.title && (
              <div className="px-2.5 pb-1 text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">
                {sec.title}
              </div>
            )}
            {sec.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                    }`
                  }
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Engine Status Card */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-[#475569]">Engine Status</span>
            {status?.ns2_installed ? (
              <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                NS-2 ({status.execution_mode.toUpperCase()})
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                DEMO BENCHMARK
              </span>
            )}
          </div>
          <div className="mt-1.5 text-[9px] text-[#64748B] flex items-center gap-1 leading-tight">
            <Info className="w-3 h-3 text-slate-400 flex-shrink-0" />
            {isDemo
              ? 'Academic reference dataset mode.'
              : 'Live discrete-event NS-2 pipeline active.'}
          </div>
        </div>
      </div>
    </aside>
  );
};
