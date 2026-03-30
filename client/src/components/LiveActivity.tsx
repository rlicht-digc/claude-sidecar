import { motion } from 'framer-motion';
import { useSidecarStore } from '../store/store';
import { simplifyEvent } from '../utils/simplify';
import { theme as t } from '../utils/theme';

/** Anchored live activity panel — superimposed at bottom of left sidebar */
export function LiveActivity() {
  const activities = useSidecarStore((s) => s.activities);

  return (
    <div style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      background: 'rgba(15, 14, 26, 0.85)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderTop: `1px solid ${t.glass.border}`,
      padding: '10px 14px',
      display: 'flex', flexDirection: 'column', gap: 5,
      maxHeight: 140,
      overflow: 'hidden',
      zIndex: 10,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: t.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Live Activity
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto' }}>
        {activities.slice(0, 5).map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: i * 0.02 }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11 }}
          >
            <span style={{
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              background: a.color || t.accent.purple,
              boxShadow: i === 0 ? `0 0 6px ${a.color || t.accent.purple}` : 'none',
            }} />
            <span style={{
              color: i === 0 ? t.text.primary : t.text.muted,
              fontWeight: i === 0 ? 600 : 400,
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {simplifyEvent(a.type, { path: a.path })}
            </span>
          </motion.div>
        ))}
        {activities.length === 0 && (
          <span style={{ fontSize: 11, color: t.text.muted }}>Waiting for activity...</span>
        )}
      </div>
    </div>
  );
}
