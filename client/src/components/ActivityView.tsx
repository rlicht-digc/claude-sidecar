import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSidecarStore } from '../store/store';
import { simplifyEvent } from '../utils/simplify';
import { theme as t } from '../utils/theme';

interface ActivityViewProps {
  /** Filter events to this cwd/repo */
  filterCwd: string;
  isActive: boolean;
}

/** Live activity feed tab — shows hook events for an external terminal session */
export function ActivityView({ filterCwd, isActive }: ActivityViewProps) {
  const activities = useSidecarStore((s) => s.activities);
  const bottomRef = useRef<HTMLDivElement>(null);

  const repoName = filterCwd.split('/').pop() || filterCwd;

  // Filter to events matching this cwd
  const filtered = activities.filter((a) => a.path?.includes(repoName)).slice(0, 100);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (isActive && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filtered.length, isActive]);

  if (!isActive) return null;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'rgba(10, 9, 18, 0.6)',
      display: 'flex', flexDirection: 'column',
      fontFamily: t.font.sans,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${t.glass.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: t.status.active,
          boxShadow: t.shadow.glow(t.status.active),
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: t.text.primary }}>
          Watching: {repoName}
        </span>
        <span style={{ fontSize: 10, color: t.text.muted, marginLeft: 'auto' }}>
          {filtered.length} events
        </span>
      </div>

      {/* Event feed */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '8px 12px',
        display: 'flex', flexDirection: 'column-reverse', gap: 2,
      }}>
        <div ref={bottomRef} />
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: t.text.muted, fontSize: 12 }}>
            Waiting for activity in {repoName}...
          </div>
        )}
        {filtered.map((event, i) => {
          const age = Date.now() - event.timestamp;
          const isRecent = age < 5000;
          const timeStr = age < 60000 ? `${Math.floor(age / 1000)}s` : age < 3600000 ? `${Math.floor(age / 60000)}m` : `${Math.floor(age / 3600000)}h`;

          return (
            <motion.div
              key={event.id}
              initial={i === 0 ? { opacity: 0, x: -10 } : false}
              animate={{ opacity: 1, x: 0 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '6px 8px',
                borderRadius: t.radius.sm,
                background: isRecent ? 'rgba(255,255,255,0.03)' : 'transparent',
              }}
            >
              {/* Timeline dot */}
              <div style={{ paddingTop: 4, flexShrink: 0 }}>
                <span style={{
                  display: 'block', width: 6, height: 6, borderRadius: '50%',
                  background: event.color || t.accent.purple,
                  boxShadow: isRecent ? `0 0 8px ${event.color || t.accent.purple}` : 'none',
                }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  color: isRecent ? t.text.primary : t.text.secondary,
                  fontWeight: isRecent ? 600 : 400,
                }}>
                  {simplifyEvent(event.type, { path: event.path })}
                </div>
                {event.path && (
                  <div style={{
                    fontSize: 10, color: t.text.muted, marginTop: 1,
                    fontFamily: t.font.mono,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {event.path.split('/').slice(-2).join('/')}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span style={{ fontSize: 9, color: t.text.muted, flexShrink: 0, paddingTop: 2 }}>
                {timeStr}
              </span>
            </motion.div>
          );
        })}
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
