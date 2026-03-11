import { useEffect, useRef, useCallback } from 'react';
import { useSidecarStore } from '../store/store';

export function useWebSocket(url: string = 'ws://localhost:3577') {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const { setConnected, processEvent } = useSidecarStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('Sidecar connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        processEvent(data);
      } catch (e) {
        console.error('Failed to parse event:', e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Reconnect after 2 seconds
      reconnectTimeout.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url, setConnected, processEvent]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return wsRef;
}
