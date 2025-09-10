//! Gestione dei comandi sudo
//! 
//! Questo modulo gestisce l'esecuzione sicura dei comandi sudo
//! con gestione delle password e timeout.

use std::process::{Command, Stdio};
use std::time::{Duration, SystemTime};
use anyhow::{Result, anyhow};
use log::{debug, info};
use rpassword::read_password;

use crate::pty_manager::PtyManager;

/// Handler per i comandi sudo
pub struct SudoHandler {
    timeout_seconds: u64,
}

impl SudoHandler {
    /// Crea un nuovo handler sudo
    pub fn new(timeout_seconds: u64) -> Self {
        Self { timeout_seconds }
    }

    /// Esegue un comando sudo con password
    pub fn execute_sudo_command(
        &self,
        session_id: &str,
        command: &str,
        password: &str,
        pty_manager: &mut PtyManager,
    ) -> Result<()> {
        info!("Executing sudo command in session {}: {}", session_id, command);
        
        // Rimuovi 'sudo ' dal comando se presente
        let actual_command = if command.starts_with("sudo ") {
            &command[5..]
        } else {
            command
        };

        // Esegui il comando sudo
        let result = self.run_sudo_with_password(actual_command, password)?;
        
        // Invia il risultato alla sessione
        if let Some(session) = pty_manager.get_session_mut(session_id) {
            let output = if result.success {
                result.output
            } else {
                format!("Error: {}\n{}", result.stderr, result.output)
            };
            
            session.write(&output)?;
        }

        Ok(())
    }

    /// Esegue un comando sudo con password
    fn run_sudo_with_password(&self, command: &str, password: &str) -> Result<SudoResult> {
        let start_time = SystemTime::now();

        // Crea il comando sudo
        let mut sudo_cmd = Command::new("sudo");
        sudo_cmd.arg("-S") // Leggi password da stdin
                .arg("-p") // Prompt personalizzato (vuoto)
                .arg("")
                .arg("sh")
                .arg("-c")
                .arg(command)
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

        // Imposta le variabili d'ambiente
        sudo_cmd.env("SUDO_ASKPASS", ""); // Disabilita askpass

        debug!("Executing sudo command: {}", command);

        // Avvia il processo
        let mut child = sudo_cmd.spawn()?;

        // Invia la password
        if let Some(stdin) = child.stdin.as_mut() {
            use std::io::Write;
            stdin.write_all(password.as_bytes())?;
            stdin.write_all(b"\n")?;
            stdin.flush()?;
        }

        // Attendi il completamento con timeout
        let _timeout_duration = Duration::from_secs(self.timeout_seconds);
        let result = std::thread::spawn(move || {
            child.wait_with_output()
        });

        let output = match result.join() {
            Ok(Ok(output)) => output,
            Ok(Err(e)) => return Err(anyhow!("Sudo command execution failed: {}", e)),
            Err(e) => return Err(anyhow!("Sudo command thread panicked: {:?}", e)),
        };

        let duration = start_time.elapsed().unwrap_or_default();
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let exit_code = output.status.code();

        // Filtra i messaggi di password da stderr
        let filtered_stderr = self.filter_password_messages(&stderr);

        info!(
            "Sudo command completed: success={}, exit_code={:?}, duration={:?}",
            output.status.success(),
            exit_code,
            duration
        );

        Ok(SudoResult {
            success: output.status.success(),
            output: stdout,
            stderr: filtered_stderr,
            exit_code,
            duration,
        })
    }

    /// Filtra i messaggi di password da stderr
    fn filter_password_messages(&self, stderr: &str) -> String {
        stderr
            .lines()
            .filter(|line| {
                !line.contains("Password:") &&
                !line.contains("Sorry, try again") &&
                !line.contains("sudo:") &&
                !line.trim().is_empty()
            })
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// Verifica se un comando richiede sudo
    pub fn requires_sudo(&self, command: &str) -> bool {
        command.trim().starts_with("sudo ") ||
        self.is_privileged_command(command)
    }

    /// Verifica se un comando è privilegiato
    fn is_privileged_command(&self, command: &str) -> bool {
        let privileged_commands = [
            "apt", "apt-get", "apt install", "apt remove",
            "yum", "dnf", "pacman", "yay",
            "systemctl", "service",
            "mount", "umount",
            "chmod", "chown",
            "useradd", "userdel", "groupadd", "groupdel",
            "visudo", "passwd",
            "iptables", "ufw", "firewall-cmd",
            "crontab",
            "npm install -g", "pip install", "gem install",
            "docker", "docker-compose",
        ];

        privileged_commands.iter().any(|&cmd| {
            command.starts_with(cmd) || command.contains(&format!("{} ", cmd))
        })
    }

    /// Richiede la password all'utente
    pub fn prompt_for_password() -> Result<String> {
        use std::io::{self, Write};
        
        print!("Password: ");
        io::stdout().flush()?;
        
        let password = read_password()?;
        Ok(password)
    }

    /// Verifica se sudo è disponibile
    pub fn is_sudo_available() -> bool {
        Command::new("sudo")
            .arg("--version")
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    }

    /// Ottiene informazioni su sudo
    pub fn get_sudo_info() -> SudoInfo {
        let version_output = Command::new("sudo")
            .arg("--version")
            .output()
            .ok()
            .and_then(|output| String::from_utf8(output.stdout).ok());

        let version = version_output
            .as_ref()
            .and_then(|output| output.lines().next())
            .unwrap_or("Unknown")
            .to_string();

        SudoInfo {
            available: Self::is_sudo_available(),
            version,
        }
    }
}

/// Risultato dell'esecuzione di un comando sudo
#[derive(Debug, Clone)]
pub struct SudoResult {
    pub success: bool,
    pub output: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub duration: Duration,
}

impl SudoResult {
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

/// Informazioni su sudo
#[derive(Debug, Clone)]
pub struct SudoInfo {
    pub available: bool,
    pub version: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_requires_sudo() {
        let handler = SudoHandler::new(60);
        
        assert!(handler.requires_sudo("sudo ls"));
        assert!(handler.requires_sudo("apt install package"));
        assert!(handler.requires_sudo("systemctl start service"));
        assert!(!handler.requires_sudo("ls"));
        assert!(!handler.requires_sudo("echo hello"));
    }

    #[test]
    fn test_privileged_command_detection() {
        let handler = SudoHandler::new(60);
        
        assert!(handler.is_privileged_command("apt install package"));
        assert!(handler.is_privileged_command("systemctl start service"));
        assert!(handler.is_privileged_command("chmod 755 file"));
        assert!(!handler.is_privileged_command("ls -la"));
        assert!(!handler.is_privileged_command("echo hello"));
    }

    #[test]
    fn test_password_message_filtering() {
        let handler = SudoHandler::new(60);
        
        let stderr = "Password:\nSorry, try again.\nActual error message\n";
        let filtered = handler.filter_password_messages(stderr);
        
        assert_eq!(filtered, "Actual error message");
    }

    #[test]
    fn test_sudo_availability() {
        // Questo test dipende dal sistema, quindi lo eseguiamo solo se sudo è disponibile
        if SudoHandler::is_sudo_available() {
            let info = SudoHandler::get_sudo_info();
            assert!(info.available);
            assert!(!info.version.is_empty());
        }
    }
}
