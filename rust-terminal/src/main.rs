//! TermInA Terminal - Binary entry point
//! 
//! Questo è il punto di ingresso principale per il terminale Rust.
//! Supporta la comunicazione JSON con Node.js per l'integrazione PTY.

use anyhow::Result;
use log::{info, error, debug};
use std::io::{Read, Write, BufRead, BufReader};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use termina_terminal::real_pty::RealPtyManager;
use env_logger;

/// Messaggio di comando da Node.js
#[derive(Debug, Clone, Deserialize)]
struct CommandMessage {
    id: u32,
    command: String,
    session_id: Option<String>,
    cwd: Option<String>,
    data: Option<String>,
    command_text: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
    from_index: Option<usize>,
}

/// Risposta del comando
#[derive(Debug, Serialize)]
struct CommandResponse {
    id: u32,
    success: bool,
    output: Option<String>,
    session_id: Option<String>,
    error: Option<String>,
}

/// Server PTY per comunicazione con Node.js
struct PtyServer {
    manager: Arc<Mutex<RealPtyManager>>,
    sessions: Arc<Mutex<HashMap<String, String>>>, // session_id -> cwd
}

impl PtyServer {
    fn new() -> Self {
        Self {
            manager: Arc::new(Mutex::new(RealPtyManager::new())),
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn handle_command(&self, message: CommandMessage) -> CommandResponse {
        debug!("Handling command: {:?}", message);
        
        match message.command.as_str() {
            "create_session" => self.handle_create_session(message),
            "write_to_session" => self.handle_write_to_session(message),
            "get_session_output" => self.handle_get_session_output(message),
            "resize_session" => self.handle_resize_session(message),
            "kill_session" => self.handle_kill_session(message),
            "close_session" => self.handle_close_session(message),
            "clear_session" => self.handle_clear_session(message),
            "run_command" => self.handle_run_command(message),
            _ => CommandResponse {
                id: message.id,
                success: false,
                output: None,
                session_id: None,
                error: Some(format!("Unknown command: {}", message.command)),
            },
        }
    }

    fn handle_create_session(&self, message: CommandMessage) -> CommandResponse {
        let session_id = message.session_id.unwrap_or_else(|| {
            format!("session_{}", std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs())
        });

        let cwd = message.cwd.unwrap_or_else(|| {
            std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string())
        });

        match self.manager.lock().unwrap().create_session(&session_id, Some(cwd.clone())) {
            Ok(_) => {
                self.sessions.lock().unwrap().insert(session_id.clone(), cwd);
                CommandResponse {
                    id: message.id,
                    success: true,
                    output: None,
                    session_id: Some(session_id),
                    error: None,
                }
            }
            Err(e) => CommandResponse {
                id: message.id,
                success: false,
                output: None,
                session_id: None,
                error: Some(format!("Failed to create session: {}", e)),
            },
        }
    }

    fn handle_write_to_session(&self, message: CommandMessage) -> CommandResponse {
        let session_id = message.session_id.unwrap_or_default();
        let data = message.data.unwrap_or_default();

        match self.manager.lock().unwrap().write_to_session(&session_id, &data) {
            Ok(_) => CommandResponse {
                id: message.id,
                success: true,
                output: None,
                session_id: Some(session_id),
                error: None,
            },
            Err(e) => CommandResponse {
                id: message.id,
                success: false,
                output: None,
                session_id: None,
                error: Some(format!("Failed to write to session: {}", e)),
            },
        }
    }

    fn handle_get_session_output(&self, message: CommandMessage) -> CommandResponse {
        let session_id = message.session_id.unwrap_or_default();
        let from_index = message.from_index.unwrap_or(0);

        match self.manager.lock().unwrap().get_incremental_output(&session_id, from_index) {
            Ok(output) => CommandResponse {
                id: message.id,
                success: true,
                output: Some(output),
                session_id: Some(session_id),
                error: None,
            },
            Err(e) => CommandResponse {
                id: message.id,
                success: false,
                output: None,
                session_id: None,
                error: Some(format!("Failed to get session output: {}", e)),
            },
        }
    }

    fn handle_resize_session(&self, message: CommandMessage) -> CommandResponse {
        let session_id = message.session_id.unwrap_or_default();
        let cols = message.cols.unwrap_or(80);
        let rows = message.rows.unwrap_or(24);

        match self.manager.lock().unwrap().resize_session(&session_id, cols, rows) {
            Ok(_) => CommandResponse {
                id: message.id,
                success: true,
                output: None,
                session_id: Some(session_id),
                error: None,
            },
            Err(e) => CommandResponse {
                id: message.id,
                success: false,
                output: None,
                session_id: None,
                error: Some(format!("Failed to resize session: {}", e)),
            },
        }
    }

    fn handle_kill_session(&self, message: CommandMessage) -> CommandResponse {
        let session_id = message.session_id.unwrap_or_default();

        match self.manager.lock().unwrap().kill_session(&session_id) {
            Ok(_) => {
                self.sessions.lock().unwrap().remove(&session_id);
                CommandResponse {
                    id: message.id,
                    success: true,
                    output: None,
                    session_id: Some(session_id),
                    error: None,
                }
            }
            Err(e) => CommandResponse {
                id: message.id,
                success: false,
                output: None,
                session_id: None,
                error: Some(format!("Failed to kill session: {}", e)),
            },
        }
    }

    fn handle_close_session(&self, message: CommandMessage) -> CommandResponse {
        let session_id = message.session_id.unwrap_or_default();

        match self.manager.lock().unwrap().close_session(&session_id) {
            Ok(_) => {
                self.sessions.lock().unwrap().remove(&session_id);
                CommandResponse {
                    id: message.id,
                    success: true,
                    output: None,
                    session_id: Some(session_id),
                    error: None,
                }
            }
            Err(e) => CommandResponse {
                id: message.id,
                success: false,
                output: None,
                session_id: None,
                error: Some(format!("Failed to close session: {}", e)),
            },
        }
    }

    fn handle_clear_session(&self, message: CommandMessage) -> CommandResponse {
        let session_id = message.session_id.unwrap_or_default();

        match self.manager.lock().unwrap().clear_session(&session_id) {
            Ok(_) => CommandResponse {
                id: message.id,
                success: true,
                output: None,
                session_id: Some(session_id),
                error: None,
            },
            Err(e) => CommandResponse {
                id: message.id,
                success: false,
                output: None,
                session_id: None,
                error: Some(format!("Failed to clear session: {}", e)),
            },
        }
    }

    fn handle_run_command(&self, message: CommandMessage) -> CommandResponse {
        let session_id = message.session_id.unwrap_or_default();
        let command = message.command_text.unwrap_or_default();

        match self.manager.lock().unwrap().run_command(&session_id, &command) {
            Ok(_) => CommandResponse {
                id: message.id,
                success: true,
                output: None,
                session_id: Some(session_id),
                error: None,
            },
            Err(e) => CommandResponse {
                id: message.id,
                success: false,
                output: None,
                session_id: None,
                error: Some(format!("Failed to run command: {}", e)),
            },
        }
    }
}

fn main() -> Result<()> {
    // Inizializza il logger
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .init();

    info!("Starting TermInA Terminal (Rust PTY Server)");
    
    // Segnala che il server è pronto
    println!("Rust PTY ready");
    
    let server = PtyServer::new();
    let stdin = std::io::stdin();
    let reader = BufReader::new(stdin);
    
    info!("Rust PTY Server ready for commands");
    
    // Leggi comandi JSON da stdin
    for line in reader.lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        
        debug!("Received command: {}", line);
        
        match serde_json::from_str::<CommandMessage>(&line) {
            Ok(message) => {
                let command_type = message.command.clone();
                let response = server.handle_command(message);
                let response_json = serde_json::to_string(&response)?;
                println!("{}", response_json);
                
                // Se è un comando run_command, aspetta un po' per permettere la lettura dell'output
                if command_type == "run_command" {
                    std::thread::sleep(std::time::Duration::from_millis(500));
                }
            }
            Err(e) => {
                error!("Failed to parse command: {}", e);
                let error_response = CommandResponse {
                    id: 0,
                    success: false,
                    output: None,
                    session_id: None,
                    error: Some(format!("Invalid JSON: {}", e)),
                };
                let error_json = serde_json::to_string(&error_response)?;
                println!("{}", error_json);
            }
        }
    }

    info!("Rust PTY Server shutting down");
    Ok(())
}

// fn run_basic_tests(terminal: &RustTerminal) -> Result<()> {
//     info!("Running basic tests...");

//     // Test 1: Creazione sessione
//     info!("Test 1: Creating session");
//     let session_id = terminal.create_session(None)?;
//     info!("Session created: {}", session_id);

//     // Test 2: Scrittura alla sessione
//     info!("Test 2: Writing to session");
//     terminal.write_to_session(&session_id, "echo 'Hello from Rust terminal!'\n")?;

//     // Aspetta un po' per l'output
//     std::thread::sleep(std::time::Duration::from_millis(100));

//     // Test 3: Lettura output
//     info!("Test 3: Reading session output");
//     let output = terminal.get_session_output(&session_id)?;
//     info!("Session output: {}", output);

//     // Test 4: Stato sessione
//     info!("Test 4: Getting session status");
//     let status = terminal.get_session_status(&session_id)?;
//     info!("Session status: {:?}", status);

//     // Test 5: Ridimensionamento
//     info!("Test 5: Resizing session");
//     terminal.resize_session(&session_id, 80, 24)?;

//     // Test 6: Chiusura sessione
//     info!("Test 6: Closing session");
//     terminal.close_session(&session_id)?;

//     info!("All basic tests completed successfully");
//     Ok(())
// }