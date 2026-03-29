import { useState } from 'react';
import { ACTIONS, ActionDef, AgentCLI, buildCommand } from '../config/actions';
import { useSidecarStore } from '../store/store';

interface ActionPanelProps {
  onLaunchAction: (command: string, label: string) => void;
}

const CATEGORY_ORDER = ['audit', 'research', 'dev', 'analysis'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  audit: 'Audit',
  research: 'Research',
  dev: 'Development',
  analysis: 'Analysis',
};

export function ActionPanel({ onLaunchAction }: ActionPanelProps) {
  const [selecting, setSelecting] = useState<ActionDef | null>(null);
  const workingDirectory = useSidecarStore((s) => s.workingDirectory);

  const handleSelect = (action: ActionDef) => {
    setSelecting(action);
  };

  const handleChooseCLI = (agent: AgentCLI) => {
    if (!selecting) return;
    const cwd = workingDirectory || '~';
    const command = buildCommand(selecting, agent, cwd);
    onLaunchAction(command, `${selecting.label} (${agent})`);
    setSelecting(null);
  };

  const handleCancel = () => {
    setSelecting(null);
  };

  // Group by category
  const grouped = CATEGORY_ORDER
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      actions: ACTIONS.filter((a) => a.category === cat),
    }))
    .filter((g) => g.actions.length > 0);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px 6px',
        borderBottom: '1px solid #21262d',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Actions
        </span>
      </div>

      {/* CLI Selector Overlay */}
      {selecting && (
        <div style={{
          padding: 12,
          background: '#161b22',
          borderBottom: '1px solid #21262d',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, color: '#7d8590', marginBottom: 8 }}>
            Launch <strong style={{ color: '#e6edf3' }}>{selecting.label}</strong> with:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleChooseCLI('claude')}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#da775615',
                border: '1px solid #da775640',
                borderRadius: 6,
                color: '#da7756',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#da775625'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#da775615'; }}
            >
              <span style={{ fontSize: 14 }}>✦</span> Claude
            </button>
            <button
              onClick={() => handleChooseCLI('codex')}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#58a6ff15',
                border: '1px solid #58a6ff40',
                borderRadius: 6,
                color: '#58a6ff',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#58a6ff25'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#58a6ff15'; }}
            >
              <span style={{ fontSize: 14 }}>◈</span> Codex
            </button>
          </div>
          <button
            onClick={handleCancel}
            style={{
              width: '100%', marginTop: 6, padding: '4px 8px',
              background: 'none', border: 'none', color: '#484f58',
              cursor: 'pointer', fontSize: 10,
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {grouped.map((group) => (
          <div key={group.category}>
            <div style={{
              fontSize: 9, color: '#484f58', textTransform: 'uppercase',
              letterSpacing: '0.06em', fontWeight: 600, padding: '8px 4px 4px',
            }}>
              {group.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {group.actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleSelect(action)}
                  title={action.description}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    background: selecting?.id === action.id ? '#1f2937' : '#161b22',
                    border: '1px solid #21262d',
                    borderRadius: 6,
                    color: '#c9d1d9',
                    cursor: 'pointer',
                    fontSize: 12,
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#30363d';
                    e.currentTarget.style.background = '#1c2129';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#21262d';
                    e.currentTarget.style.background = selecting?.id === action.id ? '#1f2937' : '#161b22';
                  }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{action.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{action.label}</div>
                    <div style={{ fontSize: 9, color: '#484f58', marginTop: 1 }}>{action.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!workingDirectory && (
        <div style={{
          padding: '8px 12px', fontSize: 10, color: '#484f58',
          borderTop: '1px solid #21262d', textAlign: 'center',
        }}>
          Scan a project or open a terminal to enable actions
        </div>
      )}
    </div>
  );
}
