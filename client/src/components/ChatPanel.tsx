import { useState, useRef, useEffect, useCallback } from 'react';
import { theme as t, glassPanel, glassButton } from '../utils/theme';
import { useSidecarStore } from '../store/store';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolResults?: Array<{ toolName: string; result: string }>;
}

let msgCounter = 0;

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [configured, setConfigured] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [model, setModel] = useState('claude-sonnet-4-20250514');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { activities, workingDirectory, currentPhase, currentNarrative } = useSidecarStore();

  // Check config on mount
  useEffect(() => {
    if (!window.terminalSaddle?.ai) return;
    window.terminalSaddle.ai.getConfig().then((config) => {
      setConfigured(config.hasApiKey);
      setModel(config.model);
    });
  }, []);

  // Subscribe to streaming chunks
  useEffect(() => {
    if (!window.terminalSaddle?.ai) return;
    const unsub = window.terminalSaddle.ai.onStream((chunk) => {
      if (chunk.type === 'text' && chunk.text) {
        setStreamText((prev) => prev + chunk.text);
      } else if (chunk.type === 'done') {
        setStreamText((prev) => {
          if (prev) {
            setMessages((msgs) => [...msgs, {
              id: `msg-${++msgCounter}`,
              role: 'assistant',
              content: prev,
              timestamp: Date.now(),
            }]);
          }
          return '';
        });
        setStreaming(false);
      } else if (chunk.type === 'error' && chunk.error) {
        setMessages((msgs) => [...msgs, {
          id: `msg-${++msgCounter}`,
          role: 'system',
          content: `Error: ${chunk.error}`,
          timestamp: Date.now(),
        }]);
        setStreaming(false);
        setStreamText('');
      }
    });

    const unsubTool = window.terminalSaddle.ai.onToolResult((result) => {
      setMessages((msgs) => {
        const last = msgs[msgs.length - 1];
        if (last && last.role === 'assistant') {
          return [...msgs.slice(0, -1), {
            ...last,
            toolResults: [...(last.toolResults || []), result],
          }];
        }
        return msgs;
      });
    });

    return () => { unsub(); unsubTool(); };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamText]);

  const handleConfigure = useCallback(async () => {
    if (!window.terminalSaddle?.ai || !apiKeyInput.trim()) return;
    const result = await window.terminalSaddle.ai.configure({ apiKey: apiKeyInput.trim(), model });
    setConfigured(result.hasApiKey);
    setApiKeyInput('');
    setShowSettings(false);
  }, [apiKeyInput, model]);

  const buildContext = useCallback(() => {
    const recentActivities = activities.slice(0, 15)
      .map((a) => `[${a.type}] ${a.message}${a.path ? ` (${a.path})` : ''}`)
      .join('\n');

    const projectContext = [
      workingDirectory ? `Project: ${workingDirectory}` : '',
      currentPhase ? `Current phase: ${currentPhase}` : '',
      currentNarrative ? `Narrative: ${currentNarrative}` : '',
    ].filter(Boolean).join('\n');

    return {
      projectContext: projectContext || undefined,
      recentActivity: recentActivities || undefined,
    };
  }, [activities, workingDirectory, currentPhase, currentNarrative]);

  const handleSend = useCallback(async () => {
    if (!window.terminalSaddle?.ai || !input.trim() || streaming) return;

    const userMsg: ChatMessage = {
      id: `msg-${++msgCounter}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setStreamText('');

    const context = buildContext();
    await window.terminalSaddle.ai.chat(userMsg.content, context);
  }, [input, streaming, buildContext]);

  const handleStop = useCallback(() => {
    window.terminalSaddle?.ai?.stop();
    setStreaming(false);
  }, []);

  const handleClearHistory = useCallback(async () => {
    setMessages([]);
    setStreamText('');
    await window.terminalSaddle?.ai?.clearHistory();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Settings panel
  if (showSettings || !configured) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        padding: 16, gap: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text.primary }}>
          AI Configuration
        </div>

        <div style={{ fontSize: 11, color: t.text.muted, lineHeight: 1.5 }}>
          Enter your Anthropic API key to enable the AI assistant.
          Your key stays local — it's only used in the Electron main process.
        </div>

        <input
          type="password"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          placeholder="sk-ant-..."
          style={{
            padding: '10px 12px', fontSize: 12,
            background: t.bg.input, color: t.text.primary,
            border: `1px solid ${t.glass.border}`,
            borderRadius: t.radius.sm,
            outline: 'none', fontFamily: t.font.mono,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = t.glass.borderFocus; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = t.glass.border; }}
        />

        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={{
            padding: '8px 12px', fontSize: 12,
            background: t.bg.input, color: t.text.primary,
            border: `1px solid ${t.glass.border}`,
            borderRadius: t.radius.sm, outline: 'none',
          }}
        >
          <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (fast)</option>
          <option value="claude-opus-4-20250514">Claude Opus 4 (powerful)</option>
          <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (cheap)</option>
        </select>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleConfigure}
            disabled={!apiKeyInput.trim()}
            style={{
              ...glassButton(true),
              padding: '8px 16px', fontSize: 12, fontWeight: 600,
              opacity: apiKeyInput.trim() ? 1 : 0.4,
              background: t.accent.purple,
              color: '#fff', border: 'none',
            }}
          >
            Connect
          </button>
          {configured && (
            <button
              onClick={() => setShowSettings(false)}
              style={{ ...glassButton(), padding: '8px 16px', fontSize: 12 }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: `1px solid ${t.glass.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: t.status.active,
            boxShadow: t.shadow.glow(t.status.active),
          }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: t.text.primary }}>
            AI Assistant
          </span>
          <span style={{ fontSize: 10, color: t.text.muted }}>
            {model.includes('sonnet') ? 'Sonnet' : model.includes('opus') ? 'Opus' : 'Haiku'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleClearHistory}
            title="Clear conversation"
            style={{
              ...glassButton(),
              padding: '4px 8px', fontSize: 10,
            }}
          >
            Clear
          </button>
          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            style={{
              ...glassButton(),
              padding: '4px 8px', fontSize: 10,
            }}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        {messages.length === 0 && !streaming && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 10,
            color: t.text.muted, fontSize: 12, textAlign: 'center', padding: 20,
          }}>
            <span style={{ fontSize: 28, opacity: 0.3 }}>✦</span>
            <div>Ask anything about your project.</div>
            <div style={{ fontSize: 10, color: t.text.disabled }}>
              Context from your file tree, recent activity, and terminal sessions is shared automatically.
            </div>

            {/* Quick prompts */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {[
                'What is this project?',
                'Explain the last error',
                'What should I do next?',
                'Summarize recent changes',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); setTimeout(() => inputRef.current?.focus(), 50); }}
                  style={{
                    ...glassButton(),
                    padding: '6px 10px', fontSize: 10,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = t.glass.bgHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = t.glass.bg; }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '90%',
              padding: '8px 12px',
              borderRadius: msg.role === 'user'
                ? `${t.radius.md} ${t.radius.md} 4px ${t.radius.md}`
                : `${t.radius.md} ${t.radius.md} ${t.radius.md} 4px`,
              background: msg.role === 'user'
                ? `${t.accent.purple}22`
                : msg.role === 'system'
                ? `${t.accent.red}15`
                : t.glass.bg,
              border: `1px solid ${msg.role === 'user'
                ? `${t.accent.purple}30`
                : msg.role === 'system'
                ? `${t.accent.red}30`
                : t.glass.border}`,
              fontSize: 12,
              lineHeight: 1.6,
              color: t.text.primary,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: msg.role === 'assistant' ? t.font.sans : t.font.sans,
            }}>
              {msg.content}
            </div>
            {msg.toolResults && msg.toolResults.length > 0 && (
              <div style={{
                maxWidth: '90%', marginTop: 4,
                padding: '4px 8px',
                background: `${t.accent.cyan}10`,
                border: `1px solid ${t.accent.cyan}20`,
                borderRadius: t.radius.sm,
                fontSize: 10, color: t.text.muted,
              }}>
                Used: {msg.toolResults.map((r) => r.toolName).join(', ')}
              </div>
            )}
          </div>
        ))}

        {/* Streaming indicator */}
        {streaming && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
          }}>
            <div style={{
              maxWidth: '90%',
              padding: '8px 12px',
              borderRadius: `${t.radius.md} ${t.radius.md} ${t.radius.md} 4px`,
              background: t.glass.bg,
              border: `1px solid ${t.glass.border}`,
              fontSize: 12, lineHeight: 1.6,
              color: t.text.primary,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {streamText || (
                <span style={{ color: t.text.muted }}>
                  <span style={{ animation: 'pulse 1.5s infinite' }}>Thinking...</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 14px',
        borderTop: `1px solid ${t.glass.border}`,
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your project..."
            rows={1}
            style={{
              flex: 1, padding: '8px 12px',
              background: t.bg.input, color: t.text.primary,
              border: `1px solid ${t.glass.border}`,
              borderRadius: t.radius.sm,
              outline: 'none', resize: 'none',
              fontSize: 12, lineHeight: 1.5,
              fontFamily: t.font.sans,
              minHeight: 36, maxHeight: 120,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = t.glass.borderFocus; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = t.glass.border; }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
          />
          {streaming ? (
            <button
              onClick={handleStop}
              style={{
                ...glassButton(),
                padding: '8px 12px', fontSize: 12,
                background: `${t.accent.red}22`,
                border: `1px solid ${t.accent.red}40`,
                color: t.accent.red, fontWeight: 600,
                flexShrink: 0,
              }}
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                padding: '8px 12px', fontSize: 12,
                background: input.trim() ? t.accent.purple : t.glass.bg,
                border: `1px solid ${input.trim() ? t.accent.purple : t.glass.border}`,
                borderRadius: t.radius.sm,
                color: input.trim() ? '#fff' : t.text.disabled,
                cursor: input.trim() ? 'pointer' : 'default',
                fontWeight: 600, flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
