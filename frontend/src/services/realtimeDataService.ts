import {
  DashboardSummary,
  Experiment,
  SimulationConfig,
  SimulationStatusResponse,
  ComparisonResponse,
  SystemStatusResponse
} from '../types';

const API_BASE = '/api';

export const realtimeDataService = {
  /**
   * Fetch Dashboard Summary for Real-Time Mode.
   * Strictly requests real NS-2 simulation metrics and rejects demo data.
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/dashboard/summary?mode=realtime`);
    if (!res.ok) {
      throw new Error(`Failed to load Real-Time dashboard summary (HTTP ${res.status}). Ensure backend simulation service is running.`);
    }
    const data = await res.json();
    return data;
  },

  /**
   * Fetch only real-time experiments from backend database.
   */
  async getExperiments(params?: {
    protocol?: string;
    experiment_type?: string;
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<Experiment[]> {
    const query = new URLSearchParams();
    query.set('mode', 'realtime');
    if (params?.protocol) query.set('protocol', params.protocol);
    if (params?.experiment_type) query.set('experiment_type', params.experiment_type);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/experiments?${query.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch real-time experiments (${res.status})`);
    }
    const data: Experiment[] = await res.json();
    // Extra safety guarantee: never include demo runs in real-time mode
    return data.filter((e) => !e.is_demo);
  },

  /**
   * Retrieve a specific real-time experiment by ID.
   * NEVER silently falls back to demo data. If not found in real DB, throws 404 error.
   */
  async getExperimentById(id: number | string): Promise<Experiment> {
    const numId = Number(id);
    if (isNaN(numId)) {
      throw new Error(`Invalid experiment identifier: ${id}`);
    }

    const res = await fetch(`${API_BASE}/experiments/${numId}?mode=realtime`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Experiment #${numId} was not found in the live NS-2 database.`);
      }
      throw new Error(`Failed to fetch experiment #${numId} from server (HTTP ${res.status}).`);
    }
    const data: Experiment = await res.json();
    if (data.is_demo) {
      throw new Error(`Experiment #${numId} is a demonstration record and cannot be loaded in Real-Time Mode.`);
    }
    return data;
  },

  /**
   * Trigger an actual NS-2 simulation run.
   * Strictly enforces force_demo = false.
   */
  async runSimulation(config: SimulationConfig): Promise<SimulationStatusResponse> {
    const payload: SimulationConfig = {
      ...config,
      force_demo: false, // Strictly false in Real-Time Mode
    };

    const res = await fetch(`${API_BASE}/simulations/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(
        errBody.detail ||
        `Real-Time Simulation Failed (HTTP ${res.status}). Actual NS-2 results could not be generated. Check NS-2 configuration and try again.`
      );
    }

    return res.json();
  },

  /**
   * Get simulation execution status.
   */
  async getSimulationStatus(id: number): Promise<SimulationStatusResponse> {
    const res = await fetch(`${API_BASE}/simulations/${id}/status`);
    if (!res.ok) {
      throw new Error(`Failed to fetch simulation status for #${id} (${res.status})`);
    }
    return res.json();
  },

  /**
   * Get completed simulation results.
   */
  async getSimulationResults(id: number): Promise<Experiment> {
    const res = await fetch(`${API_BASE}/simulations/${id}/results`);
    if (!res.ok) {
      throw new Error(`Failed to fetch simulation results for #${id} (${res.status})`);
    }
    const data: Experiment = await res.json();
    if (data.is_demo) {
      throw new Error(`Simulation #${id} returned a demo record in Real-Time Mode.`);
    }
    return data;
  },

  /**
   * Compare real experiments in the database.
   */
  async compareExperiments(ids: number[]): Promise<ComparisonResponse> {
    const res = await fetch(`${API_BASE}/experiments/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experiment_ids: ids }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `Failed to compare live experiments (${res.status})`);
    }

    const data: ComparisonResponse = await res.json();
    // Ensure chart labels explicitly state LIVE NS-2
    data.comparison_charts.throughput = data.comparison_charts.throughput.map((c) => ({
      ...c,
      name: c.name.includes('LIVE') ? c.name : `${c.name} — LIVE NS-2`,
    }));
    data.comparison_charts.loss = data.comparison_charts.loss.map((c) => ({
      ...c,
      name: c.name.includes('LIVE') ? c.name : `${c.name} — LIVE NS-2`,
    }));
    data.comparison_charts.delay = data.comparison_charts.delay.map((c) => ({
      ...c,
      name: c.name.includes('LIVE') ? c.name : `${c.name} — LIVE NS-2`,
    }));
    data.comparison_charts.pdr = data.comparison_charts.pdr.map((c) => ({
      ...c,
      name: c.name.includes('LIVE') ? c.name : `${c.name} — LIVE NS-2`,
    }));

    return data;
  },

  /**
   * Delete an experiment from the database.
   */
  async deleteExperiment(id: number): Promise<{ message: string; id: number }> {
    const res = await fetch(`${API_BASE}/experiments/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Failed to delete experiment #${id} (${res.status})`);
    }
    return res.json();
  },

  /**
   * Get live system diagnostics.
   */
  async getSystemStatus(): Promise<SystemStatusResponse> {
    const res = await fetch(`${API_BASE}/system/status`);
    if (!res.ok) {
      throw new Error(`Failed to fetch system status (${res.status})`);
    }
    return res.json();
  },

  getReportCsvUrl(id: number): string {
    return `${API_BASE}/reports/${id}/csv?mode=realtime`;
  },

  getReportPdfUrl(id: number): string {
    return `${API_BASE}/reports/${id}/pdf?mode=realtime`;
  }
};
