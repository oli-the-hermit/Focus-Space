//! App updates for the desktop build, and a database backup whenever the
//! installed version changes.
//!
//! Updates come from GitHub Releases: `latest.json` plus the signed NSIS
//! installer, both published by `.github/workflows/release.yml`. The repo and
//! the public signing key come from `shared/release.json`; while either is
//! empty, checking reports `disabled` and nothing is downloaded.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{LazyLock, Mutex};

use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tauri::{AppHandle, State};
use tauri_plugin_updater::{Update, UpdaterExt};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReleaseConfig {
    github_repo: String,
    updater_pubkey: String,
}

static RELEASE: LazyLock<ReleaseConfig> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../../shared/release.json")).expect("shared/release.json is valid")
});

impl ReleaseConfig {
    fn enabled(&self) -> bool {
        !self.github_repo.trim().is_empty() && !self.updater_pubkey.trim().is_empty()
    }

    fn endpoint(&self) -> String {
        format!("https://github.com/{}/releases/latest/download/latest.json", self.github_repo.trim())
    }
}

/// The update found by the last check, waiting for the user to accept it.
#[derive(Default)]
pub struct Updates {
    pending: Mutex<Option<Update>>,
}

#[derive(Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum CheckResult {
    /// This build has no release source configured.
    Disabled,
    UpToDate { current: String },
    Available { current: String, version: String },
}

/// Download progress, streamed to the page while an update installs.
#[derive(Serialize, Clone)]
#[serde(tag = "event", rename_all = "camelCase")]
pub enum DownloadEvent {
    Progress { downloaded: u64, total: Option<u64> },
    Finished,
}

/// Errors are codes; the page owns the words (strings.updates).
#[tauri::command]
pub async fn check_for_update(app: AppHandle, updates: State<'_, Updates>) -> Result<CheckResult, String> {
    if !RELEASE.enabled() {
        return Ok(CheckResult::Disabled);
    }
    let current = app.package_info().version.to_string();
    let endpoint = RELEASE.endpoint().parse().map_err(|_| "CHECK_FAILED".to_string())?;
    let updater = app
        .updater_builder()
        .pubkey(RELEASE.updater_pubkey.trim())
        .endpoints(vec![endpoint])
        .and_then(|b| b.build())
        .map_err(|err| {
            log::warn!("updater setup failed: {err}");
            "CHECK_FAILED".to_string()
        })?;

    match updater.check().await {
        Ok(Some(update)) => {
            let version = update.version.clone();
            *updates.pending.lock().map_err(|_| "CHECK_FAILED".to_string())? = Some(update);
            Ok(CheckResult::Available { current, version })
        }
        Ok(None) => Ok(CheckResult::UpToDate { current }),
        Err(err) => {
            log::warn!("update check failed: {err}");
            Err("CHECK_FAILED".into())
        }
    }
}

/// Downloads and verifies the pending update, runs the installer and restarts.
/// On Windows the installer takes over and reopens the app when it's done.
#[tauri::command]
pub async fn install_update(
    app: AppHandle,
    updates: State<'_, Updates>,
    on_event: Channel<DownloadEvent>,
) -> Result<(), String> {
    let update = updates
        .pending
        .lock()
        .map_err(|_| "INSTALL_FAILED".to_string())?
        .take()
        .ok_or_else(|| "NO_UPDATE".to_string())?;

    let mut downloaded: u64 = 0;
    update
        .download_and_install(
            |chunk, total| {
                downloaded += chunk as u64;
                let _ = on_event.send(DownloadEvent::Progress { downloaded, total });
            },
            || {
                let _ = on_event.send(DownloadEvent::Finished);
            },
        )
        .await
        .map_err(|err| {
            log::error!("update install failed: {err}");
            "INSTALL_FAILED".to_string()
        })?;
    app.restart();
}

// ── Backup when the version changes ─────────────────────────────────────

/// How many "before version X" copies to keep.
const BACKUPS_KEPT: usize = 2;
const VERSION_MARKER: &str = "last-version";
const BACKUP_PREFIX: &str = "focusspace-before-";

/// Before a new version opens the database for the first time, saves a
/// consistent copy (`VACUUM INTO`, safe with WAL) to `<data_dir>/backups`,
/// keeping the newest few. Returns the copy's path when one was made.
pub fn backup_on_version_change(data_dir: &Path, db_file: &Path, version: &str) -> Result<Option<PathBuf>, String> {
    let marker = data_dir.join(VERSION_MARKER);
    let previous = fs::read_to_string(&marker).ok();
    if previous.as_deref().map(str::trim) == Some(version) {
        return Ok(None);
    }

    let mut made = None;
    if db_file.exists() {
        let dir = data_dir.join("backups");
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let target = dir.join(format!("{BACKUP_PREFIX}{version}.db"));
        if target.exists() {
            fs::remove_file(&target).map_err(|e| e.to_string())?;
        }
        let conn = rusqlite::Connection::open(db_file).map_err(|e| e.to_string())?;
        conn.execute("VACUUM INTO ?1", [target.to_string_lossy()]).map_err(|e| e.to_string())?;
        prune_backups(&dir)?;
        made = Some(target);
    }
    fs::write(&marker, version).map_err(|e| e.to_string())?;
    Ok(made)
}

fn prune_backups(dir: &Path) -> Result<(), String> {
    let mut backups: Vec<(std::time::SystemTime, PathBuf)> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .filter(|e| e.file_name().to_string_lossy().starts_with(BACKUP_PREFIX))
        .filter_map(|e| Some((e.metadata().ok()?.modified().ok()?, e.path())))
        .collect();
    backups.sort_by(|a, b| b.0.cmp(&a.0));
    for (_, path) in backups.into_iter().skip(BACKUPS_KEPT) {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("focusspace-updates-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn make_db(path: &Path) {
        let conn = rusqlite::Connection::open(path).unwrap();
        crate::backend::db::init(&conn).unwrap();
        conn.execute(
            "INSERT INTO profiles (username, display_name, salt, password_hash, created_at, updated_at) VALUES ('a', 'A', 's', 'h', 1, 1)",
            [],
        )
        .unwrap();
    }

    #[test]
    fn backs_up_once_per_version_and_keeps_the_newest() {
        let dir = temp_dir("backup");
        let db = dir.join("focusspace.db");
        make_db(&db);

        let first = backup_on_version_change(&dir, &db, "1.1.0").unwrap().expect("first run backs up");
        {
            // Scoped: Windows can't delete the copy later while it's open.
            let copy = rusqlite::Connection::open(&first).unwrap();
            let rows: i64 = copy.query_row("SELECT COUNT(*) FROM profiles", [], |r| r.get(0)).unwrap();
            assert_eq!(rows, 1, "the copy holds the data");
        }

        assert!(backup_on_version_change(&dir, &db, "1.1.0").unwrap().is_none(), "same version: no copy");

        for v in ["1.2.0", "1.3.0"] {
            std::thread::sleep(std::time::Duration::from_millis(20));
            assert!(backup_on_version_change(&dir, &db, v).unwrap().is_some());
        }
        let mut kept: Vec<String> =
            fs::read_dir(dir.join("backups")).unwrap().map(|e| e.unwrap().file_name().to_string_lossy().into_owned()).collect();
        kept.sort();
        assert_eq!(kept, ["focusspace-before-1.2.0.db", "focusspace-before-1.3.0.db"]);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn fresh_install_just_records_the_version() {
        let dir = temp_dir("fresh");
        let db = dir.join("focusspace.db");
        assert!(backup_on_version_change(&dir, &db, "1.1.0").unwrap().is_none());
        assert_eq!(fs::read_to_string(dir.join(VERSION_MARKER)).unwrap(), "1.1.0");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn tauri_conf_updater_section_parses() {
        // Tauri parses this at startup; a bad value would stop the app from launching.
        let conf: serde_json::Value = serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        let section = conf["plugins"]["updater"].clone();
        let parsed: tauri_plugin_updater::Config = serde_json::from_value(section).expect("plugins.updater parses");
        assert!(parsed.endpoints.is_empty(), "endpoints come from shared/release.json at runtime");
    }

    #[test]
    fn release_config_is_valid() {
        // Parses, and the endpoint is the GitHub "latest release" asset URL.
        let cfg = ReleaseConfig { github_repo: "owner/app".into(), updater_pubkey: "key".into() };
        assert!(cfg.enabled());
        assert_eq!(cfg.endpoint(), "https://github.com/owner/app/releases/latest/download/latest.json");
        let _ = RELEASE.enabled();
    }
}
