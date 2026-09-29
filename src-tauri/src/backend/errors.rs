//! API errors are codes, never sentences: the frontend owns every user-facing
//! message (src/constants/strings.ts → errors.api). KEEP IN SYNC with
//! server/errors.js; `npm run audit:errors` checks all three.

use serde_json::{json, Value};

use super::limits::LIMITS;

pub const SESSION_EXPIRED: &str = "SESSION_EXPIRED";
pub const OWNER_ONLY: &str = "OWNER_ONLY";
pub const INVALID_USERNAME: &str = "INVALID_USERNAME";
pub const INVALID_DISPLAY_NAME: &str = "INVALID_DISPLAY_NAME";
pub const INVALID_PASSWORD: &str = "INVALID_PASSWORD";
pub const INVALID_NEW_PASSWORD: &str = "INVALID_NEW_PASSWORD";
pub const USERNAME_TAKEN: &str = "USERNAME_TAKEN";
pub const ALREADY_SET_UP: &str = "ALREADY_SET_UP";
pub const CREDENTIALS_REQUIRED: &str = "CREDENTIALS_REQUIRED";
pub const TOO_MANY_ATTEMPTS: &str = "TOO_MANY_ATTEMPTS";
pub const INVALID_CREDENTIALS: &str = "INVALID_CREDENTIALS";
pub const CURRENT_PASSWORD_REQUIRED: &str = "CURRENT_PASSWORD_REQUIRED";
pub const WRONG_CURRENT_PASSWORD: &str = "WRONG_CURRENT_PASSWORD";
pub const PASSWORD_REQUIRED: &str = "PASSWORD_REQUIRED";
pub const WRONG_PASSWORD: &str = "WRONG_PASSWORD";
pub const OWNER_UNDELETABLE: &str = "OWNER_UNDELETABLE";
pub const PROFILE_LIMIT: &str = "PROFILE_LIMIT";
pub const PROFILE_NOT_FOUND: &str = "PROFILE_NOT_FOUND";
pub const AVATAR_TOO_LARGE: &str = "AVATAR_TOO_LARGE";
pub const INVALID_AVATAR: &str = "INVALID_AVATAR";
pub const NO_CHANGES: &str = "NO_CHANGES";
pub const SAVE_FAILED: &str = "SAVE_FAILED";
pub const NOT_FOUND: &str = "NOT_FOUND";
pub const INTERNAL: &str = "INTERNAL";

/// Numbers the frontend puts into the message for codes that mention a limit.
pub fn params(code: &str) -> Option<Value> {
    let l = &*LIMITS;
    match code {
        INVALID_USERNAME => Some(json!({ "min": l.username.min, "max": l.username.max })),
        INVALID_DISPLAY_NAME => Some(json!({ "min": l.display_name.min, "max": l.display_name.max })),
        INVALID_PASSWORD | INVALID_NEW_PASSWORD => Some(json!({ "min": l.password.min, "max": l.password.max })),
        TOO_MANY_ATTEMPTS => Some(json!({ "seconds": l.login.lockout_seconds })),
        PROFILE_LIMIT => Some(json!({ "max": l.max_profiles })),
        _ => None,
    }
}

/// `{ code, params? }`, the same shape `fail()` sends from server/errors.js.
pub fn body(code: &str) -> Value {
    match params(code) {
        Some(p) => json!({ "code": code, "params": p }),
        None => json!({ "code": code }),
    }
}
