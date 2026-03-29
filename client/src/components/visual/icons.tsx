import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

// File cabinet SVG - a stylized cabinet with drawer
export function CabinetIcon({ size = 64, color = '#7d8590', style }: IconProps) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 64 77" fill="none" style={style}>
      {/* Cabinet body */}
      <rect x="4" y="8" width="56" height="65" rx="4" fill="#161b22" stroke={color} strokeWidth="1.5" />
      {/* Top drawer */}
      <rect x="8" y="12" width="48" height="18" rx="2" fill="#0d1117" stroke={color} strokeWidth="1" />
      {/* Top drawer handle */}
      <rect x="26" y="19" width="12" height="3" rx="1.5" fill={color} />
      {/* Bottom drawer */}
      <rect x="8" y="34" width="48" height="18" rx="2" fill="#0d1117" stroke={color} strokeWidth="1" />
      {/* Bottom drawer handle */}
      <rect x="26" y="41" width="12" height="3" rx="1.5" fill={color} />
      {/* Legs */}
      <rect x="10" y="73" width="4" height="4" rx="1" fill={color} />
      <rect x="50" y="73" width="4" height="4" rx="1" fill={color} />
      {/* Top label area */}
      <rect x="16" y="56" width="32" height="12" rx="2" fill="#21262d" />
    </svg>
  );
}

// Open cabinet drawer - slides out
export function CabinetOpenIcon({ size = 64, color = '#7d8590', style }: IconProps) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 64 83" fill="none" style={style}>
      {/* Cabinet body */}
      <rect x="4" y="14" width="56" height="65" rx="4" fill="#161b22" stroke={color} strokeWidth="1.5" />
      {/* Top drawer - pulled out */}
      <rect x="2" y="2" width="52" height="20" rx="2" fill="#1c2129" stroke={color} strokeWidth="1.5" />
      <rect x="20" y="10" width="12" height="3" rx="1.5" fill={color} />
      {/* File tabs visible in open drawer */}
      <rect x="8" y="5" width="8" height="14" rx="1" fill="#58a6ff" opacity="0.3" />
      <rect x="18" y="5" width="8" height="14" rx="1" fill="#3fb950" opacity="0.3" />
      <rect x="28" y="5" width="8" height="14" rx="1" fill="#d29922" opacity="0.3" />
      {/* Bottom drawer */}
      <rect x="8" y="40" width="48" height="18" rx="2" fill="#0d1117" stroke={color} strokeWidth="1" />
      <rect x="26" y="47" width="12" height="3" rx="1.5" fill={color} />
      {/* Legs */}
      <rect x="10" y="79" width="4" height="4" rx="1" fill={color} />
      <rect x="50" y="79" width="4" height="4" rx="1" fill={color} />
    </svg>
  );
}

// Small file document icon
export function FileDocIcon({ size = 24, color = '#7d8590', style }: IconProps) {
  return (
    <svg width={size} height={size * 1.17} viewBox="0 0 24 28" fill="none" style={style}>
      {/* Document body */}
      <path d="M2 4C2 2.89543 2.89543 2 4 2H15L22 9V24C22 25.1046 21.1046 26 20 26H4C2.89543 26 2 25.1046 2 24V4Z" fill="#161b22" stroke={color} strokeWidth="1.5" />
      {/* Folded corner */}
      <path d="M15 2V7C15 8.10457 15.8954 9 17 9H22" stroke={color} strokeWidth="1.5" />
      {/* Lines */}
      <line x1="6" y1="14" x2="18" y2="14" stroke={color} strokeWidth="1" opacity="0.4" />
      <line x1="6" y1="18" x2="14" y2="18" stroke={color} strokeWidth="1" opacity="0.4" />
      <line x1="6" y1="22" x2="16" y2="22" stroke={color} strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

// Tool icons - each represents a specific Claude Code tool
export function ToolReadIcon({ size = 20, color = '#58a6ff', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <circle cx="10" cy="10" r="4" stroke={color} strokeWidth="1.5" />
      <circle cx="10" cy="10" r="1.5" fill={color} />
      <path d="M1 10C1 10 5 4 10 4C15 4 19 10 19 10C19 10 15 16 10 16C5 16 1 10 1 10Z" stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function ToolEditIcon({ size = 20, color = '#d29922', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M14.5 2.5L17.5 5.5L7 16H4V13L14.5 2.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 5L15 8" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function ToolWriteIcon({ size = 20, color = '#3fb950', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M10 2V14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 10L10 14L14 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18H16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ToolDeleteIcon({ size = 20, color = '#f85149', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M3 5H17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 5V16C5 17.1046 5.89543 18 7 18H13C14.1046 18 15 17.1046 15 16V5" stroke={color} strokeWidth="1.5" />
      <path d="M8 2H12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 9V14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 9V14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ToolSearchIcon({ size = 20, color = '#bc8cff', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <circle cx="8.5" cy="8.5" r="5.5" stroke={color} strokeWidth="1.5" />
      <path d="M13 13L18 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ToolTerminalIcon({ size = 20, color = '#bc8cff', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <rect x="1" y="3" width="18" height="14" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M5 8L8 10.5L5 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 13H15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ToolAgentIcon({ size = 20, color = '#bc8cff', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <rect x="4" y="2" width="12" height="10" rx="3" stroke={color} strokeWidth="1.5" />
      <circle cx="8" cy="7" r="1" fill={color} />
      <circle cx="12" cy="7" r="1" fill={color} />
      <path d="M7 14V17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 14V17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 17H9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 17H15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M1 5H4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 5H19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Get the appropriate tool icon component for an event type
export function getToolIcon(eventType: string): React.FC<IconProps> {
  if (eventType.includes('read') || eventType === 'tool:glob') return ToolReadIcon;
  if (eventType.includes('edit') || eventType.includes('change')) return ToolEditIcon;
  if (eventType.includes('write') || eventType.includes('create') || eventType === 'fs:mkdir') return ToolWriteIcon;
  if (eventType.includes('delete') || eventType.includes('rmdir')) return ToolDeleteIcon;
  if (eventType.includes('grep')) return ToolSearchIcon;
  if (eventType.includes('bash')) return ToolTerminalIcon;
  if (eventType.includes('agent')) return ToolAgentIcon;
  return ToolSearchIcon;
}

// Get tool label for an event type
export function getToolLabel(eventType: string): string {
  if (eventType.includes('read')) return 'Reading';
  if (eventType === 'tool:glob') return 'Searching';
  if (eventType.includes('edit')) return 'Editing';
  if (eventType.includes('change')) return 'Changed';
  if (eventType.includes('write')) return 'Writing';
  if (eventType.includes('create') || eventType === 'fs:mkdir') return 'Creating';
  if (eventType.includes('delete') || eventType.includes('rmdir')) return 'Deleting';
  if (eventType.includes('grep')) return 'Searching';
  if (eventType.includes('bash')) return 'Running';
  if (eventType.includes('agent')) return 'Agent';
  return 'Working';
}
