import { SidecarEvent } from '../types';

export type EventCategory = 'read' | 'write' | 'edit' | 'delete' | 'search' | 'command' | 'agent' | 'navigate' | 'other';
export type FilePurpose = 'test' | 'config' | 'component' | 'style' | 'script' | 'doc' | 'build' | 'data' | 'entry' | 'unknown';
export type WorkPhase = 'exploring' | 'planning' | 'implementing' | 'verifying' | 'debugging' | 'configuring' | 'delegating' | 'idle';

export interface BashInfo {
  tool: string;       // git, npm, python, docker, etc.
  action: string;     // install, push, test, run, etc.
  target?: string;    // package name, branch, file
  flags?: string[];
  fullCommand: string;
}

export interface FileInfo {
  name: string;
  extension: string;
  directory: string;
  project: string;
  purpose: FilePurpose;
  isEntryPoint: boolean;
}

export interface SearchInfo {
  pattern: string;
  humanReadable: string;
  scope?: string;
}

export interface ParsedEvent {
  raw: SidecarEvent;
  category: EventCategory;
  bash?: BashInfo;
  file?: FileInfo;
  search?: SearchInfo;
  agent?: { taskDescription: string };
  summary: string;
  timestamp: number;
}

export interface SequenceMatch {
  pattern: string;
  narrative: string;
  phase: WorkPhase;
  confidence: number;
}

export interface TeachingBubble {
  text: string;
  conceptKey: string;
  priority: number;
}

export interface ProjectContext {
  type: 'web' | 'python' | 'rust' | 'go' | 'mobile' | 'cli' | 'unknown';
  framework?: string;      // react, django, flask, next, etc.
  hasTests: boolean;
  hasDocker: boolean;
  name: string;
}

export interface CommandEntry {
  short: string;
  long: string;
}

export interface ToolEntry {
  what: string;
  analogy: string;
}

export interface FileTypeEntry {
  language: string;
  purpose: string;
}

export interface PhaseEntry {
  description: string;
}
