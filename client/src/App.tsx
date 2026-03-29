import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useSoundEffects } from './hooks/useSoundEffects';
import { useSidecarStore } from './store/store';
import { Header } from './components/Header';
import { SessionSidebar } from './components/SessionSidebar';
import { ProjectInfoPanel } from './components/ProjectInfoPanel';
import { WelcomeScreen } from './components/WelcomeScreen';
import { WorkspaceScene } from './components/visual/WorkspaceScene';
import { ContextBubbles } from './components/visual/ContextBubbles';
import { ClaudeFella } from './components/visual/ClaudeFella';

export default function App() {
  useWebSocket();
  const { fileTree, setWorkingDirectory, setFileTree } = useSidecarStore();
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

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

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        {/* Left sidebar: terminal sessions */}
        <SessionSidebar onSelect={handleScan} />

        {/* Info panel: project + activity + files + tools */}
        <ProjectInfoPanel />

        {/* Main workspace area */}
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
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
          {/* Character sits at bottom, outside the scrollable area so speech bubbles aren't clipped */}
          <div style={{ position: 'relative', height: 0 }}>
            <ClaudeFella />
          </div>
        </div>
      </div>
    </div>
  );
}
