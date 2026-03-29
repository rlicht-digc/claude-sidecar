import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chokidar from 'chokidar';

const PORT = 3577;

// File watcher state
const watchers = new Map<string, chokidar.FSWatcher>();

function setupFileWatcher(watchPath: string, broadcast: (event: any) => void) {
  if (watchers.has(watchPath)) return;

  console.log(`Watching: ${watchPath}`);

  const watcher = chokidar.watch(watchPath, {
    ignored: /(^|[\/\\])(\.|node_modules|\.git|dist|__pycache__|\.next)/,
    persistent: true,
    ignoreInitial: true,
    depth: 10,
  });

  const emit = (type: string, filePath: string) => {
    broadcast({
      type,
      timestamp: Date.now(),
      data: {
        path: filePath,
        relativePath: path.relative(watchPath, filePath),
        name: path.basename(filePath),
        extension: path.extname(filePath),
        directory: path.dirname(filePath),
      },
    });
  };

  watcher
    .on('add', (p) => emit('fs:create', p))
    .on('change', (p) => emit('fs:change', p))
    .on('unlink', (p) => emit('fs:delete', p))
    .on('addDir', (p) => emit('fs:mkdir', p))
    .on('unlinkDir', (p) => emit('fs:rmdir', p));

  watchers.set(watchPath, watcher);
}

// Session tracking
const activeSessions = new Map<string, { lastEvent: number; eventCount: number; cwd?: string }>();

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

function detectTerminals(): any[] {
  try {
    const psOutput = execSync(
      `ps -eo pid,tty,comm | grep -E '(zsh|bash|fish)' | grep -v grep`,
      { encoding: 'utf-8', timeout: 3000 }
    ).trim();

    if (!psOutput) return [];

    let claudeTTYs = new Set<string>();
    try {
      const claudePs = execSync(
        `ps -eo tty,comm | grep -i claude | grep -v grep`,
        { encoding: 'utf-8', timeout: 2000 }
      ).trim();
      for (const line of claudePs.split('\n')) {
        const tty = line.trim().split(/\s+/)[0];
        if (tty && tty !== '??' && tty !== '?') claudeTTYs.add(tty);
      }
    } catch {}

    const seen = new Map<string, any>();

    for (const line of psOutput.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) continue;

      const pid = parseInt(parts[0], 10);
      const tty = parts[1];
      const shell = path.basename(parts[2]);

      if (isNaN(pid) || tty === '??' || tty === '?') continue;

      let cwd: string;
      try {
        cwd = execSync(`lsof -p ${pid} -a -d cwd -Fn 2>/dev/null | grep '^n' | head -1 | cut -c2-`, {
          encoding: 'utf-8',
          timeout: 2000,
        }).trim();
      } catch {
        continue;
      }

      if (!cwd || cwd === '/' || cwd.length < 2) continue;
      if (seen.has(cwd)) continue;

      let isGitRepo = false;
      let gitBranch: string | undefined;
      try {
        gitBranch = execSync(`git -C "${cwd}" rev-parse --abbrev-ref HEAD 2>/dev/null`, {
          encoding: 'utf-8',
          timeout: 1000,
        }).trim();
        isGitRepo = !!gitBranch;
      } catch {}

      const hasClaude = claudeTTYs.has(tty) ||
        [...activeSessions.values()].some((s) => s.cwd === cwd && Date.now() - s.lastEvent < 60000);
      const claudeEventCount = [...activeSessions.values()]
        .filter((s) => s.cwd === cwd)
        .reduce((sum, s) => sum + s.eventCount, 0);

      seen.set(cwd, {
        pid, shell, cwd, dirName: path.basename(cwd), tty,
        isGitRepo, gitBranch, hasClaude, claudeEventCount,
      });
    }

    return Array.from(seen.values()).sort((a, b) => {
      if (a.hasClaude && !b.hasClaude) return -1;
      if (!a.hasClaude && b.hasClaude) return 1;
      return a.dirName.localeCompare(b.dirName);
    });
  } catch {
    return [];
  }
}

export async function startServer(
  onEvent: (event: any) => void
): Promise<ReturnType<typeof createServer>> {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Graceful JSON error handling
  app.use((err: any, _req: any, res: any, next: any) => {
    if (err.type === 'entity.parse.failed') {
      console.warn('Malformed JSON received, ignoring');
      res.status(400).json({ error: 'invalid json' });
      return;
    }
    next(err);
  });

  const server = createServer(app);

  // Keep WebSocket for backward compatibility (non-Electron clients)
  const wss = new WebSocketServer({ server });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });

  function broadcast(event: any) {
    // Forward to IPC (Electron renderer)
    onEvent(event);

    // Also broadcast to any WebSocket clients (backward compat)
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

    const sessionId = req.body.session_id || 'default';
    const session = activeSessions.get(sessionId) || { lastEvent: 0, eventCount: 0 };
    session.lastEvent = Date.now();
    session.eventCount++;
    if (event.data?.path) {
      const parts = event.data.path.split('/');
      if (parts.length > 3) session.cwd = parts.slice(0, 4).join('/');
    }
    activeSessions.set(sessionId, session);

    console.log(`Event: ${event.type} ${event.data?.path || event.data?.tool_name || ''}`);
    broadcast(event);
    res.json({ ok: true });
  });

  app.post('/watch', (req, res) => {
    const { path: watchPath } = req.body;
    if (watchPath) {
      setupFileWatcher(watchPath, broadcast);
      res.json({ ok: true, watching: watchPath });
    } else {
      res.status(400).json({ error: 'path required' });
    }
  });

  app.post('/scan', (req, res) => {
    const { path: scanPath } = req.body;
    if (scanPath && fs.existsSync(scanPath)) {
      const tree = scanDirectory(scanPath);
      res.json({ ok: true, tree, root: scanPath });
    } else {
      res.status(400).json({ error: 'valid path required' });
    }
  });

  app.post('/file-preview', (req, res) => {
    const { path: filePath, maxLines = 30 } = req.body;
    if (!filePath || !fs.existsSync(filePath)) {
      res.status(400).json({ error: 'file not found' });
      return;
    }
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) { res.status(400).json({ error: 'path is a directory' }); return; }
      if (stat.size > 500_000) {
        res.json({ ok: true, content: `[File too large: ${(stat.size / 1024).toFixed(0)}KB]`, lines: 0, size: stat.size });
        return;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const preview = lines.slice(0, maxLines).join('\n');
      res.json({
        ok: true, content: preview, lines: lines.length, size: stat.size,
        language: path.extname(filePath).slice(1), truncated: lines.length > maxLines,
      });
    } catch {
      res.status(500).json({ error: 'failed to read file' });
    }
  });

  app.get('/terminals', (_req, res) => {
    res.json({ ok: true, terminals: detectTerminals() });
  });

  app.post('/review', (req, res) => {
    const { path: repoPath } = req.body;
    if (!repoPath || !fs.existsSync(repoPath)) {
      res.status(400).json({ error: 'valid path required' });
      return;
    }
    try {
      const scriptPath = path.join(__dirname, '../scripts/review-repo.sh');
      const output = execSync(`bash "${scriptPath}" "${repoPath}"`, { encoding: 'utf-8', timeout: 30000 });
      const match = output.match(/Review saved to: (.+)/);
      res.json({ ok: true, output, reviewPath: match?.[1]?.trim() });
    } catch (e: any) {
      res.status(500).json({ error: 'review failed', detail: e.message });
    }
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', clients: clients.size, sessions: activeSessions.size });
  });

  return new Promise((resolve, reject) => {
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} in use, killing stale process...`);
        try {
          execSync(`lsof -ti :${PORT} | xargs kill -9 2>/dev/null`, { encoding: 'utf-8' });
        } catch {}
        // Retry after a short delay
        setTimeout(() => {
          server.listen(PORT, () => {
            console.log(`Terminal Saddle server running on http://localhost:${PORT}`);
            resolve(server);
          });
        }, 500);
      } else {
        reject(err);
      }
    });

    server.listen(PORT, () => {
      console.log(`Terminal Saddle server running on http://localhost:${PORT}`);
      resolve(server);
    });
  });
}
