//! SQLite schema. Identical to `server/db.js`, so the same database file works
//! with the web (Express) and desktop (Rust) backends.

use rusqlite::Connection;

pub fn init(conn: &Connection) -> rusqlite::Result<()> {
    // journal_mode returns a row, so it can't go through execute_batch.
    conn.query_row("PRAGMA journal_mode = WAL", [], |_| Ok(()))?;
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS profiles (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
          display_name  TEXT NOT NULL,
          avatar        TEXT NOT NULL DEFAULT '',
          role          TEXT NOT NULL CHECK (role IN ('owner', 'user')) DEFAULT 'user',
          salt          TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          data_iv       TEXT NOT NULL DEFAULT '',
          data_cipher   TEXT NOT NULL DEFAULT '',
          created_at    INTEGER NOT NULL,
          updated_at    INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY,
          profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_profile ON sessions(profile_id);",
    )
}
