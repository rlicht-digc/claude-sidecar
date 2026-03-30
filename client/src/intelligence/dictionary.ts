import { CommandEntry, ToolEntry, FileTypeEntry, PhaseEntry, ProjectContext } from './types';
import commandsData from './dictionaries/commands.json';
import toolsData from './dictionaries/tools.json';
import filetypesData from './dictionaries/filetypes.json';
import phasesData from './dictionaries/phases.json';
import frameworksData from './dictionaries/frameworks.json';

const commands = commandsData as Record<string, CommandEntry>;
const tools = toolsData as Record<string, ToolEntry>;
const filetypes = filetypesData as Record<string, FileTypeEntry>;
const phases = phasesData as Record<string, PhaseEntry>;
const frameworks = frameworksData as Record<string, string>;

export class KnowledgeDictionary {
  private projectContext: ProjectContext | null = null;

  setProjectContext(ctx: ProjectContext) {
    this.projectContext = ctx;
  }

  getProjectContext(): ProjectContext | null {
    return this.projectContext;
  }

  describeCommand(tool: string, action: string): { short: string; long: string } | null {
    return commands[`${tool}.${action}`] || commands[tool] || null;
  }

  describeTool(name: string): ToolEntry | null {
    const key = name.toLowerCase().replace(/[^a-z0-9-]/g, '');
    return tools[key] || null;
  }

  describeFileType(ext: string): FileTypeEntry | null {
    return filetypes[ext.toLowerCase()] || null;
  }

  describePhase(phase: string): string {
    return phases[phase]?.description || 'Working on the project';
  }

  describeFramework(name: string): string | null {
    return frameworks[name.toLowerCase()] || null;
  }

  /** Try to find a known tool/library name in a file path or command */
  detectToolInPath(filePath: string): ToolEntry | null {
    const parts = filePath.toLowerCase().split('/');
    for (const part of parts) {
      // Check node_modules package names
      const nmIdx = parts.indexOf('node_modules');
      if (nmIdx >= 0 && parts.length > nmIdx + 1) {
        const pkg = parts[nmIdx + 1].replace('@', '');
        const entry = this.describeTool(pkg);
        if (entry) return entry;
      }
      // Check known tool names in path segments
      const entry = this.describeTool(part);
      if (entry) return entry;
    }
    return null;
  }

  /** Detect project context from a file tree */
  detectProjectContext(tree: Array<{ name: string; type: string; children?: any[] }>): ProjectContext {
    const rootFiles = tree.map((n) => n.name.toLowerCase());

    let type: ProjectContext['type'] = 'unknown';
    let framework: string | undefined;
    const hasTests = rootFiles.some((f) => f.includes('test') || f.includes('spec') || f === 'jest.config.js' || f === 'vitest.config.ts');
    const hasDocker = rootFiles.some((f) => f === 'dockerfile' || f === 'docker-compose.yml' || f === 'docker-compose.yaml');

    if (rootFiles.includes('package.json')) {
      type = 'web';
      // Could read package.json for framework detection, but that requires async
      if (rootFiles.includes('next.config.js') || rootFiles.includes('next.config.mjs')) framework = 'next';
      else if (rootFiles.includes('vite.config.ts') || rootFiles.includes('vite.config.js')) framework = 'vite';
      else if (rootFiles.includes('angular.json')) framework = 'angular';
      else if (rootFiles.includes('nuxt.config.ts')) framework = 'nuxt';
    } else if (rootFiles.includes('requirements.txt') || rootFiles.includes('pyproject.toml') || rootFiles.includes('setup.py')) {
      type = 'python';
      if (rootFiles.includes('manage.py')) framework = 'django';
    } else if (rootFiles.includes('cargo.toml')) {
      type = 'rust';
    } else if (rootFiles.includes('go.mod')) {
      type = 'go';
    }

    const name = ''; // Set by caller
    const ctx: ProjectContext = { type, framework, hasTests, hasDocker, name };
    this.setProjectContext(ctx);
    return ctx;
  }
}
