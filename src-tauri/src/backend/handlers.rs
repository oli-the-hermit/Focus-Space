//! Route handlers, one per Express route in `server/app.js`. Validation rules,
//! status codes and error codes match the web server exactly. Limits come from
//! shared/limits.json (limits.rs); errors are codes (errors.rs), never sentences.
//! parity.rs runs shared/api-scenarios.json here and run-web.ts runs it against
//! Express (`npm run test:parity`).

use std::sync::MutexGuard;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::alphabet;
use base64::engine::general_purpose::{GeneralPurpose, GeneralPurposeConfig};
use base64::engine::DecodePaddingMode;
use base64::Engine;
use rusqlite::types::Value as SqlValue;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, Row};
use serde_json::{json, Value};

use super::limits::LIMITS;
use super::{crypto, errors, ApiResponse, Attempt, Backend};

const DUMMY_SALT: &str = "00000000000000000000000000000000";

// Node's Buffer.from(v, 'base64') accepts input with or without padding.
const BASE64_LENIENT: GeneralPurpose = GeneralPurpose::new(
    &alphabet::STANDARD,
    GeneralPurposeConfig::new().with_decode_padding_mode(DecodePaddingMode::Indifferent),
);

// ── Errors & replies ─────────────────────────────────────────────────────

pub(crate) struct ApiErr {
    status: u16,
    code: &'static str,
}

impl From<rusqlite::Error> for ApiErr {
    fn from(err: rusqlite::Error) -> Self {
        log::error!("database error: {err}");
        fail(500, errors::INTERNAL)
    }
}

fn fail(status: u16, code: &'static str) -> ApiErr {
    ApiErr { status, code }
}

type Reply = Result<(u16, Value), ApiErr>;

fn ok(body: Value) -> Reply {
    Ok((200, body))
}

fn no_content() -> Reply {
    Ok((204, Value::Null))
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn db(b: &Backend) -> Result<MutexGuard<'_, Connection>, ApiErr> {
    b.conn.lock().map_err(|_| fail(500, errors::INTERNAL))
}

// ── Validation (lengths count UTF-16 units, like JS `.length`) ───────────

fn js_len(s: &str) -> usize {
    s.encode_utf16().count()
}

/// Mirrors `username.pattern` in shared/limits.json (pinned by a test in limits.rs).
fn valid_username(v: Option<&str>) -> bool {
    let rule = &LIMITS.username;
    v.is_some_and(|s| {
        (rule.min..=rule.max).contains(&s.len())
            && s.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'.' || c == b'_' || c == b'-')
    })
}

fn valid_display_name(v: Option<&str>) -> bool {
    v.is_some_and(|s| LIMITS.display_name.contains(js_len(s.trim())))
}

fn valid_password(v: Option<&str>) -> bool {
    v.is_some_and(|s| LIMITS.password.contains(js_len(s)))
}

fn valid_iv(v: Option<&str>) -> bool {
    v.is_some_and(|s| {
        !s.is_empty() && js_len(s) <= 24 && BASE64_LENIENT.decode(s).is_ok_and(|b| b.len() == 12)
    })
}

fn valid_cipher(v: Option<&str>) -> bool {
    v.is_some_and(|s| {
        !s.is_empty() && s.len() <= LIMITS.max_blob_bytes * 2 && BASE64_LENIENT.decode(s).is_ok_and(|b| b.len() <= LIMITS.max_blob_bytes)
    })
}

/// Empty (no photo) or a PNG, JPEG or WebP base64 data URL; the same rule as
/// `validateAvatarFormat` in server/app.js.
fn valid_avatar_format(v: &str) -> bool {
    if v.is_empty() {
        return true;
    }
    let Some(data) = ["data:image/png;base64,", "data:image/jpeg;base64,", "data:image/webp;base64,"]
        .iter()
        .find_map(|p| v.strip_prefix(p))
    else {
        return false;
    };
    let body = data.trim_end_matches('=');
    let padding = data.len() - body.len();
    !body.is_empty()
        && padding <= 2
        && body.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'+' || c == b'/')
}

fn valid_salt(v: Option<&str>) -> bool {
    v.is_some_and(|s| s.len() == 32 && hex::decode(s).is_ok_and(|b| b.len() == 16))
}

fn str_field<'a>(body: &'a Value, key: &str) -> Option<&'a str> {
    body.get(key).and_then(Value::as_str)
}

// ── Brute-force limiter ──────────────────────────────────────────────────

fn is_blocked(b: &Backend, key: &str) -> bool {
    let Ok(mut attempts) = b.attempts.lock() else { return false };
    match attempts.get(key).and_then(|a| a.blocked_until) {
        Some(until) if until > now_ms() => true,
        Some(_) => {
            attempts.remove(key);
            false
        }
        None => false,
    }
}

fn record_failure(b: &Backend, key: &str) {
    if let Ok(mut attempts) = b.attempts.lock() {
        let entry = attempts.entry(key.to_string()).or_insert_with(Attempt::default);
        entry.count += 1;
        if entry.count >= LIMITS.login.max_failures {
            entry.blocked_until = Some(now_ms() + LIMITS.lockout_ms());
            entry.count = 0;
        }
    }
}

fn record_success(b: &Backend, key: &str) {
    if let Ok(mut attempts) = b.attempts.lock() {
        attempts.remove(key);
    }
}

// ── Rows & shapes ────────────────────────────────────────────────────────

const PROFILE_COLS: &str =
    "id, username, display_name, avatar, role, salt, password_hash, data_iv, data_cipher, created_at, updated_at";

struct ProfileRow {
    id: i64,
    username: String,
    display_name: String,
    avatar: String,
    role: String,
    salt: String,
    password_hash: String,
    data_iv: String,
    data_cipher: String,
    created_at: i64,
    updated_at: i64,
}

impl ProfileRow {
    fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get(0)?,
            username: r.get(1)?,
            display_name: r.get(2)?,
            avatar: r.get(3)?,
            role: r.get(4)?,
            salt: r.get(5)?,
            password_hash: r.get(6)?,
            data_iv: r.get(7)?,
            data_cipher: r.get(8)?,
            created_at: r.get(9)?,
            updated_at: r.get(10)?,
        })
    }

    fn public(&self) -> Value {
        json!({
            "id": self.id,
            "username": self.username,
            "displayName": self.display_name,
            "avatar": self.avatar,
            "role": self.role,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at
        })
    }
}

fn profile_by_id(conn: &Connection, id: i64) -> rusqlite::Result<Option<ProfileRow>> {
    conn.query_row(&format!("SELECT {PROFILE_COLS} FROM profiles WHERE id = ?"), [id], ProfileRow::from_row)
        .optional()
}

fn profile_by_username(conn: &Connection, username: &str) -> rusqlite::Result<Option<ProfileRow>> {
    conn.query_row(
        &format!("SELECT {PROFILE_COLS} FROM profiles WHERE username = ? COLLATE NOCASE"),
        [username],
        ProfileRow::from_row,
    )
    .optional()
}

fn profile_count(conn: &Connection) -> rusqlite::Result<i64> {
    conn.query_row("SELECT COUNT(*) FROM profiles", [], |r| r.get(0))
}

/// The authenticated caller (Express's `req.profile` + `req.tokenHash`).
struct AuthCtx {
    id: i64,
    username: String,
    display_name: String,
    avatar: String,
    role: String,
    token_hash: String,
}

impl AuthCtx {
    fn public(&self) -> Value {
        json!({
            "id": self.id,
            "username": self.username,
            "displayName": self.display_name,
            "avatar": self.avatar,
            "role": self.role
        })
    }
}

fn create_session(conn: &Connection, profile_id: i64) -> Result<String, ApiErr> {
    let token = crypto::generate_token();
    let now = now_ms();
    conn.execute(
        "INSERT INTO sessions (token_hash, profile_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        params![crypto::hash_token(&token), profile_id, now, now + LIMITS.session_ttl_ms()],
    )?;
    Ok(token)
}

fn assert_unique_username(conn: &Connection, username: &str) -> Result<(), ApiErr> {
    let exists: Option<i64> = conn
        .query_row("SELECT id FROM profiles WHERE username = ? COLLATE NOCASE", [username], |r| r.get(0))
        .optional()?;
    match exists {
        Some(_) => Err(fail(409, errors::USERNAME_TAKEN)),
        None => Ok(()),
    }
}

fn hash_new_password(password: &str, salt_hex: Option<&str>) -> Result<(String, String), ApiErr> {
    crypto::hash_password(password, salt_hex).map_err(|_| fail(400, errors::SAVE_FAILED))
}

// ── Middleware equivalents ───────────────────────────────────────────────

fn require_auth(b: &Backend, token: Option<&str>) -> Result<AuthCtx, ApiErr> {
    let token = token
        .filter(|t| !t.is_empty())
        .ok_or_else(|| fail(401, errors::SESSION_EXPIRED))?;
    let conn = db(b)?;
    let row = conn
        .query_row(
            "SELECT s.token_hash, s.expires_at, p.id, p.username, p.display_name, p.avatar, p.role
             FROM sessions s JOIN profiles p ON p.id = s.profile_id
             WHERE s.token_hash = ?",
            [crypto::hash_token(token)],
            |r| {
                Ok((
                    r.get::<_, i64>(1)?,
                    AuthCtx {
                        token_hash: r.get(0)?,
                        id: r.get(2)?,
                        username: r.get(3)?,
                        display_name: r.get(4)?,
                        avatar: r.get(5)?,
                        role: r.get(6)?,
                    },
                ))
            },
        )
        .optional()?;

    let Some((expires_at, ctx)) = row else {
        return Err(fail(401, errors::SESSION_EXPIRED));
    };
    if expires_at < now_ms() {
        conn.execute("DELETE FROM sessions WHERE token_hash = ?", [&ctx.token_hash])?;
        return Err(fail(401, errors::SESSION_EXPIRED));
    }
    // Sliding expiry
    conn.execute(
        "UPDATE sessions SET expires_at = ? WHERE token_hash = ?",
        params![now_ms() + LIMITS.session_ttl_ms(), ctx.token_hash],
    )?;
    Ok(ctx)
}

fn require_owner(b: &Backend, token: Option<&str>) -> Result<AuthCtx, ApiErr> {
    let ctx = require_auth(b, token)?;
    if ctx.role != "owner" {
        return Err(fail(403, errors::OWNER_ONLY));
    }
    Ok(ctx)
}

// ── Router ───────────────────────────────────────────────────────────────

pub(crate) fn dispatch(b: &Backend, method: &str, path: &str, body: Option<Value>, token: Option<String>) -> ApiResponse {
    let body = body.unwrap_or(Value::Null);
    match route(b, method, path, &body, token.as_deref()) {
        Ok((status, body)) => ApiResponse { status, body },
        Err(e) => ApiResponse { status: e.status, body: errors::body(e.code) },
    }
}

fn route(b: &Backend, method: &str, path: &str, body: &Value, token: Option<&str>) -> Reply {
    let path = path.split('?').next().unwrap_or("");
    let rest = path.strip_prefix("/api").unwrap_or(path);
    let segs: Vec<&str> = rest.split('/').filter(|s| !s.is_empty()).collect();
    let method = method.to_ascii_uppercase();

    match (method.as_str(), segs.as_slice()) {
        ("GET", ["health"]) => health(b),

        ("POST", ["auth", "setup"]) => setup(b, body),
        ("POST", ["auth", "login"]) => login(b, body),
        ("POST", ["auth", "logout"]) => logout(b, &require_auth(b, token)?),
        ("GET", ["auth", "me"]) => ok(json!({ "profile": require_auth(b, token)?.public() })),

        ("GET", ["data"]) => get_data(b, &require_auth(b, token)?),
        ("PUT", ["data"]) => put_data(b, &require_auth(b, token)?, body),

        ("PUT", ["profile"]) => update_profile(b, &require_auth(b, token)?, body),
        ("PUT", ["profile", "password"]) => change_password(b, &require_auth(b, token)?, body),
        ("DELETE", ["profile"]) => delete_self(b, &require_auth(b, token)?, body),

        ("GET", ["profiles"]) => {
            require_owner(b, token)?;
            list_profiles(b)
        }
        ("POST", ["profiles"]) => {
            require_owner(b, token)?;
            create_profile(b, body)
        }
        ("PUT", ["profiles", id]) => {
            require_owner(b, token)?;
            rename_profile(b, id, body)
        }
        ("DELETE", ["profiles", id]) => {
            let ctx = require_owner(b, token)?;
            delete_profile(b, &ctx, id)
        }
        ("POST", ["reset-profiles"]) => {
            let ctx = require_owner(b, token)?;
            reset_profiles(b, &ctx, body)
        }

        _ => Err(fail(404, errors::NOT_FOUND)),
    }
}

// ── Health / auth ────────────────────────────────────────────────────────

fn health(b: &Backend) -> Reply {
    let count = profile_count(&*db(b)?)?;
    ok(json!({ "ok": true, "requiresSetup": count == 0 }))
}

fn setup(b: &Backend, body: &Value) -> Reply {
    let username = str_field(body, "username");
    let display_name = str_field(body, "displayName");
    let password = str_field(body, "password");
    if !valid_username(username) {
        return Err(fail(400, errors::INVALID_USERNAME));
    }
    if !valid_display_name(display_name) {
        return Err(fail(400, errors::INVALID_DISPLAY_NAME));
    }
    if !valid_password(password) {
        return Err(fail(400, errors::INVALID_PASSWORD));
    }
    let (username, display_name, password) = (username.unwrap(), display_name.unwrap().trim(), password.unwrap());

    if profile_count(&*db(b)?)? > 0 {
        return Err(fail(409, errors::ALREADY_SET_UP));
    }

    // Hash without holding the database lock.
    let (salt, hash) = hash_new_password(password, None)?;
    let now = now_ms();

    let conn = db(b)?;
    conn.execute(
        "INSERT INTO profiles (username, display_name, role, salt, password_hash, created_at, updated_at)
         VALUES (?, ?, 'owner', ?, ?, ?, ?)",
        params![username, display_name, salt, hash, now, now],
    )?;
    let profile = profile_by_id(&conn, conn.last_insert_rowid())?.ok_or_else(|| fail(500, errors::INTERNAL))?;
    let token = create_session(&conn, profile.id)?;
    Ok((
        201,
        json!({ "token": token, "profile": profile.public(), "data": { "salt": salt, "iv": "", "cipher": "" } }),
    ))
}

fn login(b: &Backend, body: &Value) -> Reply {
    let (Some(username), Some(password)) = (str_field(body, "username"), str_field(body, "password")) else {
        return Err(fail(400, errors::CREDENTIALS_REQUIRED));
    };

    // Desktop has a single client, so the lockout is keyed by username only.
    let key = username.to_lowercase();
    if is_blocked(b, &key) {
        return Err(fail(429, errors::TOO_MANY_ATTEMPTS));
    }

    let row = profile_by_username(&*db(b)?, username)?;
    let valid = match &row {
        Some(r) => crypto::verify_password(password, &r.salt, &r.password_hash),
        None => {
            // Dummy hash to normalize response timing and prevent user enumeration
            let _ = crypto::hash_password(password, Some(DUMMY_SALT));
            false
        }
    };

    let Some(row) = row.filter(|_| valid) else {
        record_failure(b, &key);
        std::thread::sleep(LIMITS.login_fail_delay());
        return Err(fail(401, errors::INVALID_CREDENTIALS));
    };

    record_success(b, &key);
    let token = create_session(&*db(b)?, row.id)?;
    ok(json!({
        "token": token,
        "profile": row.public(),
        "data": { "salt": row.salt, "iv": row.data_iv, "cipher": row.data_cipher }
    }))
}

fn logout(b: &Backend, ctx: &AuthCtx) -> Reply {
    db(b)?.execute("DELETE FROM sessions WHERE token_hash = ?", [&ctx.token_hash])?;
    no_content()
}

// ── Encrypted per-profile data ───────────────────────────────────────────

fn get_data(b: &Backend, ctx: &AuthCtx) -> Reply {
    let row = profile_by_id(&*db(b)?, ctx.id)?.ok_or_else(|| fail(401, errors::SESSION_EXPIRED))?;
    if row.data_cipher.is_empty() {
        ok(json!({ "salt": row.salt, "iv": "", "cipher": "" }))
    } else {
        ok(json!({ "salt": row.salt, "iv": row.data_iv, "cipher": row.data_cipher }))
    }
}

fn put_data(b: &Backend, ctx: &AuthCtx, body: &Value) -> Reply {
    let iv = str_field(body, "iv");
    let cipher = str_field(body, "cipher");
    if !valid_iv(iv) || !valid_cipher(cipher) {
        return Err(fail(400, errors::SAVE_FAILED));
    }
    db(b)?.execute(
        "UPDATE profiles SET data_iv = ?, data_cipher = ?, updated_at = ? WHERE id = ?",
        params![iv.unwrap(), cipher.unwrap(), now_ms(), ctx.id],
    )?;
    no_content()
}

// ── Self profile management ──────────────────────────────────────────────

fn update_profile(b: &Backend, ctx: &AuthCtx, body: &Value) -> Reply {
    let conn = db(b)?;
    let row = profile_by_id(&conn, ctx.id)?.ok_or_else(|| fail(401, errors::SESSION_EXPIRED))?;

    let mut sets: Vec<&str> = Vec::new();
    let mut values: Vec<SqlValue> = Vec::new();

    if let Some(v) = body.get("displayName") {
        let name = v.as_str();
        if !valid_display_name(name) {
            return Err(fail(400, errors::INVALID_DISPLAY_NAME));
        }
        sets.push("display_name = ?");
        values.push(SqlValue::Text(name.unwrap().trim().to_string()));
    }
    if let Some(v) = body.get("username") {
        let username = v.as_str();
        if !valid_username(username) {
            return Err(fail(400, errors::INVALID_USERNAME));
        }
        let username = username.unwrap();
        if username.to_lowercase() != row.username.to_lowercase() {
            assert_unique_username(&conn, username)?;
        }
        sets.push("username = ?");
        values.push(SqlValue::Text(username.to_string()));
    }
    if let Some(v) = body.get("avatar") {
        match v.as_str() {
            Some(avatar) if js_len(avatar) <= LIMITS.avatar.max_chars => {
                if !valid_avatar_format(avatar) {
                    return Err(fail(400, errors::INVALID_AVATAR));
                }
                sets.push("avatar = ?");
                values.push(SqlValue::Text(avatar.to_string()));
            }
            _ => return Err(fail(400, errors::AVATAR_TOO_LARGE)),
        }
    }

    if sets.is_empty() {
        return Err(fail(400, errors::NO_CHANGES));
    }

    values.push(SqlValue::Integer(now_ms()));
    values.push(SqlValue::Integer(ctx.id));
    conn.execute(
        &format!("UPDATE profiles SET {}, updated_at = ? WHERE id = ?", sets.join(", ")),
        params_from_iter(values),
    )?;
    let updated = profile_by_id(&conn, ctx.id)?.ok_or_else(|| fail(500, errors::INTERNAL))?;
    ok(json!({ "profile": updated.public() }))
}

fn change_password(b: &Backend, ctx: &AuthCtx, body: &Value) -> Reply {
    let Some(current) = str_field(body, "currentPassword") else {
        return Err(fail(400, errors::CURRENT_PASSWORD_REQUIRED));
    };
    let row = profile_by_id(&*db(b)?, ctx.id)?.ok_or_else(|| fail(401, errors::SESSION_EXPIRED))?;

    if !crypto::verify_password(current, &row.salt, &row.password_hash) {
        std::thread::sleep(LIMITS.login_fail_delay());
        return Err(fail(401, errors::WRONG_CURRENT_PASSWORD));
    }
    let new_password = str_field(body, "newPassword");
    if !valid_password(new_password) {
        return Err(fail(400, errors::INVALID_NEW_PASSWORD));
    }
    let (salt, iv, cipher) = (str_field(body, "salt"), str_field(body, "iv"), str_field(body, "cipher"));
    if !valid_salt(salt) || !valid_iv(iv) || !valid_cipher(cipher) {
        return Err(fail(400, errors::SAVE_FAILED));
    }

    let (salt, hash) = hash_new_password(new_password.unwrap(), salt)?;
    let conn = db(b)?;
    conn.execute(
        "UPDATE profiles SET salt = ?, password_hash = ?, data_iv = ?, data_cipher = ?, updated_at = ? WHERE id = ?",
        params![salt, hash, iv.unwrap(), cipher.unwrap(), now_ms(), row.id],
    )?;

    // Invalidate other sessions so old passwords stop working elsewhere
    conn.execute("DELETE FROM sessions WHERE profile_id = ?", [row.id])?;
    let token = create_session(&conn, row.id)?;
    let updated = profile_by_id(&conn, row.id)?.ok_or_else(|| fail(500, errors::INTERNAL))?;
    ok(json!({ "token": token, "profile": updated.public() }))
}

fn delete_self(b: &Backend, ctx: &AuthCtx, body: &Value) -> Reply {
    let Some(password) = str_field(body, "password") else {
        return Err(fail(400, errors::PASSWORD_REQUIRED));
    };
    if ctx.role == "owner" {
        return Err(fail(403, errors::OWNER_UNDELETABLE));
    }
    let row = profile_by_id(&*db(b)?, ctx.id)?.ok_or_else(|| fail(401, errors::SESSION_EXPIRED))?;
    if !crypto::verify_password(password, &row.salt, &row.password_hash) {
        std::thread::sleep(LIMITS.login_fail_delay());
        return Err(fail(401, errors::WRONG_PASSWORD));
    }
    db(b)?.execute("DELETE FROM profiles WHERE id = ?", [row.id])?; // cascades sessions
    no_content()
}

// ── Owner profile management ─────────────────────────────────────────────

fn list_profiles(b: &Backend) -> Reply {
    let conn = db(b)?;
    let mut stmt = conn.prepare(&format!("SELECT {PROFILE_COLS} FROM profiles ORDER BY role DESC, created_at ASC"))?;
    let profiles = stmt
        .query_map([], ProfileRow::from_row)?
        .map(|r| r.map(|p| p.public()))
        .collect::<rusqlite::Result<Vec<_>>>()?;
    ok(json!({ "profiles": profiles }))
}

fn create_profile(b: &Backend, body: &Value) -> Reply {
    let username = str_field(body, "username");
    let display_name = str_field(body, "displayName");
    let password = str_field(body, "password");
    if !valid_username(username) {
        return Err(fail(400, errors::INVALID_USERNAME));
    }
    if !valid_display_name(display_name) {
        return Err(fail(400, errors::INVALID_DISPLAY_NAME));
    }
    if !valid_password(password) {
        return Err(fail(400, errors::INVALID_PASSWORD));
    }
    let (username, display_name, password) = (username.unwrap(), display_name.unwrap().trim(), password.unwrap());

    {
        let conn = db(b)?;
        if profile_count(&conn)? >= LIMITS.max_profiles {
            return Err(fail(409, errors::PROFILE_LIMIT));
        }
        assert_unique_username(&conn, username)?;
    }

    let (salt, hash) = hash_new_password(password, None)?;
    let now = now_ms();
    let conn = db(b)?;
    conn.execute(
        "INSERT INTO profiles (username, display_name, role, salt, password_hash, created_at, updated_at)
         VALUES (?, ?, 'user', ?, ?, ?, ?)",
        params![username, display_name, salt, hash, now, now],
    )?;
    let profile = profile_by_id(&conn, conn.last_insert_rowid())?.ok_or_else(|| fail(500, errors::INTERNAL))?;
    Ok((201, json!({ "profile": profile.public() })))
}

fn rename_profile(b: &Backend, id: &str, body: &Value) -> Reply {
    let display_name = str_field(body, "displayName");
    if !valid_display_name(display_name) {
        return Err(fail(400, errors::INVALID_DISPLAY_NAME));
    }
    let conn = db(b)?;
    let row = id
        .parse::<i64>()
        .ok()
        .map(|id| profile_by_id(&conn, id))
        .transpose()?
        .flatten()
        .ok_or_else(|| fail(404, errors::PROFILE_NOT_FOUND))?;

    conn.execute(
        "UPDATE profiles SET display_name = ?, updated_at = ? WHERE id = ?",
        params![display_name.unwrap().trim(), now_ms(), row.id],
    )?;
    let updated = profile_by_id(&conn, row.id)?.ok_or_else(|| fail(500, errors::INTERNAL))?;
    ok(json!({ "profile": updated.public() }))
}

fn delete_profile(b: &Backend, ctx: &AuthCtx, id: &str) -> Reply {
    let conn = db(b)?;
    let row = id
        .parse::<i64>()
        .ok()
        .map(|id| profile_by_id(&conn, id))
        .transpose()?
        .flatten()
        .ok_or_else(|| fail(404, errors::PROFILE_NOT_FOUND))?;
    if row.id == ctx.id {
        return Err(fail(400, errors::OWNER_UNDELETABLE));
    }
    conn.execute("DELETE FROM profiles WHERE id = ?", [row.id])?; // cascades sessions
    no_content()
}

// ── Danger zone: reset all non-owner profiles ────────────────────────────

fn reset_profiles(b: &Backend, ctx: &AuthCtx, body: &Value) -> Reply {
    let Some(password) = str_field(body, "password") else {
        return Err(fail(400, errors::PASSWORD_REQUIRED));
    };
    let row = profile_by_id(&*db(b)?, ctx.id)?.ok_or_else(|| fail(401, errors::SESSION_EXPIRED))?;
    if !crypto::verify_password(password, &row.salt, &row.password_hash) {
        std::thread::sleep(LIMITS.login_fail_delay());
        return Err(fail(401, errors::WRONG_PASSWORD));
    }

    let mut conn = db(b)?;
    let tx = conn.transaction()?;
    let deleted = tx.execute("DELETE FROM profiles WHERE role = 'user'", [])?;
    tx.commit()?;
    ok(json!({ "deleted": deleted }))
}

// ── Tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    const IV: &str = "AAAAAAAAAAAAAAAA"; // 12 zero bytes
    const CIPHER: &str = "c2VjcmV0LWJsb2I=";

    fn call(b: &Backend, method: &str, path: &str, body: Value, token: Option<&str>) -> ApiResponse {
        dispatch(b, method, path, Some(body), token.map(str::to_string))
    }

    fn token_of(r: &ApiResponse) -> String {
        r.body["token"].as_str().expect("token").to_string()
    }

    fn setup_owner(b: &Backend) -> String {
        let r = call(
            b,
            "POST",
            "/api/auth/setup",
            json!({ "username": "olivia", "displayName": " Olivia ", "password": "password123" }),
            None,
        );
        assert_eq!(r.status, 201, "{:?}", r.body);
        token_of(&r)
    }

    #[test]
    fn health_reports_setup_state() {
        let b = Backend::in_memory();
        assert_eq!(call(&b, "GET", "/api/health", Value::Null, None).body["requiresSetup"], true);
        setup_owner(&b);
        assert_eq!(call(&b, "GET", "/api/health", Value::Null, None).body["requiresSetup"], false);
    }

    #[test]
    fn setup_validates_and_runs_once() {
        let b = Backend::in_memory();
        let r = call(&b, "POST", "/api/auth/setup", json!({ "username": "ab", "displayName": "A", "password": "password123" }), None);
        assert_eq!((r.status, r.body["code"].as_str()), (400, Some(errors::INVALID_USERNAME)));
        assert_eq!(r.body["params"], json!({ "min": 3, "max": 24 }));

        let token = setup_owner(&b);
        let me = call(&b, "GET", "/api/auth/me", Value::Null, Some(&token));
        assert_eq!(me.status, 200);
        assert_eq!(me.body["profile"]["displayName"], "Olivia");
        assert_eq!(me.body["profile"]["role"], "owner");

        let again = call(&b, "POST", "/api/auth/setup", json!({ "username": "other", "displayName": "B", "password": "password123" }), None);
        assert_eq!(again.status, 409);
    }

    #[test]
    fn login_logout_and_lockout() {
        let b = Backend::in_memory();
        setup_owner(&b);

        let good = call(&b, "POST", "/api/auth/login", json!({ "username": "OLIVIA", "password": "password123" }), None);
        assert_eq!(good.status, 200);
        assert_eq!(good.body["data"]["salt"].as_str().unwrap().len(), 32);
        let token = token_of(&good);

        assert_eq!(call(&b, "POST", "/api/auth/logout", Value::Null, Some(&token)).status, 204);
        assert_eq!(call(&b, "GET", "/api/auth/me", Value::Null, Some(&token)).status, 401);

        for _ in 0..LIMITS.login.max_failures {
            let bad = call(&b, "POST", "/api/auth/login", json!({ "username": "olivia", "password": "wrong-pass" }), None);
            assert_eq!(bad.status, 401);
        }
        let locked = call(&b, "POST", "/api/auth/login", json!({ "username": "olivia", "password": "password123" }), None);
        assert_eq!(locked.status, 429);

        let missing = call(&b, "POST", "/api/auth/login", json!({ "username": "olivia" }), None);
        assert_eq!(missing.status, 400);
    }

    #[test]
    fn encrypted_data_round_trip() {
        let b = Backend::in_memory();
        let token = setup_owner(&b);

        let empty = call(&b, "GET", "/api/data", Value::Null, Some(&token));
        assert_eq!(empty.body["cipher"], "");

        let bad = call(&b, "PUT", "/api/data", json!({ "iv": "short", "cipher": CIPHER }), Some(&token));
        assert_eq!(bad.status, 400);

        let put = call(&b, "PUT", "/api/data", json!({ "iv": IV, "cipher": CIPHER }), Some(&token));
        assert_eq!(put.status, 204);
        assert_eq!(put.body, Value::Null);

        let got = call(&b, "GET", "/api/data", Value::Null, Some(&token));
        assert_eq!((got.body["iv"].as_str(), got.body["cipher"].as_str()), (Some(IV), Some(CIPHER)));

        assert_eq!(call(&b, "GET", "/api/data", Value::Null, None).status, 401);
    }

    #[test]
    fn password_change_rotates_sessions() {
        let b = Backend::in_memory();
        let old_token = setup_owner(&b);
        let payload = json!({
            "currentPassword": "password123",
            "newPassword": "new-password-456",
            "salt": "00112233445566778899aabbccddeeff",
            "iv": IV,
            "cipher": CIPHER
        });

        let wrong = call(&b, "PUT", "/api/profile/password", json!({ "currentPassword": "nope", "newPassword": "x" }), Some(&old_token));
        assert_eq!(wrong.status, 401);

        let r = call(&b, "PUT", "/api/profile/password", payload, Some(&old_token));
        assert_eq!(r.status, 200, "{:?}", r.body);
        let new_token = token_of(&r);

        assert_eq!(call(&b, "GET", "/api/auth/me", Value::Null, Some(&old_token)).status, 401);
        assert_eq!(call(&b, "GET", "/api/auth/me", Value::Null, Some(&new_token)).status, 200);

        let login = call(&b, "POST", "/api/auth/login", json!({ "username": "olivia", "password": "new-password-456" }), None);
        assert_eq!(login.status, 200);
        assert_eq!(login.body["data"]["salt"], "00112233445566778899aabbccddeeff");
    }

    #[test]
    fn profile_update_rules() {
        let b = Backend::in_memory();
        let token = setup_owner(&b);

        assert_eq!(call(&b, "PUT", "/api/profile", json!({}), Some(&token)).status, 400);
        let r = call(&b, "PUT", "/api/profile", json!({ "displayName": "Liv", "avatar": "" }), Some(&token));
        assert_eq!(r.status, 200);
        assert_eq!(r.body["profile"]["displayName"], "Liv");

        call(&b, "POST", "/api/profiles", json!({ "username": "sam", "displayName": "Sam", "password": "password123" }), Some(&token));
        let taken = call(&b, "PUT", "/api/profile", json!({ "username": "SAM" }), Some(&token));
        assert_eq!(taken.status, 409);
        // Changing only the case of your own name is allowed.
        assert_eq!(call(&b, "PUT", "/api/profile", json!({ "username": "Olivia" }), Some(&token)).status, 200);
    }

    #[test]
    fn owner_profile_management() {
        let b = Backend::in_memory();
        let owner = setup_owner(&b);

        let created = call(&b, "POST", "/api/profiles", json!({ "username": "sam", "displayName": "Sam", "password": "password123" }), Some(&owner));
        assert_eq!(created.status, 201);
        let sam_id = created.body["profile"]["id"].as_i64().unwrap();

        // A regular user can't use owner routes, and can delete only themselves.
        let sam = token_of(&call(&b, "POST", "/api/auth/login", json!({ "username": "sam", "password": "password123" }), None));
        assert_eq!(call(&b, "GET", "/api/profiles", Value::Null, Some(&sam)).status, 403);

        let renamed = call(&b, "PUT", &format!("/api/profiles/{sam_id}"), json!({ "displayName": "Samuel" }), Some(&owner));
        assert_eq!(renamed.body["profile"]["displayName"], "Samuel");
        assert_eq!(call(&b, "PUT", "/api/profiles/999", json!({ "displayName": "X" }), Some(&owner)).status, 404);
        assert_eq!(call(&b, "PUT", "/api/profiles/abc", json!({ "displayName": "X" }), Some(&owner)).status, 404);

        let owner_id = call(&b, "GET", "/api/auth/me", Value::Null, Some(&owner)).body["profile"]["id"].as_i64().unwrap();
        assert_eq!(call(&b, "DELETE", &format!("/api/profiles/{owner_id}"), Value::Null, Some(&owner)).status, 400);
        assert_eq!(call(&b, "DELETE", "/api/profile", json!({ "password": "password123" }), Some(&owner)).status, 403);

        // Profile limit: owner + 5 more.
        for n in 0..4 {
            let r = call(&b, "POST", "/api/profiles", json!({ "username": format!("user{n}"), "displayName": "U", "password": "password123" }), Some(&owner));
            assert_eq!(r.status, 201);
        }
        let over = call(&b, "POST", "/api/profiles", json!({ "username": "extra", "displayName": "E", "password": "password123" }), Some(&owner));
        assert_eq!((over.status, over.body["code"].as_str()), (409, Some(errors::PROFILE_LIMIT)));
        assert_eq!(over.body["params"]["max"], 6);

        let list = call(&b, "GET", "/api/profiles", Value::Null, Some(&owner));
        let profiles = list.body["profiles"].as_array().unwrap();
        assert_eq!(profiles.len(), 6);
        // Same `ORDER BY role DESC` as Express: 'user' sorts after 'owner', so the owner comes last.
        assert_eq!(profiles[5]["role"], "owner");

        assert_eq!(call(&b, "POST", "/api/reset-profiles", json!({ "password": "bad-pass" }), Some(&owner)).status, 401);
        let reset = call(&b, "POST", "/api/reset-profiles", json!({ "password": "password123" }), Some(&owner));
        assert_eq!(reset.body["deleted"], 5);
        // Deleted profiles' sessions are gone through ON DELETE CASCADE.
        assert_eq!(call(&b, "GET", "/api/auth/me", Value::Null, Some(&sam)).status, 401);
    }

    #[test]
    fn unknown_route_is_404() {
        let b = Backend::in_memory();
        assert_eq!(call(&b, "GET", "/api/nope", Value::Null, None).status, 404);
    }
}
