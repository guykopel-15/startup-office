import { parseGitHubUrl } from './repo';

describe('parseGitHubUrl', () => {
  it('accepts the common GitHub URL spellings', (): void => {
    const expected = { owner: 'guykopel-15', name: 'startup-office', cloneUrl: 'https://github.com/guykopel-15/startup-office.git' };
    expect(parseGitHubUrl('https://github.com/guykopel-15/startup-office')).toEqual(expected);
    expect(parseGitHubUrl('https://github.com/guykopel-15/startup-office.git')).toEqual(expected);
    expect(parseGitHubUrl('  https://www.github.com/guykopel-15/startup-office/  ')).toEqual(expected);
    expect(parseGitHubUrl('https://GitHub.com/guykopel-15/startup-office?tab=readme#top')).toEqual(expected);
  });

  it('rejects anything that is not a plain https GitHub repository URL', (): void => {
    expect(parseGitHubUrl('http://github.com/a/b')).toBeNull();
    expect(parseGitHubUrl('https://gitlab.com/a/b')).toBeNull();
    expect(parseGitHubUrl('https://github.com/a')).toBeNull();
    expect(parseGitHubUrl('https://github.com/a/b/tree/main')).toBeNull();
    expect(parseGitHubUrl('https://github.com/a/..')).toBeNull();
    expect(parseGitHubUrl('https://github.com/../b')).toBeNull();
    expect(parseGitHubUrl('https://token@github.com/a/b')).toBeNull();
    expect(parseGitHubUrl('https://github.com:8443/a/b')).toBeNull();
    expect(parseGitHubUrl('git@github.com:a/b.git')).toBeNull();
    expect(parseGitHubUrl('not a url')).toBeNull();
  });
});
