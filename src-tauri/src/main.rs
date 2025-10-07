// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use dirs::{audio_dir, desktop_dir, document_dir, download_dir, home_dir, picture_dir, public_dir, video_dir};
use reqwest::{Client, Url};
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WebSearchPayload {
    query: String,
    search_engine: Option<String>,
    max_results: Option<u8>,
    fetch_content: Option<bool>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WebSearchItem {
    title: String,
    url: String,
    snippet: String,
    content: Option<String>,
    source: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WebSearchResponse {
    success: bool,
    query: String,
    search_engine: String,
    results: Vec<WebSearchItem>,
    summary: String,
    fallback: bool,
    error: Option<String>,
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
async fn web_search(payload: WebSearchPayload) -> Result<WebSearchResponse, String> {
    let query = payload.query.trim();
    if query.is_empty() {
        return Err("Search query cannot be empty".into());
    }

    let requested_engine = payload
        .search_engine
        .unwrap_or_else(|| "duckduckgo".to_string());
    let engine_key = requested_engine.to_lowercase();
    let canonical_engine = normalize_engine_name(&engine_key);
    let max_results = payload.max_results.unwrap_or(5).clamp(3, 10) as usize;
    let fetch_content = payload.fetch_content.unwrap_or(true);

    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    let mut fallback_error: Option<String> = None;
    let mut results = match engine_key.as_str() {
        "duckduckgo" | "ddg" | "duck" | "bing" | "google" => {
            match perform_duckduckgo_like_search(&client, query, max_results).await {
                Ok(items) => items,
                Err(error) => {
                    fallback_error = Some(error);
                    Vec::new()
                }
            }
        }
        _ => match perform_duckduckgo_like_search(&client, query, max_results).await {
            Ok(items) => items,
            Err(error) => {
                fallback_error = Some(error);
                Vec::new()
            }
        },
    };

    let mut fallback = false;

    if results.is_empty() {
    results = generate_simulated_results(query, max_results, &canonical_engine);
        fallback = true;
    } else if fetch_content {
        enrich_results_with_content(&client, &mut results).await;
    }

    let summary = generate_summary(&results, query);

    Ok(WebSearchResponse {
        success: !results.is_empty(),
        query: query.to_string(),
        search_engine: canonical_engine,
        results,
        summary,
        fallback,
        error: fallback_error,
    })
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
    let platform_raw = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    let shell = std::env::var("SHELL")
        .or_else(|_| std::env::var("COMSPEC"))
        .unwrap_or_default();

    let os_metadata = os_info::get();
    let platform_pretty = os_metadata.to_string();
    let platform_family = os_metadata.os_type().to_string();
    let platform_version = os_metadata.version().to_string();
    let home_path = home_dir();
    let home_absolute = home_path
        .as_ref()
        .map(|p| p.display().to_string())
        .unwrap_or_default();
    let home_ref = home_path.as_deref();

    let home_display = stringify_path(home_path.clone(), home_ref);

    fn resolve_localized_dir(default: Option<PathBuf>, home: Option<&Path>, candidates: &[&str]) -> Option<PathBuf> {
        if let Some(path) = default.as_ref() {
            if path.exists() {
                return default;
            }
        }
        if let Some(home_path) = home {
            for name in candidates {
                let candidate = home_path.join(name);
                if candidate.exists() {
                    return Some(candidate);
                }
            }
        }
        default
    }

    fn stringify_path(path: Option<PathBuf>, home: Option<&Path>) -> String {
        if let Some(p) = path {
            if let Some(home_path) = home {
                if let Ok(stripped) = p.strip_prefix(home_path) {
                    if stripped.as_os_str().is_empty() {
                        return "~".to_string();
                    }
                    let relative = stripped.display().to_string();
                    return format!("~{}{}", std::path::MAIN_SEPARATOR, relative);
                }
            }
            return p.display().to_string();
        }
        String::new()
    }

    let desktop = resolve_localized_dir(desktop_dir(), home_ref, &[
        "Scrivania",
        "Escritorio",
        "Escrivaninha",
        "Bureau",
        "Schreibtisch",
        "Skrivbord",
        "Desktop",
    ]);
    let documents = resolve_localized_dir(document_dir(), home_ref, &[
        "Documenti",
        "Documentos",
        "Dokumente",
        "Documents",
    ]);
    let downloads = resolve_localized_dir(download_dir(), home_ref, &[
        "Scaricati",
        "Download",
        "Descargas",
        "Téléchargements",
        "Downloads",
    ]);
    let pictures = resolve_localized_dir(picture_dir(), home_ref, &[
        "Immagini",
        "Imágenes",
        "Fotos",
        "Bilder",
        "Pictures",
    ]);
    let music = resolve_localized_dir(audio_dir(), home_ref, &[
        "Musica",
        "Música",
        "Musique",
        "Musik",
        "Music",
    ]);
    let videos = resolve_localized_dir(video_dir(), home_ref, &[
        "Film",
        "Filmati",
        "Películas",
        "Videos",
        "Video",
        "Movies",
    ]);
    let public_share = resolve_localized_dir(public_dir(), home_ref, &[
        "Pubblica",
        "Pública",
        "Publico",
        "Öffentlich",
        "Public",
    ]);

    let username = std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_default();

    let hostname = hostname::get()
        .ok()
        .and_then(|h| h.into_string().ok())
        .unwrap_or_default();

    let desktop_absolute = desktop
        .as_ref()
        .map(|p| p.display().to_string())
        .unwrap_or_default();
    let documents_absolute = documents
        .as_ref()
        .map(|p| p.display().to_string())
        .unwrap_or_default();
    let downloads_absolute = downloads
        .as_ref()
        .map(|p| p.display().to_string())
        .unwrap_or_default();
    let pictures_absolute = pictures
        .as_ref()
        .map(|p| p.display().to_string())
        .unwrap_or_default();
    let music_absolute = music
        .as_ref()
        .map(|p| p.display().to_string())
        .unwrap_or_default();
    let videos_absolute = videos
        .as_ref()
        .map(|p| p.display().to_string())
        .unwrap_or_default();
    let public_absolute = public_share
        .as_ref()
        .map(|p| p.display().to_string())
        .unwrap_or_default();

    let desktop_display = stringify_path(desktop.clone(), home_ref);
    let documents_display = stringify_path(documents.clone(), home_ref);
    let downloads_display = stringify_path(downloads.clone(), home_ref);
    let pictures_display = stringify_path(pictures.clone(), home_ref);
    let music_display = stringify_path(music.clone(), home_ref);
    let videos_display = stringify_path(videos.clone(), home_ref);
    let public_display = stringify_path(public_share.clone(), home_ref);

    Ok(json!({
        "platform": platform_raw,
        "platformFamily": platform_family,
        "platformPretty": platform_pretty,
        "platformVersion": platform_version,
        "arch": arch,
        "shell": shell,
        "homeDir": home_absolute,
        "homeDirDisplay": home_display,
        "desktopDir": desktop_display,
        "desktopDirAbsolute": desktop_absolute,
        "documentsDir": documents_display,
        "documentsDirAbsolute": documents_absolute,
        "downloadsDir": downloads_display,
        "downloadsDirAbsolute": downloads_absolute,
        "picturesDir": pictures_display,
        "picturesDirAbsolute": pictures_absolute,
        "musicDir": music_display,
        "musicDirAbsolute": music_absolute,
        "videosDir": videos_display,
        "videosDirAbsolute": videos_absolute,
        "publicDir": public_display,
        "publicDirAbsolute": public_absolute,
        "username": username,
        "hostname": hostname,
        "paths": {
            "home": {
                "absolute": home_absolute,
                "display": home_display,
            },
            "desktop": {
                "absolute": desktop_absolute,
                "display": desktop_display,
            },
            "documents": {
                "absolute": documents_absolute,
                "display": documents_display,
            },
            "downloads": {
                "absolute": downloads_absolute,
                "display": downloads_display,
            },
            "pictures": {
                "absolute": pictures_absolute,
                "display": pictures_display,
            },
            "music": {
                "absolute": music_absolute,
                "display": music_display,
            },
            "videos": {
                "absolute": videos_absolute,
                "display": videos_display,
            },
            "public": {
                "absolute": public_absolute,
                "display": public_display,
            },
        },
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

fn normalize_engine_name(engine_key: &str) -> String {
    match engine_key {
        "google" => "Google".to_string(),
        "bing" => "Bing".to_string(),
        "duckduckgo" | "ddg" | "duck" => "DuckDuckGo".to_string(),
        other => other.to_string(),
    }
}

async fn perform_duckduckgo_like_search(
    client: &Client,
    query: &str,
    max_results: usize,
) -> Result<Vec<WebSearchItem>, String> {
    let response = client
        .get("https://duckduckgo.com/html/")
        .query(&[("q", query), ("kl", "it-it")])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    let document = Html::parse_document(&response);
    let result_selector = Selector::parse("div.result").map_err(|e| e.to_string())?;
    let title_selector = Selector::parse("a.result__a").map_err(|e| e.to_string())?;
    let snippet_selector = Selector::parse("div.result__snippet").map_err(|e| e.to_string())?;
    let snippet_alt_selector = Selector::parse("a.result__snippet").map_err(|e| e.to_string())?;

    let mut items: Vec<WebSearchItem> = Vec::new();

    for element in document.select(&result_selector) {
        if items.len() >= max_results {
            break;
        }

        let Some(title_element) = element.select(&title_selector).next() else {
            continue;
        };

        let title_raw = title_element.text().collect::<Vec<_>>().join(" ");
        let title = collapse_whitespace(&title_raw);
        if title.is_empty() {
            continue;
        }

        let href = title_element.value().attr("href").unwrap_or_default();
        let url = resolve_duckduckgo_redirect(href);
        if url.is_empty() {
            continue;
        }

        let snippet_node = element
            .select(&snippet_selector)
            .next()
            .or_else(|| element.select(&snippet_alt_selector).next());
        let snippet = snippet_node
            .map(|node| collapse_whitespace(&node.text().collect::<Vec<_>>().join(" ")))
            .unwrap_or_default();

        items.push(WebSearchItem {
            title,
            url,
            snippet,
            content: None,
            source: "DuckDuckGo".to_string(),
        });
    }

    Ok(items)
}

fn resolve_duckduckgo_redirect(raw_url: &str) -> String {
    if raw_url.is_empty() {
        return String::new();
    }

    if raw_url.starts_with('/') {
        if let Ok(full) = Url::parse(&format!("https://duckduckgo.com{}", raw_url)) {
            return resolve_duckduckgo_redirect(full.as_str());
        }
    }

    match Url::parse(raw_url) {
        Ok(parsed) => {
            if parsed.domain() == Some("duckduckgo.com") {
                if let Some((_, uddg)) = parsed.query_pairs().find(|(k, _)| k == "uddg") {
                    if let Ok(decoded) = urlencoding::decode(&uddg) {
                        return decoded.into_owned();
                    }
                }
            }
            parsed.to_string()
        }
        Err(_) => raw_url.to_string(),
    }
}

async fn enrich_results_with_content(client: &Client, results: &mut [WebSearchItem]) {
    let max_pages = results.len().min(2);
    for item in results.iter_mut().take(max_pages) {
        if let Ok(content) = fetch_page_text(client, &item.url).await {
            item.content = Some(truncate_text(&content, 1200));
        }
    }
}

async fn fetch_page_text(client: &Client, url: &str) -> Result<String, String> {
    let response = client
        .get(url)
        .header(
            "Accept",
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        )
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    Ok(clean_html_to_text(&response))
}

fn clean_html_to_text(html: &str) -> String {
    let document = Html::parse_document(html);
    let text = document.root_element().text().collect::<Vec<_>>().join(" ");
    collapse_whitespace(&text)
}

fn collapse_whitespace(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn truncate_text(text: &str, max_chars: usize) -> String {
    if text.chars().count() <= max_chars {
        return text.to_string();
    }

    let truncated: String = text.chars().take(max_chars).collect();
    format!("{}…", truncated.trim_end())
}

fn generate_simulated_results(query: &str, max_results: usize, engine: &str) -> Vec<WebSearchItem> {
    let mut results = Vec::new();
    let keywords: Vec<&str> = query.split_whitespace().take(3).collect();
    for idx in 0..max_results {
        let url = format!(
            "https://example{}/{}",
            idx + 1,
            urlencoding::encode(query)
        );
        let snippet = if keywords.is_empty() {
            format!("Risultato simulato {} per la ricerca \"{}\"", idx + 1, query)
        } else {
            format!(
                "Risultato simulato {} con riferimenti a: {}",
                idx + 1,
                keywords.join(", ")
            )
        };

        results.push(WebSearchItem {
            title: format!("Risultato {} per \"{}\" ({})", idx + 1, query, engine),
            url,
            snippet,
            content: None,
            source: format!("Simulated ({})", engine),
        });
    }
    results
}

fn generate_summary(results: &[WebSearchItem], query: &str) -> String {
    if results.is_empty() {
        return format!("Nessun risultato trovato per \"{}\"", query);
    }

    let mut summary = format!("Trovati {} risultati per \"{}\":\n\n", results.len(), query);
    for (index, item) in results.iter().enumerate() {
        summary.push_str(&format!("{}. {}\n   URL: {}\n", index + 1, item.title, item.url));
        if !item.snippet.is_empty() {
            summary.push_str(&format!("   Snippet: {}\n", truncate_text(&item.snippet, 180)));
        }
        summary.push('\n');
    }

    summary.trim_end().to_string()
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
            web_search,
            get_cwd,
            get_system_info,
            close_current_window,
            open_settings_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
