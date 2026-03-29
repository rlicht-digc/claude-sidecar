import fs from 'fs';
import * as pty from 'node-pty';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';

interface PtyInstance {
  pty: pty.IPty;
  tabId: string;
  cwd: string;
  shell: string;
  outputBuffer: string;
}

type DataCallback = (tabId: string, data: string) => void;
type ExitCallback = (tabId: string, exitCode: number) => void;

const OUTPUT_BUFFER_LIMIT = 128 * 1024;

function ensureNodePtySpawnHelperExecutable() {
  if (process.platform === 'win32') {
    return;
  }

  try {
    const nodePtyRoot = path.dirname(require.resolve('node-pty/package.json'));
    const helperPath = path.join(nodePtyRoot, 'prebuilds', `${process.platform}-${process.arch}`, 'spawn-helper');

    if (!fs.existsSync(helperPath)) {
      return;
    }

    try {
      fs.accessSync(helperPath, fs.constants.X_OK);
    } catch {
      fs.chmodSync(helperPath, 0o755);
    }
  } catch (error) {
    console.warn('Unable to verify node-pty spawn-helper permissions:', error);
  }
}

export class PtyManager {
  private instances = new Map<string, PtyInstance>();
  private dataCallbacks: DataCallback[] = [];
  private exitCallbacks: ExitCallback[] = [];

  onData(callback: DataCallback) {
    this.dataCallbacks.push(callback);
  }

  onExit(callback: ExitCallback) {
    this.exitCallbacks.push(callback);
  }

  create(options: { cwd?: string; shell?: string } = {}): string {
    const tabId = randomUUID();
    const shell = options.shell || process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'zsh');
    const cwd = options.cwd || os.homedir();

    ensureNodePtySpawnHelperExecutable();

    let ptyProcess: pty.IPty;
    try {
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        } as Record<string, string>,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const hint = message.includes('posix_spawnp failed')
        ? ' node-pty spawn-helper may be missing executable permissions. Run `npm run node-pty:fixperms` and retry.'
        : '';
      throw new Error(`Failed to start shell "${shell}" in "${cwd}": ${message}.${hint}`);
    }

    ptyProcess.onData((data) => {
      const instance = this.instances.get(tabId);
      if (instance) {
        instance.outputBuffer = (instance.outputBuffer + data).slice(-OUTPUT_BUFFER_LIMIT);
      }
      for (const cb of this.dataCallbacks) {
        cb(tabId, data);
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      this.instances.delete(tabId);
      for (const cb of this.exitCallbacks) {
        cb(tabId, exitCode);
      }
    });

    this.instances.set(tabId, { pty: ptyProcess, tabId, cwd, shell, outputBuffer: '' });
    return tabId;
  }

  write(tabId: string, data: string) {
    const instance = this.instances.get(tabId);
    if (instance) {
      instance.pty.write(data);
    }
  }

  resize(tabId: string, cols: number, rows: number) {
    const instance = this.instances.get(tabId);
    if (instance) {
      instance.pty.resize(cols, rows);
    }
  }

  close(tabId: string) {
    const instance = this.instances.get(tabId);
    if (instance) {
      instance.pty.kill();
      this.instances.delete(tabId);
    }
  }

  getInfo(tabId: string) {
    const instance = this.instances.get(tabId);
    if (!instance) return null;
    return { tabId: instance.tabId, cwd: instance.cwd, shell: instance.shell };
  }

  getSnapshot(tabId: string): string {
    return this.instances.get(tabId)?.outputBuffer || '';
  }

  listTabs(): string[] {
    return Array.from(this.instances.keys());
  }

  destroyAll() {
    for (const [tabId] of this.instances) {
      this.close(tabId);
    }
  }
}
