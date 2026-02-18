import { getAudioContext } from './audioContext';

/**
 * Plays a distinctive 7-note chime pattern (C5-E5-G5-A5-G5-E5-C5) for nearby donation alerts.
 * Uses the shared AudioContext with mobile resume support.
 */
export const playDonationAlertSound = () => {
  const ctx = getAudioContext();

  const tryPlay = (c: AudioContext) => {
    try {
      const frequencies = [523, 659, 784, 880, 784, 659, 523];
      frequencies.forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const start = c.currentTime + i * 0.5;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
        gain.gain.linearRampToValueAtTime(0, start + 0.4);
        osc.start(start);
        osc.stop(start + 0.45);
      });
    } catch {
      playFallback();
    }
  };

  if (ctx) {
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => tryPlay(ctx)).catch(() => playFallback());
    } else {
      tryPlay(ctx);
    }
    return;
  }

  playFallback();
};

function playFallback() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const frequencies = [523, 659, 784, 880, 784, 659, 523];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const start = ctx.currentTime + i * 0.5;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
      gain.gain.linearRampToValueAtTime(0, start + 0.4);
      osc.start(start);
      osc.stop(start + 0.45);
    });
    // Close context after chime finishes
    setTimeout(() => ctx.close().catch(() => {}), 4000);
  } catch {
    // silently fail
  }
}
