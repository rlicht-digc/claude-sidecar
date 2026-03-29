export interface ActionDef {
  id: string;
  label: string;
  icon: string;       // emoji for now, Lottie later
  category: 'audit' | 'research' | 'dev' | 'analysis';
  description: string;
  prompts: {
    claude: string;
    codex: string;     // Codex writes these via mailbox handoff — placeholders for now
  };
  /** If true, prompt includes {{cwd}} which is replaced at runtime */
  usesCwd: boolean;
}

/**
 * CLI launch commands per agent type.
 * {{prompt}} is replaced with the full prompt text.
 * {{cwd}} is replaced with the active working directory.
 */
export const CLI_COMMANDS = {
  claude: `cd "{{cwd}}" && claude --dangerously-skip-permissions -p "{{prompt}}"`,
  codex: `cd "{{cwd}}" && codex --full-auto "{{prompt}}"`,
} as const;

export type AgentCLI = keyof typeof CLI_COMMANDS;

export const ACTIONS: ActionDef[] = [
  {
    id: 'repo-audit',
    label: 'Repo Audit',
    icon: '🔍',
    category: 'audit',
    description: 'Comprehensive audit of the current repository',
    usesCwd: true,
    prompts: {
      claude: `<context>
You are auditing the repository at {{cwd}}.
</context>

<instructions>
Perform a comprehensive repository audit. Cover:

1. **Structure & Organization** — Is the project well-organized? Are there misplaced files, dead code, or orphaned modules?
2. **Code Quality** — Identify code smells, duplicated logic, overly complex functions, and missing error handling.
3. **Security** — Check for hardcoded secrets, exposed credentials, insecure dependencies, injection vulnerabilities.
4. **Dependencies** — Are there outdated, unused, or vulnerable packages? Run a dependency health check.
5. **Documentation** — Is there adequate documentation? Are READMEs, inline comments, and API docs sufficient?
6. **Testing** — What is the test coverage situation? Are there critical paths without tests?
7. **Configuration** — Check for environment variable hygiene, config file consistency, build pipeline health.

Output a structured report with severity ratings (critical/high/medium/low) for each finding.
At the end, provide a prioritized action list of the top 10 things to fix.
</instructions>`,
      codex: `PLACEHOLDER: Codex to write repo audit prompt via mailbox M0004`,
    },
  },
  {
    id: 'system-audit',
    label: 'System Audit',
    icon: '🖥️',
    category: 'audit',
    description: 'System-wide health check across all projects',
    usesCwd: true,
    prompts: {
      claude: `<context>
Working directory: {{cwd}}
</context>

<instructions>
Perform a system-level diagnostic audit:

1. **Disk & Storage** — Check disk usage, large files, stale caches (node_modules, __pycache__, .cache, Docker images).
2. **Git Health** — Scan for uncommitted changes across repos, stale branches, diverged remotes.
3. **Running Processes** — Identify orphaned servers, zombie processes, port conflicts.
4. **Environment** — Verify key tools are installed and up to date (node, python, docker, git, claude, codex).
5. **Secrets & Credentials** — Scan for exposed .env files, API keys in git history, expired tokens.
6. **Resource Usage** — Current memory, CPU, and network usage. Flag anything abnormal.

Output a health report with pass/warn/fail for each category and specific remediation steps.
</instructions>`,
      codex: `PLACEHOLDER: Codex to write system audit prompt via mailbox M0004`,
    },
  },
  {
    id: 'deep-research',
    label: 'Deep Research',
    icon: '📚',
    category: 'research',
    description: 'Research a topic in depth with web search and analysis',
    usesCwd: true,
    prompts: {
      claude: `<context>
Working directory: {{cwd}}
Research the primary topic of this project by examining the codebase, README, and recent git history.
</context>

<instructions>
Conduct deep research relevant to this project:

1. **Identify the topic** — Read the README, package.json/pyproject.toml, and recent commits to understand what this project does.
2. **Research current state of the art** — Search the web for the latest developments, best practices, and competing approaches in this domain.
3. **Find relevant libraries and tools** — Identify packages, frameworks, or services that could improve the project.
4. **Analyze gaps** — Compare the project's current approach against industry best practices. What's missing?
5. **Compile findings** — Write a structured research brief with citations and links.

Output the research as a markdown document with sections, links, and actionable recommendations.
</instructions>`,
      codex: `PLACEHOLDER: Codex to write deep research prompt via mailbox M0004`,
    },
  },
  {
    id: 'run-tests',
    label: 'Run Tests',
    icon: '🧪',
    category: 'dev',
    description: 'Discover and run the test suite, report results',
    usesCwd: true,
    prompts: {
      claude: `<context>
Working directory: {{cwd}}
</context>

<instructions>
Find and run the project's test suite:

1. **Discover** — Identify the test framework (jest, pytest, vitest, mocha, cargo test, go test, etc.) by reading package.json, pyproject.toml, Makefile, or CI config.
2. **Run** — Execute the test suite with verbose output.
3. **Analyze** — If there are failures, read the failing test and the code under test. Diagnose root causes.
4. **Fix** — For each failing test, determine if it's a test bug or a code bug and fix accordingly.
5. **Report** — Summarize: total tests, passed, failed, skipped. List any fixes applied.

If no test suite exists, say so and suggest what should be tested first.
</instructions>`,
      codex: `PLACEHOLDER: Codex to write test runner prompt via mailbox M0004`,
    },
  },
  {
    id: 'refactor',
    label: 'Refactor',
    icon: '♻️',
    category: 'dev',
    description: 'Identify and execute safe refactoring opportunities',
    usesCwd: true,
    prompts: {
      claude: `<context>
Working directory: {{cwd}}
</context>

<instructions>
Identify and execute safe refactoring opportunities in this project:

1. **Scan** — Read the main source files and identify: duplicated code, overly long functions, poor naming, inconsistent patterns, dead code.
2. **Prioritize** — Rank opportunities by impact and safety. Prefer changes that reduce complexity without changing behavior.
3. **Execute** — Apply the top 3-5 safest, highest-impact refactors. Each refactor should be a small, reviewable change.
4. **Verify** — Run tests after each change (if tests exist) to confirm nothing broke.
5. **Report** — List what you changed and why, with before/after comparisons.

Do NOT change public APIs, add new features, or modify behavior. Pure structural improvements only.
</instructions>`,
      codex: `PLACEHOLDER: Codex to write refactor prompt via mailbox M0004`,
    },
  },
  {
    id: 'doc-gen',
    label: 'Document',
    icon: '📝',
    category: 'dev',
    description: 'Generate or update project documentation',
    usesCwd: true,
    prompts: {
      claude: `<context>
Working directory: {{cwd}}
</context>

<instructions>
Review and improve this project's documentation:

1. **Inventory** — List all existing docs (README, inline comments, API docs, changelogs, guides).
2. **Gap analysis** — What's missing? What's outdated? What's confusing?
3. **README** — If the README is missing or sparse, write a comprehensive one covering: what the project does, setup instructions, usage examples, architecture overview.
4. **Code comments** — Add JSDoc/docstrings to public functions and complex logic that lacks explanation.
5. **Architecture** — If the project has multiple components, create a brief architecture doc explaining how they connect.

Only add documentation where genuinely needed. Don't over-document simple code.
</instructions>`,
      codex: `PLACEHOLDER: Codex to write doc-gen prompt via mailbox M0004`,
    },
  },
];

/** Build the full CLI command for a given action + agent */
export function buildCommand(action: ActionDef, agent: AgentCLI, cwd: string): string {
  let prompt = action.prompts[agent];
  if (action.usesCwd) {
    prompt = prompt.replace(/\{\{cwd\}\}/g, cwd);
  }
  // Escape single quotes in the prompt for shell safety
  const escaped = prompt.replace(/'/g, "'\\''");
  return CLI_COMMANDS[agent]
    .replace('{{cwd}}', cwd)
    .replace('{{prompt}}', escaped);
}
