# TermInA Terminal - Rust Implementation

Questo è il modulo terminale riscritto in Rust per risolvere i problemi con i comandi sudo e migliorare le prestazioni del terminale TermInA.

## Caratteristiche

- **Gestione PTY robusta**: Implementazione nativa in Rust per la gestione dei pseudo-terminali
- **Supporto sudo sicuro**: Gestione sicura delle password e dei comandi privilegiati
- **Interfaccia FFI**: Compatibilità con Node.js/Electron tramite interfaccia C
- **Gestione asincrona**: Utilizzo di Tokio per operazioni asincrone
- **Cross-platform**: Supporto per macOS, Linux e Windows
- **Gestione sessioni**: Supporto per multiple sessioni terminale simultanee

## Struttura del Progetto

```
src/
├── lib.rs              # Libreria principale
├── main.rs             # Punto di ingresso del binario
├── pty_manager.rs      # Gestione PTY
├── session.rs          # Gestione sessioni
├── sudo_handler.rs     # Gestione comandi sudo
└── ffi.rs              # Interfaccia FFI per Node.js
```

## Dipendenze Principali

- **tokio**: Runtime asincrono
- **nix**: Interfacce Unix
- **serde**: Serializzazione JSON
- **rpassword**: Gestione password sicura
- **anyhow**: Gestione errori
- **log**: Logging

## Compilazione

### Prerequisiti

1. Installa Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

2. Installa le dipendenze di sistema:

**macOS:**
```bash
# Nessuna dipendenza aggiuntiva richiesta
```

**Linux:**
```bash
sudo apt-get install build-essential libdbus-1-dev
```

**Windows:**
```bash
# Installa Visual Studio Build Tools
```

### Build

```bash
# Build della libreria
cargo build --release

# Build del binario di test
cargo build --bin termina-terminal

# Esegui i test
cargo test

# Esegui il binario di test
cargo run --bin termina-terminal
```

## Integrazione con Node.js

La libreria fornisce un'interfaccia FFI compatibile con C che può essere utilizzata da Node.js tramite:

- `node-ffi`
- `ffi-napi`
- `@napi-rs/cli`

### Esempio di utilizzo in Node.js

```javascript
const ffi = require('ffi-napi');

const lib = ffi.Library('./target/release/libtermina_terminal', {
  'rust_terminal_init': ['int', []],
  'rust_terminal_create_session': ['string', ['string']],
  'rust_terminal_write_to_session': ['int', ['string', 'string']],
  'rust_terminal_close_session': ['int', ['string']],
  'rust_terminal_free_string': ['void', ['string']]
});

// Inizializza il terminale
lib.rust_terminal_init();

// Crea una sessione
const sessionId = lib.rust_terminal_create_session(null);

// Scrive un comando
lib.rust_terminal_write_to_session(sessionId, 'echo hello\n');

// Chiude la sessione
lib.rust_terminal_close_session(sessionId);

// Libera la memoria
lib.rust_terminal_free_string(sessionId);
```

## API Rust

### Creazione del Terminale

```rust
use termina_terminal::RustTerminal;

// Crea con configurazione di default
let terminal = RustTerminal::new()?;

// Crea con configurazione personalizzata
let config = TerminalConfig {
    default_shell: "zsh".to_string(),
    default_cwd: "/home/user".to_string(),
    timeout_seconds: 300,
    max_sessions: 10,
    enable_sudo: true,
    sudo_timeout: 60,
};
let terminal = RustTerminal::with_config(config)?;
```

### Gestione Sessioni

```rust
// Crea una sessione
let session_id = terminal.create_session(Some("/path/to/cwd".to_string()))?;

// Scrive dati
terminal.write_to_session(&session_id, "ls -la\n")?;

// Ridimensiona
terminal.resize_session(&session_id, 80, 24)?;

// Ottiene output
let output = terminal.get_session_output(&session_id)?;

// Chiude sessione
terminal.close_session(&session_id)?;
```

### Comandi Sudo

```rust
// Esegue comando sudo
terminal.run_sudo_command(&session_id, "sudo apt update", "password")?;
```

## Test

```bash
# Esegui tutti i test
cargo test

# Esegui test specifici
cargo test test_session_creation
cargo test test_sudo_handling

# Test con output verbose
cargo test -- --nocapture
```

## Debug

Per abilitare il logging di debug:

```bash
RUST_LOG=debug cargo run
```

## Sicurezza

- Le password sudo non vengono mai loggate
- I messaggi di password vengono filtrati dall'output
- Timeout configurabili per prevenire hang
- Gestione sicura della memoria con Rust

## Performance

- Gestione asincrona con Tokio
- Buffer ottimizzati per l'output
- Cleanup automatico delle sessioni inattive
- Gestione efficiente della memoria

## Troubleshooting

### Problemi di Compilazione

1. **Errore di dipendenze di sistema**:
   - Assicurati di avere le dipendenze di build installate
   - Su macOS, installa Xcode Command Line Tools

2. **Errore di linking**:
   - Verifica che le librerie di sistema siano disponibili
   - Controlla i percorsi delle librerie

### Problemi Runtime

1. **Sessioni non si creano**:
   - Verifica che la shell di default sia disponibile
   - Controlla i permessi della directory di lavoro

2. **Comandi sudo falliscono**:
   - Verifica che sudo sia installato e configurato
   - Controlla che la password sia corretta

## Contribuire

1. Fork del repository
2. Crea un branch per la feature
3. Implementa le modifiche
4. Aggiungi test
5. Crea una pull request

## Licenza

MIT License - vedi il file LICENSE per i dettagli.
