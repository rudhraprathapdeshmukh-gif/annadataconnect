import { getAudioContext } from './audioContext';

/**
 * Plays a short two-tone popup "ding" sound.
 * Tries AudioContext first, then falls back to Audio element for mobile compatibility.
 */
export const playNotificationSound = () => {
  const ctx = getAudioContext();

  if (ctx) {
    // Always try to resume — mobile suspends between gestures
    const tryPlay = () => {
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
      } catch {
        playFallback();
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => tryPlay()).catch(() => playFallback());
    } else {
      tryPlay();
    }
    return;
  }

  playFallback();
};

function playFallback() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    osc.onended = () => ctx.close();
  } catch {
    // silently fail
  }
}
