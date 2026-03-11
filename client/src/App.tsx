import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useSidecarStore } from './store/store';
import { Header } from './components/Header';
import { FileTree } from './components/FileTree';
import { ActivityStream } from './components/ActivityStream';
import { WelcomeScreen } from './components/WelcomeScreen';

export default function App() {
  useWebSocket();
  const { fileTree, setWorkingDirectory, setFileTree } = useSidecarStore();
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
    }}>
      <Header onScan={handleScan} loading={loading} />
      <WelcomeScreen onScan={handleScan} />
    </div>
  );
}
