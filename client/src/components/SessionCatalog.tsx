import { useState, useEffect, useCallback, useRef } from 'react';
import { VscTerminalBash, VscSourceControl, VscRefresh, VscStarFull, VscStarEmpty, VscArchive, VscHistory, VscCircleFilled } from 'react-icons/vsc';
import { TerminalSession } from '../types';
import { useSidecarStore } from '../store/store';

interface SessionMeta {
  id: string;
  name: string;
  cwd: string;
  shell: string;
  createdAt: string;
  lastActiveAt: string;
  status: 'active' | 'idle' | 'closed';
  starred: boolean;
  archived: boolean;
  lastOutputPreview: string;
  eventCount: number;
}

interface SessionCatalogProps {
  onOpenTab: (cwd: string) => void;
  onRestoreSession: (session: SessionMeta) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function SessionCatalog({ onOpenTab, onRestoreSession }: SessionCatalogProps) {
  const [terminals, setTerminals] = useState<TerminalSession[]>([]);
  const [pastSessions, setPastSessions] = useState<SessionMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const workingDirectory = useSidecarStore((s) => s.workingDirectory);
  const eventCount = useSidecarStore((s) => s.eventCount);
  const lastEventCountRef = useRef(0);

  const fetchTerminals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3577/terminals');
      const data = await res.json();
      if (data.ok) setTerminals(data.terminals);
    } catch {}
    setLoading(false);
  }, []);

  const fetchPastSessions = useCallback(async () => {
    if (!window.terminalSaddle) return;
    try {
      const sessions = await window.terminalSaddle.sessions.list({ archived: false });
      setPastSessions(sessions.filter((s: SessionMeta) => s.status === 'closed'));
    } catch {}
  }, []);

  const fetchArchivedSessions = useCallback(async () => {
    if (!window.terminalSaddle) return;
    try {
      const sessions = await window.terminalSaddle.sessions.list({ archived: true });
      setPastSessions((prev) => {
        const closed = prev.filter((s) => !s.archived);
        return [...closed, ...sessions];
      });
    } catch {}
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchTerminals();
    fetchPastSessions();
    const interval = setInterval(() => {
      fetchTerminals();
      fetchPastSessions();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchTerminals, fetchPastSessions]);

  // Hook-event-triggered refresh: when new events arrive, refresh immediately
  useEffect(() => {
    if (eventCount > lastEventCountRef.current + 2) {
      fetchTerminals();
      lastEventCountRef.current = eventCount;
    }
  }, [eventCount, fetchTerminals]);

  // Load archived when expanded
  useEffect(() => {
    if (showArchived) fetchArchivedSessions();
  }, [showArchived, fetchArchivedSessions]);

  const handleStar = async (id: string, starred: boolean) => {
    if (!window.terminalSaddle) return;
    await window.terminalSaddle.sessions.star(id, starred);
    fetchPastSessions();
  };

  const handleArchive = async (id: string) => {
    if (!window.terminalSaddle) return;
    await window.terminalSaddle.sessions.archive(id);
    fetchPastSessions();
  };

  const starredSessions = pastSessions.filter((s) => s.starred && !s.archived);
  const recentSessions = pastSessions.filter((s) => !s.starred && !s.archived);
  const archivedSessions = pastSessions.filter((s) => s.archived);

  return (
    <div style={{
      width: '100%',
      height: '100%',
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
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Sessions
        </span>
        <button onClick={() => { fetchTerminals(); fetchPastSessions(); }} disabled={loading}
          style={{ background: 'transparent', border: 'none', color: '#484f58', cursor: 'pointer', padding: 2, display: 'flex' }}>
          <VscRefresh style={{ fontSize: 12, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>

        {/* === ACTIVE: External terminals detected via ps === */}
        {terminals.length > 0 && (
          <>
            <SectionHeader icon={<VscCircleFilled style={{ fontSize: 6, color: '#39d353' }} />} label="Active" count={terminals.length} />
            {terminals.map((t) => (
              <ExternalSessionRow
                key={t.cwd}
                terminal={t}
                isActive={workingDirectory === t.cwd}
                onClick={() => onOpenTab(t.cwd)}
              />
            ))}
          </>
        )}

        {/* === STARRED: Past sessions marked as important === */}
        {starredSessions.length > 0 && (
          <>
            <SectionHeader icon={<VscStarFull style={{ fontSize: 9, color: '#d29922' }} />} label="Starred" count={starredSessions.length} />
            {starredSessions.map((s) => (
              <PastSessionRow key={s.id} session={s} onRestore={onRestoreSession} onStar={handleStar} onArchive={handleArchive} />
            ))}
          </>
        )}

        {/* === RECENT: Closed sessions that can be restored === */}
        {recentSessions.length > 0 && (
          <>
            <SectionHeader icon={<VscHistory style={{ fontSize: 9, color: '#7d8590' }} />} label="Recent" count={recentSessions.length} />
            {recentSessions.slice(0, 20).map((s) => (
              <PastSessionRow key={s.id} session={s} onRestore={onRestoreSession} onStar={handleStar} onArchive={handleArchive} />
            ))}
          </>
        )}

        {/* === ARCHIVED === */}
        <div
          onClick={() => setShowArchived(!showArchived)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
            cursor: 'pointer', fontSize: 10, color: '#484f58', userSelect: 'none',
            borderTop: '1px solid #21262d', marginTop: 4,
          }}
        >
          <VscArchive style={{ fontSize: 10 }} />
          <span>Archived {archivedSessions.length > 0 ? `(${archivedSessions.length})` : ''}</span>
        </div>
        {showArchived && archivedSessions.map((s) => (
          <PastSessionRow key={s.id} session={s} onRestore={onRestoreSession} onStar={handleStar} onArchive={handleArchive} />
        ))}

        {terminals.length === 0 && pastSessions.length === 0 && !loading && (
          <div style={{ padding: '16px 12px', fontSize: 11, color: '#484f58', textAlign: 'center' }}>
            No sessions detected
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 12px 4px', fontSize: 10, color: '#484f58',
      textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
    }}>
      {icon}
      <span>{label}</span>
      <span style={{ fontSize: 9, opacity: 0.6 }}>({count})</span>
    </div>
  );
}

function ExternalSessionRow({ terminal: t, isActive, onClick }: { terminal: TerminalSession; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={`${t.cwd}\nClick to open terminal here`}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '6px 12px', background: isActive ? '#1f2937' : 'transparent',
        border: 'none', borderLeft: isActive ? '2px solid #58a6ff' : '2px solid transparent',
        color: isActive ? '#e6edf3' : '#8b949e', cursor: 'pointer', fontSize: 12, textAlign: 'left',
      }}
      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = '#161b22'; } }}
      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = isActive ? '#1f2937' : 'transparent'; } }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <VscTerminalBash style={{ fontSize: 14 }} />
        {t.hasClaude && (
          <span style={{
            position: 'absolute', top: -3, right: -5, width: 7, height: 7,
            borderRadius: '50%', background: '#da7756', border: '1.5px solid #0d1117',
          }} />
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: "'SF Mono', Monaco, Consolas, monospace", fontSize: 11,
          }}>
            {t.dirName}
          </span>
          {t.hasClaude && (
            <span style={{
              fontSize: 7, background: '#da775620', color: '#da7756',
              padding: '0 3px', borderRadius: 3, fontWeight: 600,
            }}>AI</span>
          )}
        </div>
        {t.isGitRepo && t.gitBranch && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#484f58', marginTop: 1 }}>
            <VscSourceControl style={{ fontSize: 9 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.gitBranch}</span>
          </div>
        )}
      </div>
      {isActive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#39d353', flexShrink: 0 }} />}
    </button>
  );
}

function PastSessionRow({ session: s, onRestore, onStar, onArchive }: {
  session: SessionMeta;
  onRestore: (s: SessionMeta) => void;
  onStar: (id: string, starred: boolean) => void;
  onArchive: (id: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      style={{ position: 'relative' }}
    >
      <button
        onClick={() => onRestore(s)}
        title={`${s.cwd}\nLast active: ${timeAgo(s.lastActiveAt)}\nClick to restore`}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '6px 12px', background: 'transparent', border: 'none',
          borderLeft: '2px solid transparent', color: '#7d8590',
          cursor: 'pointer', fontSize: 12, textAlign: 'left',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#161b22'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <VscHistory style={{ fontSize: 12, flexShrink: 0, opacity: 0.5 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: "'SF Mono', Monaco, Consolas, monospace", fontSize: 11,
            }}>
              {s.name}
            </span>
            {s.starred && <VscStarFull style={{ fontSize: 9, color: '#d29922', flexShrink: 0 }} />}
          </div>
          <div style={{ fontSize: 9, color: '#484f58', marginTop: 1 }}>
            {timeAgo(s.lastActiveAt)} {s.eventCount > 0 ? `· ${s.eventCount} events` : ''}
          </div>
          {s.lastOutputPreview && (
            <div style={{
              fontSize: 9, color: '#484f58', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: "'SF Mono', Monaco, Consolas, monospace", opacity: 0.7,
            }}>
              {s.lastOutputPreview.slice(0, 60)}
            </div>
          )}
        </div>
      </button>

      {/* Hover actions */}
      {showActions && (
        <div style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', gap: 2, background: '#161b22', borderRadius: 4, padding: 2,
          border: '1px solid #30363d',
        }}>
          <button onClick={(e) => { e.stopPropagation(); onStar(s.id, !s.starred); }}
            title={s.starred ? 'Unstar' : 'Star'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.starred ? '#d29922' : '#484f58', padding: 3, display: 'flex' }}>
            {s.starred ? <VscStarFull style={{ fontSize: 11 }} /> : <VscStarEmpty style={{ fontSize: 11 }} />}
          </button>
          {!s.archived && (
            <button onClick={(e) => { e.stopPropagation(); onArchive(s.id); }}
              title="Archive"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#484f58', padding: 3, display: 'flex' }}>
              <VscArchive style={{ fontSize: 11 }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
