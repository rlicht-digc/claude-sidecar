import * as pty from 'node-pty';
import os from 'os';
import { randomUUID } from 'crypto';

interface PtyInstance {
  pty: pty.IPty;
  tabId: string;
  cwd: string;
  shell: string;
}

type DataCallback = (tabId: string, data: string) => void;
type ExitCallback = (tabId: string, exitCode: number) => void;

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

    const ptyProcess = pty.spawn(shell, [], {
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

    ptyProcess.onData((data) => {
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

    this.instances.set(tabId, { pty: ptyProcess, tabId, cwd, shell });
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

  listTabs(): string[] {
    return Array.from(this.instances.keys());
  }

  destroyAll() {
    for (const [tabId] of this.instances) {
      this.close(tabId);
    }
  }
}
