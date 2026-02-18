import { getAudioContext } from './audioContext';

/**
 * Plays a short two-tone popup "ding" sound.
 * Uses the shared AudioContext (warmed on first user gesture) for mobile compatibility.
 * Falls back to an Audio element if AudioContext is unavailable.
 */
export const playNotificationSound = () => {
  const ctx = getAudioContext();

  if (ctx && ctx.state === 'running') {
    try {
      const notes = [523, 659]; // C5 -> E5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const start = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
        gain.gain.linearRampToValueAtTime(0, start + 0.25);
        osc.start(start);
        osc.stop(start + 0.3);
      });
      return;
    } catch {
      // fall through to Audio fallback
    }
  }

  // Fallback: play the bundled mp3
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {
    // silently fail
  }
};
