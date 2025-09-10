//! Gestione PTY (Pseudo-Terminal) in Rust
//! 
//! Questo modulo gestisce la creazione e gestione dei pseudo-terminali
//! per l'esecuzione di comandi interattivi.

use std::collections::HashMap;
use std::process::{Command, Stdio};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::process::Command as TokioCommand;
use anyhow::{Result, anyhow};
use log::{debug, info, warn};

use crate::session::TerminalSession;

/// Manager per la gestione dei PTY
pub struct PtyManager {
    sessions: HashMap<String, TerminalSession>,
    next_session_id: u32,
}

impl PtyManager {
    /// Crea un nuovo PTY Manager
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            next_session_id: 1,
        }
    }

    /// Crea una nuova sessione PTY
    pub fn create_session(&mut self, session_id: &str, cwd: Option<String>) -> Result<TerminalSession> {
        info!("Creating PTY session: {}", session_id);
        
        let cwd = cwd.unwrap_or_else(|| {
            std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string())
        });

        // Determina la shell da usare
        let shell = self.get_shell_command();
        
        // Crea il processo con PTY
        let child = Command::new(&shell.0)
            .args(&shell.1)
            .current_dir(&cwd)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;

        // Crea la sessione
        let session = TerminalSession::new(
            session_id.to_string(),
            child,
            cwd,
        );

        self.sessions.insert(session_id.to_string(), session.clone());
        info!("PTY session created successfully: {}", session_id);
        
        Ok(session)
    }

    /// Scrive dati a una sessione
    pub fn write_to_session(&mut self, session_id: &str, data: &str) -> Result<()> {
        if let Some(session) = self.sessions.get_mut(session_id) {
            debug!("Writing to session {}: {} bytes", session_id, data.len());
            session.write(data)?;
            Ok(())
        } else {
            Err(anyhow!("Session not found: {}", session_id))
        }
    }

    /// Ridimensiona una sessione PTY
    pub fn resize_session(&mut self, session_id: &str, cols: u16, rows: u16) -> Result<()> {
        if let Some(session) = self.sessions.get_mut(session_id) {
            debug!("Resizing session {} to {}x{}", session_id, cols, rows);
            session.resize(cols, rows)?;
            Ok(())
        } else {
            Err(anyhow!("Session not found: {}", session_id))
        }
    }

    /// Termina una sessione
    pub fn kill_session(&mut self, session_id: &str) -> Result<()> {
        if let Some(session) = self.sessions.get_mut(session_id) {
            info!("Killing session: {}", session_id);
            session.kill()?;
            self.sessions.remove(session_id);
            Ok(())
        } else {
            Err(anyhow!("Session not found: {}", session_id))
        }
    }

    /// Chiude una sessione
    pub fn close_session(&mut self, session_id: &str) -> Result<()> {
        if let Some(session) = self.sessions.get_mut(session_id) {
            info!("Closing session: {}", session_id);
            session.close()?;
            self.sessions.remove(session_id);
            Ok(())
        } else {
            Err(anyhow!("Session not found: {}", session_id))
        }
    }

    /// Pulisce una sessione
    pub fn clear_session(&mut self, session_id: &str) -> Result<()> {
        if let Some(session) = self.sessions.get_mut(session_id) {
            debug!("Clearing session: {}", session_id);
            session.clear()?;
            Ok(())
        } else {
            Err(anyhow!("Session not found: {}", session_id))
        }
    }

    /// Esegue un comando in una sessione
    pub fn run_command(&mut self, session_id: &str, command: &str) -> Result<()> {
        if let Some(session) = self.sessions.get_mut(session_id) {
            info!("Running command in session {}: {}", session_id, command);
            session.run_command(command)?;
            Ok(())
        } else {
            Err(anyhow!("Session not found: {}", session_id))
        }
    }

    /// Ottiene una sessione
    pub fn get_session(&self, session_id: &str) -> Option<&TerminalSession> {
        self.sessions.get(session_id)
    }

    /// Ottiene una sessione mutabile
    pub fn get_session_mut(&mut self, session_id: &str) -> Option<&mut TerminalSession> {
        self.sessions.get_mut(session_id)
    }

    /// Ottiene tutte le sessioni attive
    pub fn get_active_sessions(&self) -> Vec<String> {
        self.sessions.keys().cloned().collect()
    }

    /// Pulisce le sessioni inattive
    pub fn cleanup_inactive_sessions(&mut self, max_age_seconds: u64) -> usize {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let to_remove: Vec<String> = self.sessions
            .iter()
            .filter(|(_, session)| {
                let last_activity = session.get_last_activity();
                now - last_activity > max_age_seconds
            })
            .map(|(id, _)| id.clone())
            .collect();

        for session_id in &to_remove {
            if let Some(session) = self.sessions.get_mut(session_id) {
                let _ = session.close();
            }
            self.sessions.remove(session_id);
        }

        to_remove.len()
    }

    /// Determina il comando shell da usare
    fn get_shell_command(&self) -> (String, Vec<String>) {
        if cfg!(target_os = "windows") {
            ("powershell.exe".to_string(), vec!["-NoLogo".to_string()])
        } else {
            let shell = std::env::var("SHELL").unwrap_or_else(|_| "zsh".to_string());
            (shell, vec!["-l".to_string()])
        }
    }

    /// Esegue un comando con timeout
    pub async fn run_command_with_timeout(
        &self,
        command: &str,
        cwd: Option<&str>,
        timeout_seconds: u64,
    ) -> Result<CommandResult> {
        let default_cwd = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let cwd = cwd.unwrap_or(&default_cwd);

        let mut cmd = TokioCommand::new("sh");
        cmd.arg("-c")
           .arg(command)
           .current_dir(cwd)
           .stdin(Stdio::piped())
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());

        // Imposta le variabili d'ambiente per un terminale interattivo
        cmd.env("TERM", "xterm-256color")
           .env("COLORTERM", "truecolor")
           .env("FORCE_COLOR", "1")
           .env("TERM_PROGRAM", "TermInA");

        info!("Executing command: {}", command);

        let start_time = SystemTime::now();
        let child = cmd.spawn()?;

        // Attendi il completamento con timeout
        let timeout_duration = Duration::from_secs(timeout_seconds);
        let result = tokio::time::timeout(timeout_duration, child.wait_with_output()).await;

        let output = match result {
            Ok(Ok(output)) => output,
            Ok(Err(e)) => return Err(anyhow!("Command execution failed: {}", e)),
            Err(_) => {
                warn!("Command timed out after {} seconds", timeout_seconds);
                return Ok(CommandResult {
                    success: false,
                    output: String::new(),
                    stderr: format!("Command timed out after {} seconds", timeout_seconds),
                    exit_code: Some(-1),
                    duration: timeout_duration,
                });
            }
        };

        let duration = start_time.elapsed().unwrap_or_default();
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let exit_code = output.status.code();

        info!(
            "Command completed: success={}, exit_code={:?}, duration={:?}",
            output.status.success(),
            exit_code,
            duration
        );

        Ok(CommandResult {
            success: output.status.success(),
            output: stdout,
            stderr,
            exit_code,
            duration,
        })
    }
}

/// Risultato dell'esecuzione di un comando
#[derive(Debug, Clone)]
pub struct CommandResult {
    pub success: bool,
    pub output: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub duration: Duration,
}

impl CommandResult {
    /// Crea un risultato di successo
    pub fn success(output: String) -> Self {
        Self {
            success: true,
            output,
            stderr: String::new(),
            exit_code: Some(0),
            duration: Duration::from_secs(0),
        }
    }

    /// Crea un risultato di errore
    pub fn error(stderr: String, exit_code: Option<i32>) -> Self {
        Self {
            success: false,
            output: String::new(),
            stderr,
            exit_code,
            duration: Duration::from_secs(0),
        }
    }

    /// Combina stdout e stderr
    pub fn combined_output(&self) -> String {
        if self.stderr.is_empty() {
            self.output.clone()
        } else {
            format!("{}\n{}", self.output, self.stderr)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_command_execution() {
        let manager = PtyManager::new();
        let result = manager.run_command_with_timeout("echo hello", None, 5).await.unwrap();
        assert!(result.success);
        assert!(result.output.contains("hello"));
    }

    #[tokio::test]
    async fn test_command_timeout() {
        let manager = PtyManager::new();
        let result = manager.run_command_with_timeout("sleep 10", None, 1).await.unwrap();
        assert!(!result.success);
        assert!(result.stderr.contains("timed out"));
    }
}
