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
  platform: string;
}

declare global {
  interface Window {
    terminalSaddle?: TerminalSaddleAPI;
  }
}
