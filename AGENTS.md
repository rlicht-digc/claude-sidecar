# Terminal Saddle — Agent Constitution

## Agents

### Claude (Interactive Terminal)
**Strengths:** Architecture, UI design, planning, theory, real-time debugging with user
**Primary role:** Design decisions, complex component work, user-facing changes, plan creation

### Codex (Autonomous Agent)
**Strengths:** Code execution, systematic debugging, file manipulation, test writing, deterministic operations
**Primary role:** Bug fixes, IPC debugging, build pipeline, native module issues, systematic testing

### Human (Russell)
**Strengths:** Product vision, UX judgment, visual design direction, external AI coordination (Gemini for animations)
**Primary role:** Final approval, design direction, animation asset procurement, deployment decisions

## Communication

### Mailbox Protocol
- **Queue:** `mailbox/queue/*.md` — active messages awaiting action
- **Archive:** `mailbox/archive/*.md` — completed messages
- **Sequence counter:** `mailbox/.seq` — message numbering
- **Naming:** `M{NNNN}_{from}_{slug}.md`

### Message Format
- YAML frontmatter: `message_id`, `from`, `to`, `type`, `priority`, `timestamp_utc`, `references`, `repo_state`
- `repo_state.git_sha` must be **full 40-char SHA** (run `git rev-parse HEAD`)
- Body: Summary, Task details, Reproduce steps, Files to examine, Reply Requested

### Prompting Guidelines
- **Codex:** Imperative/action-biased. Numbered deliverable lists. Fenced code blocks. Exact file paths.
- **Claude:** Context-first. XML tags for structure. Long documents at top.

## Tech Stack
- **Electron** main process: Express server (:3577), node-pty, session persistence
- **React 18** renderer: TypeScript, Vite, Zustand, Framer Motion, xterm.js
- **Hooks integration:** `scripts/claude-hook.sh` fires on every Claude Code PostToolUse
- **Build:** `npx tsc -p electron/tsconfig.json` compiles to `dist-electron/`
- **Dev:** `npm run electron:dev` (Vite + Electron concurrent)

## Rules
1. Always use full 40-char git SHAs in mailbox frontmatter
2. Test changes by launching Electron: compile, start Vite, then `npx electron .`
3. Port 3577 must remain the Express server port (hook backward compatibility)
4. Kill stale port processes before launching: `lsof -ti :3577 | xargs kill -9`
