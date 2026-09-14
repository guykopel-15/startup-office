// @vitest-environment node
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { vi } from 'vitest';

import type { Mock } from 'vitest';

import { RepoErrorCode, RepoState } from '../../shared/repo';
import { ServiceError } from '../../shared/response';
import { RepoService } from './repoService';

import type { RepoStatus } from '../../shared/repo';
import type { GitRunner } from './gitRunner';

const REPO_URL = 'https://github.com/guykopel-15/startup-office';
const CLONE_FOLDER = 'guykopel-15__startup-office';
let userData = '';

beforeEach(async (): Promise<void> => {
  userData = await mkdtemp(join(tmpdir(), 'startup-office-'));
});

afterEach(async (): Promise<void> => {
  await rm(userData, { recursive: true, force: true });
});

function neverFails(): Mock<GitRunner> {
  return vi.fn<GitRunner>(async (): Promise<void> => undefined);
}

describe('RepoService', () => {
  it('rejects a bad URL without touching git', async (): Promise<void> => {
    const git = neverFails();
    const service = new RepoService(userData, git);
    await expect(service.load('https://gitlab.com/a/b')).rejects.toMatchObject({ code: RepoErrorCode.InvalidUrl });
    expect(git).not.toHaveBeenCalled();
    expect(service.getStatus().state).toBe(RepoState.Idle);
  });

  it('clones a new repo shallowly and reports cloning, progress, then ready', async (): Promise<void> => {
    const git = vi.fn<GitRunner>(async (_gitArguments: readonly string[], _workingDirectory: string | undefined, onLine: (line: string) => void): Promise<void> => onLine('Receiving objects: 100%'));
    const service = new RepoService(userData, git);
    const seen: RepoStatus[] = [];
    service.onStatus((status: RepoStatus): void => {
      seen.push(status);
    });
    const result = await service.load(REPO_URL);
    expect(git).toHaveBeenCalledTimes(1);
    const [gitArguments] = git.mock.calls[0] as Parameters<GitRunner>;
    expect(gitArguments.slice(0, 3)).toEqual(['clone', '--depth', '1']);
    expect(gitArguments).toContain('https://github.com/guykopel-15/startup-office.git');
    expect(seen.map((status: RepoStatus): RepoState => status.state)).toEqual([RepoState.Cloning, RepoState.Cloning, RepoState.Ready]);
    expect(seen[1]?.message).toBe('Receiving objects: 100%');
    expect(result.fullName).toBe('guykopel-15/startup-office');
    expect(result.path).toBe(join(userData, 'repos', CLONE_FOLDER));
  });

  it('pulls instead of cloning when the clone already exists', async (): Promise<void> => {
    await mkdir(join(userData, 'repos', CLONE_FOLDER, '.git'), { recursive: true });
    const git = neverFails();
    const service = new RepoService(userData, git);
    await service.load(REPO_URL);
    const [gitArguments, workingDirectory] = git.mock.calls[0] as Parameters<GitRunner>;
    expect(gitArguments).toEqual(['pull', '--ff-only']);
    expect(workingDirectory).toBe(join(userData, 'repos', CLONE_FOLDER));
  });

  it('falls back to a fresh clone when the pull fails', async (): Promise<void> => {
    const clonePath = join(userData, 'repos', CLONE_FOLDER);
    await mkdir(join(clonePath, '.git'), { recursive: true });
    await writeFile(join(clonePath, 'stale.txt'), 'old');
    const git = vi.fn<GitRunner>(async (gitArguments: readonly string[]): Promise<void> => {
      if (gitArguments[0] === 'pull') throw new ServiceError(RepoErrorCode.CloneFailed, 'diverged');
    });
    const service = new RepoService(userData, git);
    await service.load(REPO_URL);
    expect(git).toHaveBeenCalledTimes(2);
    expect((git.mock.calls[1] as Parameters<GitRunner>)[0][0]).toBe('clone');
    await expect(rm(join(clonePath, 'stale.txt'))).rejects.toThrow();
  });

  it('reports an error state with the git message and removes the half clone when the clone fails', async (): Promise<void> => {
    const git = vi.fn<GitRunner>(async (): Promise<void> => {
      throw new ServiceError(RepoErrorCode.CloneFailed, 'fatal: repository not found');
    });
    const service = new RepoService(userData, git);
    await expect(service.load(REPO_URL)).rejects.toMatchObject({ code: RepoErrorCode.CloneFailed });
    expect(service.getStatus()).toMatchObject({ state: RepoState.Error, message: 'fatal: repository not found' });
  });

  it('refuses a second load while one is running and survives a throwing listener', async (): Promise<void> => {
    let release: () => void = (): void => undefined;
    const git = vi.fn<GitRunner>(
      (): Promise<void> =>
        new Promise<void>((resolve: () => void): void => {
          release = resolve;
        }),
    );
    const service = new RepoService(userData, git);
    service.onStatus((): void => {
      throw new Error('listener bug');
    });
    const first = service.load(REPO_URL);
    await expect(service.load(REPO_URL)).rejects.toMatchObject({ code: RepoErrorCode.Busy });
    await vi.waitFor((): void => expect(git).toHaveBeenCalled());
    release();
    await expect(first).resolves.toMatchObject({ state: RepoState.Ready });
  });
});
