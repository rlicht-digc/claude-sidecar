export type ActionScope = 'current' | 'repo' | 'system';

export interface ActionVariant {
  scope: ActionScope;
  label: string;
  description: string;
  prompts: {
    claude: string;
    codex: string;
  };
}

export interface ActionDef {
  id: string;
  label: string;
  icon: string;
  category: 'audit' | 'research' | 'dev' | 'analysis';
  /** If true, show scope sub-menu (Current Window / Repo / System) */
  hasScopes: boolean;
  /** Variants per scope. If hasScopes=false, only 'repo' is used. */
  variants: Partial<Record<ActionScope, ActionVariant>>;
}

export const CLI_COMMANDS = {
  claude: `claude --dangerously-skip-permissions -p "{{prompt}}"`,
  codex: `codex --full-auto "{{prompt}}"`,
} as const;

export type AgentCLI = keyof typeof CLI_COMMANDS;

/** For "current terminal" scope, just the raw prompt (no CLI wrapper) */
export function buildCurrentTerminalPrompt(variant: ActionVariant): string {
  // For injecting into an already-running Claude/Codex session,
  // we just type the prompt text directly
  return variant.prompts.claude
    .replace(/<\/?context>/g, '')
    .replace(/<\/?instructions>/g, '')
    .replace(/\{\{cwd\}\}/g, '.')
    .trim();
}

export function buildCommand(variant: ActionVariant, agent: AgentCLI, cwd: string): string {
  let prompt = variant.prompts[agent];
  prompt = prompt.replace(/\{\{cwd\}\}/g, cwd);
  const escaped = prompt.replace(/'/g, "'\\''");
  return `cd "${cwd}" && ${CLI_COMMANDS[agent].replace('{{prompt}}', escaped)}`;
}

export const ACTIONS: ActionDef[] = [
  {
    id: 'audit',
    label: 'Audit',
    icon: '🔍',
    category: 'audit',
    hasScopes: true,
    variants: {
      current: {
        scope: 'current',
        label: 'Audit Current Window',
        description: 'Audit what you\'re working on in this terminal',
        prompts: {
          claude: `Review the recent work in this terminal session. Identify any issues, potential bugs, or improvements in the code that was just modified or discussed. Focus on what's actively being worked on right now.`,
          codex: `PLACEHOLDER: Codex to write via mailbox`,
        },
      },
      repo: {
        scope: 'repo',
        label: 'Repo Audit',
        description: 'Full audit of the current repository',
        prompts: {
          claude: `<context>
You are auditing the repository at {{cwd}}.
</context>

<instructions>
Perform a comprehensive repository audit:

1. **Structure & Organization** — Misplaced files, dead code, orphaned modules
2. **Code Quality** — Code smells, duplication, complexity, missing error handling
3. **Security** — Hardcoded secrets, insecure deps, injection vulnerabilities
4. **Dependencies** — Outdated, unused, or vulnerable packages
5. **Documentation** — Adequacy of READMEs, comments, API docs
6. **Testing** — Coverage gaps, critical paths without tests
7. **Configuration** — Env var hygiene, config consistency, build pipeline

Output severity-rated findings (critical/high/medium/low) and a prioritized top 10 action list.
</instructions>`,
          codex: `PLACEHOLDER: Codex to write via mailbox`,
        },
      },
      system: {
        scope: 'system',
        label: 'System Audit',
        description: 'System-wide health check',
        prompts: {
          claude: `<context>
Working directory: {{cwd}}
</context>

<instructions>
Perform a system-level diagnostic:

1. **Disk & Storage** — Usage, large files, stale caches
2. **Git Health** — Uncommitted changes across repos, stale branches
3. **Running Processes** — Orphaned servers, port conflicts
4. **Environment** — Tool versions (node, python, docker, git, claude, codex)
5. **Secrets** — Exposed .env files, API keys in git history
6. **Resources** — Memory, CPU, network usage

Output pass/warn/fail per category with remediation steps.
</instructions>`,
          codex: `PLACEHOLDER: Codex to write via mailbox`,
        },
      },
    },
  },
  {
    id: 'research',
    label: 'Research',
    icon: '📚',
    category: 'research',
    hasScopes: true,
    variants: {
      current: {
        scope: 'current',
        label: 'Research This',
        description: 'Deep research on what you\'re currently working on',
        prompts: {
          claude: `Look at what I'm currently working on in this terminal and research it in depth. Find the latest best practices, competing approaches, relevant libraries, and actionable improvements. Output a structured brief with links.`,
          codex: `PLACEHOLDER: Codex to write via mailbox`,
        },
      },
      repo: {
        scope: 'repo',
        label: 'Research Project',
        description: 'Research the project\'s domain and tech stack',
        prompts: {
          claude: `<context>
Working directory: {{cwd}}
</context>

<instructions>
Research this project's domain:

1. **Identify the topic** — Read README, package.json, recent commits
2. **State of the art** — Latest developments, best practices, competing approaches
3. **Libraries & tools** — Packages/services that could improve the project
4. **Gap analysis** — Compare current approach against industry best practices
5. **Compile** — Structured markdown research brief with citations and links

Output actionable recommendations.
</instructions>`,
          codex: `PLACEHOLDER: Codex to write via mailbox`,
        },
      },
    },
  },
  {
    id: 'test',
    label: 'Run Tests',
    icon: '🧪',
    category: 'dev',
    hasScopes: false,
    variants: {
      repo: {
        scope: 'repo',
        label: 'Run Tests',
        description: 'Discover and run the test suite',
        prompts: {
          claude: `<context>
Working directory: {{cwd}}
</context>

<instructions>
Find and run the project's test suite:

1. **Discover** — Identify framework from package.json, pyproject.toml, Makefile, CI config
2. **Run** — Execute with verbose output
3. **Analyze** — Diagnose any failures (test bug or code bug?)
4. **Fix** — Apply fixes for failures
5. **Report** — Total/passed/failed/skipped + fixes applied

If no tests exist, suggest what should be tested first.
</instructions>`,
          codex: `PLACEHOLDER: Codex to write via mailbox`,
        },
      },
    },
  },
  {
    id: 'refactor',
    label: 'Refactor',
    icon: '♻️',
    category: 'dev',
    hasScopes: false,
    variants: {
      repo: {
        scope: 'repo',
        label: 'Refactor',
        description: 'Safe refactoring opportunities',
        prompts: {
          claude: `<context>
Working directory: {{cwd}}
</context>

<instructions>
Identify and execute safe refactoring:

1. **Scan** — Duplicated code, long functions, poor naming, dead code
2. **Prioritize** — Rank by impact and safety
3. **Execute** — Apply top 3-5 safest refactors
4. **Verify** — Run tests after each change
5. **Report** — What changed and why, before/after

No API changes, no new features, no behavior changes. Structure only.
</instructions>`,
          codex: `PLACEHOLDER: Codex to write via mailbox`,
        },
      },
    },
  },
  {
    id: 'document',
    label: 'Document',
    icon: '📝',
    category: 'dev',
    hasScopes: false,
    variants: {
      repo: {
        scope: 'repo',
        label: 'Generate Docs',
        description: 'Review and improve documentation',
        prompts: {
          claude: `<context>
Working directory: {{cwd}}
</context>

<instructions>
Review and improve documentation:

1. **Inventory** — Existing READMEs, comments, API docs, changelogs
2. **Gap analysis** — What's missing, outdated, confusing?
3. **README** — Write/update comprehensive README
4. **Code comments** — Add JSDoc/docstrings where genuinely needed
5. **Architecture** — Brief architecture doc if multi-component

Only add docs where needed. Don't over-document simple code.
</instructions>`,
          codex: `PLACEHOLDER: Codex to write via mailbox`,
        },
      },
    },
  },
];
