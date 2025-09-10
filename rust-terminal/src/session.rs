//! Gestione delle sessioni terminale
//! 
//! Questo modulo gestisce le singole sessioni terminale con i loro stati
//! e la comunicazione con i processi.

use std::process::Child;
use std::sync::{Arc, Mutex};
use std::sync::mpsc::{self, Receiver, Sender};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use std::io::{Write, Read};
use anyhow::{Result, anyhow};
use log::{debug, error, info, warn};
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

/// Sessione terminale
#[derive(Clone)]
pub struct TerminalSession {
    id: String,
    process: Arc<Mutex<Option<Child>>>,
    cwd: String,
    buffer: Arc<Mutex<String>>,
    output_sender: Sender<String>,
    output_receiver: Arc<Mutex<Receiver<String>>>,
    is_active: Arc<Mutex<bool>>,
    is_executing: Arc<Mutex<bool>>,
    current_command: Arc<Mutex<String>>,
    last_activity: Arc<Mutex<u64>>,
    pid: Arc<Mutex<Option<u32>>>,
}

impl TerminalSession {
    /// Crea una nuova sessione terminale
    pub fn new(id: String, child: Child, cwd: String) -> Self {
        let (output_sender, output_receiver) = mpsc::channel();
        let output_receiver = Arc::new(Mutex::new(output_receiver));
        
        let session = Self {
            id: id.clone(),
            process: Arc::new(Mutex::new(Some(child))),
            cwd,
            buffer: Arc::new(Mutex::new(String::new())),
            output_sender,
            output_receiver,
            is_active: Arc::new(Mutex::new(true)),
            is_executing: Arc::new(Mutex::new(false)),
            current_command: Arc::new(Mutex::new(String::new())),
            last_activity: Arc::new(Mutex::new(Self::current_timestamp())),
            pid: Arc::new(Mutex::new(None)),
        };

        // Avvia il thread per leggere l'output
        session.start_output_reader();
        
        info!("Terminal session created: {}", id);
        session
    }

    /// Scrive dati alla sessione
    pub fn write(&self, data: &str) -> Result<()> {
        let mut process = self.process.lock().unwrap();
        if let Some(ref mut child) = process.as_mut() {
            if let Some(ref mut stdin) = child.stdin {
                stdin.write_all(data.as_bytes())?;
                stdin.flush()?;
                
                // Aggiorna l'attività
                *self.last_activity.lock().unwrap() = Self::current_timestamp();
                
                debug!("Wrote {} bytes to session {}", data.len(), self.id);
                Ok(())
            } else {
                Err(anyhow!("No stdin available for session {}", self.id))
            }
        } else {
            Err(anyhow!("Process not available for session {}", self.id))
        }
    }

    /// Ridimensiona la sessione
    pub fn resize(&self, cols: u16, rows: u16) -> Result<()> {
        // Per ora, questa è una implementazione base
        // In una versione completa, useremmo libc per ridimensionare il PTY
        debug!("Resizing session {} to {}x{}", self.id, cols, rows);
        Ok(())
    }

    /// Termina la sessione
    pub fn kill(&self) -> Result<()> {
        info!("Killing session: {}", self.id);
        
        let mut process = self.process.lock().unwrap();
        if let Some(mut child) = process.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        
        *self.is_active.lock().unwrap() = false;
        Ok(())
    }

    /// Chiude la sessione
    pub fn close(&self) -> Result<()> {
        info!("Closing session: {}", self.id);
        
        let mut process = self.process.lock().unwrap();
        if let Some(mut child) = process.take() {
            // Chiudi stdin per segnalare EOF
            drop(child.stdin.take());
            
            // Attendi che il processo termini
            let _ = child.wait();
        }
        
        *self.is_active.lock().unwrap() = false;
        Ok(())
    }

    /// Pulisce il buffer della sessione
    pub fn clear(&self) -> Result<()> {
        debug!("Clearing session: {}", self.id);
        *self.buffer.lock().unwrap() = String::new();
        Ok(())
    }

    /// Esegue un comando nella sessione
    pub fn run_command(&self, command: &str) -> Result<()> {
        info!("Running command in session {}: {}", self.id, command);
        
        *self.current_command.lock().unwrap() = command.to_string();
        *self.is_executing.lock().unwrap() = true;
        
        // Invia il comando alla sessione
        self.write(&format!("{}\n", command))?;
        
        Ok(())
    }

    /// Ottiene l'output della sessione
    pub fn get_output(&self) -> String {
        self.buffer.lock().unwrap().clone()
    }

    /// Ottiene lo stato della sessione
    pub fn get_status(&self) -> SessionStatus {
        SessionStatus {
            id: self.id.clone(),
            is_active: *self.is_active.lock().unwrap(),
            is_executing: *self.is_executing.lock().unwrap(),
            current_command: self.current_command.lock().unwrap().clone(),
            last_activity: *self.last_activity.lock().unwrap(),
            buffer_size: self.buffer.lock().unwrap().len(),
            cwd: self.cwd.clone(),
            pid: *self.pid.lock().unwrap(),
        }
    }

    /// Ottiene l'ultima attività
    pub fn get_last_activity(&self) -> u64 {
        *self.last_activity.lock().unwrap()
    }

    /// Avvia il thread per leggere l'output
    fn start_output_reader(&self) {
        let process = self.process.clone();
        let buffer = self.buffer.clone();
        let output_sender = self.output_sender.clone();
        let is_active = self.is_active.clone();
        let is_executing = self.is_executing.clone();
        let current_command = self.current_command.clone();
        let last_activity = self.last_activity.clone();
        let session_id = self.id.clone();

        thread::spawn(move || {
            info!("Starting output reader for session: {}", session_id);
            
            loop {
                let mut process_guard = process.lock().unwrap();
                if let Some(ref mut child) = process_guard.as_mut() {
                    if let Some(ref mut stdout) = child.stdout {
                        let mut buffer_data = [0; 1024];
                        match stdout.read(&mut buffer_data) {
                            Ok(0) => {
                                // EOF raggiunto
                                debug!("EOF reached for session {}", session_id);
                                break;
                            }
                            Ok(n) => {
                                let data = String::from_utf8_lossy(&buffer_data[..n]);
                                
                                // Aggiorna il buffer
                                buffer.lock().unwrap().push_str(&data);
                                
                                // Invia l'output
                                if let Err(e) = output_sender.send(data.to_string()) {
                                    warn!("Failed to send output for session {}: {}", session_id, e);
                                }
                                
                                // Aggiorna l'attività
                                *last_activity.lock().unwrap() = Self::current_timestamp();
                                
                                // Controlla se il comando è completato
                                if data.contains("$ ") || data.contains("% ") || data.contains("> ") {
                                    *is_executing.lock().unwrap() = false;
                                    *current_command.lock().unwrap() = String::new();
                                }
                                
                                debug!("Read {} bytes from session {}", n, session_id);
                            }
                            Err(e) => {
                                error!("Error reading from session {}: {}", session_id, e);
                                break;
                            }
                        }
                    } else {
                        warn!("No stdout available for session {}", session_id);
                        break;
                    }
                } else {
                    debug!("Process not available for session {}", session_id);
                    break;
                }
                
                // Rilascia il lock prima di dormire
                drop(process_guard);
                
                // Piccola pausa per evitare di consumare troppa CPU
                thread::sleep(std::time::Duration::from_millis(10));
            }
            
            // Marca la sessione come inattiva
            *is_active.lock().unwrap() = false;
            info!("Output reader finished for session: {}", session_id);
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

impl Drop for TerminalSession {
    fn drop(&mut self) {
        let _ = self.close();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::Command;

    #[test]
    fn test_session_creation() {
        let child = Command::new("echo")
            .arg("test")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .unwrap();
            
        let session = TerminalSession::new("test".to_string(), child, "/tmp".to_string());
        assert_eq!(session.id, "test");
        assert!(session.get_status().is_active);
    }

    #[test]
    fn test_session_status() {
        let child = Command::new("echo")
            .arg("test")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .unwrap();
            
        let session = TerminalSession::new("test".to_string(), child, "/tmp".to_string());
        let status = session.get_status();
        
        assert_eq!(status.id, "test");
        assert_eq!(status.cwd, "/tmp");
        assert!(status.is_active);
    }
}
