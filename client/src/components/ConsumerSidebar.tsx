import { theme as t, glassPanel, glassButton } from '../utils/theme';
import { useSidecarStore } from '../store/store';

interface ConsumerSidebarProps {
  userName: string;
  onSetUserName: (name: string) => void;
  onSwitchToChat: () => void;
}

const CONSUMER_ACTIONS = [
  {
    id: 'explain',
    emoji: '💬',
    label: 'What\'s happening?',
    description: 'Get a plain-English explanation of current activity',
    prompt: 'Look at the recent activity and explain in simple terms what the AI is doing right now and why.',
  },
  {
    id: 'summary',
    emoji: '📊',
    label: 'Project summary',
    description: 'Quick overview of this project',
    prompt: 'Give me a brief, non-technical summary of what this project does.',
  },
  {
    id: 'status',
    emoji: '✅',
    label: 'Is everything OK?',
    description: 'Check if the AI is making good progress',
    prompt: 'Based on recent activity, is everything going well? Any errors or concerns? Explain simply.',
  },
  {
    id: 'next',
    emoji: '🔮',
    label: 'What\'s next?',
    description: 'See what the AI will likely do next',
    prompt: 'Based on the current phase and recent activity, what will the AI likely do next? Explain simply.',
  },
];

/**
 * Consumer-mode sidebar — replaces the developer tab list with
 * friendly action buttons and project info.
 */
export function ConsumerSidebar({ userName, onSetUserName, onSwitchToChat }: ConsumerSidebarProps) {
  const workingDirectory = useSidecarStore((s) => s.workingDirectory);
  const eventCount = useSidecarStore((s) => s.eventCount);
  const currentPhase = useSidecarStore((s) => s.currentPhase);

  const projectName = workingDirectory?.split('/').pop() || 'No Project';

  const handleAction = async (prompt: string) => {
    // Switch to chat and pre-fill the prompt
    onSwitchToChat();
    // Small delay to let the chat panel mount, then trigger
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
      <div style={{ padding: '16px 16px 8px' }}>
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

      {/* Project card */}
      <div style={{
        margin: '4px 12px 12px',
        padding: '14px',
        ...glassPanel({ active: true }),
      }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: t.text.primary }}>
          {projectName}
        </div>
        <div style={{
          fontSize: 11, color: t.text.muted, marginTop: 4,
          display: 'flex', gap: 12,
        }}>
          <span>{eventCount} actions</span>
          <span style={{ textTransform: 'capitalize' }}>{currentPhase}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{
        padding: '0 12px', flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.text.muted, marginBottom: 4 }}>
          Quick Actions
        </div>

        {CONSUMER_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.prompt)}
            style={{
              ...glassButton(),
              padding: '12px', textAlign: 'left', width: '100%',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.glass.bgHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = t.glass.bg; }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{action.emoji}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text.primary }}>
                {action.label}
              </div>
              <div style={{ fontSize: 10, color: t.text.muted, marginTop: 2 }}>
                {action.description}
              </div>
            </div>
          </button>
        ))}

        {/* Open full chat */}
        <button
          onClick={onSwitchToChat}
          style={{
            marginTop: 8,
            padding: '14px',
            background: `${t.accent.purple}15`,
            border: `1px solid ${t.accent.purple}30`,
            borderRadius: t.radius.md,
            color: t.text.primary,
            cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            textAlign: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
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
