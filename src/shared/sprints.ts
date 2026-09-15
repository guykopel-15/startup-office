import { findFigure } from './figures';
import { isBlank } from './text';

import type { Figure } from './figures';

export enum SprintStatus {
  /** The product manager is splitting the goal at the meeting table. */
  Planning = 'planning',
  Active = 'active',
  Closed = 'closed',
}

/** One sprint on a floor: a goal, the meeting that split it, and the quests that came out. */
export interface Sprint {
  id: string;
  floorId: string;
  goal: string;
  status: SprintStatus;
  /** The planning run of the product manager; null until queued. */
  planRunId: string | null;
  taskIds: string[];
  createdAt: string;
  closedAt: string | null;
}

/** One line of the plan: who takes what. */
export interface PlannedTask {
  figureId: string;
  title: string;
}

export const MAX_GOAL_LENGTH = 300;
export const MAX_PLANNED_TITLE_LENGTH = 140;
/** The figure that runs planning meetings when it is on the floor. */
export const PLANNER_ID = 'pm';
/** Keeps the meeting short: the planner skims, it does not audit. */
const MAX_PLANNING_TOOL_CALLS = 6;
const JSON_ARRAY = /\[[\s\S]*\]/;
/** "- qa: write tests" or "Dan – write tests" style lines, the fallback when the model skips JSON. */
const PLAN_LINE = /^\s*(?:[-*]\s*)?([^:–-]+?)\s*[:–-]\s*(.+?)\s*$/u;

/** Who runs the meeting: the product manager, or the first figure on the floor. */
export function findPlanner(figures: readonly Figure[]): Figure | null {
  return findFigure(figures, PLANNER_ID) ?? figures[0] ?? null;
}

function teamLine(figure: Figure): string {
  return `- ${figure.id}: ${figure.name}, ${figure.job}`;
}

/** The planning session's prompt: split the goal into one concrete task per relevant teammate, as JSON. */
export function buildPlanningPrompt(planner: Figure, goal: string, figures: readonly Figure[]): string {
  const role = isBlank(planner.rolePrompt) ? `You are ${planner.name}, the ${planner.job.toLowerCase()}.` : planner.rolePrompt.trim();
  return [
    role,
    'You are running the sprint planning meeting for this repository.',
    `Sprint goal from the CEO: ${goal.trim()}`,
    'Team (id: name, job):',
    ...figures.map(teamLine),
    `Look at the repository briefly (read-only, at most ${MAX_PLANNING_TOOL_CALLS} file reads or searches) so every task is specific to it, then split the goal into concrete tasks:`,
    '- at most one task per teammate, only for teammates whose job is needed, at least two tasks',
    `- each title under ${MAX_PLANNED_TITLE_LENGTH} characters, names the files or areas involved`,
    'Reply with ONLY a JSON array, no prose: [{"figureId": "<id from the team list>", "title": "<task>"}]',
  ].join('\n');
}

function normalizeEntry(entry: unknown, figures: readonly Figure[]): PlannedTask | null {
  if (typeof entry !== 'object' || entry === null) return null;
  const { figureId, title } = entry as { figureId?: unknown; title?: unknown };
  if (typeof figureId !== 'string' || typeof title !== 'string' || isBlank(title)) return null;
  const figure = findFigure(figures, figureId) ?? figures.find((candidate: Figure): boolean => candidate.name.toLowerCase() === figureId.toLowerCase()) ?? null;
  return figure === null ? null : { figureId: figure.id, title: title.trim().slice(0, MAX_PLANNED_TITLE_LENGTH) };
}

function parseJsonPlan(text: string, figures: readonly Figure[]): PlannedTask[] {
  const match = JSON_ARRAY.exec(text);
  if (match === null) return [];
  try {
    const parsed: unknown = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed.map((entry: unknown): PlannedTask | null => normalizeEntry(entry, figures)).filter((task): task is PlannedTask => task !== null) : [];
  } catch {
    return [];
  }
}

function parseLinePlan(text: string, figures: readonly Figure[]): PlannedTask[] {
  return text
    .split('\n')
    .map((line: string): PlannedTask | null => {
      const match = PLAN_LINE.exec(line);
      return match === null ? null : normalizeEntry({ figureId: match[1], title: match[2] }, figures);
    })
    .filter((task): task is PlannedTask => task !== null);
}

/** The plan out of a planning run's result: JSON first, "id: task" lines as a fallback, one task per figure. */
export function parsePlan(result: string, figures: readonly Figure[]): PlannedTask[] {
  const tasks = parseJsonPlan(result, figures);
  const chosen = tasks.length > 0 ? tasks : parseLinePlan(result, figures);
  const seen = new Set<string>();
  return chosen.filter((task: PlannedTask): boolean => {
    if (seen.has(task.figureId)) return false;
    seen.add(task.figureId);
    return true;
  });
}
