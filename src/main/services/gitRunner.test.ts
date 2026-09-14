// @vitest-environment node
import { RepoErrorCode } from '../../shared/repo';
import { LineSplitter, runGit } from './gitRunner';

describe('LineSplitter', () => {
  it('joins a line split across chunks and reports the last non-empty line', (): void => {
    const splitter = new LineSplitter();
    const seen: string[] = [];
    const collect = (line: string): void => {
      seen.push(line);
    };
    splitter.push('Receiving obj', collect);
    splitter.push('ects: 50%\rReceiving objects: 100%\n\n', collect);
    expect(seen).toEqual(['Receiving objects: 50%', 'Receiving objects: 100%']);
    splitter.push('fatal: not found', collect);
    expect(splitter.finish(collect)).toBe('fatal: not found');
    expect(seen).toHaveLength(3);
  });
});

describe('runGit', () => {
  it('resolves on a successful command and streams its output', async (): Promise<void> => {
    const lines: string[] = [];
    await runGit(['--version'], undefined, (line: string): void => {
      lines.push(line);
    });
    expect(lines.join(' ')).toContain('git version');
  });

  it('rejects with the last output line when git fails', async (): Promise<void> => {
    await expect(runGit(['definitely-not-a-git-command'], undefined, (): void => undefined)).rejects.toMatchObject({ code: RepoErrorCode.CloneFailed });
  });
});
