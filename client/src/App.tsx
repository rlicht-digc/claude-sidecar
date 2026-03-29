import { useState, useCallback } from 'react';
import { useEventBridge } from './hooks/useElectronBridge';
import { useSoundEffects } from './hooks/useSoundEffects';
import { useSidecarStore } from './store/store';
import { Header } from './components/Header';
import { SessionSidebar } from './components/SessionSidebar';
import { Terminal } from './components/Terminal';
import { TerminalTabBar, TabInfo } from './components/TerminalTabBar';
import { WorkspaceScene } from './components/visual/WorkspaceScene';
import { ContextBubbles } from './components/visual/ContextBubbles';
import { ClaudeFella } from './components/visual/ClaudeFella';
import { ActionTicker } from './components/visual/ActionTicker';
import { WelcomeScreen } from './components/WelcomeScreen';

const isElectron = !!window.terminalSaddle;

export default function App() {
  useEventBridge();
  const { fileTree, setWorkingDirectory, setFileTree } = useSidecarStore();
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

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
    const result = await window.terminalSaddle.terminal.create({
      cwd: cwd || undefined,
    });
    const tabId = result.tabId;
    const label = cwd ? cwd.split('/').pop() || 'Terminal' : 'Terminal';
    const newTab: TabInfo = { id: tabId, sessionId: result.sessionId, label, cwd: cwd || '' };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(tabId);
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

  // In Electron: show saddle layout with real terminal
  // In browser: show original web layout
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
        {/* Header with macOS traffic light offset */}
        <Header onScan={handleScan} loading={loading} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(!soundEnabled)} />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* LEFT: Session sidebar */}
          <SessionSidebar onSelect={(cwd) => handleNewTab(cwd)} />

          {/* CENTER: Terminal area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

          {/* RIGHT: Animation + Actions panel */}
          <div style={{
            width: 320,
            minWidth: 320,
            borderLeft: '1px solid #21262d',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#0d1117',
          }}>
            {/* Animation window (top) */}
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
              {/* ClaudeFella character */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 0 }}>
                <ClaudeFella />
              </div>
            </div>

            {/* Action ticker (bottom) */}
            <ActionTicker />
          </div>
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
        <SessionSidebar onSelect={handleScan} />

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
