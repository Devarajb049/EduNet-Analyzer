import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  Clock,
  Terminal,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Cpu,
  FileCode,
  BarChart3,
  Network
} from 'lucide-react';
import { api } from '../services/api';
import { subscribeSimulationStream } from '../services/websocket';
import { SimulationStatusResponse, Experiment } from '../types';
import { useSimulationMode } from '../context/SimulationModeContext';

const STAGES = [
  { key: 'preparing', label: 'Preparing Simulation', icon: Cpu },
  { key: 'generating', label: 'Generating NS-2 File', icon: Network },
  { key: 'running', label: 'Running Simulation', icon: FileCode },
  { key: 'processing', label: 'Processing Trace', icon: Activity },
  { key: 'calculating', label: 'Calculating Metrics', icon: BarChart3 },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

const normalizeStage = (stage: string = ''): string => {
  const s = stage.toLowerCase();
  if (s.includes('prep')) return 'preparing';
  if (s.includes('gen') || s.includes('topol')) return 'generating';
  if (s.includes('run') || s.includes('ns2') || s.includes('start')) return 'running';
  if (s.includes('proc') || s.includes('trace')) return 'processing';
  if (s.includes('calc') || s.includes('metric')) return 'calculating';
  if (s.includes('comp')) return 'completed';
  if (s.includes('fail')) return 'failed';
  return s;
};

export const SimulationMonitor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setMode } = useSimulationMode();
  const queryId = searchParams.get('id');

  const [simId, setSimId] = useState<number | null>(queryId ? parseInt(queryId, 10) : null);
  const [statusData, setStatusData] = useState<SimulationStatusResponse | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isLiveWs, setIsLiveWs] = useState<boolean>(false);
  const logContainerRef = React.useRef<HTMLDivElement>(null);

  // If no simulation ID in query params, load experiments to select one
  useEffect(() => {
    if (!simId) {
      api.getExperiments({ limit: 10 }).then((exps) => {
        setExperiments(exps);
        if (exps.length > 0) {
          setSimId(exps[0].id);
        }
      }).catch(() => null);
    }
  }, [simId]);

  // Real-time WebSocket subscription with polling fallback
  useEffect(() => {
    if (!simId) return;

    // Initial HTTP fetch to prime state
    api.getSimulationStatus(simId).then(setStatusData).catch(() => null);

    // Subscribe to WebSocket
    const unsubscribe = subscribeSimulationStream(simId, {
      onOpen: () => setIsLiveWs(true),
      onClose: () => setIsLiveWs(false),
      onError: () => setIsLiveWs(false),
      onMessage: (data) => {
        setStatusData((prev) => ({
          ...prev,
          ...data,
          id: simId,
          exp_code: data.exp_code || prev?.exp_code || `EXP-${simId}`,
          logs: data.logs || prev?.logs || [],
        }));
      },
    });

    // Fallback periodic poll in case WS disconnects
    const fallbackPoll = setInterval(() => {
      if (!isLiveWs && simId) {
        api.getSimulationStatus(simId).then((data) => {
          setStatusData(data);
          if (data.status === 'COMPLETED' || data.status === 'FAILED') {
            clearInterval(fallbackPoll);
          }
        }).catch(() => null);
      }
    }, 1500);

    return () => {
      unsubscribe();
      clearInterval(fallbackPoll);
    };
  }, [simId, isLiveWs]);

  // Auto-scroll logs to bottom as lines stream in
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [statusData?.logs]);

  const normStage = normalizeStage(statusData?.current_stage || statusData?.status || '');
  const currentStageIndex = STAGES.findIndex((s) => s.key === normStage);
  const isFailed = statusData?.status?.toLowerCase() === 'failed';
  const isCompleted = statusData?.status?.toLowerCase() === 'completed';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Simulation Selector if multiple available */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">Real-Time Simulation Monitor</h2>
            <p className="text-xs text-[#64748B]">Monitoring execution pipeline, NS-2 subprocess, and trace processing</p>
          </div>
        </div>

        {experiments.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#64748B]">Monitor Experiment:</span>
            <select
              value={simId || ''}
              onChange={(e) => setSimId(parseInt(e.target.value, 10))}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white font-mono focus:ring-2 focus:ring-blue-500"
            >
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.exp_code} - {exp.name} ({exp.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isFailed && (
        <div className="p-5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-950 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>
              {statusData?.error?.includes('UNAVAILABLE')
                ? '❌ LIVE NS-2 SIMULATION UNAVAILABLE'
                : statusData?.error?.includes('Trace')
                ? '❌ Trace Processing Failed'
                : '❌ Simulation Failed'}
            </span>
          </div>
          <p className="font-semibold text-rose-900 whitespace-pre-line">
            {statusData?.error || 'The NS-2 simulation did not complete successfully. No simulated results were generated.'}
          </p>
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => {
                setMode('demo');
                navigate('/');
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs"
            >
              Use Demo Mode (Sample Data)
            </button>
            <Link
              to="/settings"
              className="px-3.5 py-2 bg-white border border-rose-300 hover:bg-rose-100 text-rose-900 font-semibold rounded-lg text-xs transition-colors"
            >
              WSL NS-2 Configuration Guide
            </Link>
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Simulation Completed Successfully</span>
            </div>
            <Link
              to={`/experiments/${simId}`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>View Results</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-emerald-800">
            Real NS-2 simulation trace parsed and stored in database. Results ready for analysis.
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress & Stage Stepper */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {statusData?.exp_code || `EXP-${simId}`}
            </span>
            <h3 className="text-base font-bold text-[#0F172A] mt-1">
              {statusData?.stage_message || 'Initializing pipeline...'}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-mono text-blue-600">
              {statusData?.progress_percent ?? 0}%
            </span>
            <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Overall Progress</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${statusData?.progress_percent ?? 0}%` }}
          />
        </div>

        {/* Multi-Stage Stepper */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isCompleted = currentStageIndex > idx || statusData?.status === 'COMPLETED';
            const isCurrent = currentStageIndex === idx && statusData?.status !== 'COMPLETED';

            return (
              <div
                key={stage.key}
                className={`p-3 rounded-lg border text-center transition-all ${
                  isCompleted
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : isCurrent
                    ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-xs ring-2 ring-blue-200'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex justify-center mb-1.5">
                  <Icon className={`w-5 h-5 ${isCurrent ? 'animate-bounce text-blue-600' : ''}`} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider">{stage.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Console Log Stream */}
      <div className="bg-[#0F172A] text-slate-200 rounded-xl border border-slate-800 shadow-lg overflow-hidden font-mono text-xs">
        <div className="bg-[#1E293B] px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-semibold text-slate-300">Simulation Console Output & Execution Logs</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLiveWs ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
            <span className="text-[10px] text-slate-400">
              {isLiveWs ? 'WebSocket Live Stream' : 'Live Polling Mode'}
            </span>
          </div>
        </div>
        <div ref={logContainerRef} className="p-4 h-64 overflow-y-auto space-y-1.5 scroll-smooth">
          {statusData?.logs.map((log, index) => (
            <div key={index} className="leading-relaxed">
              <span className="text-emerald-400 font-bold mr-2">&gt;</span>
              <span>{log}</span>
            </div>
          ))}
          {(!statusData?.logs || statusData.logs.length === 0) && (
            <div className="text-slate-500 italic">Waiting for simulation process output...</div>
          )}
        </div>
      </div>

      {/* Completion Action Card */}
      {statusData?.status === 'COMPLETED' && (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-emerald-900">Simulation & Trace Processing Complete!</h4>
              <p className="text-xs text-emerald-700">
                NS-2 trace file parsed and network performance metrics persisted to database.
              </p>
            </div>
          </div>
          <Link
            to={`/experiments/${simId}`}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-all"
          >
            <span>View Full Results & Analytics</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
};
