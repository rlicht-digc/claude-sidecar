# Claude Sidecar Mailbox Protocol

## Purpose
Async coordination between Claude (interactive terminal) and Codex (autonomous agent) for building the Claude Sidecar app.

## Rules
1. Messages are append-only in `queue/`, named `M<####>_<agent>_<slug>.md`
2. Increment `.seq` `message_seq` by 1 for each new message
3. Always use full 40-char git SHAs in frontmatter
4. Messages must include: what changed, exact file paths, reproduce commands
5. Codex gets imperative/action-biased prompts; Claude gets context-first XML

## Message Format
- YAML frontmatter: message_id, from, to, type, timestamp_utc, references, repo_state
- Body: Summary, Details, Reproduce, Reply Requested

## Project
- Repo: local at `/Users/russelllicht/claude-sidecar/` (not yet on GitHub)
- Stack: Node.js/TypeScript server (Express+WS), React/Vite client, Framer Motion, Zustand
- Server port: 3577, Client port: 3578
