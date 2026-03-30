import { SidecarEvent } from '../types';
import { ParsedEvent, EventCategory, BashInfo, FileInfo, SearchInfo, FilePurpose } from './types';

// --- Bash command parsing ---

const TOOL_ACTIONS: Record<string, string[]> = {
  git: ['add', 'commit', 'push', 'pull', 'clone', 'checkout', 'branch', 'merge', 'rebase', 'stash', 'log', 'diff', 'status', 'reset', 'fetch', 'init', 'tag', 'remote', 'bisect', 'blame'],
  npm: ['install', 'run', 'test', 'build', 'start', 'publish', 'init', 'update', 'uninstall', 'audit', 'ci', 'exec', 'pack', 'link'],
  npx: [],
  yarn: ['add', 'remove', 'install', 'build', 'test', 'start', 'run'],
  pip: ['install', 'uninstall', 'freeze', 'list', 'show'],
  python: ['run', '-m', '-c'],
  python3: ['run', '-m', '-c'],
  node: [],
  docker: ['build', 'run', 'push', 'pull', 'stop', 'rm', 'exec', 'compose', 'ps', 'logs', 'images'],
  cargo: ['build', 'run', 'test', 'check', 'clippy', 'fmt', 'publish', 'install', 'new'],
  go: ['build', 'run', 'test', 'mod', 'get', 'install', 'vet', 'fmt'],
  make: [],
  curl: [],
  wget: [],
  ssh: [],
  scp: [],
  rsync: [],
  kubectl: ['get', 'apply', 'delete', 'describe', 'logs', 'exec', 'scale', 'rollout'],
  tsc: [],
  eslint: [],
  prettier: [],
  jest: [],
  pytest: [],
  vitest: [],
};

const BASH_SUMMARIES: Record<string, (action: string, target?: string) => string> = {
  git: (a, t) => {
    const m: Record<string, string> = {
      push: 'Pushing changes to remote', pull: 'Pulling latest changes', commit: 'Saving a code snapshot',
      add: 'Staging files for commit', status: 'Checking what changed', diff: 'Comparing changes',
      log: 'Reviewing commit history', checkout: `Switching to ${t || 'another branch'}`,
      merge: `Merging ${t || 'branches'}`, rebase: 'Reorganizing commit history',
      clone: `Downloading ${t || 'a repository'}`, fetch: 'Fetching remote updates',
      stash: 'Temporarily shelving changes', branch: 'Managing branches',
      reset: 'Undoing changes', init: 'Creating a new repository',
      blame: `Checking who changed ${t || 'a file'}`, bisect: 'Binary searching for a bug',
    };
    return m[a] || `Git: ${a}`;
  },
  npm: (a, t) => {
    const m: Record<string, string> = {
      install: t ? `Installing ${t}` : 'Installing project dependencies',
      test: 'Running automated tests', build: 'Building the project for production',
      start: 'Starting the development server', run: t ? `Running the "${t}" script` : 'Running a script',
      audit: 'Checking for security vulnerabilities', publish: 'Publishing the package',
      init: 'Initializing a new project', update: 'Updating packages',
    };
    return m[a] || `npm: ${a}`;
  },
  python: (a, t) => t ? `Running Python script: ${t.split('/').pop()}` : 'Running Python',
  python3: (a, t) => t ? `Running Python script: ${t.split('/').pop()}` : 'Running Python',
  docker: (a, t) => {
    const m: Record<string, string> = {
      build: 'Building a container image', run: 'Starting a container',
      push: 'Uploading container to registry', pull: 'Downloading a container image',
      compose: 'Managing multi-container setup', ps: 'Listing running containers',
      logs: 'Viewing container logs', stop: 'Stopping a container',
    };
    return m[a] || `Docker: ${a}`;
  },
  cargo: (a) => {
    const m: Record<string, string> = { build: 'Compiling Rust code', run: 'Running Rust program', test: 'Running Rust tests', check: 'Checking Rust code', clippy: 'Linting Rust code', fmt: 'Formatting Rust code' };
    return m[a] || `Cargo: ${a}`;
  },
  tsc: () => 'Compiling TypeScript',
  eslint: () => 'Checking code style',
  prettier: () => 'Formatting code',
  jest: () => 'Running JavaScript tests',
  pytest: () => 'Running Python tests',
  vitest: () => 'Running Vite tests',
  make: (a) => a ? `Building: ${a}` : 'Running build system',
  curl: () => 'Making a web request',
  kubectl: (a, t) => `Kubernetes: ${a} ${t || ''}`.trim(),
};

function parseBash(command: string): BashInfo | undefined {
  if (!command) return undefined;

  // Take first command in a pipe chain
  const firstCmd = command.split('|')[0].split('&&').pop()!.trim();
  const parts = firstCmd.split(/\s+/);
  if (parts.length === 0) return undefined;

  let toolName = parts[0].replace(/^.*\//, ''); // strip path prefix
  // Handle env vars prefix like TERM=xterm command
  if (toolName.includes('=')) {
    parts.shift();
    toolName = (parts[0] || '').replace(/^.*\//, '');
  }

  const flags = parts.filter((p) => p.startsWith('-'));
  const args = parts.slice(1).filter((p) => !p.startsWith('-'));
  const action = args[0] || '';
  const target = args[1] || args[0] || undefined;

  return {
    tool: toolName,
    action,
    target: target !== action ? target : undefined,
    flags: flags.length > 0 ? flags : undefined,
    fullCommand: command,
  };
}

// --- File path parsing ---

const ENTRY_POINTS = new Set(['index.ts', 'index.tsx', 'index.js', 'index.jsx', 'main.ts', 'main.tsx', 'main.py', 'main.go', 'main.rs', 'App.tsx', 'App.jsx', 'app.py', 'app.ts', 'mod.rs', 'lib.rs', 'server.ts', 'server.js']);
const CONFIG_FILES = new Set(['package.json', 'tsconfig.json', 'vite.config.ts', '.eslintrc', '.prettierrc', 'webpack.config.js', 'next.config.js', 'tailwind.config.js', 'docker-compose.yml', 'Dockerfile', 'Makefile', '.env', '.gitignore', 'pyproject.toml', 'setup.py', 'requirements.txt', 'Cargo.toml', 'go.mod']);
const DOC_FILES = new Set(['README.md', 'CHANGELOG.md', 'LICENSE', 'CONTRIBUTING.md', 'AGENTS.md', 'CLAUDE.md']);

const DIR_PURPOSES: Record<string, FilePurpose> = {
  test: 'test', tests: 'test', __tests__: 'test', spec: 'test', __mocks__: 'test',
  components: 'component', pages: 'component', views: 'component', layouts: 'component',
  styles: 'style', css: 'style', scss: 'style',
  utils: 'script', lib: 'script', helpers: 'script', services: 'script', hooks: 'script',
  config: 'config', configs: 'config',
  docs: 'doc', documentation: 'doc',
  build: 'build', dist: 'build', out: 'build',
  data: 'data', fixtures: 'data', seeds: 'data', migrations: 'data',
};

function parseFile(filePath: string): FileInfo | undefined {
  if (!filePath) return undefined;

  const parts = filePath.split('/');
  const name = parts[parts.length - 1];
  const extension = name.includes('.') ? '.' + name.split('.').pop()! : '';
  const directory = parts.slice(0, -1).join('/');

  // Project name: find repo root
  let project = '';
  const userIdx = parts.indexOf('Users');
  if (userIdx >= 0 && parts.length > userIdx + 2) project = parts[userIdx + 2];
  else if (parts.length >= 4) project = parts[3];

  // Purpose
  let purpose: FilePurpose = 'unknown';
  if (CONFIG_FILES.has(name)) purpose = 'config';
  else if (DOC_FILES.has(name)) purpose = 'doc';
  else if (ENTRY_POINTS.has(name)) purpose = 'entry';
  else if (name.includes('.test.') || name.includes('.spec.') || name.includes('_test.')) purpose = 'test';
  else {
    // Check parent directory
    for (const dir of parts.slice(0, -1).reverse()) {
      if (DIR_PURPOSES[dir]) { purpose = DIR_PURPOSES[dir]; break; }
    }
    if (purpose === 'unknown') {
      const extMap: Record<string, FilePurpose> = {
        '.css': 'style', '.scss': 'style', '.less': 'style',
        '.md': 'doc', '.txt': 'doc', '.rst': 'doc',
        '.json': 'config', '.yaml': 'config', '.yml': 'config', '.toml': 'config',
        '.sh': 'script', '.bash': 'script',
        '.tsx': 'component', '.jsx': 'component',
      };
      purpose = extMap[extension] || 'script';
    }
  }

  return {
    name, extension, directory, project, purpose,
    isEntryPoint: ENTRY_POINTS.has(name),
  };
}

// --- Search parsing ---

function parseSearch(data: any): SearchInfo | undefined {
  const pattern = data?.tool_input?.pattern || data?.description || '';
  if (!pattern) return undefined;

  // Humanize regex
  let human = pattern
    .replace(/\\b/g, '')
    .replace(/\\s\+/g, ' ')
    .replace(/\\w\+/g, '*')
    .replace(/\.\*/g, '...')
    .replace(/\(\?:/g, '(')
    .replace(/\\/g, '');

  if (human === pattern) human = `"${pattern}"`;
  else human = `"${human}"`;

  return {
    pattern,
    humanReadable: `references to ${human}`,
    scope: data?.tool_input?.path?.split('/').pop(),
  };
}

// --- Main parser ---

export function parseEvent(event: SidecarEvent): ParsedEvent {
  const data = event.data || {};
  const type = event.type;

  // Category
  let category: EventCategory = 'other';
  if (type.includes('read') || type === 'tool:glob') category = 'read';
  else if (type.includes('write') || type.includes('create') || type === 'fs:mkdir') category = 'write';
  else if (type.includes('edit') || type.includes('change')) category = 'edit';
  else if (type.includes('delete') || type.includes('rmdir')) category = 'delete';
  else if (type.includes('grep')) category = 'search';
  else if (type.includes('bash')) category = 'command';
  else if (type.includes('agent')) category = 'agent';

  const bash = category === 'command' ? parseBash(data.command || data.tool_input?.command || '') : undefined;
  const file = parseFile(data.path || data.tool_input?.file_path || '');
  const search = category === 'search' ? parseSearch(data) : undefined;
  const agent = category === 'agent' ? { taskDescription: data.description || data.tool_input?.description || 'Sub-task' } : undefined;

  // Build summary
  let summary = '';

  if (bash) {
    const gen = BASH_SUMMARIES[bash.tool];
    summary = gen ? gen(bash.action, bash.target) : `Running ${bash.tool} ${bash.action}`.trim();
  } else if (search) {
    summary = `Searching for ${search.humanReadable}${search.scope ? ` in ${search.scope}` : ''}`;
  } else if (agent) {
    summary = `Delegating: ${agent.taskDescription}`;
  } else if (file) {
    const fileName = file.isEntryPoint ? `the main ${file.purpose} file` : file.name;
    const inProject = file.project ? ` in ${file.project}` : '';
    switch (category) {
      case 'read': summary = `Reading ${fileName}${inProject}`; break;
      case 'write': summary = `Creating ${fileName}${inProject}`; break;
      case 'edit': summary = `Editing ${fileName}${inProject}`; break;
      case 'delete': summary = `Removing ${fileName}${inProject}`; break;
      default: summary = `Working on ${fileName}${inProject}`;
    }
  } else {
    summary = type.replace('tool:', '').replace('fs:', '') || 'Working...';
  }

  return {
    raw: event,
    category,
    bash,
    file,
    search,
    agent,
    summary,
    timestamp: event.timestamp || Date.now(),
  };
}
