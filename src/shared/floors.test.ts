import { FloorSourceKind, defaultFloorName, parseFloorSource } from './floors';
import { parseGitProgress } from './repo';

describe('parseFloorSource', () => {
  it('turns a GitHub URL into a clone source and a path into a local source', (): void => {
    expect(parseFloorSource('https://github.com/guykopel-15/startup-office')).toEqual({ kind: FloorSourceKind.GitHub, url: 'https://github.com/guykopel-15/startup-office.git' });
    expect(parseFloorSource(' /Users/me/code/loop ')).toEqual({ kind: FloorSourceKind.Local, path: '/Users/me/code/loop' });
    expect(parseFloorSource('~/code/loop')).toEqual({ kind: FloorSourceKind.Local, path: '~/code/loop' });
    expect(parseFloorSource('C:\\code\\loop')).toEqual({ kind: FloorSourceKind.Local, path: 'C:\\code\\loop' });
  });

  it('rejects relative paths and other URLs', (): void => {
    expect(parseFloorSource('code/loop')).toBeNull();
    expect(parseFloorSource('https://gitlab.com/a/b')).toBeNull();
    expect(parseFloorSource('')).toBeNull();
  });
});

describe('defaultFloorName', () => {
  it('uses the repo name or the folder name', (): void => {
    expect(defaultFloorName({ kind: FloorSourceKind.GitHub, url: 'https://github.com/a/my-app.git' })).toBe('my-app');
    expect(defaultFloorName({ kind: FloorSourceKind.Local, path: '/Users/me/code/loop/' })).toBe('loop');
  });
});

describe('parseGitProgress', () => {
  it('reads the percentage out of a git progress line', (): void => {
    expect(parseGitProgress('Receiving objects:  45% (90/200)')).toBeCloseTo(0.45);
    expect(parseGitProgress('Cloning into ...')).toBeNull();
    expect(parseGitProgress(null)).toBeNull();
  });
});
