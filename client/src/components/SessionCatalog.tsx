import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VscTerminalBash, VscSourceControl, VscRefresh, VscStarFull, VscStarEmpty, VscArchive, VscEdit, VscChevronDown, VscChevronRight } from 'react-icons/vsc';
import { TerminalSession, ActivityItem } from '../types';
import { useSidecarStore } from '../store/store';
import { simplifyEvent, simplifyBatch } from '../utils/simplify';
import { theme } from '../utils/theme';

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
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

export function SessionCatalog({ onOpenTab, onRestoreSession }: SessionCatalogProps) {
  const [terminals, setTerminals] = useState<TerminalSession[]>([]);
  const [pastSessions, setPastSessions] = useState<SessionMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedCwd, setExpandedCwd] = useState<string | null>(null);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const workingDirectory = useSidecarStore((s) => s.workingDirectory);
  const activities = useSidecarStore((s) => s.activities);
  const eventCount = useSidecarStore((s) => s.eventCount);
  const lastEventCountRef = useRef(0);
  const [terminalActivity, setTerminalActivity] = useState<Record<string, { lastCount: number; lastSeen: number }>>({});

  const fetchTerminals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3577/terminals');
      const data = await res.json();
      if (data.ok) {
        setTerminals(data.terminals);
        const now = Date.now();
        setTerminalActivity((prev) => {
          const next = { ...prev };
          for (const t of data.terminals) {
            const prevEntry = prev[t.cwd];
            if (!prevEntry || t.claudeEventCount > prevEntry.lastCount) {
              next[t.cwd] = { lastCount: t.claudeEventCount, lastSeen: now };
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
      const all = await window.terminalSaddle.sessions.list({});
      setPastSessions(all);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTerminals();
    fetchPastSessions();
    const interval = setInterval(() => { fetchTerminals(); fetchPastSessions(); }, 5000);
    return () => clearInterval(interval);
  }, [fetchTerminals, fetchPastSessions]);

  useEffect(() => {
    if (eventCount > lastEventCountRef.current + 2) {
      fetchTerminals();
      lastEventCountRef.current = eventCount;
    }
  }, [eventCount, fetchTerminals]);

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
    fetchPastSessions();
  };

  function getStatusLight(cwd: string): { color: string; label: string } {
    const activity = terminalActivity[cwd];
    if (!activity) return { color: theme.status.active, label: 'Active' };
    const mins = (Date.now() - activity.lastSeen) / 60000;
    if (mins < 10) return { color: theme.status.active, label: 'Active' };
    if (mins < 20) return { color: theme.status.idle, label: 'Idle' };
    return { color: theme.status.inactive, label: 'Inactive' };
  }

  // Get simplified description of what's happening for a given cwd
  function getActivityDescription(cwd: string): string {
    const relevant = activities.filter((a) => a.path?.startsWith(cwd)).slice(0, 5);
    if (relevant.length === 0) return 'No recent activity';
    return simplifyBatch(relevant.map((a) => ({ type: a.type, data: { path: a.path } })));
  }

  // Hovered tab description (simplified)
  function getHoveredDescription(): string | null {
    if (!hoveredTab) return null;
    const recent = activities.filter((a) => a.path?.startsWith(hoveredTab!)).slice(0, 3);
    if (recent.length === 0) return 'No recent activity in this session';
    return recent.map((a) => simplifyEvent(a.type, { path: a.path })).join('\n');
  }

  const closedSessions = pastSessions.filter((s) => s.status === 'closed' && !s.archived);
  const archivedSessions = pastSessions.filter((s) => s.archived);

  const t = theme;

  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg.base,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: t.font.sans,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px', flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, color: t.text.primary, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Sessions
        </span>
        <button onClick={() => { fetchTerminals(); fetchPastSessions(); }} disabled={loading}
          style={{ background: 'transparent', border: 'none', color: t.text.muted, cursor: 'pointer', padding: 4, borderRadius: t.radius.sm, display: 'flex' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = t.bg.elevated; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <VscRefresh style={{ fontSize: 13, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Scrollable session list (top 2/3) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px', minHeight: 0 }}>

        {/* === ACTIVE SESSIONS === */}
        {terminals.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
              fontSize: 11, fontWeight: 700, color: t.text.primary,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: t.status.active, boxShadow: t.shadow.glow(t.status.active),
              }} />
              Active
              <span style={{ fontSize: 10, color: t.text.muted, fontWeight: 400 }}>
                {terminals.length} window{terminals.length !== 1 ? 's' : ''}
              </span>
            </div>

            {terminals.map((term) => {
              const status = getStatusLight(term.cwd);
              const isExpanded = expandedCwd === term.cwd;

              return (
                <div key={term.cwd} style={{ marginBottom: 2 }}>
                  {/* Session card */}
                  <button
                    onClick={() => setExpandedCwd(isExpanded ? null : term.cwd)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '8px 10px', background: isExpanded ? t.bg.elevated : t.bg.surface,
                      border: `1px solid ${isExpanded ? t.border.hover : t.border.subtle}`,
                      borderRadius: t.radius.md, color: t.text.primary,
                      cursor: 'pointer', fontSize: 12, textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = t.bg.elevated; }}
                    onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = t.bg.surface; }}
                  >
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: status.color, boxShadow: t.shadow.glow(status.color),
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {term.dirName}
                        {term.hasClaude && (
                          <span style={{
                            fontSize: 8, background: `${t.agent.claude}20`, color: t.agent.claude,
                            padding: '1px 5px', borderRadius: t.radius.full, fontWeight: 600, marginLeft: 6,
                          }}>AI</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: t.text.muted, marginTop: 2, display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span>{term.shell}</span>
                        {term.claudeEventCount > 0 && <><span>·</span><span>{term.claudeEventCount} actions</span></>}
                        {term.isGitRepo && term.gitBranch && (
                          <><span>·</span><VscSourceControl style={{ fontSize: 9 }} /><span>{term.gitBranch}</span></>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <VscChevronDown style={{ fontSize: 12, color: t.text.muted }} /> : <VscChevronRight style={{ fontSize: 12, color: t.text.muted }} />}
                  </button>

                  {/* Expanded: tab dropdown */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden', marginLeft: 16, marginTop: 2 }}
                      >
                        <button
                          onClick={() => onOpenTab(term.cwd)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                            padding: '6px 10px', background: 'transparent',
                            border: `1px solid ${t.border.subtle}`, borderRadius: t.radius.sm,
                            color: t.text.secondary, cursor: 'pointer', fontSize: 11, textAlign: 'left',
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = t.bg.elevated; e.currentTarget.style.borderColor = t.accent.purple + '60'; setHoveredTab(term.cwd); }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = t.border.subtle; setHoveredTab(null); }}
                        >
                          <VscTerminalBash style={{ fontSize: 12, color: t.accent.purple }} />
                          <span>Open in Terminal Saddle</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* === RECENT (closed, collapsible) === */}
        {closedSessions.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <button
              onClick={() => setShowRecent(!showRecent)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
                fontSize: 11, fontWeight: 700, color: t.text.primary,
                background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
              }}
            >
              Recent
              <span style={{ fontSize: 10, color: t.text.muted, fontWeight: 400 }}>({closedSessions.length})</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: t.text.muted }}>{showRecent ? '▾' : '▸'}</span>
            </button>
            <AnimatePresence>
              {showRecent && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  {closedSessions.slice(0, 15).map((s) => (
                    <PastRow key={s.id} session={s} theme={t} onRestore={onRestoreSession}
                      onStar={handleStar} onArchive={handleArchive}
                      renamingId={renamingId} renameValue={renameValue}
                      setRenameValue={setRenameValue} onRename={handleRename}
                      onStartRename={(id, name) => { setRenamingId(id); setRenameValue(name); }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* === ARCHIVED === */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
            padding: '8px 8px', background: 'transparent', border: 'none',
            cursor: 'pointer', fontSize: 11, fontWeight: 700, color: t.text.secondary,
            textAlign: 'left',
          }}
        >
          <VscArchive style={{ fontSize: 11 }} />
          Archived
          {archivedSessions.length > 0 && <span style={{ fontSize: 10, fontWeight: 400, color: t.text.muted }}>({archivedSessions.length})</span>}
          <span style={{ marginLeft: 'auto', fontSize: 10 }}>{showArchived ? '▾' : '▸'}</span>
        </button>
        <AnimatePresence>
          {showArchived && archivedSessions.map((s) => (
            <PastRow key={s.id} session={s} theme={t} onRestore={onRestoreSession}
              onStar={handleStar} onArchive={handleArchive}
              renamingId={renamingId} renameValue={renameValue}
              setRenameValue={setRenameValue} onRename={handleRename}
              onStartRename={(id, name) => { setRenamingId(id); setRenameValue(name); }}
            />
          ))}
        </AnimatePresence>

        {terminals.length === 0 && pastSessions.length === 0 && !loading && (
          <div style={{ padding: 20, fontSize: 12, color: t.text.muted, textAlign: 'center' }}>
            No sessions yet
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function PastRow({ session: s, theme: t, onRestore, onStar, onArchive, onStartRename, renamingId, renameValue, setRenameValue, onRename }: {
  session: SessionMeta; theme: typeof theme;
  onRestore: (s: SessionMeta) => void;
  onStar: (id: string, starred: boolean) => void;
  onArchive: (id: string) => void;
  onStartRename: (id: string, name: string) => void;
  renamingId: string | null; renameValue: string;
  setRenameValue: (v: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isRenaming = renamingId === s.id;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', marginBottom: 1 }}
    >
      <button
        onClick={() => !isRenaming && onRestore(s)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '6px 10px', background: hovered ? t.bg.elevated : 'transparent',
          border: 'none', borderRadius: t.radius.sm,
          color: t.text.secondary, cursor: isRenaming ? 'default' : 'pointer',
          fontSize: 12, textAlign: 'left', transition: 'background 0.12s ease',
        }}
      >
        <span style={{ fontSize: 10, opacity: 0.4 }}>↩</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {isRenaming ? (
            <form onSubmit={(e) => { e.preventDefault(); onRename(s.id, renameValue); }}>
              <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                autoFocus onBlur={() => onRename(s.id, renameValue)}
                onKeyDown={(e) => { if (e.key === 'Escape') onRename(s.id, s.name); }}
                style={{
                  background: t.bg.base, border: `1px solid ${t.accent.purple}80`, borderRadius: t.radius.sm,
                  color: t.text.primary, fontSize: 11, padding: '2px 6px', width: '100%',
                  fontFamily: t.font.sans, outline: 'none',
                }}
              />
            </form>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </span>
                {s.starred && <VscStarFull style={{ fontSize: 9, color: t.accent.yellow }} />}
                <span style={{ fontSize: 9, color: t.text.muted, marginLeft: 'auto' }}>{timeAgo(s.lastActiveAt)}</span>
              </div>
              {s.lastOutputPreview && (
                <div style={{
                  fontSize: 10, color: t.text.muted, marginTop: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7,
                }}>
                  {s.lastOutputPreview.slice(0, 50)}
                </div>
              )}
            </>
          )}
        </div>
      </button>

      {hovered && !isRenaming && (
        <div style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', gap: 2, background: t.bg.overlay, borderRadius: t.radius.sm,
          padding: 2, border: `1px solid ${t.border.default}`, boxShadow: t.shadow.sm,
        }}>
          <HoverBtn icon={<VscEdit style={{ fontSize: 10 }} />} title="Rename" color={t.text.muted}
            onClick={(e) => { e.stopPropagation(); onStartRename(s.id, s.name); }} bg={t.bg.elevated} />
          <HoverBtn
            icon={s.starred ? <VscStarFull style={{ fontSize: 10 }} /> : <VscStarEmpty style={{ fontSize: 10 }} />}
            title={s.starred ? 'Unstar' : 'Star'} color={s.starred ? t.accent.yellow : t.text.muted}
            onClick={(e) => { e.stopPropagation(); onStar(s.id, !s.starred); }} bg={t.bg.elevated}
          />
          {!s.archived && (
            <HoverBtn icon={<VscArchive style={{ fontSize: 10 }} />} title="Archive" color={t.text.muted}
              onClick={(e) => { e.stopPropagation(); onArchive(s.id); }} bg={t.bg.elevated} />
          )}
        </div>
      )}
    </div>
  );
}

function HoverBtn({ icon, title, color, onClick, bg }: {
  icon: React.ReactNode; title: string; color: string; bg: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button onClick={onClick} title={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 3, display: 'flex', borderRadius: 4 }}
      onMouseEnter={(e) => { e.currentTarget.style.background = bg; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
    >
      {icon}
    </button>
  );
}
