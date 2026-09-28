/**
 * Input limits shared with both backends (see shared/limits.json). Use these for
 * maxLength, client-side checks and the numbers inside messages.
 */
import limits from '../../shared/limits.json';

export const LIMITS = limits;

export const USERNAME_PATTERN = new RegExp(limits.username.pattern);
