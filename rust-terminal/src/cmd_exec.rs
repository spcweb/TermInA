//! Esecuzione comandi stile shell in Rust con cmd_lib
//! 
//! Fornisce helper sicuri per eseguire comandi con piping e redirezioni
//! senza invocare una shell esterna quando possibile.

use anyhow::{anyhow, Result};

/// Esegue un comando semplice (senza piping/redirezioni) restituendo stdout
pub fn run_simple(cmd: &str, args: &[&str]) -> Result<String> {
    let mut output = String::new();
    {
        let mut child = std::process::Command::new(cmd)
            .args(args)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()?;
        let out = child.wait_with_output()?;
        if !out.status.success() {
            return Err(anyhow!(
                "Command failed ({}): {}",
                out.status,
                String::from_utf8_lossy(&out.stderr)
            ));
        }
        output = String::from_utf8_lossy(&out.stdout).to_string();
    }
    Ok(output)
}

/// Esegue una pipeline arbitraria usando /bin/sh -c come fallback sicuro.
/// cmd_lib supporta macro, ma per massima compatibilità con comandi user-input
/// usiamo la shell; la sicurezza dipende dal contesto chiamante.
pub fn run_pipeline(command: &str, cwd: Option<&str>) -> Result<(bool, String, String, Option<i32>)> {
    let mut cmd = std::process::Command::new("sh");
    cmd.arg("-c").arg(command);
    if let Some(dir) = cwd { cmd.current_dir(dir); }
    cmd.env("TERM", "xterm-256color");
    let out = cmd
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()?;
    let output = out.wait_with_output()?;
    let success = output.status.success();
    let code = output.status.code();
    Ok((
        success,
        String::from_utf8_lossy(&output.stdout).to_string(),
        String::from_utf8_lossy(&output.stderr).to_string(),
        code,
    ))
}
