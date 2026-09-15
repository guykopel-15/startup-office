# Startup Office — Design Spec

Date: 2026-09-14
Status: approved by owner, implementation in progress

## 1. The idea

Startup Office is a desktop game on macOS that shows a startup as a MapleStory-style
pixel office shown whole on one page: an isometric floor plan, one room per department
around a lobby corridor. In each room sit pixel figures, one per job. Every figure is a real Claude Code agent
with its own role prompt. The player is the CEO and is not a figure: the CEO watches
the office from above, clicks figures to talk, gives tasks, and watches work flow.

Every repository is a **floor**: a side panel lists floors as tabs, like workspaces in a terminal
multiplexer. A new floor takes a GitHub URL (cloned into the app data folder) or a local folder,
then hires a default team one figure at a time behind a progress bar. Each floor owns its figures
and repo status; the office shows the active floor. From the agent runner on, every figure reads
the slice of the repo that matches its job and reports back.

## 2. Decisions (locked)

| # | Decision | Choice |
|---|---|---|
| 1 | Agent engine | Real `claude` CLI sessions (`claude -p`), one per figure run |
| 2 | App shell | Electron + React + TypeScript + Vite |
| 3 | Game engine | Phaser 3 inside the Electron renderer |
| 4 | Camera | Whole office on one page, isometric floor plan; camera fits the office to the window, wheel zooms toward the pointer up to 4× fit, left-drag pans, both clamped so the office never leaves view (changed 14 Sep after task 2 review) |
| 5 | Task input | Click a figure for NPC dialog **and** HUD chat box |
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

Figures can be added at runtime to any department that has a free desk, with a name, job,
look (hair style, accessory, colors) and role prompt. Each department layout carries one or
two spare desks; a full department is disabled in the dialog.

## 4. Architecture

```
┌──────────────────────────────── Electron ────────────────────────────────┐
│  Main process (Node)                                                      │
│   ├─ RepoService      shallow clone/pull into repos/<owner>__<name>      │
│   ├─ AgentRunner      spawn `claude -p` per figure, stream stdout as IPC   │
│   ├─ StateStore       figures.json, sprints.json, world.json              │
│   └─ IPC bridge       typed channels, exposed via preload contextBridge   │
│                                                                           │
│  Renderer (React + Phaser)                                                │
│   ├─ <FloorsPanel>    tabs per floor, New floor dialog with progress       │
│   ├─ <Navbar>         Add figure dialog, active floor repo chip           │
│   ├─ <GameCanvas>     Phaser scene: rooms, furniture, figures, camera     │
│   ├─ <HUD>            bottom bar: quest counts, chat history, chat box     │
│   ├─ <DialogBox>      NPC dialog: portrait, typed greeting, 3 choices     │
│   └─ <AgentPanel>     full log for a figure, re-run, edit role prompt     │
└───────────────────────────────────────────────────────────────────────────┘
```

Phaser and React share one event bus (`EventEmitter` in the renderer). Phaser emits
`figure:clicked`; React emits no state events. Phaser mirrors figure state and run output from `floorsStore` / `runsStore`.
Game state lives in a Zustand store (`store/floorsStore.ts`: floors, active floor, figures per
floor); Phaser subscribes, mirrors the active floor's figures, and never owns the state.

## 5. Data model

```ts
enum RoomKey { Lobby, ResearchAndDevelopment, Product, MeetingRoom, Marketing, Sales, Finance, Operations }
enum FigureState { Idle, Working, Done, Error, Meeting }

/** Everything that decides how a figure is drawn; composed from one pixel template. */
interface FigureLook {
  hairStyle: HairStyle;      // short | long | spiky | bun | cap
  hairColor: string; skinColor: string; topColor: string; pantsColor: string; hatColor: string;
  accessory: Accessory;      // none | glasses | headphones | tie | beard
  accessoryColor: string;
}

interface Figure {
  id: string;
  name: string;          // "Maya"
  job: string;           // "Frontend dev"
  room: RoomKey;
  deskIndex: number;     // which desk in the room, in layout order
  look: FigureLook;
  rolePrompt: string;    // system-style instructions for the agent
  state: FigureState;
  level: number;
  experiencePoints: number;
}

interface Task {                 // a quest (src/shared/tasks.ts)
  id: string;
  floorId: string;
  title: string;                 // the CEO's ask, mention stripped
  assigneeId: string;
  status: 'backlog' | 'active' | 'review' | 'done' | 'failed';
  runId: string | null;          // the claude run doing the work
  createdAt: string;
}

interface ChatMessage { id: string; floorId: string; authorId: 'ceo' | figureId; text: string; createdAt: string }

interface AgentRun {             // src/shared/agents.ts; a quest points at its run via Task.runId
  id: string;
  floorId: string;
  figureId: string;
  prompt: string;
  mode: 'readOnly' | 'edit';
  status: 'queued' | 'running' | 'done' | 'error' | 'cancelled';
  lines: string[];               // streamed text and tool notes, bounded
  result: string | null;
  error: string | null;
  costUsd: number | null;
  turns: number | null;
  startedAt: string;
  endedAt: string | null;
}

interface Sprint {                // src/shared/sprints.ts
  id: string;
  floorId: string;
  goal: string;
  status: 'planning' | 'active' | 'closed';
  planRunId: string | null;      // the product manager's planning run
  taskIds: string[];
  createdAt: string;
  closedAt: string | null;
}

enum RepoState { Idle, Cloning, Ready, Error }

/** Live repo status pushed from main; World keeps the persisted subset. */
interface RepoStatus { state: RepoState; url: string | null; fullName: string | null; path: string | null; message: string | null }

type FloorSource = { kind: 'github'; url: string } | { kind: 'local'; path: string };
enum FloorSetupStep { PreparingRepo, CreatingFigures, Ready, Error }
interface FloorSetupProgress { step: FloorSetupStep; fraction: number; label: string; error: string | null }

/** One repository and its team. Replaces the earlier single World. */
interface Floor { id: string; name: string; source: FloorSource; repoStatus: RepoStatus; figures: Figure[]; setup: FloorSetupProgress }
```

## 6. Agent runner

- Command: `claude -p "<prompt>" --output-format stream-json --verbose --max-turns 25` with
  `cwd` = the floor's repo path. Read-only runs pass `--allowedTools Read Grep Glob`; edit runs
  (tasks, later) add Edit/Write with `--permission-mode acceptEdits`. No shell, prompts disabled.
- The binary is found through `STARTUP_OFFICE_CLAUDE`, then PATH, then the usual install
  locations; `claude --version` proves it works (`agent:check`).
- Prompt = figure `rolePrompt` + task description (or the intake prompt on floor ready).
- Intake prompt: role + "Explore this repository from your role's point of view. Report: what
  you own, its current state, the top 3 risks, and the top 3 next steps. Under 200 words."
- Stream lines are parsed in main (`claudeStream.ts`): assistant text and tool-use notes become
  `agent:event {type: chunk}`; the final result carries `result`, `is_error`, cost and turns.
- `AgentService` queues runs and executes at most 3 at once; `agent:start` answers with the run
  id at once, events follow; `agent:cancel` kills a running session or drops a queued one.
- Renderer: `runsStore` keeps runs and their tail of lines; run status mirrors onto the figure
  (`working`, `done`, `error`); the AgentPanel shows the latest run live and earlier runs.
- `tasksStore` keeps quests and chat per floor; a run's `done` event marks its quest done or failed
  and posts the figure's reply. Every run today is read-only; edit runs come later.
- All agent output is treated as data. It is displayed, never executed.

## 7. Game layer (Phaser)

| Element | Behavior |
|---|---|
| Map | One 640×360 world drawn procedurally: 48×34 tile isometric plan (2:1 tiles). Wall geometry, palette and furniture kits follow the owner's design handoff (`docs/design/handoff.md`); the room program stays the §3 departments on a rectangular plate. Far walls tall and opaque with windows, near edges low rims, interior walls 0.6 tile thick with door gaps, per-room floors (tile, orange, checker, corridor runner), wall decor (whiteboard, charts, sticky notes, posters). Exterior walls and rims are one Graphics each; every interior wall tile, furniture piece and figure is its own depth-sorted object |
| Furniture | Desk (monitor, keyboard, optional mug / lamp / paper), big desk, meeting table with laptop and chairs, bookshelf, server rack with LEDs, water cooler, sofa, filing cabinet, safe, kitchen counter, fridge, round table, stools, plants. Figures sit behind their desk so the desk top hides the legs |
| Camera | Fits the office on resize when the user had not zoomed; otherwise keeps their zoom and re-clamps. Wheel zoom toward the pointer, left-drag pan. `GameCanvas` watches its host with a ResizeObserver, so the HUD growing (chat history, sprint board) refits the office too, not only window resizes |
| Figures | Sit at desk with idle bob and random blink; hover scales the figure and expands the name tag to the job. State comes from the floors store: `working` cycles two typing frames (arms on the keyboard, drawn as an overlay that erases the resting arms) and animated dots above the tag; `done` shows a green tick badge, `error` a red cross; `idle` shows no badge. Walking to the meeting room arrives with task 11 |
| Interaction | Releasing the pointer on a figure without dragging emits `figure:clicked`, which opens the DialogBox on it; the agent panel opens from the box's Show your work, the Agents button or the panel's figure select |
| DialogBox | React overlay at the bottom of the stage: pixel portrait, name and job, the greeting typed one character at a time and frozen when the box opens (`dialogText.ts`: hello when idle, "I'm in the queue" when queued, "On it, boss. <last line>" while running, the summarized result when done, the error when failed, "I stopped that one." when cancelled; a click reveals it all, Escape closes, focus returns to the canvas), choices Give a task (inline input, Enter sends) / Show your work / Bye |
| HUD | Bottom bar in flow under the office so the camera fits the rest: quest counts (active / done / failed), chat history (collapsed to the last line, expandable), chat box. `routeTask` (`src/shared/tasks.ts`) picks the assignee: @name or @id mention (punctuation, multi-word and non-Latin names allowed; an unknown mention stays in the text), else the figure scoring most job words and known keywords (earlier figure on a tie), else `pm`, else the first figure |
| Movement | `navigation.ts` builds a walkable grid (walls and furniture block tiles, chairs and stools do not) and finds tile paths by breadth-first search; `FigureWalker` moves the feet along the path at a constant speed, cycles two leg frames and flips the sprite to face the way it goes. `FigureDirector` owns errands: every few seconds one idle figure walks to a random tile of its own room, waits, and comes back; a `meeting` state sends the figure to a spot around the meeting table (chairs first); work pulls it home. Typing only runs at the desk |
| Sprints | `useSprints`: Start sprint posts the goal, sets every figure to `meeting`, and starts the product manager's planning run (`buildPlanningPrompt`, read-only, `isPriority` so it jumps the intake queue; the prompt caps the skim at a few tool calls). While a floor's sprint is planning, run events do not change figure states, so nobody leaves the table early. When it ends, `parsePlan` reads the JSON (or "id: task" lines); each part becomes a quest through `giveTaskOnFloor`, the figure says "I'll take: …" (chat + bubble via `figure:says`), teammates without a part go idle. The sprint closes when every quest ended: summary in the chat and `sprint:closed` bursts confetti in the scene. The HUD's SprintBoard shows goal, status, progress bar and quests |
| Bubbles | The scene subscribes to `runsStore`; for each seated figure the latest run yields one line (`bubbleText.ts`): the last streamed line while running (tool notes read as "Reading src/x.ts"), the first non-empty result line when done, "Hmm, <error>" on error, "Stopped." when cancelled. Absolute paths shrink to their file name, markdown marks stripped, 56 chars max, pop-in on show. The bubble stays up while the figure works and fades 6 s after its last line once the run ends; a floor switch hides bubbles and only new lines pop. Bubbles sit in a UI depth band above every wall and figure |
| Juice | Level-up burst, floating red numbers on `failed`, confetti on sprint close |
| Sound | Chiptune loop per room, keyboard clatter scaled to active agents, level-up sting |

## 8. Error handling

| Case | Behavior |
|---|---|
| `claude` CLI not found | Blocking banner with install link, agents disabled |
| `git` not found | Load repo dialog shows "git is not installed or not on PATH", chip red |
| Load while a clone runs | Dialog shows "A repository is already being cloned" |
| git waits for credentials | Prompts are disabled (`GIT_TERMINAL_PROMPT=0`), so git fails fast; any git run is killed after 5 minutes |
| Clone fails | The floor's progress bar turns red with the last git line, its tab dot turns red, the half clone is deleted; close the tab and try again |
| Local folder missing | Progress bar shows "That folder does not exist" |
| Agent exit ≠ 0 | Figure `error`: red cross badge, white bubble "Hmm, <error>", the quest fails and the chat shows "That one failed: <error>", full output in AgentPanel |
| Ask with nobody / no repo / no claude | HUD hint "Nobody is on this floor to ask." or "Needs Claude Code and a repository on this floor."; the dialog's Give a task is disabled with the same hint |
| Run fails to start | The quest fails and the figure replies "I couldn't start on that: <error>" |
| Concurrency cap hit | Run shows "queued"; the figure looks like a working one (typing, dots) until its turn |
| Corrupt JSON state | Backup file renamed `.bak`, fresh defaults loaded, warning shown |

## 9. Testing

- Main process: unit tests with Vitest for RepoService (injected git runner), the real git
  runner against `git --version`, the repo controller (DTO, error mapping, registration),
  the URL parser, AgentRunner, StateStore.
- Renderer: Vitest + Testing Library for the figures store, the Add figure dialog and modal, the Load repo dialog, the repo status chip, HUD (routing, replies through the event bridge, failed starts), DialogBox (typewriter, floor switch, focus), AgentPanel; pure unit tests for the pixel art (figure frames, badges), the bubble text, `routeTask`, the tasks store and the reply text. Shared test helpers live in `src/renderer/src/test/`.
- Phaser scene: smoke test that the scene boots headless and spawns N figures (pending; today Phaser is mocked in unit tests).
- Manual: paste a repo, watch intake run, give a task, see it move to done.

## 10. Build plan

One task = one branch = one PR, in order.

| # | Task | Deliverable |
|---|---|---|
| 0 | Spec + repo | This file, README, GitHub repo |
| 1 | Electron scaffold | Window opens, React + Vite + TS, navbar shell, Phaser boots an empty scene |
| 2 | Office map | Isometric floor on one page: rooms, corridor, glass walls, doors, app icon |
| 3 | Figures + desks | Desks per room, one detailed figure per job, idle animation, name tag, click emits event |
| 4 | Office style | Rebuild to the owner's design package: opaque walls, windows, decor, floors, furniture kits |
| 5 | Add figure | Dialog with department, job, look and role prompt; new figure sits at a free desk |
| 6 | Repo intake | Load repo dialog, shallow clone via git, status chip in the navbar |
| 7 | Floors | Side panel with a tab per repository, New floor dialog with a progress bar, default team per floor |
| 8 | Agent runner | `claude -p` per figure, streamed to AgentPanel, intake run on floor ready |
| 9 | Figure states | typing frames while working, done / error badges, speech bubbles from the run output |
| 10 | NPC dialog + HUD chat | DialogBox on click with Give a task / Show your work; HUD chat routes asks by mention or keywords; quests and replies |
| 11 | Movement + sprints | Figures wander their room; sprint = planning meeting → quest per figure → board, progress, confetti |
| 12 | XP + juice | Levels, level-up burst, failed numbers, sounds |
| 13 | Persistence | Figures, tasks, sprints, world survive restart |
| 14 | Polish + README | Screenshots, GIF, packaging with electron-builder |
