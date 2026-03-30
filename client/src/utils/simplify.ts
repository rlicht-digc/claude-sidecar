/**
 * Translates technical tool events into plain English descriptions
 * that a non-technical user can understand at a glance.
 */

/** Extract a friendly file name from a full path */
function friendlyFileName(filePath: string): string {
  if (!filePath) return 'a file';
  const parts = filePath.split('/');
  const name = parts[parts.length - 1];

  // Map common files to friendly names
  const friendly: Record<string, string> = {
    'package.json': 'project config',
    'tsconfig.json': 'TypeScript settings',
    'vite.config.ts': 'build config',
    '.gitignore': 'git settings',
    'README.md': 'readme',
    'Dockerfile': 'Docker config',
    'docker-compose.yml': 'Docker setup',
    '.env': 'environment variables',
    'Makefile': 'build script',
  };

  if (friendly[name]) return friendly[name];

  // Simplify by extension
  const ext = name.split('.').pop()?.toLowerCase();
  const extLabels: Record<string, string> = {
    tsx: 'component', ts: 'script', jsx: 'component', js: 'script',
    py: 'script', rs: 'module', go: 'module',
    css: 'styles', scss: 'styles', html: 'page',
    json: 'config', yaml: 'config', yml: 'config', toml: 'config',
    md: 'doc', txt: 'text', sh: 'script', bash: 'script',
    sql: 'query', graphql: 'query',
    png: 'image', jpg: 'image', svg: 'icon',
    test: 'test', spec: 'test',
  };

  // Check if it's a test file
  if (name.includes('.test.') || name.includes('.spec.') || name.includes('_test.')) {
    const base = name.replace(/\.(test|spec)\.(ts|tsx|js|jsx|py)$/, '').replace(/_test\.(py|go)$/, '');
    return `tests for ${base}`;
  }

  const label = extLabels[ext || ''] || 'file';
  const baseName = name.replace(/\.[^.]+$/, '');
  return `${baseName} ${label}`;
}

/** Extract a friendly repo/project name from a path */
function friendlyRepo(filePath: string): string {
  if (!filePath) return '';
  const parts = filePath.split('/');

  // Find the likely repo root (look for common depth patterns)
  // /Users/username/reponame/... → reponame
  const userIdx = parts.indexOf('Users');
  if (userIdx >= 0 && parts.length > userIdx + 2) {
    return parts[userIdx + 2];
  }

  // /home/username/reponame/...
  const homeIdx = parts.indexOf('home');
  if (homeIdx >= 0 && parts.length > homeIdx + 2) {
    return parts[homeIdx + 2];
  }

  // Fallback: use the 3rd or 4th segment
  if (parts.length >= 4) return parts[3];
  if (parts.length >= 3) return parts[2];
  return parts[parts.length - 1];
}

/** Main simplification function */
export function simplifyEvent(type: string, data: {
  path?: string;
  command?: string;
  description?: string;
  tool_input?: any;
  name?: string;
}): string {
  const path = data.path || data.tool_input?.file_path || '';
  const fileName = friendlyFileName(path);
  const repo = friendlyRepo(path);
  const inRepo = repo ? ` in ${repo}` : '';

  switch (type) {
    case 'tool:read':
      return `Reading ${fileName}${inRepo}`;

    case 'tool:write':
      return `Creating ${fileName}${inRepo}`;

    case 'tool:edit':
      return `Editing ${fileName}${inRepo}`;

    case 'tool:bash': {
      const cmd = data.command || data.description || '';
      // Simplify common commands
      if (cmd.includes('npm install') || cmd.includes('npm i ')) return 'Installing packages';
      if (cmd.includes('npm run') || cmd.includes('npm test')) return 'Running a script';
      if (cmd.includes('git status')) return 'Checking git status';
      if (cmd.includes('git add') || cmd.includes('git commit')) return 'Saving changes to git';
      if (cmd.includes('git push')) return 'Pushing to remote';
      if (cmd.includes('git pull')) return 'Pulling latest changes';
      if (cmd.includes('git log')) return 'Reviewing history';
      if (cmd.includes('git diff')) return 'Comparing changes';
      if (cmd.includes('tsc') || cmd.includes('typescript')) return 'Compiling TypeScript';
      if (cmd.includes('python') || cmd.includes('pip')) return 'Running Python';
      if (cmd.includes('docker')) return 'Working with Docker';
      if (cmd.includes('curl') || cmd.includes('fetch')) return 'Making a web request';
      if (cmd.includes('ls') || cmd.includes('find')) return 'Looking at files';
      if (cmd.includes('mkdir')) return 'Creating a folder';
      if (cmd.includes('rm ') || cmd.includes('delete')) return 'Removing files';
      if (cmd.includes('cat') || cmd.includes('head') || cmd.includes('tail')) return 'Viewing file contents';
      if (cmd.includes('kill') || cmd.includes('lsof')) return 'Managing processes';
      if (data.description) return data.description;
      return 'Running a command';
    }

    case 'tool:glob':
      return `Searching for files${inRepo}`;

    case 'tool:grep': {
      const pattern = data.tool_input?.pattern || '';
      if (pattern) return `Searching for "${pattern.slice(0, 30)}"${inRepo}`;
      return `Searching code${inRepo}`;
    }

    case 'tool:agent':
      return 'Working with a helper agent';

    case 'fs:create':
      return `New file: ${fileName}${inRepo}`;
    case 'fs:change':
      return `Updated ${fileName}${inRepo}`;
    case 'fs:delete':
      return `Removed ${fileName}${inRepo}`;
    case 'fs:mkdir':
      return `New folder${inRepo}`;
    case 'fs:rmdir':
      return `Removed a folder${inRepo}`;

    default:
      return 'Working...';
  }
}

/** Summarize a batch of recent events into a one-liner */
export function simplifyBatch(events: Array<{ type: string; data?: any }>): string {
  if (events.length === 0) return 'Waiting for activity';
  if (events.length === 1) return simplifyEvent(events[0].type, events[0].data || {});

  const types = new Set(events.map((e) => {
    if (e.type.includes('read') || e.type === 'tool:glob') return 'reading';
    if (e.type.includes('edit') || e.type.includes('change')) return 'editing';
    if (e.type.includes('write') || e.type.includes('create')) return 'creating';
    if (e.type.includes('grep')) return 'searching';
    if (e.type.includes('bash')) return 'running commands';
    if (e.type.includes('agent')) return 'delegating';
    return 'working';
  }));

  const repos = new Set(events.filter((e) => e.data?.path).map((e) => friendlyRepo(e.data.path)));
  const repoHint = repos.size === 1 ? ` in ${[...repos][0]}` : '';

  const activities = [...types];
  if (activities.length === 1) {
    return `${capitalize(activities[0])}${repoHint} (${events.length} actions)`;
  }
  return `${capitalize(activities[0])} and ${activities[1]}${repoHint}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
