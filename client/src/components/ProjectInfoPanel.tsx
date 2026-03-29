import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VscChevronRight, VscChevronDown } from 'react-icons/vsc';
import { useSidecarStore } from '../store/store';
import { getEventColor } from '../utils/colors';
import { getToolIcon, getToolLabel } from './visual/icons';
import { getFileIcon } from '../utils/fileIcons';
import { ActivityItem, FileTreeNode } from '../types';

// Plain-language summary of what Claude is currently doing
function summarizeActivity(activities: ActivityItem[]): string {
  if (activities.length === 0) return 'Waiting for activity...';

  const recent = activities.slice(0, 10);
  const last5sec = recent.filter((a) => Date.now() - a.timestamp < 5000);
  const batch = last5sec.length > 0 ? last5sec : recent.slice(0, 3);

  const cats: Record<string, number> = {};
  const dirs = new Set<string>();
  const files: string[] = [];

  for (const a of batch) {
    const cat = getCat(a.type);
    cats[cat] = (cats[cat] || 0) + 1;
    if (a.path) {
      const parts = a.path.split('/');
      files.push(parts[parts.length - 1]);
      if (parts.length >= 2) dirs.add(parts[parts.length - 2]);
    }
  }

  const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
  const dirHint = dirs.size > 0 ? ` in ${[...dirs][0]}/` : '';
  const fileList = files.slice(0, 2).join(', ');

  if (!topCat) return 'Working...';

  const [cat, count] = topCat;
  if (cat === 'read' && count > 2) return `Exploring files${dirHint}`;
  if (cat === 'read') return `Reading ${fileList || 'files'}`;
  if (cat === 'edit' && count > 1) return `Editing multiple files${dirHint}`;
  if (cat === 'edit') return `Editing ${fileList}`;
  if (cat === 'write') return `Creating ${fileList || 'new files'}`;
  if (cat === 'delete') return `Cleaning up ${fileList || 'files'}`;
  if (cat === 'search') return `Searching the codebase`;
  if (cat === 'command') return `Running terminal commands`;
  if (cat === 'agent') return `Delegating to a helper agent`;

  return 'Working on the project...';
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

interface ToolStat {
  type: string;
  label: string;
  count: number;
  lastUsed: number;
  color: string;
}

function getToolStats(activities: ActivityItem[]): ToolStat[] {
  const toolTypes = ['tool:read', 'tool:edit', 'tool:write', 'tool:bash', 'tool:grep', 'tool:glob', 'tool:agent'];
  const stats: ToolStat[] = [];

  for (const tt of toolTypes) {
    const matching = activities.filter((a) => a.type === tt);
    if (matching.length === 0) continue;
    stats.push({
      type: tt,
      label: getToolLabel(tt),
      count: matching.length,
      lastUsed: matching[0]?.timestamp || 0,
      color: getEventColor(tt),
    });
  }

  return stats.sort((a, b) => b.lastUsed - a.lastUsed);
}

// Mini file tree browser
function countFiles(node: FileTreeNode): { dirs: number; files: number } {
  let dirs = 0;
  let files = 0;
  for (const child of node.children || []) {
    if (child.type === 'directory') {
      dirs++;
      const sub = countFiles(child);
      dirs += sub.dirs;
      files += sub.files;
    } else {
      files++;
    }
  }
  return { dirs, files };
}

function FileTreeItem({ node, depth = 0 }: { node: FileTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const activePaths = useSidecarStore((s) => s.activePaths);
  const setHoverInfo = useSidecarStore((s) => s.setHoverInfo);
  const activeEntry = activePaths[node.path];

  const statusColors: Record<string, string> = {
    reading: '#58a6ff',
    edited: '#d29922',
    created: '#3fb950',
    deleted: '#f85149',
  };
  const statusColor = activeEntry ? statusColors[activeEntry.status] || '#7d8590' : undefined;

  if (node.type === 'file') {
    const FileIcon = getFileIcon(node.name, node.extension);
    return (
      <div
        onMouseEnter={() => setHoverInfo({
          text: `${node.name} — a ${node.extension || 'file'} in this project`,
          type: 'file',
        })}
        onMouseLeave={() => setHoverInfo(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '1px 4px 1px ' + (12 + depth * 10) + 'px',
          fontSize: 10,
          color: statusColor || '#7d8590',
          background: statusColor ? `${statusColor}10` : 'transparent',
          borderLeft: statusColor ? `2px solid ${statusColor}` : '2px solid transparent',
          transition: 'all 0.2s ease',
          overflow: 'hidden',
          whiteSpace: 'nowrap' as const,
          textOverflow: 'ellipsis',
          cursor: 'default',
        }}
      >
        <FileIcon size={11} />
        <span>{node.name}</span>
      </div>
    );
  }

  const counts = countFiles(node);

  return (
    <div>
      <div
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setHoverInfo({
          text: `${node.name}/ — contains ${counts.files} file${counts.files !== 1 ? 's' : ''}${counts.dirs > 0 ? ` across ${counts.dirs} subfolder${counts.dirs !== 1 ? 's' : ''}` : ''}`,
          type: 'directory',
        })}
        onMouseLeave={() => setHoverInfo(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          padding: '2px 4px 2px ' + (8 + depth * 10) + 'px',
          fontSize: 10,
          color: '#c9d1d9',
          cursor: 'pointer',
          userSelect: 'none' as const,
        }}
      >
        {expanded ? <VscChevronDown style={{ fontSize: 10, flexShrink: 0 }} /> : <VscChevronRight style={{ fontSize: 10, flexShrink: 0 }} />}
        <span style={{ fontWeight: 500 }}>{node.name}/</span>
      </div>
      {expanded && node.children?.slice(0, 30).map((child) => (
        <FileTreeItem key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function ProjectInfoPanel() {
  const activities = useSidecarStore((s) => s.activities);
  const workingDirectory = useSidecarStore((s) => s.workingDirectory);
  const connected = useSidecarStore((s) => s.connected);
  const eventCount = useSidecarStore((s) => s.eventCount);
  const fileTree = useSidecarStore((s) => s.fileTree);

  const summary = useMemo(() => summarizeActivity(activities), [activities]);
  const toolStats = useMemo(() => getToolStats(activities), [activities]);

  const dirName = workingDirectory ? workingDirectory.split('/').pop() : '—';

  return (
    <div style={{
      width: 220,
      minWidth: 220,
      borderRight: '1px solid #21262d',
      background: '#0d1117',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Project Info */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid #21262d',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 10,
          color: '#484f58',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
          marginBottom: 8,
        }}>
          Project
        </div>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#e6edf3',
          marginBottom: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {dirName}
        </div>
        <div style={{
          fontSize: 10,
          color: '#484f58',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: "'SF Mono', Monaco, Consolas, monospace",
        }}>
          {workingDirectory || 'No project selected'}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 8,
          fontSize: 11,
        }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: connected ? '#39d353' : '#f85149',
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: connected ? '#39d353' : '#f85149',
              boxShadow: connected ? '0 0 4px #39d353' : undefined,
            }} />
            {connected ? 'Live' : 'Off'}
          </span>
          <span style={{ color: '#484f58' }}>|</span>
          <span style={{ color: '#7d8590' }}>{eventCount} events</span>
        </div>
      </div>

      {/* Current Activity */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid #21262d',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 10,
          color: '#484f58',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
          marginBottom: 8,
        }}>
          What's Happening
        </div>

        <div style={{
          fontSize: 13,
          color: '#c9d1d9',
          lineHeight: 1.5,
          marginBottom: 10,
        }}>
          {summary}
        </div>

        {/* Recent activity feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <AnimatePresence initial={false}>
            {activities.slice(0, 5).map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                  fontSize: 10,
                  color: '#7d8590',
                }}
              >
                <span style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: item.color,
                  flexShrink: 0,
                  marginTop: 4,
                }} />
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.message}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* File Tree Browser */}
      {fileTree.length > 0 && (
        <div style={{
          flex: 1,
          overflow: 'auto',
          borderBottom: '1px solid #21262d',
        }}>
          <div style={{
            padding: '8px 12px 4px',
            fontSize: 10,
            color: '#484f58',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 600,
          }}>
            Files
          </div>
          <div style={{ paddingBottom: 8 }}>
            {fileTree.slice(0, 20).map((node) => (
              <FileTreeItem key={node.path} node={node} />
            ))}
          </div>
        </div>
      )}

      {/* Tool Insignias */}
      <div style={{
        padding: '10px 12px',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 10,
          color: '#484f58',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
          marginBottom: 8,
        }}>
          Tools
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}>
          {toolStats.map((stat) => {
            const isActive = Date.now() - stat.lastUsed < 5000;
            const ToolIcon = getToolIcon(stat.type);
            return (
              <div
                key={stat.type}
                title={`${stat.label}: ${stat.count} uses`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isActive ? `${stat.color}15` : '#161b22',
                  border: `1.5px ${isActive ? 'solid' : 'dashed'} ${isActive ? stat.color : '#30363d'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isActive ? 1 : 0.5,
                  boxShadow: isActive ? `0 0 8px ${stat.color}40` : 'none',
                  transition: 'all 0.3s ease',
                  animation: isActive ? 'toolPulse 2s infinite' : 'none',
                }}>
                  <ToolIcon size={14} color={isActive ? stat.color : '#484f58'} />
                </div>
                <span style={{
                  fontSize: 9,
                  color: isActive ? stat.color : '#484f58',
                  fontWeight: 500,
                }}>
                  {stat.count}
                </span>
              </div>
            );
          })}
          {toolStats.length === 0 && (
            <span style={{ fontSize: 10, color: '#484f58' }}>No tools used yet</span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes toolPulse {
          0%, 100% { box-shadow: 0 0 4px currentColor; }
          50% { box-shadow: 0 0 12px currentColor; }
        }
      `}</style>
    </div>
  );
}
