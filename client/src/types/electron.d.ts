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
