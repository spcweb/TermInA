pub mod pty_manager;
pub mod session;
pub mod sudo_handler;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use std::io::{Read, Write};
use log::{debug, error, info};
use anyhow::{anyhow, Result};

/// Configurazione PTY
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PtyConfig {
    pub cols: u16,
    pub rows: u16,
    pub shell: String,
    pub cwd: String,
    pub env_vars: HashMap<String, String>,
}

impl Default for PtyConfig {
    fn default() -> Self {
        let mut env_vars = HashMap::new();
        env_vars.insert("TERM".to_string(), "xterm-256color".to_string());
        env_vars.insert("COLORTERM".to_string(), "truecolor".to_string());
        
        Self {
            cols: 80,
            rows: 24,
            shell: std::env::var("SHELL").unwrap_or_else(|_| "zsh".to_string()),
            cwd: std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string()),
            env_vars,
        }
    }
}

/// Sessione PTY reale
pub struct RealPtySession {
    pub id: String,
    pub master: Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>>,
    pub child_process: Arc<Mutex<Box<dyn portable_pty::Child + Send>>>,
    pub config: PtyConfig,
    pub buffer: Arc<Mutex<Vec<u8>>>,
    pub is_active: Arc<Mutex<bool>>,
    pub last_activity: Arc<Mutex<u64>>,
}

impl RealPtySession {
    /// Crea una nuova sessione PTY
    pub fn new(id: String, config: PtyConfig) -> Result<Self> {
        info!("Creating real PTY session: {}", id);
        
        let pty_system = native_pty_system();
        let pty_pair = pty_system.openpty(PtySize {
            rows: config.rows,
            cols: config.cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        let mut cmd = CommandBuilder::new(&config.shell);
        cmd.cwd(&config.cwd);
        for (key, val) in &config.env_vars {
            cmd.env(key, val);
        }

        let child = pty_pair.slave.spawn_command(cmd)?;
        
        let session = Self {
            id: id.clone(),
            master: Arc::new(Mutex::new(pty_pair.master)),
            child_process: Arc::new(Mutex::new(child)),
            config,
            buffer: Arc::new(Mutex::new(Vec::new())),
            is_active: Arc::new(Mutex::new(true)),
            last_activity: Arc::new(Mutex::new(Self::current_timestamp())),
        };
        
        session.start_output_reader();
        info!("Real PTY session created successfully: {}", id);
        Ok(session)
    }
    
    /// Scrive dati alla sessione PTY
    pub fn write(&self, data: &str) -> Result<()> {
        let mut writer = self.master.lock().unwrap().take_writer()?;
        write!(writer, "{}", data)?;
        writer.flush()?;
        *self.last_activity.lock().unwrap() = Self::current_timestamp();
        debug!("Wrote {} bytes to PTY session {}", data.len(), self.id);
        Ok(())
    }
    
    /// Ridimensiona la sessione PTY
    pub fn resize(&self, cols: u16, rows: u16) -> Result<()> {
        debug!("Resizing PTY session {} to {}x{}", self.id, cols, rows);
        self.master.lock().unwrap().resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;
        Ok(())
    }
    
    /// Termina la sessione PTY
    pub fn kill(&self) -> Result<()> {
        info!("Killing PTY session: {}", self.id);
        *self.is_active.lock().unwrap() = false;
        self.child_process.lock().unwrap().kill()?;
        Ok(())
    }
    
    /// Chiude la sessione PTY
    pub fn close(&self) -> Result<()> {
        info!("Closing PTY session: {}", self.id);
        self.kill()
    }
    
    /// Pulisce il buffer della sessione
    pub fn clear(&self) -> Result<()> {
        debug!("Clearing PTY session: {}", self.id);
        *self.buffer.lock().unwrap() = Vec::new();
        Ok(())
    }
    
    /// Esegue un comando nella sessione
    pub fn run_command(&self, command: &str) -> Result<()> {
        info!("Running command in PTY session {}: {}", self.id, command);
        self.write(&format!("{}\n", command))
    }
    
    /// Ottiene l'output incrementale dalla sessione
    pub fn get_incremental_output(&self, from_index: usize) -> Result<String, anyhow::Error> {
        let buffer = self.buffer.lock().unwrap();
        if from_index >= buffer.len() {
            Ok(String::new())
        } else {
            Ok(String::from_utf8_lossy(&buffer[from_index..]).to_string())
        }
    }
    
    /// Ottiene la lunghezza del buffer
    pub fn get_buffer_length(&self) -> usize {
        self.buffer.lock().unwrap().len()
    }
    
    /// Ottiene lo stato della sessione
    pub fn get_status(&self) -> crate::pty::session::SessionStatus {
        let mut child = self.child_process.lock().unwrap();
        let pid = child.process_id();
        let is_executing = child.try_wait().unwrap_or(None).is_none();

        crate::pty::session::SessionStatus {
            id: self.id.clone(),
            is_active: *self.is_active.lock().unwrap(),
            is_executing,
            current_command: String::new(), // Questo è difficile da tracciare in un PTY reale
            last_activity: *self.last_activity.lock().unwrap(),
            buffer_size: self.buffer.lock().unwrap().len(),
            cwd: self.config.cwd.clone(),
            pid,
        }
    }
    
    /// Ottiene l'ultima attività
    pub fn get_last_activity(&self) -> u64 {
        *self.last_activity.lock().unwrap()
    }
    
    /// Avvia il thread per leggere l'output
    fn start_output_reader(&self) {
        let master = self.master.clone();
        let buffer = self.buffer.clone();
        let is_active = self.is_active.clone();
        let last_activity = self.last_activity.clone();
        let session_id = self.id.clone();
        
        thread::spawn(move || {
            info!("Starting output reader for PTY session: {}", session_id);
            
            // `try_clone_reader` è il modo corretto per ottenere un reader separato
            let mut reader = match master.lock().unwrap().try_clone_reader() {
                Ok(reader) => reader,
                Err(e) => {
                    error!("Failed to clone reader for PTY session {}: {}", session_id, e);
                    *is_active.lock().unwrap() = false;
                    return;
                }
            };
            
            let mut read_buffer = [0; 4096];
            
            loop {
                if !*is_active.lock().unwrap() {
                    debug!("PTY session {} marked as inactive, stopping reader", session_id);
                    break;
                }
                
                match reader.read(&mut read_buffer) {
                    Ok(0) => {
                        debug!("EOF reached for PTY session {}", session_id);
                        break; // Fine dello stream
                    }
                    Ok(n) => {
                        let data = &read_buffer[..n];
                        buffer.lock().unwrap().extend_from_slice(data);
                        *last_activity.lock().unwrap() = Self::current_timestamp();
                    }
                    Err(e) => {
                        // `io::ErrorKind::BrokenPipe` è normale quando il processo figlio termina
                        if e.kind() != std::io::ErrorKind::BrokenPipe {
                            error!("Error reading from PTY session {}: {}", session_id, e);
                        }
                        break;
                    }
                }
            }
            
            *is_active.lock().unwrap() = false;
            info!("Output reader finished for PTY session: {}", session_id);
        });
    }
    
    /// Ottiene il timestamp corrente
    fn current_timestamp() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }
}

impl Drop for RealPtySession {
    fn drop(&mut self) {
        let _ = self.kill();
    }
}

/// Manager per le sessioni PTY reali
#[derive(Default)]
pub struct RealPtyManager {
    sessions: HashMap<String, Arc<RealPtySession>>,
}

impl RealPtyManager {
    /// Crea un nuovo manager PTY
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }
    
    /// Crea una nuova sessione PTY
    pub fn create_session(&mut self, session_id: &str, cwd: Option<String>) -> Result<()> {
        info!("Creating real PTY session: {}", session_id);
        
        if self.sessions.contains_key(session_id) {
            return Err(anyhow!("Session with ID {} already exists", session_id));
        }

        let cwd = cwd.unwrap_or_else(|| {
            std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string())
        });
        
        let mut config = PtyConfig::default();
        config.cwd = cwd;
        
        let session = RealPtySession::new(session_id.to_string(), config)?;
        
        self.sessions.insert(session_id.to_string(), Arc::new(session));
        info!("Real PTY session created successfully: {}", session_id);
        
        Ok(())
    }
    
    /// Scrive dati a una sessione
    pub fn write_to_session(&self, session_id: &str, data: &str) -> Result<()> {
        if let Some(session) = self.sessions.get(session_id) {
            debug!("Writing to PTY session {}: {} bytes", session_id, data.len());
            session.write(data)
        } else {
            Err(anyhow!("PTY session not found: {}", session_id))
        }
    }
    
    /// Ridimensiona una sessione PTY
    pub fn resize_session(&self, session_id: &str, cols: u16, rows: u16) -> Result<()> {
        if let Some(session) = self.sessions.get(session_id) {
            debug!("Resizing PTY session {} to {}x{}", session_id, cols, rows);
            session.resize(cols, rows)
        } else {
            Err(anyhow!("PTY session not found: {}", session_id))
        }
    }
    
    /// Termina una sessione
    pub fn kill_session(&mut self, session_id: &str) -> Result<()> {
        if let Some(session) = self.sessions.remove(session_id) {
            info!("Killing PTY session: {}", session_id);
            session.kill()
        } else {
            Err(anyhow!("PTY session not found: {}", session_id))
        }
    }
    
    /// Chiude una sessione
    pub fn close_session(&mut self, session_id: &str) -> Result<()> {
        if let Some(session) = self.sessions.remove(session_id) {
            info!("Closing PTY session: {}", session_id);
            session.close()
        } else {
            Err(anyhow!("PTY session not found: {}", session_id))
        }
    }
    
    /// Pulisce una sessione
    pub fn clear_session(&self, session_id: &str) -> Result<()> {
        if let Some(session) = self.sessions.get(session_id) {
            debug!("Clearing PTY session: {}", session_id);
            session.clear()
        } else {
            Err(anyhow!("PTY session not found: {}", session_id))
        }
    }
    
    /// Esegue un comando in una sessione
    pub fn run_command(&self, session_id: &str, command: &str) -> Result<()> {
        if let Some(session) = self.sessions.get(session_id) {
            info!("Running command in PTY session {}: {}", session_id, command);
            session.run_command(command)
        } else {
            Err(anyhow!("PTY session not found: {}", session_id))
        }
    }
    
    /// Ottiene una sessione
    pub fn get_session(&self, session_id: &str) -> Option<Arc<RealPtySession>> {
        self.sessions.get(session_id).cloned()
    }
    
    /// Ottiene l'output incrementale di una sessione
    pub fn get_incremental_output(&self, session_id: &str, from_index: usize) -> Result<String> {
        if let Some(session) = self.sessions.get(session_id) {
            session.get_incremental_output(from_index)
        } else {
            Err(anyhow!("PTY session not found: {}", session_id))
        }
    }
    
    /// Ottiene tutte le sessioni attive
    pub fn get_active_sessions(&self) -> Vec<String> {
        self.sessions.keys().cloned().collect()
    }
    
    /// Pulisce le sessioni inattive
    pub fn cleanup_inactive_sessions(&mut self) {
        let to_remove: Vec<String> = self.sessions
            .iter()
            .filter(|(_, session)| !*session.is_active.lock().unwrap())
            .map(|(id, _)| id.clone())
            .collect();
        
        for session_id in &to_remove {
            info!("Cleaning up inactive session: {}", session_id);
            self.sessions.remove(session_id);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_pty_config_default() {
        let config = PtyConfig::default();
        assert_eq!(config.cols, 80);
        assert_eq!(config.rows, 24);
        assert!(config.env_vars.contains_key("TERM"));
    }
    
    #[test]
    fn test_real_pty_manager_creation() {
        let manager = RealPtyManager::new();
        assert_eq!(manager.sessions.len(), 0);
    }
}
