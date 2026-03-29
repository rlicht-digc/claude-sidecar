import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  tabId: string | null;
  isActive: boolean;
}

const THEME = {
  background: '#0d1117',
  foreground: '#e6edf3',
  cursor: '#58a6ff',
  cursorAccent: '#0d1117',
  selectionBackground: '#264f78',
  selectionForeground: '#e6edf3',
  black: '#484f58',
  red: '#ff7b72',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39d2c0',
  white: '#e6edf3',
  brightBlack: '#6e7681',
  brightRed: '#ffa198',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd',
  brightWhite: '#f0f6fc',
};

export function Terminal({ tabId, isActive }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const cleanupRef = useRef<Array<() => void>>([]);

  const initTerminal = useCallback(() => {
    if (!containerRef.current || !tabId || !window.terminalSaddle) return;

    // Clean up previous instance
    if (termRef.current) {
      termRef.current.dispose();
      termRef.current = null;
    }
    for (const cleanup of cleanupRef.current) cleanup();
    cleanupRef.current = [];

    const term = new XTerm({
      theme: THEME,
      fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Send terminal input to PTY via IPC
    const inputDisposable = term.onData((data) => {
      window.terminalSaddle!.terminal.write(tabId, data);
    });

    // Receive PTY output via IPC
    const unsubData = window.terminalSaddle.terminal.onData((id, data) => {
      if (id === tabId && termRef.current) {
        termRef.current.write(data);
      }
    });

    // Handle PTY exit
    const unsubExit = window.terminalSaddle.terminal.onExit((id, exitCode) => {
      if (id === tabId && termRef.current) {
        termRef.current.write(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
      }
    });

    // Send initial resize
    const { cols, rows } = fitAddon.proposeDimensions() || { cols: 120, rows: 30 };
    window.terminalSaddle.terminal.resize(tabId, cols, rows);

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && termRef.current) {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims && tabId) {
          window.terminalSaddle?.terminal.resize(tabId, dims.cols, dims.rows);
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    cleanupRef.current = [
      () => inputDisposable.dispose(),
      unsubData,
      unsubExit,
      () => resizeObserver.disconnect(),
    ];
  }, [tabId]);

  useEffect(() => {
    initTerminal();
    return () => {
      for (const cleanup of cleanupRef.current) cleanup();
      cleanupRef.current = [];
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
    };
  }, [initTerminal]);

  // Re-fit when tab becomes active
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 50);
    }
  }, [isActive]);

  // Focus terminal when active
  useEffect(() => {
    if (isActive && termRef.current) {
      termRef.current.focus();
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: isActive ? 'block' : 'none',
        background: '#0d1117',
      }}
    />
  );
}
