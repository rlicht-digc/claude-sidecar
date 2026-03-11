# Claude Sidecar

**Real-time visual companion for Claude Code terminal sessions.**

Watch your codebase come alive as Claude Code reads, writes, and navigates through your files. Claude Sidecar is a local web app that attaches to your terminal workflow and provides an animated, visual representation of every operation — like watching yourself drag and drop files in a Finder window, but driven by AI.

## What It Does

- **Live file tree** — See your project structure with files lighting up in real time as they're read (blue), edited (yellow), created (green), or deleted (red)
- **Activity stream** — Scrolling log of every operation with icons, descriptions, and timestamps
- **Auto-expand** — Directories automatically open to reveal files being worked on
- **File system watching** — Picks up changes even outside of Claude Code via `chokidar`
- **Claude Code hooks integration** — Receives events directly from Claude Code's tool calls

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────────┐
│  Claude Code     │ ──────────────────▶│  Sidecar App         │
│  (terminal)      │   events:          │  (browser window)    │
│                  │   file:read        │                      │
│  hooks emit ─────│   file:write       │  ┌────────────────┐  │
│  events on every │   file:edit        │  │ Animated file   │  │
│  tool call       │   bash:command     │  │ tree + activity │  │
│                  │   search:glob      │  │ stream          │  │
└─────────────────┘                     │  └────────────────┘  │
                                        └──────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js, Express, WebSocket (`ws`), `chokidar` |
| Client | React 18, TypeScript, Vite |
| State | Zustand |
| Animations | Framer Motion |
| Icons | react-icons (VS Code icon set + dev icons) |

## Quick Start

### 1. Install dependencies

```bash
cd claude-sidecar
npm install
```

### 2. Start the app

```bash
npm run dev
```

This starts both the server (port 3577) and the client (port 3578). Open **http://localhost:3578** in your browser.

### 3. Scan a project

Enter a directory path in the UI (e.g., `/Users/you/my-project`) and click **Scan**. The file tree appears and the app starts watching for changes.

### 4. (Optional) Connect Claude Code hooks

For the full experience — seeing every tool call in real time — set up Claude Code hooks:

```bash
npm run setup-hooks
```

Then add to your `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "",
        "command": "/path/to/claude-sidecar/scripts/claude-hook.sh"
      }
    ]
  }
}
```

Now every time Claude Code reads a file, runs a command, or edits code, the sidecar lights up.

## How It Works

1. **Claude Code Hooks** — Claude Code's hook system fires a shell command after every tool use. Our hook script parses the event and sends it to the sidecar server via HTTP POST.

2. **WebSocket Server** — The Node.js server receives hook events and file system change events, then broadcasts them to all connected browser clients in real time.

3. **React UI** — The browser client renders an animated file tree and activity stream. Files glow and pulse when touched, directories auto-expand, and every operation gets logged with icons and color coding.

4. **File Watcher** — `chokidar` monitors the project directory for any file system changes, catching edits that happen outside of Claude Code hooks.

## Event Types

| Event | Color | Description |
|-------|-------|-------------|
| `tool:read` | Blue | Claude Code reading a file |
| `tool:write` | Green | Creating a new file |
| `tool:edit` | Yellow | Editing an existing file |
| `tool:bash` | Purple | Running a shell command |
| `tool:glob` | Blue | Searching for files by pattern |
| `tool:grep` | Blue | Searching file contents |
| `fs:create` | Green | File created (detected by watcher) |
| `fs:change` | Yellow | File modified (detected by watcher) |
| `fs:delete` | Red | File deleted (detected by watcher) |

## Development

```bash
# Run in development mode (hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## License

MIT
