import { useState } from 'react';
import { ACTIONS, ActionDef, ActionVariant, AgentCLI, buildCommand, buildCurrentTerminalPrompt } from '../config/actions';
import { useSidecarStore } from '../store/store';

interface ActionPanelProps {
  /** Launch action in a new or reused agent tab. Returns nothing if tab reuse. */
  onLaunchAgent: (command: string, label: string, agent: AgentCLI) => void;
  /** Inject prompt directly into the active terminal tab */
  onInjectCurrent: (prompt: string) => void;
  /** Whether there's an active terminal tab to inject into */
  hasActiveTab: boolean;
}

type Step = 'idle' | 'scope' | 'cli';

const CATEGORY_ORDER = ['audit', 'research', 'dev'] as const;
const CATEGORY_LABELS: Record<string, string> = { audit: 'Audit & Analyze', research: 'Research', dev: 'Development' };

export function ActionPanel({ onLaunchAgent, onInjectCurrent, hasActiveTab }: ActionPanelProps) {
  const [step, setStep] = useState<Step>('idle');
  const [selectedAction, setSelectedAction] = useState<ActionDef | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ActionVariant | null>(null);
  const workingDirectory = useSidecarStore((s) => s.workingDirectory);

  const handleClickAction = (action: ActionDef) => {
    if (action.hasScopes) {
      setSelectedAction(action);
      setStep('scope');
    } else {
      // No scope sub-menu — go straight to CLI selector with the single variant
      const variant = Object.values(action.variants)[0]!;
      setSelectedAction(action);
      setSelectedVariant(variant);
      setStep('cli');
    }
  };

  const handleSelectScope = (variant: ActionVariant) => {
    if (variant.scope === 'current') {
      // "Current Terminal" — inject directly, bypass CLI selection
      const prompt = buildCurrentTerminalPrompt(variant);
      onInjectCurrent(prompt);
      reset();
      return;
    }
    setSelectedVariant(variant);
    setStep('cli');
  };

  const handleSelectCLI = (agent: AgentCLI) => {
    if (!selectedVariant || !selectedAction) return;
    const cwd = workingDirectory || '~';
    const command = buildCommand(selectedVariant, agent, cwd);
    const label = `${selectedAction.label} (${agent})`;
    onLaunchAgent(command, label, agent);
    reset();
  };

  const reset = () => {
    setStep('idle');
    setSelectedAction(null);
    setSelectedVariant(null);
  };

  const grouped = CATEGORY_ORDER
    .map((cat) => ({ category: cat, label: CATEGORY_LABELS[cat], actions: ACTIONS.filter((a) => a.category === cat) }))
    .filter((g) => g.actions.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Actions
        </span>
      </div>

      {/* === STEP: Scope sub-menu === */}
      {step === 'scope' && selectedAction && (
        <div style={{ padding: 10, background: '#161b22', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#7d8590', marginBottom: 8 }}>
            <strong style={{ color: '#e6edf3' }}>{selectedAction.icon} {selectedAction.label}</strong> — choose scope:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.values(selectedAction.variants).map((variant) => {
              if (!variant) return null;
              const isCurrent = variant.scope === 'current';
              return (
                <button
                  key={variant.scope}
                  onClick={() => handleSelectScope(variant)}
                  disabled={isCurrent && !hasActiveTab}
                  style={{
                    padding: '7px 10px',
                    background: '#0d1117',
                    border: '1px solid #21262d',
                    borderRadius: 6,
                    color: isCurrent && !hasActiveTab ? '#484f58' : '#c9d1d9',
                    cursor: isCurrent && !hasActiveTab ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    textAlign: 'left',
                    opacity: isCurrent && !hasActiveTab ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => { if (!(isCurrent && !hasActiveTab)) e.currentTarget.style.borderColor = '#30363d'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#21262d'; }}
                >
                  <div style={{ fontWeight: 500 }}>{variant.label}</div>
                  <div style={{ fontSize: 9, color: '#484f58', marginTop: 1 }}>
                    {isCurrent && !hasActiveTab ? 'Open a terminal first' : variant.description}
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={reset} style={{ width: '100%', marginTop: 6, padding: 4, background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', fontSize: 10 }}>
            Cancel
          </button>
        </div>
      )}

      {/* === STEP: CLI selector (Claude / Codex / Current Terminal) === */}
      {step === 'cli' && selectedAction && selectedVariant && (
        <div style={{ padding: 10, background: '#161b22', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#7d8590', marginBottom: 8 }}>
            Launch <strong style={{ color: '#e6edf3' }}>{selectedVariant.label}</strong> with:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Current Terminal option */}
            {hasActiveTab && (
              <button
                onClick={() => {
                  const prompt = buildCurrentTerminalPrompt(selectedVariant);
                  onInjectCurrent(prompt);
                  reset();
                }}
                style={{
                  padding: '8px 12px', background: '#39d35310', border: '1px solid #39d35340',
                  borderRadius: 6, color: '#39d353', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#39d35320'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#39d35310'; }}
              >
                <span style={{ fontSize: 13 }}>▶</span> Current Terminal
              </button>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => handleSelectCLI('claude')}
                style={{
                  flex: 1, padding: '8px 10px', background: '#da775612', border: '1px solid #da775640',
                  borderRadius: 6, color: '#da7756', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#da775622'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#da775612'; }}
              >
                <span style={{ fontSize: 13 }}>✦</span> Claude
              </button>
              <button
                onClick={() => handleSelectCLI('codex')}
                style={{
                  flex: 1, padding: '8px 10px', background: '#58a6ff12', border: '1px solid #58a6ff40',
                  borderRadius: 6, color: '#58a6ff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#58a6ff22'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#58a6ff12'; }}
              >
                <span style={{ fontSize: 13 }}>◈</span> Codex
              </button>
            </div>
          </div>
          <button onClick={reset} style={{ width: '100%', marginTop: 6, padding: 4, background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', fontSize: 10 }}>
            Cancel
          </button>
        </div>
      )}

      {/* === Action buttons grid === */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {grouped.map((group) => (
          <div key={group.category}>
            <div style={{ fontSize: 9, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, padding: '8px 4px 4px' }}>
              {group.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {group.actions.map((action) => {
                const isSelected = selectedAction?.id === action.id;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleClickAction(action)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                      background: isSelected ? '#1f2937' : '#161b22',
                      border: `1px solid ${isSelected ? '#58a6ff40' : '#21262d'}`,
                      borderRadius: 6, color: '#c9d1d9', cursor: 'pointer', fontSize: 12,
                      textAlign: 'left', width: '100%', transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.background = '#1c2129'; } }}
                    onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#21262d'; e.currentTarget.style.background = '#161b22'; } }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{action.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 12 }}>
                        {action.label}
                        {action.hasScopes && <span style={{ color: '#484f58', fontSize: 10, marginLeft: 4 }}>▾</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
