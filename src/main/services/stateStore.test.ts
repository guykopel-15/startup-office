// @vitest-environment node
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SNAPSHOT_VERSION } from '../../shared/persistence';
import { StateStore } from './stateStore';

import type { Snapshot } from '../../shared/persistence';

const SNAPSHOT: Snapshot = { version: SNAPSHOT_VERSION, savedAt: '2026-09-15T10:00:00.000Z', floors: [], activeFloorId: null, tasks: [], messages: [], sprints: [], intakeStartedFloorIds: [], settings: { isMuted: false } };
let directory = '';

beforeEach(async (): Promise<void> => {
  directory = await mkdtemp(join(tmpdir(), 'state-'));
});

afterEach(async (): Promise<void> => {
  await rm(directory, { recursive: true, force: true });
});

describe('StateStore', (): void => {
  it('starts empty, then round-trips a snapshot through a temp file', async (): Promise<void> => {
    const store = new StateStore(join(directory, 'nested', 'state.json'));
    expect(await store.load()).toEqual({ snapshot: null, warning: null });
    await store.save(SNAPSHOT);
    expect(await store.load()).toEqual({ snapshot: SNAPSHOT, warning: null });
    expect(await readdir(join(directory, 'nested'))).toEqual(['state.json']);
  });

  it('moves a corrupt file aside and warns instead of failing', async (): Promise<void> => {
    const filePath = join(directory, 'state.json');
    await writeFile(filePath, '{ not json', 'utf8');
    const store = new StateStore(filePath);
    const result = await store.load();
    expect(result.snapshot).toBeNull();
    expect(result.warning).toContain('state.json.bak');
    expect(await readFile(`${filePath}.bak`, 'utf8')).toBe('{ not json');
    expect(await store.load()).toEqual({ snapshot: null, warning: null });
  });
});
