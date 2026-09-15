export enum RunMode {
  /** Read, Grep, Glob only. Used for repo intake and questions. */
  ReadOnly = 'readOnly',
  /** Also allows edits inside the repo; arrives with tasks. */
  Edit = 'edit',
}

export enum RunStatus {
  Queued = 'queued',
  Running = 'running',
  Done = 'done',
  Error = 'error',
  Cancelled = 'cancelled',
}

/** What the renderer asks main to run. */
export interface StartRunInput {
  floorId: string;
  figureId: string;
  /** Working directory: the floor's repository path. */
  cwd: string;
  prompt: string;
  mode: RunMode;
  /** Jumps the queue: a sprint planning meeting should not wait behind a floor's intake runs. */
  isPriority?: boolean;
}

/** One `claude` session, as the renderer tracks it. */
export interface AgentRun {
  id: string;
  floorId: string;
  figureId: string;
  prompt: string;
  mode: RunMode;
  status: RunStatus;
  /** Streamed lines: assistant text and short tool notes. */
  lines: string[];
  result: string | null;
  error: string | null;
  costUsd: number | null;
  turns: number | null;
  startedAt: string;
  endedAt: string | null;
}

export type AgentEvent =
  | { type: 'status'; runId: string; status: RunStatus }
  | { type: 'chunk'; runId: string; text: string }
  | { type: 'done'; runId: string; status: RunStatus; result: string | null; error: string | null; costUsd: number | null; turns: number | null };

export interface ClaudeAvailability {
  isAvailable: boolean;
  version: string | null;
  path: string | null;
  error: string | null;
}

export enum AgentChannel {
  Start = 'agent:start',
  Cancel = 'agent:cancel',
  Check = 'agent:check',
  Event = 'agent:event',
}

export enum AgentErrorCode {
  ClaudeNotFound = 'AGENT_CLAUDE_NOT_FOUND',
  InvalidInput = 'AGENT_INVALID_INPUT',
  UnknownRun = 'AGENT_UNKNOWN_RUN',
  Failed = 'AGENT_FAILED',
}

/** Prefix of a streamed tool-use note such as "▸ Read src/index.ts"; shared by the stream parser and the renderer. */
export const TOOL_NOTE_PREFIX = '▸';
export const MAX_CONCURRENT_RUNS = 3;
export const RUN_TIMEOUT_MS = 10 * 60 * 1000;
export const MAX_TURNS = 25;

const INTAKE_INSTRUCTIONS = 'Explore this repository from your role\'s point of view. Report: what you own, its current state, the top 3 risks, and the top 3 next steps. Under 200 words. Do not change any file.';

/** The prompt every figure runs when its floor loads. */
export function buildIntakePrompt(rolePrompt: string, job: string): string {
  const role = rolePrompt.trim() === '' ? `You are the ${job.trim().toLowerCase()}.` : rolePrompt.trim();
  return `${role}\n\n${INTAKE_INSTRUCTIONS}`;
}

/** A custom question or task, prefixed with the figure's role. */
export function buildTaskPrompt(rolePrompt: string, job: string, task: string): string {
  const role = rolePrompt.trim() === '' ? `You are the ${job.trim().toLowerCase()}.` : rolePrompt.trim();
  return `${role}\n\n${task.trim()}`;
}
