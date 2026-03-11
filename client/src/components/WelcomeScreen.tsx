import { useState } from 'react';
import { VscFolderOpened, VscRocket, VscTerminal } from 'react-icons/vsc';
import { motion } from 'framer-motion';

interface WelcomeScreenProps {
  onScan: (path: string) => void;
}

export function WelcomeScreen({ onScan }: WelcomeScreenProps) {
  const [path, setPath] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (path.trim()) onScan(path.trim());
  };

  const suggestions = [
    { label: 'Home directory', path: '~' },
    { label: 'Current project', path: '.' },
  ];

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      padding: 40,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔭</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Claude Sidecar</h1>
        <p style={{ color: '#7d8590', fontSize: 15, maxWidth: 500, lineHeight: 1.5 }}>
          A real-time visual companion for your terminal. Watch files come alive as Claude Code works through your codebase.
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: 8,
          width: '100%',
          maxWidth: 500,
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: 8,
          padding: '10px 14px',
          flex: 1,
        }}>
          <VscFolderOpened size={18} color="#7d8590" />
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/path/to/your/project"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e6edf3',
              fontSize: 14,
              width: '100%',
              fontFamily: 'SF Mono, Monaco, Consolas, monospace',
            }}
            autoFocus
          />
        </div>
        <button
          type="submit"
          style={{
            background: '#238636',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <VscRocket size={16} />
          Scan
        </button>
      </motion.form>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 20,
          background: '#161b22',
          borderRadius: 8,
          border: '1px solid #30363d',
          maxWidth: 500,
          width: '100%',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: '#7d8590', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Quick Start
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#c9d1d9' }}>
          <VscTerminal size={16} color="#58a6ff" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div>1. Enter a project directory path above</div>
            <div style={{ color: '#7d8590', marginTop: 4 }}>2. Start using Claude Code in your terminal</div>
            <div style={{ color: '#7d8590', marginTop: 4 }}>3. Watch your files light up in real time</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
