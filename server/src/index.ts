import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { setupFileWatcher } from './fileWatcher.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`Client connected (${clients.size} total)`);
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Client disconnected (${clients.size} total)`);
  });
});

function broadcast(event: any) {
  const data = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// Receive events from Claude Code hooks
app.post('/event', (req, res) => {
  const event = {
    ...req.body,
    timestamp: req.body.timestamp || Date.now(),
  };
  console.log(`Event: ${event.type} ${event.data?.path || event.data?.tool_name || ''}`);
  broadcast(event);
  res.json({ ok: true });
});

// Start watching a directory
app.post('/watch', (req, res) => {
  const { path: watchPath } = req.body;
  if (watchPath) {
    setupFileWatcher(watchPath, broadcast);
    res.json({ ok: true, watching: watchPath });
  } else {
    res.status(400).json({ error: 'path required' });
  }
});

// Scan a directory tree
interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: TreeNode[];
  extension: string;
}

function scanDirectory(dirPath: string, depth = 0, maxDepth = 8): TreeNode[] {
  if (depth > maxDepth) return [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const skip = new Set(['node_modules', '.git', '.next', 'dist', '.cache', '__pycache__', '.DS_Store']);

  const dirs: TreeNode[] = [];
  const files: TreeNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    if (skip.has(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      dirs.push({
        name: entry.name,
        path: fullPath,
        type: 'directory',
        children: scanDirectory(fullPath, depth + 1, maxDepth),
        extension: '',
      });
    } else {
      files.push({
        name: entry.name,
        path: fullPath,
        type: 'file',
        children: [],
        extension: path.extname(entry.name),
      });
    }
  }

  dirs.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));

  return [...dirs, ...files];
}

app.post('/scan', (req, res) => {
  const { path: scanPath } = req.body;
  if (scanPath && fs.existsSync(scanPath)) {
    const tree = scanDirectory(scanPath);
    res.json({ ok: true, tree, root: scanPath });
  } else {
    res.status(400).json({ error: 'valid path required' });
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', clients: clients.size });
});

const PORT = process.env.PORT || 3577;
server.listen(PORT, () => {
  console.log(`Claude Sidecar server running on http://localhost:${PORT}`);
});
