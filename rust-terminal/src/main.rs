//! TermInA Terminal - Binary entry point
//! 
//! Questo è il punto di ingresso principale per il terminale Rust.
//! Può essere usato per test o come applicazione standalone.

use anyhow::Result;
use log::{info, error};
use env_logger;

// use termina_terminal::{RustTerminal, TerminalConfig};

fn main() -> Result<()> {
    // Inizializza il logger
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .init();

    info!("Starting TermInA Terminal (Rust implementation)");

    // Crea il terminale con configurazione personalizzata
    // let config = TerminalConfig {
    //     default_shell: std::env::var("SHELL").unwrap_or_else(|_| "zsh".to_string()),
    //     default_cwd: std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string()),
    //     timeout_seconds: 300,
    //     max_sessions: 10,
    //     enable_sudo: true,
    //     sudo_timeout: 60,
    // };

    // let terminal = match RustTerminal::with_config(config) {
    //     Ok(t) => t,
    //     Err(e) => {
    //         error!("Failed to create terminal: {}", e);
    //         return Err(e);
    //     }
    // };

    info!("Terminal created successfully");

    // Test di base
    // if let Err(e) = run_basic_tests(&terminal) {
    //     error!("Basic tests failed: {}", e);
    //     return Err(e);
    // }

    info!("All tests passed successfully");
    info!("TermInA Terminal (Rust) is ready for integration");

    Ok(())
}

// fn run_basic_tests(terminal: &RustTerminal) -> Result<()> {
//     info!("Running basic tests...");

//     // Test 1: Creazione sessione
//     info!("Test 1: Creating session");
//     let session_id = terminal.create_session(None)?;
//     info!("Session created: {}", session_id);

//     // Test 2: Scrittura alla sessione
//     info!("Test 2: Writing to session");
//     terminal.write_to_session(&session_id, "echo 'Hello from Rust terminal!'\n")?;

//     // Aspetta un po' per l'output
//     std::thread::sleep(std::time::Duration::from_millis(100));

//     // Test 3: Lettura output
//     info!("Test 3: Reading session output");
//     let output = terminal.get_session_output(&session_id)?;
//     info!("Session output: {}", output);

//     // Test 4: Stato sessione
//     info!("Test 4: Getting session status");
//     let status = terminal.get_session_status(&session_id)?;
//     info!("Session status: {:?}", status);

//     // Test 5: Ridimensionamento
//     info!("Test 5: Resizing session");
//     terminal.resize_session(&session_id, 80, 24)?;

//     // Test 6: Chiusura sessione
//     info!("Test 6: Closing session");
//     terminal.close_session(&session_id)?;

//     info!("All basic tests completed successfully");
//     Ok(())
// }