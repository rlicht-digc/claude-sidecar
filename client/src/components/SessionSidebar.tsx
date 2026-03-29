import { useState, useEffect, useCallback } from 'react';
import { VscTerminalBash, VscSourceControl, VscRefresh } from 'react-icons/vsc';
import { TerminalSession } from '../types';
import { useSidecarStore } from '../store/store';

interface SessionSidebarProps {
  onSelect: (path: string) => void;
}

export function SessionSidebar({ onSelect }: SessionSidebarProps) {
  const [terminals, setTerminals] = useState<TerminalSession[]>([]);
  const [loading, setLoading] = useState(false);
  const workingDirectory = useSidecarStore((s) => s.workingDirectory);

  const fetchTerminals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3577/terminals');
      const data = await res.json();
      if (data.ok) setTerminals(data.terminals);
    } catch (e) {
      console.error('Failed to fetch terminals:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTerminals();
    const interval = setInterval(fetchTerminals, 10000);
    return () => clearInterval(interval);
  }, [fetchTerminals]);

  return (
    <div style={{
      width: 180,
      minWidth: 180,
      borderRight: '1px solid #21262d',
      background: '#0d1117',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px 8px',
        borderBottom: '1px solid #21262d',
      }}>
        <span style={{
          fontSize: 10,
          color: '#484f58',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
        }}>
          Sessions
        </span>
        <button
          onClick={fetchTerminals}
          disabled={loading}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#484f58',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
          }}
        >
          <VscRefresh style={{
            fontSize: 12,
            animation: loading ? 'spin 1s linear infinite' : 'none',
          }} />
        </button>
      </div>

      {/* Terminal list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px 0',
      }}>
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
                gap: 8,
                width: '100%',
                padding: '8px 12px',
                background: isActive ? '#1f2937' : 'transparent',
                border: 'none',
                borderLeft: isActive ? '2px solid #58a6ff' : '2px solid transparent',
                color: isActive ? '#e6edf3' : '#8b949e',
                cursor: 'pointer',
                fontSize: 12,
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#161b22';
                  e.currentTarget.style.color = '#c9d1d9';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#8b949e';
                }
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <VscTerminalBash style={{ fontSize: 16 }} />
                {/* Claude indicator badge */}
                {t.hasClaude && (
                  <span style={{
                    position: 'absolute',
                    top: -3,
                    right: -5,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#da7756',
                    border: '1.5px solid #0d1117',
                    boxShadow: '0 0 4px #da7756',
                  }} />
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <span style={{
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                    fontSize: 11,
                  }}>
                    {t.dirName}
                  </span>
                  {t.hasClaude && (
                    <span style={{
                      fontSize: 8,
                      background: '#da775620',
                      color: '#da7756',
                      padding: '0 4px',
                      borderRadius: 4,
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}>
                      AI
                    </span>
                  )}
                </div>
                {t.isGitRepo && t.gitBranch && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 10,
                    color: isActive ? '#7ee787' : '#484f58',
                    marginTop: 2,
                  }}>
                    <VscSourceControl style={{ fontSize: 10 }} />
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {t.gitBranch}
                    </span>
                  </div>
                )}
                {t.claudeEventCount > 0 && (
                  <div style={{
                    fontSize: 9,
                    color: '#484f58',
                    marginTop: 1,
                  }}>
                    {t.claudeEventCount} tool calls
                  </div>
                )}
              </div>
              {isActive && (
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#39d353',
                  boxShadow: '0 0 6px #39d353',
                  flexShrink: 0,
                }} />
              )}
            </button>
          );
        })}
        {terminals.length === 0 && !loading && (
          <div style={{
            padding: '16px 12px',
            fontSize: 11,
            color: '#484f58',
            textAlign: 'center',
          }}>
            No terminals detected
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
