import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { IDLE_REPO_STATUS } from '@shared/repo';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { RepoStatus } from '@shared/repo';
import type { ApiResponse } from '@shared/response';

export const REPO_STATUS_QUERY_KEY = ['repo', 'status'] as const;

/** Thrown by hooks when main answers with an error response. */
export class RepoRequestError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'RepoRequestError';
    this.code = code;
  }
}

function unwrap<Data>(response: ApiResponse<Data>): Data {
  if (response.ok) return response.data;
  throw new RepoRequestError(response.error.code, response.error.message);
}

/** The repo status as main last reported it. */
export function useRepoStatus(): UseQueryResult<RepoStatus, Error> {
  return useQuery({
    queryKey: REPO_STATUS_QUERY_KEY,
    queryFn: async (): Promise<RepoStatus> => unwrap(await window.office.repo.getStatus()),
    initialData: IDLE_REPO_STATUS,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** Keeps the status query in sync with pushes from main while mounted. */
export function useRepoStatusSubscription(): void {
  const queryClient = useQueryClient();
  useEffect((): (() => void) => {
    return window.office.repo.onStatus((status: RepoStatus): void => {
      queryClient.setQueryData(REPO_STATUS_QUERY_KEY, status);
    });
  }, [queryClient]);
}

/** Clones the repo; loading, error and data all live on the mutation. */
export function useLoadRepo(): UseMutationResult<RepoStatus, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (url: string): Promise<RepoStatus> => unwrap(await window.office.repo.load(url)),
    onSuccess: (status: RepoStatus): void => {
      queryClient.setQueryData(REPO_STATUS_QUERY_KEY, status);
    },
  });
}
