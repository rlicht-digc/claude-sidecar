import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidecarStore } from '../store/store';
import { theme as t } from '../utils/theme';

interface DetectedCLI {
  name: string;
  command: string;
  version: string;
  flag: string;
}

interface ActionPanelProps {
  onLaunchAgent: (command: string, label: string, agent: 'claude' | 'codex') => void;
  onInjectCurrent: (prompt: string) => void;
  hasActiveTab: boolean;
}

type View = 'home' | 'cli-select' | 'repo-select' | 'options' | 'custom-prompt';
type Workflow = 'work' | 'review' | 'look';

const QUALITY_GATE = 'Use only official documentation, peer-reviewed sources, and institutional references. Do not cite Reddit, unverified blog posts, or Stack Overflow answers without primary source verification.';

const WORKFLOWS = {
  work: { icon: '🚀', label: 'Get To Work', desc: 'Describe a task and launch' },
  review: { icon: '🔬', label: 'Review & Research', desc: 'Audit, debug, or explore alternatives' },
  look: { icon: '📊', label: 'Quick Look', desc: 'Lightweight read-only overview' },
} as const;

const REVIEW_OPTIONS = [
  { id: 'audit', label: 'Audit & Debug', desc: 'Find bugs, security issues, code smells', prompt: 'Perform a comprehensive code audit. Find bugs, security vulnerabilities, code smells, and dead code. Rate each finding by severity (critical/high/medium/low). Provide a prioritized fix list.' },
  { id: 'research', label: 'Research Alternatives', desc: 'Scholarly & institutional sources only', prompt: `Research the best practices and alternative approaches for this codebase. ${QUALITY_GATE} Compare the current implementation against state-of-the-art methods. Identify gaps and provide actionable recommendations with citations.` },
  { id: 'test', label: 'Test & Validate', desc: 'Run tests, find coverage gaps', prompt: 'Find and run the test suite. Identify untested critical paths. Fix any failing tests. Report coverage gaps with specific recommendations for what to test next.' },
  { id: 'refactor', label: 'Refactor & Clean', desc: 'Safe structural improvements', prompt: 'Identify the top 5 safest, highest-impact refactoring opportunities. Execute them. Run tests after each change. No behavior changes, no new features. Report what changed and why.' },
];

const LOOK_OPTIONS = [
  { id: 'structure', label: 'Project Structure', desc: 'Files, architecture, tech stack', prompt: 'Give me a concise overview of this project: what it does, the tech stack, file structure, and architecture. Keep it brief and scannable.' },
  { id: 'deps', label: 'Dependency Health', desc: 'Outdated, vulnerable, unused packages', prompt: 'Check all dependencies for: outdated versions, known vulnerabilities, unused packages. List findings in a table format with recommended actions.' },
  { id: 'git', label: 'Git Status', desc: 'Branches, uncommitted changes, recent history', prompt: 'Summarize the git state: current branch, uncommitted changes, recent commit history (last 10), any stale branches. Keep it brief.' },
  { id: 'readme', label: 'README Summary', desc: 'What does this project do?', prompt: 'Read the README and give me a 3-sentence summary of what this project does, how to set it up, and its current status.' },
];

export function ActionPanel({ onLaunchAgent, onInjectCurrent, hasActiveTab }: ActionPanelProps) {
  const [view, setView] = useState<View>('home');
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [clis, setClis] = useState<DetectedCLI[]>([]);
  const [selectedCli, setSelectedCli] = useState<DetectedCLI | null>(null);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedOptionPrompt, setSelectedOptionPrompt] = useState('');
  const [knownRepos, setKnownRepos] = useState<string[]>([]);
  const workingDirectory = useSidecarStore((s) => s.workingDirectory);
  const activities = useSidecarStore((s) => s.activities);

  // Detect installed CLIs on mount
  useEffect(() => {
    if (window.terminalSaddle) {
      window.terminalSaddle.system.detectCLIs().then(setClis).catch(() => {
        // Fallback: assume claude and codex
        setClis([
          { name: 'Claude', command: 'claude', version: 'detected', flag: '--dangerously-skip-permissions' },
          { name: 'Codex', command: 'codex', version: 'detected', flag: '--full-auto' },
        ]);
      });
    } else {
      setClis([
        { name: 'Claude', command: 'claude', version: 'detected', flag: '--dangerously-skip-permissions' },
        { name: 'Codex', command: 'codex', version: 'detected', flag: '--full-auto' },
      ]);
    }
  }, []);

  // Collect repos from activity
  useEffect(() => {
    const repos = new Set<string>();
    for (const a of activities) {
      if (a.path) {
        const parts = a.path.split('/');
        const userIdx = parts.indexOf('Users');
        if (userIdx >= 0 && parts.length > userIdx + 2) repos.add(parts.slice(0, userIdx + 3).join('/'));
      }
    }
    if (workingDirectory) repos.add(workingDirectory);
    setKnownRepos(Array.from(repos).sort());
  }, [activities, workingDirectory]);

  const reset = () => {
    setView('home');
    setWorkflow(null);
    setSelectedCli(null);
    setSelectedRepo('');
    setCustomPrompt('');
    setSelectedOptionPrompt('');
  };

  const handleWorkflow = (wf: Workflow) => {
    setWorkflow(wf);
    setSelectedRepo(workingDirectory || '');
    if (wf === 'look') {
      // Quick Look doesn't need CLI — go straight to repo + options
      setView('repo-select');
    } else {
      setView('cli-select');
    }
  };

  const handleSelectCli = (cli: DetectedCLI) => {
    setSelectedCli(cli);
    setView('repo-select');
  };

  const handleSelectRepo = () => {
    if (workflow === 'work') {
      setView('custom-prompt');
    } else {
      setView('options');
    }
  };

  const launch = (prompt: string, label: string) => {
    const cwd = selectedRepo || workingDirectory || '~';
    const flat = prompt.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
    const escaped = flat.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const cdCmd = cwd === '~' ? 'cd ~' : `cd '${cwd}'`;

    if (selectedCli) {
      const agent = selectedCli.command as 'claude' | 'codex';
      const cmd = `${cdCmd} && ${selectedCli.command} ${selectedCli.flag} -p $'${escaped}'`;
      onLaunchAgent(cmd, label, agent);
    } else if (hasActiveTab) {
      // Quick Look: inject into current terminal
      onInjectCurrent(flat);
    }
    reset();
  };

  // Glass style helpers
  const glass = (active?: boolean): React.CSSProperties => ({
    background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    border: `1px solid ${active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.10)'}`,
    borderRadius: t.radius.md,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12)`,
    color: t.text.primary,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  const hoverGlass = (e: React.MouseEvent, enter: boolean) => {
    const el = e.currentTarget as HTMLElement;
    el.style.background = enter ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
    el.style.borderColor = enter ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.10)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: 10, fontFamily: t.font.sans }}>
      {/* Header with back button */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, flexShrink: 0, minHeight: 24 }}>
        {view !== 'home' && (
          <button onClick={view === 'cli-select' || (view === 'repo-select' && workflow === 'look') ? reset : () => setView(
            view === 'repo-select' ? 'cli-select' :
            view === 'options' ? 'repo-select' :
            view === 'custom-prompt' ? 'repo-select' : 'home'
          )} style={{ ...glass(), padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
            ← Back
          </button>
        )}
        <span style={{ fontSize: 12, fontWeight: 700, color: t.text.primary, marginLeft: view === 'home' ? 0 : 'auto' }}>
          {view === 'home' ? 'Quick Actions' : workflow ? WORKFLOWS[workflow].label : ''}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {/* ===== HOME: 3 workflow buttons ===== */}
        {view === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {(Object.entries(WORKFLOWS) as [Workflow, typeof WORKFLOWS.work][]).map(([key, wf]) => (
              <button key={key} onClick={() => handleWorkflow(key)}
                style={{ ...glass(), padding: '16px 14px', textAlign: 'left', width: '100%' }}
                onMouseEnter={(e) => hoverGlass(e, true)} onMouseLeave={(e) => hoverGlass(e, false)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{wf.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{wf.label}</div>
                    <div style={{ fontSize: 11, color: t.text.muted, marginTop: 2 }}>{wf.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}

        {/* ===== CLI SELECT ===== */}
        {view === 'cli-select' && (
          <motion.div key="cli" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <div style={{ fontSize: 11, color: t.text.muted, fontWeight: 600, marginBottom: 4 }}>Choose your AI</div>
            {clis.map((cli) => {
              const color = cli.command === 'claude' ? t.agent.claude : cli.command === 'codex' ? t.agent.codex : t.accent.purple;
              const icon = cli.command === 'claude' ? '✦' : cli.command === 'codex' ? '◈' : '●';
              return (
                <button key={cli.command} onClick={() => handleSelectCli(cli)}
                  style={{
                    ...glass(), padding: '14px', textAlign: 'left', width: '100%',
                    borderColor: `${color}30`,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${color}18`; (e.currentTarget as HTMLElement).style.borderColor = `${color}50`; }}
                  onMouseLeave={(e) => hoverGlass(e, false)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20, color }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color }}>{cli.name}</div>
                      <div style={{ fontSize: 10, color: t.text.muted }}>{cli.version}</div>
                    </div>
                  </div>
                </button>
              );
            })}
            {clis.length === 0 && (
              <div style={{ fontSize: 12, color: t.text.muted, padding: 12 }}>No AI CLIs detected. Install claude or codex.</div>
            )}
          </motion.div>
        )}

        {/* ===== REPO SELECT ===== */}
        {view === 'repo-select' && (
          <motion.div key="repo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <div style={{ fontSize: 11, color: t.text.muted, fontWeight: 600 }}>Point at a repo</div>
            {knownRepos.map((repo) => (
              <button key={repo} onClick={() => { setSelectedRepo(repo); handleSelectRepo(); }}
                style={{ ...glass(selectedRepo === repo), padding: '10px 12px', textAlign: 'left', width: '100%' }}
                onMouseEnter={(e) => hoverGlass(e, true)} onMouseLeave={(e) => hoverGlass(e, false)}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{repo.split('/').pop()}</div>
                <div style={{ fontSize: 10, color: t.text.muted, fontFamily: t.font.mono, marginTop: 2 }}>{repo}</div>
              </button>
            ))}
            {knownRepos.length === 0 && (
              <div style={{ fontSize: 12, color: t.text.muted, padding: 12 }}>
                Open a terminal in a project to see repos here.
              </div>
            )}
          </motion.div>
        )}

        {/* ===== OPTIONS (Review & Research / Quick Look) ===== */}
        {view === 'options' && (
          <motion.div key="options" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflow: 'auto' }}>
            {(workflow === 'review' ? REVIEW_OPTIONS : LOOK_OPTIONS).map((opt) => (
              <button key={opt.id} onClick={() => launch(opt.prompt, opt.label)}
                style={{ ...glass(), padding: '12px', textAlign: 'left', width: '100%' }}
                onMouseEnter={(e) => hoverGlass(e, true)} onMouseLeave={(e) => hoverGlass(e, false)}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: t.text.muted, marginTop: 2 }}>{opt.desc}</div>
              </button>
            ))}

            {/* Custom query */}
            <div style={{ borderTop: `1px solid ${t.glass.border}`, paddingTop: 8, marginTop: 4 }}>
              <button onClick={() => setView('custom-prompt')}
                style={{ ...glass(), padding: '10px', textAlign: 'center', width: '100%', fontSize: 12, fontWeight: 600 }}>
                Something specific...
              </button>
            </div>
          </motion.div>
        )}

        {/* ===== CUSTOM PROMPT ===== */}
        {view === 'custom-prompt' && (
          <motion.div key="custom" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {/* Context line */}
            <div style={{ fontSize: 11, color: t.text.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
              {selectedCli && (
                <span style={{ color: selectedCli.command === 'claude' ? t.agent.claude : t.agent.codex, fontWeight: 700 }}>
                  {selectedCli.command === 'claude' ? '✦' : '◈'} {selectedCli.name}
                </span>
              )}
              {selectedRepo && <span>→ {selectedRepo.split('/').pop()}</span>}
            </div>

            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={workflow === 'work' ? "What do you want to build or do?" : "What do you want to know?"}
              autoFocus
              style={{
                flex: 1, minHeight: 100,
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${t.glass.border}`,
                borderRadius: t.radius.md,
                color: t.text.primary,
                fontSize: 13, lineHeight: 1.6,
                padding: '12px 14px',
                fontFamily: t.font.sans,
                resize: 'none', outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = t.accent.purple + '80'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = t.glass.border; }}
            />

            <button
              onClick={() => launch(customPrompt, workflow === 'work' ? 'Task' : 'Query')}
              disabled={!customPrompt.trim()}
              style={{
                ...glass(!!customPrompt.trim()),
                padding: '14px',
                textAlign: 'center',
                fontSize: 14,
                fontWeight: 700,
                opacity: customPrompt.trim() ? 1 : 0.4,
                background: customPrompt.trim()
                  ? `linear-gradient(135deg, ${(selectedCli?.command === 'codex' ? t.agent.codex : t.agent.claude)}25, rgba(255,255,255,0.08))`
                  : 'rgba(255,255,255,0.04)',
              }}
            >
              {workflow === 'work' ? 'Launch →' : 'Ask →'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
