use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigManager {
    path: PathBuf,
    data: Value,
}

impl ConfigManager {
    pub fn new() -> Self {
        let path = Self::default_config_path();
        let data = Self::load_from_disk(&path).unwrap_or_else(|err| {
            log::warn!("Failed to load config from disk: {err:?}. Using default config");
            Self::default_config()
        });

        Self { path, data }
    }

    fn default_config_path() -> PathBuf {
        let base = dirs::config_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
        base.join("TermInA").join("config.json")
    }

    fn ensure_parent_exists(path: &Path) -> Result<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).with_context(|| format!(
                "Failed to create configuration directory: {}",
                parent.display()
            ))?;
        }
        Ok(())
    }

    fn load_from_disk(path: &Path) -> Result<Value> {
        if !path.exists() {
            return Err(anyhow::anyhow!("Config file does not exist"));
        }

        let contents = fs::read_to_string(path)
            .with_context(|| format!("Failed to read config file: {}", path.display()))?;
        let data: Value = serde_json::from_str(&contents)
            .with_context(|| format!("Failed to parse config file: {}", path.display()))?;
        Ok(data)
    }

    fn default_config() -> Value {
        json!({
            "theme": {
                "name": "dark",
                "background": "#1e1e1e",
                "foreground": "#ffffff",
                "cursor": "#00d4aa",
                "accent": "#4fc1ff",
                "background_blur": 12
            },
            "terminal": {
                "font_family": "SF Mono, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                "font_size": 14,
                "line_height": 1.2,
                "cursor_style": "block",
                "cursor_blink": true,
                "scrollback": 4000,
                "bell_sound": false,
                "auto_scroll": true,
                "smooth_scroll": true
            },
            "ai": {
                "enabled": true,
                "provider": "ollama",
                "auto_execute": false,
                "context_lines": 200,
                "gemini": {
                    "api_key": "",
                    "model": "gemini-1.5-pro",
                    "temperature": 0.2,
                    "max_output_tokens": 2048
                },
                "openai": {
                    "api_key": "",
                    "model": "gpt-4o-mini"
                },
                "ollama": {
                    "base_url": "http://localhost:11434",
                    "model": "llama3.1"
                }
            }
        })
    }

    pub fn get_config(&self) -> Value {
        self.data.clone()
    }

    pub fn set_full_config(&mut self, value: Value) -> Result<()> {
        self.data = value;
        self.persist()
    }

    pub fn set_key(&mut self, key: &str, value: Value) -> Result<()> {
        match key {
            "full_config" => self.set_full_config(value),
            other => {
                if let Some(obj) = self.data.as_object_mut() {
                    obj.insert(other.to_string(), value);
                    self.persist()
                } else {
                    Err(anyhow::anyhow!("Invalid config structure; expected object"))
                }
            }
        }
    }

    pub fn merge_with(&mut self, value: Value) -> Result<()> {
        fn merge(dest: &mut Value, src: &Value) {
            match (dest, src) {
                (Value::Object(dest_map), Value::Object(src_map)) => {
                    for (key, src_value) in src_map {
                        merge(dest_map.entry(key).or_insert(Value::Null), src_value);
                    }
                }
                (dest, src) => {
                    *dest = src.clone();
                }
            }
        }

        merge(&mut self.data, &value);
        self.persist()
    }

    pub fn reload(&mut self) -> Result<()> {
        self.data = Self::load_from_disk(&self.path).unwrap_or_else(|_| Self::default_config());
        Ok(())
    }

    pub fn persist(&self) -> Result<()> {
        Self::ensure_parent_exists(&self.path)?;
        let serialized = serde_json::to_string_pretty(&self.data)
            .context("Failed to serialize config to JSON")?;
        fs::write(&self.path, serialized)
            .with_context(|| format!("Failed to write config file: {}", self.path.display()))?;
        Ok(())
    }
}

impl Default for ConfigManager {
    fn default() -> Self {
        Self::new()
    }
}
