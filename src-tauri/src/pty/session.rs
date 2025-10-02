//! Gestione delle sessioni terminale
//! 
//! Questo modulo gestisce le singole sessioni terminale con i loro stati
//! e la comunicazione con i processi.

use std::process::Child;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use anyhow::{Result, anyhow};
use log::{debug, info};
use serde::{Deserialize, Serialize};

/// Stato di una sessione terminale
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStatus {
    pub id: String,
    pub is_active: bool,
    pub is_executing: bool,
    pub current_command: String,
    pub last_activity: u64,
    pub buffer_size: usize,
    pub cwd: String,
    pub pid: Option<u32>,
}

/// Sessione terminale (wrapper per compatibilità)
#[derive(Clone)]
pub struct TerminalSession {
    id: String,
    cwd: String,
    last_activity: Arc<Mutex<u64>>,
    pid: Arc<Mutex<Option<u32>>>,
    pty_type: Arc<Mutex<String>>,
    command: String,
    start_time: u64,
    end_time: Option<u64>,
    is_running: bool,
    exit_status: Option<String>,
    output_buffer: Arc<Mutex<String>>,
}

impl TerminalSession {
    /// Crea una nuova sessione terminale
    pub fn new(id: String, _child: Option<Child>, cwd: String) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        Self {
            id,
            cwd,
            last_activity: Arc::new(Mutex::new(now)),
            pid: Arc::new(Mutex::new(None)),
            pty_type: Arc::new(Mutex::new("standard".to_string())),
            command: String::new(),
            start_time: now,
            end_time: None,
            is_running: false,
            exit_status: None,
            output_buffer: Arc::new(Mutex::new(String::new())),
        }
    }

    /// Scrive dati alla sessione (non implementato per il wrapper)
    pub fn write(&self, _data: &str) -> Result<()> {
        Err(anyhow!("Write not supported on wrapper session {}", self.id))
    }

    /// Ridimensiona la sessione (non implementato per il wrapper)
    pub fn resize(&self, _cols: u16, _rows: u16) -> Result<()> {
        debug!("Resize called on wrapper session {}", self.id);
        Ok(())
    }

    /// Termina la sessione (non implementato per il wrapper)
    pub fn kill(&self) -> Result<()> {
        info!("Kill called on wrapper session: {}", self.id);
        Ok(())
    }

    /// Chiude la sessione (non implementato per il wrapper)
    pub fn close(&self) -> Result<()> {
        info!("Close called on wrapper session: {}", self.id);
        Ok(())
    }

    /// Pulisce il buffer della sessione (non implementato per il wrapper)
    pub fn clear(&self) -> Result<()> {
        debug!("Clear called on wrapper session: {}", self.id);
        Ok(())
    }

    /// Esegue un comando nella sessione (non implementato per il wrapper)
    pub fn run_command(&self, _command: &str) -> Result<()> {
        Err(anyhow!("Run command not supported on wrapper session {}", self.id))
    }

    /// Ottiene l'output della sessione (non implementato per il wrapper)
    pub fn get_output(&self) -> String {
        self.output_buffer.lock().unwrap().clone()
    }

    /// Ottiene lo stato della sessione
    pub fn get_status(&self) -> SessionStatus {
        SessionStatus {
            id: self.id.clone(),
            is_active: self.is_running,
            is_executing: self.is_running,
            current_command: self.command.clone(),
            last_activity: *self.last_activity.lock().unwrap(),
            buffer_size: self.output_buffer.lock().unwrap().len(),
            cwd: self.cwd.clone(),
            pid: *self.pid.lock().unwrap(),
        }
    }

    /// Ottiene l'ultima attività della sessione
    pub fn get_last_activity(&self) -> u64 {
        *self.last_activity.lock().unwrap()
    }

    /// Imposta il tipo di PTY
    pub fn set_pty_type(&mut self, pty_type: &str) {
        *self.pty_type.lock().unwrap() = pty_type.to_string();
    }
}

impl Drop for TerminalSession {
    fn drop(&mut self) {
        // Cleanup code here if needed
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::Command;

    #[test]
    fn test_session_creation() {
        let session = TerminalSession::new("test".to_string(), None, "/tmp".to_string());
        assert_eq!(session.id, "test");
        assert!(!session.get_status().is_active);
    }

    #[test]
    fn test_session_status() {
        let session = TerminalSession::new("test".to_string(), None, "/tmp".to_string());
        let status = session.get_status();
        
        assert_eq!(status.id, "test");
        assert_eq!(status.cwd, "/tmp");
        assert!(!status.is_active);
    }
}
