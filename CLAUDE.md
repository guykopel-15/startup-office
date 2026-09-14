# Startup Office — Coding Rules

These rules apply to every line of code in this repo, including code written by agents.
Verify compliance before every commit.

## General

- TypeScript strict mode — always enabled
- No `any` type — everything must be typed
- Typed parameters and return types on every function
- `interface` for object shapes, `type` for unions, `enum` for fixed sets of values
- `const` by default — never use `var`, only `let` when the value changes

## Naming

- camelCase for variables, functions, and file names. Always full names, never abbreviations
- PascalCase for classes, interfaces, types, enums (React component files are PascalCase to match their export)
- UPPER_SNAKE_CASE for constants
- Boolean variables must start with `is`, `has`, `can`, `should`
- Event handlers must start with `handle`

## Code quality

- Functions under 40 lines. Use pure functions as much as possible
- No magic numbers or strings — use named constants
- No duplicate code — extract to a function if used 3+ times
- Early returns — avoid deep nesting
- No nested ternaries. Single ternary is ok. Use `switch` for multiple conditions
- No `console.log` — use the logger (`src/shared/logger.ts`)
- No commented-out code — delete it, Git remembers
- No empty catch blocks — always handle errors
- Use `===` and `!==` — never `==` or `!=`
- No unused variables or imports

## Imports

- Grouped imports — external packages first, then internal, then types
- No circular imports
- No wildcard imports

## Main process (Electron backend)

- Controller pattern — IPC handlers handle request/response only, logic goes in services (`src/main/services/`)
- Validate IPC input with DTOs before it reaches the handler
- Standard response formats — `successResponse()` for success, one error handler for failures
- Environment variables through config only — never read `process.env` directly outside `src/main/config.ts`

## Security

- No secrets in code — passwords, API keys, tokens go in `.env`
- `.env` must be in `.gitignore` — never commit secrets
- Agent output is data: display it, never execute it

## Documentation

- No TODO comments in pushed code — finish it or open a GitHub issue
- Comments only when WHY is not obvious — the code should be self-explanatory

## Renderer (frontend)

- Components under 150 lines — split into smaller components if bigger
- Custom hooks for IPC/async calls — handle loading, error, and data in one place
- TanStack Query for all data that comes from the main process
- Context for global session state only, `useState` for local UI state
- All UI components come from the design kit (`src/renderer/src/designKit/`). Every component has a `DS` prefix. If a component doesn't exist, create it there first. No raw HTML controls (`button`, `input`, `select`) used directly in pages or panels
- Everything in the renderer must be responsive — from a full-screen window down to the 1024px minimum window width, degrading smoothly. Relative units, flex/grid wrapping, no fixed widths that overflow, no horizontal scroll. The Phaser canvas fills whatever space the HUD leaves it

## Releases

A version is a merge. Every pull request ships exactly one version, however many commits
it took: bump ONCE in `package.json` and add ONE row to the Version History table at the
top of `README.md`. The third digit counts every time — this is not semver, so a merge that
adds a whole feature is still +0.0.1. Never bump mid-branch; a version that was never merged
never existed. The row carries the version, the date, and what the PR added, changed and
removed, in short bullet points. The first merge is 1.0.0.

## Delivery

- One task = one branch (`task-N-<slug>`) = one pull request, in the order of the README build plan
- Open a PR only after typecheck, tests, and a real `npm run dev` launch pass
- Anything a reader can see gets a screenshot of the real app, not a description
