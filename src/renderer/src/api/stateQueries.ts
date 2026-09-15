import { useEffect, useRef, useState } from 'react';

import { SNAPSHOT_VERSION, settleSnapshot } from '@shared/persistence';
import { unwrapResponse } from '@shared/response';
import { useFloorsStore } from '../store/floorsStore';
import { useRunsStore } from '../store/runsStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSprintsStore } from '../store/sprintsStore';
import { useTasksStore } from '../store/tasksStore';
import { prepareRepo } from './repoQueries';

import type { Floor } from '@shared/floors';
import type { Snapshot } from '@shared/persistence';

export interface Hydration {
  /** True once the saved office is in the stores (or there was nothing saved). */
  isHydrated: boolean;
  /** A problem with the saved file, worth telling the player once. */
  warning: string | null;
}

/** Saves are coalesced: a burst of store changes becomes one write. */
export const SAVE_DEBOUNCE_MS = 500;
const RESTORE_REPO_FAILED = 'repository could not be restored';

/** The office as the stores hold it now. */
export function buildSnapshot(): Snapshot {
  const floors = useFloorsStore.getState();
  const tasks = useTasksStore.getState();
  return {
    version: SNAPSHOT_VERSION,
    savedAt: new Date().toISOString(),
    floors: floors.floors,
    activeFloorId: floors.activeFloorId,
    tasks: tasks.tasks,
    messages: tasks.messages,
    sprints: useSprintsStore.getState().sprints,
    intakeStartedFloorIds: useRunsStore.getState().intakeStartedFloorIds,
    settings: { isMuted: useSettingsStore.getState().isMuted },
  };
}

/** Puts a settled snapshot into the stores. Intake ids go first so no floor starts a fresh intake while the floors land. */
export function hydrateStores(snapshot: Snapshot): void {
  useSettingsStore.setState({ isMuted: snapshot.settings.isMuted });
  useRunsStore.setState({ runs: [], intakeStartedFloorIds: snapshot.intakeStartedFloorIds });
  useTasksStore.setState({ tasks: snapshot.tasks, messages: snapshot.messages });
  useSprintsStore.setState({ sprints: snapshot.sprints });
  useFloorsStore.setState({ floors: snapshot.floors, activeFloorId: snapshot.activeFloorId });
}

/** Main knows nothing about repos after a restart: adopt each floor's folder (or refresh its clone) again. */
async function restoreRepos(floors: readonly Floor[]): Promise<void> {
  await Promise.all(
    floors.map(async (floor: Floor): Promise<void> => {
      try {
        useFloorsStore.getState().setRepoStatus(floor.id, await prepareRepo({ floorId: floor.id, source: floor.source }));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : RESTORE_REPO_FAILED;
        useFloorsStore.getState().setRepoStatus(floor.id, { ...floor.repoStatus, path: null, message });
      }
    }),
  );
}

/** Loads the saved office once, on mount. */
export function useHydration(): Hydration {
  const [hydration, setHydration] = useState<Hydration>({ isHydrated: false, warning: null });
  useEffect((): void => {
    void window.office.state
      .load()
      .then(async (response): Promise<void> => {
        const result = unwrapResponse(response);
        if (result.snapshot !== null) {
          const settled = settleSnapshot(result.snapshot);
          hydrateStores(settled);
          await restoreRepos(settled.floors);
        }
        setHydration({ isHydrated: true, warning: result.warning });
      })
      .catch((error: Error): void => setHydration({ isHydrated: true, warning: error.message }));
  }, []);
  return hydration;
}

/** After hydration, every store change schedules one save; a page unload flushes it. */
export function usePersistence(isHydrated: boolean): void {
  const timerRef = useRef<number | null>(null);
  useEffect((): (() => void) | undefined => {
    if (!isHydrated) return undefined;
    const save = (): void => {
      timerRef.current = null;
      void window.office.state.save(buildSnapshot());
    };
    const schedule = (): void => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(save, SAVE_DEBOUNCE_MS);
    };
    const flush = (): void => {
      if (timerRef.current !== null) save();
    };
    const unsubscribes = [useFloorsStore.subscribe(schedule), useTasksStore.subscribe(schedule), useSprintsStore.subscribe(schedule), useRunsStore.subscribe(schedule), useSettingsStore.subscribe(schedule)];
    window.addEventListener('pagehide', flush);
    return (): void => {
      unsubscribes.forEach((unsubscribe: () => void): void => unsubscribe());
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [isHydrated]);
}
