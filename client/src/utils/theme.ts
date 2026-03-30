/**
 * Terminal Saddle — Liquid Glass Theme
 *
 * Inspired by Apple's Liquid Glass (macOS/iOS), Finity Design System.
 * Translucent panels, specular highlights, soft blurs, bright gradients.
 * Feels techy but stylish, not technically encumbered.
 */

export const theme = {
  // Background gradient (vibrant, flows behind glass panels)
  bgGradient: 'linear-gradient(135deg, #0f1b3d 0%, #1a1040 25%, #0d2847 50%, #162050 75%, #1a1040 100%)',

  // Glass surfaces (translucent with blur)
  glass: {
    bg: 'rgba(255, 255, 255, 0.06)',
    bgHover: 'rgba(255, 255, 255, 0.10)',
    bgActive: 'rgba(255, 255, 255, 0.14)',
    border: 'rgba(255, 255, 255, 0.12)',
    borderHover: 'rgba(255, 255, 255, 0.20)',
    borderFocus: 'rgba(120, 130, 255, 0.40)',
    backdrop: 'blur(20px) saturate(180%)',
    backdropLight: 'blur(12px) saturate(150%)',
    // Specular highlight (top edge glow)
    specular: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)',
  },

  // Text (brighter, more readable against glass)
  text: {
    primary: '#f0f0f8',
    secondary: '#b8b5d0',
    muted: '#8885a8',
    disabled: '#5a5878',
  },

  // Accent colors (vivid but not harsh)
  accent: {
    purple: '#8b7bff',
    blue: '#5ba8ff',
    green: '#4ddb8a',
    orange: '#ffaa5c',
    red: '#ff6b6b',
    yellow: '#ffd04a',
    cyan: '#4ae0e0',
    pink: '#ea80ff',
  },

  // Agent colors
  agent: {
    claude: '#e8956e',
    codex: '#5ba8ff',
  },

  // Status lights (bright, visible through glass)
  status: {
    active: '#4ddb8a',
    idle: '#5ba8ff',
    inactive: '#8885a8',
    error: '#ff6b6b',
  },

  // Event colors
  event: {
    read: '#5ba8ff',
    write: '#4ddb8a',
    edit: '#ffd04a',
    delete: '#ff6b6b',
    search: '#c0a0ff',
    command: '#c0a0ff',
    agent: '#ea80ff',
  },

  // Radii (softer, rounder)
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '22px',
    full: '9999px',
  },

  // Shadows (soft, diffused)
  shadow: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.2)',
    md: '0 4px 16px rgba(0, 0, 0, 0.25)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.35)',
    glow: (color: string) => `0 0 16px ${color}50, 0 0 6px ${color}30`,
    inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.15)',
  },

  // Typography
  font: {
    sans: "'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
  },

  // Compatibility aliases (map old names to glass equivalents)
  bg: {
    base: 'transparent',
    surface: 'rgba(255, 255, 255, 0.06)',
    elevated: 'rgba(255, 255, 255, 0.10)',
    overlay: 'rgba(255, 255, 255, 0.14)',
    input: 'rgba(255, 255, 255, 0.04)',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.12)',
    default: 'rgba(255, 255, 255, 0.15)',
    hover: 'rgba(255, 255, 255, 0.20)',
    focus: 'rgba(120, 130, 255, 0.40)',
  },

  // Spacing
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },
} as const;

/** Helper: create a glass panel style object */
export function glassPanel(options?: { hover?: boolean; active?: boolean }): React.CSSProperties {
  return {
    background: options?.active ? theme.glass.bgActive : options?.hover ? theme.glass.bgHover : theme.glass.bg,
    backdropFilter: theme.glass.backdrop,
    WebkitBackdropFilter: theme.glass.backdrop,
    border: `1px solid ${theme.glass.border}`,
    borderRadius: theme.radius.md,
    boxShadow: `${theme.shadow.sm}, ${theme.glass.specular}`,
  } as React.CSSProperties;
}

/** Helper: create a glass button style */
export function glassButton(active?: boolean): React.CSSProperties {
  return {
    background: active ? theme.glass.bgActive : theme.glass.bg,
    backdropFilter: theme.glass.backdropLight,
    WebkitBackdropFilter: theme.glass.backdropLight,
    border: `1px solid ${active ? theme.glass.borderHover : theme.glass.border}`,
    borderRadius: theme.radius.sm,
    boxShadow: theme.glass.specular,
    color: active ? theme.text.primary : theme.text.secondary,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties;
}
