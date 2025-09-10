# TermInA Terminal - Rust Implementation

This is the terminal module rewritten in Rust to fix sudo command issues and improve TermInA terminal performance.

## Features

- **Robust PTY management**: Native Rust implementation for pseudo-terminal handling
- **Secure sudo support**: Safe handling of passwords and privileged commands
- **FFI interface**: Compatible with Node.js/Electron via C interface
- **Asynchronous runtime**: Tokio-based async operations
- **Cross-platform**: Supports macOS, Linux, and Windows
- **Session management**: Multiple simultaneous terminal sessions

## Project Structure

```
src/
├── lib.rs              # Core library
├── main.rs             # Test binary entry point
├── pty_manager.rs      # PTY management
├── session.rs          # Session management
├── sudo_handler.rs     # Sudo command handling
└── ffi.rs              # FFI interface for Node.js
```

## Key Dependencies

- **tokio**: Async runtime
- **nix**: Unix interfaces
- **serde**: JSON serialization
- **rpassword**: Secure password input
- **anyhow**: Error handling
- **log**: Logging

## Build

### Prerequisites

1. Install Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

2. Install system dependencies:

**macOS:**
```bash
# No additional dependencies required
```

**Linux:**
```bash
sudo apt-get install build-essential libdbus-1-dev
```

**Windows:**
```bash
# Install Visual Studio Build Tools
```

### Build

```bash
# Build the library
cargo build --release

# Build the test binary
cargo build --bin termina-terminal

# Run tests
cargo test

# Run the test binary
cargo run --bin termina-terminal
```

## Node.js Integration

The library provides a C-compatible FFI interface usable from Node.js via:

- `node-ffi`
- `ffi-napi`
- `@napi-rs/cli`

### Node.js Usage Example

```javascript
const ffi = require('ffi-napi');

const lib = ffi.Library('./target/release/libtermina_terminal', {
  'rust_terminal_init': ['int', []],
  'rust_terminal_create_session': ['string', ['string']],
  'rust_terminal_write_to_session': ['int', ['string', 'string']],
  'rust_terminal_close_session': ['int', ['string']],
  'rust_terminal_free_string': ['void', ['string']]
});

// Initialize terminal
lib.rust_terminal_init();

// Create a session
const sessionId = lib.rust_terminal_create_session(null);

// Write a command
lib.rust_terminal_write_to_session(sessionId, 'echo hello\n');

// Close the session
lib.rust_terminal_close_session(sessionId);

// Free memory
lib.rust_terminal_free_string(sessionId);
```

## Rust API

### Create Terminal

```rust
use termina_terminal::RustTerminal;

// Create with default configuration
let terminal = RustTerminal::new()?;

// Create with custom configuration
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

### Session Management

```rust
// Create a session
let session_id = terminal.create_session(Some("/path/to/cwd".to_string()))?;

// Write data
terminal.write_to_session(&session_id, "ls -la\n")?;

// Resize
terminal.resize_session(&session_id, 80, 24)?;

// Get output
let output = terminal.get_session_output(&session_id)?;

// Close session
terminal.close_session(&session_id)?;
```

### Sudo Commands

```rust
// Run sudo command
terminal.run_sudo_command(&session_id, "sudo apt update", "password")?;
```

## Tests

```bash
# Run all tests
cargo test

# Run specific tests
cargo test test_session_creation
cargo test test_sudo_handling

# Verbose tests
cargo test -- --nocapture
```

## Debug

To enable debug logging:

```bash
RUST_LOG=debug cargo run
```

## Security

- Sudo passwords are never logged
- Password prompts are filtered from output
- Configurable timeouts prevent hangs
- Safe memory management with Rust

## Performance

- Async handling with Tokio
- Optimized output buffers
- Automatic cleanup of inactive sessions
- Efficient memory usage

## Troubleshooting

### Build Issues

1. **System dependencies**:
   - Make sure build dependencies are installed
   - On macOS, install Xcode Command Line Tools

2. **Linking errors**:
   - Verify system libraries are available
   - Check library paths

### Runtime Issues

1. **Sessions not created**:
   - Ensure default shell is available
   - Check working directory permissions

2. **Sudo commands fail**:
   - Ensure sudo is installed and configured
   - Verify the password is correct

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes
4. Add tests
5. Open a pull request

## License

MIT License — see LICENSE for details.
