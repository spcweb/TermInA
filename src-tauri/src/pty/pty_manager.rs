//! Gestione PTY (Pseudo-Terminal) in Rust
//!
//! Questo modulo gestisce la creazione e la gestione dei pseudo-terminali
//! per l'esecuzione di comandi interattivi reali.

use std::collections::HashMap;
use std::sync::Arc;

use anyhow::{anyhow, Result};
use log::{debug, info};

use super::{PtyConfig, RealPtySession};

struct SessionEntry {
    session: Arc<RealPtySession>,
    last_sent_index: usize,
}

/// Manager per la gestione dei PTY reali
#[derive(Default)]
pub struct PtyManager {
    sessions: HashMap<String, SessionEntry>,
}

impl PtyManager {
    /// Crea un nuovo PTY Manager
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }

    /// Crea una nuova sessione PTY con la configurazione fornita
    pub fn create_session(&mut self, session_id: String, mut config: PtyConfig) -> Result<String> {
        info!("Creating PTY session: {}", session_id);

        // Assicurati che la CWD esista; in caso contrario usa la home
        if config.cwd.is_empty() {
            config.cwd = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        }

        let session = RealPtySession::new(session_id.clone(), config)?;
        self.sessions.insert(
            session_id.clone(),
            SessionEntry {
                session: Arc::new(session),
                last_sent_index: 0,
            },
        );

        info!("PTY session created successfully: {}", session_id);
        Ok(session_id)
    }

    /// Scrive dati a una sessione esistente
    pub fn write_to_session(&self, session_id: &str, data: &str) -> Result<()> {
        if let Some(entry) = self.sessions.get(session_id) {
            entry.session.write(data)
        } else {
            Err(anyhow!("Session not found: {}", session_id))
        }
    }

    /// Ridimensiona una sessione PTY
    pub fn resize_session(&self, session_id: &str, cols: u16, rows: u16) -> Result<()> {
        if let Some(entry) = self.sessions.get(session_id) {
            entry.session.resize(cols, rows)
        } else {
            Err(anyhow!("Session not found: {}", session_id))
        }
    }

    /// Chiude e rimuove una sessione
    pub fn close_session(&mut self, session_id: &str) -> Result<()> {
        if let Some(entry) = self.sessions.remove(session_id) {
            entry.session.close()
        } else {
            Err(anyhow!("Session not found: {}", session_id))
        }
    }

    /// Uccide una sessione
    pub fn kill_session(&mut self, session_id: &str) -> Result<()> {
        if let Some(entry) = self.sessions.remove(session_id) {
            entry.session.kill()
        } else {
            Err(anyhow!("Session not found: {}", session_id))
        }
    }

    /// Pulisce il buffer di una sessione
    pub fn clear_session(&mut self, session_id: &str) -> Result<()> {
        if let Some(entry) = self.sessions.get_mut(session_id) {
            entry.last_sent_index = 0;
            entry.session.clear()
        } else {
            Err(anyhow!("Session not found: {}", session_id))
        }
    }

    /// Recupera output incrementale basato sull'indice interno
    pub fn get_incremental_output(&mut self, session_id: &str, _from_timestamp: u64) -> Result<(String, u64, bool)> {
        if let Some(entry) = self.sessions.get_mut(session_id) {
            let new_output = entry
                .session
                .get_incremental_output(entry.last_sent_index)
                .map_err(|e| anyhow!(e))?;

            if !new_output.is_empty() {
                entry.last_sent_index = entry.session.get_buffer_length();
                let last_activity = entry.session.get_last_activity();
                return Ok((new_output, last_activity, true));
            }

            let last_activity = entry.session.get_last_activity();
            Ok((String::new(), last_activity, false))
        } else {
            Err(anyhow!("Session not found: {}", session_id))
        }
    }

    /// Restituisce l'output completo della sessione
    pub fn get_session_output(&self, session_id: &str) -> Result<String> {
        if let Some(entry) = self.sessions.get(session_id) {
            entry
                .session
                .get_incremental_output(0)
                .map_err(|e| anyhow!(e))
        } else {
            Err(anyhow!("Session not found: {}", session_id))
        }
    }

    pub fn list_sessions(&self) -> Vec<String> {
        self.sessions.keys().cloned().collect()
    }

    /// Restituisce una sessione per usi speciali (es. sudo handler)
    pub fn get_session(&self, session_id: &str) -> Option<Arc<RealPtySession>> {
        self.sessions
            .get(session_id)
            .map(|entry| Arc::clone(&entry.session))
    }

    /// Aggiorna il prompt inviando un comando direttamente
    pub fn run_command(&self, session_id: &str, command: &str) -> Result<()> {
        if let Some(entry) = self.sessions.get(session_id) {
            entry.session.run_command(command)
        } else {
            Err(anyhow!("Session not found: {}", session_id))
        }
    }

    /// Pulisce le sessioni inattive (quelle non più attive)
    pub fn cleanup_inactive_sessions(&mut self) {
        let inactive: Vec<String> = self
            .sessions
            .iter()
            .filter(|(_, entry)| !*entry.session.is_active.lock().unwrap())
            .map(|(id, _)| id.clone())
            .collect();

        for session_id in inactive {
            if let Some(entry) = self.sessions.remove(&session_id) {
                debug!("Cleaning up inactive session: {}", session_id);
                let _ = entry.session.close();
            }
        }
    }
}
