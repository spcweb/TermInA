use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use anyhow::Result;
use std::path::PathBuf;
use dirs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub name: String,
    pub background: String,
    pub foreground: String,
    pub cursor: String,
    pub accent: String,
    pub background_blur: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalConfig {
    pub font_family: String,
    pub font_size: u32,
    pub line_height: f64,
    pub cursor_style: String,
    pub cursor_blink: bool,
    pub scrollback: u32,
    pub bell_sound: bool,
    pub auto_scroll: bool,
    pub smooth_scroll: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub provider: String,
    pub auto_execute: bool,
    pub context_lines: u32,
    pub gemini: GeminiConfig,
    pub openai: OpenAIConfig,
    pub ollama: OllamaConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeminiConfig {
    pub api_key: String,
    pub model: String,
    pub temperature: f64,
    pub max_output_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIConfig {
    pub api_key: String,
    pub model: String,
    pub temperature: f64,
    pub max_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaConfig {
    pub base_url: String,
    pub model: String,
    pub temperature: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub auto_save: bool,
    pub show_welcome: bool,
    pub theme: Theme,
    pub terminal: TerminalConfig,
    pub ai: AIConfig,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            auto_save: true,
            show_welcome: true,
            theme: Theme {
                name: "warp-dark".to_string(),
                background: "#1e2124".to_string(),
                foreground: "#ffffff".to_string(),
                cursor: "#00d4aa".to_string(),
                accent: "#00d4aa".to_string(),
                background_blur: true,
            },
            terminal: TerminalConfig {
                font_family: "JetBrains Mono".to_string(),
                font_size: 14,
                line_height: 1.4,
                cursor_style: "bar".to_string(),
                cursor_blink: true,
                scrollback: 10000,
                bell_sound: false,
                auto_scroll: true,
                smooth_scroll: true,
            },
            ai: AIConfig {
                provider: "ollama".to_string(),
                auto_execute: false,
                context_lines: 10,
                gemini: GeminiConfig {
                    api_key: "".to_string(),
                    model: "gemini-2.5-flash".to_string(),
                    temperature: 0.7,
                    max_output_tokens: 4096,
                },
                openai: OpenAIConfig {
                    api_key: "".to_string(),
                    model: "gpt-4o".to_string(),
                    temperature: 0.7,
                    max_tokens: 4096,
                },
                ollama: OllamaConfig {
                    base_url: "http://localhost:11434".to_string(),
                    model: "gpt-oss:20b".to_string(),
                    temperature: 0.7,
                },
            },
        }
    }
}

impl Config {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn load(&mut self) -> Result<()> {
        let config_path = self.get_config_path()?;
        
        if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)?;
            let loaded_config: Config = serde_json::from_str(&content)?;
            *self = loaded_config;
            log::info!("Configuration loaded from: {:?}", config_path);
        } else {
            log::info!("No config file found, using defaults");
        }
        
        Ok(())
    }

    pub async fn save(&self) -> Result<()> {
        let config_path = self.get_config_path()?;
        
        // Create config directory if it doesn't exist
        if let Some(parent) = config_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(&config_path, content)?;
        log::info!("Configuration saved to: {:?}", config_path);
        
        Ok(())
    }

    fn get_config_path(&self) -> Result<PathBuf> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| anyhow::anyhow!("Could not find config directory"))?;
        Ok(config_dir.join("termina").join("config.json"))
    }

    pub fn get(&self, key: &str) -> Result<serde_json::Value> {
        match key {
            "auto_save" => Ok(serde_json::to_value(self.auto_save)?),
            "show_welcome" => Ok(serde_json::to_value(self.show_welcome)?),
            "theme" => Ok(serde_json::to_value(&self.theme)?),
            "terminal" => Ok(serde_json::to_value(&self.terminal)?),
            "ai" => Ok(serde_json::to_value(&self.ai)?),
            "full_config" => Ok(serde_json::to_value(self)?),
            _ => Err(anyhow::anyhow!("Unknown config key: {}", key)),
        }
    }

    pub fn set(&mut self, key: &str, value: serde_json::Value) -> Result<()> {
        match key {
            "auto_save" => {
                self.auto_save = serde_json::from_value(value)?;
            }
            "show_welcome" => {
                self.show_welcome = serde_json::from_value(value)?;
            }
            "theme" => {
                self.theme = serde_json::from_value(value)?;
            }
            "terminal" => {
                self.terminal = serde_json::from_value(value)?;
            }
            "ai" => {
                self.ai = serde_json::from_value(value)?;
            }
            "full_config" => {
                // Replace entire config
                let new_config: Config = serde_json::from_value(value)?;
                *self = new_config;
            }
            _ => return Err(anyhow::anyhow!("Unknown config key: {}", key)),
        }
        
        Ok(())
    }

    pub fn get_all(&self) -> HashMap<String, serde_json::Value> {
        let mut map = HashMap::new();
        map.insert("auto_save".to_string(), serde_json::to_value(self.auto_save).unwrap());
        map.insert("show_welcome".to_string(), serde_json::to_value(self.show_welcome).unwrap());
        map.insert("theme".to_string(), serde_json::to_value(&self.theme).unwrap());
        map.insert("terminal".to_string(), serde_json::to_value(&self.terminal).unwrap());
        map.insert("ai".to_string(), serde_json::to_value(&self.ai).unwrap());
        map
    }

    pub fn reset_to_defaults(&mut self) -> Result<()> {
        *self = Self::default();
        Ok(())
    }
}