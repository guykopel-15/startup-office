import { DEFAULT_FIGURES } from './figures';
import { mentionFor, routeTask } from './tasks';

import type { Figure } from './figures';

const FIGURES: readonly Figure[] = DEFAULT_FIGURES;
const ANA: Figure = { ...(DEFAULT_FIGURES[0] as Figure), id: 'ana', name: 'Ana Maria', job: 'Mobile dev' };
const YAEL_HEBREW: Figure = { ...(DEFAULT_FIGURES[5] as Figure), id: 'yael', name: 'יעל', job: 'מנהלת מוצר' };

describe('routeTask', (): void => {
  it('sends a mention to that figure by name or id and strips it from the title', (): void => {
    expect(routeTask('@Maya fix the header', FIGURES)).toEqual({ assigneeId: 'frontend', title: 'fix the header' });
    expect(routeTask('please @qa check the login flow', FIGURES)).toEqual({ assigneeId: 'qa', title: 'please check the login flow' });
    expect(mentionFor(FIGURES[0] as Figure)).toBe('@Maya');
  });

  it('accepts punctuation after the mention, names with spaces and non-Latin names', (): void => {
    expect(routeTask('@Maya, fix the header', FIGURES)).toEqual({ assigneeId: 'frontend', title: 'fix the header' });
    expect(routeTask("@Maya's page is slow", FIGURES)).toEqual({ assigneeId: 'frontend', title: 's page is slow' });
    expect(routeTask('@Ana Maria fix the crash', [ANA, ...FIGURES])).toEqual({ assigneeId: 'ana', title: 'fix the crash' });
    expect(routeTask('@יעל מה הלאה?', [YAEL_HEBREW])).toEqual({ assigneeId: 'yael', title: 'מה הלאה?' });
  });

  it('routes by job words and known keywords, most matches wins, earlier figure on a tie', (): void => {
    expect(routeTask('write tests for the login bug', FIGURES)?.assigneeId).toBe('qa');
    expect(routeTask('the api endpoint returns 500', FIGURES)?.assigneeId).toBe('backend');
    expect(routeTask('update the deploy pipeline', FIGURES)?.assigneeId).toBe('devops');
    expect(routeTask('ask the accountant about the budget', FIGURES)?.assigneeId).toBe('accountant');
    expect(routeTask('fix the bug in the api', FIGURES)?.assigneeId).toBe('backend');
    expect(routeTask('מנהלת מוצר, מה הלאה?', [ANA, YAEL_HEBREW])?.assigneeId).toBe('yael');
  });

  it('keeps an unknown mention in the text and routes it by keywords', (): void => {
    expect(routeTask('@nobody write tests', FIGURES)).toEqual({ assigneeId: 'qa', title: '@nobody write tests' });
  });

  it('falls back to the product manager, then the first figure, and null with nobody or nothing to do', (): void => {
    expect(routeTask('what should we do next?', FIGURES)?.assigneeId).toBe('pm');
    expect(routeTask('what should we do next?', FIGURES.slice(0, 2))?.assigneeId).toBe('frontend');
    expect(routeTask('anything', [])).toBeNull();
    expect(routeTask('   ', FIGURES)).toBeNull();
    expect(routeTask('@Maya', FIGURES)).toBeNull();
  });
});
