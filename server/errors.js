// API errors are codes, never sentences: the frontend owns every user-facing
// message (src/constants/strings.ts → errors.api). KEEP IN SYNC with
// src-tauri/src/backend/errors.rs; `npm run audit:errors` checks all three.
import { LIMITS } from './limits.js';

export const E = {
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  OWNER_ONLY: 'OWNER_ONLY',
  INVALID_USERNAME: 'INVALID_USERNAME',
  INVALID_DISPLAY_NAME: 'INVALID_DISPLAY_NAME',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  INVALID_NEW_PASSWORD: 'INVALID_NEW_PASSWORD',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  ALREADY_SET_UP: 'ALREADY_SET_UP',
  CREDENTIALS_REQUIRED: 'CREDENTIALS_REQUIRED',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  CURRENT_PASSWORD_REQUIRED: 'CURRENT_PASSWORD_REQUIRED',
  WRONG_CURRENT_PASSWORD: 'WRONG_CURRENT_PASSWORD',
  PASSWORD_REQUIRED: 'PASSWORD_REQUIRED',
  WRONG_PASSWORD: 'WRONG_PASSWORD',
  OWNER_UNDELETABLE: 'OWNER_UNDELETABLE',
  PROFILE_LIMIT: 'PROFILE_LIMIT',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  AVATAR_TOO_LARGE: 'AVATAR_TOO_LARGE',
  INVALID_AVATAR: 'INVALID_AVATAR',
  NO_CHANGES: 'NO_CHANGES',
  SAVE_FAILED: 'SAVE_FAILED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL: 'INTERNAL'
};

/** Numbers the frontend puts into the message for codes that mention a limit. */
export const PARAMS = {
  INVALID_USERNAME: { min: LIMITS.username.min, max: LIMITS.username.max },
  INVALID_DISPLAY_NAME: { min: LIMITS.displayName.min, max: LIMITS.displayName.max },
  INVALID_PASSWORD: { min: LIMITS.password.min, max: LIMITS.password.max },
  INVALID_NEW_PASSWORD: { min: LIMITS.password.min, max: LIMITS.password.max },
  TOO_MANY_ATTEMPTS: { seconds: LIMITS.login.lockoutSeconds },
  PROFILE_LIMIT: { max: LIMITS.maxProfiles }
};

/** Sends `{ code, params? }` with the given status. */
export function fail(res, status, code) {
  const params = PARAMS[code];
  return res.status(status).json(params ? { code, params } : { code });
}

/** Throwable form, for helpers that run inside a route. */
export class ApiFailure extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
