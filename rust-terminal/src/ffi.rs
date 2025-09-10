//! Interfaccia FFI per la comunicazione con Node.js
//! 
//! Questo modulo fornisce le funzioni C-compatibili per l'integrazione
//! con Electron/Node.js tramite node-ffi o simili.

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int};
use std::sync::{Arc, Mutex};
use log::{error, info};

use crate::RustTerminal;

/// Istanza globale del terminale Rust
static mut TERMINAL: Option<Arc<Mutex<RustTerminal>>> = None;

/// Inizializza il terminale Rust
#[no_mangle]
pub extern "C" fn rust_terminal_init() -> c_int {
    match RustTerminal::new() {
        Ok(terminal) => {
            unsafe {
                TERMINAL = Some(Arc::new(Mutex::new(terminal)));
            }
            info!("Rust terminal initialized successfully");
            0
        }
        Err(e) => {
            error!("Failed to initialize Rust terminal: {}", e);
            -1
        }
    }
}

/// Crea una nuova sessione
#[no_mangle]
pub extern "C" fn rust_terminal_create_session(cwd: *const c_char) -> *mut c_char {
    unsafe {
        if let Some(ref terminal) = TERMINAL {
            let cwd_str = if cwd.is_null() {
                None
            } else {
                match CStr::from_ptr(cwd).to_str() {
                    Ok(s) => Some(s.to_string()),
                    Err(_) => None,
                }
            };

            match terminal.lock().unwrap().create_session(cwd_str) {
                Ok(session_id) => {
                    match CString::new(session_id) {
                        Ok(c_string) => c_string.into_raw(),
                        Err(_) => std::ptr::null_mut(),
                    }
                }
                Err(e) => {
                    error!("Failed to create session: {}", e);
                    std::ptr::null_mut()
                }
            }
        } else {
            error!("Terminal not initialized");
            std::ptr::null_mut()
        }
    }
}

/// Scrive dati a una sessione
#[no_mangle]
pub extern "C" fn rust_terminal_write_to_session(
    session_id: *const c_char,
    data: *const c_char,
) -> c_int {
    unsafe {
        if let Some(ref terminal) = TERMINAL {
            if session_id.is_null() || data.is_null() {
                return -1;
            }

            let session_id_str = match CStr::from_ptr(session_id).to_str() {
                Ok(s) => s,
                Err(_) => return -1,
            };

            let data_str = match CStr::from_ptr(data).to_str() {
                Ok(s) => s,
                Err(_) => return -1,
            };

            match terminal.lock().unwrap().write_to_session(session_id_str, data_str) {
                Ok(_) => 0,
                Err(e) => {
                    error!("Failed to write to session: {}", e);
                    -1
                }
            }
        } else {
            error!("Terminal not initialized");
            -1
        }
    }
}

/// Ridimensiona una sessione
#[no_mangle]
pub extern "C" fn rust_terminal_resize_session(
    session_id: *const c_char,
    cols: c_int,
    rows: c_int,
) -> c_int {
    unsafe {
        if let Some(ref terminal) = TERMINAL {
            if session_id.is_null() {
                return -1;
            }

            let session_id_str = match CStr::from_ptr(session_id).to_str() {
                Ok(s) => s,
                Err(_) => return -1,
            };

            match terminal.lock().unwrap().resize_session(
                session_id_str,
                cols as u16,
                rows as u16,
            ) {
                Ok(_) => 0,
                Err(e) => {
                    error!("Failed to resize session: {}", e);
                    -1
                }
            }
        } else {
            error!("Terminal not initialized");
            -1
        }
    }
}

/// Termina una sessione
#[no_mangle]
pub extern "C" fn rust_terminal_kill_session(session_id: *const c_char) -> c_int {
    unsafe {
        if let Some(ref terminal) = TERMINAL {
            if session_id.is_null() {
                return -1;
            }

            let session_id_str = match CStr::from_ptr(session_id).to_str() {
                Ok(s) => s,
                Err(_) => return -1,
            };

            match terminal.lock().unwrap().kill_session(session_id_str) {
                Ok(_) => 0,
                Err(e) => {
                    error!("Failed to kill session: {}", e);
                    -1
                }
            }
        } else {
            error!("Terminal not initialized");
            -1
        }
    }
}

/// Chiude una sessione
#[no_mangle]
pub extern "C" fn rust_terminal_close_session(session_id: *const c_char) -> c_int {
    unsafe {
        if let Some(ref terminal) = TERMINAL {
            if session_id.is_null() {
                return -1;
            }

            let session_id_str = match CStr::from_ptr(session_id).to_str() {
                Ok(s) => s,
                Err(_) => return -1,
            };

            match terminal.lock().unwrap().close_session(session_id_str) {
                Ok(_) => 0,
                Err(e) => {
                    error!("Failed to close session: {}", e);
                    -1
                }
            }
        } else {
            error!("Terminal not initialized");
            -1
        }
    }
}

/// Pulisce una sessione
#[no_mangle]
pub extern "C" fn rust_terminal_clear_session(session_id: *const c_char) -> c_int {
    unsafe {
        if let Some(ref terminal) = TERMINAL {
            if session_id.is_null() {
                return -1;
            }

            let session_id_str = match CStr::from_ptr(session_id).to_str() {
                Ok(s) => s,
                Err(_) => return -1,
            };

            match terminal.lock().unwrap().clear_session(session_id_str) {
                Ok(_) => 0,
                Err(e) => {
                    error!("Failed to clear session: {}", e);
                    -1
                }
            }
        } else {
            error!("Terminal not initialized");
            -1
        }
    }
}

/// Esegue un comando in una sessione
#[no_mangle]
pub extern "C" fn rust_terminal_run_command(
    session_id: *const c_char,
    command: *const c_char,
) -> c_int {
    unsafe {
        if let Some(ref terminal) = TERMINAL {
            if session_id.is_null() || command.is_null() {
                return -1;
            }

            let session_id_str = match CStr::from_ptr(session_id).to_str() {
                Ok(s) => s,
                Err(_) => return -1,
            };

            let command_str = match CStr::from_ptr(command).to_str() {
                Ok(s) => s,
                Err(_) => return -1,
            };

            match terminal.lock().unwrap().run_command(session_id_str, command_str) {
                Ok(_) => 0,
                Err(e) => {
                    error!("Failed to run command: {}", e);
                    -1
                }
            }
        } else {
            error!("Terminal not initialized");
            -1
        }
    }
}

/// Esegue un comando sudo
#[no_mangle]
pub extern "C" fn rust_terminal_run_sudo_command(
    session_id: *const c_char,
    command: *const c_char,
    password: *const c_char,
) -> c_int {
    unsafe {
        if let Some(ref terminal) = TERMINAL {
            if session_id.is_null() || command.is_null() || password.is_null() {
                return -1;
            }

            let session_id_str = match CStr::from_ptr(session_id).to_str() {
                Ok(s) => s,
                Err(_) => return -1,
            };

            let command_str = match CStr::from_ptr(command).to_str() {
                Ok(s) => s,
                Err(_) => return -1,
            };

            let password_str = match CStr::from_ptr(password).to_str() {
                Ok(s) => s,
                Err(_) => return -1,
            };

            match terminal.lock().unwrap().run_sudo_command(
                session_id_str,
                command_str,
                password_str,
            ) {
                Ok(_) => 0,
                Err(e) => {
                    error!("Failed to run sudo command: {}", e);
                    -1
                }
            }
        } else {
            error!("Terminal not initialized");
            -1
        }
    }
}

/// Ottiene l'output di una sessione
#[no_mangle]
pub extern "C" fn rust_terminal_get_session_output(session_id: *const c_char) -> *mut c_char {
    unsafe {
        if let Some(ref terminal) = TERMINAL {
            if session_id.is_null() {
                return std::ptr::null_mut();
            }

            let session_id_str = match CStr::from_ptr(session_id).to_str() {
                Ok(s) => s,
                Err(_) => return std::ptr::null_mut(),
            };

            match terminal.lock().unwrap().get_session_output(session_id_str) {
                Ok(output) => {
                    match CString::new(output) {
                        Ok(c_string) => c_string.into_raw(),
                        Err(_) => std::ptr::null_mut(),
                    }
                }
                Err(e) => {
                    error!("Failed to get session output: {}", e);
                    std::ptr::null_mut()
                }
            }
        } else {
            error!("Terminal not initialized");
            std::ptr::null_mut()
        }
    }
}

/// Ottiene lo stato di una sessione
#[no_mangle]
pub extern "C" fn rust_terminal_get_session_status(session_id: *const c_char) -> *mut c_char {
    unsafe {
        if let Some(ref terminal) = TERMINAL {
            if session_id.is_null() {
                return std::ptr::null_mut();
            }

            let session_id_str = match CStr::from_ptr(session_id).to_str() {
                Ok(s) => s,
                Err(_) => return std::ptr::null_mut(),
            };

            match terminal.lock().unwrap().get_session_status(session_id_str) {
                Ok(status) => {
                    match serde_json::to_string(&status) {
                        Ok(json) => {
                            match CString::new(json) {
                                Ok(c_string) => c_string.into_raw(),
                                Err(_) => std::ptr::null_mut(),
                            }
                        }
                        Err(e) => {
                            error!("Failed to serialize session status: {}", e);
                            std::ptr::null_mut()
                        }
                    }
                }
                Err(e) => {
                    error!("Failed to get session status: {}", e);
                    std::ptr::null_mut()
                }
            }
        } else {
            error!("Terminal not initialized");
            std::ptr::null_mut()
        }
    }
}

/// Ottiene tutte le sessioni attive
#[no_mangle]
pub extern "C" fn rust_terminal_get_active_sessions() -> *mut c_char {
    unsafe {
        if let Some(ref terminal) = TERMINAL {
            let sessions = terminal.lock().unwrap().get_active_sessions();
            match serde_json::to_string(&sessions) {
                Ok(json) => {
                    match CString::new(json) {
                        Ok(c_string) => c_string.into_raw(),
                        Err(_) => std::ptr::null_mut(),
                    }
                }
                Err(e) => {
                    error!("Failed to serialize active sessions: {}", e);
                    std::ptr::null_mut()
                }
            }
        } else {
            error!("Terminal not initialized");
            std::ptr::null_mut()
        }
    }
}

/// Pulisce le sessioni inattive
#[no_mangle]
pub extern "C" fn rust_terminal_cleanup_inactive_sessions(max_age_seconds: c_int) -> c_int {
    unsafe {
        if let Some(ref terminal) = TERMINAL {
            let cleaned = terminal.lock().unwrap().cleanup_inactive_sessions(max_age_seconds as u64);
            cleaned as c_int
        } else {
            error!("Terminal not initialized");
            -1
        }
    }
}

/// Libera la memoria di una stringa C
#[no_mangle]
pub extern "C" fn rust_terminal_free_string(s: *mut c_char) {
    if !s.is_null() {
        unsafe {
            let _ = CString::from_raw(s);
        }
    }
}

/// Pulisce le risorse del terminale
#[no_mangle]
pub extern "C" fn rust_terminal_cleanup() {
    unsafe {
        TERMINAL = None;
    }
    info!("Rust terminal cleaned up");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ffi_initialization() {
        let result = rust_terminal_init();
        assert_eq!(result, 0);
        
        // Cleanup
        rust_terminal_cleanup();
    }

    #[test]
    fn test_ffi_session_creation() {
        rust_terminal_init();
        
        let session_id = rust_terminal_create_session(std::ptr::null());
        assert!(!session_id.is_null());
        
        // Free the string
        rust_terminal_free_string(session_id);
        
        // Cleanup
        rust_terminal_cleanup();
    }
}
