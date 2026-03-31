import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIClientConfig {
  apiKey?: string;
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
}

interface StreamChunk {
  type: 'text' | 'tool_use' | 'done' | 'error';
  text?: string;
  toolName?: string;
  toolInput?: any;
  error?: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant embedded in Terminal Saddle, a desktop companion app for software development.

You have access to the user's project context — file trees, recent activity, terminal output, and more.
You can help with:
- Explaining code, errors, and terminal output
- Suggesting next steps and debugging strategies
- Answering questions about tools, commands, and frameworks
- Providing concise, actionable guidance

Be concise. Lead with the answer. Use markdown for code blocks.
When the user's context (project files, recent events) is provided, reference it naturally.`;

export class AIClient extends EventEmitter {
  private client: Anthropic | null = null;
  private conversationHistory: Anthropic.MessageParam[] = [];
  private config: Required<AIClientConfig>;
  private abortController: AbortController | null = null;
  private tools: Anthropic.Tool[] = [];

  constructor(config?: AIClientConfig) {
    super();
    this.config = {
      apiKey: config?.apiKey || process.env.ANTHROPIC_API_KEY || '',
      model: config?.model || 'claude-sonnet-4-20250514',
      systemPrompt: config?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      maxTokens: config?.maxTokens || 2048,
    };

    if (this.config.apiKey) {
      this.initClient();
    }
  }

  private initClient() {
    this.client = new Anthropic({ apiKey: this.config.apiKey });
  }

  configure(config: Partial<AIClientConfig>) {
    if (config.apiKey !== undefined) this.config.apiKey = config.apiKey;
    if (config.model !== undefined) this.config.model = config.model;
    if (config.systemPrompt !== undefined) this.config.systemPrompt = config.systemPrompt;
    if (config.maxTokens !== undefined) this.config.maxTokens = config.maxTokens;

    if (this.config.apiKey) {
      this.initClient();
    }
  }

  isConfigured(): boolean {
    return !!this.client && !!this.config.apiKey;
  }

  getConfig(): { model: string; hasApiKey: boolean } {
    return {
      model: this.config.model,
      hasApiKey: !!this.config.apiKey,
    };
  }

  /** Register tools that Claude can call (from MCP or built-in) */
  setTools(tools: Anthropic.Tool[]) {
    this.tools = tools;
  }

  /** Send a message and stream the response back via IPC callback */
  async chat(
    userMessage: string,
    context?: { projectContext?: string; recentActivity?: string },
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<string> {
    if (!this.client) {
      throw new Error('AI client not configured. Set your API key first.');
    }

    // Build the user message with optional context
    let fullMessage = userMessage;
    if (context?.projectContext || context?.recentActivity) {
      const parts: string[] = [];
      if (context.projectContext) {
        parts.push(`<project_context>\n${context.projectContext}\n</project_context>`);
      }
      if (context.recentActivity) {
        parts.push(`<recent_activity>\n${context.recentActivity}\n</recent_activity>`);
      }
      parts.push(userMessage);
      fullMessage = parts.join('\n\n');
    }

    this.conversationHistory.push({ role: 'user', content: fullMessage });

    this.abortController = new AbortController();

    try {
      const stream = this.client.messages.stream({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: this.config.systemPrompt,
        messages: this.conversationHistory,
        tools: this.tools.length > 0 ? this.tools : undefined,
      }, {
        signal: this.abortController.signal,
      });

      let fullResponse = '';

      stream.on('text', (text) => {
        fullResponse += text;
        onChunk?.({ type: 'text', text });
      });

      const finalMessage = await stream.finalMessage();

      // Check for tool use in response
      for (const block of finalMessage.content) {
        if (block.type === 'tool_use') {
          onChunk?.({ type: 'tool_use', toolName: block.name, toolInput: block.input });
          // Tool execution will be handled by the MCP manager
          // For now, emit event so main process can handle it
          this.emit('tool_use', { id: block.id, name: block.name, input: block.input });
        }
      }

      // Store assistant response in history
      this.conversationHistory.push({ role: 'assistant', content: fullResponse });

      onChunk?.({ type: 'done' });
      return fullResponse;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        onChunk?.({ type: 'done' });
        return '';
      }
      const errorMessage = error.message || 'Unknown error';
      onChunk?.({ type: 'error', error: errorMessage });
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /** Provide a tool result back to continue the conversation */
  async continueWithToolResult(
    toolUseId: string,
    result: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<string> {
    if (!this.client) throw new Error('AI client not configured.');

    this.conversationHistory.push({
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: toolUseId,
        content: result,
      }],
    });

    // Re-run chat to get Claude's response after tool result
    this.abortController = new AbortController();
    try {
      const stream = this.client.messages.stream({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: this.config.systemPrompt,
        messages: this.conversationHistory,
        tools: this.tools.length > 0 ? this.tools : undefined,
      }, {
        signal: this.abortController.signal,
      });

      let fullResponse = '';
      stream.on('text', (text) => {
        fullResponse += text;
        onChunk?.({ type: 'text', text });
      });

      await stream.finalMessage();
      this.conversationHistory.push({ role: 'assistant', content: fullResponse });
      onChunk?.({ type: 'done' });
      return fullResponse;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        onChunk?.({ type: 'done' });
        return '';
      }
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /** Stop the current streaming response */
  stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /** Get conversation history for display */
  getHistory(): ChatMessage[] {
    return this.conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: typeof msg.content === 'string' ? msg.content : '[tool interaction]',
    }));
  }

  /** Clear conversation history */
  clearHistory() {
    this.conversationHistory = [];
  }
}
