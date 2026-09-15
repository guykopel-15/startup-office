import { vi } from 'vitest';

vi.mock('phaser', async (): Promise<object> => (await import('../../test/phaserMock')).phaserMock());
vi.mock('../art/pixelArt', async (importOriginal: () => Promise<object>): Promise<object> => ({ ...(await importOriginal()), createPixelTexture: vi.fn() }));

import { DEFAULT_LOOK } from '@shared/figures';
import { FigureWalker } from './FigureWalker';

import type Phaser from 'phaser';
import type { GridPoint } from '../world/isoProjection';

interface FakeCounter {
  onUpdate: (tween: { getValue: () => number }) => void;
  onComplete: () => void;
  remove: () => void;
}

/** Just enough scene for the walker: counters we can drive, a timer we can count, textures we can inspect. */
function fakeScene(): { scene: Phaser.Scene; counters: FakeCounter[]; removedTextures: string[]; timers: number } {
  const counters: FakeCounter[] = [];
  const removedTextures: string[] = [];
  const state = { timers: 0 };
  const scene = {
    tweens: {
      addCounter: (config: { onUpdate: FakeCounter['onUpdate']; onComplete: FakeCounter['onComplete'] }): FakeCounter => {
        const counter: FakeCounter = { onUpdate: config.onUpdate, onComplete: config.onComplete, remove: vi.fn() };
        counters.push(counter);
        return counter;
      },
    },
    time: {
      addEvent: (): { remove: () => void } => {
        state.timers += 1;
        return { remove: (): void => void (state.timers -= 1) };
      },
    },
    textures: { remove: (key: string): void => void removedTextures.push(key) },
  } as unknown as Phaser.Scene;
  return { scene, counters, removedTextures, get timers(): number { return state.timers; } };
}

function fakeSprite(): Phaser.GameObjects.Sprite & { textureKey: string | null; isFlipped: boolean } {
  const sprite = {
    textureKey: null as string | null,
    isFlipped: false,
    setTexture(key: string): unknown {
      this.textureKey = key;
      return this;
    },
    setFlipX(isFlipped: boolean): unknown {
      this.isFlipped = isFlipped;
      return this;
    },
  };
  return sprite as unknown as Phaser.GameObjects.Sprite & { textureKey: string | null; isFlipped: boolean };
}

const START: GridPoint = { gx: 2, gy: 2 };

describe('FigureWalker', (): void => {
  it('walks segment by segment, reports steps, faces the way it goes and rests on arrival', (): void => {
    const fake = fakeScene();
    const sprite = fakeSprite();
    const walker = new FigureWalker(fake.scene, sprite, 'figure-x', DEFAULT_LOOK, START);
    const steps: GridPoint[] = [];
    const onArrive = vi.fn();
    walker.walk([{ gx: 2, gy: 4 }, { gx: 1, gy: 4 }], { onStep: (feet: GridPoint): void => void steps.push(feet), onArrive });
    expect(walker.isWalking).toBe(true);
    expect(fake.timers).toBe(1);
    expect(sprite.isFlipped).toBe(true);
    fake.counters[0]?.onUpdate({ getValue: (): number => 0.5 });
    expect(steps[0]).toEqual({ gx: 2, gy: 3 });
    fake.counters[0]?.onComplete();
    fake.counters[1]?.onComplete();
    expect(onArrive).toHaveBeenCalledTimes(1);
    expect(walker.isWalking).toBe(false);
    expect(fake.timers).toBe(0);
    expect(sprite.textureKey).toBe('figure-x');
  });

  it('can be destroyed after the sprite is gone: it drops tween, timer and textures without touching the sprite', (): void => {
    const fake = fakeScene();
    const sprite = fakeSprite();
    const walker = new FigureWalker(fake.scene, sprite, 'figure-x', DEFAULT_LOOK, START);
    walker.walk([{ gx: 3, gy: 2 }], { onStep: (): void => undefined, onArrive: (): void => undefined });
    sprite.setTexture = (): never => {
      throw new Error('sprite is destroyed');
    };
    expect((): void => walker.destroy()).not.toThrow();
    expect(fake.counters[0]?.remove).toHaveBeenCalled();
    expect(fake.timers).toBe(0);
    expect(fake.removedTextures).toEqual(['figure-x-walk-0', 'figure-x-walk-1']);
  });
});
