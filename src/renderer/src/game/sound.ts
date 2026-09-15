import { useSettingsStore } from '../store/settingsStore';

/** Tiny chiptune synth on Web Audio: no asset files, every sting is a few oscillator notes. */

interface Note {
  /** Hz */
  frequency: number;
  /** Seconds after the sting starts. */
  at: number;
  /** Seconds. */
  duration: number;
}

type Waveform = 'square' | 'sawtooth' | 'triangle';

interface Sting {
  waveform: Waveform;
  /** Peak gain, 0..1. */
  volume: number;
  notes: readonly Note[];
}

const NOTE_C5 = 523.25;
const NOTE_E5 = 659.25;
const NOTE_G5 = 783.99;
const NOTE_C6 = 1046.5;
const NOTE_A2 = 110;
const NOTE_F2 = 87.31;
const NOTE_G4 = 392;
const NOTE_B4 = 493.88;
const NOTE_D5 = 587.33;
const STEP = 0.09;
const SHORT = 0.12;
const LONG = 0.35;
const ATTACK = 0.01;

const LEVEL_UP: Sting = {
  waveform: 'square',
  volume: 0.08,
  notes: [
    { frequency: NOTE_C5, at: 0, duration: SHORT },
    { frequency: NOTE_E5, at: STEP, duration: SHORT },
    { frequency: NOTE_G5, at: STEP * 2, duration: SHORT },
    { frequency: NOTE_C6, at: STEP * 3, duration: LONG },
  ],
};

const HIT: Sting = {
  waveform: 'sawtooth',
  volume: 0.1,
  notes: [
    { frequency: NOTE_A2, at: 0, duration: SHORT },
    { frequency: NOTE_F2, at: STEP, duration: LONG },
  ],
};

const CHEER: Sting = {
  waveform: 'triangle',
  volume: 0.09,
  notes: [
    { frequency: NOTE_G4, at: 0, duration: LONG },
    { frequency: NOTE_B4, at: 0, duration: LONG },
    { frequency: NOTE_D5, at: 0, duration: LONG },
    { frequency: NOTE_G5, at: STEP * 2, duration: LONG * 2 },
  ],
};

let context: AudioContext | null = null;

/** The one audio context, created on first use so nothing runs before the app is on screen. */
function audioContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

function playNote(target: AudioContext, sting: Sting, note: Note): void {
  const oscillator = target.createOscillator();
  const gain = target.createGain();
  const start = target.currentTime + note.at;
  oscillator.type = sting.waveform;
  oscillator.frequency.setValueAtTime(note.frequency, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(sting.volume, start + ATTACK);
  gain.gain.exponentialRampToValueAtTime(ATTACK, start + note.duration);
  oscillator.connect(gain).connect(target.destination);
  oscillator.start(start);
  oscillator.stop(start + note.duration);
}

function play(sting: Sting): void {
  if (useSettingsStore.getState().isMuted) return;
  const target = audioContext();
  if (target === null) return;
  sting.notes.forEach((note: Note): void => playNote(target, sting, note));
}

export function playLevelUp(): void {
  play(LEVEL_UP);
}

export function playHit(): void {
  play(HIT);
}

export function playCheer(): void {
  play(CHEER);
}
