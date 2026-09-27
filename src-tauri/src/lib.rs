mod alerts;
mod backend;

use std::sync::Arc;

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

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
        .manage(alerts::Alerts::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Data lives in the per-user app data folder:
            // %APPDATA%\com.focusspace.desktop\focusspace.db
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let backend = backend::Backend::open(&data_dir.join("focusspace.db"))?;
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
            alerts::take_pending_alert
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
