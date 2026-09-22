import { useMemo } from 'react';
import {
  DashboardSummary,
  Experiment,
  SimulationConfig,
  SimulationStatusResponse,
  ComparisonResponse,
  SystemStatusResponse
} from '../types';
import { SimulationMode, useSimulationMode } from '../context/SimulationModeContext';
import { demoDataService } from './demoDataService';
import { realtimeDataService } from './realtimeDataService';

export interface IDataService {
  getDashboardSummary(): Promise<DashboardSummary>;
  getExperiments(params?: {
    protocol?: string;
    experiment_type?: string;
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<Experiment[]>;
  getExperimentById(id: number | string): Promise<Experiment>;
  runSimulation(config: SimulationConfig): Promise<SimulationStatusResponse>;
  getSimulationStatus(id: number): Promise<SimulationStatusResponse>;
  getSimulationResults(id: number): Promise<Experiment>;
  compareExperiments(ids: number[]): Promise<ComparisonResponse>;
  deleteExperiment(id: number): Promise<{ message: string; id: number }>;
  getSystemStatus(): Promise<SystemStatusResponse>;
  getReportCsvUrl(id: number): string;
  getReportPdfUrl(id: number): string;
}

/**
 * Factory function to retrieve the appropriate data service based on the specified mode.
 * Guarantees zero cross-contamination between Demo and Real-Time data layers.
 */
export function getDataService(mode: SimulationMode): IDataService {
  if (mode === 'demo') {
    return demoDataService;
  }
  return realtimeDataService;
}

/**
 * Retrieve current active mode from localStorage (fallback to 'demo')
 */
export function getCurrentActiveMode(): SimulationMode {
  const saved = localStorage.getItem('edunet-mode') || localStorage.getItem('edunet_analyzer_mode');
  if (saved === 'realtime' || saved === 'LIVE' || saved === 'live') {
    return 'realtime';
  }
  return 'demo';
}

/**
 * React Hook that provides the mode-aware data service directly bound
 * to the currently active application mode from SimulationModeContext.
 */
export function useDataService(): IDataService & { mode: SimulationMode; isDemo: boolean; isRealtime: boolean } {
  const { mode, isDemo, isRealtime } = useSimulationMode();

  const service = useMemo<IDataService>(() => {
    return getDataService(mode);
  }, [mode]);

  return {
    ...service,
    mode,
    isDemo,
    isRealtime,
  };
}

/**
 * Centralized Data Service Facade
 * Allows components to call data methods directly, using active mode or an explicit override.
 */
export const dataService = {
  getDashboardSummary(mode?: SimulationMode): Promise<DashboardSummary> {
    const activeMode = mode || getCurrentActiveMode();
    return getDataService(activeMode).getDashboardSummary();
  },

  getExperiments(
    params?: {
      protocol?: string;
      experiment_type?: string;
      status?: string;
      search?: string;
      limit?: number;
    },
    mode?: SimulationMode
  ): Promise<Experiment[]> {
    const activeMode = mode || getCurrentActiveMode();
    return getDataService(activeMode).getExperiments(params);
  },

  getExperimentById(id: number | string, mode?: SimulationMode): Promise<Experiment> {
    const activeMode = mode || getCurrentActiveMode();
    return getDataService(activeMode).getExperimentById(id);
  },

  runSimulation(config: SimulationConfig, mode?: SimulationMode): Promise<SimulationStatusResponse> {
    const activeMode = mode || getCurrentActiveMode();
    return getDataService(activeMode).runSimulation(config);
  },

  getSimulationStatus(id: number, mode?: SimulationMode): Promise<SimulationStatusResponse> {
    const activeMode = mode || getCurrentActiveMode();
    return getDataService(activeMode).getSimulationStatus(id);
  },

  getSimulationResults(id: number, mode?: SimulationMode): Promise<Experiment> {
    const activeMode = mode || getCurrentActiveMode();
    return getDataService(activeMode).getSimulationResults(id);
  },

  compareExperiments(ids: number[], mode?: SimulationMode): Promise<ComparisonResponse> {
    const activeMode = mode || getCurrentActiveMode();
    return getDataService(activeMode).compareExperiments(ids);
  },

  deleteExperiment(id: number, mode?: SimulationMode): Promise<{ message: string; id: number }> {
    const activeMode = mode || getCurrentActiveMode();
    return getDataService(activeMode).deleteExperiment(id);
  },

  getSystemStatus(mode?: SimulationMode): Promise<SystemStatusResponse> {
    const activeMode = mode || getCurrentActiveMode();
    return getDataService(activeMode).getSystemStatus();
  },

  getReportCsvUrl(id: number, mode?: SimulationMode): string {
    const activeMode = mode || getCurrentActiveMode();
    return getDataService(activeMode).getReportCsvUrl(id);
  },

  getReportPdfUrl(id: number, mode?: SimulationMode): string {
    const activeMode = mode || getCurrentActiveMode();
    return getDataService(activeMode).getReportPdfUrl(id);
  },
};
