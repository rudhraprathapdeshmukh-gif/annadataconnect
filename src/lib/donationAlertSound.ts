/**
 * Plays a distinctive 5-second chime pattern for donation alerts
 * using the Web Audio API (no external audio file needed).
 */
export const playDonationAlertSound = () => {
  try {
    const ctx = new AudioContext();
    // Musical chime pattern: C5-E5-G5-A5-G5-E5-C5 repeated
    const frequencies = [523, 659, 784, 880, 784, 659, 523];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      // Fade in/out for smoother sound
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.7);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.7 + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.7 + 0.5);
      osc.start(ctx.currentTime + i * 0.7);
      osc.stop(ctx.currentTime + i * 0.7 + 0.55);
    });
  } catch (e) {
    console.error('Failed to play donation alert sound:', e);
  }
};
