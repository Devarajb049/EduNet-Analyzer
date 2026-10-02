import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { NewSimulation } from './pages/NewSimulation';
import { SimulationMonitor } from './pages/SimulationMonitor';
import { ExperimentResults } from './pages/ExperimentResults';
import { ExperimentHistory } from './pages/ExperimentHistory';
import { ExperimentComparison } from './pages/ExperimentComparison';
import { PerformanceAnalysis } from './pages/PerformanceAnalysis';
import { TcpUdpComparison } from './pages/TcpUdpComparison';
import { CongestionAnalysis } from './pages/CongestionAnalysis';
import { SlidingWindow } from './pages/SlidingWindow';
import { GoBackN } from './pages/GoBackN';
import { LeakyBucket } from './pages/LeakyBucket';
import { NetworkTopology } from './pages/NetworkTopology';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Ns2Setup } from './pages/Ns2Setup';

import { SimulationModeProvider } from './context/SimulationModeContext';

export const App: React.FC = () => {
  return (
    <SimulationModeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            {/* Dashboard */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Simulation Routes */}
            <Route path="/simulation/new" element={<NewSimulation />} />
            <Route path="/simulate" element={<Navigate to="/simulation/new" replace />} />
            <Route path="/simulation/monitor" element={<SimulationMonitor />} />
            <Route path="/simulation/:id" element={<SimulationMonitor />} />
            <Route path="/monitor" element={<Navigate to="/simulation/monitor" replace />} />

            {/* Experiments & Results */}
            <Route path="/experiments" element={<ExperimentHistory />} />
            <Route path="/experiments/:id" element={<ExperimentResults />} />

            {/* Analysis Routes */}
            <Route path="/comparison" element={<ExperimentComparison />} />
            <Route path="/compare" element={<Navigate to="/comparison" replace />} />
            <Route path="/performance" element={<PerformanceAnalysis />} />
            <Route path="/tcp-udp" element={<TcpUdpComparison />} />
            <Route path="/congestion" element={<CongestionAnalysis />} />

            {/* Reliable Transmission Routes */}
            <Route path="/sliding-window" element={<SlidingWindow />} />
            <Route path="/go-back-n" element={<GoBackN />} />
            <Route path="/reliable-transmission" element={<Navigate to="/sliding-window" replace />} />

            {/* Traffic Control */}
            <Route path="/leaky-bucket" element={<LeakyBucket />} />

            {/* Network Visualization */}
            <Route path="/network" element={<NetworkTopology />} />
            <Route path="/topology" element={<Navigate to="/network" replace />} />

            {/* Reports */}
            <Route path="/reports" element={<Reports />} />

            {/* Settings & Setup */}
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/ns2" element={<Ns2Setup />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SimulationModeProvider>
  );
};

export default App;
