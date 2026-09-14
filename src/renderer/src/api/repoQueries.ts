import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { IDLE_REPO_STATUS } from '@shared/repo';
import { unwrapResponse } from '@shared/response';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { RepoStatus } from '@shared/repo';

export const REPO_STATUS_QUERY_KEY = ['repo', 'status'] as const;

/**
 * The repo status as main last reported it. Placeholder data keeps the chip rendering
 * while the first fetch is in flight; unlike initial data it never counts as fresh.
 */
export function useRepoStatus(): UseQueryResult<RepoStatus, Error> {
  return useQuery({
    queryKey: REPO_STATUS_QUERY_KEY,
    queryFn: async (): Promise<RepoStatus> => unwrapResponse(await window.office.repo.getStatus()),
    placeholderData: IDLE_REPO_STATUS,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** Keeps the status query in sync with pushes from main while mounted. Mount it once, in App. */
export function useRepoStatusSubscription(): void {
  const queryClient = useQueryClient();
  useEffect((): (() => void) => {
    return window.office.repo.onStatus((status: RepoStatus): void => {
      // A push is always newer than an in-flight getStatus; cancel that fetch so it cannot overwrite the push.
      void queryClient.cancelQueries({ queryKey: REPO_STATUS_QUERY_KEY });
      queryClient.setQueryData(REPO_STATUS_QUERY_KEY, status);
    });
  }, [queryClient]);
}

/** Clones the repo; loading, error and data all live on the mutation. */
export function useLoadRepo(): UseMutationResult<RepoStatus, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (url: string): Promise<RepoStatus> => unwrapResponse(await window.office.repo.load(url)),
    onSuccess: (status: RepoStatus): void => {
      queryClient.setQueryData(REPO_STATUS_QUERY_KEY, status);
    },
  });
}
