import { motion, AnimatePresence } from 'framer-motion';
import { FileTreeNode } from '../types';
import { useSidecarStore } from '../store/store';
import { getFileIcon, getFolderIcon } from '../utils/fileIcons';
import { getExtensionColor, colors } from '../utils/colors';
import { FileTree } from './FileTree';
import { VscChevronRight, VscChevronDown } from 'react-icons/vsc';

interface FileNodeRowProps {
  node: FileTreeNode;
  depth: number;
}

const statusColors: Record<string, string> = {
  reading: colors.read,
  writing: colors.write,
  edited: colors.edit,
  created: colors.create,
  deleted: colors.delete,
  active: colors.command,
};

export function FileNodeRow({ node, depth }: FileNodeRowProps) {
  const { expandedPaths, toggleExpanded, activePaths } = useSidecarStore();
  const isDir = node.type === 'directory';
  const isExpanded = !!expandedPaths[node.path];
  const activeEntry = activePaths[node.path];
  const isActive = !!activeEntry;
  const statusColor = activeEntry ? statusColors[activeEntry.status] || colors.muted : undefined;

  const Icon = isDir ? getFolderIcon(isExpanded) : getFileIcon(node.name, node.extension);
  const iconColor = isDir ? '#e6edf3' : getExtensionColor(node.extension);

  return (
    <div>
      <motion.div
        onClick={() => isDir && toggleExpanded(node.path)}
        initial={false}
        animate={{
          backgroundColor: isActive ? `${statusColor}11` : 'transparent',
        }}
        whileHover={{ backgroundColor: '#1c212940' }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          paddingLeft: 8 + depth * 16,
          cursor: isDir ? 'pointer' : 'default',
          fontSize: 13,
          userSelect: 'none',
          position: 'relative',
          borderRadius: 4,
          marginInline: 4,
        }}
      >
        {/* Chevron for directories */}
        <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7d8590' }}>
          {isDir && (isExpanded ? <VscChevronDown size={14} /> : <VscChevronRight size={14} />)}
        </span>

        {/* File/folder icon */}
        <Icon size={15} color={iconColor} style={{ flexShrink: 0 }} />

        {/* Name */}
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: isDir ? '#e6edf3' : '#c9d1d9',
          fontWeight: isDir ? 500 : 400,
        }}>
          {node.name}
        </span>

        {/* Active status dot */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 8px ${statusColor}`,
                marginLeft: 'auto',
                flexShrink: 0,
              }}
            />
          )}
        </AnimatePresence>

        {/* Active glow bar on left */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              style={{
                position: 'absolute',
                left: 0,
                top: 2,
                bottom: 2,
                width: 3,
                borderRadius: 2,
                background: statusColor,
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Children (expanded directories) */}
      <AnimatePresence initial={false}>
        {isDir && isExpanded && node.children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <FileTree nodes={node.children} depth={depth + 1} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
