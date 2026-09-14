# Startup Office — Design Spec

Date: 2026-09-14
Status: approved by owner, implementation in progress

## 1. The idea

Startup Office is a desktop game on macOS that shows a startup as a MapleStory-style
pixel office. The office is one side-scrolling map divided into rooms, one per
department. In each room stand pixel figures, one per job. Every figure is a real
Claude Code agent with its own role prompt. The player is the CEO: a controllable
avatar who walks the office, talks to figures, gives tasks, and watches work flow.

Pasting a GitHub repo URL in the navbar loads a "new world": the app clones the repo,
and every figure reads the slice of it that matches its job and reports back.

## 2. Decisions (locked)

| # | Decision | Choice |
|---|---|---|
| 1 | Agent engine | Real `claude` CLI sessions (`claude -p`), one per figure run |
| 2 | App shell | Electron + React + TypeScript + Vite |
| 3 | Game engine | Phaser 3 inside the Electron renderer |
| 4 | Camera | Side-scrolling map, camera follows the CEO avatar |
| 5 | Task input | NPC dialog (walk up + key) **and** HUD chat box |
| 6 | Sprites | Original / CC0 pixel art in MapleStory style, no ripped assets |
| 7 | Persistence | JSON files in Electron `userData`, no database |
| 8 | Repo | `startup-office` on GitHub, public |
| 9 | Delivery | One task per branch per PR, tasks done in order |

## 3. Departments and default figures

| Department | Figures (job = agent role) |
|---|---|
| R&D | Frontend dev, Backend dev, UI/UX designer, QA engineer, DevOps |
| Product | Product manager, Data analyst |
| Marketing | Content marketer, Growth marketer, Designer |
| Sales | Sales rep, Customer success |
| Finance | Accountant, Fundraising lead |
| Ops / HR | Office manager, Recruiter |
| Meeting room | No permanent figure. Holds the sprint board |

Figures can be added at runtime to any department with a job title, sprite, and role
prompt.

## 4. Architecture

```
┌──────────────────────────────── Electron ────────────────────────────────┐
│  Main process (Node)                                                      │
│   ├─ RepoService      clone / pull repo into userData/repos/<name>        │
│   ├─ AgentRunner      spawn `claude -p` per figure, stream stdout as IPC   │
│   ├─ StateStore       figures.json, sprints.json, world.json              │
│   └─ IPC bridge       typed channels, exposed via preload contextBridge   │
│                                                                           │
│  Renderer (React + Phaser)                                                │
│   ├─ <Navbar>         repo URL paste, add figure, settings                │
│   ├─ <GameCanvas>     Phaser scene: tilemap, rooms, figures, CEO, camera  │
│   ├─ <HUD>            bottom bar: company stats, quest log, chat, minimap  │
│   ├─ <DialogBox>      MapleStory-style NPC dialog                         │
│   └─ <AgentPanel>     full log for a figure, re-run, edit role prompt     │
└───────────────────────────────────────────────────────────────────────────┘
```

Phaser and React share one event bus (`EventEmitter` in the renderer). Phaser emits
`figure:clicked`, `ceo:nearFigure`; React emits `figure:setState`, `figure:walkTo`.
Game state lives in a Zustand store; Phaser reads it, never owns it.

## 5. Data model

```ts
type Department = 'rnd' | 'product' | 'marketing' | 'sales' | 'finance' | 'ops';

interface Figure {
  id: string;
  name: string;          // "Maya"
  job: string;           // "Frontend dev"
  department: Department;
  sprite: string;        // sprite key
  rolePrompt: string;    // system-style instructions for the agent
  level: number;
  xp: number;
  state: 'idle' | 'walking' | 'working' | 'done' | 'error' | 'meeting';
  deskX: number; deskY: number;
}

interface Task {                 // a quest
  id: string;
  title: string;
  description: string;
  assigneeIds: string[];
  status: 'backlog' | 'active' | 'review' | 'done' | 'failed';
  sprintId: string | null;
  runs: AgentRun[];
}

interface AgentRun {
  id: string;
  figureId: string;
  taskId: string | null;   // null = repo intake run
  startedAt: string;
  endedAt: string | null;
  exitCode: number | null;
  output: string;          // full streamed text
}

interface Sprint { id: string; name: string; goal: string; taskIds: string[]; status: 'planning' | 'active' | 'closed' }

interface World { repoUrl: string | null; repoPath: string | null; companyName: string; money: number; hp: number }
```

## 6. Agent runner

- Command: `claude -p "<prompt>" --output-format stream-json` with `cwd` = repo path.
- Prompt = figure `rolePrompt` + task description (or the intake prompt on repo load).
- Intake prompt: "You are the {job}. Explore this repo from your role's point of view.
  Report: what you own, current state, top 3 risks, top 3 next steps. Under 200 words."
- Each stdout chunk is forwarded over IPC as `agent:chunk {runId, text}`; the figure's
  desk screen and the AgentPanel render it live.
- Exit code 0 → figure `done`, task → `review`, +XP. Non-zero → `error`, task → `failed`.
- Never run more than N concurrent agents (default 3). Others queue.
- All agent output is treated as data. It is displayed, never executed.

## 7. Game layer (Phaser)

| Element | Behavior |
|---|---|
| Map | One wide tilemap, rooms as zones with their own tileset and tint, parallax skyline through windows |
| CEO avatar | WASD / arrows, 4-direction walk cycle, camera follows with lerp |
| Figures | Sit at desk (idle bounce), typing animation while `working`, walk with pathfinding to meeting room when a sprint starts |
| Interaction | Standing next to a figure shows a "talk" prompt; Enter opens DialogBox |
| Bubbles | Last line of agent output shown as a speech bubble over the figure |
| Juice | Level-up burst, floating red numbers on `failed`, confetti on sprint close |
| Sound | Chiptune loop per room, keyboard clatter scaled to active agents, level-up sting |
| Minimap | Rooms + figure dots + CEO position, in the HUD |

## 8. Error handling

| Case | Behavior |
|---|---|
| `claude` CLI not found | Blocking banner with install link, agents disabled |
| Clone fails | Navbar shows error toast with git stderr, world unchanged |
| Agent exit ≠ 0 | Figure `error`, red bubble, full stderr in AgentPanel, retry button |
| Concurrency cap hit | Task shows "queued", figure walks to desk and waits |
| Corrupt JSON state | Backup file renamed `.bak`, fresh defaults loaded, warning shown |

## 9. Testing

- Main process: unit tests with Vitest for RepoService, AgentRunner (mocked child
  process), StateStore.
- Renderer: Vitest + Testing Library for HUD, DialogBox, AgentPanel.
- Phaser scene: smoke test that the scene boots headless and spawns N figures.
- Manual: paste a repo, watch intake run, give a task, see it move to done.

## 10. Build plan

One task = one branch = one PR, in order.

| # | Task | Deliverable |
|---|---|---|
| 0 | Spec + repo | This file, README, GitHub repo |
| 1 | Electron scaffold | Window opens, React + Vite + TS, navbar shell, Phaser boots an empty scene |
| 2 | Office map | Tilemap with all rooms, parallax, camera, CEO avatar walks |
| 3 | Figures | Default figures at desks, idle animation, name tag, click emits event |
| 4 | Add figure | "+" in navbar: department, job, sprite, role prompt |
| 5 | Repo intake | Paste URL, clone, status in navbar |
| 6 | Agent runner | `claude -p` per figure, streamed to AgentPanel, intake run on repo load |
| 7 | Figure states | idle / working / done / error animations, speech bubbles, desk screens |
| 8 | NPC dialog + HUD chat | Talk to a figure, give a task, task routes to the assignee |
| 9 | Meeting room + sprints | Sprint board, figures walk to planning, confetti on close |
| 10 | XP + juice | Levels, level-up burst, failed numbers, sounds |
| 11 | Persistence | Figures, tasks, sprints, world survive restart |
| 12 | Polish + README | Screenshots, GIF, packaging with electron-builder |
