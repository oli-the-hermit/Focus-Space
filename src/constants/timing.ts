/**
 * App timing in milliseconds. Timers that wait for a CSS animation don't belong
 * here: they read the motion token instead (cssDurationMs('--dur-2') in lib/theme).
 */
export const TIMING = {
  /** How long a toast stays before it slides out. */
  toastVisibleMs: 3500,
  /** How long an in-place "Saved" note stays (e.g. after editing a goal's description). */
  savedNoteMs: 3000,
  /** The bell's dot clears itself this long after the last toast, so it never lingers. */
  bellDotMs: 60_000,
  /** How long the bell button rings after a phase ends. */
  alertRingingMs: 4000,
  /** How often upcoming calendar sessions are checked for reminders. */
  eventCheckMs: 30_000,
  /** Quiet period before changes are encrypted and saved. */
  saveDebounceMs: 800,
  /** Delay before the first-run tour starts, so the app has painted first. */
  tourStartDelayMs: 600,
  /** Retry interval while the local API isn't reachable yet. */
  serverRetryMs: 3000,
  /** How often a running timer checks its end time (it ticks from a worker, so hidden tabs stay on time). */
  timerTickMs: 500,
  /** Mini player clock refresh. */
  miniClockTickMs: 250,
  /** The desktop alert window closes itself if no alert reaches it by then. */
  islandEmptyCloseMs: 4000
} as const;
