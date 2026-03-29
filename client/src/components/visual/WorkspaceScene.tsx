import { useState, useEffect, useRef } from 'react';
import { useSidecarStore } from '../../store/store';
import { FileCabinet } from './FileCabinet';

interface ActiveAnimation {
  id: string;
  type: string;
  fileName: string;
  extension: string;
  cabinetPath: string;
  startTime: number;
}

let animId = 0;

export function WorkspaceScene() {
  const fileTree = useSidecarStore((s) => s.fileTree);
  const workingDirectory = useSidecarStore((s) => s.workingDirectory);
  const eventCount = useSidecarStore((s) => s.eventCount);
  const [animations, setAnimations] = useState<ActiveAnimation[]>([]);
  const lastCountRef = useRef(0);

  // Get top-level directories as cabinets
  const cabinets = fileTree.filter((node) => node.type === 'directory');

  // Subscribe directly to store changes for reliable event detection
  useEffect(() => {
    const unsub = useSidecarStore.subscribe((state, prevState) => {
      if (state.eventCount <= lastCountRef.current) return;
      lastCountRef.current = state.eventCount;

      const latest = state.activities[0];
      if (!latest) return;

      const wd = state.workingDirectory;
      const dirs = state.fileTree.filter((n) => n.type === 'directory');

      // Find which cabinet this file belongs to
      const filePath = latest.path;
      let targetCabinet: string | null = null;

      if (filePath && wd) {
        const rel = filePath.startsWith(wd + '/')
          ? filePath.slice(wd.length + 1)
          : filePath;
        const topDir = rel.split('/')[0];
        const match = dirs.find((c) => c.name === topDir);
        targetCabinet = match?.path || null;
      }

      // Fallback to first cabinet for bash/agent/search commands
      if (!targetCabinet && dirs.length > 0) {
        targetCabinet = dirs[0].path;
      }
      if (!targetCabinet) return;

      const fileName = filePath ? filePath.split('/').pop() || '' : latest.message;
      const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';

      const id = `anim-${++animId}`;
      const newAnim: ActiveAnimation = {
        id,
        type: latest.type,
        fileName,
        extension: ext,
        cabinetPath: targetCabinet,
        startTime: Date.now(),
      };

      setAnimations((prev) => [...prev, newAnim]);

      setTimeout(() => {
        setAnimations((prev) => prev.filter((a) => a.id !== id));
      }, 3000);
    });

    return unsub;
  }, []);

  if (cabinets.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#484f58',
        fontSize: 13,
      }}>
        Scan a directory to see your file cabinets
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexWrap: 'wrap',
      alignContent: 'center',
      justifyContent: 'center',
      gap: 20,
      padding: '24px 20px',
      overflow: 'auto',
    }}>
      {cabinets.map((cabinet) => (
        <FileCabinet
          key={cabinet.path}
          node={cabinet}
          activeAnimations={animations.filter((a) => a.cabinetPath === cabinet.path)}
        />
      ))}

      {/* Root-level files get their own cabinet */}
      {fileTree.some((n) => n.type === 'file') && (
        <FileCabinet
          node={{
            name: 'root files',
            path: workingDirectory,
            type: 'directory',
            children: fileTree.filter((n) => n.type === 'file'),
            extension: '',
          }}
          activeAnimations={animations.filter((a) => a.cabinetPath === workingDirectory)}
        />
      )}
    </div>
  );
}
