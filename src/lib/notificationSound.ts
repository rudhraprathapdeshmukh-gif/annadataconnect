/**
 * Plays the notification.mp3 sound for all notification alerts.
 * Uses a consistent sound across all devices and user types.
 */
export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {
    // silently fail
  }
};
