import type { TimerPhase } from '../types';

/**
 * The phase chime: a C-major arpeggio, rising when focus ends and falling when
 * a break ends. Synthesized with Web Audio, so there's no sound file to ship.
 */
const CHIME = {
  /** C5, E5, G5 in Hz. */
  notes: [523.25, 659.25, 783.99],
  /** Seconds between notes. */
  step: 0.18,
  attack: 0.04,
  decay: 0.5,
  length: 0.55,
  peakGain: 0.18
};

export function playChime(phase: TimerPhase = 'focus'): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = phase === 'focus' ? CHIME.notes : [...CHIME.notes].reverse();
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + i * CHIME.step;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(CHIME.peakGain, start + CHIME.attack);
      gain.gain.exponentialRampToValueAtTime(0.001, start + CHIME.decay);
      osc.start(start);
      osc.stop(start + CHIME.length);
    });
  } catch {
    // No Web Audio (or autoplay blocked): the chime is a nicety, stay silent.
  }
}
