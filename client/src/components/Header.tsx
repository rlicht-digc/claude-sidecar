import { useSidecarStore } from '../store/store';
import { VscPulse, VscFolderOpened, VscSearch, VscUnmute, VscMute } from 'react-icons/vsc';
import { useState } from 'react';

interface HeaderProps {
  onScan: (path: string) => void;
  loading: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function Header({ onScan, loading, soundEnabled, onToggleSound }: HeaderProps) {
  const { connected, workingDirectory, eventCount } = useSidecarStore();
  const [scanInput, setScanInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scanInput.trim()) {
      onScan(scanInput.trim());
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '10px 16px',
      borderBottom: '1px solid #30363d',
      background: '#161b22',
      flexShrink: 0,
    }}>
      {/* Logo / Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>🔭</span>
        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>
          Claude Sidecar
        </span>
      </div>

      {/* Connection Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: connected ? '#39d353' : '#f85149',
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: connected ? '#39d353' : '#f85149',
          boxShadow: connected ? '0 0 6px #39d353' : '0 0 6px #f85149',
          animation: connected ? 'pulse 2s infinite' : 'none',
        }} />
        <span>{connected ? 'Connected' : 'Disconnected'}</span>
      </div>

      {/* Scan Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: 6,
          padding: '4px 10px',
          flex: 1,
          maxWidth: 500,
        }}>
          <VscFolderOpened style={{ color: '#7d8590', flexShrink: 0 }} />
          <input
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder={workingDirectory || 'Enter directory path to watch...'}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e6edf3',
              fontSize: 13,
              width: '100%',
              fontFamily: 'SF Mono, Monaco, Consolas, monospace',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#58a6ff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 2,
            }}
          >
            <VscSearch />
          </button>
        </div>
      </form>

      {/* Sound toggle */}
      <button
        onClick={onToggleSound}
        title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
        style={{
          background: 'transparent',
          border: 'none',
          color: soundEnabled ? '#7d8590' : '#484f58',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: 4,
          borderRadius: 4,
        }}
      >
        {soundEnabled ? <VscUnmute style={{ fontSize: 16 }} /> : <VscMute style={{ fontSize: 16 }} />}
      </button>

      {/* Event counter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: '#7d8590',
      }}>
        <VscPulse />
        <span>{eventCount} events</span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
