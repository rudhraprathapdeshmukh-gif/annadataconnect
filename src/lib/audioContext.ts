/**
 * Shared AudioContext that is "warmed up" on the user's first interaction.
 * Mobile browsers require AudioContext to be created/resumed during a user gesture.
 * By creating it once on first tap/click, all later playback calls succeed.
 */

let audioCtx: AudioContext | null = null;
let initialized = false;

function warmUp() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return;
  }
  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    // Browser doesn't support AudioContext
  }
}

function attachListeners() {
  if (initialized) return;
  initialized = true;

  const events = ['click', 'touchstart', 'keydown'] as const;
  const handler = () => {
    warmUp();
    // Keep listener active — resume may be needed after the context suspends again
  };
  events.forEach((evt) => document.addEventListener(evt, handler, { passive: true }));
}

// Kick off listener attachment immediately on import
attachListeners();

/**
 * Returns the shared AudioContext, or null if not yet available.
 * Callers should handle the null case gracefully (e.g. skip sound or use Audio fallback).
 */
export function getAudioContext(): AudioContext | null {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}
