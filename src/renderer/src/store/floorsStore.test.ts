import { vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { DEFAULT_LOOK, RoomKey } from '@shared/figures';
import { FloorSetupStep, FloorSourceKind } from '@shared/floors';
import { RepoState } from '@shared/repo';
import { defaultTeam, runFloorSetup } from './floorSetup';
import { selectActiveFigures, selectActiveFloor, useFloorsStore } from './floorsStore';

import type { Floor } from '@shared/floors';
import type { RepoStatus } from '@shared/repo';

const SOURCE = { kind: FloorSourceKind.Local, path: '/tmp/loop' } as const;
const READY: RepoStatus = { state: RepoState.Ready, url: null, fullName: 'loop', path: '/tmp/loop', message: null };
const noSleep = async (): Promise<void> => undefined;

afterEach((): void => {
  useFloorsStore.setState({ floors: [], activeFloorId: null });
});

describe('useFloorsStore', () => {
  it('creates floors, activates the newest, and removes them back to the previous one', (): void => {
    const first = useFloorsStore.getState().createFloor({ name: 'A', source: SOURCE });
    const second = useFloorsStore.getState().createFloor({ name: 'B', source: SOURCE });
    expect(useFloorsStore.getState().activeFloorId).toBe(second.id);
    useFloorsStore.getState().setActiveFloor(first.id);
    expect(selectActiveFloor(useFloorsStore.getState())?.name).toBe('A');
    useFloorsStore.getState().removeFloor(first.id);
    expect(useFloorsStore.getState().activeFloorId).toBe(second.id);
    useFloorsStore.getState().removeFloor(second.id);
    expect(useFloorsStore.getState().activeFloorId).toBeNull();
    expect(selectActiveFigures(useFloorsStore.getState())).toEqual([]);
  });

  it('adds figures to the active floor only and refuses without a floor', (): void => {
    const input = { name: 'Ella', job: 'Mobile dev', room: RoomKey.Sales, look: DEFAULT_LOOK, rolePrompt: 'x' };
    expect(useFloorsStore.getState().addFigure(input)).toBeNull();
    const floor = useFloorsStore.getState().createFloor({ name: 'A', source: SOURCE });
    expect(useFloorsStore.getState().addFigure(input)?.room).toBe(RoomKey.Sales);
    expect((selectActiveFloor(useFloorsStore.getState()) as Floor).figures).toHaveLength(1);
    expect(floor.figures).toHaveLength(0);
  });
});

describe('runFloorSetup', () => {
  it('prepares the repo, hires the default team one by one, then marks the floor ready', async (): Promise<void> => {
    const floor = useFloorsStore.getState().createFloor({ name: 'A', source: SOURCE });
    const steps: FloorSetupStep[] = [];
    const unsubscribe = useFloorsStore.subscribe((state): void => {
      const step = state.floors[0]?.setup.step;
      if (step !== undefined) steps.push(step);
    });
    await runFloorSetup(useFloorsStore.getState(), floor.id, SOURCE, async (): Promise<RepoStatus> => READY, noSleep);
    unsubscribe();
    const result = selectActiveFloor(useFloorsStore.getState()) as Floor;
    expect(result.repoStatus).toEqual(READY);
    expect(result.figures.map((figure): string => figure.id)).toEqual(defaultTeam().map((figure): string => figure.id));
    expect(result.setup.step).toBe(FloorSetupStep.Ready);
    expect(result.setup.fraction).toBe(1);
    expect(steps).toContain(FloorSetupStep.CreatingFigures);
  });

  it('records the error when the repo cannot be prepared', async (): Promise<void> => {
    const floor = useFloorsStore.getState().createFloor({ name: 'A', source: SOURCE });
    await runFloorSetup(useFloorsStore.getState(), floor.id, SOURCE, async (): Promise<RepoStatus> => {
      throw new Error('That folder does not exist');
    }, noSleep);
    const result = selectActiveFloor(useFloorsStore.getState()) as Floor;
    expect(result.setup).toMatchObject({ step: FloorSetupStep.Error, error: 'That folder does not exist' });
    expect(result.figures).toHaveLength(0);
  });
});
