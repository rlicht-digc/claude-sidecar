import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidecarStore } from '../store/store';
import { theme as t, glassPanel } from '../utils/theme';

/** Phase descriptions in consumer-friendly language */
const PHASE_DESCRIPTIONS: Record<string, { title: string; description: string; emoji: string }> = {
  exploring: {
    title: 'Looking Around',
    description: 'The AI is reading through your project files to understand the codebase.',
    emoji: '🔍',
  },
  planning: {
    title: 'Making a Plan',
    description: 'The AI is deciding the best approach to complete the task.',
    emoji: '📋',
  },
  implementing: {
    title: 'Making Changes',
    description: 'The AI is writing and updating code to implement the requested changes.',
    emoji: '✏️',
  },
  verifying: {
    title: 'Checking Work',
    description: 'The AI is running tests and verifying that everything works correctly.',
    emoji: '✅',
  },
  debugging: {
    title: 'Fixing an Issue',
    description: 'The AI found a problem and is working on a fix.',
    emoji: '🔧',
  },
  configuring: {
    title: 'Setting Things Up',
    description: 'The AI is adjusting project settings and configuration.',
    emoji: '⚙️',
  },
  delegating: {
    title: 'Getting Help',
    description: 'The AI has launched a helper to work on part of the task.',
    emoji: '🤝',
  },
  idle: {
    title: 'Ready',
    description: 'Waiting for the next task.',
    emoji: '💤',
  },
};

/** Convert technical event types to consumer-friendly descriptions */
function friendlyActivity(type: string, message: string, path?: string): string {
  const fileName = path?.split('/').pop() || '';

  if (type.includes('read') || type === 'tool:glob') {
    return `Looking at ${fileName || 'project files'}`;
  }
  if (type.includes('write') || type.includes('create')) {
    return `Creating ${fileName || 'a new file'}`;
  }
  if (type.includes('edit') || type.includes('change')) {
    return `Updating ${fileName || 'a file'}`;
  }
  if (type.includes('delete')) {
    return `Removing ${fileName || 'a file'}`;
  }
  if (type.includes('grep')) {
    return 'Searching through the project';
  }
  if (type.includes('bash')) {
    return 'Running a task';
  }
  if (type.includes('agent')) {
    return 'Working with a helper';
  }
  return message;
}

/**
 * NarrativeView — Consumer-mode replacement for the terminal.
 * Shows a plain-English story of what the AI is doing.
 */
export function NarrativeView() {
  const activities = useSidecarStore((s) => s.activities);
  const currentPhase = useSidecarStore((s) => s.currentPhase);
  const currentNarrative = useSidecarStore((s) => s.currentNarrative);
  const eventCount = useSidecarStore((s) => s.eventCount);
  const workingDirectory = useSidecarStore((s) => s.workingDirectory);

  const phase = PHASE_DESCRIPTIONS[currentPhase] || PHASE_DESCRIPTIONS.idle;

  // Group recent activities into a timeline
  const timeline = useMemo(() => {
    return activities.slice(0, 30).map((a) => ({
      id: a.id,
      text: friendlyActivity(a.type, a.message, a.path),
      timestamp: a.timestamp,
      color: a.color,
    }));
  }, [activities]);

  const projectName = workingDirectory?.split('/').pop() || 'your project';

  // Calculate progress feeling
  const isActive = activities.length > 0 && (Date.now() - activities[0].timestamp) < 10000;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      padding: 16,
    }}>
      {/* Hero: Current phase */}
      <div style={{
        ...glassPanel({ active: isActive }),
        padding: '24px 20px',
        textAlign: 'center',
        marginBottom: 16,
        flexShrink: 0,
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>{phase.emoji}</div>
            <div style={{
              fontSize: 20, fontWeight: 800, color: t.text.primary,
              marginBottom: 6,
            }}>
              {phase.title}
            </div>
            <div style={{
              fontSize: 13, color: t.text.secondary, lineHeight: 1.6,
              maxWidth: 320, margin: '0 auto',
            }}>
              {currentNarrative || phase.description}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 24,
        marginBottom: 16, flexShrink: 0,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.accent.purple }}>
            {eventCount}
          </div>
          <div style={{ fontSize: 10, color: t.text.muted }}>Actions</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.accent.blue }}>
            {projectName}
          </div>
          <div style={{ fontSize: 10, color: t.text.muted }}>Project</div>
        </div>
        <div style={{
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 18, fontWeight: 700,
            color: isActive ? t.status.active : t.text.muted,
          }}>
            {isActive ? 'Active' : 'Idle'}
          </div>
          <div style={{ fontSize: 10, color: t.text.muted }}>Status</div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{
        fontSize: 12, fontWeight: 600, color: t.text.muted,
        marginBottom: 8, flexShrink: 0,
      }}>
        Recent Activity
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {timeline.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: t.text.muted, fontSize: 13,
          }}>
            Activity will appear here once the AI starts working.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {timeline.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i === 0 ? 0.05 : 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px',
                  background: i === 0 ? `${item.color}08` : 'transparent',
                  borderRadius: t.radius.sm,
                  borderLeft: `3px solid ${i === 0 ? item.color : 'transparent'}`,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: item.color,
                  opacity: i === 0 ? 1 : 0.4,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 12,
                  color: i === 0 ? t.text.primary : t.text.secondary,
                  flex: 1,
                }}>
                  {item.text}
                </span>
                <span style={{
                  fontSize: 9, color: t.text.disabled,
                  flexShrink: 0,
                }}>
                  {formatTimeAgo(item.timestamp)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'now';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}
