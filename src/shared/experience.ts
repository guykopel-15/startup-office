/** Experience points and levels: every finished run earns XP, a failed quest costs a little. */

export const XP_PER_DONE_RUN = 50;
/** A failed quest hurts: shown as damage in the office. */
export const DAMAGE_PER_FAILED_RUN = 10;
export const STARTING_LEVEL = 1;
export const MAX_LEVEL = 20;
/** Level n starts at XP_CURVE_FACTOR * n * (n - 1): 0, 100, 300, 600, 1000, … */
const XP_CURVE_FACTOR = 50;

export interface LevelProgress {
  level: number;
  /** XP earned since the current level began. */
  earned: number;
  /** XP the current level spans; 0 at the top level. */
  needed: number;
  /** 0..1 toward the next level; 1 at the top level. */
  fraction: number;
}

/** Total XP at which `level` begins. */
export function experienceForLevel(level: number): number {
  const clamped = Math.min(Math.max(level, STARTING_LEVEL), MAX_LEVEL);
  return XP_CURVE_FACTOR * clamped * (clamped - 1);
}

/** The level `experiencePoints` amounts to. */
export function levelForExperience(experiencePoints: number): number {
  let level = STARTING_LEVEL;
  while (level < MAX_LEVEL && experiencePoints >= experienceForLevel(level + 1)) level += 1;
  return level;
}

export function progressForExperience(experiencePoints: number): LevelProgress {
  const level = levelForExperience(experiencePoints);
  if (level >= MAX_LEVEL) return { level, earned: experiencePoints - experienceForLevel(level), needed: 0, fraction: 1 };
  const start = experienceForLevel(level);
  const needed = experienceForLevel(level + 1) - start;
  const earned = experiencePoints - start;
  return { level, earned, needed, fraction: needed === 0 ? 1 : earned / needed };
}
