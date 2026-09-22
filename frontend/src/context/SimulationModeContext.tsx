import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type SimulationMode = 'demo' | 'realtime';
export type AnySimulationMode = SimulationMode | 'DEMO' | 'LIVE' | 'live';

interface SimulationModeContextType {
  mode: SimulationMode;
  setMode: (mode: AnySimulationMode) => void;
  isDemo: boolean;
  isRealtime: boolean;
  isLive: boolean; // Alias for backward compatibility
  modeVersion: number;
}

const SimulationModeContext = createContext<SimulationModeContextType | undefined>(undefined);

const STORAGE_KEY = 'edunet-mode';
const LEGACY_STORAGE_KEY = 'edunet_analyzer_mode';

export const SimulationModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<SimulationMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (saved === 'realtime' || saved === 'LIVE' || saved === 'live') {
      return 'realtime';
    }
    return 'demo';
  });

  const [modeVersion, setModeVersion] = useState<number>(0);

  const setMode = useCallback((inputMode: AnySimulationMode) => {
    const normalized: SimulationMode =
      inputMode === 'realtime' || inputMode === 'LIVE' || inputMode === 'live'
        ? 'realtime'
        : 'demo';
    setModeState(normalized);
    localStorage.setItem(STORAGE_KEY, normalized);
    localStorage.setItem(LEGACY_STORAGE_KEY, normalized === 'realtime' ? 'LIVE' : 'DEMO');
    setModeVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
    localStorage.setItem(LEGACY_STORAGE_KEY, mode === 'realtime' ? 'LIVE' : 'DEMO');
  }, [mode]);

  return (
    <SimulationModeContext.Provider
      value={{
        mode,
        setMode,
        isDemo: mode === 'demo',
        isRealtime: mode === 'realtime',
        isLive: mode === 'realtime',
        modeVersion,
      }}
    >
      {children}
    </SimulationModeContext.Provider>
  );
};

export const useSimulationMode = (): SimulationModeContextType => {
  const context = useContext(SimulationModeContext);
  if (!context) {
    throw new Error('useSimulationMode must be used within a SimulationModeProvider');
  }
  return context;
};

/**
 * Reusable Mode Selector Component
 * ┌───────────────────────────────────────────────┐
 * │ EduNet Analyzer              [ DEMO | LIVE ]  │
 * └───────────────────────────────────────────────┘
 */
export const ModeSelector: React.FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false,
}) => {
  const { mode, setMode } = useSimulationMode();

  if (compact) {
    return (
      <div className={`inline-flex items-center rounded-lg bg-slate-100 p-1 border border-slate-200 shadow-xs ${className}`}>
        <button
          type="button"
          onClick={() => setMode('demo')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
            mode === 'demo'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Switch to Demo Mode (100% offline sample laboratory dataset)"
        >
          <span className={`w-2 h-2 rounded-full ${mode === 'demo' ? 'bg-white' : 'bg-slate-400'}`}></span>
          DEMO
        </button>
        <button
          type="button"
          onClick={() => setMode('realtime')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
            mode === 'realtime'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Switch to Real-Time NS-2 Mode (Actual discrete-event simulation pipeline)"
        >
          <span className={`w-2 h-2 rounded-full ${mode === 'realtime' ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></span>
          LIVE
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-[#CBD5E1] rounded-xl p-4 shadow-xs ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Simulation Environment
        </span>
        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
            mode === 'demo'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {mode === 'demo' ? '🟦 DEMO MODE' : '🟢 REAL-TIME MODE'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setMode('demo')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
            mode === 'demo'
              ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${mode === 'demo' ? 'bg-blue-600' : 'bg-slate-400'}`}></span>
          Demo Mode
        </button>

        <button
          type="button"
          onClick={() => setMode('realtime')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
            mode === 'realtime'
              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${mode === 'realtime' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
          Real-Time Mode
        </button>
      </div>

      <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed">
        {mode === 'demo'
          ? 'Runs completely offline using pre-calibrated laboratory sample records. No NS-2 or backend simulation service required.'
          : 'Executes actual discrete-event simulations via the native/WSL NS-2 pipeline and reads real trace metrics.'}
      </p>
    </div>
  );
};

/**
 * Reusable Mode Badge
 */
export const ModeBadge: React.FC<{ isDemo: boolean; className?: string }> = ({ isDemo, className = '' }) => {
  if (isDemo) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-bold text-[10px] uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 ${className}`}
        title="Predefined demonstration data — Not generated by live NS-2"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        DEMO DATA
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
      title="Executed using native/WSL NS-2 discrete-event simulator"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
      LIVE NS-2
    </span>
  );
};
