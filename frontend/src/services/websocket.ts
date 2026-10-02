/**
 * WebSocket Client Service for EduNet Analyzer
 * Provides real-time streaming for simulation progress, stage transitions, and telemetry.
 */

export function getWebSocketBaseUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  const loc = window.location;
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  // In development, Vite runs on 5173, backend on 8000
  if (loc.port === '5173') {
    return `${protocol}//127.0.0.1:8000/api/simulations`;
  }
  return `${protocol}//${loc.host}/api/simulations`;
}

export function subscribeSimulationStream(
  experimentId: number,
  callbacks: {
    onMessage: (data: any) => void;
    onError?: (error: any) => void;
    onClose?: () => void;
    onOpen?: () => void;
  }
): () => void {
  const wsUrl = `${getWebSocketBaseUrl()}/ws/${experimentId}`;
  let ws: WebSocket | null = null;
  let heartbeatId: any = null;
  let closedManually = false;

  function connect() {
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        callbacks.onOpen?.();
        // Send heartbeat every 5 seconds
        heartbeatId = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 5000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const payload = JSON.parse(event.data);
          callbacks.onMessage(payload);
        } catch (e) {
          // Non-JSON message or raw text
        }
      };

      ws.onerror = (err) => {
        callbacks.onError?.(err);
      };

      ws.onclose = () => {
        if (heartbeatId) clearInterval(heartbeatId);
        callbacks.onClose?.();
        // Attempt reconnect if not manually closed and still pending
        if (!closedManually) {
          setTimeout(() => {
            if (!closedManually) connect();
          }, 2000);
        }
      };
    } catch (err) {
      callbacks.onError?.(err);
    }
  }

  connect();

  // Return unsubscribe cleanup function
  return () => {
    closedManually = true;
    if (heartbeatId) clearInterval(heartbeatId);
    if (ws) {
      ws.close();
      ws = null;
    }
  };
}

export function subscribeGlobalTelemetry(
  onEvent: (event: any) => void
): () => void {
  const wsUrl = `${getWebSocketBaseUrl()}/ws/global/telemetry`;
  let ws: WebSocket | null = null;
  let heartbeatId: any = null;
  let closedManually = false;

  function connect() {
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        heartbeatId = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 5000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const payload = JSON.parse(event.data);
          onEvent(payload);
        } catch (e) {
          // ignore
        }
      };

      ws.onclose = () => {
        if (heartbeatId) clearInterval(heartbeatId);
        if (!closedManually) {
          setTimeout(() => {
            if (!closedManually) connect();
          }, 3000);
        }
      };
    } catch (err) {
      // ignore
    }
  }

  connect();

  return () => {
    closedManually = true;
    if (heartbeatId) clearInterval(heartbeatId);
    if (ws) {
      ws.close();
      ws = null;
    }
  };
}
