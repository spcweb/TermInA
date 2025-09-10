//! TermInA Terminal - Rust implementation
//! 
//! Questo modulo fornisce un'implementazione robusta del terminale in Rust
//! per risolvere i problemi con i comandi sudo e migliorare le prestazioni.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::mpsc;
use uuid::Uuid;

pub mod pty_manager;
pub mod session;
pub mod sudo_handler;
pub mod ffi;

use pty_manager::PtyManager;
use session::TerminalSession;
use sudo_handler::SudoHandler;

/// Struttura principale del terminale Rust
pub struct RustTerminal {
    pty_manager: Arc<Mutex<PtyManager>>,
    sessions: Arc<Mutex<HashMap<String, TerminalSession>>>,
    sudo_handler: Arc<SudoHandler>,
    command_sender: mpsc::UnboundedSender<CommandMessage>,
}

/// Messaggi per la comunicazione asincrona
#[derive(Debug, Clone)]
pub enum CommandMessage {
    CreateSession { session_id: String, cwd: Option<String> },
    WriteToSession { session_id: String, data: String },
    ResizeSession { session_id: String, cols: u16, rows: u16 },
    KillSession { session_id: String },
    CloseSession { session_id: String },
    ClearSession { session_id: String },
    RunCommand { session_id: String, command: String },
    SudoCommand { session_id: String, command: String, password: String },
}

/// Risultato delle operazioni del terminale
#[derive(Debug, Clone, serde::Serialize)]
pub struct TerminalResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
    pub exit_code: Option<i32>,
    pub session_id: String,
    pub timestamp: u64,
}

/// Configurazione del terminale
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TerminalConfig {
    pub default_shell: String,
    pub default_cwd: String,
    pub timeout_seconds: u64,
    pub max_sessions: usize,
    pub enable_sudo: bool,
    pub sudo_timeout: u64,
}

impl Default for TerminalConfig {
    fn default() -> Self {
        Self {
            default_shell: std::env::var("SHELL").unwrap_or_else(|_| {
                if cfg!(target_os = "windows") {
                    "powershell.exe".to_string()
                } else {
                    "zsh".to_string()
                }
            }),
            default_cwd: std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string()),
            timeout_seconds: 300, // 5 minuti
            max_sessions: 10,
            enable_sudo: true,
            sudo_timeout: 60, // 1 minuto per sudo
        }
    }
}

impl RustTerminal {
    /// Crea una nuova istanza del terminale Rust
    pub fn new() -> anyhow::Result<Self> {
        let config = TerminalConfig::default();
        Self::with_config(config)
    }

    /// Crea una nuova istanza con configurazione personalizzata
    pub fn with_config(config: TerminalConfig) -> anyhow::Result<Self> {
        let pty_manager = Arc::new(Mutex::new(PtyManager::new()));
        let sessions = Arc::new(Mutex::new(HashMap::new()));
        let sudo_handler = Arc::new(SudoHandler::new(config.sudo_timeout));
        
        let (command_sender, mut command_receiver) = mpsc::unbounded_channel::<CommandMessage>();
        
        // Spawn del task asincrono per gestire i comandi
        let pty_manager_clone = pty_manager.clone();
        let sessions_clone = sessions.clone();
        let sudo_handler_clone = sudo_handler.clone();
        
        tokio::spawn(async move {
            while let Some(message) = command_receiver.recv().await {
                match message {
                    CommandMessage::CreateSession { session_id, cwd } => {
                        if let Ok(mut manager) = pty_manager_clone.lock() {
                            if let Ok(session) = manager.create_session(&session_id, cwd) {
                                let mut sessions = sessions_clone.lock().unwrap();
                                sessions.insert(session_id.clone(), session);
                            }
                        }
                    }
                    CommandMessage::WriteToSession { session_id, data } => {
                        if let Ok(mut manager) = pty_manager_clone.lock() {
                            manager.write_to_session(&session_id, &data);
                        }
                    }
                    CommandMessage::ResizeSession { session_id, cols, rows } => {
                        if let Ok(mut manager) = pty_manager_clone.lock() {
                            manager.resize_session(&session_id, cols, rows);
                        }
                    }
                    CommandMessage::KillSession { session_id } => {
                        if let Ok(mut manager) = pty_manager_clone.lock() {
                            manager.kill_session(&session_id);
                        }
                        let mut sessions = sessions_clone.lock().unwrap();
                        sessions.remove(&session_id);
                    }
                    CommandMessage::CloseSession { session_id } => {
                        if let Ok(mut manager) = pty_manager_clone.lock() {
                            manager.close_session(&session_id);
                        }
                        let mut sessions = sessions_clone.lock().unwrap();
                        sessions.remove(&session_id);
                    }
                    CommandMessage::ClearSession { session_id } => {
                        if let Ok(mut manager) = pty_manager_clone.lock() {
                            manager.clear_session(&session_id);
                        }
                    }
                    CommandMessage::RunCommand { session_id, command } => {
                        if let Ok(mut manager) = pty_manager_clone.lock() {
                            manager.run_command(&session_id, &command);
                        }
                    }
                    CommandMessage::SudoCommand { session_id, command, password } => {
                        if let Ok(mut manager) = pty_manager_clone.lock() {
                            sudo_handler_clone.execute_sudo_command(&session_id, &command, &password, &mut manager);
                        }
                    }
                }
            }
        });

        Ok(Self {
            pty_manager,
            sessions,
            sudo_handler,
            command_sender,
        })
    }

    /// Crea una nuova sessione terminale
    pub fn create_session(&self, cwd: Option<String>) -> anyhow::Result<String> {
        let session_id = Uuid::new_v4().to_string();
        let cwd = cwd.unwrap_or_else(|| {
            std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string())
        });
        
        self.command_sender.send(CommandMessage::CreateSession {
            session_id: session_id.clone(),
            cwd: Some(cwd),
        })?;
        
        Ok(session_id)
    }

    /// Scrive dati a una sessione
    pub fn write_to_session(&self, session_id: &str, data: &str) -> anyhow::Result<()> {
        self.command_sender.send(CommandMessage::WriteToSession {
            session_id: session_id.to_string(),
            data: data.to_string(),
        })?;
        Ok(())
    }

    /// Ridimensiona una sessione
    pub fn resize_session(&self, session_id: &str, cols: u16, rows: u16) -> anyhow::Result<()> {
        self.command_sender.send(CommandMessage::ResizeSession {
            session_id: session_id.to_string(),
            cols,
            rows,
        })?;
        Ok(())
    }

    /// Termina una sessione
    pub fn kill_session(&self, session_id: &str) -> anyhow::Result<()> {
        self.command_sender.send(CommandMessage::KillSession {
            session_id: session_id.to_string(),
        })?;
        Ok(())
    }

    /// Chiude una sessione
    pub fn close_session(&self, session_id: &str) -> anyhow::Result<()> {
        self.command_sender.send(CommandMessage::CloseSession {
            session_id: session_id.to_string(),
        })?;
        Ok(())
    }

    /// Pulisce una sessione
    pub fn clear_session(&self, session_id: &str) -> anyhow::Result<()> {
        self.command_sender.send(CommandMessage::ClearSession {
            session_id: session_id.to_string(),
        })?;
        Ok(())
    }

    /// Esegue un comando in una sessione
    pub fn run_command(&self, session_id: &str, command: &str) -> anyhow::Result<()> {
        self.command_sender.send(CommandMessage::RunCommand {
            session_id: session_id.to_string(),
            command: command.to_string(),
        })?;
        Ok(())
    }

    /// Esegue un comando sudo
    pub fn run_sudo_command(&self, session_id: &str, command: &str, password: &str) -> anyhow::Result<()> {
        self.command_sender.send(CommandMessage::SudoCommand {
            session_id: session_id.to_string(),
            command: command.to_string(),
            password: password.to_string(),
        })?;
        Ok(())
    }

    /// Ottiene l'output di una sessione
    pub fn get_session_output(&self, session_id: &str) -> anyhow::Result<String> {
        let sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.get(session_id) {
            Ok(session.get_output())
        } else {
            Err(anyhow::anyhow!("Session not found: {}", session_id))
        }
    }

    /// Ottiene lo stato di una sessione
    pub fn get_session_status(&self, session_id: &str) -> anyhow::Result<session::SessionStatus> {
        let sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.get(session_id) {
            Ok(session.get_status())
        } else {
            Err(anyhow::anyhow!("Session not found: {}", session_id))
        }
    }

    /// Ottiene tutte le sessioni attive
    pub fn get_active_sessions(&self) -> Vec<String> {
        let sessions = self.sessions.lock().unwrap();
        sessions.keys().cloned().collect()
    }

    /// Pulisce le sessioni inattive
    pub fn cleanup_inactive_sessions(&self, max_age_seconds: u64) -> usize {
        let mut sessions = self.sessions.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        let to_remove: Vec<String> = sessions
            .iter()
            .filter(|(_, session)| {
                let last_activity = session.get_last_activity();
                now - last_activity > max_age_seconds
            })
            .map(|(id, _)| id.clone())
            .collect();
        
        for session_id in &to_remove {
            sessions.remove(session_id);
        }
        
        to_remove.len()
    }
}

impl Default for RustTerminal {
    fn default() -> Self {
        Self::new().expect("Failed to create RustTerminal")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_terminal_creation() {
        let terminal = RustTerminal::new().unwrap();
        let session_id = terminal.create_session(None).unwrap();
        assert!(!session_id.is_empty());
    }

    #[tokio::test]
    async fn test_session_management() {
        let terminal = RustTerminal::new().unwrap();
        let session_id = terminal.create_session(None).unwrap();
        
        // Test scrittura
        terminal.write_to_session(&session_id, "echo hello\n").unwrap();
        
        // Test ridimensionamento
        terminal.resize_session(&session_id, 80, 24).unwrap();
        
        // Test chiusura
        terminal.close_session(&session_id).unwrap();
    }
}
