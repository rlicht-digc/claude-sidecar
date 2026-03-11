export const colors = {
  bg: '#0d1117',
  surface: '#161b22',
  surfaceHover: '#1c2129',
  border: '#30363d',
  text: '#e6edf3',
  muted: '#7d8590',

  // Operation colors
  read: '#58a6ff',
  write: '#3fb950',
  edit: '#d29922',
  delete: '#f85149',
  search: '#bc8cff',
  command: '#bc8cff',
  create: '#3fb950',
  change: '#d29922',
  connected: '#39d353',
  disconnected: '#f85149',

  // File type colors
  typescript: '#3178c6',
  javascript: '#f1e05a',
  python: '#3572A5',
  rust: '#dea584',
  go: '#00ADD8',
  json: '#d29922',
  markdown: '#083fa1',
  css: '#663399',
  html: '#e34c26',
  shell: '#89e051',
  docker: '#384d54',
  yaml: '#cb171e',
  default: '#7d8590',
} as const;

export function getEventColor(type: string): string {
  if (type.includes('read') || type === 'tool:glob' || type === 'tool:grep') return colors.read;
  if (type.includes('write') || type.includes('create') || type === 'fs:mkdir') return colors.create;
  if (type.includes('edit') || type.includes('change')) return colors.edit;
  if (type.includes('delete') || type.includes('rmdir')) return colors.delete;
  if (type.includes('bash') || type.includes('agent')) return colors.command;
  return colors.muted;
}

export function getExtensionColor(ext: string): string {
  const map: Record<string, string> = {
    '.ts': colors.typescript,
    '.tsx': colors.typescript,
    '.js': colors.javascript,
    '.jsx': colors.javascript,
    '.py': colors.python,
    '.rs': colors.rust,
    '.go': colors.go,
    '.json': colors.json,
    '.md': colors.markdown,
    '.css': colors.css,
    '.scss': colors.css,
    '.html': colors.html,
    '.sh': colors.shell,
    '.bash': colors.shell,
    '.zsh': colors.shell,
    '.yml': colors.yaml,
    '.yaml': colors.yaml,
    '.dockerfile': colors.docker,
  };
  return map[ext.toLowerCase()] || colors.default;
}
