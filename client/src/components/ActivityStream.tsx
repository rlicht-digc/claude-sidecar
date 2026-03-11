import { motion, AnimatePresence } from 'framer-motion';
import { useSidecarStore } from '../store/store';
import { useRef, useEffect } from 'react';
import {
  VscEye,
  VscEdit,
  VscNewFile,
  VscTrash,
  VscTerminal,
  VscSearch,
  VscSymbolEvent,
  VscFolder,
  VscRobot,
} from 'react-icons/vsc';
import { ActivityItem } from '../types';

function getIcon(type: string) {
  if (type.includes('read') || type === 'tool:glob') return VscEye;
  if (type.includes('edit') || type.includes('change')) return VscEdit;
  if (type.includes('write') || type.includes('create') || type === 'fs:mkdir') return VscNewFile;
  if (type.includes('delete') || type.includes('rmdir')) return VscTrash;
  if (type.includes('bash')) return VscTerminal;
  if (type.includes('grep')) return VscSearch;
  if (type.includes('agent')) return VscRobot;
  return VscSymbolEvent;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = getIcon(item.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 16px',
        borderBottom: '1px solid #21262d',
      }}>
        {/* Icon */}
        <div style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: `${item.color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}>
          <Icon size={15} color={item.color} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#e6edf3' }}>
            {item.message}
          </div>
          {item.detail && (
            <div style={{
              fontSize: 12,
              color: '#7d8590',
              marginTop: 2,
              fontFamily: 'SF Mono, Monaco, Consolas, monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {item.detail}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div style={{
          fontSize: 11,
          color: '#484f58',
          fontFamily: 'SF Mono, Monaco, Consolas, monospace',
          flexShrink: 0,
          marginTop: 2,
        }}>
          {formatTime(item.timestamp)}
        </div>
      </div>
    </motion.div>
  );
}

export function ActivityStream() {
  const { activities } = useSidecarStore();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid #30363d',
        fontSize: 12,
        fontWeight: 600,
        color: '#7d8590',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: '#161b22',
      }}>
        Activity Stream
      </div>

      {/* Activity list */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#0d1117',
        }}
      >
        {activities.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#484f58',
            gap: 8,
          }}>
            <VscSymbolEvent size={32} />
            <span style={{ fontSize: 13 }}>Waiting for activity...</span>
            <span style={{ fontSize: 11 }}>Events from Claude Code will appear here</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {activities.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
