import { motion, AnimatePresence } from 'framer-motion';
import { CabinetIcon, CabinetOpenIcon } from './icons';
import { ToolBadge } from './ToolBadge';
import { FlyingFile } from './FlyingFile';
import { FileTreeNode } from '../../types';

interface ActiveAnimation {
  id: string;
  type: string;
  fileName: string;
  extension: string;
  startTime: number;
}

interface FileCabinetProps {
  node: FileTreeNode;
  activeAnimations: ActiveAnimation[];
}

function countFiles(node: FileTreeNode): number {
  if (node.type === 'file') return 1;
  return node.children.reduce((sum, child) => sum + countFiles(child), 0);
}

export function FileCabinet({ node, activeAnimations }: FileCabinetProps) {
  const isActive = activeAnimations.length > 0;
  const latestAnim = activeAnimations[activeAnimations.length - 1];
  const fileCount = countFiles(node);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '60px 16px 16px',
        cursor: 'default',
      }}
    >
      {/* Tool badge - flashes above cabinet */}
      <AnimatePresence>
        {latestAnim && (
          <ToolBadge
            key={latestAnim.id}
            eventType={latestAnim.type}
            fileName={latestAnim.fileName}
          />
        )}
      </AnimatePresence>

      {/* Cabinet glow effect when active */}
      <AnimatePresence>
        {isActive && latestAnim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0.2, 0.4] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              position: 'absolute',
              top: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${
                latestAnim ? getColorForType(latestAnim.type) : '#58a6ff'
              }30 0%, transparent 70%)`,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}
      </AnimatePresence>

      {/* Cabinet icon */}
      <motion.div
        animate={isActive ? { y: [0, -2, 0] } : {}}
        transition={isActive ? { duration: 0.4, repeat: Infinity } : {}}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {isActive ? (
          <CabinetOpenIcon size={56} color={latestAnim ? getColorForType(latestAnim.type) : '#7d8590'} />
        ) : (
          <CabinetIcon size={56} color="#7d8590" />
        )}

        {/* Flying file animations */}
        <AnimatePresence>
          {activeAnimations.map((anim) => (
            <FlyingFile
              key={anim.id}
              eventType={anim.type}
              fileName={anim.fileName}
              extension={anim.extension}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Directory name */}
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: isActive ? '#e6edf3' : '#c9d1d9',
        textAlign: 'center',
        maxWidth: 100,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {node.name}
      </div>

      {/* File count badge */}
      <div style={{
        fontSize: 10,
        color: '#484f58',
        display: 'flex',
        alignItems: 'center',
        gap: 3,
      }}>
        <span>{fileCount} files</span>
      </div>
    </motion.div>
  );
}

function getColorForType(type: string): string {
  if (type.includes('read') || type === 'tool:glob' || type === 'tool:grep') return '#58a6ff';
  if (type.includes('write') || type.includes('create') || type === 'fs:mkdir') return '#3fb950';
  if (type.includes('edit') || type.includes('change')) return '#d29922';
  if (type.includes('delete') || type.includes('rmdir')) return '#f85149';
  return '#bc8cff';
}
