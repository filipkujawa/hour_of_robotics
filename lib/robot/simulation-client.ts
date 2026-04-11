/**
 * Client for the Python-based Rerun simulation service.
 */

interface BlockData {
  type: string;
  fields: Record<string, any>;
  inputs: Record<string, any>;
  next: any | null;
}

export interface SimulationResult {
  sessionId: string;
  rerunUrl: string;
}

export class SimulationClient {
  private baseUrl: string;
  private sessionId: string | null = null;

  constructor(baseUrl: string = "http://localhost:8000") {
    this.baseUrl = baseUrl;
  }

  /**
   * Send the current workspace blocks to the simulation backend.
   * Returns the URL of the Rerun stream.
   */
  async simulate(blocks: BlockData[]): Promise<SimulationResult> {
    const response = await fetch(`${this.baseUrl}/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: this.sessionId,
        blocks: blocks,
      }),
    });

    if (!response.ok) {
      throw new Error(`Simulation failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.sessionId = data.session_id;

    return {
      sessionId: data.session_id,
      rerunUrl: data.rerun_url,
    };
  }

  getSessionId() {
    return this.sessionId;
  }
}

// Export a singleton instance
export const simulationClient = new SimulationClient();
