use anyhow::Result;
use std::collections::HashMap;
use termina_terminal::real_pty::RealPtyManager;
use std::process::Command;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct PTYSession {
    pub id: String,
    pub output_buffer: Vec<String>,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    // Track how much of the PTY buffer we've already delivered to the renderer
    pub last_read_len: usize,
    pub last_output_timestamp: u64,
}

impl PTYSession {
    pub fn new(id: String) -> Self {
        Self {
            id,
            output_buffer: Vec::new(),
            is_active: false,
            created_at: chrono::Utc::now(),
            last_read_len: 0,
            last_output_timestamp: 0,
        }
    }
}

pub struct PTYManager {
    sessions: HashMap<String, PTYSession>,
    real: RealPtyManager,
}

impl PTYManager {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            real: RealPtyManager::new(),
        }
    }

    pub async fn create_session(&mut self) -> Result<String> {
        let session_id = Uuid::new_v4().to_string();
        println!("Creating PTY session: {}", session_id);
        
        let mut session = PTYSession::new(session_id.clone());
        
        self.sessions.insert(session_id.clone(), session);
        
        println!("Calling real.create_session for: {}", session_id);
        match self.real.create_session(&session_id, None) {
            Ok(_) => {
                println!("Real PTY session created successfully: {}", session_id);
                // Initialize last timestamp
                if let Some(real_sess) = self.real.get_session(&session_id) {
                    if let Some(s) = self.sessions.get_mut(&session_id) {
                        s.last_output_timestamp = real_sess.get_last_activity();
                        s.is_active = true;
                    }
                }
                Ok(session_id)
            }
            Err(e) => {
                println!("Failed to create real PTY session: {}", e);
                Err(e)
            }
        }
    }

    pub async fn run_command(&mut self, session_id: &str, command: &str) -> Result<()> {
        self.real.run_command(session_id, command)?;
        Ok(())
    }

    /// Esegue un comando semplice fuori dal PTY e restituisce l'output (compat per AI)
    pub async fn run_command_simple(&self, command: &str, cwd: &str) -> Result<String> {
        let output = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(&["/C", command])
                .current_dir(cwd)
                .output()?
        } else {
            Command::new("sh")
                .arg("-c")
                .arg(command)
                .current_dir(cwd)
                .output()?
        };

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        if output.status.success() {
            Ok(stdout.to_string())
        } else {
            Ok(format!("Error: {}\n{}", stderr, stdout))
        }
    }

    pub async fn write_to_session(&mut self, session_id: &str, data: &str) -> Result<()> {
        self.real.write_to_session(session_id, data)?;
        Ok(())
    }

    pub async fn resize_session(&mut self, session_id: &str, _cols: u16, _rows: u16) -> Result<()> {
        self.real.resize_session(session_id, _cols, _rows)?;
        Ok(())
    }

    pub async fn close_session(&mut self, session_id: &str) -> Result<()> {
        self.real.close_session(session_id)?;
        self.sessions.remove(session_id);
        Ok(())
    }

    /// Returns incremental PTY output since the last read for this session
    pub async fn get_immediate_output(&mut self, session_id: &str, _since_ts: Option<u64>) -> Result<(String, u64, bool)> {
        let mut output = String::new();
        let mut has_new = false;
        let mut last_ts = 0u64;

        if let Some(real_sess) = self.real.get_session(session_id) {
            let full_buf = real_sess.get_output();
            last_ts = real_sess.get_last_activity();

            if let Some(sess) = self.sessions.get_mut(session_id) {
                let start = sess.last_read_len.min(full_buf.len());
                if full_buf.len() > start {
                    output = full_buf[start..].to_string();
                    has_new = true;
                    sess.last_read_len = full_buf.len();
                    sess.last_output_timestamp = last_ts;
                } else {
                    output.clear();
                    has_new = false;
                }
            }
        }

        Ok((output, last_ts, has_new))
    }

    /// Clears the PTY buffer for the given session
    pub async fn clear_session_buffer(&mut self, session_id: &str) -> Result<()> {
        self.real.clear_session(session_id)?;
        if let Some(sess) = self.sessions.get_mut(session_id) {
            sess.last_read_len = 0;
        }
        Ok(())
    }
}

impl Default for PTYManager {
    fn default() -> Self {
        Self::new()
    }
}