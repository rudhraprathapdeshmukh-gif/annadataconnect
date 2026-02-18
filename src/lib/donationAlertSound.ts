import { getAudioContext } from './audioContext';

/**
 * Plays a distinctive 5-second chime pattern for donation alerts.
 * Uses the shared AudioContext (warmed on first user gesture) for mobile compatibility.
 * Falls back to the notification.mp3 Audio element if AudioContext is unavailable.
 */
export const playDonationAlertSound = () => {
  const ctx = getAudioContext();

  if (ctx && ctx.state === 'running') {
    try {
      const frequencies = [523, 659, 784, 880, 784, 659, 523];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.7);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.7 + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.7 + 0.5);
        osc.start(ctx.currentTime + i * 0.7);
        osc.stop(ctx.currentTime + i * 0.7 + 0.55);
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
