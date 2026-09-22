import { dataService } from './dataService';
import { Experiment, SimulationConfig, ComparisonResponse, DashboardSummary } from '../types';
import { SimulationMode } from '../context/SimulationModeContext';

export const experimentService = {
  /**
   * Retrieve list of experiments using the centralized mode-aware dataService.
   */
  async getExperiments(params?: {
    mode?: 'demo' | 'realtime' | 'DEMO' | 'LIVE';
    protocol?: string;
    experiment_type?: string;
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<Experiment[]> {
    let mode: SimulationMode | undefined = undefined;
    if (params?.mode) {
      mode = params.mode.toLowerCase() === 'demo' ? 'demo' : 'realtime';
    }
    return dataService.getExperiments(params, mode);
  },

  /**
   * Retrieve a specific experiment by ID using the centralized mode-aware dataService.
   */
  async getExperimentById(id: number | string, mode?: 'demo' | 'realtime' | 'DEMO' | 'LIVE'): Promise<Experiment> {
    const normalizedMode: SimulationMode | undefined = mode
      ? mode.toLowerCase() === 'demo'
        ? 'demo'
        : 'realtime'
      : undefined;
    return dataService.getExperimentById(id, normalizedMode);
  },

  /**
   * Create and trigger a simulation.
   */
  async createExperiment(data: SimulationConfig, mode?: SimulationMode) {
    return dataService.runSimulation(data, mode);
  },

  /**
   * Delete an experiment by ID.
   */
  async deleteExperiment(id: number, mode?: SimulationMode): Promise<{ message: string; id: number }> {
    return dataService.deleteExperiment(id, mode);
  },

  /**
   * Compare multiple experiments by ID.
   */
  async compareExperiments(ids: number[], mode?: SimulationMode): Promise<ComparisonResponse> {
    return dataService.compareExperiments(ids, mode);
  },

  /**
   * Get demo summary dataset.
   */
  async getDemoDashboardSummary(): Promise<DashboardSummary> {
    return dataService.getDashboardSummary('demo');
  },
};
