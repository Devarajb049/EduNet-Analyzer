import {
  DashboardSummary,
  Experiment,
  SimulationConfig,
  SimulationStatusResponse,
  ComparisonResponse,
  SystemStatusResponse
} from '../types';
import { DEMO_EXPERIMENTS, DEMO_DASHBOARD_SUMMARY } from '../data/demoExperiments';

export const demoDataService = {
  /**
   * Retrieve the complete, self-contained Demo Dashboard Summary.
   * Completely offline, instant, zero external API calls.
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    // Clone to prevent accidental in-memory mutations
    return JSON.parse(JSON.stringify(DEMO_DASHBOARD_SUMMARY));
  },

  /**
   * Retrieve list of demo experiments with optional client-side filtering.
   */
  async getExperiments(params?: {
    protocol?: string;
    experiment_type?: string;
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<Experiment[]> {
    let filtered = JSON.parse(JSON.stringify(DEMO_EXPERIMENTS)) as Experiment[];

    if (params?.protocol) {
      filtered = filtered.filter(
        (e) => e.protocol.toUpperCase() === params.protocol?.toUpperCase()
      );
    }
    if (params?.experiment_type) {
      filtered = filtered.filter((e) => e.experiment_type === params.experiment_type);
    }
    if (params?.status) {
      filtered = filtered.filter(
        (e) => e.status.toUpperCase() === params.status?.toUpperCase()
      );
    }
    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.exp_code.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q))
      );
    }
    if (params?.limit && params.limit > 0) {
      filtered = filtered.slice(0, params.limit);
    }

    return filtered;
  },

  /**
   * Retrieve a specific demo experiment by ID or Code (e.g. 9 or "DEMO-009").
   * Never calls backend; throws explicit error if not found.
   */
  async getExperimentById(id: number | string): Promise<Experiment> {
    const numId = Number(id);
    const strId = String(id).toLowerCase().trim();

    const found = DEMO_EXPERIMENTS.find(
      (e) => e.id === numId || e.exp_code.toLowerCase() === strId
    );

    if (!found) {
      throw new Error(`Demo Experiment #${id} does not exist in the predefined demonstration dataset.`);
    }

    return JSON.parse(JSON.stringify(found));
  },

  /**
   * Instantly simulate a scenario in Demo Mode without executing NS-2.
   */
  async runSimulation(config: SimulationConfig): Promise<SimulationStatusResponse> {
    // Find closest matching predefined demo scenario
    const matched = DEMO_EXPERIMENTS.find(
      (e) =>
        e.users === config.users &&
        e.protocol === config.protocol
    ) || DEMO_EXPERIMENTS[0];

    return {
      id: matched.id,
      exp_code: matched.exp_code,
      status: 'COMPLETED',
      progress_percent: 100,
      current_stage: 'COMPLETED',
      stage_message: `[DEMO MODE] Instant execution of ${config.users}-user ${config.protocol} scenario loaded.`,
      logs: [
        `[DEMO MODE] Initializing predefined scenario for ${config.users} student nodes`,
        `[DEMO MODE] Applying calibrated network parameters (${config.protocol}, ${config.traffic_level})`,
        `[DEMO MODE] Loading pre-calculated trace telemetry and queue metrics`,
        `[DEMO MODE] Experiment ${matched.exp_code} loaded successfully with zero NS-2 dependency`
      ],
      error: null,
      result: matched.result ? JSON.parse(JSON.stringify(matched.result)) : null
    };
  },

  /**
   * Get simulation status for a demo experiment (instant completed).
   */
  async getSimulationStatus(id: number): Promise<SimulationStatusResponse> {
    const exp = await this.getExperimentById(id);
    return {
      id: exp.id,
      exp_code: exp.exp_code,
      status: 'COMPLETED',
      progress_percent: 100,
      current_stage: 'COMPLETED',
      stage_message: 'Demo scenario verification complete.',
      logs: [`Demo scenario ${exp.exp_code} active in memory`],
      error: null,
      result: exp.result || null
    };
  },

  /**
   * Retrieve demo simulation results.
   */
  async getSimulationResults(id: number): Promise<Experiment> {
    return this.getExperimentById(id);
  },

  /**
   * Compare multiple demo experiments.
   */
  async compareExperiments(ids: number[]): Promise<ComparisonResponse> {
    const selected = DEMO_EXPERIMENTS.filter((e) => ids.includes(e.id));
    if (selected.length < 2) {
      throw new Error('Please select at least two demo experiments for comparison.');
    }

    const metricsTable = selected.map((e) => ({
      id: e.id,
      exp_code: e.exp_code,
      name: e.name,
      protocol: e.protocol,
      users: e.users,
      traffic_level: e.traffic_level,
      throughput_kbps: e.result?.throughput_kbps || 0,
      packet_loss_percent: e.result?.packet_loss_percent || 0,
      pdr_percent: e.result?.packet_delivery_ratio || 0,
      average_delay_ms: e.result?.average_delay_ms || 0,
      packets_sent: e.result?.packets_sent || 0,
      packets_received: e.result?.packets_received || 0,
      packets_dropped: e.result?.packets_dropped || 0,
    }));

    return {
      experiments: selected,
      metrics_table: metricsTable,
      comparison_charts: {
        throughput: selected.map((e) => ({
          name: `${e.exp_code} (${e.protocol} — DEMO)`,
          throughput: e.result?.throughput_kbps || 0,
          users: e.users,
        })),
        loss: selected.map((e) => ({
          name: `${e.exp_code} (${e.protocol} — DEMO)`,
          loss: e.result?.packet_loss_percent || 0,
          users: e.users,
        })),
        delay: selected.map((e) => ({
          name: `${e.exp_code} (${e.protocol} — DEMO)`,
          delay: e.result?.average_delay_ms || 0,
          users: e.users,
        })),
        pdr: selected.map((e) => ({
          name: `${e.exp_code} (${e.protocol} — DEMO)`,
          pdr: e.result?.packet_delivery_ratio || 0,
          users: e.users,
        })),
      },
      analysis_summary: 'Comparative analysis derived from deterministic laboratory sample dataset. No NS-2 execution was required.',
    };
  },

  /**
   * Delete demo experiment (simulated local response).
   */
  async deleteExperiment(id: number): Promise<{ message: string; id: number }> {
    return {
      message: `Demo experiment #${id} removed from local session.`,
      id,
    };
  },

  /**
   * System status in Demo Mode (guaranteed offline readiness).
   */
  async getSystemStatus(): Promise<SystemStatusResponse> {
    return {
      ns2_installed: false,
      ns2_path: null,
      execution_mode: 'DEMO MODE (Sample Data)',
      wsl_detected: false,
      wsl_distro: null,
      python_version: '3.10+',
      db_connected: true,
      database_path: 'local:demoExperiments.ts',
      total_experiments: DEMO_EXPERIMENTS.length,
    };
  },

  getReportCsvUrl(id: number): string {
    return `/api/reports/${id}/csv?mode=demo`;
  },

  getReportPdfUrl(id: number): string {
    return `/api/reports/${id}/pdf?mode=demo`;
  }
};
