import {
  DashboardSummary,
  Experiment,
  SimulationConfig,
  SimulationStatusResponse,
  ComparisonResponse,
  SystemStatusResponse
} from '../types';

const API_BASE = '/api';

export const api = {
  async getDashboardSummary(mode?: string): Promise<DashboardSummary> {
    const url = mode ? `${API_BASE}/dashboard/summary?mode=${encodeURIComponent(mode)}` : `${API_BASE}/dashboard/summary`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch dashboard summary (${res.status})`);
    return res.json();
  },

  async getExperiments(params?: {
    protocol?: string;
    experiment_type?: string;
    status?: string;
    search?: string;
    mode?: string;
    limit?: number;
  }): Promise<Experiment[]> {
    const query = new URLSearchParams();
    if (params?.mode) query.set('mode', params.mode);
    if (params?.protocol) query.set('protocol', params.protocol);
    if (params?.experiment_type) query.set('experiment_type', params.experiment_type);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/experiments?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch experiments (${res.status})`);
    return res.json();
  },

  async getExperimentById(id: number, mode?: string): Promise<Experiment> {
    const url = mode ? `${API_BASE}/experiments/${id}?mode=${encodeURIComponent(mode)}` : `${API_BASE}/experiments/${id}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch experiment ${id} (${res.status})`);
    return res.json();
  },

  async deleteExperiment(id: number): Promise<{ message: string; id: number }> {
    const res = await fetch(`${API_BASE}/experiments/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete experiment ${id} (${res.status})`);
    return res.json();
  },

  async runSimulation(config: SimulationConfig): Promise<SimulationStatusResponse> {
    const res = await fetch(`${API_BASE}/simulations/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`Failed to initiate simulation (${res.status})`);
    return res.json();
  },

  async getSimulationStatus(id: number): Promise<SimulationStatusResponse> {
    const res = await fetch(`${API_BASE}/simulations/${id}/status`);
    if (!res.ok) throw new Error(`Failed to fetch simulation status (${res.status})`);
    return res.json();
  },

  async getSimulationResults(id: number): Promise<Experiment> {
    const res = await fetch(`${API_BASE}/simulations/${id}/results`);
    if (!res.ok) throw new Error(`Failed to fetch simulation results (${res.status})`);
    return res.json();
  },

  async compareExperiments(experiment_ids: number[]): Promise<ComparisonResponse> {
    const res = await fetch(`${API_BASE}/experiments/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experiment_ids }),
    });
    if (!res.ok) throw new Error(`Failed to compare experiments (${res.status})`);
    return res.json();
  },

  async getSystemStatus(): Promise<SystemStatusResponse> {
    const res = await fetch(`${API_BASE}/system/status`);
    if (!res.ok) throw new Error(`Failed to fetch system status (${res.status})`);
    return res.json();
  },

  async seedSystemData(force: boolean = false): Promise<{ message: string; total_experiments: number }> {
    const res = await fetch(`${API_BASE}/system/seed?force=${force}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Failed to seed sample data (${res.status})`);
    return res.json();
  },

  getReportCsvUrl(id: number): string {
    return `${API_BASE}/reports/${id}/csv`;
  },

  getReportPdfUrl(id: number): string {
    return `${API_BASE}/reports/${id}/pdf`;
  },
};
