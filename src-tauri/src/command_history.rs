use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandEntry {
    pub command: String,
    pub output: String,
    pub exit_code: i32,
    pub timestamp: DateTime<Utc>,
    pub working_directory: String,
}

pub struct CommandHistory {
    commands: VecDeque<CommandEntry>,
    max_size: usize,
}

impl CommandHistory {
    pub fn new() -> Self {
        Self {
            commands: VecDeque::new(),
            max_size: 1000,
        }
    }

    pub fn add_command(&mut self, command: &str, output: &str, exit_code: i32) {
        let entry = CommandEntry {
            command: command.to_string(),
            output: output.to_string(),
            exit_code,
            timestamp: Utc::now(),
            working_directory: std::env::current_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("/"))
                .to_string_lossy()
                .to_string(),
        };

        self.commands.push_back(entry);

        // Maintain max size
        while self.commands.len() > self.max_size {
            self.commands.pop_front();
        }
    }

    pub fn get_recent_history(&self, limit: usize) -> Vec<serde_json::Value> {
        self.commands
            .iter()
            .rev()
            .take(limit)
            .map(|entry| serde_json::to_value(entry).unwrap())
            .collect()
    }
}

impl Default for CommandHistory {
    fn default() -> Self {
        Self::new()
    }
}