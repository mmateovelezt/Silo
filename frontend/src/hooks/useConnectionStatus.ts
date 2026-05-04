import { useState, useEffect, useRef, useCallback } from 'react';

export type ServiceStatus = 'connected' | 'disconnected' | 'checking';

export interface ConnectionState {
  /** Overall combined status */
  overall: 'connected' | 'partial' | 'disconnected' | 'connecting';
  /** Vercel API health */
  vercel: ServiceStatus;
  /** Python local bridge (WebSocket) */
  python: ServiceStatus;
  /** Human-readable label */
  label: string;
  /** Error detail when something fails */
  errorDetail: string | null;
}

const VERCEL_POLL_INTERVAL = 30_000;  // 30s
const PYTHON_PING_INTERVAL = 15_000; // 15s
const REQUEST_TIMEOUT = 3_000;       // 3s

/**
 * Hook that monitors the health of both the Vercel backend (via /api/health polling)
 * and the local Python bridge (via WebSocket ping/pong).
 */
export function useConnectionStatus(ws: WebSocket | null): ConnectionState {
  const [vercelStatus, setVercelStatus] = useState<ServiceStatus>('checking');
  const [pythonStatus, setPythonStatus] = useState<ServiceStatus>('checking');

  // Track pong responses
  const pongReceivedRef = useRef(false);

  // ── Vercel health polling ─────────────────────────────────────────────
  const checkVercel = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      // Determine base URL: in dev use current origin, in prod use the Vercel domain
      const baseUrl = window.location.origin;
      const resp = await fetch(`${baseUrl}/api/health`, { signal: controller.signal });
      clearTimeout(timeout);

      if (resp.ok) {
        setVercelStatus('connected');
      } else {
        setVercelStatus('disconnected');
      }
    } catch {
      setVercelStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    checkVercel(); // initial check
    const id = setInterval(checkVercel, VERCEL_POLL_INTERVAL);
    return () => clearInterval(id);
  }, [checkVercel]);

  // ── Python bridge ping/pong via existing WebSocket ────────────────────
  useEffect(() => {
    if (!ws) {
      setPythonStatus('checking');
      return;
    }

    const handleWsState = () => {
      if (ws.readyState === WebSocket.OPEN) {
        // Connection is open, but wait for pong to confirm alive
        setPythonStatus((prev) => (prev === 'checking' ? 'checking' : prev));
      } else if (ws.readyState === WebSocket.CONNECTING) {
        setPythonStatus('checking');
      } else {
        setPythonStatus('disconnected');
      }
    };

    // Intercept pong messages
    const pongListener = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') {
          pongReceivedRef.current = true;
          setPythonStatus('connected');
        }
      } catch {
        // Not JSON, ignore
      }
    };

    ws.addEventListener('message', pongListener);
    ws.addEventListener('close', () => setPythonStatus('disconnected'));
    ws.addEventListener('error', () => setPythonStatus('disconnected'));

    // Send ping periodically
    const sendPing = () => {
      if (ws.readyState === WebSocket.OPEN) {
        pongReceivedRef.current = false;
        ws.send(JSON.stringify({ type: 'ping' }));

        // If no pong received within timeout, mark as disconnected
        setTimeout(() => {
          if (!pongReceivedRef.current) {
            setPythonStatus('disconnected');
          }
        }, REQUEST_TIMEOUT);
      } else {
        handleWsState();
      }
    };

    // Initial ping shortly after mount
    const initialTimeout = setTimeout(sendPing, 500);
    const intervalId = setInterval(sendPing, PYTHON_PING_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
      ws.removeEventListener('message', pongListener);
    };
  }, [ws]);

  // ── Compute combined state ────────────────────────────────────────────
  const computeState = (): ConnectionState => {
    const isVercelOk = vercelStatus === 'connected';
    const isPythonOk = pythonStatus === 'connected';
    const isChecking = vercelStatus === 'checking' || pythonStatus === 'checking';

    if (isChecking && !isVercelOk && !isPythonOk) {
      return {
        overall: 'connecting',
        vercel: vercelStatus,
        python: pythonStatus,
        label: 'Connecting…',
        errorDetail: null,
      };
    }

    if (isVercelOk && isPythonOk) {
      return {
        overall: 'connected',
        vercel: vercelStatus,
        python: pythonStatus,
        label: 'All Systems Online',
        errorDetail: null,
      };
    }

    if (!isVercelOk && !isPythonOk) {
      return {
        overall: 'disconnected',
        vercel: vercelStatus,
        python: pythonStatus,
        label: 'Disconnected',
        errorDetail:
          'Cannot reach Vercel API or Python backend.\n\n' +
          '1. Check your internet connection.\n' +
          '2. Run start.bat or "python main.py" in the backend folder.\n' +
          '3. Verify the backend is running on port 8765.',
      };
    }

    // Partial
    if (!isPythonOk) {
      return {
        overall: 'partial',
        vercel: vercelStatus,
        python: pythonStatus,
        label: 'Python Bridge Offline',
        errorDetail:
          'The local Python backend is not responding.\n\n' +
          '1. Run start.bat or "python main.py" in the backend folder.\n' +
          '2. Ensure port 8765 is not blocked by a firewall.\n' +
          '3. Check backend terminal for errors.',
      };
    }

    return {
      overall: 'partial',
      vercel: vercelStatus,
      python: pythonStatus,
      label: 'Vercel API Unreachable',
      errorDetail:
        'The Vercel API is not responding.\n\n' +
        '1. Check your internet connection.\n' +
        '2. Verify the app is deployed at your Vercel URL.\n' +
        '3. If running locally, ensure npm run dev is active.',
    };
  };

  return computeState();
}
