import { ipcMain, BrowserWindow } from 'electron';
import { PtyManager } from './pty-manager';
import { SessionStore } from './session-store';
import { AIClient } from './ai-client';
import { MCPManager } from './mcp-manager';
import { ConfigStore } from './config-store';

interface Deps {
  ptyManager: PtyManager;
  sessionStore: SessionStore;
  aiClient: AIClient;
  mcpManager: MCPManager;
  configStore: ConfigStore;
  getMainWindow: () => BrowserWindow | null;
}

// Map tabId → sessionId for transcript persistence
const tabSessionMap = new Map<string, string>();

export function registerIpcHandlers({ ptyManager, sessionStore, aiClient, mcpManager, configStore, getMainWindow }: Deps) {
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

  // --- AI Chat ---

  ipcMain.handle('ai:configure', async (_event, config: { apiKey?: string; model?: string }) => {
    aiClient.configure(config);
    // Persist config
    if (config.apiKey) configStore.set('apiKey', config.apiKey);
    if (config.model) configStore.set('model', config.model);
    // Sync tools from MCP manager to AI client
    aiClient.setTools(mcpManager.getAllTools());
    return aiClient.getConfig();
  });

  ipcMain.handle('ai:getConfig', async () => {
    return aiClient.getConfig();
  });

  ipcMain.handle('ai:chat', async (_event, message: string, context?: { projectContext?: string; recentActivity?: string }) => {
    const win = getMainWindow();
    // Sync tools before each chat
    aiClient.setTools(mcpManager.getAllTools());

    try {
      const response = await aiClient.chat(message, context, (chunk) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('ai:stream', chunk);
        }
      });

      return { ok: true, response };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('ai:stop', async () => {
    aiClient.stop();
  });

  ipcMain.handle('ai:history', async () => {
    return aiClient.getHistory();
  });

  ipcMain.handle('ai:clearHistory', async () => {
    aiClient.clearHistory();
  });

  // Lightweight AI call for contextual explanations (teaching bubbles, bot speech)
  // Uses a separate one-shot call — doesn't pollute conversation history
  ipcMain.handle('ai:explain', async (_event, prompt: string) => {
    if (!aiClient.isConfigured()) return { ok: false, error: 'Not configured' };
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic.default({ apiKey: configStore.get('apiKey') || process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content.find((b: any) => b.type === 'text')?.text || '';
      return { ok: true, text };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });

  // Handle tool execution when Claude requests it
  aiClient.on('tool_use', async (toolCall: { id: string; name: string; input: any }) => {
    try {
      const result = await mcpManager.executeTool(toolCall.name, toolCall.input);
      const win = getMainWindow();

      // Send tool result back to continue conversation
      const response = await aiClient.continueWithToolResult(toolCall.id, result, (chunk) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('ai:stream', chunk);
        }
      });

      if (win && !win.isDestroyed()) {
        win.webContents.send('ai:toolResult', { toolName: toolCall.name, result: result.slice(0, 500) });
      }
    } catch (error: any) {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('ai:stream', { type: 'error', error: error.message });
      }
    }
  });

  // --- MCP Server Management ---

  ipcMain.handle('mcp:connect', async (_event, config: { name: string; command: string; args?: string[]; env?: Record<string, string> }) => {
    try {
      await mcpManager.connectServer(config);
      aiClient.setTools(mcpManager.getAllTools());
      return { ok: true, servers: mcpManager.listServers() };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('mcp:disconnect', async (_event, name: string) => {
    await mcpManager.disconnectServer(name);
    aiClient.setTools(mcpManager.getAllTools());
    return { ok: true, servers: mcpManager.listServers() };
  });

  ipcMain.handle('mcp:listServers', async () => {
    return mcpManager.listServers();
  });

  ipcMain.handle('mcp:listTools', async () => {
    return mcpManager.getAllTools().map((t) => ({ name: t.name, description: t.description }));
  });

  // --- CLI detection ---
  ipcMain.handle('system:detectCLIs', async () => {
    const { execSync } = require('child_process');
    const clis: Array<{ name: string; command: string; version: string; flag: string }> = [];

    const checks = [
      { name: 'Claude', command: 'claude', flag: '--dangerously-skip-permissions' },
      { name: 'Codex', command: 'codex', flag: '--full-auto' },
      { name: 'Aider', command: 'aider', flag: '' },
      { name: 'Cursor', command: 'cursor', flag: '' },
    ];

    for (const cli of checks) {
      try {
        const version = execSync(`which ${cli.command} && ${cli.command} --version 2>/dev/null || echo unknown`, {
          encoding: 'utf-8', timeout: 3000,
        }).trim();
        if (version && !version.includes('not found')) {
          clis.push({ ...cli, version: version.split('\n').pop() || 'installed' });
        }
      } catch {}
    }

    return clis;
  });
}
