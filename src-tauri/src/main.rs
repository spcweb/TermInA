// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};

use dirs::{audio_dir, desktop_dir, document_dir, download_dir, home_dir, picture_dir, public_dir, video_dir};
use serde::Deserialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, State};

mod config_manager;
mod pty;

use crate::config_manager::ConfigManager;
use crate::pty::pty_manager::PtyManager;
use crate::pty::PtyConfig;

#[derive(Default, Deserialize)]
struct PtyCreateSessionPayload {
    session_id: Option<String>,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
    shell: Option<String>,
}

#[derive(Deserialize)]
struct PtyWritePayload {
    session_id: String,
    input: String,
}

#[derive(Deserialize)]
struct PtyResizePayload {
    session_id: String,
    cols: u16,
    rows: u16,
}

#[derive(Deserialize)]
struct PtyClosePayload {
    session_id: String,
}

#[derive(Deserialize)]
struct PtyImmediateOutputPayload {
    session_id: String,
    #[serde(default)]
    timestamp: Option<u64>,
}

#[derive(Deserialize)]
struct SetConfigPayload {
    key: String,
    value: Value,
}

#[derive(Deserialize)]
struct RunCommandPayload {
    command: String,
    cwd: Option<String>,
}

// Global state condiviso tra i comandi Tauri
pub struct AppState {
    pub pty_manager: Arc<Mutex<PtyManager>>,
    pub config_manager: Arc<Mutex<ConfigManager>>,
}

#[tauri::command]
fn pty_create_session(
    state: State<'_, AppState>,
    payload: Option<PtyCreateSessionPayload>,
) -> Result<String, String> {
    let options = payload.unwrap_or_default();

    let mut config = PtyConfig::default();
    if let Some(cwd) = options.cwd {
        config.cwd = cwd;
    }
    if let Some(cols) = options.cols {
        config.cols = cols;
    }
    if let Some(rows) = options.rows {
        config.rows = rows;
    }
    if let Some(shell) = options.shell {
        config.shell = shell;
    }

    let session_id = options
        .session_id
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let mut manager = state.pty_manager.lock().unwrap();
    manager
        .create_session(session_id.clone(), config)
        .map_err(|e| e.to_string())?;

    Ok(session_id)
}

#[tauri::command]
fn pty_write(state: State<'_, AppState>, payload: PtyWritePayload) -> Result<(), String> {
    let manager = state.pty_manager.lock().unwrap();
    manager
        .write_to_session(&payload.session_id, &payload.input)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn pty_resize(state: State<'_, AppState>, payload: PtyResizePayload) -> Result<(), String> {
    let manager = state.pty_manager.lock().unwrap();
    manager
        .resize_session(&payload.session_id, payload.cols, payload.rows)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn pty_clear(state: State<'_, AppState>, payload: PtyClosePayload) -> Result<(), String> {
    let mut manager = state.pty_manager.lock().unwrap();
    manager
        .clear_session(&payload.session_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn pty_close(state: State<'_, AppState>, payload: PtyClosePayload) -> Result<(), String> {
    let mut manager = state.pty_manager.lock().unwrap();
    manager
        .close_session(&payload.session_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn pty_get_immediate_output(
    state: State<'_, AppState>,
    payload: PtyImmediateOutputPayload,
) -> Result<Value, String> {
    let mut manager = state.pty_manager.lock().unwrap();
    match manager.get_incremental_output(&payload.session_id, payload.timestamp.unwrap_or(0)) {
        Ok((output, last_timestamp, has_new_data)) => Ok(json!({
            "success": true,
            "hasNewData": has_new_data,
            "output": output,
            "lastTimestamp": last_timestamp
        })),
        Err(e) => Ok(json!({
            "success": false,
            "error": e.to_string()
        })),
    }
}

#[tauri::command]
fn pty_list_sessions(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let manager = state.pty_manager.lock().unwrap();
    Ok(manager.list_sessions())
}

#[tauri::command]
fn pty_get_session_output(
    state: State<'_, AppState>,
    payload: PtyClosePayload,
) -> Result<String, String> {
    let manager = state.pty_manager.lock().unwrap();
    manager
        .get_session_output(&payload.session_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn run_command(payload: RunCommandPayload) -> Result<Value, String> {
    let mut command = if cfg!(target_os = "windows") {
        let mut cmd = tokio::process::Command::new("cmd");
        cmd.arg("/C").arg(&payload.command);
        cmd
    } else {
        let mut cmd = tokio::process::Command::new("sh");
        cmd.arg("-c").arg(&payload.command);
        cmd
    };

    if let Some(cwd) = &payload.cwd {
        command.current_dir(cwd);
    }

    let output = command
        .output()
        .await
        .map_err(|e| format!("Failed to execute command: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let combined = if stderr.is_empty() {
        stdout.clone()
    } else if stdout.is_empty() {
        stderr.clone()
    } else {
        format!("{}\n{}", stdout, stderr)
    };

    Ok(json!({
        "success": output.status.success(),
        "code": output.status.code(),
        "stdout": stdout,
        "stderr": stderr,
        "output": combined
    }))
}

#[tauri::command]
fn get_config(state: State<'_, AppState>) -> Result<Value, String> {
    let manager = state.config_manager.lock().unwrap();
    Ok(manager.get_config())
}

#[tauri::command]
fn set_config(state: State<'_, AppState>, payload: SetConfigPayload) -> Result<(), String> {
    let mut manager = state.config_manager.lock().unwrap();
    manager
        .set_key(&payload.key, payload.value)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn apply_settings(app: AppHandle, state: State<'_, AppState>, config: Value) -> Result<(), String> {
    {
        let mut manager = state.config_manager.lock().unwrap();
        manager
            .set_full_config(config.clone())
            .map_err(|e| e.to_string())?;
    }

    app.emit("settings-updated", config)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn test_ai_connection(_state: State<'_, AppState>, provider: String, ai_config: Value) -> Result<Value, String> {
    Ok(json!({
        "success": true,
        "provider": provider,
        "message": "AI connection simulated successfully",
        "config": ai_config
    }))
}

#[tauri::command]
fn get_cwd() -> Result<String, String> {
    std::env::current_dir()
        .map(|path| path.display().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_system_info() -> Result<Value, String> {
    let platform = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    let shell = std::env::var("SHELL")
        .or_else(|_| std::env::var("COMSPEC"))
        .unwrap_or_default();

    let home = home_dir().map(|p| p.display().to_string()).unwrap_or_default();
    let desktop = desktop_dir().map(|p| p.display().to_string()).unwrap_or_default();
    let documents = document_dir().map(|p| p.display().to_string()).unwrap_or_default();
    let downloads = download_dir().map(|p| p.display().to_string()).unwrap_or_default();
    let pictures = picture_dir().map(|p| p.display().to_string()).unwrap_or_default();
    let music = audio_dir().map(|p| p.display().to_string()).unwrap_or_default();
    let videos = video_dir().map(|p| p.display().to_string()).unwrap_or_default();
    let public_share = public_dir().map(|p| p.display().to_string()).unwrap_or_default();

    let username = std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_default();

    let hostname = hostname::get()
        .ok()
        .and_then(|h| h.into_string().ok())
        .unwrap_or_default();

    Ok(json!({
        "platform": platform,
        "arch": arch,
        "shell": shell,
        "homeDir": home,
        "desktopDir": desktop,
        "documentsDir": documents,
        "downloadsDir": downloads,
        "picturesDir": pictures,
        "musicDir": music,
        "videosDir": videos,
        "publicDir": public_share,
        "username": username,
        "hostname": hostname,
    }))
}

#[tauri::command]
fn close_current_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::{Url, WebviewUrl, WebviewWindowBuilder};

    if let Some(window) = app.get_webview_window("settings") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let url = if cfg!(debug_assertions) {
        WebviewUrl::External(
            Url::parse("http://localhost:3000/settings.html").map_err(|e| e.to_string())?,
        )
    } else {
        WebviewUrl::App("settings.html".into())
    };

    WebviewWindowBuilder::new(&app, "settings", url)
        .title("Settings - Termina")
        .inner_size(800.0, 600.0)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    let pty_manager = Arc::new(Mutex::new(PtyManager::new()));
    let config_manager = Arc::new(Mutex::new(ConfigManager::new()));

    tauri::Builder::default()
        .manage(AppState {
            pty_manager,
            config_manager,
        })
        .invoke_handler(tauri::generate_handler![
            pty_create_session,
            pty_write,
            pty_resize,
            pty_clear,
            pty_close,
            pty_list_sessions,
            pty_get_session_output,
            pty_get_immediate_output,
            run_command,
            get_config,
            set_config,
            apply_settings,
            test_ai_connection,
            get_cwd,
            get_system_info,
            close_current_window,
            open_settings_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
