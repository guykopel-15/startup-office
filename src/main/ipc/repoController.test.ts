// @vitest-environment node
import { vi } from 'vitest';

import { RepoChannel, RepoErrorCode, RepoState } from '../../shared/repo';
import { ServiceError } from '../../shared/response';
import { handleLoadRepo, parseLoadRepoDto, registerRepoController, toErrorResponse } from './repoController';

import type { IpcMainInvokeEvent } from 'electron';
import type { RepoService } from '../services/repoService';
import type { IpcRegistrar } from './repoController';

vi.mock('electron', (): Record<string, unknown> => ({ BrowserWindow: { getAllWindows: (): unknown[] => [] }, ipcMain: { handle: vi.fn() } }));

function fakeService(load: RepoService['load']): RepoService {
  return { load, getStatus: (): ReturnType<RepoService['getStatus']> => ({ state: RepoState.Idle, url: null, fullName: null, path: null, message: null }), onStatus: vi.fn() } as unknown as RepoService;
}

describe('parseLoadRepoDto', () => {
  it('accepts only an object with a string url', (): void => {
    expect(parseLoadRepoDto({ url: 'x' })).toEqual({ url: 'x' });
    expect(parseLoadRepoDto({ url: 3 })).toBeNull();
    expect(parseLoadRepoDto('x')).toBeNull();
    expect(parseLoadRepoDto(null)).toBeNull();
  });
});

describe('toErrorResponse', () => {
  it('keeps the service error code and falls back to UNKNOWN', (): void => {
    expect(toErrorResponse(new ServiceError(RepoErrorCode.CloneFailed, 'boom'))).toEqual({ isOk: false, error: { code: RepoErrorCode.CloneFailed, message: 'boom' } });
    expect(toErrorResponse(new Error('other'))).toEqual({ isOk: false, error: { code: 'UNKNOWN', message: 'other' } });
  });
});

describe('handleLoadRepo', () => {
  it('rejects a bad DTO before calling the service', async (): Promise<void> => {
    const load = vi.fn();
    const response = await handleLoadRepo(fakeService(load), { url: 7 });
    expect(response).toMatchObject({ isOk: false, error: { code: RepoErrorCode.InvalidUrl } });
    expect(load).not.toHaveBeenCalled();
  });

  it('wraps the service result and its errors in the standard shape', async (): Promise<void> => {
    const ready = { state: RepoState.Ready, url: 'u', fullName: 'a/b', path: '/p', message: null };
    expect(await handleLoadRepo(fakeService(vi.fn().mockResolvedValue(ready)), { url: 'u' })).toEqual({ isOk: true, data: ready });
    const failing = vi.fn().mockRejectedValue(new ServiceError(RepoErrorCode.Busy, 'busy'));
    expect(await handleLoadRepo(fakeService(failing), { url: 'u' })).toEqual({ isOk: false, error: { code: RepoErrorCode.Busy, message: 'busy' } });
  });
});

describe('registerRepoController', () => {
  it('registers both channels and subscribes to status pushes', (): void => {
    const registrar: IpcRegistrar = { handle: vi.fn() };
    const service = fakeService(vi.fn());
    registerRepoController(service, registrar);
    const channels = (registrar.handle as ReturnType<typeof vi.fn>).mock.calls.map((call: unknown[]): unknown => call[0]);
    expect(channels).toEqual([RepoChannel.GetStatus, RepoChannel.Load]);
    expect(service.onStatus).toHaveBeenCalledTimes(1);
    const getStatusHandler = (registrar.handle as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as (event: IpcMainInvokeEvent, payload: unknown) => unknown;
    expect(getStatusHandler({} as IpcMainInvokeEvent, undefined)).toMatchObject({ isOk: true, data: { state: RepoState.Idle } });
  });
});
