//! Local data API for the desktop app.
//!
//! KEEP IN SYNC with `server/app.js`: the web build talks to Express over HTTP,
//! the desktop build calls `api_request` with the same method + path + JSON body
//! and gets back the same status codes, JSON shapes and error codes. Limits come
//! from shared/limits.json; user-facing messages live only in the frontend.

pub mod crypto;
pub mod db;
mod errors;
mod handlers;
mod limits;

use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};

use rusqlite::Connection;
use serde::Serialize;
use serde_json::Value;

/// Failed-login bookkeeping for the brute-force lockout.
#[derive(Default)]
pub(crate) struct Attempt {
    pub count: u32,
    pub blocked_until: Option<i64>,
}

pub struct Backend {
    pub(crate) conn: Mutex<Connection>,
    pub(crate) attempts: Mutex<HashMap<String, Attempt>>,
}

impl Backend {
    pub fn open(path: &Path) -> rusqlite::Result<Self> {
        let conn = Connection::open(path)?;
        db::init(&conn)?;
        Ok(Self::with_connection(conn))
    }

    #[cfg(test)]
    pub fn in_memory() -> Self {
        let conn = Connection::open_in_memory().expect("in-memory database");
        db::init(&conn).expect("schema");
        Self::with_connection(conn)
    }

    fn with_connection(conn: Connection) -> Self {
        Self {
            conn: Mutex::new(conn),
            attempts: Mutex::new(HashMap::new()),
        }
    }
}

/// What `fetch` would have returned: HTTP-style status plus JSON body (null for 204).
#[derive(Serialize, Debug)]
pub struct ApiResponse {
    pub status: u16,
    pub body: Value,
}

/// Single entry point used by `src/lib/api.ts` when running inside Tauri.
/// Runs on a blocking thread because password hashing is deliberately slow.
#[tauri::command]
pub async fn api_request(
    state: tauri::State<'_, Arc<Backend>>,
    method: String,
    path: String,
    body: Option<Value>,
    token: Option<String>,
) -> Result<ApiResponse, String> {
    let backend = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || handlers::dispatch(&backend, &method, &path, body, token))
        .await
        .map_err(|e| e.to_string())
}
