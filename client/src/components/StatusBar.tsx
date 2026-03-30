import { useMemo } from 'react';
import { useSidecarStore } from '../store/store';
import { simplifyEvent } from '../utils/simplify';
import { theme as t } from '../utils/theme';

/** Persistent status bar showing real-time AI activity at a glance */
export function StatusBar() {
  const activities = useSidecarStore((s) => s.activities);
  const eventCount = useSidecarStore((s) => s.eventCount);
  const connected = useSidecarStore((s) => s.connected);

  const status = useMemo(() => {
    if (activities.length === 0) return { text: 'Waiting for activity...', color: t.text.muted, isActive: false };

    const latest = activities[0];
    const age = Date.now() - latest.timestamp;

    if (age > 30000) return { text: 'Idle', color: t.text.muted, isActive: false };
    if (age > 10000) return {
      text: simplifyEvent(latest.type, { path: latest.path }),
      color: t.status.idle,
      isActive: false,
    };

    return {
      text: simplifyEvent(latest.type, { path: latest.path }),
      color: t.status.active,
      isActive: true,
    };
  }, [activities]);

  // Calculate session duration from first event
  const duration = useMemo(() => {
    if (activities.length === 0) return '';
    const oldest = activities[activities.length - 1];
    const mins = Math.floor((Date.now() - oldest.timestamp) / 60000);
    if (mins < 1) return 'just started';
    if (mins < 60) return `${mins}m active`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m active`;
  }, [activities]);

  // Detect which AI is running from recent events
  const agentLabel = useMemo(() => {
    const recent = activities.slice(0, 20);
    const hasAgent = recent.some((a) => a.type === 'tool:agent');
    if (hasAgent) return 'Claude + Agents';
    if (recent.length > 0) return 'Claude';
    return '';
  }, [activities]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 16px',
      background: 'rgba(255, 255, 255, 0.03)',
      borderTop: `1px solid ${t.glass.border}`,
      fontSize: 11,
      fontFamily: t.font.sans,
      flexShrink: 0,
      minHeight: 28,
    }}>
      {/* Activity indicator */}
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: connected
          ? (status.isActive ? t.status.active : t.status.idle)
          : t.status.error,
        boxShadow: status.isActive ? t.shadow.glow(t.status.active) : 'none',
        transition: 'all 0.3s ease',
      }} />

      {/* Agent label */}
      {agentLabel && (
        <span style={{ color: t.agent.claude, fontWeight: 600, flexShrink: 0 }}>
          ✦ {agentLabel}
        </span>
      )}

      {/* Current activity */}
      <span style={{
        color: status.color,
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        transition: 'color 0.3s ease',
      }}>
        {status.text}
      </span>

      {/* Stats */}
      <span style={{ color: t.text.muted, flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
        {eventCount > 0 && <span>{eventCount} actions</span>}
        {duration && <span>· {duration}</span>}
      </span>
    </div>
  );
}
