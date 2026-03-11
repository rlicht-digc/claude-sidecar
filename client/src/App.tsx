import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useSidecarStore } from './store/store';
import { Header } from './components/Header';
import { FileTree } from './components/FileTree';
import { ActivityStream } from './components/ActivityStream';
import { WelcomeScreen } from './components/WelcomeScreen';

export default function App() {
  useWebSocket();
  const { fileTree, workingDirectory, setWorkingDirectory, setFileTree } = useSidecarStore();
  const [loading, setLoading] = useState(false);

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
        // Also start watching
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
      <Header onScan={handleScan} loading={loading} />
      {fileTree.length === 0 && !loading ? (
        <WelcomeScreen onScan={handleScan} />
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{
            width: 340,
            borderRight: '1px solid #30363d',
            overflow: 'auto',
            padding: '8px 0',
          }}>
            <FileTree nodes={fileTree} />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ActivityStream />
          </div>
        </div>
      )}
    </div>
  );
}
