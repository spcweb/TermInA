const { spawn } = require('child_process');
const os = require('os');

class PTYManager {
    constructor() {
        this.sessions = new Map();
        this.nextSessionId = 1;
        this.isAvailable = true; // Sarà true se PTY è disponibile
        
        try {
            // Test se possiamo usare node-pty
            require('node-pty');
            this.usePty = true;
        } catch (error) {
            console.log('node-pty not available, using fallback PTY implementation');
            this.usePty = false;
        }
    }

    createSession(sessionId = null) {
        const id = sessionId || this.nextSessionId++;
        
        if (this.usePty) {
            return this.createPtySession(id);
        } else {
            return this.createFallbackSession(id);
        }
    }

    createPtySession(id) {
        const pty = require('node-pty');
        
        // Determina la shell di default del sistema
        const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');
        
        // Crea un nuovo processo PTY
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: process.cwd(),
            env: {
                ...process.env,
                TERM: 'xterm-256color',
                COLORTERM: 'truecolor',
                FORCE_COLOR: '1'
            }
        });

        // Crea un oggetto sessione
        const session = {
            id: id,
            pty: ptyProcess,
            isActive: true,
            lastActivity: Date.now(),
            buffer: '',
            onData: null,
            onExit: null,
            type: 'pty'
        };

        // Handler per i dati in output dal PTY
        ptyProcess.onData((data) => {
            session.buffer += data;
            session.lastActivity = Date.now();
            if (session.onData) {
                session.onData(data);
            }
        });

        // Handler per la chiusura del PTY
        ptyProcess.onExit(({ exitCode, signal }) => {
            session.isActive = false;
            if (session.onExit) {
                session.onExit({ exitCode, signal });
            }
            this.sessions.delete(id);
        });

        this.sessions.set(id, session);
        return session;
    }

    createFallbackSession(id) {
        // Implementazione fallback usando spawn normale con tty
        const shell = process.env.SHELL || (os.platform() === 'win32' ? 'cmd' : 'bash');
        
        // Inizia con una shell interattiva
        const childProcess = spawn(shell, [], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                TERM: 'xterm-256color',
                COLORTERM: 'truecolor',
                FORCE_COLOR: '1',
                // Simula un TTY
                TERM_PROGRAM: 'TermInA',
                PS1: '\\u@\\h:\\w\\$ ',
                // Importante per sudo
                SUDO_ASKPASS: undefined,
                SSH_ASKPASS: undefined
            },
            cwd: process.cwd(),
            // Prova a simulare un terminale
            detached: false
        });

        const session = {
            id: id,
            pty: childProcess,
            isActive: true,
            lastActivity: Date.now(),
            buffer: '',
            onData: null,
            onExit: null,
            type: 'fallback',
            waitingForPassword: false,
            lastPrompt: ''
        };

        // Handler per stdout
        childProcess.stdout.on('data', (data) => {
            const text = data.toString();
            session.buffer += text;
            session.lastActivity = Date.now();
            
            // Controlla se è richiesta una password
            if (this.isPasswordPrompt(text)) {
                session.waitingForPassword = true;
                session.lastPrompt = text;
            }
            
            if (session.onData) {
                session.onData(text);
            }
        });

        // Handler per stderr
        childProcess.stderr.on('data', (data) => {
            const text = data.toString();
            session.buffer += text;
            session.lastActivity = Date.now();
            
            // Controlla se è richiesta una password anche in stderr
            if (this.isPasswordPrompt(text)) {
                session.waitingForPassword = true;
                session.lastPrompt = text;
            }
            
            if (session.onData) {
                session.onData(text);
            }
        });

        // Handler per la chiusura
        childProcess.on('close', (exitCode, signal) => {
            session.isActive = false;
            if (session.onExit) {
                session.onExit({ exitCode, signal });
            }
            this.sessions.delete(id);
        });

        // Handler per errori
        childProcess.on('error', (error) => {
            console.error('Fallback PTY error:', error);
            session.isActive = false;
            if (session.onExit) {
                session.onExit({ exitCode: 1, signal: null, error });
            }
            this.sessions.delete(id);
        });

        this.sessions.set(id, session);
        return session;
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    writeToSession(sessionId, data) {
        const session = this.sessions.get(sessionId);
        if (session && session.isActive) {
            if (session.type === 'pty') {
                session.pty.write(data);
            } else {
                // Fallback: scrive a stdin
                session.pty.stdin.write(data);
            }
            session.lastActivity = Date.now();
            return true;
        }
        return false;
    }

    resizeSession(sessionId, cols, rows) {
        const session = this.sessions.get(sessionId);
        if (session && session.isActive) {
            if (session.type === 'pty') {
                session.pty.resize(cols, rows);
                return true;
            }
            // Nel fallback non possiamo ridimensionare, ma torniamo true comunque
            return true;
        }
        return false;
    }

    killSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session && session.isActive) {
            if (session.type === 'pty') {
                session.pty.kill();
            } else {
                session.pty.kill('SIGTERM');
            }
            this.sessions.delete(sessionId);
            return true;
        }
        return false;
    }

    clearSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.buffer = '';
            // Invia comando clear
            if (session.type === 'pty') {
                session.pty.write('clear\r');
            } else {
                session.pty.stdin.write('clear\n');
            }
            return true;
        }
        return false;
    }

    executeCommand(sessionId, command) {
        const session = this.sessions.get(sessionId);
        if (session && session.isActive) {
            if (session.type === 'pty') {
                // Aggiungi \r per simulare l'invio
                session.pty.write(command + '\r');
            } else {
                // Per il fallback, aggiungi \n
                session.pty.stdin.write(command + '\n');
            }
            session.lastActivity = Date.now();
            return true;
        }
        return false;
    }

    getSessionOutput(sessionId, fromIndex = 0) {
        const session = this.sessions.get(sessionId);
        if (session) {
            return session.buffer.substring(fromIndex);
        }
        return '';
    }

    // Crea una sessione temporanea per un singolo comando
    async runCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            const session = this.createSession();
            let output = '';
            let hasStarted = false;
            let commandCompleted = false;
            
            const timeout = options.timeout || 30000; // 30 secondi di default
            
            // Timer di timeout
            const timeoutTimer = setTimeout(() => {
                if (!commandCompleted) {
                    this.killSession(session.id);
                    reject(new Error(`Command timed out after ${timeout}ms`));
                }
            }, timeout);

            // Handler per i dati
            session.onData = (data) => {
                output += data;
                
                // Se vediamo il prompt finale, il comando è completato
                if (hasStarted && this.isPromptVisible(data)) {
                    commandCompleted = true;
                    clearTimeout(timeoutTimer);
                    this.killSession(session.id);
                    
                    // Pulisce l'output rimuovendo il comando e il prompt finale
                    const cleanOutput = this.cleanCommandOutput(output, command);
                    resolve({
                        success: true,
                        output: cleanOutput,
                        exitCode: 0
                    });
                }
            };

            // Handler per l'uscita
            session.onExit = ({ exitCode, signal }) => {
                if (!commandCompleted) {
                    commandCompleted = true;
                    clearTimeout(timeoutTimer);
                    
                    const cleanOutput = this.cleanCommandOutput(output, command);
                    resolve({
                        success: exitCode === 0,
                        output: cleanOutput,
                        exitCode: exitCode || 0,
                        signal
                    });
                }
            };

            // Aspetta che il PTY sia pronto e invia il comando
            setTimeout(() => {
                hasStarted = true;
                this.executeCommand(session.id, command);
            }, 100);
        });
    }

    // Verifica se l'output contiene un prompt di password
    isPasswordPrompt(data) {
        const passwordPatterns = [
            /password:/i,
            /passcode:/i,
            /passphrase:/i,
            /enter password/i,
            /sudo password/i,
            /\[sudo\] password/i,
            /password for .+:/i,
            /enter.*password/i,
            /type.*password/i
        ];
        
        return passwordPatterns.some(pattern => pattern.test(data));
    }

    // Verifica se l'output contiene un prompt
    isPromptVisible(data) {
        // Pattern comuni per i prompt della shell
        const promptPatterns = [
            /\$\s*$/,           // Prompt bash/zsh standard
            /%\s*$/,            // Prompt zsh
            />\s*$/,            // Prompt PowerShell/Windows
            /\#\s*$/,           // Prompt root
            /❯\s*$/,            // Prompt zsh moderno
            /➜\s+.*\s+$/        // Prompt oh-my-zsh
        ];
        
        return promptPatterns.some(pattern => pattern.test(data));
    }

    // Pulisce l'output dal comando e dal prompt
    cleanCommandOutput(output, command) {
        let lines = output.split('\n');
        
        // Rimuovi le linee che contengono il comando originale
        lines = lines.filter(line => !line.includes(command));
        
        // Rimuovi le linee vuote all'inizio e alla fine
        while (lines.length > 0 && lines[0].trim() === '') {
            lines.shift();
        }
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines.pop();
        }
        
        // Rimuovi l'ultima linea se contiene solo il prompt
        if (lines.length > 0) {
            const lastLine = lines[lines.length - 1];
            if (this.isPromptVisible(lastLine)) {
                lines.pop();
            }
        }
        
        return lines.join('\n');
    }

    // Ottieni informazioni su tutte le sessioni attive
    getActiveSessions() {
        const active = [];
        for (const [id, session] of this.sessions) {
            if (session.isActive) {
                active.push({
                    id: id,
                    lastActivity: session.lastActivity,
                    bufferSize: session.buffer.length,
                    type: session.type
                });
            }
        }
        return active;
    }

    // Pulizia delle sessioni inattive
    cleanupInactiveSessions(maxAgeMs = 30 * 60 * 1000) { // 30 minuti di default
        const now = Date.now();
        const toDelete = [];
        
        for (const [id, session] of this.sessions) {
            if (!session.isActive || (now - session.lastActivity) > maxAgeMs) {
                toDelete.push(id);
            }
        }
        
        toDelete.forEach(id => {
            this.killSession(id);
        });
        
        return toDelete.length;
    }

    getStatus() {
        return {
            available: this.isAvailable,
            usingPty: this.usePty,
            activeSessions: this.sessions.size
        };
    }
}

module.exports = new PTYManager();
