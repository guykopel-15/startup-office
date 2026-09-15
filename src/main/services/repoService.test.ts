// @vitest-environment node
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { vi } from 'vitest';

import { RepoErrorCode, RepoState } from '../../shared/repo';
import { ServiceError } from '../../shared/response';
import { RepoService, expandPath } from './repoService';

import type { Mock } from 'vitest';
import type { RepoStatusEvent } from '../../shared/repo';
import type { GitRunner } from './gitRunner';

const REPO_URL = 'https://github.com/guykopel-15/startup-office';
const CLONE_FOLDER = 'guykopel-15__startup-office';
const FLOOR = 'floor-1';
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

describe('expandPath', () => {
  it('expands ~ and resolves relative paths', (): void => {
    expect(expandPath('~/code')).toBe(join(homedir(), 'code'));
    expect(expandPath('/tmp/x')).toBe('/tmp/x');
  });
});

describe('RepoService', () => {
  it('rejects a bad URL without touching git', async (): Promise<void> => {
    const git = neverFails();
    const service = new RepoService(userData, git);
    await expect(service.load(FLOOR, 'https://gitlab.com/a/b')).rejects.toMatchObject({ code: RepoErrorCode.InvalidUrl });
    expect(git).not.toHaveBeenCalled();
    expect(service.getStatus(FLOOR).state).toBe(RepoState.Idle);
  });

  it('uses a local folder in place and rejects a missing one', async (): Promise<void> => {
    const service = new RepoService(userData, neverFails());
    const status = await service.useLocal(FLOOR, userData);
    expect(status).toMatchObject({ state: RepoState.Ready, path: userData, url: null });
    await expect(service.useLocal(FLOOR, join(userData, 'nope'))).rejects.toMatchObject({ code: RepoErrorCode.InvalidPath });
  });

  it('clones a new repo shallowly and reports cloning, progress, then ready, tagged with the floor', async (): Promise<void> => {
    const git = vi.fn<GitRunner>(async (_gitArguments: readonly string[], _workingDirectory: string | undefined, onLine: (line: string) => void): Promise<void> => onLine('Receiving objects: 100%'));
    const service = new RepoService(userData, git);
    const seen: RepoStatusEvent[] = [];
    service.onStatus((event: RepoStatusEvent): void => {
      seen.push(event);
    });
    const result = await service.load(FLOOR, REPO_URL);
    const [gitArguments] = git.mock.calls[0] as Parameters<GitRunner>;
    expect(gitArguments.slice(0, 3)).toEqual(['clone', '--depth', '1']);
    expect(seen.every((event: RepoStatusEvent): boolean => event.floorId === FLOOR)).toBe(true);
    expect(seen.map((event: RepoStatusEvent): RepoState => event.status.state)).toEqual([RepoState.Cloning, RepoState.Cloning, RepoState.Ready]);
    expect(result.path).toBe(join(userData, 'repos', CLONE_FOLDER));
  });

  it('keeps statuses apart per floor', async (): Promise<void> => {
    const service = new RepoService(userData, neverFails());
    await service.load('a', REPO_URL);
    expect(service.getStatus('a').state).toBe(RepoState.Ready);
    expect(service.getStatus('b').state).toBe(RepoState.Idle);
  });

  it('pulls instead of cloning when the clone already exists', async (): Promise<void> => {
    await mkdir(join(userData, 'repos', CLONE_FOLDER, '.git'), { recursive: true });
    const git = neverFails();
    await new RepoService(userData, git).load(FLOOR, REPO_URL);
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
    await new RepoService(userData, git).load(FLOOR, REPO_URL);
    expect(git).toHaveBeenCalledTimes(2);
    await expect(rm(join(clonePath, 'stale.txt'))).rejects.toThrow();
  });

  it('reports an error state with the git message when the clone fails', async (): Promise<void> => {
    const git = vi.fn<GitRunner>(async (): Promise<void> => {
      throw new ServiceError(RepoErrorCode.CloneFailed, 'fatal: repository not found');
    });
    const service = new RepoService(userData, git);
    await expect(service.load(FLOOR, REPO_URL)).rejects.toMatchObject({ code: RepoErrorCode.CloneFailed });
    expect(service.getStatus(FLOOR)).toMatchObject({ state: RepoState.Error, message: 'fatal: repository not found' });
  });

  it('refuses a second clone while one is running and survives a throwing listener', async (): Promise<void> => {
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
    const first = service.load(FLOOR, REPO_URL);
    await expect(service.load('other', REPO_URL)).rejects.toMatchObject({ code: RepoErrorCode.Busy });
    await vi.waitFor((): void => expect(git).toHaveBeenCalled());
    release();
    await expect(first).resolves.toMatchObject({ state: RepoState.Ready });
  });
});
