//! Input limits and auth policy from `shared/limits.json`, the same file the web
//! server and the frontend read. Embedded at compile time, parsed once.

use std::sync::LazyLock;
use std::time::Duration;

use serde::Deserialize;

#[derive(Deserialize)]
pub(crate) struct Range {
    pub min: usize,
    pub max: usize,
}

impl Range {
    pub fn contains(&self, n: usize) -> bool {
        (self.min..=self.max).contains(&n)
    }
}

#[derive(Deserialize)]
pub(crate) struct UsernameRule {
    pub min: usize,
    pub max: usize,
    /// Checked by `valid_username` in handlers.rs; the test below pins it.
    #[cfg_attr(not(test), allow(dead_code))]
    pub pattern: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Avatar {
    pub max_chars: usize,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Login {
    pub max_failures: u32,
    pub lockout_seconds: i64,
    pub fail_delay_ms: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Limits {
    pub username: UsernameRule,
    pub display_name: Range,
    pub password: Range,
    pub avatar: Avatar,
    pub max_profiles: i64,
    pub login: Login,
    pub session_ttl_days: i64,
    pub max_blob_bytes: usize,
}

impl Limits {
    pub fn session_ttl_ms(&self) -> i64 {
        self.session_ttl_days * 24 * 3600 * 1000
    }

    pub fn lockout_ms(&self) -> i64 {
        self.login.lockout_seconds * 1000
    }

    pub fn login_fail_delay(&self) -> Duration {
        Duration::from_millis(self.login.fail_delay_ms)
    }
}

pub(crate) static LIMITS: LazyLock<Limits> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../../../shared/limits.json")).expect("shared/limits.json is valid")
});

#[cfg(test)]
mod tests {
    use super::LIMITS;

    #[test]
    fn username_pattern_matches_the_rust_check() {
        // valid_username() allows ASCII letters, digits, '.', '_' and '-'. If you change
        // the pattern in shared/limits.json, update that check and this test together.
        assert_eq!(LIMITS.username.pattern, "^[a-zA-Z0-9._-]+$");
    }
}
