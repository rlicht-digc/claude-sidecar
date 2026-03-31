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
