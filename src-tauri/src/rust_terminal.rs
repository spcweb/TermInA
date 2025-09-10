use anyhow::Result;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct RustTerminalSession {
    pub id: String,
    pub cwd: String,
    pub is_active: bool,
    pub output_buffer: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl RustTerminalSession {
    pub fn new(id: String, cwd: String) -> Self {
        Self {
            id,
            cwd,
            is_active: true,
            output_buffer: Vec::new(),
            created_at: chrono::Utc::now(),
        }
    }
}

pub struct RustTerminal {
    sessions: HashMap<String, RustTerminalSession>,
}

impl RustTerminal {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }

    pub async fn create_session(&mut self, cwd: &str) -> Result<String> {
        let session_id = Uuid::new_v4().to_string();
        let session = RustTerminalSession::new(session_id.clone(), cwd.to_string());
        
        self.sessions.insert(session_id.clone(), session);
        
        Ok(session_id)
    }

    pub async fn write_to_session(&mut self, session_id: &str, data: &str) -> Result<()> {
        if let Some(session) = self.sessions.get_mut(session_id) {
            session.output_buffer.push(data.to_string());
        }
        Ok(())
    }

    pub async fn resize_session(&mut self, session_id: &str, cols: u16, rows: u16) -> Result<()> {
        log::info!("Resizing Rust terminal session {}: {}x{}", session_id, cols, rows);
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

impl Default for RustTerminal {
    fn default() -> Self {
        Self::new()
    }
}