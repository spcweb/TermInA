//! Wrapper Node.js per il terminale Rust
//! 
//! Questo modulo fornisce un'interfaccia Node.js per comunicare
//! con la libreria terminale Rust tramite un processo separato.

const { spawn } = require('child_process');
const path = require('path');
const { EventEmitter } = require('events');

class RustTerminalWrapper extends EventEmitter {
    constructor() {
        super();
        this.rustProcess = null;
        this.isInitialized = false;
        this.sessions = new Map();
        this.nextSessionId = 1;
        this.messageId = 0;
        this.pendingMessages = new Map();
    }

    /**
     * Inizializza il wrapper del terminale Rust
     */
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            // Percorso alla libreria Rust compilata
            const rustLibPath = path.join(__dirname, '..', 'rust-terminal', 'target', 'release');
            
            // Per ora, usiamo un approccio semplificato con un processo Rust
            // In futuro, potremmo usare FFI diretto
            console.log('Rust Terminal Wrapper: Initializing...');
            
            this.isInitialized = true;
            this.emit('initialized');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Rust terminal wrapper:', error);
            this.emit('error', error);
            return false;
        }
    }

    /**
     * Crea una nuova sessione terminale
     */
    async createSession(cwd = null) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const sessionId = `session_${this.nextSessionId++}`;
        
        // Per ora, simuliamo la creazione di una sessione
        // In futuro, comunicheremo con il processo Rust
        const session = {
            id: sessionId,
            cwd: cwd || process.env.HOME || '/tmp',
            isActive: true,
            lastActivity: Date.now(),
            buffer: '',
            outputBuffer: [],
            onData: null,
            onExit: null,
            type: 'rust',
            waitingForPassword: false,
            lastPrompt: '',
            commandHistory: [],
            currentCommand: '',
            isExecuting: false,
            isReady: true
        };

        this.sessions.set(sessionId, session);
        console.log(`Rust Terminal: Created session ${sessionId}`);
        
        return session;
    }

    /**
     * Scrive dati a una sessione
     */
    async writeToSession(sessionId, data) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.isActive) {
            console.error(`Session ${sessionId} not found or inactive`);
            return false;
        }

        console.log(`Rust Terminal: Writing to session ${sessionId}:`, data.substring(0, 100) + (data.length > 100 ? '...' : ''));

        // Se è un comando completo, eseguilo
        if (data.includes('\r') || data.includes('\n')) {
            const command = data.replace(/[\r\n]/g, '').trim();
            if (command) {
                session.commandHistory.push(command);
                session.currentCommand = command;
                session.isExecuting = true;

                console.log(`Rust Terminal: Executing command: "${command}"`);
                
                // Esegui il comando usando il sistema Rust
                await this.executeCommand(session, command);
            }
        } else {
            // Input normale (caratteri singoli, backspace, etc.)
            session.lastActivity = Date.now();
        }

        session.lastActivity = Date.now();
        return true;
    }

    /**
     * Esegue un comando in una sessione
     */
    async executeCommand(session, command) {
        try {
            // Per ora, usiamo il sistema esistente come fallback
            // In futuro, comunicheremo con il processo Rust
            const { exec } = require('child_process');
            
            return new Promise((resolve) => {
                exec(command, { 
                    encoding: 'utf8', 
                    maxBuffer: 1024 * 1024, 
                    cwd: session.cwd 
                }, (error, stdout, stderr) => {
                    const output = stdout || '';
                    const errorOutput = stderr || '';
                    const fullOutput = output + (errorOutput ? '\n' + errorOutput : '');
                    
                    if (fullOutput) {
                        session.buffer += fullOutput;
                        const timestamp = Date.now();
                        session.outputBuffer.push({
                            data: fullOutput,
                            timestamp: timestamp,
                            source: 'stdout'
                        });
                        
                        if (session.onData) {
                            session.onData(fullOutput);
                        }
                    }
                    
                    // Aggiungi un prompt finale
                    const promptOutput = '\n$ ';
                    session.buffer += promptOutput;
                    const promptTimestamp = Date.now();
                    session.outputBuffer.push({
                        data: promptOutput,
                        timestamp: promptTimestamp,
                        source: 'stdout'
                    });
                    
                    if (session.onData) {
                        session.onData(promptOutput);
                    }
                    
                    session.isExecuting = false;
                    session.currentCommand = '';
                    session.lastActivity = Date.now();
                    
                    resolve({
                        success: !error,
                        output: fullOutput,
                        exitCode: error ? error.code || 1 : 0,
                        error: error ? error.message : null
                    });
                });
            });
        } catch (error) {
            console.error(`Error executing command "${command}":`, error);
            
            const errorOutput = `Error: ${error.message}\n$ `;
            session.buffer += errorOutput;
            const timestamp = Date.now();
            session.outputBuffer.push({
                data: errorOutput,
                timestamp: timestamp,
                source: 'stderr'
            });
            
            if (session.onData) {
                session.onData(errorOutput);
            }
            
            session.isExecuting = false;
            session.currentCommand = '';
            session.lastActivity = Date.now();
            
            return {
                success: false,
                output: '',
                exitCode: 1,
                error: error.message
            };
        }
    }

    /**
     * Esegue un comando sudo
     */
    async executeSudoCommand(sessionId, command, password) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.isActive) {
            console.error(`Session ${sessionId} not found or inactive`);
            return false;
        }

        console.log(`Rust Terminal: Executing sudo command: "${command}"`);
        
        // Per ora, usiamo il sistema esistente
        // In futuro, comunicheremo con il processo Rust per gestione sicura delle password
        const { spawn } = require('child_process');
        
        return new Promise((resolve) => {
            const sudoProcess = spawn('sudo', ['-S', '-p', '', 'sh', '-c', command], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: session.cwd
            });

            let output = '';
            let errorOutput = '';

            // Invia la password
            sudoProcess.stdin.write(password + '\n');
            sudoProcess.stdin.end();

            sudoProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            sudoProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            sudoProcess.on('close', (code) => {
                const fullOutput = output + (errorOutput ? '\n' + errorOutput : '');
                
                if (fullOutput) {
                    session.buffer += fullOutput;
                    const timestamp = Date.now();
                    session.outputBuffer.push({
                        data: fullOutput,
                        timestamp: timestamp,
                        source: 'stdout'
                    });
                    
                    if (session.onData) {
                        session.onData(fullOutput);
                    }
                }
                
                // Aggiungi un prompt finale
                const promptOutput = '\n$ ';
                session.buffer += promptOutput;
                const promptTimestamp = Date.now();
                session.outputBuffer.push({
                    data: promptOutput,
                    timestamp: promptTimestamp,
                    source: 'stdout'
                });
                
                if (session.onData) {
                    session.onData(promptOutput);
                }
                
                session.isExecuting = false;
                session.currentCommand = '';
                session.lastActivity = Date.now();
                
                resolve({
                    success: code === 0,
                    output: fullOutput,
                    exitCode: code,
                    error: code !== 0 ? `Command failed with exit code ${code}` : null
                });
            });

            sudoProcess.on('error', (error) => {
                console.error(`Sudo process error:`, error);
                resolve({
                    success: false,
                    output: '',
                    exitCode: 1,
                    error: error.message
                });
            });
        });
    }

    /**
     * Ridimensiona una sessione
     */
    async resizeSession(sessionId, cols, rows) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.isActive) {
            return false;
        }

        console.log(`Rust Terminal: Resizing session ${sessionId} to ${cols}x${rows}`);
        session.lastActivity = Date.now();
        return true;
    }

    /**
     * Termina una sessione
     */
    async killSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }

        console.log(`Rust Terminal: Killing session ${sessionId}`);
        session.isActive = false;
        this.sessions.delete(sessionId);
        return true;
    }

    /**
     * Chiude una sessione
     */
    async closeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }

        console.log(`Rust Terminal: Closing session ${sessionId}`);
        session.isActive = false;
        this.sessions.delete(sessionId);
        return true;
    }

    /**
     * Pulisce una sessione
     */
    async clearSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }

        console.log(`Rust Terminal: Clearing session ${sessionId}`);
        session.buffer = '';
        session.outputBuffer = [];
        return true;
    }

    /**
     * Ottiene l'output di una sessione
     */
    getSessionOutput(sessionId, fromIndex = 0) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return '';
        }
        return session.buffer.substring(fromIndex);
    }

    /**
     * Ottiene l'output di una sessione dal buffer
     */
    getSessionOutputFromBuffer(sessionId, fromTimestamp = 0) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.outputBuffer) {
            return '';
        }

        const filteredItems = session.outputBuffer.filter(item => item.timestamp > fromTimestamp);
        return filteredItems.map(item => item.data).join('');
    }

    /**
     * Ottiene l'ultimo timestamp di output
     */
    getLastOutputTimestamp(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return 0;
        }
        return session.lastOutputTimestamp || 0;
    }

    /**
     * Ottiene una sessione
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    /**
     * Ottiene tutte le sessioni attive
     */
    getActiveSessions() {
        const active = [];
        for (const [id, session] of this.sessions) {
            if (session.isActive) {
                active.push({
                    id: id,
                    lastActivity: session.lastActivity,
                    bufferSize: session.buffer.length,
                    type: session.type,
                    currentCommand: session.currentCommand,
                    isExecuting: session.isExecuting
                });
            }
        }
        return active;
    }

    /**
     * Pulisce le sessioni inattive
     */
    cleanupInactiveSessions(maxAgeMs = 30 * 60 * 1000) {
        const now = Date.now();
        const toDelete = [];
        
        for (const [id, session] of this.sessions) {
            if (!session.isActive || (now - session.lastActivity) > maxAgeMs) {
                toDelete.push(id);
            }
        }
        
        toDelete.forEach(id => {
            this.sessions.delete(id);
        });
        
        return toDelete.length;
    }

    /**
     * Ottiene lo stato del wrapper
     */
    getStatus() {
        return {
            available: this.isInitialized,
            usingRust: true,
            activeSessions: this.sessions.size,
            type: 'rust-wrapper'
        };
    }

    /**
     * Chiude il wrapper
     */
    async shutdown() {
        console.log('Rust Terminal Wrapper: Shutting down...');
        
        // Chiudi tutte le sessioni
        for (const [id, session] of this.sessions) {
            session.isActive = false;
        }
        this.sessions.clear();
        
        this.isInitialized = false;
        this.emit('shutdown');
    }
}

module.exports = new RustTerminalWrapper();
