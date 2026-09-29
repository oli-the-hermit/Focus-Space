mod alerts;
mod backend;
mod updates;

use std::sync::Arc;

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

/** The log file is replaced once it reaches this size. */
const LOG_MAX_BYTES: u128 = 1_000_000;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be registered first. A second launch focuses the running app
        // instead of opening another window onto the same database.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.unminimize();
                let _ = main.show();
                let _ = main.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        // Endpoint and key are set per check from shared/release.json (updates.rs).
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(alerts::Alerts::default())
        .manage(updates::Updates::default())
        .setup(|app| {
            // Release builds log too, so a user can attach the file to a bug report:
            // %LOCALAPPDATA%\com.focusspace.desktop\logs\Focus Space.log (one file, capped).
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(if cfg!(debug_assertions) { log::LevelFilter::Info } else { log::LevelFilter::Warn })
                    .max_file_size(LOG_MAX_BYTES)
                    .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
                    .build(),
            )?;

            // Data lives in the per-user app data folder:
            // %APPDATA%\com.focusspace.desktop\focusspace.db
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_file = data_dir.join("focusspace.db");
            // A copy before a new version first touches the data; never blocks startup.
            let version = app.package_info().version.to_string();
            match updates::backup_on_version_change(&data_dir, &db_file, &version) {
                Ok(Some(copy)) => log::info!("saved a copy of the data before {version}: {}", copy.display()),
                Ok(None) => {}
                Err(err) => log::warn!("could not back up the data before {version}: {err}"),
            }
            let backend = backend::Backend::open(&db_file).inspect_err(|err| {
                // Setup errors end the app; keep the reason in the log.
                log::error!("could not open the database in {}: {err}", data_dir.display());
            })?;
            app.manage(Arc::new(backend));

            // Dev: the Vite dev server (devUrl). Release: the UI bundled into the binary.
            // Frameless: the top bar is the drag region and draws its own window
            // controls. The shadow keeps Windows 11's rounded corners and resize edges.
            // Tauri's file-drop handler is off; it swallows HTML5 drag and drop in
            // WebView2, which the app uses to reorder sessions, tasks and events.
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Focus Space")
                .inner_size(1440.0, 900.0)
                .min_inner_size(1100.0, 700.0)
                .center()
                .decorations(false)
                .shadow(true)
                .disable_drag_drop_handler()
                .build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            backend::api_request,
            alerts::schedule_phase_alert,
            alerts::cancel_phase_alert,
            alerts::show_alert,
            alerts::take_pending_alert,
            updates::check_for_update,
            updates::install_update
        ])
        .on_window_event(|window, event| {
            // The mini player and alert island only mirror the main window, so closing main quits.
            if window.label() == "main" {
                if let WindowEvent::Destroyed = event {
                    window.app_handle().exit(0);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running the Focus Space desktop app");
}
