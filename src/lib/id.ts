/** Short unique id for app data (sessions, tasks, goals…): time-based plus random. */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
