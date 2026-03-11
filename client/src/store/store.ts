import { create } from 'zustand';
import { FileTreeNode, SidecarEvent, ActivityItem } from '../types';
import { getEventColor } from '../utils/colors';

let activityCounter = 0;

interface SidecarStore {
  // Connection
  connected: boolean;
  setConnected: (connected: boolean) => void;

  // Working directory
  workingDirectory: string;
  setWorkingDirectory: (dir: string) => void;

  // File tree
  fileTree: FileTreeNode[];
  setFileTree: (tree: FileTreeNode[]) => void;

  // Activities
  activities: ActivityItem[];
  addActivity: (activity: ActivityItem) => void;

  // Stats
  eventCount: number;

  // Expanded directories
  expandedPaths: Set<string>;
  toggleExpanded: (path: string) => void;

  // Active (highlighted) file paths
  activePaths: Map<string, { status: string; timestamp: number }>;

  // Process incoming event
  processEvent: (event: SidecarEvent) => void;
}

function formatEventMessage(event: SidecarEvent): { message: string; detail?: string } {
  const data = event.data || {};
  const name = data.name || data.relativePath || data.path || '';

  switch (event.type) {
    case 'tool:read':
      return { message: `Reading ${name}`, detail: data.path };
    case 'tool:write':
      return { message: `Writing ${name}`, detail: data.path };
    case 'tool:edit':
      return { message: `Editing ${name}`, detail: data.path };
    case 'tool:bash':
      return { message: `Running command`, detail: data.command || data.description };
    case 'tool:glob':
      return { message: `Searching files`, detail: data.tool_input?.pattern };
    case 'tool:grep':
      return { message: `Searching content`, detail: data.tool_input?.pattern };
    case 'tool:agent':
      return { message: `Launched agent`, detail: data.description };
    case 'fs:create':
      return { message: `Created ${name}`, detail: data.path };
    case 'fs:change':
      return { message: `Changed ${name}`, detail: data.path };
    case 'fs:delete':
      return { message: `Deleted ${name}`, detail: data.path };
    case 'fs:mkdir':
      return { message: `Created folder ${name}`, detail: data.path };
    case 'fs:rmdir':
      return { message: `Removed folder ${name}`, detail: data.path };
    default:
      return { message: `${event.type}`, detail: JSON.stringify(data).slice(0, 100) };
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
  addActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities].slice(0, 200),
    })),

  eventCount: 0,

  expandedPaths: new Set<string>(),
  toggleExpanded: (path) =>
    set((state) => {
      const next = new Set(state.expandedPaths);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return { expandedPaths: next };
    }),

  activePaths: new Map(),

  processEvent: (event) => {
    const { message, detail } = formatEventMessage(event);
    const color = getEventColor(event.type);

    const activity: ActivityItem = {
      id: `${++activityCounter}`,
      type: event.type,
      message,
      detail,
      path: event.data?.path,
      timestamp: event.timestamp,
      color,
    };

    const filePath = event.data?.path;

    set((state) => {
      const newActivePaths = new Map(state.activePaths);

      if (filePath) {
        newActivePaths.set(filePath, {
          status: getStatusForEvent(event.type),
          timestamp: Date.now(),
        });

        // Auto-clear after 3 seconds
        setTimeout(() => {
          set((s) => {
            const paths = new Map(s.activePaths);
            const entry = paths.get(filePath);
            if (entry && Date.now() - entry.timestamp >= 2800) {
              paths.delete(filePath);
              return { activePaths: paths };
            }
            return {};
          });
        }, 3000);
      }

      // Auto-expand parent directories when a file is touched
      const newExpanded = new Set(state.expandedPaths);
      if (filePath && state.workingDirectory) {
        const rel = filePath.replace(state.workingDirectory + '/', '');
        const parts = rel.split('/');
        let current = state.workingDirectory;
        for (let i = 0; i < parts.length - 1; i++) {
          current += '/' + parts[i];
          newExpanded.add(current);
        }
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
