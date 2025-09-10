use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::Manager;
use tauri::WebviewWindowBuilder;
use tauri::Emitter; // Added for emit method

mod ai_manager;
mod pty_manager;
mod rust_terminal;
mod webscraper;
mod config;
mod system_info;
mod command_history;

use ai_manager::AIManager;
use pty_manager::PTYManager;
use rust_terminal::RustTerminal;
use webscraper::WebScraper;
use config::Config;
use command_history::CommandHistory;

// Global state
pub struct AppState {
    pub ai_manager: Arc<Mutex<AIManager>>,
    pub pty_manager: Arc<Mutex<PTYManager>>,
    pub rust_terminal: Arc<Mutex<RustTerminal>>,
    pub webscraper: Arc<Mutex<WebScraper>>,
    pub config: Arc<Mutex<Config>>,
    pub command_history: Arc<Mutex<CommandHistory>>,
    pub current_working_directory: Arc<Mutex<String>>,
}

#[tauri::command]
async fn get_cwd(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let cwd = state.current_working_directory.lock().await;
    Ok(cwd.clone())
}

#[tauri::command]
async fn run_command(
    command: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let pty_manager = state.pty_manager.lock().await;
    let cwd = state.current_working_directory.lock().await;
    
    // Execute command using PTY manager
    match pty_manager.run_command(&command, &cwd).await {
        Ok(output) => {
            // Add to command history
            let mut history = state.command_history.lock().await;
            history.add_command(&command, &output, 0);
            Ok(output)
        }
        Err(e) => {
            let mut history = state.command_history.lock().await;
            history.add_command(&command, &e.to_string(), 1);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
async fn ai_request(
    prompt: String,
    context: Vec<String>,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let ai_manager = state.ai_manager.lock().await;
    ai_manager.request(&prompt, &context).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn ai_agent_request(
    prompt: String,
    context: Vec<String>,
    auto_execute: bool,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let ai_manager = state.ai_manager.lock().await;
    let pty_manager = state.pty_manager.clone();
    let cwd = state.current_working_directory.lock().await;
    let cwd_clone = cwd.clone();
    drop(cwd);
    
    // Set up command executor for AI agent
    let command_executor = Box::new(move |command: String| -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<String, anyhow::Error>> + Send>> {
        let pty_manager = pty_manager.clone();
        let cwd = cwd_clone.clone();
        Box::pin(async move {
            let pty = pty_manager.lock().await;
            pty.run_command(&command, &cwd).await
        })
    });
    
    ai_manager.process_request(&prompt, &context, auto_execute, command_executor)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn ai_agent_with_web(
    prompt: String,
    context: Vec<String>,
    auto_execute: bool,
    _ai_config: Option<serde_json::Value>,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    // First, try to enhance the prompt with web search if needed
    let enhanced_prompt = if prompt.to_lowercase().contains("search") || 
                          prompt.to_lowercase().contains("find") ||
                          prompt.to_lowercase().contains("latest") ||
                          prompt.to_lowercase().contains("current") {
        // Perform web search to get additional context
        let mut webscraper = state.webscraper.lock().await;
        match webscraper.search_web(&prompt, "google", 3).await {
            Ok(search_results) => {
                if let Some(results) = search_results.get("results").and_then(|r| r.as_array()) {
                    let web_context: Vec<String> = results.iter()
                        .filter_map(|r| r.get("snippet").and_then(|s| s.as_str()))
                        .map(|s| s.to_string())
                        .collect();
                    
                    if !web_context.is_empty() {
                        format!("{}\n\nWeb search results:\n{}", prompt, web_context.join("\n"))
                    } else {
                        prompt
                    }
                } else {
                    prompt
                }
            }
            Err(_) => prompt,
        }
    } else {
        prompt
    };

    // Now process the request with the enhanced prompt
    let ai_manager = state.ai_manager.lock().await;
    let pty_manager = state.pty_manager.clone();
    let cwd = state.current_working_directory.lock().await;
    let cwd_clone = cwd.clone();
    drop(cwd);
    
    // Set up command executor for AI agent
    let command_executor = Box::new(move |command: String| -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<String, anyhow::Error>> + Send>> {
        let pty_manager = pty_manager.clone();
        let cwd = cwd_clone.clone();
        Box::pin(async move {
            let pty = pty_manager.lock().await;
            pty.run_command(&command, &cwd).await
        })
    });
    
    // Usa la configurazione AI se disponibile, altrimenti usa il provider di default
    log::info!("AI config received: {:?}", _ai_config);
    if let Some(ai_config) = _ai_config {
        // Crea un process_request personalizzato che usa la configurazione AI
        let response = ai_manager.request_with_config(&enhanced_prompt, &context, &ai_config).await
            .map_err(|e| e.to_string())?;
        
        // Se auto_execute è true, controlla se la risposta contiene comandi da eseguire
        if auto_execute {
            // Estrai comandi dalla risposta e eseguili
            let lines: Vec<&str> = response.lines().collect();
            let mut final_response = response.clone();
            
            for line in lines {
                if line.trim().starts_with("```") && (line.contains("bash") || line.contains("sh") || line.contains("zsh")) {
                    // Trovato un blocco di codice, estrai il comando
                    if let Some(command) = extract_command_from_response(&response) {
                        match command_executor(command.clone()).await {
                            Ok(output) => {
                                final_response.push_str(&format!("\n\n[Executed: {}]\n{}", command, output));
                            }
                            Err(e) => {
                                final_response.push_str(&format!("\n\n[Error executing {}: {}]", command, e));
                            }
                        }
                    }
                }
            }
            
            Ok(serde_json::json!({
                "response": final_response,
                "provider": ai_config.get("provider").and_then(|v| v.as_str()).unwrap_or("unknown")
            }))
        } else {
            Ok(serde_json::json!({
                "response": response,
                "provider": ai_config.get("provider").and_then(|v| v.as_str()).unwrap_or("unknown")
            }))
        }
    } else {
        // Usa il provider di default
        ai_manager.process_request(&enhanced_prompt, &context, auto_execute, command_executor)
            .await
            .map_err(|e| e.to_string())
    }
}

// Helper function per estrarre comandi dalla risposta AI
fn extract_command_from_response(response: &str) -> Option<String> {
    let lines: Vec<&str> = response.lines().collect();
    let mut in_code_block = false;
    
    for line in lines {
        let trimmed = line.trim();
        if trimmed.starts_with("```") {
            in_code_block = !in_code_block;
            continue;
        }
        
        if in_code_block && !trimmed.is_empty() && !trimmed.starts_with("#") {
            return Some(trimmed.to_string());
        }
    }
    
    None
}

#[tauri::command]
async fn web_search(
    query: String,
    search_engine: String,
    max_results: usize,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut webscraper = state.webscraper.lock().await;
    webscraper.search_web(&query, &search_engine, max_results)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_config(
    key: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let config = state.config.lock().await;
    match key {
        Some(k) => {
            log::info!("Getting config for key: {}", k);
            config.get(&k).map_err(|e| e.to_string())
        },
        None => {
            log::info!("Getting full config");
            let full_config = config.get_all();
            log::info!("Full config: {:?}", full_config);
            Ok(serde_json::to_value(full_config).map_err(|e| e.to_string())?)
        },
    }
}

#[tauri::command]
async fn set_config(
    key: String,
    value: serde_json::Value,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    log::info!("set_config called with key: {}, value: {:?}", key, value);
    
    let mut config = state.config.lock().await;
    
    // Handle special cases
    if key == "full_config" {
        log::info!("Setting full_config");
        // Save entire configuration
        if let Ok(full_config) = serde_json::from_value::<serde_json::Map<String, serde_json::Value>>(value) {
            for (k, v) in full_config {
                log::info!("Setting config key: {}", k);
                config.set(&k, v).map_err(|e| {
                    log::error!("Error setting config key {}: {}", k, e);
                    e.to_string()
                })?;
            }
        } else {
            log::error!("Failed to parse full_config as Map");
            return Err("Failed to parse full_config".to_string());
        }
    } else if key == "reset" {
        log::info!("Resetting config to defaults");
        // Reset to defaults
        config.reset_to_defaults().map_err(|e| {
            log::error!("Error resetting config: {}", e);
            e.to_string()
        })?;
    } else {
        log::info!("Setting individual config key: {}", key);
        // Set individual key
        config.set(&key, value).map_err(|e| {
            log::error!("Error setting config key {}: {}", key, e);
            e.to_string()
        })?;
    }
    
    // Save configuration to disk
    log::info!("Saving configuration to disk...");
    config.save().await.map_err(|e| {
        log::error!("Error saving config: {}", e);
        e.to_string()
    })?;
    log::info!("Configuration saved successfully");
    
    Ok(true)
}

#[tauri::command]
async fn get_command_history(
    limit: Option<usize>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let history = state.command_history.lock().await;
    let limit = limit.unwrap_or(20);
    Ok(history.get_recent_history(limit))
}

#[tauri::command]
async fn pty_create_session(
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let mut pty_manager = state.pty_manager.lock().await;
    pty_manager.create_session().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn pty_write(
    session_id: String,
    data: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut pty_manager = state.pty_manager.lock().await;
    pty_manager.write_to_session(&session_id, &data).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn pty_resize(
    session_id: String,
    cols: u16,
    rows: u16,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut pty_manager = state.pty_manager.lock().await;
    pty_manager.resize_session(&session_id, cols, rows).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn pty_close(
    session_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut pty_manager = state.pty_manager.lock().await;
    pty_manager.close_session(&session_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn rust_terminal_create_session(
    cwd: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let mut rust_terminal = state.rust_terminal.lock().await;
    rust_terminal.create_session(&cwd).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn rust_terminal_write(
    session_id: String,
    data: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut rust_terminal = state.rust_terminal.lock().await;
    rust_terminal.write_to_session(&session_id, &data).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn rust_terminal_resize(
    session_id: String,
    cols: u16,
    rows: u16,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut rust_terminal = state.rust_terminal.lock().await;
    rust_terminal.resize_session(&session_id, cols, rows).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn rust_terminal_close(
    session_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut rust_terminal = state.rust_terminal.lock().await;
    rust_terminal.close_session(&session_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn close_current_window(window: tauri::WebviewWindow) -> Result<(), String> {
    log::info!("close_current_window command called");
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
async fn apply_settings(config: serde_json::Value, app: tauri::AppHandle) -> Result<(), String> {
    log::info!("apply_settings command called");
    
    // Invia un evento alla finestra principale per applicare le nuove impostazioni
    if let Some(main_window) = app.get_webview_window("main") {
        main_window.emit("settings-updated", &config).map_err(|e| e.to_string())?;
        log::info!("Settings update event sent to main window");
    } else {
        log::warn!("Main window not found, cannot apply settings");
    }
    
    Ok(())
}

#[tauri::command]
async fn test_ai_connection(provider: String, ai_config: serde_json::Value, state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    log::info!("test_ai_connection called for provider: {}", provider);
    log::info!("ai_config received: {}", serde_json::to_string(&ai_config).unwrap_or_else(|_| "Failed to serialize".to_string()));
    
    let ai_manager = state.ai_manager.lock().await;
    
    // Crea una configurazione temporanea per il test
    let test_prompt = "Hello, this is a connection test. Please respond with 'Connection successful'.";
    let test_context = vec!["Test context".to_string()];
    
    // Testa la connessione con una richiesta semplice
    match ai_manager.test_connection(&provider, &ai_config, &test_prompt, &test_context).await {
        Ok(response) => {
            log::info!("AI connection test successful for {}", provider);
            Ok(serde_json::json!({
                "success": true,
                "response": response,
                "provider": provider
            }))
        }
        Err(e) => {
            log::error!("AI connection test failed for {}: {}", provider, e);
            Ok(serde_json::json!({
                "success": false,
                "error": e.to_string(),
                "provider": provider
            }))
        }
    }
}

#[tauri::command]
async fn open_settings(app: tauri::AppHandle) -> Result<(), String> {
    log::info!("open_settings command called");
    
    // Check if settings window already exists
    if let Some(window) = app.get_webview_window("settings") {
        log::info!("Settings window already exists, focusing it");
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    log::info!("Creating new settings window");
    
    // Try to create a new window using WebviewWindowBuilder
    match WebviewWindowBuilder::new(
        &app,
        "settings",
        tauri::WebviewUrl::App("settings.html".into())
    )
    .title("Termina Settings")
    .inner_size(800.0, 600.0)
    .resizable(true)
    .center()
    .build() {
        Ok(_) => {
            log::info!("Settings window created successfully using WebviewWindowBuilder");
            Ok(())
        }
        Err(e) => {
            log::error!("Failed to create settings window: {}", e);
            Err(format!("Failed to create settings window: {}", e))
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    
    tauri::Builder::default()
        .manage(AppState {
            ai_manager: Arc::new(Mutex::new(AIManager::new())),
            pty_manager: Arc::new(Mutex::new(PTYManager::new())),
            rust_terminal: Arc::new(Mutex::new(RustTerminal::new())),
            webscraper: Arc::new(Mutex::new(WebScraper::new())),
            config: Arc::new(Mutex::new(Config::new())),
            command_history: Arc::new(Mutex::new(CommandHistory::new())),
            current_working_directory: Arc::new(Mutex::new(
                dirs::home_dir()
                    .unwrap_or_else(|| std::path::PathBuf::from("/"))
                    .to_string_lossy()
                    .to_string(),
            )),
        })
        .invoke_handler(tauri::generate_handler![
            get_cwd,
            run_command,
            ai_request,
            ai_agent_request,
            ai_agent_with_web,
            web_search,
            get_config,
            set_config,
            get_command_history,
            pty_create_session,
            pty_write,
            pty_resize,
            pty_close,
            rust_terminal_create_session,
            rust_terminal_write,
            rust_terminal_resize,
            rust_terminal_close,
            open_settings,
            close_current_window,
            apply_settings,
            test_ai_connection,
        ])
        .setup(|app| {
            // Initialize configuration
            log::info!("Termina application starting...");
            
            // Load configuration asynchronously
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Some(state) = app_handle.try_state::<AppState>() {
                    let mut config = state.config.lock().await;
                    if let Err(e) = config.load().await {
                        log::error!("Failed to load configuration: {}", e);
                    } else {
                        log::info!("Configuration loaded successfully");
                    }
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}