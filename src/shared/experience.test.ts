import { MAX_LEVEL, XP_PER_DONE_RUN, experienceForLevel, levelForExperience, progressForExperience } from './experience';

describe('experience', (): void => {
  it('follows the level curve and never leaves the level range', (): void => {
    expect(experienceForLevel(1)).toBe(0);
    expect(experienceForLevel(2)).toBe(100);
    expect(experienceForLevel(3)).toBe(300);
    expect(levelForExperience(0)).toBe(1);
    expect(levelForExperience(99)).toBe(1);
    expect(levelForExperience(100)).toBe(2);
    expect(levelForExperience(2 * XP_PER_DONE_RUN)).toBe(2);
    expect(levelForExperience(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL);
    expect(experienceForLevel(MAX_LEVEL + 5)).toBe(experienceForLevel(MAX_LEVEL));
  });

  it('reports progress inside a level and a full bar at the top', (): void => {
    expect(progressForExperience(150)).toEqual({ level: 2, earned: 50, needed: 200, fraction: 0.25 });
    expect(progressForExperience(experienceForLevel(MAX_LEVEL) + 7)).toMatchObject({ level: MAX_LEVEL, earned: 7, needed: 0, fraction: 1 });
  });
});
