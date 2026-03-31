import { contextBridge, ipcRenderer } from 'electron';

// Expose a secure API to the renderer process
contextBridge.exposeInMainWorld('terminalSaddle', {
  // Sidecar events (from hooks)
  onSidecarEvent: (callback: (event: any) => void) => {
    const handler = (_: any, event: any) => callback(event);
    ipcRenderer.on('sidecar:event', handler);
    return () => ipcRenderer.removeListener('sidecar:event', handler);
  },

  // Terminal management
  terminal: {
    create: (options: { cwd?: string; shell?: string }) =>
      ipcRenderer.invoke('terminal:create', options),
    write: (tabId: string, data: string) =>
      ipcRenderer.send('terminal:write', tabId, data),
    resize: (tabId: string, cols: number, rows: number) =>
      ipcRenderer.send('terminal:resize', tabId, cols, rows),
    getSnapshot: (tabId: string) =>
      ipcRenderer.invoke('terminal:getSnapshot', tabId),
    close: (tabId: string) =>
      ipcRenderer.invoke('terminal:close', tabId),
    onData: (callback: (tabId: string, data: string) => void) => {
      const handler = (_: any, tabId: string, data: string) => callback(tabId, data);
      ipcRenderer.on('terminal:data', handler);
      return () => ipcRenderer.removeListener('terminal:data', handler);
    },
    onExit: (callback: (tabId: string, exitCode: number) => void) => {
      const handler = (_: any, tabId: string, exitCode: number) => callback(tabId, exitCode);
      ipcRenderer.on('terminal:exit', handler);
      return () => ipcRenderer.removeListener('terminal:exit', handler);
    },
  },

  // Session persistence
  sessions: {
    list: (filter?: { archived?: boolean; starred?: boolean }) =>
      ipcRenderer.invoke('sessions:list', filter),
    get: (id: string) =>
      ipcRenderer.invoke('sessions:get', id),
    create: (meta: any) =>
      ipcRenderer.invoke('sessions:create', meta),
    update: (id: string, patch: any) =>
      ipcRenderer.invoke('sessions:update', id, patch),
    rename: (id: string, name: string) =>
      ipcRenderer.invoke('sessions:rename', id, name),
    star: (id: string, starred: boolean) =>
      ipcRenderer.invoke('sessions:star', id, starred),
    archive: (id: string) =>
      ipcRenderer.invoke('sessions:archive', id),
    delete: (id: string) =>
      ipcRenderer.invoke('sessions:delete', id),
    getTranscript: (id: string, options?: { tail?: number }) =>
      ipcRenderer.invoke('sessions:getTranscript', id, options),
  },

  // AI Chat
  ai: {
    configure: (config: { apiKey?: string; model?: string }) =>
      ipcRenderer.invoke('ai:configure', config),
    getConfig: () =>
      ipcRenderer.invoke('ai:getConfig'),
    chat: (message: string, context?: { projectContext?: string; recentActivity?: string }) =>
      ipcRenderer.invoke('ai:chat', message, context),
    stop: () =>
      ipcRenderer.invoke('ai:stop'),
    history: () =>
      ipcRenderer.invoke('ai:history'),
    clearHistory: () =>
      ipcRenderer.invoke('ai:clearHistory'),
    explain: (prompt: string) =>
      ipcRenderer.invoke('ai:explain', prompt) as Promise<{ ok: boolean; text?: string; error?: string }>,
    onStream: (callback: (chunk: any) => void) => {
      const handler = (_: any, chunk: any) => callback(chunk);
      ipcRenderer.on('ai:stream', handler);
      return () => ipcRenderer.removeListener('ai:stream', handler);
    },
    onToolResult: (callback: (result: any) => void) => {
      const handler = (_: any, result: any) => callback(result);
      ipcRenderer.on('ai:toolResult', handler);
      return () => ipcRenderer.removeListener('ai:toolResult', handler);
    },
  },

  // MCP Server Management
  mcp: {
    connect: (config: { name: string; command: string; args?: string[]; env?: Record<string, string> }) =>
      ipcRenderer.invoke('mcp:connect', config),
    disconnect: (name: string) =>
      ipcRenderer.invoke('mcp:disconnect', name),
    listServers: () =>
      ipcRenderer.invoke('mcp:listServers'),
    listTools: () =>
      ipcRenderer.invoke('mcp:listTools'),
  },

  // System
  system: {
    detectCLIs: () => ipcRenderer.invoke('system:detectCLIs'),
  },

  // Platform info
  platform: process.platform,
});

// Type declaration for the renderer
export interface TerminalSaddleAPI {
  onSidecarEvent: (callback: (event: any) => void) => () => void;
  terminal: {
    create: (options: { cwd?: string; shell?: string }) => Promise<{ tabId: string; sessionId: string }>;
    write: (tabId: string, data: string) => void;
    resize: (tabId: string, cols: number, rows: number) => void;
    getSnapshot: (tabId: string) => Promise<string>;
    close: (tabId: string) => Promise<void>;
    onData: (callback: (tabId: string, data: string) => void) => () => void;
    onExit: (callback: (tabId: string, exitCode: number) => void) => () => void;
  };
  sessions: {
    list: (filter?: { archived?: boolean; starred?: boolean }) => Promise<any[]>;
    get: (id: string) => Promise<any>;
    create: (meta: any) => Promise<any>;
    update: (id: string, patch: any) => Promise<void>;
    rename: (id: string, name: string) => Promise<void>;
    star: (id: string, starred: boolean) => Promise<void>;
    archive: (id: string) => Promise<void>;
    delete: (id: string) => Promise<void>;
    getTranscript: (id: string, options?: { tail?: number }) => Promise<string>;
  };
  ai: {
    configure: (config: { apiKey?: string; model?: string }) => Promise<{ model: string; hasApiKey: boolean }>;
    getConfig: () => Promise<{ model: string; hasApiKey: boolean }>;
    chat: (message: string, context?: { projectContext?: string; recentActivity?: string }) => Promise<{ ok: boolean; response?: string; error?: string }>;
    stop: () => Promise<void>;
    history: () => Promise<Array<{ role: 'user' | 'assistant'; content: string }>>;
    clearHistory: () => Promise<void>;
    explain: (prompt: string) => Promise<{ ok: boolean; text?: string; error?: string }>;
    onStream: (callback: (chunk: { type: string; text?: string; error?: string }) => void) => () => void;
    onToolResult: (callback: (result: { toolName: string; result: string }) => void) => () => void;
  };
  mcp: {
    connect: (config: { name: string; command: string; args?: string[]; env?: Record<string, string> }) => Promise<{ ok: boolean; servers?: any[]; error?: string }>;
    disconnect: (name: string) => Promise<{ ok: boolean; servers: any[] }>;
    listServers: () => Promise<Array<{ name: string; toolCount: number }>>;
    listTools: () => Promise<Array<{ name: string; description: string }>>;
  };
  system: {
    detectCLIs: () => Promise<Array<{ name: string; command: string; version: string; flag: string }>>;
  };
  platform: string;
}

declare global {
  interface Window {
    terminalSaddle?: TerminalSaddleAPI;
  }
}
