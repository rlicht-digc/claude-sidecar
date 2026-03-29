import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

export interface SessionMeta {
  id: string;
  name: string;
  cwd: string;
  shell: string;
  createdAt: string;
  lastActiveAt: string;
  status: 'active' | 'idle' | 'closed';
  starred: boolean;
  archived: boolean;
  lastOutputPreview: string;
  eventCount: number;
}

const BASE_DIR = path.join(os.homedir(), '.terminal-saddle', 'sessions');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export class SessionStore {
  private indexPath: string;

  constructor() {
    ensureDir(BASE_DIR);
    this.indexPath = path.join(BASE_DIR, 'index.json');
    if (!fs.existsSync(this.indexPath)) {
      fs.writeFileSync(this.indexPath, '[]');
    }
  }

  private readIndex(): SessionMeta[] {
    try {
      return JSON.parse(fs.readFileSync(this.indexPath, 'utf-8'));
    } catch {
      return [];
    }
  }

  private writeIndex(sessions: SessionMeta[]) {
    fs.writeFileSync(this.indexPath, JSON.stringify(sessions, null, 2));
  }

  create(partial: Partial<SessionMeta> = {}): SessionMeta {
    const id = randomUUID();
    const sessionDir = path.join(BASE_DIR, id);
    ensureDir(sessionDir);

    const meta: SessionMeta = {
      id,
      name: partial.name || partial.cwd?.split('/').pop() || 'Terminal',
      cwd: partial.cwd || os.homedir(),
      shell: partial.shell || process.env.SHELL || 'zsh',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      status: 'active',
      starred: false,
      archived: false,
      lastOutputPreview: '',
      eventCount: 0,
    };

    fs.writeFileSync(path.join(sessionDir, 'meta.json'), JSON.stringify(meta, null, 2));
    fs.writeFileSync(path.join(sessionDir, 'transcript.txt'), '');
    fs.writeFileSync(path.join(sessionDir, 'events.jsonl'), '');

    const sessions = this.readIndex();
    sessions.unshift(meta);
    this.writeIndex(sessions);

    return meta;
  }

  list(filter?: { archived?: boolean; starred?: boolean }): SessionMeta[] {
    let sessions = this.readIndex();
    if (filter?.archived !== undefined) {
      sessions = sessions.filter((s) => s.archived === filter.archived);
    }
    if (filter?.starred !== undefined) {
      sessions = sessions.filter((s) => s.starred === filter.starred);
    }
    return sessions;
  }

  get(id: string): SessionMeta | null {
    const sessions = this.readIndex();
    return sessions.find((s) => s.id === id) || null;
  }

  update(id: string, patch: Partial<SessionMeta>) {
    const sessions = this.readIndex();
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx === -1) return;

    sessions[idx] = { ...sessions[idx], ...patch, id }; // preserve id
    this.writeIndex(sessions);

    // Also update meta.json
    const metaPath = path.join(BASE_DIR, id, 'meta.json');
    if (fs.existsSync(metaPath)) {
      fs.writeFileSync(metaPath, JSON.stringify(sessions[idx], null, 2));
    }
  }

  rename(id: string, name: string) {
    this.update(id, { name });
  }

  star(id: string, starred: boolean) {
    this.update(id, { starred });
  }

  archive(id: string) {
    this.update(id, { archived: true, status: 'closed' });
  }

  delete(id: string) {
    const sessions = this.readIndex().filter((s) => s.id !== id);
    this.writeIndex(sessions);

    const sessionDir = path.join(BASE_DIR, id);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  }

  appendTranscript(id: string, data: string) {
    const transcriptPath = path.join(BASE_DIR, id, 'transcript.txt');
    if (fs.existsSync(path.dirname(transcriptPath))) {
      fs.appendFileSync(transcriptPath, data);
    }

    // Update last output preview (last 500 chars of printable text)
    this.update(id, {
      lastActiveAt: new Date().toISOString(),
      lastOutputPreview: data.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').slice(-500).trim(),
    });
  }

  appendEvent(id: string, event: any) {
    const eventsPath = path.join(BASE_DIR, id, 'events.jsonl');
    if (fs.existsSync(path.dirname(eventsPath))) {
      fs.appendFileSync(eventsPath, JSON.stringify(event) + '\n');
    }
    this.update(id, {
      lastActiveAt: new Date().toISOString(),
      eventCount: (this.get(id)?.eventCount || 0) + 1,
    });
  }

  getTranscript(id: string, options?: { tail?: number }): string {
    const transcriptPath = path.join(BASE_DIR, id, 'transcript.txt');
    if (!fs.existsSync(transcriptPath)) return '';

    const content = fs.readFileSync(transcriptPath, 'utf-8');
    if (options?.tail) {
      const lines = content.split('\n');
      return lines.slice(-options.tail).join('\n');
    }
    return content;
  }
}
