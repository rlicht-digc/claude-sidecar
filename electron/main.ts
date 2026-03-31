import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { startServer } from './server';
import { registerIpcHandlers } from './ipc-handlers';
import { PtyManager } from './pty-manager';
import { SessionStore } from './session-store';
import { AIClient } from './ai-client';
import { MCPManager } from './mcp-manager';
import { ConfigStore } from './config-store';

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1600, width),
    height: Math.min(1000, height),
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0d1117',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3578');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../client/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function sendToRenderer(channel: string, ...args: any[]) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

app.whenReady().then(async () => {
  const configStore = new ConfigStore();
  const sessionStore = new SessionStore();
  const ptyManager = new PtyManager();

  // Initialize AI with persisted config
  const savedApiKey = configStore.get('apiKey') || process.env.ANTHROPIC_API_KEY || '';
  const savedModel = configStore.get('model');
  const aiClient = new AIClient({
    apiKey: savedApiKey,
    model: savedModel || undefined,
  });
  const mcpManager = new MCPManager();

  // Forward PTY output to renderer (registered before window so no data is missed)
  ptyManager.onData((tabId, data) => {
    sendToRenderer('terminal:data', tabId, data);
  });

  ptyManager.onExit((tabId, exitCode) => {
    sendToRenderer('terminal:exit', tabId, exitCode);
  });

  // Start the embedded Express server (keeps hook integration on :3577)
  await startServer((event) => {
    sendToRenderer('sidecar:event', event);
  });

  // Register IPC handlers for terminal, sessions, AI, MCP, etc.
  registerIpcHandlers({
    ptyManager,
    sessionStore,
    aiClient,
    mcpManager,
    configStore,
    getMainWindow: () => mainWindow,
  });

  // Create the window last
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
