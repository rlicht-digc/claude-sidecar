import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidecarStore } from '../../store/store';
import { getEventColor } from '../../utils/colors';
import { getToolIcon } from './icons';
import { ActivityItem } from '../../types';

interface ContextBubble {
  id: string;
  summary: string;
  detail?: string;
  category: string;
  color: string;
  toolType: string;
  count: number;
  gridSlot: number;
  createdAt: number;
}

// Group recent activities into plain-language summaries
function groupActivities(activities: ActivityItem[]): { summary: string; detail?: string; category: string; toolType: string; count: number }[] {
  if (activities.length === 0) return [];

  // Group by (category, parent directory) within last 10 seconds
  const recent = activities.filter((a) => Date.now() - a.timestamp < 10000);
  if (recent.length === 0) return [];

  const groups = new Map<string, ActivityItem[]>();

  for (const a of recent) {
    const cat = getCat(a.type);
    const dir = a.path ? getParentDir(a.path) : '_none';
    const key = `${cat}:${dir}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  const results: { summary: string; detail?: string; category: string; toolType: string; count: number }[] = [];

  for (const [, items] of groups) {
    if (items.length === 0) continue;
    const cat = getCat(items[0].type);
    const dir = items[0].path ? getParentDir(items[0].path) : '';
    const dirName = dir.split('/').pop() || '';
    const fileNames = items.map((i) => i.path?.split('/').pop()).filter(Boolean);
    const exts = new Set(fileNames.map((f) => f?.split('.').pop()));
    const extHint = exts.size === 1 ? `.${[...exts][0]}` : '';

    let summary: string;
    let detail: string | undefined;

    if (items.length === 1) {
      summary = plainLanguage(items[0]);
    } else if (cat === 'read' && items.length >= 3) {
      summary = `Exploring ${items.length} files${dirName ? ` in ${dirName}/` : ''}`;
      detail = `Looking through ${extHint || 'various'} files to understand the codebase`;
    } else if (cat === 'read') {
      summary = `Reading ${fileNames.slice(0, 2).join(' and ')}`;
    } else if (cat === 'edit' && items.length >= 2) {
      summary = `Updating ${items.length} files${dirName ? ` in ${dirName}/` : ''}`;
      detail = `Making changes to ${fileNames.slice(0, 3).join(', ')}`;
    } else if (cat === 'edit') {
      summary = `Editing ${fileNames[0] || 'a file'}`;
    } else if (cat === 'write') {
      summary = `Creating ${items.length > 1 ? `${items.length} new files` : fileNames[0] || 'a new file'}`;
    } else if (cat === 'delete') {
      summary = `Cleaning up ${items.length > 1 ? `${items.length} files` : fileNames[0] || 'files'}`;
    } else if (cat === 'search') {
      summary = `Scanning the project for patterns`;
      detail = items[0].detail ? `Looking for "${items[0].detail}"` : undefined;
    } else if (cat === 'command') {
      summary = items.length > 1 ? `Running ${items.length} commands` : 'Running a terminal command';
      detail = items[0].detail?.slice(0, 60);
    } else if (cat === 'agent') {
      summary = 'Working with a helper agent';
      detail = items[0].detail?.slice(0, 60);
    } else {
      summary = `Working on ${items.length} operations`;
    }

    results.push({
      summary,
      detail,
      category: cat,
      toolType: items[0].type,
      count: items.length,
    });
  }

  return results.slice(0, 4); // Max 4 bubbles at once
}

function plainLanguage(item: ActivityItem): string {
  const fileName = item.path?.split('/').pop() || '';
  const cat = getCat(item.type);

  if (cat === 'read') return `Checking out ${fileName || 'a file'}`;
  if (cat === 'edit') return `Making changes to ${fileName}`;
  if (cat === 'write') return `Creating ${fileName}`;
  if (cat === 'delete') return `Removing ${fileName}`;
  if (cat === 'search') return `Searching for ${item.detail || 'patterns'}`;
  if (cat === 'command') return `Running: ${item.detail?.slice(0, 40) || 'a command'}`;
  if (cat === 'agent') return `Delegating: ${item.detail?.slice(0, 40) || 'a task'}`;
  return item.message;
}

function getCat(type: string): string {
  if (type.includes('read') || type === 'tool:glob') return 'read';
  if (type.includes('edit') || type.includes('change')) return 'edit';
  if (type.includes('write') || type.includes('create') || type === 'fs:mkdir') return 'write';
  if (type.includes('delete') || type.includes('rmdir')) return 'delete';
  if (type.includes('grep')) return 'search';
  if (type.includes('bash')) return 'command';
  if (type.includes('agent')) return 'agent';
  return 'other';
}

function getParentDir(path: string): string {
  const parts = path.split('/');
  return parts.length >= 2 ? parts.slice(0, -1).join('/') : '';
}

// Grid positions for bubbles (percentage-based, spread across workspace)
const GRID_POSITIONS = [
  { x: 5, y: 5 },
  { x: 55, y: 5 },
  { x: 5, y: 45 },
  { x: 55, y: 45 },
];

let bubbleIdCounter = 0;

export function ContextBubbles() {
  const [bubbles, setBubbles] = useState<ContextBubble[]>([]);
  const lastEventRef = useRef(0);
  const nextSlotRef = useRef(0);

  useEffect(() => {
    const unsub = useSidecarStore.subscribe((state) => {
      if (state.eventCount <= lastEventRef.current) return;
      lastEventRef.current = state.eventCount;

      const groups = groupActivities(state.activities);
      if (groups.length === 0) return;

      const newBubbles: ContextBubble[] = groups.map((g) => {
        const slot = nextSlotRef.current % GRID_POSITIONS.length;
        nextSlotRef.current++;
        return {
          id: `ctx-${++bubbleIdCounter}`,
          ...g,
          color: getEventColor(g.toolType),
          gridSlot: slot,
          createdAt: Date.now(),
        };
      });

      setBubbles(newBubbles);

      // Auto-expire after 8 seconds
      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => !newBubbles.find((n) => n.id === b.id)));
      }, 8000);
    });

    return unsub;
  }, []);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      <AnimatePresence>
        {bubbles.map((bubble) => {
          const pos = GRID_POSITIONS[bubble.gridSlot] || GRID_POSITIONS[0];
          const ToolIcon = getToolIcon(bubble.toolType);

          return (
            <motion.div
              key={bubble.id}
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                maxWidth: 260,
                background: '#161b22ee',
                border: `1px solid ${bubble.color}40`,
                borderRadius: 10,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)`,
              }}
            >
              {/* Tool insignia */}
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: `${bubble.color}18`,
                border: `1.5px solid ${bubble.color}60`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
              }}>
                <ToolIcon size={13} color={bubble.color} />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  color: '#e6edf3',
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}>
                  {bubble.summary}
                </div>
                {bubble.detail && (
                  <div style={{
                    fontSize: 10,
                    color: '#7d8590',
                    marginTop: 2,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {bubble.detail}
                  </div>
                )}
                {bubble.count > 1 && (
                  <span style={{
                    display: 'inline-block',
                    marginTop: 3,
                    fontSize: 9,
                    color: bubble.color,
                    background: `${bubble.color}15`,
                    padding: '1px 6px',
                    borderRadius: 8,
                    fontWeight: 500,
                  }}>
                    {bubble.count} actions
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
