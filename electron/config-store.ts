import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.terminal-saddle');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface AppConfig {
  apiKey?: string;
  model?: string;
  mcpServers?: Array<{
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
}

export class ConfigStore {
  private config: AppConfig = {};

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        this.config = JSON.parse(raw);
      }
    } catch {}
  }

  private save() {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch {}
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]) {
    this.config[key] = value;
    this.save();
  }

  getAll(): AppConfig {
    return { ...this.config };
  }

  update(patch: Partial<AppConfig>) {
    this.config = { ...this.config, ...patch };
    this.save();
  }
}
