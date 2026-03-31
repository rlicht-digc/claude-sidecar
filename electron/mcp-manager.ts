import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import Anthropic from '@anthropic-ai/sdk';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface ConnectedServer {
  config: MCPServerConfig;
  client: Client;
  transport: StdioClientTransport;
  tools: Anthropic.Tool[];
}

/**
 * Manages MCP server connections and provides built-in tools.
 * Acts as the MCP Host within the Electron app.
 */
export class MCPManager {
  private servers = new Map<string, ConnectedServer>();
  private builtinTools: Anthropic.Tool[] = [];
  private workingDirectory: string = '';

  constructor() {
    this.registerBuiltinTools();
  }

  setWorkingDirectory(cwd: string) {
    this.workingDirectory = cwd;
  }

  /** Register tools that run locally without an MCP server */
  private registerBuiltinTools() {
    this.builtinTools = [
      {
        name: 'read_file',
        description: 'Read the contents of a file from the project directory',
        input_schema: {
          type: 'object' as const,
          properties: {
            path: { type: 'string', description: 'Relative or absolute file path' },
            maxLines: { type: 'number', description: 'Maximum lines to read (default: 200)' },
          },
          required: ['path'],
        },
      },
      {
        name: 'list_files',
        description: 'List files and directories at a given path',
        input_schema: {
          type: 'object' as const,
          properties: {
            path: { type: 'string', description: 'Directory path (relative to project root)' },
            recursive: { type: 'boolean', description: 'List recursively (default: false)' },
          },
          required: [],
        },
      },
      {
        name: 'search_files',
        description: 'Search for a pattern in project files using grep',
        input_schema: {
          type: 'object' as const,
          properties: {
            pattern: { type: 'string', description: 'Search pattern (regex)' },
            glob: { type: 'string', description: 'File glob filter (e.g. "*.ts")' },
          },
          required: ['pattern'],
        },
      },
      {
        name: 'git_status',
        description: 'Get current git status of the project',
        input_schema: {
          type: 'object' as const,
          properties: {},
          required: [],
        },
      },
      {
        name: 'git_log',
        description: 'Get recent git commit history',
        input_schema: {
          type: 'object' as const,
          properties: {
            count: { type: 'number', description: 'Number of commits (default: 10)' },
          },
          required: [],
        },
      },
      {
        name: 'run_command',
        description: 'Run a shell command in the project directory. Use for safe, read-only operations.',
        input_schema: {
          type: 'object' as const,
          properties: {
            command: { type: 'string', description: 'Shell command to execute' },
          },
          required: ['command'],
        },
      },
    ];
  }

  /** Execute a built-in tool */
  async executeBuiltinTool(name: string, input: any): Promise<string> {
    const cwd = this.workingDirectory || process.cwd();

    switch (name) {
      case 'read_file': {
        const filePath = path.isAbsolute(input.path) ? input.path : path.join(cwd, input.path);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');
          const maxLines = input.maxLines || 200;
          const truncated = lines.slice(0, maxLines);
          const result = truncated.map((l: string, i: number) => `${i + 1}\t${l}`).join('\n');
          if (lines.length > maxLines) {
            return result + `\n... (${lines.length - maxLines} more lines)`;
          }
          return result;
        } catch (e: any) {
          return `Error reading file: ${e.message}`;
        }
      }

      case 'list_files': {
        const dirPath = input.path ? path.join(cwd, input.path) : cwd;
        try {
          if (input.recursive) {
            const result = execSync(`find "${dirPath}" -maxdepth 3 -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' 2>/dev/null | head -100`, {
              encoding: 'utf-8', timeout: 5000,
            });
            return result;
          }
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });
          return entries.map((e) => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n');
        } catch (e: any) {
          return `Error listing files: ${e.message}`;
        }
      }

      case 'search_files': {
        try {
          const globArg = input.glob ? `--include="${input.glob}"` : '';
          const result = execSync(
            `grep -rn ${globArg} --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist "${input.pattern}" "${cwd}" 2>/dev/null | head -50`,
            { encoding: 'utf-8', timeout: 5000 }
          );
          return result || 'No matches found.';
        } catch {
          return 'No matches found.';
        }
      }

      case 'git_status': {
        try {
          return execSync('git status --short', { cwd, encoding: 'utf-8', timeout: 3000 }) || 'Clean working tree.';
        } catch (e: any) {
          return `Not a git repository or error: ${e.message}`;
        }
      }

      case 'git_log': {
        try {
          const count = input.count || 10;
          return execSync(`git log --oneline -${count}`, { cwd, encoding: 'utf-8', timeout: 3000 });
        } catch (e: any) {
          return `Error: ${e.message}`;
        }
      }

      case 'run_command': {
        try {
          return execSync(input.command, { cwd, encoding: 'utf-8', timeout: 10000, maxBuffer: 1024 * 512 });
        } catch (e: any) {
          return `Command failed: ${e.message}\n${e.stderr || ''}`;
        }
      }

      default:
        return `Unknown built-in tool: ${name}`;
    }
  }

  /** Connect to an external MCP server */
  async connectServer(config: MCPServerConfig): Promise<void> {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: { ...process.env, ...config.env } as Record<string, string>,
    });

    const client = new Client({
      name: 'terminal-saddle',
      version: '0.2.0',
    });

    await client.connect(transport);

    // List available tools from the server
    const toolsResult = await client.listTools();
    const anthropicTools: Anthropic.Tool[] = toolsResult.tools.map((tool) => ({
      name: `${config.name}__${tool.name}`,
      description: tool.description || '',
      input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
    }));

    this.servers.set(config.name, { config, client, transport, tools: anthropicTools });
  }

  /** Disconnect from an MCP server */
  async disconnectServer(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (server) {
      await server.client.close();
      this.servers.delete(name);
    }
  }

  /** Execute a tool — routes to built-in or MCP server */
  async executeTool(name: string, input: any): Promise<string> {
    // Check built-in tools first
    if (this.builtinTools.find((t) => t.name === name)) {
      return this.executeBuiltinTool(name, input);
    }

    // Route to MCP server (tool names are prefixed: serverName__toolName)
    const parts = name.split('__');
    if (parts.length === 2) {
      const [serverName, toolName] = parts;
      const server = this.servers.get(serverName);
      if (server) {
        const result = await server.client.callTool({ name: toolName, arguments: input });
        // Extract text from result content
        if (Array.isArray(result.content)) {
          return result.content
            .map((c: any) => c.type === 'text' ? c.text : JSON.stringify(c))
            .join('\n');
        }
        return String(result.content);
      }
    }

    return `Tool not found: ${name}`;
  }

  /** Get all available tools (built-in + MCP servers) as Anthropic Tool format */
  getAllTools(): Anthropic.Tool[] {
    const mcpTools: Anthropic.Tool[] = [];
    for (const server of this.servers.values()) {
      mcpTools.push(...server.tools);
    }
    return [...this.builtinTools, ...mcpTools];
  }

  /** List connected MCP servers */
  listServers(): Array<{ name: string; toolCount: number }> {
    return Array.from(this.servers.entries()).map(([name, server]) => ({
      name,
      toolCount: server.tools.length,
    }));
  }

  /** Disconnect all servers */
  async disconnectAll(): Promise<void> {
    for (const name of this.servers.keys()) {
      await this.disconnectServer(name);
    }
  }
}
