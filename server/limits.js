// Input limits and auth policy, shared with the frontend and the Rust port.
import limits from '../shared/limits.json' with { type: 'json' };

export const LIMITS = limits;
export const USERNAME_RE = new RegExp(limits.username.pattern);
export const SESSION_TTL_MS = limits.sessionTtlDays * 24 * 3600 * 1000;
export const LOCKOUT_MS = limits.login.lockoutSeconds * 1000;
