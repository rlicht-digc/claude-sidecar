import { theme as t, glassPanel, glassButton } from '../utils/theme';
import { useSidecarStore } from '../store/store';
import { TabInfo } from './TerminalTabBar';

interface ConsumerSidebarProps {
  userName: string;
  onSetUserName: (name: string) => void;
  onSwitchToChat: () => void;
  tabs: TabInfo[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onNewTab: () => void;
}

const QUICK_ACTIONS = [
  {
    id: 'explain',
    emoji: '💬',
    label: "What's happening?",
    prompt: 'Look at the recent activity and explain in simple terms what the AI is doing right now and why.',
  },
  {
    id: 'status',
    emoji: '✅',
    label: 'Is everything OK?',
    prompt: 'Based on recent activity, is everything going well? Any errors or concerns? Explain simply.',
  },
  {
    id: 'next',
    emoji: '🔮',
    label: "What's next?",
    prompt: 'Based on the current phase and recent activity, what will the AI likely do next? Explain simply.',
  },
];

function getTabIcon(tab: TabInfo): string {
  if (tab.isWatch) return '👁';
  if (tab.actionAgent === 'claude') return '✦';
  if (tab.actionAgent === 'codex') return '◈';
  return '▸';
}

function getTabColor(tab: TabInfo): string {
  if (tab.actionAgent === 'claude') return t.agent.claude;
  if (tab.actionAgent === 'codex') return t.agent.codex;
  return t.text.muted;
}

/**
 * Consumer-mode sidebar — session list (Claude Code app style) + quick actions.
 */
export function ConsumerSidebar({
  userName, onSetUserName, onSwitchToChat,
  tabs, activeTabId, onSelectTab, onNewTab,
}: ConsumerSidebarProps) {
  const eventCount = useSidecarStore((s) => s.eventCount);
  const currentPhase = useSidecarStore((s) => s.currentPhase);
  const sessionSummaries = useSidecarStore((s) => s.sessionSummaries);
  const workingDirectory = useSidecarStore((s) => s.workingDirectory);

  const projectName = workingDirectory?.split('/').pop() || 'No Project';

  // Tabs with recent activity on top
  const sortedTabs = [...tabs].sort((a, b) => {
    const aActivity = a.sessionId ? sessionSummaries[a.sessionId]?.lastTimestamp || 0 : 0;
    const bActivity = b.sessionId ? sessionSummaries[b.sessionId]?.lastTimestamp || 0 : 0;
    return bActivity - aActivity;
  });

  const handleQuickAction = async (prompt: string) => {
    onSwitchToChat();
    setTimeout(() => {
      if (window.terminalSaddle?.ai) {
        const context = {
          projectContext: workingDirectory ? `Project: ${workingDirectory}` : undefined,
        };
        window.terminalSaddle.ai.chat(prompt, context);
      }
    }, 200);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* User greeting */}
      <div style={{ padding: '14px 16px 6px' }}>
        <div
          style={{ fontSize: 11, color: t.text.muted, cursor: 'pointer' }}
          title="Click to change name"
          onClick={() => {
            const name = prompt('Your name:', userName);
            if (name) onSetUserName(name);
          }}
        >
          Hi, {userName || 'there'} 👋
        </div>
      </div>

      {/* ──── SESSIONS ──── */}
      <div style={{ padding: '4px 12px 0', flexShrink: 0 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: t.text.disabled,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '0 4px', marginBottom: 6,
        }}>
          Sessions
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px', minHeight: 0 }}>
        {sortedTabs.length === 0 ? (
          <div style={{
            fontSize: 11, color: t.text.disabled,
            padding: '8px 4px', lineHeight: 1.5,
          }}>
            No open sessions. Start one below.
          </div>
        ) : (
          sortedTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const summary = tab.sessionId ? sessionSummaries[tab.sessionId] : undefined;
            const isLive = summary && (Date.now() - summary.lastTimestamp) < 8000;
            const label = tab.actionAgent === 'claude' ? 'Claude CLI'
              : tab.actionAgent === 'codex' ? 'Codex CLI'
              : tab.label !== 'New Terminal' ? tab.label
              : 'Terminal';

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '9px 10px', marginBottom: 3,
                  background: isActive ? t.glass.bgActive : t.glass.bg,
                  backdropFilter: t.glass.backdropLight,
                  border: `1px solid ${isActive ? t.glass.borderHover : t.glass.border}`,
                  borderRadius: t.radius.md,
                  color: isActive ? t.text.primary : t.text.secondary,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxShadow: t.glass.specular,
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = t.glass.bgHover; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = t.glass.bg; }}
              >
                <span style={{ fontSize: 12, color: getTabColor(tab), flexShrink: 0 }}>
                  {getTabIcon(tab)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </div>
                  {summary && summary.lastActivity && (
                    <div style={{
                      fontSize: 9, color: t.text.disabled, marginTop: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {summary.lastActivity}
                    </div>
                  )}
                </div>
                {isLive && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: t.status.active,
                    boxShadow: `0 0 5px ${t.status.active}`,
                    flexShrink: 0,
                  }} />
                )}
              </button>
            );
          })
        )}

        {/* New session button */}
        <button
          onClick={onNewTab}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, width: '100%',
            padding: '8px 10px', marginBottom: 12,
            background: 'transparent',
            border: `1px dashed ${t.border.default}`,
            borderRadius: t.radius.md,
            color: t.text.muted, cursor: 'pointer', fontSize: 12,
            transition: 'all 0.12s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = t.accent.purple;
            e.currentTarget.style.color = t.text.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = t.border.default;
            e.currentTarget.style.color = t.text.muted;
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
          <span>New Session</span>
        </button>

        {/* ──── QUICK ACTIONS ──── */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: t.text.disabled,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '0 4px', marginBottom: 6,
        }}>
          Quick Actions
        </div>

        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleQuickAction(action.prompt)}
            style={{
              ...glassButton(),
              padding: '9px 10px', textAlign: 'left', width: '100%',
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.glass.bgHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = t.glass.bg; }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{action.emoji}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.text.primary }}>
              {action.label}
            </span>
          </button>
        ))}

        {/* Full chat */}
        <button
          onClick={onSwitchToChat}
          style={{
            marginTop: 8, marginBottom: 16,
            padding: '11px',
            background: `${t.accent.purple}15`,
            border: `1px solid ${t.accent.purple}30`,
            borderRadius: t.radius.md,
            color: t.text.primary,
            cursor: 'pointer',
            fontSize: 12, fontWeight: 700,
            textAlign: 'center', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${t.accent.purple}25`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = `${t.accent.purple}15`; }}
        >
          <span>✦</span>
          Ask AI Anything
        </button>
      </div>
    </div>
  );
}
