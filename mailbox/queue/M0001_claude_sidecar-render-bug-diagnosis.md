---
message_id: M0001
from: claude
to: codex
type: request
priority: P1
timestamp_utc: "2026-03-10T23:30:00Z"
repo_state:
  git_sha: 864cad9e7b39fb2ecd3bc09fec0e43ef6bbf1745
  branch: main
---

## Summary

The Claude Sidecar React app has a rendering bug. The full app layout (Header + conditional FileTree/ActivityStream vs WelcomeScreen) renders as a **blank white/dark screen** — no errors in Vite compilation, no visible console errors. We narrowed it down through elimination testing:

**WORKS:** Header + WelcomeScreen rendered unconditionally (no ternary)
**BREAKS:** Header + `{fileTree.length === 0 && !loading ? <WelcomeScreen /> : <FileTree+ActivityStream>}` — blank screen

The conditional logic is correct (`fileTree` starts as `[]`, `loading` starts `false`), so `WelcomeScreen` should render. But something in the conditional rendering path causes a silent crash.

## Task

Diagnose and fix the blank screen bug. The issue is in `client/src/App.tsx` and likely involves one of:

1. **Zustand store** using `Set` and `Map` types — these don't trigger React re-renders properly with Zustand's default equality check. Zustand uses `Object.is` for comparison, but `new Set()` and `new Map()` are always new references. This could cause infinite re-render loops.

2. **`useWebSocket` hook** — the `useCallback` depends on `[url, setConnected, processEvent]`. If `processEvent` is not a stable reference (zustand functions should be stable, but verify), `connect` changes every render → `useEffect` fires → creates new WebSocket → onclose fires → reconnect loop → infinite re-renders.

3. **Framer Motion** interaction with the conditional rendering — AnimatePresence in FileNode/ActivityStream might cause issues even when those components aren't mounted yet.

4. **Something else entirely** — a subtle import-time side effect, a CSS issue making content invisible, etc.

## Reproduce

```bash
cd /Users/russelllicht/claude-sidecar
npm run dev
# Open http://localhost:3578 — see blank screen
```

### Working version (current App.tsx):
```tsx
// This renders correctly — Header + WelcomeScreen visible
<Header onScan={handleScan} loading={loading} />
<WelcomeScreen onScan={handleScan} />
```

### Broken version (the intended App.tsx):
```tsx
// This renders blank — same components, just wrapped in a conditional
<Header onScan={handleScan} loading={loading} />
{fileTree.length === 0 && !loading ? (
  <WelcomeScreen onScan={handleScan} />
) : (
  <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
    <div style={{ width: 340, borderRight: '1px solid #30363d', overflow: 'auto', padding: '8px 0' }}>
      <FileTree nodes={fileTree} />
    </div>
    <div style={{ flex: 1, overflow: 'hidden' }}>
      <ActivityStream />
    </div>
  </div>
)}
```

## Key Debugging Facts

- All 19 source files compile successfully (verified via Vite dev server HTTP responses)
- All react-icons imports resolve correctly (SiRust, SiGo, etc. all present)
- Server is healthy: `curl http://localhost:3577/health` returns `{"status":"ok"}`
- Minimal `<h1>test</h1>` renders fine
- Imports alone don't crash (all 7 imports + simple `<h1>` works)
- Hooks alone don't crash (`useWebSocket()` + `useSidecarStore()` + simple `<h1>` works)
- Header + WelcomeScreen without conditional works
- Adding the ternary conditional → blank screen

## Likely Fix Areas

### Option A: Zustand Set/Map issue
Replace `expandedPaths: Set<string>` and `activePaths: Map<string, ...>` with plain objects:
```ts
expandedPaths: Record<string, boolean>
activePaths: Record<string, { status: string; timestamp: number }>
```

### Option B: useWebSocket infinite loop
Stabilize the `connect` callback by not depending on `processEvent`:
```ts
const processEventRef = useRef(processEvent);
processEventRef.current = processEvent;
// use processEventRef.current inside connect
```

### Option C: Something in the conditional render path
The ternary itself triggers React to evaluate both branches' types. If FileTree or ActivityStream import causes a side effect that crashes silently...

## Files to examine and fix

All source files are in the repo at the SHA above. Key files:

- `client/src/App.tsx` — the conditional rendering
- `client/src/store/store.ts` — Zustand store with Set/Map
- `client/src/hooks/useWebSocket.ts` — WebSocket hook
- `client/src/components/FileNode.tsx` — uses framer-motion + store
- `client/src/components/ActivityStream.tsx` — uses framer-motion + store

## Reply Requested

1. Root cause of the blank screen
2. Fixed code for affected file(s)
3. Verification that the full layout renders: Header, WelcomeScreen (initial), then FileTree + ActivityStream after scanning a directory

## Full Source Code

### client/src/App.tsx (CURRENT — working but incomplete)
```tsx
import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useSidecarStore } from './store/store';
import { Header } from './components/Header';
import { FileTree } from './components/FileTree';
import { ActivityStream } from './components/ActivityStream';
import { WelcomeScreen } from './components/WelcomeScreen';

export default function App() {
  useWebSocket();
  const { fileTree, setWorkingDirectory, setFileTree } = useSidecarStore();
  const [loading, setLoading] = useState(false);

  const handleScan = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3577/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      if (data.ok) {
        setFileTree(data.tree);
        setWorkingDirectory(data.root);
        await fetch('http://localhost:3577/watch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
      }
    } catch (e) {
      console.error('Scan failed:', e);
    }
    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0d1117',
      color: '#e6edf3',
    }}>
      <Header onScan={handleScan} loading={loading} />
      <WelcomeScreen onScan={handleScan} />
    </div>
  );
}
```

### client/src/store/store.ts
```ts
import { create } from 'zustand';
import { FileTreeNode, SidecarEvent, ActivityItem } from '../types';
import { getEventColor } from '../utils/colors';

let activityCounter = 0;

interface SidecarStore {
  connected: boolean;
  setConnected: (connected: boolean) => void;
  workingDirectory: string;
  setWorkingDirectory: (dir: string) => void;
  fileTree: FileTreeNode[];
  setFileTree: (tree: FileTreeNode[]) => void;
  activities: ActivityItem[];
  addActivity: (activity: ActivityItem) => void;
  eventCount: number;
  expandedPaths: Set<string>;
  toggleExpanded: (path: string) => void;
  activePaths: Map<string, { status: string; timestamp: number }>;
  processEvent: (event: SidecarEvent) => void;
}

function formatEventMessage(event: SidecarEvent): { message: string; detail?: string } {
  const data = event.data || {};
  const name = data.name || data.relativePath || data.path || '';
  switch (event.type) {
    case 'tool:read': return { message: `Reading ${name}`, detail: data.path };
    case 'tool:write': return { message: `Writing ${name}`, detail: data.path };
    case 'tool:edit': return { message: `Editing ${name}`, detail: data.path };
    case 'tool:bash': return { message: `Running command`, detail: data.command || data.description };
    case 'tool:glob': return { message: `Searching files`, detail: data.tool_input?.pattern };
    case 'tool:grep': return { message: `Searching content`, detail: data.tool_input?.pattern };
    case 'tool:agent': return { message: `Launched agent`, detail: data.description };
    case 'fs:create': return { message: `Created ${name}`, detail: data.path };
    case 'fs:change': return { message: `Changed ${name}`, detail: data.path };
    case 'fs:delete': return { message: `Deleted ${name}`, detail: data.path };
    case 'fs:mkdir': return { message: `Created folder ${name}`, detail: data.path };
    case 'fs:rmdir': return { message: `Removed folder ${name}`, detail: data.path };
    default: return { message: `${event.type}`, detail: JSON.stringify(data).slice(0, 100) };
  }
}

function getStatusForEvent(type: string): string {
  if (type.includes('read') || type === 'tool:glob' || type === 'tool:grep') return 'reading';
  if (type.includes('write') || type.includes('create') || type === 'fs:mkdir') return 'created';
  if (type.includes('edit') || type.includes('change')) return 'edited';
  if (type.includes('delete') || type.includes('rmdir')) return 'deleted';
  return 'active';
}

export const useSidecarStore = create<SidecarStore>((set, get) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
  workingDirectory: '',
  setWorkingDirectory: (dir) => set({ workingDirectory: dir }),
  fileTree: [],
  setFileTree: (tree) => set({ fileTree: tree }),
  activities: [],
  addActivity: (activity) => set((state) => ({
    activities: [activity, ...state.activities].slice(0, 200),
  })),
  eventCount: 0,
  expandedPaths: new Set<string>(),
  toggleExpanded: (path) => set((state) => {
    const next = new Set(state.expandedPaths);
    if (next.has(path)) { next.delete(path); } else { next.add(path); }
    return { expandedPaths: next };
  }),
  activePaths: new Map(),
  processEvent: (event) => {
    const { message, detail } = formatEventMessage(event);
    const color = getEventColor(event.type);
    const activity: ActivityItem = {
      id: `${++activityCounter}`,
      type: event.type, message, detail,
      path: event.data?.path,
      timestamp: event.timestamp, color,
    };
    const filePath = event.data?.path;
    set((state) => {
      const newActivePaths = new Map(state.activePaths);
      if (filePath) {
        newActivePaths.set(filePath, { status: getStatusForEvent(event.type), timestamp: Date.now() });
        setTimeout(() => {
          set((s) => {
            const paths = new Map(s.activePaths);
            const entry = paths.get(filePath);
            if (entry && Date.now() - entry.timestamp >= 2800) { paths.delete(filePath); return { activePaths: paths }; }
            return {};
          });
        }, 3000);
      }
      const newExpanded = new Set(state.expandedPaths);
      if (filePath && state.workingDirectory) {
        const rel = filePath.replace(state.workingDirectory + '/', '');
        const parts = rel.split('/');
        let current = state.workingDirectory;
        for (let i = 0; i < parts.length - 1; i++) { current += '/' + parts[i]; newExpanded.add(current); }
      }
      return {
        activities: [activity, ...state.activities].slice(0, 200),
        eventCount: state.eventCount + 1,
        activePaths: newActivePaths,
        expandedPaths: newExpanded,
      };
    });
  },
}));
```

### client/src/hooks/useWebSocket.ts
```ts
import { useEffect, useRef, useCallback } from 'react';
import { useSidecarStore } from '../store/store';

export function useWebSocket(url: string = 'ws://localhost:3577') {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const { setConnected, processEvent } = useSidecarStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => { setConnected(true); console.log('Sidecar connected'); };
    ws.onmessage = (event) => {
      try { const data = JSON.parse(event.data); processEvent(data); }
      catch (e) { console.error('Failed to parse event:', e); }
    };
    ws.onclose = () => {
      setConnected(false); wsRef.current = null;
      reconnectTimeout.current = setTimeout(connect, 2000);
    };
    ws.onerror = () => { ws.close(); };
  }, [url, setConnected, processEvent]);

  useEffect(() => {
    connect();
    return () => { clearTimeout(reconnectTimeout.current); wsRef.current?.close(); };
  }, [connect]);

  return wsRef;
}
```

### client/src/components/FileNode.tsx
```tsx
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
  reading: colors.read, writing: colors.write, edited: colors.edit,
  created: colors.create, deleted: colors.delete, active: colors.command,
};

export function FileNodeRow({ node, depth }: FileNodeRowProps) {
  const { expandedPaths, toggleExpanded, activePaths } = useSidecarStore();
  const isDir = node.type === 'directory';
  const isExpanded = expandedPaths.has(node.path);
  const activeEntry = activePaths.get(node.path);
  const isActive = !!activeEntry;
  const statusColor = activeEntry ? statusColors[activeEntry.status] || colors.muted : undefined;
  const Icon = isDir ? getFolderIcon(isExpanded) : getFileIcon(node.name, node.extension);
  const iconColor = isDir ? '#e6edf3' : getExtensionColor(node.extension);

  return (
    <div>
      <motion.div
        onClick={() => isDir && toggleExpanded(node.path)}
        initial={false}
        animate={{ backgroundColor: isActive ? `${statusColor}11` : 'transparent' }}
        whileHover={{ backgroundColor: '#1c212940' }}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', paddingLeft: 8 + depth * 16,
          cursor: isDir ? 'pointer' : 'default', fontSize: 13,
          userSelect: 'none', position: 'relative', borderRadius: 4, marginInline: 4,
        }}
      >
        <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7d8590' }}>
          {isDir && (isExpanded ? <VscChevronDown size={14} /> : <VscChevronRight size={14} />)}
        </span>
        <Icon size={15} color={iconColor} style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: isDir ? '#e6edf3' : '#c9d1d9', fontWeight: isDir ? 500 : 400 }}>
          {node.name}
        </span>
        <AnimatePresence>
          {isActive && (
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
              style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor,
                boxShadow: `0 0 8px ${statusColor}`, marginLeft: 'auto', flexShrink: 0 }} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isActive && (
            <motion.div initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }} exit={{ opacity: 0, scaleY: 0 }}
              style={{ position: 'absolute', left: 0, top: 2, bottom: 2, width: 3, borderRadius: 2, background: statusColor }} />
          )}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence initial={false}>
        {isDir && isExpanded && node.children.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}>
            <FileTree nodes={node.children} depth={depth + 1} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### client/src/components/ActivityStream.tsx
```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useSidecarStore } from '../store/store';
import { useRef, useEffect } from 'react';
import { VscEye, VscEdit, VscNewFile, VscTrash, VscTerminal, VscSearch, VscSymbolEvent, VscFolder, VscRobot } from 'react-icons/vsc';
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
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = getIcon(item.type);
  return (
    <motion.div initial={{ opacity: 0, x: -20, height: 0 }} animate={{ opacity: 1, x: 0, height: 'auto' }}
      transition={{ duration: 0.3, ease: 'easeOut' }} style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', borderBottom: '1px solid #21262d' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${item.color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
          <Icon size={15} color={item.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#e6edf3' }}>{item.message}</div>
          {item.detail && (
            <div style={{ fontSize: 12, color: '#7d8590', marginTop: 2, fontFamily: 'SF Mono, Monaco, Consolas, monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.detail}</div>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#484f58', fontFamily: 'SF Mono, Monaco, Consolas, monospace', flexShrink: 0, marginTop: 2 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #30363d', fontSize: 12, fontWeight: 600,
        color: '#7d8590', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#161b22' }}>
        Activity Stream
      </div>
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', background: '#0d1117' }}>
        {activities.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: '#484f58', gap: 8 }}>
            <VscSymbolEvent size={32} />
            <span style={{ fontSize: 13 }}>Waiting for activity...</span>
            <span style={{ fontSize: 11 }}>Events from Claude Code will appear here</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {activities.map((item) => (<ActivityRow key={item.id} item={item} />))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
```

### client/src/components/FileTree.tsx
```tsx
import { FileTreeNode } from '../types';
import { FileNodeRow } from './FileNode';

interface FileTreeProps { nodes: FileTreeNode[]; depth?: number; }

export function FileTree({ nodes, depth = 0 }: FileTreeProps) {
  return (
    <div>
      {nodes.map((node) => (<FileNodeRow key={node.path} node={node} depth={depth} />))}
    </div>
  );
}
```

### client/src/utils/colors.ts and client/src/utils/fileIcons.ts
These are utility files with no side effects — just icon/color mappings. Unlikely to be the issue but included in the repo at the SHA above.
