use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub hostname: String,
    pub cpu_count: usize,
    pub total_memory: u64,
    pub available_memory: u64,
    pub uptime: u64,
}

pub struct SystemInfoManager {
    system_info: SystemInfo,
}

impl SystemInfoManager {
    pub fn new() -> Self {
        Self {
            system_info: SystemInfo {
                os_name: "macOS".to_string(),
                os_version: "14.0".to_string(),
                hostname: "localhost".to_string(),
                cpu_count: 8,
                total_memory: 16 * 1024 * 1024 * 1024, // 16GB
                available_memory: 8 * 1024 * 1024 * 1024, // 8GB
                uptime: 3600, // 1 hour
            }
        }
    }

    pub fn get_system_info(&self) -> SystemInfo {
        self.system_info.clone()
    }
}

impl Default for SystemInfoManager {
    fn default() -> Self {
        Self::new()
    }
}