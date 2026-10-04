import { useState, useEffect, useRef } from "react";

export type ConnectionQuality = "excellent" | "good" | "fair" | "poor" | "offline";

export interface LatencyTelemetry {
  latency: number | null; // in milliseconds
  jitter: number; // in milliseconds
  status: "connected" | "connecting" | "disconnected";
  quality: ConnectionQuality;
  bars: number; // 0 to 4
  nodeName: string;
  lastPingTime: number | null;
}

export function useWebSocketLatency(pingIntervalMs = 2500): LatencyTelemetry {
  const [latency, setLatency] = useState<number | null>(null);
  const [jitter, setJitter] = useState<number>(0);
  const [status, setStatus] = useState<"connected" | "connecting" | "disconnected">("connecting");
  const [lastPingTime, setLastPingTime] = useState<number | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pingTimeoutRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const lastPingTimestampRef = useRef<number | null>(null);
  const previousLatenciesRef = useRef<number[]>([]);
  const isUnmountedRef = useRef<boolean>(false);

  useEffect(() => {
    isUnmountedRef.current = false;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;

    function sendPing() {
      if (isUnmountedRef.current) return;
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        const now = performance.now();
        lastPingTimestampRef.current = now;
        try {
          socketRef.current.send(JSON.stringify({ type: "LATENCY_PING", timestamp: now }));
        } catch {}
      }
    }

    function connect() {
      if (isUnmountedRef.current) return;
      clearTimeout(reconnectTimeoutRef.current);
      setStatus("connecting");

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (isUnmountedRef.current) {
            ws.close();
            return;
          }
          setStatus("connected");
          sendPing();
        };

        ws.onmessage = (event) => {
          if (isUnmountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === "PONG" && typeof data.timestamp === "number") {
              const rtt = Math.max(1, Math.round(performance.now() - data.timestamp));
              
              setLatency((prev) => {
                if (prev === null) return rtt;
                // Exponential moving average for smooth display without jitter
                return Math.round(prev * 0.4 + rtt * 0.6);
              });

              setLastPingTime(Date.now());

              // Calculate jitter
              const history = previousLatenciesRef.current;
              history.push(rtt);
              if (history.length > 8) history.shift();
              if (history.length >= 2) {
                const diffs = [];
                for (let i = 1; i < history.length; i++) {
                  diffs.push(Math.abs(history[i] - history[i - 1]));
                }
                const avgDiff = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
                setJitter(avgDiff);
              }

              // Schedule next ping
              clearTimeout(pingTimeoutRef.current);
              pingTimeoutRef.current = setTimeout(sendPing, pingIntervalMs);
            }
          } catch {}
        };

        ws.onerror = () => {
          if (isUnmountedRef.current) return;
          setStatus("disconnected");
        };

        ws.onclose = () => {
          if (isUnmountedRef.current) return;
          setStatus("disconnected");
          setLatency(null);
          clearTimeout(pingTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };
      } catch {
        setStatus("disconnected");
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      isUnmountedRef.current = true;
      clearTimeout(pingTimeoutRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [pingIntervalMs]);

  // Derive connection quality and signal bars
  let quality: ConnectionQuality = "offline";
  let bars = 0;

  if (status === "connected" && latency !== null) {
    if (latency <= 55) {
      quality = "excellent";
      bars = 4;
    } else if (latency <= 120) {
      quality = "good";
      bars = 3;
    } else if (latency <= 220) {
      quality = "fair";
      bars = 2;
    } else {
      quality = "poor";
      bars = 1;
    }
  } else if (status === "connecting") {
    quality = "fair";
    bars = 1;
  } else {
    quality = "offline";
    bars = 0;
  }

  return {
    latency,
    jitter,
    status,
    quality,
    bars,
    nodeName: "AP-SOUTH-1 (Primary Edge)",
    lastPingTime,
  };
}
