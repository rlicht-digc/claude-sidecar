import { useEffect, useRef } from 'react';
import { useSidecarStore } from '../store/store';

const isElectron = typeof window !== 'undefined' && !!window.terminalSaddle;

/**
 * In Electron: listens for IPC sidecar events.
 * In browser: connects via WebSocket to localhost:3577.
 */
export function useEventBridge() {
  const { setConnected, processEvent } = useSidecarStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isElectron) {
      // IPC bridge
      setConnected(true);
      console.log('Terminal Saddle: connected via IPC');

      const unsub = window.terminalSaddle!.onSidecarEvent((event) => {
        processEvent(event);
      });

      return () => {
        unsub();
        setConnected(false);
      };
    } else {
      // WebSocket fallback for browser mode
      function connect() {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        const ws = new WebSocket('ws://localhost:3577');
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          console.log('Sidecar connected via WebSocket');
        };
        ws.onmessage = (event) => {
          try {
            processEvent(JSON.parse(event.data));
          } catch {}
        };
        ws.onclose = () => {
          setConnected(false);
          wsRef.current = null;
          reconnectRef.current = setTimeout(connect, 2000);
        };
        ws.onerror = () => ws.close();
      }

      connect();
      return () => {
        clearTimeout(reconnectRef.current);
        wsRef.current?.close();
      };
    }
  }, [setConnected, processEvent]);

  return { isElectron };
}
