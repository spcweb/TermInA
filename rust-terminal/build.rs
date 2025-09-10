//! Build script per TermInA Terminal
//! 
//! Questo script gestisce la compilazione e la configurazione
//! della libreria Rust per l'integrazione con Node.js.

use std::env;
use std::path::PathBuf;

fn main() {
    // Configura il linker per macOS
    if cfg!(target_os = "macos") {
        println!("cargo:rustc-link-lib=framework=Security");
        println!("cargo:rustc-link-lib=framework=CoreFoundation");
    }

    // Configura il linker per Linux
    if cfg!(target_os = "linux") {
        println!("cargo:rustc-link-lib=dbus-1");
    }

    // Configura il linker per Windows
    if cfg!(target_os = "windows") {
        println!("cargo:rustc-link-lib=advapi32");
        println!("cargo:rustc-link-lib=user32");
    }

    // Informazioni di build
    println!("cargo:rustc-env=TARGET={}", env::var("TARGET").unwrap());
    println!("cargo:rustc-env=HOST={}", env::var("HOST").unwrap());
    println!("cargo:rustc-env=OPT_LEVEL={}", env::var("OPT_LEVEL").unwrap());
    println!("cargo:rustc-env=DEBUG={}", env::var("DEBUG").unwrap());
    println!("cargo:rustc-env=PROFILE={}", env::var("PROFILE").unwrap());

    // Configura il percorso di output
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let target_dir = out_dir.parent().unwrap().parent().unwrap().parent().unwrap();
    
    println!("cargo:rustc-env=OUTPUT_DIR={}", target_dir.display());

    // Configura le feature
    if cfg!(feature = "static") {
        println!("cargo:rustc-cfg=feature=\"static\"");
    }

    if cfg!(feature = "dynamic") {
        println!("cargo:rustc-cfg=feature=\"dynamic\"");
    }

    // Informazioni sulla versione
    let version = env!("CARGO_PKG_VERSION");
    println!("cargo:rustc-env=TERMINA_VERSION={}", version);

    // Configura il nome della libreria
    let lib_name = if cfg!(target_os = "windows") {
        "termina_terminal.dll"
    } else if cfg!(target_os = "macos") {
        "libtermina_terminal.dylib"
    } else {
        "libtermina_terminal.so"
    };

    println!("cargo:rustc-env=LIB_NAME={}", lib_name);

    // Configura il percorso di installazione
    let install_dir = target_dir.join("termina-terminal");
    std::fs::create_dir_all(&install_dir).unwrap_or_else(|e| {
        eprintln!("Warning: Failed to create install directory: {}", e);
    });

    println!("cargo:rustc-env=INSTALL_DIR={}", install_dir.display());

    // Copia i file necessari dopo la build
    println!("cargo:rerun-if-changed=src/");
    println!("cargo:rerun-if-changed=Cargo.toml");
    println!("cargo:rerun-if-changed=build.rs");
}
