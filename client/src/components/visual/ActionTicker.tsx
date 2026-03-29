import { motion, AnimatePresence } from 'framer-motion';
import { useSidecarStore } from '../../store/store';
import { getEventColor } from '../../utils/colors';

export function ActionTicker() {
  const { activities } = useSidecarStore();
  const recent = activities.slice(0, 8);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 16px',
      borderTop: '1px solid #30363d',
      background: '#161b22',
      overflow: 'hidden',
      flexShrink: 0,
      height: 40,
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: '#484f58',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        flexShrink: 0,
      }}>
        Live
      </div>
      <div style={{
        display: 'flex',
        gap: 16,
        overflow: 'hidden',
        flex: 1,
      }}>
        <AnimatePresence initial={false}>
          {recent.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              style={{
                fontSize: 11,
                color: '#7d8590',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
              }}
            >
              <div style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: item.color,
                flexShrink: 0,
              }} />
              <span style={{ color: getEventColor(item.type) }}>{item.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
