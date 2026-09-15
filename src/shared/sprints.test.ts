import { DEFAULT_FIGURES } from './figures';
import { buildPlanningPrompt, findPlanner, parsePlan } from './sprints';

import type { Figure } from './figures';

const FIGURES: readonly Figure[] = DEFAULT_FIGURES.slice(0, 6);

describe('sprints', (): void => {
  it('picks the product manager as planner and writes a prompt with the team and the goal', (): void => {
    const planner = findPlanner(FIGURES);
    expect(planner?.id).toBe('pm');
    expect(findPlanner(FIGURES.slice(0, 2))?.id).toBe('frontend');
    if (planner === null) throw new Error('no planner');
    const prompt = buildPlanningPrompt(planner, ' Ship dark mode ', FIGURES);
    expect(prompt).toContain('Sprint goal from the CEO: Ship dark mode');
    expect(prompt).toContain('- qa: Dan, QA engineer');
    expect(prompt).toContain('JSON array');
  });

  it('parses a JSON plan, even inside prose, keeping one task per known figure', (): void => {
    const result = 'Here is the plan:\n```json\n[{"figureId":"frontend","title":"Add the theme toggle"},{"figureId":"qa","title":"Test both themes"},{"figureId":"frontend","title":"dup"},{"figureId":"ghost","title":"x"},{"figureId":"Dan","title":" "}]\n```';
    expect(parsePlan(result, FIGURES)).toEqual([
      { figureId: 'frontend', title: 'Add the theme toggle' },
      { figureId: 'qa', title: 'Test both themes' },
    ]);
  });

  it('falls back to "id: task" lines and accepts names', (): void => {
    const result = 'Plan:\n- backend: Add the theme endpoint\n* Dan – Write theme tests\nnothing here';
    expect(parsePlan(result, FIGURES)).toEqual([
      { figureId: 'backend', title: 'Add the theme endpoint' },
      { figureId: 'qa', title: 'Write theme tests' },
    ]);
    expect(parsePlan('no plan at all', FIGURES)).toEqual([]);
    expect(parsePlan('[not json', FIGURES)).toEqual([]);
  });
});
