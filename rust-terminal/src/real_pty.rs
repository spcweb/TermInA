//! Implementazione PTY reale per comandi interattivi
//! 
//! Questo modulo implementa un vero pseudo-terminal (PTY) usando nix
//! per supportare comandi interattivi come btop++, htop, nano, vim, etc.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use anyhow::{Result, anyhow};
use log::{debug, error, info, warn};
use nix::pty::{openpty, Winsize};
use nix::unistd::{fork, ForkResult, execvp, dup2, close, setsid, write as nix_write};
use nix::fcntl::{fcntl, FcntlArg, OFlag};
use nix::sys::wait::waitpid;
use nix::sys::signal::{kill, Signal};
use nix::unistd::Pid;
use std::os::unix::io::{AsRawFd, RawFd};
use serde::{Deserialize, Serialize};

/// Configurazione PTY
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PtyConfig {
    pub cols: u16,
    pub rows: u16,
    pub shell: String,
    pub cwd: String,
    pub env_vars: HashMap<String, String>,
}

impl Default for PtyConfig {
    fn default() -> Self {
        let mut env_vars = HashMap::new();
        env_vars.insert("TERM".to_string(), "xterm-256color".to_string());
        env_vars.insert("COLORTERM".to_string(), "truecolor".to_string());
        env_vars.insert("FORCE_COLOR".to_string(), "1".to_string());
        env_vars.insert("TERM_PROGRAM".to_string(), "TermInA".to_string());
        
        Self {
            cols: 80,
            rows: 24,
            shell: std::env::var("SHELL").unwrap_or_else(|_| "zsh".to_string()),
            cwd: std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string()),
            env_vars,
        }
    }
}

/// Sessione PTY reale
pub struct RealPtySession {
    pub id: String,
    pub master_fd: std::os::fd::OwnedFd,
    pub slave_fd: std::os::fd::OwnedFd,
    pub child_pid: Option<Pid>,
    pub config: PtyConfig,
    pub buffer: Arc<Mutex<String>>,
    pub is_active: Arc<Mutex<bool>>,
    pub last_activity: Arc<Mutex<u64>>,
    pub output_sender: crossbeam_channel::Sender<String>,
    pub output_receiver: Arc<Mutex<crossbeam_channel::Receiver<String>>>,
}

impl RealPtySession {
    /// Crea una nuova sessione PTY
    pub fn new(id: String, config: PtyConfig) -> Result<Self> {
        info!("Creating real PTY session: {}", id);
        
        // Crea il PTY
        let winsize = Winsize {
            ws_row: config.rows,
            ws_col: config.cols,
            ws_xpixel: 0,
            ws_ypixel: 0,
        };
        
        let openpty_result = openpty(Some(&winsize), None)?;
        let master_fd = openpty_result.master;
        let slave_fd = openpty_result.slave;
        
        // Configura il master per essere non-blocking
        let flags = fcntl(master_fd.as_raw_fd(), FcntlArg::F_GETFL)?;
        fcntl(master_fd.as_raw_fd(), FcntlArg::F_SETFL(OFlag::from_bits_truncate(flags) | OFlag::O_NONBLOCK))?;
        
        let (output_sender, output_receiver) = crossbeam_channel::unbounded();
        let output_receiver = Arc::new(Mutex::new(output_receiver));
        
        let session = Self {
            id: id.clone(),
            master_fd,
            slave_fd,
            child_pid: None,
            config,
            buffer: Arc::new(Mutex::new(String::new())),
            is_active: Arc::new(Mutex::new(true)),
            last_activity: Arc::new(Mutex::new(Self::current_timestamp())),
            output_sender,
            output_receiver,
        };
        
        info!("Real PTY session created successfully: {}", id);
        Ok(session)
    }
    
    /// Avvia la shell nella sessione PTY
    pub fn start_shell(&mut self) -> Result<()> {
        info!("Starting shell in PTY session: {}", self.id);
        
        match unsafe { fork()? } {
            ForkResult::Parent { child } => {
                // Processo padre - chiudi slave e mantieni master
                close(self.slave_fd.as_raw_fd())?;
                self.child_pid = Some(child);
                
                // Avvia il thread per leggere l'output
                self.start_output_reader();
                
                info!("Shell started in PTY session {} with PID: {}", self.id, child);
                Ok(())
            }
            ForkResult::Child => {
                // Processo figlio - chiudi master e usa slave
                close(self.master_fd.as_raw_fd())?;
                
                // Rendi il figlio leader di sessione e associa il TTY
                unsafe {
                    setsid().map_err(|e| anyhow!("setsid failed: {}", e))?;
                    // Imposta lo slave come controlling terminal
                    if libc::ioctl(self.slave_fd.as_raw_fd(), libc::TIOCSCTTY, 0) < 0 {
                        let errno = *libc::__errno_location();
                        return Err(anyhow!("ioctl TIOCSCTTY failed: errno {}", errno));
                    }
                }

                // Imposta il slave come stdin, stdout, stderr
                dup2(self.slave_fd.as_raw_fd(), 0)?; // stdin
                dup2(self.slave_fd.as_raw_fd(), 1)?; // stdout
                dup2(self.slave_fd.as_raw_fd(), 2)?; // stderr
                
                // Chiudi il slave originale
                close(self.slave_fd.as_raw_fd())?;
                
                // Imposta le variabili d'ambiente
                for (key, value) in &self.config.env_vars {
                    std::env::set_var(key, value);
                }
                
                // Cambia directory
                std::env::set_current_dir(&self.config.cwd)?;
                
                // Esegui la shell
                let shell_args = vec![self.config.shell.clone(), "-i".to_string(), "-l".to_string()];
                info!("Executing shell: {} with args: {:?}", self.config.shell, shell_args);
                
                // Verifica che la shell esista
                if !std::path::Path::new(&self.config.shell).exists() {
                    error!("Shell not found: {}", self.config.shell);
                    std::process::exit(1);
                }
                
                let shell_cstring = std::ffi::CString::new(self.config.shell.clone())?;
                let args_cstring: Vec<std::ffi::CString> = shell_args
                    .iter()
                    .map(|s| std::ffi::CString::new(s.as_str()).unwrap())
                    .collect();
                
                execvp(&shell_cstring, &args_cstring)
                    .map_err(|e| anyhow!("Failed to exec shell '{}': {}", self.config.shell, e))?;
                
                // Non dovremmo mai arrivare qui
                std::process::exit(1);
            }
        }
    }
    
    /// Scrive dati alla sessione PTY
    pub fn write(&self, data: &str) -> Result<()> {
        // Usa nix::unistd::write per evitare di chiudere accidentalmente il FD
        let bytes = data.as_bytes();
        let mut written_total = 0usize;
        while written_total < bytes.len() {
            let n = nix_write(&self.master_fd, &bytes[written_total..])? as usize;
            if n == 0 { break; }
            written_total += n;
        }
        
        // Aggiorna l'attività
        *self.last_activity.lock().unwrap() = Self::current_timestamp();
        
        debug!("Wrote {} bytes to PTY session {}", data.len(), self.id);
        Ok(())
    }
    
    /// Ridimensiona la sessione PTY
    pub fn resize(&self, cols: u16, rows: u16) -> Result<()> {
        debug!("Resizing PTY session {} to {}x{}", self.id, cols, rows);
        
        let winsize = Winsize {
            ws_row: rows,
            ws_col: cols,
            ws_xpixel: 0,
            ws_ypixel: 0,
        };
        // Applica la nuova dimensione alla TTY
        unsafe {
            if libc::ioctl(self.master_fd.as_raw_fd(), libc::TIOCSWINSZ, &winsize) < 0 {
                let errno = *libc::__errno_location();
                warn!("ioctl TIOCSWINSZ failed for session {}: errno {}", self.id, errno);
            }
        }

        // Invia il segnale SIGWINCH al processo figlio per notificare il resize
        if let Some(pid) = self.child_pid {
            kill(pid, Signal::SIGWINCH)?;
        }
        
        Ok(())
    }
    
    /// Termina la sessione PTY
    pub fn kill(&self) -> Result<()> {
        info!("Killing PTY session: {}", self.id);
        
        if let Some(pid) = self.child_pid {
            kill(pid, Signal::SIGTERM)?;
            
            // Attendi che il processo termini
            thread::sleep(Duration::from_millis(100));
            
            // Se non è terminato, forza la terminazione
            if let Ok(_) = kill(pid, Signal::SIGKILL) {
                let _ = waitpid(pid, None);
            }
        }
        
        *self.is_active.lock().unwrap() = false;
        Ok(())
    }
    
    /// Chiude la sessione PTY
    pub fn close(&self) -> Result<()> {
        info!("Closing PTY session: {}", self.id);
        
        // Chiudi il master per segnalare EOF
        close(self.master_fd.as_raw_fd())?;
        
        // Attendi che il processo figlio termini
        if let Some(pid) = self.child_pid {
            let _ = waitpid(pid, None);
        }
        
        *self.is_active.lock().unwrap() = false;
        Ok(())
    }
    
    /// Pulisce il buffer della sessione
    pub fn clear(&self) -> Result<()> {
        debug!("Clearing PTY session: {}", self.id);
        *self.buffer.lock().unwrap() = String::new();
        Ok(())
    }
    
    /// Esegue un comando nella sessione
    pub fn run_command(&self, command: &str) -> Result<()> {
        info!("Running command in PTY session {}: {}", self.id, command);
        
        // Invia il comando alla sessione
        self.write(&format!("{}\n", command))?;
        
        Ok(())
    }
    
    /// Ottiene l'output della sessione
    pub fn get_output(&self) -> String {
        self.buffer.lock().unwrap().clone()
    }
    
    /// Ottiene l'output incrementale dalla sessione
    pub fn get_incremental_output(&self, from_index: usize) -> String {
        let buffer = self.buffer.lock().unwrap();
        if from_index >= buffer.len() {
            String::new()
        } else {
            buffer[from_index..].to_string()
        }
    }
    
    /// Ottiene la lunghezza del buffer
    pub fn get_buffer_length(&self) -> usize {
        self.buffer.lock().unwrap().len()
    }
    
    /// Ottiene lo stato della sessione
    pub fn get_status(&self) -> crate::session::SessionStatus {
        crate::session::SessionStatus {
            id: self.id.clone(),
            is_active: *self.is_active.lock().unwrap(),
            is_executing: false, // TODO: Implementare tracking comandi
            current_command: String::new(),
            last_activity: *self.last_activity.lock().unwrap(),
            buffer_size: self.buffer.lock().unwrap().len(),
            cwd: self.config.cwd.clone(),
            pid: self.child_pid.map(|p| p.as_raw() as u32),
        }
    }
    
    /// Ottiene l'ultima attività
    pub fn get_last_activity(&self) -> u64 {
        *self.last_activity.lock().unwrap()
    }
    
    /// Avvia il thread per leggere l'output
    fn start_output_reader(&self) {
        let master_fd = self.master_fd.as_raw_fd();
        let buffer = self.buffer.clone();
        let output_sender = self.output_sender.clone();
        let is_active = self.is_active.clone();
        let last_activity = self.last_activity.clone();
        let session_id = self.id.clone();
        
        thread::spawn(move || {
            info!("Starting output reader for PTY session: {}", session_id);
            
            let mut read_buffer = [0; 4096];
            let mut total_bytes_read = 0;
            
            loop {
                if !*is_active.lock().unwrap() {
                    debug!("PTY session {} marked as inactive, stopping reader", session_id);
                    break;
                }
                
                match unsafe { 
                    libc::read(master_fd, read_buffer.as_mut_ptr() as *mut libc::c_void, read_buffer.len()) 
                } {
                    -1 => {
                        let errno = unsafe { *libc::__errno_location() };
                        if errno == libc::EAGAIN || errno == libc::EWOULDBLOCK {
                            // Nessun dato disponibile, aspetta un po'
                            thread::sleep(Duration::from_millis(10));
                            continue;
                        } else if errno == libc::EIO {
                            // Input/output error - processo figlio terminato
                            debug!("I/O error for PTY session {} (child process likely terminated)", session_id);
                            break;
                        } else {
                            error!("Error reading from PTY session {}: errno {}", session_id, errno);
                            break;
                        }
                    }
                    0 => {
                        // EOF raggiunto
                        debug!("EOF reached for PTY session {}", session_id);
                        break;
                    }
                    n => {
                        let data = String::from_utf8_lossy(&read_buffer[..n as usize]);
                        total_bytes_read += n as usize;
                        
                        // Aggiorna il buffer
                        buffer.lock().unwrap().push_str(&data);
                        
                        // Invia l'output
                        if let Err(e) = output_sender.send(data.to_string()) {
                            warn!("Failed to send output for PTY session {}: {}", session_id, e);
                        }
                        
                        // Aggiorna l'attività
                        *last_activity.lock().unwrap() = Self::current_timestamp();
                        
                        info!("Read {} bytes from PTY session {} (total: {})", n, session_id, total_bytes_read);
                    }
                }
            }
            
            // Marca la sessione come inattiva
            *is_active.lock().unwrap() = false;
            info!("Output reader finished for PTY session: {} (total bytes read: {})", session_id, total_bytes_read);
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

impl Drop for RealPtySession {
    fn drop(&mut self) {
        let _ = self.close();
    }
}

/// Manager per le sessioni PTY reali
pub struct RealPtyManager {
    sessions: HashMap<String, RealPtySession>,
}

impl RealPtyManager {
    /// Crea un nuovo manager PTY
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }
    
    /// Crea una nuova sessione PTY
    pub fn create_session(&mut self, session_id: &str, cwd: Option<String>) -> Result<()> {
        info!("Creating real PTY session: {}", session_id);
        
        let cwd = cwd.unwrap_or_else(|| {
            std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string())
        });
        
        let mut config = PtyConfig::default();
        config.cwd = cwd;
        
        let mut session = RealPtySession::new(session_id.to_string(), config)?;
        session.start_shell()?;
        
        self.sessions.insert(session_id.to_string(), session);
        info!("Real PTY session created successfully: {}", session_id);
        
        Ok(())
    }
    
    /// Scrive dati a una sessione
    pub fn write_to_session(&mut self, session_id: &str, data: &str) -> Result<()> {
        if let Some(session) = self.sessions.get(session_id) {
            debug!("Writing to PTY session {}: {} bytes", session_id, data.len());
            session.write(data)?;
            Ok(())
        } else {
            Err(anyhow!("PTY session not found: {}", session_id))
        }
    }
    
    /// Ridimensiona una sessione PTY
    pub fn resize_session(&mut self, session_id: &str, cols: u16, rows: u16) -> Result<()> {
        if let Some(session) = self.sessions.get(session_id) {
            debug!("Resizing PTY session {} to {}x{}", session_id, cols, rows);
            session.resize(cols, rows)?;
            Ok(())
        } else {
            Err(anyhow!("PTY session not found: {}", session_id))
        }
    }
    
    /// Termina una sessione
    pub fn kill_session(&mut self, session_id: &str) -> Result<()> {
        if let Some(session) = self.sessions.get(session_id) {
            info!("Killing PTY session: {}", session_id);
            session.kill()?;
            self.sessions.remove(session_id);
            Ok(())
        } else {
            Err(anyhow!("PTY session not found: {}", session_id))
        }
    }
    
    /// Chiude una sessione
    pub fn close_session(&mut self, session_id: &str) -> Result<()> {
        if let Some(session) = self.sessions.get(session_id) {
            info!("Closing PTY session: {}", session_id);
            session.close()?;
            self.sessions.remove(session_id);
            Ok(())
        } else {
            Err(anyhow!("PTY session not found: {}", session_id))
        }
    }
    
    /// Pulisce una sessione
    pub fn clear_session(&mut self, session_id: &str) -> Result<()> {
        if let Some(session) = self.sessions.get(session_id) {
            debug!("Clearing PTY session: {}", session_id);
            session.clear()?;
            Ok(())
        } else {
            Err(anyhow!("PTY session not found: {}", session_id))
        }
    }
    
    /// Esegue un comando in una sessione
    pub fn run_command(&mut self, session_id: &str, command: &str) -> Result<()> {
        if let Some(session) = self.sessions.get(session_id) {
            info!("Running command in PTY session {}: {}", session_id, command);
            session.run_command(command)?;
            Ok(())
        } else {
            Err(anyhow!("PTY session not found: {}", session_id))
        }
    }
    
    /// Ottiene una sessione
    pub fn get_session(&self, session_id: &str) -> Option<&RealPtySession> {
        self.sessions.get(session_id)
    }
    
    /// Ottiene una sessione mutabile
    pub fn get_session_mut(&mut self, session_id: &str) -> Option<&mut RealPtySession> {
        self.sessions.get_mut(session_id)
    }
    
    /// Ottiene l'output incrementale di una sessione
    pub fn get_incremental_output(&self, session_id: &str, from_index: usize) -> Result<String> {
        if let Some(session) = self.sessions.get(session_id) {
            Ok(session.get_incremental_output(from_index))
        } else {
            Err(anyhow!("PTY session not found: {}", session_id))
        }
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
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_pty_config_default() {
        let config = PtyConfig::default();
        assert_eq!(config.cols, 80);
        assert_eq!(config.rows, 24);
        assert!(config.env_vars.contains_key("TERM"));
    }
    
    #[test]
    fn test_real_pty_manager_creation() {
        let manager = RealPtyManager::new();
        assert_eq!(manager.sessions.len(), 0);
    }
}