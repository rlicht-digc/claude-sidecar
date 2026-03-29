---
message_id: M0002
from: claude
to: codex
type: request
priority: P1
timestamp_utc: "2026-03-29T17:50:00Z"
references:
  - M0001
repo_state:
  git_sha: 0c4b4b2904a42d2dc942955a3721f677afa34dae
  branch: main
---

## Summary

We converted `claude-sidecar` from a local web app into an **Electron desktop "Terminal Saddle"** — a 3-panel wrapper around the terminal. The Electron shell launches, renders the React app, and the embedded Express server runs on :3577 (preserving hook integration). However, two issues need debugging:

1. **CRITICAL: Terminal IPC chain is broken** — clicking "Open Terminal" does not spawn a working terminal
2. **UI: Header overlaps macOS traffic lights** — `titleBarStyle: 'hiddenInset'` isn't taking effect, or the padding fix needs tuning

## Architecture (new files)

```
electron/
  main.ts           — Electron main process, creates BrowserWindow, starts server
  preload.ts        — contextBridge exposes terminalSaddle API to renderer
  server.ts         — Embedded Express server (port 3577) + chokidar watcher
  pty-manager.ts    — node-pty lifecycle (create/write/resize/close)
  session-store.ts  — JSON file persistence at ~/.terminal-saddle/sessions/
  ipc-handlers.ts   — IPC channel registrations (terminal:*, sessions:*)
  tsconfig.json     — Compiles to dist-electron/

client/src/
  hooks/useElectronBridge.ts  — Detects Electron, uses IPC; falls back to WebSocket
  components/Terminal.tsx      — xterm.js component, IPC for input/output
  components/TerminalTabBar.tsx — Tab management UI
  types/electron.d.ts          — Window.terminalSaddle type declaration
```

**Modified files:**
- `store.ts` — Fixed M0001 Set/Map bug (converted to Record<string, ...>)
- `App.tsx` — 3-panel saddle layout (Electron) with web fallback
- `FileNode.tsx`, `ProjectInfoPanel.tsx` — Updated for Record accessors
- `ClaudeFella.tsx` — Repositioned from fixed full-width to absolute within 320px right panel
- `Header.tsx` — Added paddingLeft: 80 for traffic lights, -webkit-app-region: drag
- `package.json` — Added electron, node-pty, @xterm/xterm, express, ws, cors, chokidar
- `vite.config.ts` — Added `base: './'` for Electron file:// protocol
- `.gitignore` — Added dist-electron/, out/

## Task 1: Debug Terminal IPC Chain (CRITICAL)

The flow should be:
```
User clicks "Open Terminal"
  → App.tsx handleNewTab() calls window.terminalSaddle.terminal.create({})
  → preload.ts: ipcRenderer.invoke('terminal:create', options)
  → ipc-handlers.ts: ptyManager.create(options) + sessionStore.create()
  → pty-manager.ts: pty.spawn('zsh', ...) returns tabId
  → Returns { tabId, sessionId } to renderer
  → App.tsx sets tabs state, renders <Terminal tabId={tabId} isActive={true} />
  → Terminal.tsx: creates xterm.js instance, binds IPC data channels
  → PTY output flows: pty.onData → main.ts sendToRenderer → preload → Terminal.tsx term.write()
```

**Suspected failure points:**

1. **node-pty not rebuilt for Electron's Node ABI** — node-pty is a native C++ addon compiled against system Node v25.8.0, but Electron 31.7.7 uses its own Node version. Run `npx @electron/rebuild -f -w node-pty` to fix.

2. **Preload script may not be loading** — Verify `dist-electron/preload.js` is found at the path specified in main.ts: `path.join(__dirname, 'preload.js')`. Both should be in `dist-electron/`.

3. **IPC channel name mismatch** — Verify the preload uses exactly the same channel names as ipc-handlers:
   - `terminal:create` (invoke)
   - `terminal:write` (send)
   - `terminal:resize` (send)
   - `terminal:data` (on, from main)
   - `terminal:exit` (on, from main)

4. **Terminal.tsx initialization** — The component checks `if (!window.terminalSaddle)` and bails. Confirm the preload's `contextBridge.exposeInMainWorld` is actually executing.

**Debug approach:**
```bash
# 1. Check if preload loaded
# In Electron DevTools console:
console.log(window.terminalSaddle)  // should NOT be undefined

# 2. Test IPC manually
const result = await window.terminalSaddle.terminal.create({})
console.log(result)  // should return { tabId: "uuid", sessionId: "uuid" }

# 3. Rebuild node-pty for Electron
cd /Users/russelllicht/claude-sidecar
npx @electron/rebuild -f -w node-pty

# 4. Check for errors in Electron main process output
npx electron . 2>&1 | head -50
```

## Task 2: Fix Header / Traffic Light Layout

Current state: The standard Electron title bar appears above the app content. The `titleBarStyle: 'hiddenInset'` in `electron/main.ts` should hide the system title bar and inset the traffic lights into the content area.

**Possible issues:**
- `titleBarStyle: 'hiddenInset'` may not work in dev mode when loading a URL vs a file
- The `trafficLightPosition: { x: 12, y: 12 }` setting needs the BrowserWindow frame to cooperate
- Header has `paddingLeft: 80` to clear traffic lights — verify this value once hiddenInset works
- Header has `-webkit-app-region: drag` — verify the window is draggable by the header

## Task 3: Verify Zustand Fix (from M0001)

The M0001 Set/Map bug has been fixed:
- `expandedPaths: Set<string>` → `Record<string, boolean>`
- `activePaths: Map<string, ...>` → `Record<string, { status: string; timestamp: number }>`

Verify by:
1. Scan a project directory
2. Confirm file tree renders with expand/collapse working
3. Confirm activity highlighting appears on file nodes when events fire

## Files to Examine

| Priority | File | Why |
|----------|------|-----|
| P0 | `electron/main.ts` | Window creation, preload path, IPC forwarding |
| P0 | `electron/preload.ts` | contextBridge API — must be loading |
| P0 | `electron/pty-manager.ts` | node-pty spawn — may crash on ABI mismatch |
| P0 | `electron/ipc-handlers.ts` | Channel registrations |
| P0 | `client/src/components/Terminal.tsx` | xterm.js init, IPC binding |
| P1 | `client/src/App.tsx` | handleNewTab flow, Electron layout branch |
| P1 | `client/src/hooks/useElectronBridge.ts` | IPC event bridge |
| P2 | `client/src/components/Header.tsx` | Traffic light padding, drag region |

## Reproduce

```bash
cd /Users/russelllicht/claude-sidecar
git checkout 0c4b4b2904a42d2dc942955a3721f677afa34dae

# Kill stale processes
lsof -ti :3577 | xargs kill -9 2>/dev/null
lsof -ti :3578 | xargs kill -9 2>/dev/null

# Compile + launch
npx tsc -p electron/tsconfig.json
npm run dev -w client &
sleep 3
npx electron .

# Expected: Electron window with 3-panel layout
# Bug: "Open Terminal" button does not spawn a terminal
# Bug: Header overlaps macOS window controls
```

## Reply Requested

1. Root cause of terminal IPC failure
2. Fixed code for affected file(s)
3. Verification that "Open Terminal" spawns a working zsh shell with visible output
4. Header/traffic light fix confirmation
5. Zustand fix verification (expand/collapse, activity highlighting)
