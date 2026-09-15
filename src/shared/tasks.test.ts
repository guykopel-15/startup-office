import { DEFAULT_FIGURES } from './figures';
import { mentionFor, routeTask } from './tasks';

import type { Figure } from './figures';

const FIGURES: readonly Figure[] = DEFAULT_FIGURES;

describe('routeTask', () => {
  it('sends a mention to that figure by name or id and strips it from the title', (): void => {
    expect(routeTask('@Maya fix the header', FIGURES)).toEqual({ assigneeId: 'frontend', title: 'fix the header' });
    expect(routeTask('please @qa check the login flow', FIGURES)).toEqual({ assigneeId: 'qa', title: 'please check the login flow' });
    expect(mentionFor(FIGURES[0] as Figure)).toBe('@Maya');
  });

  it('routes by job words and known keywords, most matches wins', (): void => {
    expect(routeTask('write tests for the login bug', FIGURES)?.assigneeId).toBe('qa');
    expect(routeTask('the api endpoint returns 500', FIGURES)?.assigneeId).toBe('backend');
    expect(routeTask('update the deploy pipeline', FIGURES)?.assigneeId).toBe('devops');
    expect(routeTask('ask the accountant about the budget', FIGURES)?.assigneeId).toBe('accountant');
  });

  it('falls back to the product manager, then the first figure, and null with nobody', (): void => {
    expect(routeTask('what should we do next?', FIGURES)?.assigneeId).toBe('pm');
    expect(routeTask('what should we do next?', FIGURES.slice(0, 2))?.assigneeId).toBe('frontend');
    expect(routeTask('anything', [])).toBeNull();
    expect(routeTask('   ', FIGURES)).toBeNull();
    expect(routeTask('@nobody hi', FIGURES)?.assigneeId).toBe('pm');
  });
});
