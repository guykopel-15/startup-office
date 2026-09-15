import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('phaser', async (): Promise<object> => (await import('../test/phaserMock')).phaserMock());

import { DEFAULT_FIGURES, FigureState } from '@shared/figures';
import { FloorSetupStep, FloorSourceKind } from '@shared/floors';
import { SNAPSHOT_VERSION } from '@shared/persistence';
import { RepoState } from '@shared/repo';
import { TaskStatus } from '@shared/tasks';
import { useFloorsStore } from '../store/floorsStore';
import { useRunsStore } from '../store/runsStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTasksStore } from '../store/tasksStore';
import { installOfficeMock, seedReadyFloor } from '../test/officeMock';
import { SAVE_DEBOUNCE_MS, buildSnapshot, useHydration, usePersistence } from './stateQueries';

import type { Figure } from '@shared/figures';
import type { Floor } from '@shared/floors';
import type { Snapshot } from '@shared/persistence';

const FLOOR: Floor = {
  id: 'saved-floor',
  name: 'Saved',
  source: { kind: FloorSourceKind.Local, path: '/tmp/saved' },
  repoStatus: { state: RepoState.Ready, url: null, fullName: 'saved', path: '/tmp/saved', message: null },
  figures: [{ ...(DEFAULT_FIGURES[0] as Figure), state: FigureState.Working, level: 3, experiencePoints: 320 }],
  setup: { step: FloorSetupStep.Ready, fraction: 1, label: 'Floor ready', error: null },
};
const SNAPSHOT: Snapshot = {
  version: SNAPSHOT_VERSION,
  savedAt: 'then',
  floors: [FLOOR],
  activeFloorId: 'saved-floor',
  tasks: [{ id: 't1', floorId: 'saved-floor', title: 'a', assigneeId: 'frontend', status: TaskStatus.Active, runId: 'r1', createdAt: '' }],
  messages: [],
  sprints: [],
  intakeStartedFloorIds: ['saved-floor'],
  settings: { isMuted: true },
};

beforeEach((): void => {
  installOfficeMock();
  seedReadyFloor([]);
  useFloorsStore.setState({ floors: [], activeFloorId: null });
  useSettingsStore.setState({ isMuted: false });
});

afterEach((): void => {
  vi.useRealTimers();
});

describe('useHydration', (): void => {
  it('restores the saved office settled, re-adopts each repository, and reports the file warning', async (): Promise<void> => {
    vi.mocked(window.office.state.load).mockResolvedValue({ isOk: true, data: { snapshot: SNAPSHOT, warning: 'moved aside' } });
    vi.mocked(window.office.repo.useLocal).mockResolvedValue({ isOk: true, data: { ...FLOOR.repoStatus, message: 'adopted' } });
    const { result } = renderHook(useHydration);
    expect(result.current.isHydrated).toBe(false);
    await vi.waitFor((): void => expect(result.current.isHydrated).toBe(true));
    expect(result.current.warning).toBe('moved aside');
    const floor = useFloorsStore.getState().floors[0];
    expect(floor?.figures[0]).toMatchObject({ state: FigureState.Idle, level: 3, experiencePoints: 320 });
    expect(floor?.repoStatus.message).toBe('adopted');
    expect(useTasksStore.getState().tasks[0]?.status).toBe(TaskStatus.Failed);
    expect(useRunsStore.getState().intakeStartedFloorIds).toEqual(['saved-floor']);
    expect(useSettingsStore.getState().isMuted).toBe(true);
    expect(window.office.repo.useLocal).toHaveBeenCalledWith('saved-floor', '/tmp/saved');
  });

  it('starts fresh when nothing was saved', async (): Promise<void> => {
    const { result } = renderHook(useHydration);
    await vi.waitFor((): void => expect(result.current.isHydrated).toBe(true));
    expect(result.current.warning).toBeNull();
    expect(useFloorsStore.getState().floors).toHaveLength(0);
  });
});

describe('usePersistence', (): void => {
  it('coalesces store changes into one save and flushes on unmount', (): void => {
    vi.useFakeTimers();
    const { unmount } = renderHook((): void => usePersistence(true));
    act((): void => {
      useSettingsStore.getState().toggleMuted();
      useFloorsStore.getState().createFloor({ name: 'New', source: { kind: FloorSourceKind.Local, path: '/tmp/new' } });
    });
    expect(window.office.state.save).not.toHaveBeenCalled();
    act((): void => void vi.advanceTimersByTime(SAVE_DEBOUNCE_MS));
    expect(window.office.state.save).toHaveBeenCalledTimes(1);
    expect(vi.mocked(window.office.state.save).mock.calls[0]?.[0]).toMatchObject({ version: SNAPSHOT_VERSION, settings: { isMuted: true } });
    act((): void => void useSettingsStore.getState().toggleMuted());
    unmount();
    expect(window.office.state.save).toHaveBeenCalledTimes(2);
    expect(buildSnapshot().floors.map((floor: Floor): string => floor.name)).toEqual(['New']);
  });
});
