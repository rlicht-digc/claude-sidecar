import { create } from 'zustand';
import { FileTreeNode, SidecarEvent, ActivityItem, EventType } from '../types';
import { getEventColor } from '../utils/colors';
import { intelligence } from '../intelligence';

let activityCounter = 0;

// Wire AI teaching enrichment callback
intelligence.setTeachingCallback((bubble) => {
  useSidecarStore.setState({ teachingBubble: { text: bubble.text, conceptKey: bubble.conceptKey } });
});

export type ToneMode = 'executive' | 'friendly' | 'technical';

export interface SessionSummary {
  sessionId: string;
  lastEventType: EventType;
  lastActivity: string;
  narrative: string | null;
  phase: string;
  lastTimestamp: number;
  eventCount: number;
}

interface HoverInfo {
  text: string;
  type: 'directory' | 'file' | 'activity' | 'tool';
}

export type AppMode = 'dev' | 'consumer';

interface SidecarStore {
  // App mode
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;

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
  expandedPaths: Record<string, boolean>;
  toggleExpanded: (path: string) => void;

  // Active (highlighted) file paths
  activePaths: Record<string, { status: string; timestamp: number }>;

  // Hover info for character speech
  hoverInfo: HoverInfo | null;
  setHoverInfo: (info: HoverInfo | null) => void;

  // Intelligence layer state
  currentNarrative: string | null;
  currentPhase: string;
  teachingBubble: { text: string; conceptKey: string } | null;
  dismissTeaching: (key: string) => void;

  // Per-session summaries (keyed by session_id from hook events)
  sessionSummaries: Record<string, SessionSummary>;

  // Which session card the user is hovering (for bot stage narration)
  hoveredSessionId: string | null;
  setHoveredSessionId: (id: string | null) => void;

  // Tone mode for bot speech and activity descriptions
  toneMode: ToneMode;
  setToneMode: (mode: ToneMode) => void;

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
  appMode: (localStorage.getItem('saddle-app-mode') as AppMode) || 'dev',
  setAppMode: (mode) => {
    localStorage.setItem('saddle-app-mode', mode);
    set({ appMode: mode });
  },

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

  expandedPaths: {},
  toggleExpanded: (path) =>
    set((state) => {
      const next = { ...state.expandedPaths };
      if (next[path]) {
        delete next[path];
      } else {
        next[path] = true;
      }
      return { expandedPaths: next };
    }),

  activePaths: {},

  hoverInfo: null,
  setHoverInfo: (info) => set({ hoverInfo: info }),

  currentNarrative: null,
  currentPhase: 'idle',
  teachingBubble: null,
  dismissTeaching: (key) => {
    intelligence.dismissConcept(key);
    set({ teachingBubble: null });
  },

  sessionSummaries: {},
  hoveredSessionId: null,
  setHoveredSessionId: (id) => set({ hoveredSessionId: id }),
  toneMode: (localStorage.getItem('saddle-tone-mode') as ToneMode) || 'executive',
  setToneMode: (mode) => {
    localStorage.setItem('saddle-tone-mode', mode);
    set({ toneMode: mode });
  },

  processEvent: (event) => {
    // Run through intelligence layer
    const enriched = intelligence.process(event);

    const { message, detail } = formatEventMessage(event);
    const color = getEventColor(event.type);

    const activity: ActivityItem = {
      id: `${++activityCounter}`,
      type: event.type,
      message: enriched.parsed.summary || message,
      detail,
      path: event.data?.path,
      timestamp: event.timestamp,
      color,
    };

    const filePath = event.data?.path;
    const sessionId = event.session_id;

    set((state) => {
      const newActivePaths = { ...state.activePaths };

      if (filePath) {
        newActivePaths[filePath] = {
          status: getStatusForEvent(event.type),
          timestamp: Date.now(),
        };

        // Auto-clear after 3 seconds
        setTimeout(() => {
          set((s) => {
            const entry = s.activePaths[filePath];
            if (entry && Date.now() - entry.timestamp >= 2800) {
              const paths = { ...s.activePaths };
              delete paths[filePath];
              return { activePaths: paths };
            }
            return {};
          });
        }, 3000);
      }

      // Auto-expand parent directories when a file is touched
      const newExpanded = { ...state.expandedPaths };
      if (filePath && state.workingDirectory) {
        const rel = filePath.replace(state.workingDirectory + '/', '');
        const parts = rel.split('/');
        let current = state.workingDirectory;
        for (let i = 0; i < parts.length - 1; i++) {
          current += '/' + parts[i];
          newExpanded[current] = true;
        }
      }

      // Per-session summary update
      let sessionSummaries = state.sessionSummaries;
      if (sessionId) {
        const existing = state.sessionSummaries[sessionId];
        sessionSummaries = {
          ...sessionSummaries,
          [sessionId]: {
            sessionId,
            lastEventType: event.type,
            lastActivity: enriched.parsed.summary || message,
            narrative: enriched.narrative,
            phase: enriched.phase,
            lastTimestamp: event.timestamp,
            eventCount: (existing?.eventCount || 0) + 1,
          },
        };
      }

      return {
        activities: [activity, ...state.activities].slice(0, 200),
        eventCount: state.eventCount + 1,
        activePaths: newActivePaths,
        expandedPaths: newExpanded,
        currentNarrative: enriched.narrative,
        currentPhase: enriched.phase,
        teachingBubble: enriched.teaching ? { text: enriched.teaching.text, conceptKey: enriched.teaching.conceptKey } : state.teachingBubble,
        sessionSummaries,
      };
    });
  },
}));
