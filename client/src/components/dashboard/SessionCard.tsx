import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { theme as t, glassPanel } from '../../utils/theme';
import { SessionSummary, ToneMode } from '../../store/store';
import { applyTone } from '../../intelligence/tone';

export interface SessionCardData {
  id: string;
  label: string;
  cwd: string;
  isInternal: boolean;      // true = terminal opened in sidecar, false = external hook session
  actionAgent?: 'claude' | 'codex';
  isWatch?: boolean;
  summary?: SessionSummary; // live data from hook events
}

interface SessionCardProps {
  card: SessionCardData;
  toneMode: ToneMode;
  onHoverEnter: (id: string) => void;
  onHoverLeave: () => void;
  onClick?: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  exploring: 'Looking around',
  planning: 'Making a plan',
  implementing: 'Making changes',
  verifying: 'Checking work',
  debugging: 'Fixing an issue',
  configuring: 'Setting things up',
  delegating: 'Getting help',
  idle: 'Ready',
};

const PHASE_COLORS: Record<string, string> = {
  exploring: '#5ba8ff',
  planning: '#ffd04a',
  implementing: '#4ddb8a',
  verifying: '#4ae0e0',
  debugging: '#ff6b6b',
  configuring: '#ffaa5c',
  delegating: '#ea80ff',
  idle: '#8885a8',
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function getAgentIcon(card: SessionCardData): string {
  if (card.isWatch) return '👁';
  if (card.actionAgent === 'claude') return '✦';
  if (card.actionAgent === 'codex') return '◈';
  if (!card.isInternal) return '✦'; // external hook session = likely Claude
  return '▸';
}

function getAgentColor(card: SessionCardData): string {
  if (card.actionAgent === 'claude' || !card.isInternal) return t.agent.claude;
  if (card.actionAgent === 'codex') return t.agent.codex;
  return t.text.muted;
}

export function SessionCard({ card, toneMode, onHoverEnter, onHoverLeave, onClick }: SessionCardProps) {
  const summary = card.summary;
  const now = Date.now();
  const isActive = summary ? (now - summary.lastTimestamp) < 8000 : false;
  const isRecent = summary ? (now - summary.lastTimestamp) < 30000 : false;
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phase = summary?.phase || 'idle';
  const phaseLabel = PHASE_LABELS[phase] || phase;
  const phaseColor = PHASE_COLORS[phase] || t.text.muted;
  const projectName = card.cwd ? card.cwd.split('/').pop() || card.cwd : 'Unknown project';
  const activityText = summary
    ? applyTone(summary.lastActivity, toneMode)
    : card.isInternal
    ? 'Terminal open — no AI activity yet'
    : 'Waiting for activity…';

  const statusColor = isActive
    ? t.status.active
    : isRecent
    ? t.accent.blue
    : t.status.inactive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onMouseEnter={() => onHoverEnter(card.id)}
      onMouseLeave={onHoverLeave}
      onClick={onClick}
      style={{
        ...glassPanel({ active: isActive }),
        padding: '14px 16px',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      whileHover={{
        borderColor: 'rgba(255,255,255,0.25)',
        boxShadow: `0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`,
      }}
    >
      {/* Active pulse bar at top */}
      {isActive && (
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${t.status.active}, transparent)`,
          }}
        />
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {/* Agent icon */}
        <span style={{ fontSize: 14, color: getAgentColor(card), flexShrink: 0 }}>
          {getAgentIcon(card)}
        </span>

        {/* Session name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: t.text.primary,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {card.label}
          </div>
          <div style={{
            fontSize: 10, color: t.text.muted, marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {projectName}
          </div>
        </div>

        {/* Status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <motion.span
            animate={isActive ? { scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] } : {}}
            transition={isActive ? { repeat: Infinity, duration: 1.2 } : {}}
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: statusColor,
              boxShadow: isActive ? `0 0 6px ${statusColor}` : 'none',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 10, color: statusColor, fontWeight: 600 }}>
            {isActive ? 'Active' : isRecent ? 'Recent' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Activity description */}
      <div style={{
        fontSize: 12, color: t.text.secondary, lineHeight: 1.5,
        marginBottom: 10,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {activityText}
      </div>

      {/* Footer row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Phase badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px',
          background: `${phaseColor}15`,
          border: `1px solid ${phaseColor}30`,
          borderRadius: t.radius.full,
          fontSize: 10, fontWeight: 600, color: phaseColor,
        }}>
          {phaseLabel}
        </span>

        {/* Event count */}
        {summary && summary.eventCount > 0 && (
          <span style={{ fontSize: 10, color: t.text.disabled }}>
            {summary.eventCount} actions
          </span>
        )}

        {/* Timestamp */}
        {summary && (
          <span style={{ fontSize: 10, color: t.text.disabled, marginLeft: 'auto' }}>
            {formatTimeAgo(summary.lastTimestamp)}
          </span>
        )}
      </div>
    </motion.div>
  );
}
