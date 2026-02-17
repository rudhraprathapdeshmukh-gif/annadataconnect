/**
 * Plays a short two-tone popup "ding" sound using the Web Audio API.
 * Works reliably on mobile where new Audio() often fails due to autoplay restrictions.
 */
export const playNotificationSound = () => {
  try {
    const ctx = new AudioContext();
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
  } catch (e) {
    console.error('Failed to play notification sound:', e);
  }
};
