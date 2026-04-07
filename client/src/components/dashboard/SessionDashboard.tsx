import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidecarStore } from '../../store/store';
import { theme as t, glassPanel } from '../../utils/theme';
import { SessionCard, SessionCardData } from './SessionCard';
import { TabInfo } from '../TerminalTabBar';

interface SessionDashboardProps {
  tabs: TabInfo[];
  activeTabId: string | null;
  onSelectTab?: (tabId: string) => void;
}

export function SessionDashboard({ tabs, activeTabId, onSelectTab }: SessionDashboardProps) {
  const sessionSummaries = useSidecarStore((s) => s.sessionSummaries);
  const setHoveredSessionId = useSidecarStore((s) => s.setHoveredSessionId);
  const toneMode = useSidecarStore((s) => s.toneMode);
  const eventCount = useSidecarStore((s) => s.eventCount);
  const currentPhase = useSidecarStore((s) => s.currentPhase);

  // Build cards: internal tabs + external hook sessions (not matched to a tab)
  const cards = useMemo<SessionCardData[]>(() => {
    const internalTabIds = new Set(tabs.map((tab) => tab.sessionId).filter(Boolean));

    // Internal tabs
    const internalCards: SessionCardData[] = tabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      cwd: tab.cwd,
      isInternal: true,
      actionAgent: tab.actionAgent,
      isWatch: tab.isWatch,
      summary: tab.sessionId ? sessionSummaries[tab.sessionId] : undefined,
    }));

    // External sessions from hook events (no matching internal tab)
    const externalCards: SessionCardData[] = Object.values(sessionSummaries)
      .filter((s) => !internalTabIds.has(s.sessionId))
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp)
      .map((summary) => {
        const projectName = summary.narrative
          ? summary.narrative.slice(0, 30)
          : `Session ${summary.sessionId.slice(0, 8)}`;
        return {
          id: summary.sessionId,
          label: `Claude Code`,
          cwd: '',
          isInternal: false,
          summary,
        };
      });

    return [...internalCards, ...externalCards];
  }, [tabs, sessionSummaries]);

  const activeSessions = cards.filter(
    (c) => c.summary && (Date.now() - c.summary.lastTimestamp) < 30000
  );

  const hasAnything = cards.length > 0 || eventCount > 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      padding: '16px 16px 0',
    }}>
      {/* Dashboard header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, flexShrink: 0,
      }}>
        <div>
          <div style={{
            fontSize: 18, fontWeight: 800, color: t.text.primary,
            letterSpacing: '-0.3px',
          }}>
            Active Sessions
          </div>
          <div style={{ fontSize: 11, color: t.text.muted, marginTop: 2 }}>
            {activeSessions.length > 0
              ? `${activeSessions.length} session${activeSessions.length !== 1 ? 's' : ''} running`
              : 'Watching for AI activity…'}
          </div>
        </div>

        {/* Global stats */}
        {eventCount > 0 && (
          <div style={{
            display: 'flex', gap: 12, alignItems: 'center',
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: t.accent.purple }}>
                {eventCount}
              </div>
              <div style={{ fontSize: 9, color: t.text.disabled }}>total actions</div>
            </div>
            <div style={{
              ...glassPanel({ active: currentPhase !== 'idle' }),
              padding: '4px 10px',
              fontSize: 11, fontWeight: 600,
              color: currentPhase !== 'idle' ? t.status.active : t.text.muted,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {currentPhase !== 'idle' && (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: t.status.active, display: 'inline-block',
                  }}
                />
              )}
              {currentPhase === 'idle' ? 'Idle' : 'Working'}
            </div>
          </div>
        )}
      </div>

      {/* Cards grid */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        paddingBottom: 16,
      }}>
        {cards.length === 0 ? (
          <EmptyState hasEvents={eventCount > 0} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}>
            <AnimatePresence initial={false}>
              {cards.map((card) => (
                <SessionCard
                  key={card.id}
                  card={card}
                  toneMode={toneMode}
                  onHoverEnter={(id) => setHoveredSessionId(id)}
                  onHoverLeave={() => setHoveredSessionId(null)}
                  onClick={card.isInternal && onSelectTab
                    ? () => onSelectTab(card.id)
                    : undefined}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ hasEvents }: { hasEvents: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', minHeight: 300,
        textAlign: 'center', padding: 32,
        color: t.text.muted,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.25 }}>✦</div>
      <div style={{
        fontSize: 16, fontWeight: 700, color: t.text.secondary, marginBottom: 8,
      }}>
        {hasEvents ? 'Sessions will appear here' : 'No active sessions'}
      </div>
      <div style={{
        fontSize: 12, color: t.text.disabled, lineHeight: 1.7, maxWidth: 320,
      }}>
        Start Claude Code in any terminal window. This dashboard will
        automatically detect active sessions and show you what your AI
        assistant is working on in plain language.
      </div>

      {/* How-to hint */}
      <div style={{
        marginTop: 24,
        padding: '12px 16px',
        background: t.glass.bg,
        border: `1px solid ${t.glass.border}`,
        borderRadius: t.radius.md,
        fontSize: 11, color: t.text.muted, lineHeight: 1.6,
        maxWidth: 280,
      }}>
        <strong style={{ color: t.text.secondary }}>Quick start:</strong>
        {' '}Open a terminal, navigate to your project, and run{' '}
        <code style={{ color: t.accent.blue, fontFamily: 'monospace' }}>claude</code>
        {' '}to begin.
      </div>
    </motion.div>
  );
}
