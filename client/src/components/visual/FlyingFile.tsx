import { motion } from 'framer-motion';
import { FileDocIcon } from './icons';
import { getEventColor } from '../../utils/colors';
import { getExtensionColor } from '../../utils/colors';

interface FlyingFileProps {
  eventType: string;
  fileName: string;
  extension: string;
}

function getAnimation(eventType: string) {
  if (eventType.includes('read') || eventType === 'tool:glob' || eventType === 'tool:grep') {
    // Read: slide up, hover, slide back
    return {
      initial: { y: 20, opacity: 0, scale: 0.6 },
      animate: {
        y: [20, -30, -25, -30, 20],
        opacity: [0, 1, 1, 1, 0],
        scale: [0.6, 1, 1, 1, 0.6],
      },
      transition: { duration: 2.5, times: [0, 0.2, 0.5, 0.8, 1] },
    };
  }

  if (eventType.includes('write') || eventType.includes('create') || eventType === 'fs:mkdir') {
    // Write: fly in from above
    return {
      initial: { y: -60, opacity: 0, scale: 0.4, rotate: -10 },
      animate: {
        y: [-60, 0, -5, 0],
        opacity: [0, 1, 1, 0.8],
        scale: [0.4, 1.1, 1, 1],
        rotate: [-10, 5, -2, 0],
      },
      transition: { duration: 1.5, times: [0, 0.4, 0.7, 1] },
    };
  }

  if (eventType.includes('edit') || eventType.includes('change')) {
    // Edit: shake and pulse
    return {
      initial: { opacity: 0, scale: 0.8 },
      animate: {
        opacity: [0, 1, 1, 1, 0],
        scale: [0.8, 1.1, 0.95, 1.05, 0.9],
        x: [0, -3, 3, -2, 0],
      },
      transition: { duration: 2, times: [0, 0.15, 0.4, 0.7, 1] },
    };
  }

  if (eventType.includes('delete') || eventType.includes('rmdir')) {
    // Delete: fly up and fade
    return {
      initial: { y: 0, opacity: 1, scale: 1 },
      animate: {
        y: [0, -10, -50],
        opacity: [1, 0.8, 0],
        scale: [1, 1.1, 0.3],
        rotate: [0, 5, 15],
      },
      transition: { duration: 1.2, times: [0, 0.3, 1] },
    };
  }

  // Default: simple fade in/out
  return {
    initial: { opacity: 0, scale: 0.8 },
    animate: {
      opacity: [0, 1, 1, 0],
      scale: [0.8, 1, 1, 0.8],
    },
    transition: { duration: 2, times: [0, 0.2, 0.8, 1] },
  };
}

export function FlyingFile({ eventType, fileName, extension }: FlyingFileProps) {
  const color = getEventColor(eventType);
  const fileColor = getExtensionColor(extension) || color;
  const anim = getAnimation(eventType);

  return (
    <motion.div
      initial={anim.initial}
      animate={anim.animate}
      transition={anim.transition}
      style={{
        position: 'absolute',
        bottom: 30,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        filter: `drop-shadow(0 0 6px ${color}80)`,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <FileDocIcon size={28} color={fileColor} />
      <div style={{
        fontSize: 8,
        color: '#c9d1d9',
        fontFamily: 'SF Mono, Monaco, Consolas, monospace',
        maxWidth: 80,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textAlign: 'center',
        background: '#161b22cc',
        padding: '1px 4px',
        borderRadius: 3,
      }}>
        {fileName}
      </div>
    </motion.div>
  );
}
