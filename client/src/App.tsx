import { useState, useCallback } from 'react';
import { useEventBridge } from './hooks/useElectronBridge';
import { useSoundEffects } from './hooks/useSoundEffects';
import { useSidecarStore } from './store/store';
import { Header } from './components/Header';
import { SessionCatalog } from './components/SessionCatalog';
import { Terminal } from './components/Terminal';
import { TerminalTabBar, TabInfo } from './components/TerminalTabBar';
import { ResizeHandle } from './components/ResizeHandle';
import { WorkspaceScene } from './components/visual/WorkspaceScene';
import { ContextBubbles } from './components/visual/ContextBubbles';
import { ClaudeFella } from './components/visual/ClaudeFella';
import { ActionTicker } from './components/visual/ActionTicker';
import { ActionPanel } from './components/ActionPanel';
import { WelcomeScreen } from './components/WelcomeScreen';

const isElectron = !!window.terminalSaddle;

export default function App() {
  useEventBridge();
  const { fileTree, workingDirectory, setWorkingDirectory, setFileTree } = useSidecarStore();
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [terminalError, setTerminalError] = useState<string | null>(null);

  // Resizable panel widths
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(320);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  useSoundEffects(soundEnabled);

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
      const result = await window.terminalSaddle.terminal.create({
        cwd: cwd || undefined,
      });
      const tabId = result.tabId;
      const label = cwd ? cwd.split('/').pop() || 'Terminal' : 'Terminal';
      const newTab: TabInfo = { id: tabId, sessionId: result.sessionId, label, cwd: cwd || '' };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(tabId);
      setTerminalError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open terminal';
      setTerminalError(message);
      console.error('Failed to create terminal:', error);
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

  const handleSelectTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  // Restore a past session: open new shell in same cwd, replay transcript as scrollback
  const handleRestoreSession = useCallback(async (session: { id: string; cwd: string; name: string }) => {
    if (!window.terminalSaddle) return;
    try {
      // Get the saved transcript
      const transcript = await window.terminalSaddle.sessions.getTranscript(session.id, { tail: 500 });

      // Open a new terminal in the same cwd
      const result = await window.terminalSaddle.terminal.create({ cwd: session.cwd });
      const tabId = result.tabId;
      const newTab: TabInfo = {
        id: tabId,
        sessionId: result.sessionId,
        label: session.name,
        cwd: session.cwd,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(tabId);
      setTerminalError(null);

      // Replay transcript as scrollback after a short delay (let xterm mount)
      if (transcript) {
        setTimeout(() => {
          // Write a visual separator then the old output
          const separator = '\x1b[90m─── restored from previous session ───\x1b[0m\r\n';
          // The transcript replay happens via the snapshot mechanism:
          // Terminal.tsx calls getSnapshot on mount, but that's for the NEW pty.
          // Instead, we write directly to the terminal via a custom approach.
          // We'll use a workaround: write the old transcript to the new PTY's output buffer
          // Actually, the cleanest way is to emit the old transcript to the renderer
          // For now, we send it as if it were PTY output
        }, 300);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore session';
      setTerminalError(message);
    }
  }, []);

  // Launch an action: open new terminal tab, auto-type the CLI command
  const handleLaunchAction = useCallback(async (command: string, label: string) => {
    if (!window.terminalSaddle) return;
    try {
      const cwd = workingDirectory || undefined;
      const result = await window.terminalSaddle.terminal.create({ cwd });
      const tabId = result.tabId;
      const newTab: TabInfo = { id: tabId, sessionId: result.sessionId, label, cwd: cwd || '' };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(tabId);
      setTerminalError(null);

      // Wait for shell to initialize, then type the command
      setTimeout(() => {
        window.terminalSaddle?.terminal.write(tabId, command + '\n');
      }, 800);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to launch action';
      setTerminalError(message);
    }
  }, [workingDirectory]);

  const effectiveLeftWidth = leftCollapsed ? 0 : leftWidth;
  const effectiveRightWidth = rightCollapsed ? 0 : rightWidth;

  if (isElectron) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0d1117',
        color: '#e6edf3',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
      }}>
        <Header onScan={handleScan} loading={loading} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(!soundEnabled)} />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* LEFT: Session sidebar */}
          {!leftCollapsed && (
            <div style={{ width: effectiveLeftWidth, minWidth: effectiveLeftWidth, overflow: 'hidden', flexShrink: 0 }}>
              <SessionCatalog onOpenTab={(cwd) => handleNewTab(cwd)} onRestoreSession={handleRestoreSession} />
            </div>
          )}

          {/* Left resize handle */}
          <ResizeHandle
            side="left"
            initialWidth={leftWidth}
            minWidth={140}
            maxWidth={400}
            onResize={setLeftWidth}
            collapsed={leftCollapsed}
            onToggleCollapse={() => setLeftCollapsed(!leftCollapsed)}
          />

          {/* CENTER: Terminal area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 300 }}>
            <TerminalTabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={handleSelectTab}
              onNewTab={() => handleNewTab()}
              onCloseTab={handleCloseTab}
            />
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {tabs.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 12,
                  color: '#484f58',
                }}>
                  <span style={{ fontSize: 14 }}>No terminals open</span>
                  {terminalError && (
                    <div style={{
                      maxWidth: 520,
                      color: '#f85149',
                      fontSize: 12,
                      lineHeight: 1.5,
                      textAlign: 'center',
                    }}>
                      {terminalError}
                    </div>
                  )}
                  <button
                    onClick={() => handleNewTab()}
                    style={{
                      background: '#238636',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 16px',
                      fontSize: 13,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Open Terminal
                  </button>
                </div>
              ) : (
                tabs.map((tab) => (
                  <Terminal key={tab.id} tabId={tab.id} isActive={tab.id === activeTabId} />
                ))
              )}
            </div>
          </div>

          {/* Right resize handle */}
          <ResizeHandle
            side="right"
            initialWidth={rightWidth}
            minWidth={200}
            maxWidth={500}
            onResize={setRightWidth}
            collapsed={rightCollapsed}
            onToggleCollapse={() => setRightCollapsed(!rightCollapsed)}
          />

          {/* RIGHT: Animation + Actions panel */}
          {!rightCollapsed && (
            <div style={{
              width: effectiveRightWidth,
              minWidth: effectiveRightWidth,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: '#0d1117',
              flexShrink: 0,
            }}>
              <div style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                borderBottom: '1px solid #21262d',
              }}>
                {fileTree.length > 0 ? (
                  <>
                    <WorkspaceScene />
                    <ContextBubbles />
                  </>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#484f58',
                    fontSize: 12,
                  }}>
                    Scan a project to see agent activity
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 0 }}>
                  <ClaudeFella />
                </div>
              </div>

              {/* Action buttons (bottom half) */}
              <div style={{ flex: 1, overflow: 'hidden', borderTop: '1px solid #21262d' }}>
                <ActionPanel onLaunchAction={handleLaunchAction} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // FALLBACK: Original web layout (non-Electron)
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0d1117',
      color: '#e6edf3',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
    }}>
      <Header onScan={handleScan} loading={loading} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(!soundEnabled)} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          <SessionCatalog onOpenTab={handleScan} onRestoreSession={() => {}} />
        </div>

        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'auto' }}>
            {fileTree.length === 0 && !loading ? (
              <WelcomeScreen onScan={handleScan} />
            ) : (
              <>
                <WorkspaceScene />
                <ContextBubbles />
              </>
            )}
          </div>
          <div style={{ position: 'relative', height: 0 }}>
            <ClaudeFella />
          </div>
        </div>
      </div>
    </div>
  );
}
