// @vitest-environment node
import { vi } from 'vitest';

vi.mock('electron', () => ({ BrowserWindow: { getAllWindows: (): unknown[] => [] }, ipcMain: { handle: vi.fn() } }));

import { RepoErrorCode } from '../../shared/repo';
import { ServiceError } from '../../shared/response';
import { parseLoadRepoDto, toErrorResponse } from './repoController';

describe('parseLoadRepoDto', () => {
  it('accepts only an object with a string url', () => {
    expect(parseLoadRepoDto({ url: 'x' })).toEqual({ url: 'x' });
    expect(parseLoadRepoDto({ url: 3 })).toBeNull();
    expect(parseLoadRepoDto('x')).toBeNull();
    expect(parseLoadRepoDto(null)).toBeNull();
  });
});

describe('toErrorResponse', () => {
  it('keeps the service error code and falls back to UNKNOWN', () => {
    expect(toErrorResponse(new ServiceError(RepoErrorCode.CloneFailed, 'boom'))).toEqual({ ok: false, error: { code: RepoErrorCode.CloneFailed, message: 'boom' } });
    expect(toErrorResponse(new Error('other'))).toEqual({ ok: false, error: { code: 'UNKNOWN', message: 'other' } });
  });
});
