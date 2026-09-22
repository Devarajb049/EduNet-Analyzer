import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Network,
  Server,
  Router,
  Monitor,
  Info,
  Sliders,
  Play,
  Pause,
  Layers,
  ArrowRight,
  CheckCircle2,
  FileCode
} from 'lucide-react';
import { useDataService } from '../services/dataService';
import { Experiment } from '../types';
import { ModeBadge, useSimulationMode } from '../context/SimulationModeContext';

export const NetworkTopology: React.FC = () => {
  const { mode, isDemo, setMode } = useSimulationMode();
  const dataService = useDataService();

  const [realExperiments, setRealExperiments] = useState<Experiment[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<number | null>(null);

  // Dynamic topology state
  const [studentCount, setStudentCount] = useState<number>(10);
  const [bottleneckBw, setBottleneckBw] = useState<string>('1 Mbps');
  const [currentProtocol, setCurrentProtocol] = useState<string>('TCP');
  const [activeNode, setActiveNode] = useState<{
    id: string;
    label: string;
    role: string;
    ip: string;
    interfaceDetails: string;
    queue: string;
  } | null>({
    id: 'R1',
    label: 'Access Router R1',
    role: 'Border Gateway Aggregator',
    ip: '10.0.1.1/24',
    interfaceDetails: 'N-port 10Mbps Access Links, 1x Bottleneck Trunk',
    queue: 'DropTail (Limit: 25 packets)',
  });

  const [animating, setAnimating] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [realtimePacketsSent, setRealtimePacketsSent] = useState<number>(1240);
  const [realtimePacketsDelivered, setRealtimePacketsDelivered] = useState<number>(1188);
  const [realtimePacketsDropped, setRealtimePacketsDropped] = useState<number>(52);
  const [currentQueue, setCurrentQueue] = useState<number>(8);
  const [isQueueOverflow, setIsQueueOverflow] = useState<boolean>(false);
  const [instantThroughput, setInstantThroughput] = useState<number>(864);

  // Load real-time experiments when in Real-Time Mode
  useEffect(() => {
    if (!isDemo) {
      dataService.getExperiments({ limit: 50 }).then((data) => {
        setRealExperiments(data);
        if (data.length > 0) {
          const first = data[0];
          setSelectedExpId(first.id);
          applyExperimentTopology(first);
        }
      }).catch(() => null);
    }
  }, [mode, isDemo]);

  const applyExperimentTopology = (exp: Experiment) => {
    setStudentCount(exp.users);
    setBottleneckBw(exp.data_rate);
    setCurrentProtocol(exp.protocol);
    if (exp.result) {
      setRealtimePacketsSent(exp.result.packets_sent);
      setRealtimePacketsDelivered(exp.result.packets_received);
      setRealtimePacketsDropped(exp.result.packets_dropped);
      setInstantThroughput(Math.round(exp.result.throughput_kbps));
      setCurrentQueue(Math.min(25, Math.round(exp.result.packets_dropped > 0 ? 22 : 8)));
    }
  };

  const handleExperimentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value, 10);
    setSelectedExpId(id);
    const exp = realExperiments.find((x) => x.id === id);
    if (exp) {
      applyExperimentTopology(exp);
    }
  };

  // Real-time animation & packet counter loop (only in demo mode or when active)
  useEffect(() => {
    if (!animating) return;

    const interval = setInterval(() => {
      const newPackets = Math.floor((studentCount / 4) * speedMultiplier) + 1;
      setRealtimePacketsSent((s) => s + newPackets);

      // Queue fluctuation
      setCurrentQueue((prev) => {
        const arrival = newPackets;
        const capacity = 25;
        const drain = Math.floor(4 * speedMultiplier);
        const potential = prev + arrival - drain;

        if (potential >= capacity) {
          setIsQueueOverflow(true);
          setRealtimePacketsDropped((d) => d + (potential - capacity));
          setRealtimePacketsDelivered((del) => del + drain);
          setTimeout(() => setIsQueueOverflow(false), 400);
          return capacity;
        }

        const nextQ = Math.max(0, potential);
        setRealtimePacketsDelivered((del) => del + Math.min(prev, drain));
        return nextQ;
      });

      // Fluctuate instant throughput
      const variation = (Math.random() - 0.5) * 40;
      setInstantThroughput(Math.round(860 + studentCount * 1.5 + variation));
    }, 600 / speedMultiplier);

    return () => clearInterval(interval);
  }, [animating, speedMultiplier, studentCount]);

  // Generate dynamic student node coordinates for SVG
  const displayCount = Math.min(studentCount, 12);
  const studentNodes = Array.from({ length: displayCount }, (_, i) => {
    const ySpacing = 380 / (displayCount + 1);
    return {
      id: `N${i}`,
      label: `Student ${i + 1}`,
      x: 80,
      y: 40 + (i + 1) * ySpacing,
      ip: `10.0.0.${i + 10}`,
    };
  });

  const r1Pos = { x: 300, y: 230 };
  const r2Pos = { x: 520, y: 230 };
  const srvPos = { x: 740, y: 230 };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#0F172A]">Simulated Campus Network Topology</h2>
              <ModeBadge isDemo={isDemo} />
            </div>
            <p className="text-xs text-[#64748B]">
              {isDemo
                ? 'Educational interactive Star-Bottleneck model with simulated traffic stream'
                : 'Actual NS-2 topology specification derived from live simulation parameters'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {!isDemo && realExperiments.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Sim Record:</span>
              <select
                value={selectedExpId || ''}
                onChange={handleExperimentSelect}
                className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-mono font-bold text-slate-800"
              >
                {realExperiments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.exp_code}: {e.users}u ({e.protocol})
                  </option>
                ))}
              </select>
            </div>
          )}

          {isDemo ? (
            <>
              <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium">Speed:</span>
                {[0.5, 1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSpeedMultiplier(spd)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                      speedMultiplier === spd ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">Students:</span>
                <select
                  value={studentCount}
                  onChange={(e) => setStudentCount(parseInt(e.target.value, 10))}
                  className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-mono font-bold"
                >
                  <option value={5}>5 Students</option>
                  <option value={10}>10 Students</option>
                  <option value={25}>25 Students</option>
                  <option value={50}>50 Students</option>
                  <option value={100}>100 Students</option>
                </select>
              </div>

              <button
                onClick={() => setAnimating(!animating)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {animating ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-blue-600" />}
                <span>{animating ? 'Pause' : 'Play'}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setMode('demo')}
              className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Switch to Interactive Demo Mode
            </button>
          )}
        </div>
      </div>

      {/* Network Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-[#E2E8F0] shadow-xs text-xs font-mono">
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
          <span className="text-slate-500 text-[11px]">{isDemo ? 'Instant Rate:' : 'Throughput:'}</span>
          <span className="font-bold text-blue-700">{instantThroughput} Kbps</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
          <span className="text-slate-500 text-[11px]">Delivered:</span>
          <span className="font-bold text-emerald-700">{realtimePacketsDelivered.toLocaleString()} pkts</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
          <span className="text-slate-500 text-[11px]">Bottleneck Queue:</span>
          <span className={`font-bold ${currentQueue >= 20 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
            {currentQueue} / 25 pkts
          </span>
        </div>
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
          <span className="text-slate-500 text-[11px]">Dropped:</span>
          <span className="font-bold text-rose-600">{realtimePacketsDropped.toLocaleString()} pkts</span>
        </div>
      </div>

      {/* Main Visual Canvas & Node Inspector Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* SVG Network Canvas */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              {isDemo ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                  Demo Interactive Traffic Stream ({speedMultiplier}x Speed)
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  NS-2 Real-Time Topology Architecture ({studentCount} Nodes • {currentProtocol})
                </>
              )}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Click any node to inspect configuration
            </span>
          </div>

          <div className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl overflow-hidden p-2 flex justify-center relative">
            {isQueueOverflow && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-600 text-white font-bold text-xs px-3 py-1 rounded-full shadow-lg animate-bounce">
                ⚠ QUEUE OVERFLOW: Dropping Packets at Router R1!
              </div>
            )}
            <svg viewBox="0 0 820 460" className="w-full h-auto max-h-[460px] select-none font-sans">
              <defs>
                <linearGradient id="linkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="bottleneckGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* Links: Students to Access Router R1 */}
              {studentNodes.map((s) => (
                <g key={`link-${s.id}`}>
                  <line
                    x1={s.x + 18}
                    y1={s.y}
                    x2={r1Pos.x}
                    y2={r1Pos.y}
                    stroke="#94A3B8"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  {animating && (
                    <circle r="3.5" fill="#3B82F6" opacity="0.9">
                      <animate
                        attributeName="cx"
                        from={s.x + 18}
                        to={r1Pos.x}
                        dur={`${1.2 / speedMultiplier}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="cy"
                        from={s.y}
                        to={r1Pos.y}
                        dur={`${1.2 / speedMultiplier}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
              ))}

              {/* Bottleneck Link: R1 to R2 */}
              <line
                x1={r1Pos.x}
                y1={r1Pos.y}
                x2={r2Pos.x}
                y2={r2Pos.y}
                stroke="url(#bottleneckGrad)"
                strokeWidth="4"
              />

              {animating && (
                <>
                  <circle r="4.5" fill="#EF4444">
                    <animate
                      attributeName="cx"
                      from={r1Pos.x}
                      to={r2Pos.x}
                      dur={`${1.5 / speedMultiplier}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="cy"
                      from={r1Pos.y}
                      to={r2Pos.y}
                      dur={`${1.5 / speedMultiplier}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle r="4.5" fill="#F59E0B">
                    <animate
                      attributeName="cx"
                      from={r1Pos.x}
                      to={r2Pos.x}
                      begin={`${0.75 / speedMultiplier}s`}
                      dur={`${1.5 / speedMultiplier}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="cy"
                      from={r1Pos.y}
                      to={r2Pos.y}
                      begin={`${0.75 / speedMultiplier}s`}
                      dur={`${1.5 / speedMultiplier}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                </>
              )}

              {/* Bottleneck Label Badge */}
              <rect x="360" y="195" width="100" height="26" rx="6" fill="#FEF3C7" stroke="#F59E0B" />
              <text x="410" y="212" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#92400E" fontFamily="monospace">
                {bottleneckBw}, 20ms
              </text>

              {/* Link: Core Router R2 to LMS Server */}
              <line
                x1={r2Pos.x}
                y1={r2Pos.y}
                x2={srvPos.x}
                y2={srvPos.y}
                stroke="#10B981"
                strokeWidth="3.5"
              />

              {animating && (
                <circle r="4" fill="#10B981">
                  <animate
                    attributeName="cx"
                    from={r2Pos.x}
                    to={srvPos.x}
                    dur={`${0.9 / speedMultiplier}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="cy"
                    from={r2Pos.y}
                    to={srvPos.y}
                    dur={`${0.9 / speedMultiplier}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* High-speed Sink Label */}
              <rect x="585" y="195" width="90" height="24" rx="6" fill="#D1FAE5" stroke="#10B981" />
              <text x="630" y="211" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#065F46" fontFamily="monospace">
                100Mb, 2ms
              </text>

              {/* Student Nodes Rendering */}
              {studentNodes.map((s) => (
                <g
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() =>
                    setActiveNode({
                      id: s.id,
                      label: s.label,
                      role: 'Student E-Learning Client',
                      ip: s.ip,
                      interfaceDetails: 'Full-duplex 10 Mbps, 5ms Propagation Delay',
                      queue: 'Agent Output Buffer (DropTail)',
                    })
                  }
                >
                  <circle cx={s.x} cy={s.y} r="15" fill="#3B82F6" />
                  <circle cx={s.x} cy={s.y} r="12" fill="#FFFFFF" />
                  <text x={s.x} y={s.y + 4} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1D4ED8">
                    {s.id}
                  </text>
                </g>
              ))}

              {/* Access Router R1 */}
              <g
                className="cursor-pointer"
                onClick={() =>
                  setActiveNode({
                    id: 'R1',
                    label: 'Access Router R1',
                    role: 'Campus Border Gateway Aggregator',
                    ip: '10.0.1.1/24',
                    interfaceDetails: `${studentCount} Access Ports, 1x Bottleneck Trunk`,
                    queue: 'DropTail / RED (Queue Limit: 25 packets)',
                  })
                }
              >
                <circle cx={r1Pos.x} cy={r1Pos.y} r="26" fill="#2563EB" />
                <circle cx={r1Pos.x} cy={r1Pos.y} r="22" fill="#EFF6FF" />
                <text x={r1Pos.x} y={r1Pos.y + 4} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1E40AF">
                  R1
                </text>
                <text x={r1Pos.x} y={r1Pos.y + 44} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0F172A">
                  Access Router
                </text>
              </g>

              {/* Core Router R2 */}
              <g
                className="cursor-pointer"
                onClick={() =>
                  setActiveNode({
                    id: 'R2',
                    label: 'Core Router R2',
                    role: 'University Backbone Transit Node',
                    ip: '10.0.2.1/24',
                    interfaceDetails: '1x Bottleneck Inbound, 1x High-speed Server Trunk',
                    queue: 'Gigabit FIFO Buffer (Limit: 50 packets)',
                  })
                }
              >
                <circle cx={r2Pos.x} cy={r2Pos.y} r="26" fill="#7C3AED" />
                <circle cx={r2Pos.x} cy={r2Pos.y} r="22" fill="#F5F3FF" />
                <text x={r2Pos.x} y={r2Pos.y + 4} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#5B21B6">
                  R2
                </text>
                <text x={r2Pos.x} y={r2Pos.y + 44} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0F172A">
                  Core Router
                </text>
              </g>

              {/* E-Learning Server */}
              <g
                className="cursor-pointer"
                onClick={() =>
                  setActiveNode({
                    id: 'Server',
                    label: 'E-Learning LMS Server',
                    role: 'Central Courseware / Video Broadcast Host',
                    ip: '10.0.3.10/24',
                    interfaceDetails: 'High-speed Gigabit Ethernet Sink',
                    queue: 'Server Socket Buffer / TCP Sink Agent',
                  })
                }
              >
                <rect x={srvPos.x - 26} y={srvPos.y - 26} width="52" height="52" rx="8" fill="#10B981" />
                <rect x={srvPos.x - 22} y={srvPos.y - 22} width="44" height="44" rx="6" fill="#FFFFFF" />
                <text x={srvPos.x} y={srvPos.y + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#065F46">
                  LMS
                </text>
                <text x={srvPos.x} y={srvPos.y + 44} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0F172A">
                  E-Learning Host
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Node Inspector Drawer */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F1F5F9]">
            <Info className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">Node Inspector</h3>
          </div>

          {activeNode ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Node Identifier</span>
                <div className="text-sm font-bold text-[#0F172A] mt-0.5">{activeNode.label}</div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Functional Role</span>
                <div className="font-semibold text-blue-700 mt-0.5">{activeNode.role}</div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Network IP Address</span>
                <div className="font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200 mt-0.5 text-slate-800">
                  {activeNode.ip}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Interface & Links</span>
                <div className="text-slate-600 mt-0.5 leading-relaxed">{activeNode.interfaceDetails}</div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Queue Discipline</span>
                <div className="text-slate-600 mt-0.5 font-medium">{activeNode.queue}</div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Click on any node in the canvas to inspect details.</p>
          )}

          <div className="pt-4 border-t border-[#F1F5F9] text-[11px] text-slate-500">
            <p className="leading-relaxed">
              <strong>Campus Bottleneck Topology:</strong> All {studentCount} student nodes stream to Access Router R1 over 10Mbps links. The trunk link to Core Router R2 ({bottleneckBw}, 20ms) forms the laboratory bottleneck where queue overflow and congestion drops occur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
