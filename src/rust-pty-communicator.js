//! Comunicatore per PTY Rust
//! 
//! Questo modulo gestisce la comunicazione tra Node.js e il processo Rust
//! per l'utilizzo della PTY reale.

const { spawn } = require('child_process');
const path = require('path');
const { EventEmitter } = require('events');

class RustPtyCommunicator extends EventEmitter {
    constructor() {
        super();
        this.rustProcess = null;
        this.isInitialized = false;
        this.messageId = 0;
        this.pendingMessages = new Map();
        this.sessions = new Map();
    }

    /**
     * Inizializza il comunicatore Rust
     */
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            console.log('Rust PTY Communicator: Initializing...');
            
            // Percorso al binario Rust compilato
            const rustBinaryPath = path.join(__dirname, '..', 'rust-terminal', 'target', 'release', 'termina_terminal');
            
            // Avvia il processo Rust
            this.rustProcess = spawn(rustBinaryPath, [], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    RUST_LOG: 'info'
                }
            });

            // Gestisci l'output del processo Rust
            this.rustProcess.stdout.on('data', (data) => {
                this.handleRustOutput(data.toString());
            });

            this.rustProcess.stderr.on('data', (data) => {
                console.error('Rust PTY stderr:', data.toString());
            });

            this.rustProcess.on('close', (code) => {
                console.log(`Rust PTY process exited with code ${code}`);
                this.isInitialized = false;
                this.emit('process-exit', code);
            });

            this.rustProcess.on('error', (error) => {
                console.error('Rust PTY process error:', error);
                this.emit('error', error);
            });

            // Attendi che il processo sia pronto
            await this.waitForReady();
            
            this.isInitialized = true;
            this.emit('initialized');
            console.log('Rust PTY Communicator: Initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Rust PTY communicator:', error);
            this.emit('error', error);
            return false;
        }
    }

    /**
     * Attende che il processo Rust sia pronto
     */
    async waitForReady() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for Rust process to be ready'));
            }, 10000); // 10 secondi timeout

            const onReady = () => {
                clearTimeout(timeout);
                this.rustProcess.stdout.removeListener('data', onReady);
                resolve();
            };

            this.rustProcess.stdout.on('data', (data) => {
                if (data.toString().includes('Rust PTY ready')) {
                    onReady();
                }
            });
        });
    }

    /**
     * Gestisce l'output dal processo Rust
     */
    handleRustOutput(data) {
        try {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const message = JSON.parse(line);
                        this.handleRustMessage(message);
                    } catch (e) {
                        // Non è JSON, probabilmente output del terminale
                        console.log('Rust output:', line);
                    }
                }
            }
        } catch (error) {
            console.error('Error handling Rust output:', error);
        }
    }

    /**
     * Gestisce i messaggi dal processo Rust
     */
    handleRustMessage(message) {
        if (message.id && this.pendingMessages.has(message.id)) {
            const { resolve, reject } = this.pendingMessages.get(message.id);
            this.pendingMessages.delete(message.id);
            
            if (message.success) {
                resolve(message);
            } else {
                reject(new Error(message.error || 'Unknown error'));
            }
        } else {
            // Messaggio senza ID (evento)
            this.emit('message', message);
        }
    }

    /**
     * Invia un comando al processo Rust
     */
    async sendCommand(command, params = {}) {
        if (!this.isInitialized || !this.rustProcess) {
            throw new Error('Rust PTY communicator not initialized');
        }

        const messageId = ++this.messageId;
        const message = {
            id: messageId,
            command,
            ...params
        };

        return new Promise((resolve, reject) => {
            this.pendingMessages.set(messageId, { resolve, reject });
            
            // Timeout per i messaggi
            setTimeout(() => {
                if (this.pendingMessages.has(messageId)) {
                    this.pendingMessages.delete(messageId);
                    reject(new Error('Command timeout'));
                }
            }, 30000); // 30 secondi timeout

            this.rustProcess.stdin.write(JSON.stringify(message) + '\n');
        });
    }

    /**
     * Crea una nuova sessione PTY
     */
    async createSession(cwd = null) {
        const result = await this.sendCommand('create_session', { cwd });
        if (result.success) {
            const sessionId = result.session_id;
            this.sessions.set(sessionId, {
                id: sessionId,
                cwd: cwd || process.env.HOME || '/tmp',
                isActive: true,
                lastActivity: Date.now()
            });
            return sessionId;
        } else {
            throw new Error(result.error || 'Failed to create session');
        }
    }

    /**
     * Scrive dati a una sessione
     */
    async writeToSession(sessionId, data) {
        const result = await this.sendCommand('write_to_session', {
            session_id: sessionId,
            data
        });
        if (!result.success) {
            throw new Error(result.error || 'Failed to write to session');
        }
        return result;
    }

    /**
     * Ottiene l'output di una sessione
     */
    async getSessionOutput(sessionId, fromIndex = 0) {
        const result = await this.sendCommand('get_session_output', {
            session_id: sessionId,
            from_index: fromIndex
        });
        if (result.success) {
            return result.output;
        } else {
            throw new Error(result.error || 'Failed to get session output');
        }
    }

    /**
     * Ridimensiona una sessione
     */
    async resizeSession(sessionId, cols, rows) {
        const result = await this.sendCommand('resize_session', {
            session_id: sessionId,
            cols,
            rows
        });
        if (!result.success) {
            throw new Error(result.error || 'Failed to resize session');
        }
        return result;
    }

    /**
     * Termina una sessione
     */
    async killSession(sessionId) {
        const result = await this.sendCommand('kill_session', {
            session_id: sessionId
        });
        if (result.success) {
            this.sessions.delete(sessionId);
        } else {
            throw new Error(result.error || 'Failed to kill session');
        }
        return result;
    }

    /**
     * Chiude una sessione
     */
    async closeSession(sessionId) {
        const result = await this.sendCommand('close_session', {
            session_id: sessionId
        });
        if (result.success) {
            this.sessions.delete(sessionId);
        } else {
            throw new Error(result.error || 'Failed to close session');
        }
        return result;
    }

    /**
     * Pulisce una sessione
     */
    async clearSession(sessionId) {
        const result = await this.sendCommand('clear_session', {
            session_id: sessionId
        });
        if (!result.success) {
            throw new Error(result.error || 'Failed to clear session');
        }
        return result;
    }

    /**
     * Esegue un comando in una sessione
     */
    async runCommand(sessionId, command) {
        const result = await this.sendCommand('run_command', {
            session_id: sessionId,
            command
        });
        if (!result.success) {
            throw new Error(result.error || 'Failed to run command');
        }
        return result;
    }

    /**
     * Ottiene lo stato del comunicatore
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            activeSessions: this.sessions.size,
            pendingMessages: this.pendingMessages.size,
            rustProcessAlive: this.rustProcess && !this.rustProcess.killed
        };
    }

    /**
     * Chiude il comunicatore
     */
    async shutdown() {
        console.log('Rust PTY Communicator: Shutting down...');
        
        if (this.rustProcess) {
            this.rustProcess.kill('SIGTERM');
            this.rustProcess = null;
        }
        
        this.sessions.clear();
        this.pendingMessages.clear();
        this.isInitialized = false;
        
        this.emit('shutdown');
    }
}

module.exports = new RustPtyCommunicator();



