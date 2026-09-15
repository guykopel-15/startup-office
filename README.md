# Startup Office

## Version History

| Version | Date | Changes |
|---|---|---|
| 1.0.8 | 2026-09-15 | **Added:** figure states in the office: a typing animation (arms on the keyboard) while a figure works, a badge above the name tag (animated dots while working, green tick when done, red cross on error) and a MapleStory-style speech bubble that shows the figure's latest output line, tool note, first result line, error, or "Stopped." when you stop it, so on load you watch the whole team read the repo. **Changed:** the scene now diffs figure state and run output from the stores instead of only seating and removing figures |
| 1.0.7 | 2026-09-15 | **Added:** agent runner: every figure can run a real `claude` session on its floor's repository; when a floor becomes ready each figure automatically reads the repo from its role's point of view (three sessions at a time, the rest queued); agent panel opened by clicking a figure or the Agents button, with the role prompt (editable), an ask/assign box, Read the repo, Run and Stop, live streamed output with tool notes, result, turns, and earlier runs; `claude` availability check with an inline hint when it is missing. **Changed:** figure state follows its run (working, done, error) |
| 1.0.6 | 2026-09-14 | **Added:** floors: a side panel with one tab per repository, like workspaces in a terminal multiplexer; New floor dialog takes a GitHub URL or a local folder (with a native Browse picker), then shows a progress bar while the repo is prepared and the default team is hired one figure at a time; each floor has its own figures and repo status; empty-office state; `DSProgressBar`. **Changed:** Load repo dialog and single global repo status replaced by floors; repo IPC takes a floor id; Add figure works on the active floor. |
| 1.0.5 | 2026-09-14 | **Added:** Load repo dialog: paste a GitHub URL, the main process clones it shallowly into the app data folder (or pulls when it is already there) and pushes status over IPC; navbar chip with the repo name and a state dot (cloning, ready, failed); typed IPC bridge (`window.office.repo`), controller + service split, standard `successResponse` / error shape, TanStack Query hooks for main-process data. **Changed:** Load repo button enabled; app name pinned to `startup-office` so packaged builds use the same data folder as dev; review fixes: status is fetched on start, git never prompts and times out, broken clones are re-cloned, Enter submits the URL |
| 1.0.4 | 2026-09-14 | **Added:** Add figure dialog (name, job, department with seats left, hair style, accessory, six colors, role prompt, live pixel preview); figures store (Zustand) that seats new figures on the next free desk; the scene subscribes to the store; design kit: `DSModal`, `DSField`, `DSInput`, `DSSelect`, `DSTextArea`, `DSColorInput`; one or two spare desks per department; `STARTUP_OFFICE_SCRIPT` dev hook to drive the page before a capture. **Changed:** Add figure button enabled; plants moved in R&D and Marketing to make room for the spare desks; review fixes: modal keeps focus while typing, traps Tab, restores focus and ignores drags onto the backdrop; selects show a chevron; errors linked to their inputs; store validates text; scene unsubscribes on destroy |
| 1.0.3 | 2026-09-14 | **Added:** office rebuilt to the owner's design package: opaque blue walls (tall far walls, low near rims, 0.6-tile-thick interior walls with door gaps), windows, whiteboards, charts, sticky notes, posters, rugs, per-room floors (tile, orange, checker, corridor runner), department furniture kits (server rack, bookshelf, meeting table + chairs, kitchen counter, fridge, round table, stools, water cooler, sofa, filing cabinet, safe), desk props (mug, lamp, paper, keyboard); responsive down to a 300px window: navbar collapses to icon buttons, camera fits the office and supports wheel zoom + drag pan; `STARTUP_OFFICE_WINDOW=WxH` dev override. **Changed:** window minimum 1024×640 → 300×300, responsive rule now 300px; macOS traffic-light inset applied only on macOS; review fixes: wall decor depth, click vs drag, listener teardown, exterior walls batched into one object. **Removed:** glass-wall look |
| 1.0.2 | 2026-09-14 | **Added:** desks, meeting table and reception desk in the isometric rooms; 16 default chibi figures (one per job) composed from a shared pixel template with hair styles, accessories and per-figure colors; idle bob and blink; name tag that expands to the job on hover; click emits `figure:clicked` on the game event bus. **Changed:** walls drawn per tile and depth-sorted against figures and desks; `RoomKey` moved to `src/shared/figures.ts` |
| 1.0.1 | 2026-09-14 | **Added:** isometric office floor on one page (7 rooms around a lobby corridor, glass walls, door gaps, floor slab, tile grid), app icon, dev self-screenshot hook. **Changed:** view is an isometric floor plan instead of a side-scroller; the CEO is the player outside the office, not a figure |
| 1.0.0 | 2026-09-14 | **Added:** design spec, README, coding rules (`CLAUDE.md`), Electron + React + Phaser scaffold, navbar shell, `DSButton` design kit, logger, Vitest setup |

A MapleStory-style desktop game where your startup is a pixel office and every
employee is a real Claude Code agent. You are the CEO. Walk the office, talk to
your team, hand out tasks, and watch the work flow from room to room.

> Paste a GitHub repo, and the office comes alive: the frontend dev reads your UI
> code, the backend dev reads your API, the marketer reads your landing page, and
> each one reports back in a speech bubble.

## What it is

Startup Office runs on your Mac as an Electron app with a Phaser 3 game inside.
The whole office is on one screen, an isometric floor plan in the style of the owner's
[design package](docs/design/handoff.md): opaque blue walls, windows on the far wall, a different
floor and furniture kit per department:

![The office floor, with Ella added through the dialog and seated in Sales](docs/images/office-floor.png)

Every figure is drawn from one pixel template plus a hair style, an accessory and its own
colors, so adding a new employee is a data change, not new art.

| Department | Who works there |
|---|---|
| R&D | Frontend dev, Backend dev, UI/UX designer, QA engineer, DevOps |
| Product | Product manager, Data analyst |
| Marketing | Content marketer, Growth marketer, Designer |
| Sales | Sales rep, Customer success |
| Finance | Accountant, Fundraising lead |
| Ops / HR | Office manager, Recruiter |
| Meeting room | The sprint board. Figures walk here for sprint planning |
| Lobby | The corridor every room opens onto |

Every figure is an agent. Behind it runs a real `claude` CLI session with a role
prompt and your repo as its working directory. When a figure is working, it sits at
its desk typing, and a speech bubble above it shows the agent's latest line.

## How you play

1. **See everything.** The whole office fits on one page. You are the CEO looking down
   at it. You are not a figure; every figure is an employee.
2. **Add a floor.** Every repository is a floor. Press **New floor** in the side panel, paste a
   GitHub URL or pick a folder on your Mac, and watch the progress bar: the repo is cloned, then
   the default team is hired one figure at a time. Tabs switch between floors; the chip in the
   navbar shows the active floor's repository. From task 8 on, every figure explores the part of
   the code that matches its job.

   ![New floor progress](docs/images/new-floor-progress.png)

   ![Two floors](docs/images/office-floor.png)
3. **Talk.** Click a figure. The agent panel opens with its role prompt, its live output and a
   box to ask or assign something. When a floor becomes ready every figure has already started
   reading the repo from its own point of view; you can watch the sessions stream in. In the
   office each working figure types, animated dots count above its name, and a speech bubble
   says what it is doing right now. A green tick means done, a red cross means the run failed.

   ![Figures working](docs/images/figure-states.png)

   ![Agent panel](docs/images/agent-panel.png)
4. **Run sprints.** Tasks are quests. Open the sprint board in the meeting room, drag
   quests in, and start the sprint. Figures walk to the meeting room for planning,
   then back to their desks to work.
5. **Grow the team.** Press **Add figure** in the navbar (the `+` button in a narrow window).
   Pick a department with a free desk, give the person a name, job and look, optionally a role
   prompt (it defaults from the job), and they sit down.

   ![Add figure dialog](docs/images/add-figure-dialog.png)
6. **Level up.** Figures gain XP for finished tasks. Failed tasks show damage numbers.
   Closing a sprint throws confetti.

## The game layer

| Element | What you get |
|---|---|
| World | Isometric floor plan: seven rooms around a lobby corridor, opaque walls with windows and decor, per-room floors and furniture |
| Characters | Idle bounce, desk typing animation, 4-direction walk cycles (task 11) |
| Floors | Side panel with one tab per repository; each floor has its own team |
| HUD | Bottom bar: company stats, quest log, chat, minimap |
| Dialog | MapleStory-style NPC dialog box for every figure |
| Juice | Level-up burst, damage numbers, confetti, chiptune per room, keyboard clatter |

## Stack

| Layer | Tech |
|---|---|
| Shell | Electron |
| UI | React, TypeScript, Vite, Zustand, TanStack Query |
| Game | Phaser 3 |
| Agents | `claude` CLI (`claude -p --output-format stream-json`), read-only tools for intake, three sessions at a time |
| Storage | JSON files and cloned repositories in the Electron user data folder |
| Tests | Vitest, Testing Library |

## Requirements

- macOS
- Node 20+
- [Claude Code](https://claude.com/claude-code) installed and logged in (`claude` on PATH)
- `git` on PATH

## Run

```bash
npm install
npm run dev
```

Other scripts: `npm test`, `npm run typecheck`, `npm run build`, `npm run icon` (regenerates
`build/icon.png` from pixel rows), `npm run package` (dmg). Set `STARTUP_OFFICE_SCREENSHOT=out.png`
when launching to capture the window to a file and quit, which is how the README images are made.
`STARTUP_OFFICE_WINDOW=300x600` opens the window at a given size, for checking small layouts.
`STARTUP_OFFICE_SCRIPT=<file>` (together with `STARTUP_OFFICE_SCREENSHOT`) runs a script in the page
before the capture, to open dialogs or fill forms; `npm run screenshot-scripts` writes the six page scripts used
for the README images into `scripts/screenshots/generated/` (`floorsReady.js` clones this repo; `figureStates.js` runs real `claude` sessions on a local folder and waits 45 s, or `--hold-ms=<n>`, for the badges and bubbles). All three variables are ignored in packaged builds. The app works down to a 300px wide window:

![The office in a 300px window](docs/images/office-300px.png)

## Build plan

One task = one branch = one pull request, built in order.

| # | Task | Deliverable | Status |
|---|---|---|---|
| 0 | Spec + repo | Design doc, README, GitHub repo | ✅ |
| 1 | Electron scaffold | Window opens, React + Vite + TS, navbar shell, empty Phaser scene | ✅ |
| 2 | Office map | Isometric floor on one page: rooms, corridor, glass walls, doors, app icon | ✅ |
| 3 | Figures + desks | Desks per room, one detailed figure per job, idle animation, name tag, click emits event | ✅ |
| 4 | Office style | Owner's design package: opaque walls, windows, decor, per-room floors and furniture kits; responsive to 300px | ✅ |
| 5 | Add figure | Dialog with department, job, look and role prompt; new figure sits at a free desk | ✅ |
| 6 | Repo intake | Load repo dialog, shallow clone via git, status chip in the navbar | ✅ |
| 7 | Floors | Side panel with a tab per repository, New floor dialog with a progress bar, default team per floor | ✅ |
| 8 | Agent runner | `claude -p` per figure, streamed to a panel, intake run on repo load | ✅ |
| 9 | Figure states | typing while working, done tick / error cross badge, speech bubble with the latest line | ✅ |
| 10 | NPC dialog + HUD chat | Talk to a figure, give a task, it routes to the assignee | ☐ |
| 11 | Meeting room + sprints | Sprint board, figures walk to planning, confetti on close | ☐ |
| 12 | XP + juice | Levels, level-up burst, damage numbers, sounds | ☐ |
| 13 | Persistence | Figures, tasks, sprints, world survive restart | ☐ |
| 14 | Polish | Screenshots, GIF, packaged `.dmg` | ☐ |

Full design: [docs/superpowers/specs/2026-09-14-startup-office-design.md](docs/superpowers/specs/2026-09-14-startup-office-design.md)

## Safety

Agent output is displayed, never executed. Agents run with your repo as their working
directory, so they can edit code there the same way Claude Code does on your terminal.
Review before you commit.

## License

MIT
