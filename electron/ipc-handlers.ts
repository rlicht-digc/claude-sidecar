import { ipcMain } from 'electron';
import { PtyManager } from './pty-manager';
import { SessionStore } from './session-store';

interface Deps {
  ptyManager: PtyManager;
  sessionStore: SessionStore;
}

// Map tabId → sessionId for transcript persistence
const tabSessionMap = new Map<string, string>();

export function registerIpcHandlers({ ptyManager, sessionStore }: Deps) {
  // Single global callback for session transcript persistence
  ptyManager.onData((tabId, data) => {
    const sessionId = tabSessionMap.get(tabId);
    if (sessionId) {
      sessionStore.appendTranscript(sessionId, data);
    }
  });

  // --- Terminal management ---

  ipcMain.handle('terminal:create', async (_event, options: { cwd?: string; shell?: string }) => {
    const tabId = ptyManager.create(options);

    // Create a persistent session for this terminal
    const session = sessionStore.create({
      cwd: options.cwd,
      shell: options.shell,
    });

    tabSessionMap.set(tabId, session.id);

    return { tabId, sessionId: session.id };
  });

  ipcMain.on('terminal:write', (_event, tabId: string, data: string) => {
    ptyManager.write(tabId, data);
  });

  ipcMain.on('terminal:resize', (_event, tabId: string, cols: number, rows: number) => {
    ptyManager.resize(tabId, cols, rows);
  });

  ipcMain.handle('terminal:getSnapshot', async (_event, tabId: string) => {
    return ptyManager.getSnapshot(tabId);
  });

  ipcMain.handle('terminal:close', async (_event, tabId: string) => {
    const sessionId = tabSessionMap.get(tabId);
    if (sessionId) {
      sessionStore.update(sessionId, { status: 'closed' });
      tabSessionMap.delete(tabId);
    }
    ptyManager.close(tabId);
  });

  // --- Session management ---

  ipcMain.handle('sessions:list', async (_event, filter?: { archived?: boolean; starred?: boolean }) => {
    return sessionStore.list(filter);
  });

  ipcMain.handle('sessions:get', async (_event, id: string) => {
    return sessionStore.get(id);
  });

  ipcMain.handle('sessions:create', async (_event, meta: any) => {
    return sessionStore.create(meta);
  });

  ipcMain.handle('sessions:update', async (_event, id: string, patch: any) => {
    sessionStore.update(id, patch);
  });

  ipcMain.handle('sessions:rename', async (_event, id: string, name: string) => {
    sessionStore.rename(id, name);
  });

  ipcMain.handle('sessions:star', async (_event, id: string, starred: boolean) => {
    sessionStore.star(id, starred);
  });

  ipcMain.handle('sessions:archive', async (_event, id: string) => {
    sessionStore.archive(id);
  });

  ipcMain.handle('sessions:delete', async (_event, id: string) => {
    sessionStore.delete(id);
  });

  ipcMain.handle('sessions:getTranscript', async (_event, id: string, options?: { tail?: number }) => {
    return sessionStore.getTranscript(id, options);
  });
}
