import { useState, useCallback, useEffect } from 'react';
import { useEventBridge } from './hooks/useElectronBridge';
import { useSoundEffects } from './hooks/useSoundEffects';
import { useSidecarStore } from './store/store';
import { Header } from './components/Header';
import { Terminal } from './components/Terminal';
import { TabInfo } from './components/TerminalTabBar';
import { ResizeHandle } from './components/ResizeHandle';
import { ActionPanel } from './components/ActionPanel';
import { WelcomeScreen } from './components/WelcomeScreen';
import { StatusBar } from './components/StatusBar';
import { LiveActivity } from './components/LiveActivity';
import { WorkspaceScene } from './components/visual/WorkspaceScene';
import BotAvatar, { BotState, eventToBotState } from './components/visual/BotAvatar';
import { SessionCatalog } from './components/SessionCatalog';
import { simplifyEvent } from './utils/simplify';
import { theme as t, glassPanel } from './utils/theme';

const isElectron = !!window.terminalSaddle;

export default function App() {
  useEventBridge();
  const { fileTree, workingDirectory, setWorkingDirectory, setFileTree, activities } = useSidecarStore();
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [terminalError, setTerminalError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  // Panel widths
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(320);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  useSoundEffects(soundEnabled);

  // Load username
  useEffect(() => {
    const saved = localStorage.getItem('saddle-username');
    if (saved) setUserName(saved);
    else {
      // Default to system user
      const user = window.terminalSaddle?.platform === 'darwin' ? 'User' : 'User';
      setUserName(user);
    }
  }, []);

  const handleScan = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3577/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      if (data.ok) {
        setFileTree(data.tree);
        setWorkingDirectory(data.root);
        await fetch('http://localhost:3577/watch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
      }
    } catch (e) {
      console.error('Scan failed:', e);
    }
    setLoading(false);
  };

  const handleNewTab = useCallback(async (cwd?: string) => {
    if (!window.terminalSaddle) return;
    try {
      const result = await window.terminalSaddle.terminal.create({ cwd: cwd || undefined });
      const tabId = result.tabId;
      const label = cwd ? cwd.split('/').pop() || 'Terminal' : 'New Terminal';
      const newTab: TabInfo = { id: tabId, sessionId: result.sessionId, label, cwd: cwd || '' };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(tabId);
      setTerminalError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open terminal';
      setTerminalError(message);
    }
  }, []);

  const handleCloseTab = useCallback(async (tabId: string) => {
    if (!window.terminalSaddle) return;
    await window.terminalSaddle.terminal.close(tabId);
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
      return remaining;
    });
  }, [activeTabId]);

  const handleRestoreSession = useCallback(async (session: { id: string; cwd: string; name: string }) => {
    if (!window.terminalSaddle) return;
    try {
      const result = await window.terminalSaddle.terminal.create({ cwd: session.cwd });
      const newTab: TabInfo = { id: result.tabId, sessionId: result.sessionId, label: session.name, cwd: session.cwd };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(result.tabId);
    } catch {}
  }, []);

  // Action launcher with tab reuse
  const handleLaunchAgent = useCallback(async (command: string, label: string, agent: 'claude' | 'codex') => {
    if (!window.terminalSaddle) return;
    try {
      const existingTab = tabs.find((t) => t.actionAgent === agent);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        setTimeout(() => {
          window.terminalSaddle?.terminal.write(existingTab.id, '\x03\n');
          setTimeout(() => window.terminalSaddle?.terminal.write(existingTab.id, command + '\n'), 300);
        }, 100);
      } else {
        const result = await window.terminalSaddle.terminal.create({ cwd: workingDirectory || undefined });
        const newTab: TabInfo = { id: result.tabId, sessionId: result.sessionId, label, cwd: workingDirectory || '', actionAgent: agent };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(result.tabId);
        setTimeout(() => window.terminalSaddle?.terminal.write(result.tabId, command + '\n'), 800);
      }
    } catch {}
  }, [workingDirectory, tabs]);

  const handleInjectCurrent = useCallback((prompt: string) => {
    if (!window.terminalSaddle || !activeTabId) return;
    window.terminalSaddle.terminal.write(activeTabId, prompt + '\n');
  }, [activeTabId]);

  // Get latest activity description for a tab
  function getTabActivity(tabCwd: string): string {
    const recent = activities.filter((a) => a.path?.includes(tabCwd.split('/').pop() || '')).slice(0, 1);
    if (recent.length === 0) return '';
    return simplifyEvent(recent[0].type, { path: recent[0].path });
  }

  // Determine tab display label
  function getTabDisplayLabel(tab: TabInfo): string {
    if (tab.actionAgent === 'claude') return 'Claude CLI';
    if (tab.actionAgent === 'codex') return 'Codex CLI';
    if (tab.label && tab.label !== 'New Terminal') return tab.label;
    return 'Terminal';
  }

  const effectiveLeftWidth = leftCollapsed ? 0 : leftWidth;
  const effectiveRightWidth = rightCollapsed ? 0 : rightWidth;

  if (isElectron) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100vh',
        background: t.bgGradient, color: t.text.primary, fontFamily: t.font.sans,
      }}>
        <Header onScan={handleScan} loading={loading} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(!soundEnabled)} />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '0 0 6px' }}>

          {/* ========== LEFT PANEL (glass) ========== */}
          {!leftCollapsed && (
            <div style={{
              width: effectiveLeftWidth, minWidth: effectiveLeftWidth, flexShrink: 0,
              ...glassPanel(),
              borderRadius: '0 16px 16px 0',
              margin: '6px 0 0 6px',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              position: 'relative',
            }}>
              {/* User name */}
              <div style={{ padding: '14px 16px 6px' }}>
                <div
                  style={{ fontSize: 11, color: t.text.muted, cursor: 'pointer' }}
                  title="Click to change name"
                  onClick={() => {
                    const name = prompt('Your name:', userName);
                    if (name) { setUserName(name); localStorage.setItem('saddle-username', name); }
                  }}
                >
                  {userName || 'User'}
                </div>
              </div>

              {/* ACTIVE header */}
              <div style={{
                margin: '4px 12px 8px',
                padding: '10px 14px',
                ...glassPanel({ active: true }),
              }}>
                <div style={{
                  fontSize: 15, fontWeight: 800, color: t.text.primary,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: t.status.active, boxShadow: t.shadow.glow(t.status.active),
                  }} />
                  Active
                  <span style={{ fontSize: 12, fontWeight: 400, color: t.text.muted }}>
                    {tabs.length} tab{tabs.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Terminal tabs (Chrome-style) */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTabId;
                  const activity = getTabActivity(tab.cwd);
                  const label = getTabDisplayLabel(tab);

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '10px 12px', marginBottom: 4,
                        background: isActive ? t.glass.bgActive : t.glass.bg,
                        backdropFilter: t.glass.backdropLight,
                        border: `1px solid ${isActive ? t.glass.borderHover : t.glass.border}`,
                        borderRadius: t.radius.md,
                        boxShadow: isActive ? `${t.shadow.sm}, ${t.glass.specular}` : t.glass.specular,
                        color: isActive ? t.text.primary : t.text.secondary,
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = t.glass.bgHover; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = t.glass.bg; }}
                    >
                      {/* Tab icon */}
                      <span style={{ fontSize: 14, flexShrink: 0 }}>
                        {tab.actionAgent === 'claude' ? '✦' : tab.actionAgent === 'codex' ? '◈' : '▸'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {label}
                        </div>
                        {activity && (
                          <div style={{
                            fontSize: 10, color: t.text.muted, marginTop: 2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {activity}
                          </div>
                        )}
                      </div>
                      {/* Close button */}
                      <span
                        onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}
                        style={{
                          fontSize: 14, color: t.text.muted, cursor: 'pointer', padding: '0 2px',
                          borderRadius: 4, lineHeight: 1,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = t.accent.red; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = t.text.muted; }}
                      >
                        ×
                      </span>
                    </button>
                  );
                })}

                {/* New tab button (Chrome + style) */}
                <button
                  onClick={() => handleNewTab()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 12px', marginBottom: 4,
                    background: 'transparent',
                    border: `1px dashed ${t.border.default}`,
                    borderRadius: t.radius.md,
                    color: t.text.muted, cursor: 'pointer', fontSize: 13,
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent.purple; e.currentTarget.style.color = t.text.primary; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border.default; e.currentTarget.style.color = t.text.muted; }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                  <span>New Tab</span>
                </button>

                {terminalError && (
                  <div style={{ padding: 8, fontSize: 11, color: t.accent.red, lineHeight: 1.4 }}>
                    {terminalError}
                  </div>
                )}

                {/* Detected external sessions */}
                <div style={{ marginTop: 12, paddingBottom: 140 /* space for anchored live activity */ }}>
                  <SessionCatalog onOpenTab={(cwd) => handleNewTab(cwd)} onRestoreSession={handleRestoreSession} />
                </div>
              </div>

              {/* Live Activity — anchored to bottom, superimposed */}
              <LiveActivity />
            </div>
          )}

          <ResizeHandle side="left" initialWidth={leftWidth} minWidth={200} maxWidth={450}
            onResize={setLeftWidth} collapsed={leftCollapsed}
            onToggleCollapse={() => setLeftCollapsed(!leftCollapsed)} />

          {/* ========== CENTER: Terminal ========== */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 300 }}>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {tabs.length === 0 ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  height: '100%', gap: 16, color: t.text.muted,
                }}>
                  <span style={{ fontSize: 32, opacity: 0.3 }}>▸</span>
                  <span style={{ fontSize: 14 }}>Open a terminal tab to get started</span>
                </div>
              ) : (
                tabs.map((tab) => (
                  <Terminal key={tab.id} tabId={tab.id} isActive={tab.id === activeTabId} />
                ))
              )}
            </div>

            {/* Live status bar */}
            <StatusBar />
          </div>

          <ResizeHandle side="right" initialWidth={rightWidth} minWidth={240} maxWidth={500}
            onResize={setRightWidth} collapsed={rightCollapsed}
            onToggleCollapse={() => setRightCollapsed(!rightCollapsed)} />

          {/* ========== RIGHT PANEL: 3 sections ========== */}
          {!rightCollapsed && (
            <div style={{
              width: effectiveRightWidth, minWidth: effectiveRightWidth, flexShrink: 0,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              ...glassPanel(),
              borderRadius: '16px 0 0 16px',
              margin: '6px 6px 0 0',
            }}>
              {/* TOP (~30%): File cabinet / workspace visualization */}
              <div style={{
                flex: 3, overflow: 'hidden',
                borderBottom: `1px solid ${t.glass.border}`,
                position: 'relative',
              }}>
                {fileTree.length > 0 ? (
                  <WorkspaceScene />
                ) : (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: '100%', color: t.text.muted, fontSize: 11, gap: 6,
                  }}>
                    <span style={{ fontSize: 20, opacity: 0.2 }}>📁</span>
                    <span>Scan a project to see files</span>
                  </div>
                )}
              </div>

              {/* MIDDLE (~40%): Action buttons */}
              <div style={{
                flex: 4, overflow: 'hidden',
                borderBottom: `1px solid ${t.glass.border}`,
              }}>
                <ActionPanel
                  onLaunchAgent={handleLaunchAgent}
                  onInjectCurrent={handleInjectCurrent}
                  hasActiveTab={!!activeTabId}
                />
              </div>

              {/* BOTTOM (~30%): BotAvatar driven by live events */}
              <div style={{
                flex: 3, overflow: 'hidden',
                background: t.glass.bg,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 8,
              }}>
                <BotAvatar
                  state={activities.length > 0 && (Date.now() - activities[0].timestamp) < 5000
                    ? eventToBotState(activities[0].type)
                    : 'idle'}
                  size={100}
                />
                <div style={{ fontSize: 10, color: t.text.muted, marginTop: 6, textAlign: 'center' }}>
                  {activities.length > 0 && (Date.now() - activities[0].timestamp) < 5000
                    ? simplifyEvent(activities[0].type, { path: activities[0].path })
                    : 'Idle'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // FALLBACK: Web layout
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: t.bg.base, color: t.text.primary, fontFamily: t.font.sans,
    }}>
      <Header onScan={handleScan} loading={loading} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(!soundEnabled)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 220, flexShrink: 0 }}>
          <SessionCatalog onOpenTab={handleScan} onRestoreSession={() => {}} />
        </div>
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'auto' }}>
            {fileTree.length === 0 && !loading ? (
              <WelcomeScreen onScan={handleScan} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <BotAvatar state="idle" size={200} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
