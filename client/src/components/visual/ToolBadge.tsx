import { motion } from 'framer-motion';
import { getToolIcon, getToolLabel } from './icons';
import { getEventColor } from '../../utils/colors';

interface ToolBadgeProps {
  eventType: string;
  fileName?: string;
}

export function ToolBadge({ eventType, fileName }: ToolBadgeProps) {
  const ToolIcon = getToolIcon(eventType);
  const color = getEventColor(eventType);
  const label = getToolLabel(eventType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.5 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        position: 'absolute',
        top: -52,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
      }}
    >
      {/* Flashing tool icon */}
      <motion.div
        animate={{
          opacity: [1, 0.4, 1],
          scale: [1, 1.1, 1],
          boxShadow: [
            `0 0 8px ${color}80`,
            `0 0 20px ${color}cc`,
            `0 0 8px ${color}80`,
          ],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: `${color}20`,
          border: `2px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ToolIcon size={18} color={color} />
      </motion.div>

      {/* Label */}
      <motion.div
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: color,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
          textShadow: `0 0 8px ${color}80`,
        }}
      >
        {label}
      </motion.div>

      {/* File name if available */}
      {fileName && (
        <div style={{
          fontSize: 9,
          color: '#7d8590',
          fontFamily: 'SF Mono, Monaco, Consolas, monospace',
          maxWidth: 100,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}>
          {fileName}
        </div>
      )}
    </motion.div>
  );
}
