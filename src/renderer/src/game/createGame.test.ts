import { vi } from 'vitest';

const gameConstructor = vi.fn();
vi.mock('phaser', () => ({
  default: {
    Game: class {
      constructor(config: unknown) {
        gameConstructor(config);
      }
    },
    AUTO: 0,
    Scale: { RESIZE: 'RESIZE', CENTER_BOTH: 'CENTER_BOTH' },
    Scene: class {},
  },
}));

import { createGame } from './createGame';

describe('createGame', () => {
  it('boots Phaser into the given parent with pixel art on', () => {
    const parent = document.createElement('div');
    createGame(parent);
    expect(gameConstructor).toHaveBeenCalledTimes(1);
    const config = gameConstructor.mock.calls[0]?.[0] as { parent: HTMLElement; pixelArt: boolean; scene: unknown[] };
    expect(config.parent).toBe(parent);
    expect(config.pixelArt).toBe(true);
    expect(config.scene).toHaveLength(2);
  });
});
