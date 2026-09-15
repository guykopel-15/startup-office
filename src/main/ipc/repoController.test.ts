// @vitest-environment node
import { vi } from 'vitest';

import { RepoChannel, RepoErrorCode, RepoState } from '../../shared/repo';
import { ServiceError } from '../../shared/response';
import { handleGetStatus, handleLoadRepo, handleUseLocalRepo, parseFloorDto, parseLoadRepoDto, parseUseLocalRepoDto, registerRepoController, toErrorResponse } from './repoController';

import type { IpcMainInvokeEvent } from 'electron';
import type { RepoService } from '../services/repoService';
import type { IpcRegistrar } from './repoController';

vi.mock('electron', (): Record<string, unknown> => ({ BrowserWindow: { getAllWindows: (): unknown[] => [] }, dialog: { showOpenDialog: vi.fn() }, ipcMain: { handle: vi.fn() } }));

const IDLE = { state: RepoState.Idle, url: null, fullName: null, path: null, message: null };

function fakeService(overrides: Partial<Record<'load' | 'useLocal', unknown>> = {}): RepoService {
  return { load: vi.fn(), useLocal: vi.fn(), getStatus: (): typeof IDLE => IDLE, onStatus: vi.fn(), ...overrides } as unknown as RepoService;
}

describe('DTO parsing', () => {
  it('accepts only objects with the expected string fields', (): void => {
    expect(parseLoadRepoDto({ floorId: 'f', url: 'x' })).toEqual({ floorId: 'f', url: 'x' });
    expect(parseLoadRepoDto({ url: 'x' })).toBeNull();
    expect(parseUseLocalRepoDto({ floorId: 'f', path: '/p' })).toEqual({ floorId: 'f', path: '/p' });
    expect(parseUseLocalRepoDto({ floorId: 'f', path: 3 })).toBeNull();
    expect(parseFloorDto({ floorId: 'f' })).toEqual({ floorId: 'f' });
    expect(parseFloorDto(null)).toBeNull();
  });
});

describe('toErrorResponse', () => {
  it('keeps the service error code and falls back to UNKNOWN', (): void => {
    expect(toErrorResponse(new ServiceError(RepoErrorCode.CloneFailed, 'boom'))).toEqual({ isOk: false, error: { code: RepoErrorCode.CloneFailed, message: 'boom' } });
    expect(toErrorResponse(new Error('other'))).toEqual({ isOk: false, error: { code: 'UNKNOWN', message: 'other' } });
  });
});

describe('handlers', () => {
  it('reject bad DTOs before calling the service', async (): Promise<void> => {
    const service = fakeService();
    expect(await handleLoadRepo(service, { url: 7 })).toMatchObject({ isOk: false, error: { code: RepoErrorCode.InvalidUrl } });
    expect(await handleUseLocalRepo(service, {})).toMatchObject({ isOk: false, error: { code: RepoErrorCode.InvalidPath } });
    expect(handleGetStatus(service, {})).toMatchObject({ isOk: false });
    expect(service.load).not.toHaveBeenCalled();
    expect(service.useLocal).not.toHaveBeenCalled();
  });

  it('wrap the service result and its errors in the standard shape', async (): Promise<void> => {
    const ready = { ...IDLE, state: RepoState.Ready, path: '/p' };
    expect(await handleLoadRepo(fakeService({ load: vi.fn().mockResolvedValue(ready) }), { floorId: 'f', url: 'u' })).toEqual({ isOk: true, data: ready });
    expect(await handleUseLocalRepo(fakeService({ useLocal: vi.fn().mockResolvedValue(ready) }), { floorId: 'f', path: '/p' })).toEqual({ isOk: true, data: ready });
    const failing = vi.fn().mockRejectedValue(new ServiceError(RepoErrorCode.Busy, 'busy'));
    expect(await handleLoadRepo(fakeService({ load: failing }), { floorId: 'f', url: 'u' })).toEqual({ isOk: false, error: { code: RepoErrorCode.Busy, message: 'busy' } });
    expect(handleGetStatus(fakeService(), { floorId: 'f' })).toEqual({ isOk: true, data: IDLE });
  });
});

describe('registerRepoController', () => {
  it('registers every channel, wires the folder picker and subscribes to status pushes', async (): Promise<void> => {
    const registrar: IpcRegistrar = { handle: vi.fn() };
    const service = fakeService();
    registerRepoController(service, registrar, async (): Promise<string | null> => '/picked');
    const calls = (registrar.handle as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.map((call: unknown[]): unknown => call[0])).toEqual([RepoChannel.GetStatus, RepoChannel.Load, RepoChannel.UseLocal, RepoChannel.PickFolder]);
    const pickHandler = calls[3]?.[1] as (event: IpcMainInvokeEvent, payload: unknown) => Promise<unknown>;
    expect(await pickHandler({} as IpcMainInvokeEvent, undefined)).toEqual({ isOk: true, data: '/picked' });
    expect(service.onStatus).toHaveBeenCalledTimes(1);
  });
});
