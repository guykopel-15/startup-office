import { useCallback, useState } from 'react';

import { defaultFloorName, parseFloorSource } from '@shared/floors';
import { usePickFolder, usePrepareRepo } from '../api/repoQueries';
import { runFloorSetup } from '../store/floorSetup';
import { useFloorsStore } from '../store/floorsStore';

import type { FloorSource } from '@shared/floors';
import type { Floor } from '@shared/floors';
import type { RepoStatus } from '@shared/repo';
import type { PrepareRepoInput } from '../api/repoQueries';

export interface NewFloorForm {
  name: string;
  sourceText: string;
  sourceError: string | undefined;
  /** The floor being set up, once the form was submitted. */
  floor: Floor | null;
  isPickingFolder: boolean;
  setName: (value: string) => void;
  setSourceText: (value: string) => void;
  pickFolder: () => void;
  /** Validates, creates the floor and starts its setup. Returns false when the source is invalid. */
  submit: () => boolean;
  reset: () => void;
}

const INVALID_SOURCE = 'Paste a GitHub URL or an absolute folder path';

/** Form state for the New floor dialog plus the setup kick-off. The floor's progress lives in the store. */
export function useNewFloor(): NewFloorForm {
  const createFloor = useFloorsStore((state): typeof state.createFloor => state.createFloor);
  const floors = useFloorsStore((state): Floor[] => state.floors);
  const prepareRepo = usePrepareRepo();
  const folderPicker = usePickFolder();
  const [name, setName] = useState('');
  const [sourceText, setSourceTextState] = useState('');
  const [sourceError, setSourceError] = useState<string | undefined>(undefined);
  const [floorId, setFloorId] = useState<string | null>(null);

  const setSourceText = (value: string): void => {
    setSourceTextState(value);
    setSourceError(undefined);
  };

  const pickFolder = (): void => {
    folderPicker.mutate(undefined, {
      onSuccess: (path: string | null): void => {
        if (path !== null) setSourceText(path);
      },
    });
  };

  const reset = useCallback((): void => {
    setName('');
    setSourceTextState('');
    setSourceError(undefined);
    setFloorId(null);
  }, []);

  const submit = (): boolean => {
    const source: FloorSource | null = parseFloorSource(sourceText);
    if (source === null) {
      setSourceError(INVALID_SOURCE);
      return false;
    }
    const floor = createFloor({ name: name.trim() === '' ? defaultFloorName(source) : name.trim(), source });
    setFloorId(floor.id);
    const prepare = (id: string, floorSource: FloorSource): Promise<RepoStatus> => prepareRepo.mutateAsync({ floorId: id, source: floorSource } satisfies PrepareRepoInput);
    void runFloorSetup(useFloorsStore.getState(), floor.id, source, prepare);
    return true;
  };

  const floor = floors.find((candidate: Floor): boolean => candidate.id === floorId) ?? null;
  return { name, sourceText, sourceError, floor, isPickingFolder: folderPicker.isPending, setName, setSourceText, pickFolder, submit, reset };
}
