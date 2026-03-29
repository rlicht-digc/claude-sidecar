# Animation Design Brief — Terminal Saddle Right Panel

## What This Is For

I'm building **Terminal Saddle**, an Electron desktop app that wraps around AI-powered terminal sessions (Claude Code, Codex). It has a 3-panel layout:

- **Left**: Session catalog (list of active/past terminal sessions)
- **Center**: Real embedded terminal (xterm.js)
- **Right**: Animation window (top) + Action buttons (bottom)

I need you to design the **right panel's animation window** — the visual area that shows animated agent characters working in real-time as AI processes run in the terminal.

## The Concept

Think of it as **watching employees work on a factory floor from the boss's office window.** When Claude Code is reading files, you see the agent character scanning/reading. When it's writing code, you see it typing/building. When it spawns a sub-agent, you see a smaller agent split off and start working alongside.

It should be **informative** (you can tell what's happening at a glance) and **aesthetically premium** (dark glassmorphic UI, not cartoon-y or toy-like).

## Design Inspiration

The aesthetic should match these references:
- **Stitch by Design** — dark UI with glassmorphic panels, gradient mesh backgrounds (teal/purple/black), floating elements, clean minimal layout
- **Dashboard UI** — dark panels with blue/cyan accent glows, data visualization elements, central AI avatar
- **Character style** — friendly but professional robot/AI avatar. Think compact, geometric, with inner glow. NOT cute/kawaii, more like a sleek desk lamp or WALL-E-meets-design-tool

## Color Palette (must match the app)

| Role | Color | Hex |
|------|-------|-----|
| Background | Near-black | `#0d1117` |
| Surface | Dark panel | `#161b22` |
| Border | Subtle | `#21262d` |
| Primary text | Light | `#e6edf3` |
| Muted text | Gray | `#7d8590` |
| Read/scan | Blue | `#58a6ff` |
| Write/create | Green | `#3fb950` |
| Edit/modify | Orange/yellow | `#d29922` |
| Delete/error | Red | `#f85149` |
| Search | Purple | `#bc8cff` |
| Command/think | Purple | `#bc8cff` |
| Claude accent | Warm orange | `#da7756` |
| Codex accent | Blue | `#58a6ff` |
| Active/success | Green | `#39d353` |

## Canvas Specifications

- **Width**: 320px (the right panel width, resizable 200-500px)
- **Height**: ~50% of window height (~350-450px)
- **Background**: Transparent (the app provides `#0d1117`)
- **Frame rate**: 30fps for Lottie, 60fps for CSS/SVG
- **Format preference**: Lottie JSON, or SVG animation frames, or a design system I can implement in React + Framer Motion

## What I Need Designed

### 1. Main Agent Character

A central AI agent figure that represents the primary AI working in the terminal.

- **Size**: ~100-120px tall, centered in the canvas
- **Style**: Geometric/abstract, with a glowing core. Think a hovering orb with a face-plate/visor, or a minimal humanoid silhouette with light effects
- **NOT**: Full human character, anime, or overly detailed. Clean and iconic.
- **Must have**: A distinct "face" area (visor/eyes) that conveys state, a body that can animate posture changes

### 2. Animation States (8 states the agent cycles through)

The app sends real-time events from the terminal. The animation transitions between these states:

| State | Duration | Loop | What's Happening | Visual Direction |
|-------|----------|------|------------------|-----------------|
| **idle** | 4s | yes | No activity for 5+ seconds | Gentle float/breathe, subtle glow pulse, relaxed posture |
| **reading** | 2s | yes | AI is reading files | Eyes/visor scanning motion, data streams flowing IN toward agent, blue particles |
| **writing** | 2s | yes | AI is creating files | Hands/appendages moving outward, green particles EMITTING, shapes forming below |
| **editing** | 1.5s | yes | AI is modifying code | Yellow sparks around a document shape, tool-wielding motion, focused posture |
| **searching** | 2s | yes | AI is scanning codebase | Expanding radar/sonar rings from the agent, magnifying glass sweep, purple tint |
| **thinking** | 3s | yes | Running a command, waiting | Internal glow intensifies, gear/circuit patterns visible inside, concentration |
| **spawning** | 1.5s | once→hold | Launching a sub-agent | Agent expands briefly, a smaller orb separates and takes orbital position |
| **completing** | 2s | once→idle | Burst of activity ending | Particles settle, glow dims smoothly, satisfied/relaxed posture shift |

### 3. Sub-Agent Indicators

When the main agent spawns sub-agents, smaller satellite orbs appear:

- **Size**: ~30-40px each
- **Position**: Orbit around the main agent at ~80px radius
- **Animation**: Gentle orbital drift + their own glow pulse
- **Color**: Matches what they're doing (blue for reading, green for writing, etc.)
- **Count**: Support 1-5 simultaneous sub-agents
- **Appear**: Fly out from main agent with a brief expansion animation
- **Disappear**: Shrink and fade when task completes

### 4. Background Environment

The animation area shouldn't be flat — it needs a subtle environment:

- **Gradient mesh**: Very subtle teal/purple/dark gradient in the background (like the Stitch reference)
- **Particle field**: Faint floating particles that react to agent activity (more particles = more activity, drift toward agent when reading, away when writing)
- **Grid lines**: Ultra-subtle perspective grid on the "floor" beneath the agent (like a workstation surface)
- **Glow effects**: Ambient light from the agent illuminates nearby particles/grid

### 5. State Transition Animations

- Transitions between states should take ~300-400ms
- Crossfade the body pose while the particle/glow effects transition
- The agent should never "jump" — all movement is smooth
- Reading→Writing should feel like the agent shifts from intake to output
- Any state→Idle should feel like winding down

### 6. Status Label Area

Below or overlaid on the animation, there should be a text label area:

- Current state name: "Reading files..." / "Thinking..." / "Spawning agent..."
- Subtle, not dominant — maybe 10px font, `#7d8590` color
- Could be integrated into the animation (like a floating HUD element near the agent)

## What I DON'T Need

- Sound design (already handled)
- The action buttons below the animation (already built)
- The left sidebar or terminal — just the right panel animation area
- Full production code — I need the design/assets, I'll integrate them

## Deliverables I'm Looking For

1. **Character design** — The main agent in all 8 states (can be keyframes or a sprite sheet)
2. **Sub-agent design** — The smaller orbital agents
3. **Background treatment** — The gradient mesh / particle field / grid
4. **Animation spec** — Timing, easing, transition rules
5. **Color-coded states** — Each state should have a dominant accent color from the palette above
6. **Either**: Lottie JSON files, SVG animation sequences, or a detailed design spec I can implement in React + Framer Motion + CSS

## Current Fallback

I currently have a hand-drawn SVG character ("ClaudeFella" — a walking anime-style character) that serves as a placeholder. It works but doesn't match the premium dark UI aesthetic. I want to replace it with something that feels native to the Stitch/dashboard design language.

## Technical Integration

The animation will be driven by a state machine in TypeScript:
```typescript
type AnimationState = 'idle' | 'reading' | 'writing' | 'editing' | 'searching' | 'thinking' | 'spawning' | 'completing';

// Events from the terminal drive state transitions
// e.g., tool:read → 'reading', tool:bash → 'thinking', tool:agent → 'spawning'
```

I have a React component ready to consume Lottie JSON or render custom SVG/CSS animations. The container is a `<div>` with transparent background at 320px wide × ~400px tall.
