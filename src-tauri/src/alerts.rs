//! Phase-end alerts for the desktop app.
//!
//! WebView timers are throttled while the main window is minimized or hidden,
//! so the countdown's end is also scheduled here in Rust. When it fires:
//!   - main always gets `fs:alert-fired` (it re-checks the clock and plays the chime),
//!   - if main isn't in front, the "island" popup window shows the alert with actions.
//!
//! The payload is opaque JSON built by `src/lib/notify.ts`; Rust only routes it.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};

pub const ISLAND_LABEL: &str = "island";
const ISLAND_WIDTH: f64 = 400.0;
const ISLAND_HEIGHT: f64 = 120.0;
const ISLAND_TOP_MARGIN: f64 = 16.0;

const EVT_ALERT_FIRED: &str = "fs:alert-fired";
const EVT_ALERT_SHOW: &str = "fs:alert-show";

#[derive(Default)]
pub struct Alerts {
    /// Bumped on every schedule/cancel; a sleeping alert only fires if it still matches.
    generation: AtomicU64,
    /// Alert waiting for the island window to pick it up (it may still be loading).
    pending: Mutex<Option<Value>>,
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn main_is_in_front(app: &AppHandle) -> bool {
    app.get_webview_window("main")
        .map(|w| {
            w.is_focused().unwrap_or(false)
                && w.is_visible().unwrap_or(false)
                && !w.is_minimized().unwrap_or(false)
        })
        .unwrap_or(false)
}

fn show_island(app: &AppHandle, payload: Value) -> tauri::Result<()> {
    let alerts = app.state::<Alerts>();
    *alerts.pending.lock().unwrap() = Some(payload.clone());

    if let Some(island) = app.get_webview_window(ISLAND_LABEL) {
        island.emit(EVT_ALERT_SHOW, payload)?;
        island.show()?;
        return Ok(());
    }

    // Top centre of the monitor the main window is on (primary as a fallback).
    let monitor = app
        .get_webview_window("main")
        .and_then(|w| w.current_monitor().ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten());
    let (x, y) = match monitor {
        Some(m) => {
            let scale = m.scale_factor();
            let pos = m.position().to_logical::<f64>(scale);
            let size = m.size().to_logical::<f64>(scale);
            (pos.x + (size.width - ISLAND_WIDTH) / 2.0, pos.y + ISLAND_TOP_MARGIN)
        }
        None => (100.0, ISLAND_TOP_MARGIN),
    };

    WebviewWindowBuilder::new(app, ISLAND_LABEL, WebviewUrl::App("index.html#island".into()))
        .title("Focus Space")
        .inner_size(ISLAND_WIDTH, ISLAND_HEIGHT)
        .position(x, y)
        .decorations(false)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(false)
        .shadow(true)
        .disable_drag_drop_handler()
        .build()?;
    Ok(())
}

fn fire(app: &AppHandle, payload: Value) {
    let in_front = main_is_in_front(app);
    // Main shows the in-app version itself when it's in front.
    let _ = app.emit_to(
        "main",
        EVT_ALERT_FIRED,
        serde_json::json!({ "payload": payload, "inFront": in_front }),
    );
    if !in_front {
        if let Err(e) = show_island(app, payload) {
            log::warn!("could not show the alert window: {e}");
        }
    }
}

/// Fires `payload` at `at_ms` (Unix ms) unless cancelled or rescheduled first.
#[tauri::command]
pub fn schedule_phase_alert(app: AppHandle, alerts: State<'_, Alerts>, at_ms: i64, payload: Value) {
    let generation = alerts.generation.fetch_add(1, Ordering::SeqCst) + 1;
    tauri::async_runtime::spawn(async move {
        let wait = (at_ms - now_ms()).max(0) as u64;
        tokio::time::sleep(Duration::from_millis(wait)).await;
        if app.state::<Alerts>().generation.load(Ordering::SeqCst) == generation {
            fire(&app, payload);
        }
    });
}

#[tauri::command]
pub fn cancel_phase_alert(alerts: State<'_, Alerts>) {
    alerts.generation.fetch_add(1, Ordering::SeqCst);
}

/// Shows an alert right away (calendar reminders), island only if main isn't in front.
///
/// Must stay `async`: it can open the island window, and on Windows building a
/// window inside a synchronous command deadlocks the main thread (see the Tauri
/// docs on `WebviewWindowBuilder::build`). That froze the whole app: a blank
/// island, no IPC, no repaints, and the window couldn't be closed.
#[tauri::command]
pub async fn show_alert(app: AppHandle, payload: Value) {
    fire(&app, payload);
}

/// Called by the island window once it's ready, so no alert is lost while it loads.
#[tauri::command]
pub fn take_pending_alert(alerts: State<'_, Alerts>) -> Option<Value> {
    alerts.pending.lock().unwrap().take()
}
