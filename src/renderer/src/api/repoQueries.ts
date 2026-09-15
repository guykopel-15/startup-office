import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';

import { FloorSourceKind } from '@shared/floors';
import { unwrapResponse } from '@shared/response';
import { useFloorsStore } from '../store/floorsStore';

import type { UseMutationResult } from '@tanstack/react-query';
import type { FloorSource } from '@shared/floors';
import type { RepoStatus, RepoStatusEvent } from '@shared/repo';

export interface PrepareRepoInput {
  floorId: string;
  source: FloorSource;
}

/** Applies status pushes from main to the floor they belong to. Mount it once, in App. */
export function useRepoStatusSubscription(): void {
  const setRepoStatus = useFloorsStore((state): typeof state.setRepoStatus => state.setRepoStatus);
  useEffect((): (() => void) => window.office.repo.onStatus((event: RepoStatusEvent): void => setRepoStatus(event.floorId, event.status)), [setRepoStatus]);
}

/** Clones a GitHub repo or adopts a local folder for a floor. */
export async function prepareRepo(input: PrepareRepoInput): Promise<RepoStatus> {
  if (input.source.kind === FloorSourceKind.GitHub) return unwrapResponse(await window.office.repo.load(input.floorId, input.source.url));
  return unwrapResponse(await window.office.repo.useLocal(input.floorId, input.source.path));
}

/** Clones a GitHub repo or adopts a local folder for a floor; loading, error and data live on the mutation. */
export function usePrepareRepo(): UseMutationResult<RepoStatus, Error, PrepareRepoInput> {
  return useMutation({ mutationFn: prepareRepo });
}

/** Opens the native folder picker; resolves to the chosen path or null. */
export function usePickFolder(): UseMutationResult<string | null, Error, void> {
  return useMutation({ mutationFn: async (): Promise<string | null> => unwrapResponse(await window.office.repo.pickFolder()) });
}
