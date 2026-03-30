/**
 * Terminal Saddle — Modern Theme
 *
 * Inspired by Finity Design System, Arc Browser, Linear.
 * Softer than raw terminal dark. Approachable for non-technical users.
 * Purple-tinted dark with generous radius, soft shadows, clear hierarchy.
 */

export const theme = {
  // Backgrounds (layered, slightly purple-tinted)
  bg: {
    base: '#12111a',      // deepest background
    surface: '#1a1926',   // cards, panels
    elevated: '#222131',  // hover states, raised elements
    overlay: '#2a293a',   // modals, dropdowns
    input: '#16152266',   // input fields (semi-transparent)
  },

  // Borders (subtle, low contrast)
  border: {
    subtle: '#2a293a',
    default: '#353447',
    hover: '#4a4960',
    focus: '#7c6eff80',
  },

  // Text
  text: {
    primary: '#eeedf5',
    secondary: '#a09eb8',
    muted: '#6b6980',
    disabled: '#4a4862',
  },

  // Accent colors
  accent: {
    purple: '#7c6eff',    // primary accent
    blue: '#5b9aff',
    green: '#45d483',
    orange: '#ff9653',
    red: '#ff5c5c',
    yellow: '#ffc240',
    cyan: '#40d9d9',
    pink: '#e570ff',
  },

  // Agent colors
  agent: {
    claude: '#e08a6a',    // warm terracotta
    codex: '#5b9aff',     // cool blue
  },

  // Status lights
  status: {
    active: '#45d483',
    idle: '#5b9aff',
    inactive: '#6b6980',
    error: '#ff5c5c',
  },

  // Event type colors
  event: {
    read: '#5b9aff',
    write: '#45d483',
    edit: '#ffc240',
    delete: '#ff5c5c',
    search: '#b694ff',
    command: '#b694ff',
    agent: '#e570ff',
  },

  // Radii
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    full: '9999px',
  },

  // Shadows
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.3)',
    lg: '0 8px 24px rgba(0,0,0,0.4)',
    glow: (color: string) => `0 0 12px ${color}40, 0 0 4px ${color}20`,
  },

  // Typography
  font: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
  },

  // Spacing scale
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },

  // Glassmorphism preset
  glass: {
    background: 'rgba(26, 25, 38, 0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(53, 52, 71, 0.5)',
  },
} as const;

/** CSS variable injection (call once in App mount) */
export function injectThemeVars() {
  const root = document.documentElement;
  root.style.setProperty('--bg-base', theme.bg.base);
  root.style.setProperty('--bg-surface', theme.bg.surface);
  root.style.setProperty('--bg-elevated', theme.bg.elevated);
  root.style.setProperty('--text-primary', theme.text.primary);
  root.style.setProperty('--text-secondary', theme.text.secondary);
  root.style.setProperty('--text-muted', theme.text.muted);
  root.style.setProperty('--accent', theme.accent.purple);
  root.style.setProperty('--border', theme.border.default);
  root.style.setProperty('--radius', theme.radius.md);
  root.style.setProperty('--font-sans', theme.font.sans);
  root.style.setProperty('--font-mono', theme.font.mono);
}
