import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { NewSimulation } from './pages/NewSimulation';
import { SimulationMonitor } from './pages/SimulationMonitor';
import { ExperimentResults } from './pages/ExperimentResults';
import { ExperimentHistory } from './pages/ExperimentHistory';
import { ExperimentComparison } from './pages/ExperimentComparison';
import { NetworkTopology } from './pages/NetworkTopology';
import { ReliableTransmission } from './pages/ReliableTransmission';
import { CongestionAnalysis } from './pages/CongestionAnalysis';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

import { SimulationModeProvider } from './context/SimulationModeContext';

export const App: React.FC = () => {
  return (
    <SimulationModeProvider>
      <BrowserRouter>
        <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/simulate" element={<NewSimulation />} />
          <Route path="/monitor" element={<SimulationMonitor />} />
          <Route path="/experiments" element={<ExperimentHistory />} />
          <Route path="/experiments/:id" element={<ExperimentResults />} />
          <Route path="/compare" element={<ExperimentComparison />} />
          <Route path="/topology" element={<NetworkTopology />} />
          <Route path="/reliable-transmission" element={<ReliableTransmission />} />
          <Route path="/congestion" element={<CongestionAnalysis />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </SimulationModeProvider>
);
};

export default App;
