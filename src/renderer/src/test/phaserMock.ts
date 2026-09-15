import { EventEmitter } from 'node:events';

/** What `vi.mock('phaser', phaserMock)` returns: enough of Phaser for the game event bus. */
export function phaserMock(): { default: { Events: { EventEmitter: typeof EventEmitter } } } {
  return { default: { Events: { EventEmitter } } };
}
