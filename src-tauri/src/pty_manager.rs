use anyhow::Result;
use std::collections::HashMap;
use std::process::Command;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct PTYSession {
    pub id: String,
    pub output_buffer: Vec<String>,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl PTYSession {
    pub fn new(id: String) -> Self {
        Self {
            id,
            output_buffer: Vec::new(),
            is_active: false,
            created_at: chrono::Utc::now(),
        }
    }
}

pub struct PTYManager {
    sessions: HashMap<String, PTYSession>,
}

impl PTYManager {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }

    pub async fn create_session(&mut self) -> Result<String> {
        let session_id = Uuid::new_v4().to_string();
        let session = PTYSession::new(session_id.clone());
        
        self.sessions.insert(session_id.clone(), session);
        
        Ok(session_id)
    }

    pub async fn run_command(&self, command: &str, cwd: &str) -> Result<String> {
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
        if let Some(session) = self.sessions.get_mut(session_id) {
            session.output_buffer.push(data.to_string());
        }
        Ok(())
    }

    pub async fn resize_session(&mut self, session_id: &str, _cols: u16, _rows: u16) -> Result<()> {
        // For now, just acknowledge the request
        log::info!("Resize requested for session {}: {}x{}", session_id, _cols, _rows);
        Ok(())
    }

    pub async fn close_session(&mut self, session_id: &str) -> Result<()> {
        if let Some(session) = self.sessions.get_mut(session_id) {
            session.is_active = false;
        }
        self.sessions.remove(session_id);
        Ok(())
    }
}

impl Default for PTYManager {
    fn default() -> Self {
        Self::new()
    }
}