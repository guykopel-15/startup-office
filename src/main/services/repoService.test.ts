// @vitest-environment node
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { vi } from 'vitest';

import { RepoErrorCode, RepoState } from '../../shared/repo';
import { ServiceError } from '../../shared/response';
import { RepoService } from './repoService';

import type { RepoStatus } from '../../shared/repo';
import type { GitRunner } from './repoService';

const URL = 'https://github.com/guykopel-15/startup-office';
let userData = '';

beforeEach(async (): Promise<void> => {
  userData = await mkdtemp(join(tmpdir(), 'startup-office-'));
});

afterEach(async (): Promise<void> => {
  await rm(userData, { recursive: true, force: true });
});

describe('RepoService', () => {
  it('rejects a bad URL without touching git', async () => {
    const git = vi.fn<GitRunner>();
    const service = new RepoService(userData, git);
    await expect(service.load('https://gitlab.com/a/b')).rejects.toMatchObject({ code: RepoErrorCode.InvalidUrl });
    expect(git).not.toHaveBeenCalled();
    expect(service.getStatus().state).toBe(RepoState.Idle);
  });

  it('clones a new repo shallowly and reports cloning, progress, then ready', async () => {
    const git = vi.fn<GitRunner>(async (_args, _cwd, onLine): Promise<void> => onLine('Receiving objects: 100%'));
    const service = new RepoService(userData, git);
    const seen: RepoStatus[] = [];
    service.onStatus((status: RepoStatus): void => {
      seen.push(status);
    });
    const result = await service.load(URL);
    expect(git).toHaveBeenCalledTimes(1);
    const [args] = git.mock.calls[0] as Parameters<GitRunner>;
    expect(args.slice(0, 3)).toEqual(['clone', '--depth', '1']);
    expect(args).toContain('https://github.com/guykopel-15/startup-office.git');
    expect(seen.map((status: RepoStatus): RepoState => status.state)).toEqual([RepoState.Cloning, RepoState.Cloning, RepoState.Ready]);
    expect(seen[1]?.message).toBe('Receiving objects: 100%');
    expect(result.fullName).toBe('guykopel-15/startup-office');
    expect(result.path).toBe(join(userData, 'repos', 'guykopel-15__startup-office'));
  });

  it('pulls instead of cloning when the clone already exists', async () => {
    await mkdir(join(userData, 'repos', 'guykopel-15__startup-office', '.git'), { recursive: true });
    const git = vi.fn<GitRunner>(async (): Promise<void> => undefined);
    const service = new RepoService(userData, git);
    await service.load(URL);
    const [args, cwd] = git.mock.calls[0] as Parameters<GitRunner>;
    expect(args).toEqual(['pull', '--ff-only']);
    expect(cwd).toBe(join(userData, 'repos', 'guykopel-15__startup-office'));
  });

  it('reports an error state with the git message when the clone fails', async () => {
    const git = vi.fn<GitRunner>(async (): Promise<void> => {
      throw new ServiceError(RepoErrorCode.CloneFailed, 'fatal: repository not found');
    });
    const service = new RepoService(userData, git);
    await expect(service.load(URL)).rejects.toMatchObject({ code: RepoErrorCode.CloneFailed });
    expect(service.getStatus()).toMatchObject({ state: RepoState.Error, message: 'fatal: repository not found' });
  });

  it('refuses a second load while one is running', async () => {
    let release: () => void = (): void => undefined;
    const git = vi.fn<GitRunner>((): Promise<void> => new Promise<void>((resolve: () => void): void => {
      release = resolve;
    }));
    const service = new RepoService(userData, git);
    const first = service.load(URL);
    await expect(service.load(URL)).rejects.toMatchObject({ code: RepoErrorCode.Busy });
    await vi.waitFor((): void => expect(git).toHaveBeenCalled());
    release();
    await first;
  });
});
