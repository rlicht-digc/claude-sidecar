import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ACTIONS, ActionDef, ActionVariant, AgentCLI, buildCommand, buildCurrentTerminalPrompt } from '../config/actions';
import { useSidecarStore } from '../store/store';
import { theme as t } from '../utils/theme';

interface ActionPanelProps {
  onLaunchAgent: (command: string, label: string, agent: AgentCLI) => void;
  onInjectCurrent: (prompt: string) => void;
  hasActiveTab: boolean;
}

type View = 'grid' | 'expanded' | 'cli-select' | 'custom-prompt';

export function ActionPanel({ onLaunchAgent, onInjectCurrent, hasActiveTab }: ActionPanelProps) {
  const [view, setView] = useState<View>('grid');
  const [selectedAction, setSelectedAction] = useState<ActionDef | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ActionVariant | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentCLI | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [knownRepos, setKnownRepos] = useState<string[]>([]);
  const workingDirectory = useSidecarStore((s) => s.workingDirectory);
  const activities = useSidecarStore((s) => s.activities);

  // Collect known repos from activity paths
  useEffect(() => {
    const repos = new Set<string>();
    for (const a of activities) {
      if (a.path) {
        const parts = a.path.split('/');
        const userIdx = parts.indexOf('Users');
        if (userIdx >= 0 && parts.length > userIdx + 2) {
          const repoPath = parts.slice(0, userIdx + 3).join('/');
          repos.add(repoPath);
        }
      }
    }
    if (workingDirectory) repos.add(workingDirectory);
    setKnownRepos(Array.from(repos).sort());
  }, [activities, workingDirectory]);

  const reset = () => {
    setView('grid');
    setSelectedAction(null);
    setSelectedVariant(null);
    setSelectedAgent(null);
    setCustomPrompt('');
    setSelectedRepo('');
  };

  const handleClickAction = (action: ActionDef) => {
    setSelectedAction(action);
    setSelectedRepo(workingDirectory || '');
    setView('expanded');
  };

  const handleSelectVariant = (variant: ActionVariant) => {
    if (variant.scope === 'current' && hasActiveTab) {
      onInjectCurrent(buildCurrentTerminalPrompt(variant));
      reset();
      return;
    }
    setSelectedVariant(variant);
    setView('cli-select');
  };

  const handleSelectAgent = (agent: AgentCLI) => {
    setSelectedAgent(agent);
    // If there's a selected variant (preset), launch immediately
    if (selectedVariant) {
      const cwd = selectedRepo || workingDirectory || '~';
      const command = buildCommand(selectedVariant, agent, cwd);
      onLaunchAgent(command, `${selectedAction?.label} (${agent})`, agent);
      reset();
    }
  };

  const handleCustomPrompt = (agent: AgentCLI) => {
    setSelectedAgent(agent);
    setView('custom-prompt');
  };

  const handleLaunchCustom = () => {
    if (!selectedAgent || !customPrompt.trim()) return;
    const cwd = selectedRepo || workingDirectory || '~';
    const escaped = customPrompt.replace(/'/g, "'\\''");
    const cliCmd = selectedAgent === 'claude'
      ? `cd "${cwd}" && claude --dangerously-skip-permissions -p '${escaped}'`
      : `cd "${cwd}" && codex --full-auto '${escaped}'`;
    onLaunchAgent(cliCmd, `Custom (${selectedAgent})`, selectedAgent);
    reset();
  };

  // Glass button base style
  const glassBtn = (active?: boolean): React.CSSProperties => ({
    background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    border: `1px solid ${active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.10)'}`,
    borderRadius: t.radius.md,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), ${active ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.15)'}`,
    color: t.text.primary,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
      padding: 10,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10, flexShrink: 0,
      }}>
        {view !== 'grid' && (
          <button onClick={reset} style={{
            ...glassBtn(), padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ← Back
          </button>
        )}
        <span style={{
          fontSize: 12, fontWeight: 700, color: t.text.primary,
          marginLeft: view === 'grid' ? 0 : 'auto',
        }}>
          {view === 'grid' ? 'Quick Actions' : selectedAction?.label || 'Action'}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {/* ===== GRID VIEW: Square buttons ===== */}
        {view === 'grid' && (
          <motion.div
            key="grid"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 8, flex: 1, alignContent: 'start',
            }}
          >
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleClickAction(action)}
                style={{
                  ...glassBtn(),
                  padding: '14px 10px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.20)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
              >
                <span style={{ fontSize: 22 }}>{action.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{action.label}</span>
              </button>
            ))}
          </motion.div>
        )}

        {/* ===== EXPANDED: Scope options + custom ===== */}
        {view === 'expanded' && selectedAction && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}
          >
            {/* Repo selector */}
            {knownRepos.length > 0 && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: t.text.muted, marginBottom: 4, fontWeight: 600 }}>Target Repo</div>
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  style={{
                    ...glassBtn(),
                    width: '100%', padding: '6px 8px', fontSize: 11,
                    fontFamily: t.font.mono, appearance: 'none',
                    background: 'rgba(255,255,255,0.06)',
                  }}
                >
                  {knownRepos.map((r) => (
                    <option key={r} value={r} style={{ background: '#1a1926', color: '#f0f0f8' }}>
                      {r.split('/').pop()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Preset scope options */}
            {selectedAction.hasScopes && Object.values(selectedAction.variants).map((variant) => {
              if (!variant) return null;
              const isCurrent = variant.scope === 'current';
              return (
                <button
                  key={variant.scope}
                  onClick={() => handleSelectVariant(variant)}
                  disabled={isCurrent && !hasActiveTab}
                  style={{
                    ...glassBtn(),
                    padding: '12px 14px', textAlign: 'left', width: '100%',
                    opacity: isCurrent && !hasActiveTab ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => { if (!(isCurrent && !hasActiveTab)) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{variant.label}</div>
                  <div style={{ fontSize: 10, color: t.text.muted, marginTop: 2 }}>{variant.description}</div>
                </button>
              );
            })}

            {/* If no scopes, show direct CLI select */}
            {!selectedAction.hasScopes && (() => {
              const variant = Object.values(selectedAction.variants)[0];
              if (!variant) return null;
              return (
                <>
                  <div style={{ fontSize: 10, color: t.text.muted, fontWeight: 600, marginTop: 4 }}>Choose AI</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <AgentButton agent="claude" onClick={() => { setSelectedVariant(variant); handleSelectAgent('claude'); }} />
                    <AgentButton agent="codex" onClick={() => { setSelectedVariant(variant); handleSelectAgent('codex'); }} />
                  </div>
                  {hasActiveTab && (
                    <button onClick={() => { onInjectCurrent(buildCurrentTerminalPrompt(variant)); reset(); }}
                      style={{ ...glassBtn(), padding: '10px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: t.accent.green }}>
                      ▶ Run in Current Terminal
                    </button>
                  )}
                </>
              );
            })()}

            {/* Something specific — custom prompt */}
            <div style={{ borderTop: `1px solid ${t.glass.border}`, paddingTop: 8, marginTop: 4 }}>
              <div style={{ fontSize: 10, color: t.text.muted, fontWeight: 600, marginBottom: 6 }}>Something Specific</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <AgentButton agent="claude" label="Custom Claude" onClick={() => handleCustomPrompt('claude')} />
                <AgentButton agent="codex" label="Custom Codex" onClick={() => handleCustomPrompt('codex')} />
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== CLI SELECT (for scoped presets) ===== */}
        {view === 'cli-select' && selectedVariant && (
          <motion.div
            key="cli-select"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}
          >
            <div style={{ fontSize: 12, color: t.text.secondary, lineHeight: 1.5 }}>
              <strong style={{ color: t.text.primary }}>{selectedVariant.label}</strong>
              <br /><span style={{ fontSize: 10 }}>{selectedVariant.description}</span>
            </div>

            <div style={{ fontSize: 10, color: t.text.muted, fontWeight: 600, marginTop: 4 }}>Launch with</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <AgentButton agent="claude" onClick={() => handleSelectAgent('claude')} />
              <AgentButton agent="codex" onClick={() => handleSelectAgent('codex')} />
            </div>

            {hasActiveTab && (
              <button onClick={() => { onInjectCurrent(buildCurrentTerminalPrompt(selectedVariant)); reset(); }}
                style={{ ...glassBtn(), padding: '10px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: t.accent.green }}>
                ▶ Run in Current Terminal
              </button>
            )}
          </motion.div>
        )}

        {/* ===== CUSTOM PROMPT ===== */}
        {view === 'custom-prompt' && selectedAgent && (
          <motion.div
            key="custom-prompt"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: selectedAgent === 'claude' ? t.agent.claude : t.agent.codex,
              }}>
                {selectedAgent === 'claude' ? '✦ Claude' : '◈ Codex'}
              </span>
              {selectedRepo && (
                <span style={{ fontSize: 10, color: t.text.muted }}>
                  → {selectedRepo.split('/').pop()}
                </span>
              )}
            </div>

            {/* Repo selector */}
            {knownRepos.length > 1 && (
              <select
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                style={{
                  ...glassBtn(), width: '100%', padding: '6px 8px', fontSize: 11,
                  fontFamily: t.font.mono, appearance: 'none',
                  background: 'rgba(255,255,255,0.06)',
                }}
              >
                {knownRepos.map((r) => (
                  <option key={r} value={r} style={{ background: '#1a1926', color: '#f0f0f8' }}>
                    {r.split('/').pop()}
                  </option>
                ))}
              </select>
            )}

            {/* Prompt textarea */}
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="What do you want it to do?"
              autoFocus
              style={{
                flex: 1, minHeight: 80,
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${t.glass.border}`,
                borderRadius: t.radius.md,
                color: t.text.primary,
                fontSize: 12, lineHeight: 1.5,
                padding: '10px 12px',
                fontFamily: t.font.sans,
                resize: 'none',
                outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = t.accent.purple + '80'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = t.glass.border; }}
            />

            {/* Launch button */}
            <button
              onClick={handleLaunchCustom}
              disabled={!customPrompt.trim()}
              style={{
                ...glassBtn(true),
                padding: '12px',
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: customPrompt.trim() ? t.text.primary : t.text.disabled,
                background: customPrompt.trim()
                  ? `linear-gradient(135deg, ${selectedAgent === 'claude' ? t.agent.claude + '30' : t.agent.codex + '30'}, rgba(255,255,255,0.08))`
                  : 'rgba(255,255,255,0.04)',
                opacity: customPrompt.trim() ? 1 : 0.5,
              }}
            >
              Launch {selectedAgent === 'claude' ? '✦' : '◈'} →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AgentButton({ agent, label, onClick }: { agent: AgentCLI; label?: string; onClick: () => void }) {
  const isC = agent === 'claude';
  const color = isC ? t.agent.claude : t.agent.codex;

  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '10px 8px',
        background: `${color}12`,
        backdropFilter: 'blur(8px)',
        border: `1px solid ${color}35`,
        borderRadius: t.radius.md,
        boxShadow: `inset 0 1px 0 ${color}15`,
        color,
        cursor: 'pointer', fontSize: 12, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = `${color}22`; e.currentTarget.style.borderColor = `${color}50`; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = `${color}12`; e.currentTarget.style.borderColor = `${color}35`; }}
    >
      <span style={{ fontSize: 14 }}>{isC ? '✦' : '◈'}</span>
      {label || (isC ? 'Claude' : 'Codex')}
    </button>
  );
}
