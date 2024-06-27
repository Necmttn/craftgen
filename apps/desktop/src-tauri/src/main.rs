// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_autostart::MacosLauncher;

mod cmd;
mod runtime;
mod setup;
mod tray;
use clap::Parser;
use tauri_plugin_log::{Target, TargetKind};

#[cfg(target_os = "macos")]
mod dock;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    /// Start app minimized
    #[arg(short, long)]
    minimized: bool,
}

#[derive(Debug)]
struct AppState {
    sidecar_handle: Option<tauri_plugin_shell::process::CommandChild>,
}

fn main() {
    let client = tauri_plugin_sentry::sentry::init((
        "https://9d430bec9a3518bcb0c34c7f8b9fe1d8@o4507501119799296.ingest.us.sentry.io/4507501176029184",
        tauri_plugin_sentry::sentry::ClientOptions {
            release: tauri_plugin_sentry::sentry::release_name!(),
            ..Default::default()
        },
    ));
       // Everything before here runs in both app and crash reporter processes
       let _guard = tauri_plugin_sentry::minidump::init(&client);
       // Everything after here runs in only the app process


    tauri::Builder::default()

        .plugin(tauri_plugin_sentry::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_oauth::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir {
                        file_name: Some("craftgen.log".to_string()),
                    }),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            sidecar_handle: None,
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            cmd::greet,
            cmd::start_edge_runtime
        ])
        .setup(setup::setup)
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(runtime::on_run_event);
}
