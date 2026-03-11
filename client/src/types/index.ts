export type EventType =
  | 'tool:read'
  | 'tool:write'
  | 'tool:edit'
  | 'tool:bash'
  | 'tool:glob'
  | 'tool:grep'
  | 'tool:agent'
  | 'fs:create'
  | 'fs:change'
  | 'fs:delete'
  | 'fs:mkdir'
  | 'fs:rmdir';

export interface SidecarEvent {
  type: EventType;
  timestamp: number;
  data: {
    path?: string;
    relativePath?: string;
    name?: string;
    extension?: string;
    directory?: string;
    command?: string;
    description?: string;
    tool_name?: string;
    tool_input?: any;
  };
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: FileTreeNode[];
  extension: string;
  status?: 'idle' | 'reading' | 'writing' | 'edited' | 'created' | 'deleted' | 'active';
  lastActivity?: number;
  isExpanded?: boolean;
}

export interface ActivityItem {
  id: string;
  type: EventType;
  message: string;
  detail?: string;
  path?: string;
  timestamp: number;
  color: string;
}
