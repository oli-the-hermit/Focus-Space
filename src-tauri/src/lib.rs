use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder, WindowEvent};

/// Local Express server: serves the built UI (`--static`) and the `/api` routes.
const SERVER_ADDR: &str = "127.0.0.1:4000";

/// The Node server started by a release build, killed when the app exits.
struct ServerProcess(Mutex<Option<Child>>);

fn server_is_up() -> bool {
    let addr = SERVER_ADDR.parse().expect("valid socket address");
    TcpStream::connect_timeout(&addr, Duration::from_millis(200)).is_ok()
}

/// Project folder holding `server/` and `dist/`. Defaults to the folder this crate
/// was built from; set FOCUS_SPACE_ROOT to run the app from somewhere else.
fn project_root() -> PathBuf {
    std::env::var_os("FOCUS_SPACE_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .parent()
                .expect("src-tauri has a parent folder")
                .to_path_buf()
        })
}

/// Starts `node server/index.js --static` unless a server is already listening,
/// then waits (up to 20 s) for it to accept connections.
fn start_server() -> Option<Child> {
    if server_is_up() {
        return None;
    }
    let node = std::env::var("FOCUS_SPACE_NODE").unwrap_or_else(|_| "node".into());
    let mut cmd = Command::new(node);
    cmd.arg("server/index.js").arg("--static").current_dir(project_root());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let child = match cmd.spawn() {
        Ok(child) => child,
        Err(err) => {
            log::error!("could not start the Focus Space server: {err}");
            return None;
        }
    };

    let deadline = Instant::now() + Duration::from_secs(20);
    while Instant::now() < deadline && !server_is_up() {
        std::thread::sleep(Duration::from_millis(150));
    }
    Some(child)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Dev: the Vite dev server (started by beforeDevCommand with the API).
            // Release: the local Express server, which serves the built UI and /api
            // from one origin so the app's relative /api calls keep working.
            let url = if cfg!(debug_assertions) {
                WebviewUrl::App("index.html".into())
            } else {
                let child = start_server();
                app.manage(ServerProcess(Mutex::new(child)));
                WebviewUrl::External(
                    format!("http://{SERVER_ADDR}")
                        .parse()
                        .expect("valid server URL"),
                )
            };

            WebviewWindowBuilder::new(app, "main", url)
                .title("Focus Space")
                .inner_size(1440.0, 900.0)
                .min_inner_size(1100.0, 700.0)
                .center()
                .build()?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // The mini player only mirrors the main window, so closing main quits.
            if window.label() == "main" {
                if let WindowEvent::Destroyed = event {
                    window.app_handle().exit(0);
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building the Focus Space desktop app");

    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            if let Some(server) = handle.try_state::<ServerProcess>() {
                if let Some(mut child) = server.0.lock().expect("server lock").take() {
                    let _ = child.kill();
                }
            }
        }
    });
}
