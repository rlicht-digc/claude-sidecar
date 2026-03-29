import { useState, useEffect, useCallback, useRef } from 'react';
import { VscTerminalBash, VscSourceControl, VscRefresh, VscStarFull, VscStarEmpty, VscArchive, VscHistory, VscEdit } from 'react-icons/vsc';
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

/** Status light color based on last activity */
function getStatusLight(terminal: TerminalSession): { color: string; label: string } {
  // For external terminals, we infer activity from hook events
  if (terminal.hasClaude && terminal.claudeEventCount > 0) {
    // Check if we have a rough sense of recency from event count
    // Since we poll every 5s, active sessions have growing counts
    return { color: '#39d353', label: 'Active' }; // green
  }
  return { color: '#39d353', label: 'Active' }; // default green for detected terminals
}

export function SessionCatalog({ onOpenTab, onRestoreSession }: SessionCatalogProps) {
  const [terminals, setTerminals] = useState<TerminalSession[]>([]);
  const [pastSessions, setPastSessions] = useState<SessionMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const workingDirectory = useSidecarStore((s) => s.workingDirectory);
  const eventCount = useSidecarStore((s) => s.eventCount);
  const lastEventCountRef = useRef(0);

  // Track last-seen event counts per terminal to determine idle status
  const [terminalActivity, setTerminalActivity] = useState<Record<string, { lastCount: number; lastSeen: number }>>({});

  const fetchTerminals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3577/terminals');
      const data = await res.json();
      if (data.ok) {
        setTerminals(data.terminals);
        // Update activity tracking
        const now = Date.now();
        setTerminalActivity((prev) => {
          const next = { ...prev };
          for (const t of data.terminals) {
            const key = t.cwd;
            const prevEntry = prev[key];
            if (!prevEntry || t.claudeEventCount > prevEntry.lastCount) {
              next[key] = { lastCount: t.claudeEventCount, lastSeen: now };
            }
          }
          return next;
        });
      }
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

  useEffect(() => {
    fetchTerminals();
    fetchPastSessions();
    const interval = setInterval(() => {
      fetchTerminals();
      fetchPastSessions();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchTerminals, fetchPastSessions]);

  // Hook-event-triggered refresh
  useEffect(() => {
    if (eventCount > lastEventCountRef.current + 2) {
      fetchTerminals();
      lastEventCountRef.current = eventCount;
    }
  }, [eventCount, fetchTerminals]);

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

  const handleRename = async (id: string, name: string) => {
    if (!window.terminalSaddle) return;
    await window.terminalSaddle.sessions.rename(id, name.trim());
    setRenamingId(null);
    setRenameValue('');
    fetchPastSessions();
  };

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  /** Get status light for a terminal based on activity tracking */
  function getTerminalStatusLight(t: TerminalSession): { color: string; glow: string; label: string } {
    const activity = terminalActivity[t.cwd];
    if (!activity) return { color: '#39d353', glow: '0 0 6px #39d353', label: 'Active' };

    const minutesSinceActivity = (Date.now() - activity.lastSeen) / 60000;

    if (minutesSinceActivity < 10) {
      return { color: '#39d353', glow: '0 0 6px #39d353', label: 'Active' }; // green
    } else if (minutesSinceActivity < 20) {
      return { color: '#58a6ff', glow: '0 0 6px #58a6ff', label: 'Idle' }; // blue
    } else {
      return { color: '#8b949e', glow: '0 0 4px #8b949e', label: 'Inactive' }; // white/gray
    }
  }

  const starredSessions = pastSessions.filter((s) => s.starred && !s.archived);
  const closedSessions = pastSessions.filter((s) => !s.starred && !s.archived);
  const archivedSessions = pastSessions.filter((s) => s.archived);

  return (
    <div style={{
      width: '100%', height: '100%', background: '#0d1117',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px 8px', borderBottom: '1px solid #21262d', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: '#e6edf3', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Sessions
        </span>
        <button onClick={() => { fetchTerminals(); fetchPastSessions(); }} disabled={loading}
          style={{ background: 'transparent', border: 'none', color: '#484f58', cursor: 'pointer', padding: 2, display: 'flex' }}>
          <VscRefresh style={{ fontSize: 12, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>

        {/* === ACTIVE: Detected terminals with status lights === */}
        {terminals.length > 0 && (
          <>
            <SectionHeader label="Active" count={terminals.length} light="#39d353" />
            {terminals.map((t) => {
              const status = getTerminalStatusLight(t);
              return (
                <ExternalSessionRow
                  key={t.cwd}
                  terminal={t}
                  status={status}
                  isActive={workingDirectory === t.cwd}
                  onAdopt={() => onOpenTab(t.cwd)}
                />
              );
            })}
          </>
        )}

        {/* === STARRED === */}
        {starredSessions.length > 0 && (
          <>
            <SectionHeader label="Starred" count={starredSessions.length} light="#d29922" />
            {starredSessions.map((s) => (
              <PastSessionRow key={s.id} session={s}
                onRestore={onRestoreSession} onStar={handleStar}
                onArchive={handleArchive} onStartRename={startRename}
                renamingId={renamingId} renameValue={renameValue}
                setRenameValue={setRenameValue} onRename={handleRename}
              />
            ))}
          </>
        )}

        {/* === RECENT (closed, restorable) === */}
        {closedSessions.length > 0 && (
          <>
            <SectionHeader label="Recent" count={closedSessions.length} />
            {closedSessions.slice(0, 20).map((s) => (
              <PastSessionRow key={s.id} session={s}
                onRestore={onRestoreSession} onStar={handleStar}
                onArchive={handleArchive} onStartRename={startRename}
                renamingId={renamingId} renameValue={renameValue}
                setRenameValue={setRenameValue} onRename={handleRename}
              />
            ))}
          </>
        )}

        {/* === ARCHIVED === */}
        <div
          onClick={() => setShowArchived(!showArchived)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
            cursor: 'pointer', fontSize: 11, color: '#7d8590', fontWeight: 700,
            userSelect: 'none', borderTop: '1px solid #21262d', marginTop: 4,
          }}
        >
          <VscArchive style={{ fontSize: 11 }} />
          <span>Archived</span>
          {archivedSessions.length > 0 && (
            <span style={{ fontSize: 9, color: '#484f58', fontWeight: 400 }}>({archivedSessions.length})</span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 10 }}>{showArchived ? '▾' : '▸'}</span>
        </div>
        {showArchived && archivedSessions.map((s) => (
          <PastSessionRow key={s.id} session={s}
            onRestore={onRestoreSession} onStar={handleStar}
            onArchive={handleArchive} onStartRename={startRename}
            renamingId={renamingId} renameValue={renameValue}
            setRenameValue={setRenameValue} onRename={handleRename}
          />
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

function SectionHeader({ label, count, light }: { label: string; count: number; light?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 12px 4px', fontSize: 11, fontWeight: 700,
      color: '#e6edf3',
    }}>
      {light && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: light, boxShadow: `0 0 6px ${light}`, flexShrink: 0,
        }} />
      )}
      <span>{label}</span>
      <span style={{ fontSize: 9, color: '#484f58', fontWeight: 400 }}>({count})</span>
    </div>
  );
}

function ExternalSessionRow({ terminal: t, status, isActive, onAdopt }: {
  terminal: TerminalSession;
  status: { color: string; glow: string; label: string };
  isActive: boolean;
  onAdopt: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onAdopt}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${t.cwd}\nStatus: ${status.label}\nClick to open terminal here`}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '6px 12px', background: isActive ? '#1f2937' : hovered ? '#161b22' : 'transparent',
        border: 'none', borderLeft: isActive ? '2px solid #58a6ff' : '2px solid transparent',
        color: isActive ? '#e6edf3' : '#8b949e', cursor: 'pointer', fontSize: 12, textAlign: 'left',
      }}
    >
      {/* Status light */}
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: status.color, boxShadow: status.glow,
      }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: "'SF Mono', Monaco, Consolas, monospace", fontSize: 11, color: '#e6edf3',
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
        {/* Sub-info line */}
        <div style={{ fontSize: 9, color: '#484f58', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
          <VscTerminalBash style={{ fontSize: 9 }} />
          <span>{t.shell}</span>
          {t.claudeEventCount > 0 && (
            <>
              <span>·</span>
              <span>{t.claudeEventCount} calls</span>
            </>
          )}
          {t.isGitRepo && t.gitBranch && (
            <>
              <span>·</span>
              <VscSourceControl style={{ fontSize: 8 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.gitBranch}</span>
            </>
          )}
        </div>
      </div>

      {/* Adopt hint on hover */}
      {hovered && !isActive && (
        <span style={{
          fontSize: 8, color: '#58a6ff', background: '#58a6ff15',
          padding: '1px 5px', borderRadius: 3, fontWeight: 600, flexShrink: 0,
        }}>
          OPEN
        </span>
      )}
    </button>
  );
}

function PastSessionRow({ session: s, onRestore, onStar, onArchive, onStartRename, renamingId, renameValue, setRenameValue, onRename }: {
  session: SessionMeta;
  onRestore: (s: SessionMeta) => void;
  onStar: (id: string, starred: boolean) => void;
  onArchive: (id: string) => void;
  onStartRename: (id: string, name: string) => void;
  renamingId: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const isRenaming = renamingId === s.id;

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      style={{ position: 'relative' }}
    >
      <button
        onClick={() => !isRenaming && onRestore(s)}
        title={`${s.cwd}\nLast active: ${timeAgo(s.lastActiveAt)}\nClick to restore`}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '6px 12px', background: 'transparent', border: 'none',
          borderLeft: '2px solid transparent', color: '#7d8590',
          cursor: isRenaming ? 'default' : 'pointer', fontSize: 12, textAlign: 'left',
        }}
        onMouseEnter={(e) => { if (!isRenaming) e.currentTarget.style.background = '#161b22'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <VscHistory style={{ fontSize: 11, flexShrink: 0, opacity: 0.5 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          {isRenaming ? (
            <form onSubmit={(e) => { e.preventDefault(); onRename(s.id, renameValue); }} style={{ display: 'flex', gap: 4 }}>
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                onBlur={() => onRename(s.id, renameValue)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setRenameValue(s.name); onRename(s.id, s.name); } }}
                style={{
                  background: '#0d1117', border: '1px solid #58a6ff', borderRadius: 3,
                  color: '#e6edf3', fontSize: 11, padding: '1px 4px', width: '100%',
                  fontFamily: "'SF Mono', Monaco, Consolas, monospace", outline: 'none',
                }}
              />
            </form>
          ) : (
            <>
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
            </>
          )}
        </div>
      </button>

      {/* Hover actions */}
      {showActions && !isRenaming && (
        <div style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', gap: 1, background: '#161b22', borderRadius: 4, padding: 2,
          border: '1px solid #30363d',
        }}>
          <ActionBtn
            icon={<VscEdit style={{ fontSize: 10 }} />}
            title="Rename"
            color="#7d8590"
            onClick={(e) => { e.stopPropagation(); onStartRename(s.id, s.name); }}
          />
          <ActionBtn
            icon={s.starred ? <VscStarFull style={{ fontSize: 10 }} /> : <VscStarEmpty style={{ fontSize: 10 }} />}
            title={s.starred ? 'Unstar' : 'Star'}
            color={s.starred ? '#d29922' : '#484f58'}
            onClick={(e) => { e.stopPropagation(); onStar(s.id, !s.starred); }}
          />
          {!s.archived && (
            <ActionBtn
              icon={<VscArchive style={{ fontSize: 10 }} />}
              title="Archive"
              color="#484f58"
              onClick={(e) => { e.stopPropagation(); onArchive(s.id); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon, title, color, onClick }: {
  icon: React.ReactNode; title: string; color: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button onClick={onClick} title={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 3, display: 'flex', borderRadius: 3 }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#21262d'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
    >
      {icon}
    </button>
  );
}
