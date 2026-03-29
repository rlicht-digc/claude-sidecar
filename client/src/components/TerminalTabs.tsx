import { useState, useEffect, useCallback } from 'react';
import { VscTerminalBash, VscSourceControl, VscRefresh } from 'react-icons/vsc';
import { TerminalSession } from '../types';
import { useSidecarStore } from '../store/store';

interface TerminalTabsProps {
  onSelect: (path: string) => void;
}

const shellIcons: Record<string, string> = {
  zsh: '⚡',
  bash: '🐚',
  fish: '🐟',
};

export function TerminalTabs({ onSelect }: TerminalTabsProps) {
  const [terminals, setTerminals] = useState<TerminalSession[]>([]);
  const [loading, setLoading] = useState(false);
  const workingDirectory = useSidecarStore((s) => s.workingDirectory);

  const fetchTerminals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3577/terminals');
      const data = await res.json();
      if (data.ok) {
        setTerminals(data.terminals);
      }
    } catch (e) {
      console.error('Failed to fetch terminals:', e);
    }
    setLoading(false);
  }, []);

  // Fetch on mount and every 10 seconds
  useEffect(() => {
    fetchTerminals();
    const interval = setInterval(fetchTerminals, 10000);
    return () => clearInterval(interval);
  }, [fetchTerminals]);

  if (terminals.length === 0 && !loading) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 16px',
      borderBottom: '1px solid #21262d',
      background: '#0d1117',
      overflowX: 'auto',
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: 11,
        color: '#484f58',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 600,
        marginRight: 4,
        flexShrink: 0,
      }}>
        Sessions
      </span>

      {terminals.map((t) => {
        const isActive = workingDirectory === t.cwd;
        return (
          <button
            key={t.cwd}
            onClick={() => onSelect(t.cwd)}
            title={t.cwd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: isActive ? '#1f2937' : 'transparent',
              border: isActive ? '1px solid #58a6ff' : '1px solid #30363d',
              borderRadius: 6,
              color: isActive ? '#e6edf3' : '#8b949e',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'SF Mono, Monaco, Consolas, monospace',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = '#484f58';
                e.currentTarget.style.color = '#c9d1d9';
                e.currentTarget.style.background = '#161b22';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = '#30363d';
                e.currentTarget.style.color = '#8b949e';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <VscTerminalBash style={{ fontSize: 14, flexShrink: 0 }} />
            <span style={{ fontWeight: 500 }}>{t.dirName}</span>
            {t.isGitRepo && t.gitBranch && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 10,
                color: isActive ? '#7ee787' : '#484f58',
                marginLeft: 2,
              }}>
                <VscSourceControl style={{ fontSize: 11 }} />
                {t.gitBranch}
              </span>
            )}
            <span style={{
              fontSize: 9,
              color: '#484f58',
              marginLeft: 2,
            }}>
              {t.shell}
            </span>
            {isActive && (
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#39d353',
                boxShadow: '0 0 6px #39d353',
                marginLeft: 2,
              }} />
            )}
          </button>
        );
      })}

      <button
        onClick={fetchTerminals}
        disabled={loading}
        title="Refresh terminals"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: 4,
          background: 'transparent',
          border: 'none',
          color: '#484f58',
          cursor: 'pointer',
          borderRadius: 4,
          marginLeft: 'auto',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#8b949e'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#484f58'; }}
      >
        <VscRefresh style={{
          fontSize: 14,
          animation: loading ? 'spin 1s linear infinite' : 'none',
        }} />
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
