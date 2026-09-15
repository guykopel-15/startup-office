import { vi } from 'vitest';

import { useSettingsStore } from '../store/settingsStore';
import { playHit, playLevelUp } from './sound';

const oscillator = { type: '', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn().mockReturnThis(), start: vi.fn(), stop: vi.fn() };
const gain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn().mockReturnThis() };
const fakeContext = { state: 'running', currentTime: 0, destination: {}, resume: vi.fn(), createOscillator: vi.fn((): object => oscillator), createGain: vi.fn((): object => gain) };
const AudioContextMock = vi.fn(function FakeAudioContext(): object {
  return fakeContext;
});

beforeEach((): void => {
  vi.stubGlobal('AudioContext', AudioContextMock);
  AudioContextMock.mockClear();
  oscillator.start.mockClear();
});

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe('sound', (): void => {
  it('plays every note of a sting once and stays quiet while muted', (): void => {
    useSettingsStore.setState({ isMuted: true });
    playLevelUp();
    expect(oscillator.start).not.toHaveBeenCalled();
    useSettingsStore.setState({ isMuted: false });
    playLevelUp();
    expect(oscillator.start).toHaveBeenCalledTimes(4);
    playHit();
    expect(oscillator.start).toHaveBeenCalledTimes(6);
    expect(AudioContextMock).toHaveBeenCalledTimes(1);
  });
});
