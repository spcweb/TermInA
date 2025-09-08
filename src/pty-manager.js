const { spawn } = require('child_process');
let nodePty = null;
try {
    // Try to load node-pty from global installation
    nodePty = require('node-pty');
    console.log('PTY Manager: node-pty loaded successfully');
} catch (err) {
    console.log('PTY Manager: node-pty not available, error:', err.message);
    nodePty = null;
}
const os = require('os');
const { EventEmitter } = require('events');

class PTYManager extends EventEmitter {
    constructor() {
        super();
        this.sessions = new Map();
        this.nextSessionId = 1;
        this.isAvailable = true;

        // Gestisci il log in modo sicuro per evitare errori EPIPE
        try {
            console.log('PTY Manager: Using enhanced child_process implementation');
        } catch (logError) {
            // Ignora errori di log se il processo sta terminando
            if (logError.code !== 'EPIPE') {
                throw logError;
            }
        }
    }

    // Helper method per logging sicuro
    safeLog(message) {
        try {
            console.log(message);
        } catch (logError) {
            // Ignora errori di log se il processo sta terminando
            if (logError.code !== 'EPIPE') {
                throw logError;
            }
        }
    }

    createSession(sessionId = null) {
        const id = sessionId || this.nextSessionId++;
        return this.createEnhancedSession(id);
    }

    createInteractiveSession(cwd) {
        const id = this.nextSessionId++;
        if (!nodePty) {
            this.safeLog('PTY Manager: node-pty not available, falling back to enhanced session');
            return this.createEnhancedSession(id);
        }
        this.safeLog(`PTY Manager creating node-pty session ${id}`);
        const env = {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            FORCE_COLOR: '1',
            TERM_PROGRAM: 'TermInA',
            // Configurazioni aggiuntive per impaginazione corretta
            COLUMNS: '80',
            LINES: '24',
            // Assicura che le applicazioni interattive funzionino correttamente
            LC_ALL: 'en_US.UTF-8',
            LANG: 'en_US.UTF-8'
        };
        const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'zsh');
        const ptyProcess = nodePty.spawn(shell, ['-l'], {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: cwd || os.homedir(),
            env
        });
        const session = {
            id,
            process: ptyProcess,
            isActive: true,
            lastActivity: Date.now(),
            lastOutputTimestamp: Date.now(),
            buffer: '',
            outputBuffer: [],
            onData: null,
            onExit: null,
            type: 'pty',
            waitingForPassword: false,
            lastPrompt: '',
            commandHistory: [],
            currentCommand: '',
            isExecuting: false,
            isReady: true
        };
        ptyProcess.onData((data) => {
            const timestamp = Date.now();
            session.buffer += data;
            session.outputBuffer.push({ data, timestamp, source: 'stdout' });
            session.lastOutputTimestamp = timestamp;
            session.lastActivity = timestamp;
            if (session.onData) session.onData(data);
        });
        ptyProcess.onExit(({ exitCode, signal }) => {
            this.safeLog(`PTY Manager: node-pty session ${id} exited: code=${exitCode}, signal=${signal}`);
            session.isActive = false;
            session.process = null;
            const promptOutput = '\n$ ';
            const timestamp = Date.now();
            session.buffer += promptOutput;
            session.outputBuffer.push({ data: promptOutput, timestamp, source: 'prompt' });
            session.lastOutputTimestamp = timestamp;
            if (session.onData) session.onData(promptOutput);
        });
        this.sessions.set(id, session);
        return session;
    }

    createEnhancedSession(id) {
        this.safeLog(`PTY Manager creating enhanced session ${id}`);
        
        // Per ora, creiamo una sessione "virtuale" che usa runCommand
        // Questo evita i problemi con le shell interattive
        const session = {
            id: id,
            process: null, // Non usiamo un processo persistente
            isActive: true,
            lastActivity: Date.now(),
            lastOutputTimestamp: Date.now(), // Timestamp per il polling
            buffer: '',
            outputBuffer: [],
            onData: null,
            onExit: null,
            type: 'enhanced',
            waitingForPassword: false,
            lastPrompt: '',
            commandHistory: [],
            currentCommand: '',
            isExecuting: false,
            isReady: true // Sempre pronta per comandi
        };
        
        console.log(`PTY Manager: Virtual session created for session ${id}`);

        this.sessions.set(id, session);
        return session;
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    writeToSession(sessionId, data) {
        const session = this.sessions.get(sessionId);
        if (session && session.isActive) {
            this.safeLog(`PTY Manager writing to session ${sessionId}:`, data.substring(0, 100) + (data.length > 100 ? '...' : ''));

            // Se è un comando completo, eseguilo direttamente
            if (data.includes('\r') || data.includes('\n')) {
                const command = data.replace(/[\r\n]/g, '').trim();
                this.safeLog(`PTY Manager: Detected complete command: "${command}"`);
                if (command) {
                    session.commandHistory.push(command);
                    session.currentCommand = command;
                    session.isExecuting = true;

                    this.safeLog(`PTY Manager: Starting execution of command: "${command}"`);
                    
                    // Per comandi interattivi, usa un approccio diverso
                    if (this.isInteractiveCommand(command)) {
                        this.runInteractiveCommand(session, command);
                    } else if (this.isPrivilegedCommand(command) && nodePty) {
                        // Per comandi privilegiati, usa node-pty
                        this.runPrivilegedCommand(command).then(result => {
                            console.log(`PTY Manager: Privileged command "${command}" completed with result:`, {
                                success: result.success,
                                outputLength: result.output ? result.output.length : 0,
                                errorLength: result.stderr ? result.stderr.length : 0,
                                requiresPassword: result.requiresPassword
                            });
                            
                            // Simula l'output del comando
                            const output = result.output || '';
                            const errorOutput = result.stderr || '';
                            const fullOutput = output + (errorOutput ? '\n' + errorOutput : '');
                            
                            if (fullOutput) {
                                session.buffer += fullOutput;
                                const timestamp = Date.now();
                                session.outputBuffer.push({
                                    data: fullOutput,
                                    timestamp: timestamp,
                                    source: 'stdout'
                                });
                                session.lastOutputTimestamp = timestamp;
                                
                                if (session.onData) {
                                    session.onData(fullOutput);
                                }
                            }
                            
                            // Aggiungi un prompt finale per indicare che il comando è completato
                            const promptOutput = '\n$ ';
                            session.buffer += promptOutput;
                            const promptTimestamp = Date.now();
                            session.outputBuffer.push({
                                data: promptOutput,
                                timestamp: promptTimestamp,
                                source: 'stdout'
                            });
                            session.lastOutputTimestamp = promptTimestamp;
                            
                            if (session.onData) {
                                session.onData(promptOutput);
                            }
                            
                            session.isExecuting = false;
                            session.currentCommand = '';
                            session.lastActivity = Date.now();
                        }).catch(error => {
                            const errorOutput = `Error: ${error.message}\n$ `;
                            session.buffer += errorOutput;
                            const errorTimestamp = Date.now();
                            session.outputBuffer.push({
                                data: errorOutput,
                                timestamp: errorTimestamp,
                                source: 'stderr'
                            });
                            session.lastOutputTimestamp = errorTimestamp;
                            
                            if (session.onData) {
                                session.onData(errorOutput);
                            }
                            
                            session.isExecuting = false;
                            session.currentCommand = '';
                            session.lastActivity = Date.now();
                        });
                    } else {
                        // Esegui il comando normale
                        this.runCommand(command).then(result => {
                        console.log(`PTY Manager: Command "${command}" completed with result:`, {
                            success: true,
                            outputLength: result.output ? result.output.length : 0,
                            errorLength: result.stderr ? result.stderr.length : 0
                        });
                        // Simula l'output del comando
                        const output = result.output || '';
                        const errorOutput = result.stderr || '';
                        const fullOutput = output + (errorOutput ? '\n' + errorOutput : '');
                        
                        if (fullOutput) {
                            session.buffer += fullOutput;
                            const timestamp = Date.now();
                            session.outputBuffer.push({
                                data: fullOutput,
                                timestamp: timestamp,
                                source: 'stdout'
                            });
                            session.lastOutputTimestamp = timestamp;
                            
                            if (session.onData) {
                                session.onData(fullOutput);
                            }
                        }
                        
                        // Aggiungi un prompt finale per indicare che il comando è completato
                        const promptOutput = '\n$ ';
                        session.buffer += promptOutput;
                        const promptTimestamp = Date.now();
                        session.outputBuffer.push({
                            data: promptOutput,
                            timestamp: promptTimestamp,
                            source: 'stdout'
                        });
                        session.lastOutputTimestamp = promptTimestamp;
                        
                        if (session.onData) {
                            session.onData(promptOutput);
                        }
                        
                        session.isExecuting = false;
                        session.currentCommand = '';
                        session.lastActivity = Date.now();
                    }).catch(error => {
                        const errorOutput = `Error: ${error.message}\n$ `;
                        session.buffer += errorOutput;
                        const errorTimestamp = Date.now();
                        session.outputBuffer.push({
                            data: errorOutput,
                            timestamp: errorTimestamp,
                            source: 'stderr'
                        });
                        session.lastOutputTimestamp = errorTimestamp;
                        
                        if (session.onData) {
                            session.onData(errorOutput);
                        }
                        
                        session.isExecuting = false;
                        session.currentCommand = '';
                        session.lastActivity = Date.now();
                    });
                    }
                }
            } else {
                // Input normale (caratteri singoli, backspace, etc.)
                // Se c'è un processo attivo, invia l'input al processo
                if (session.process && typeof session.process.write === 'function') {
                    // node-pty style
                    this.safeLog(`PTY Manager: Sending input to node-pty for session ${sessionId}: "${data}"`);
                    session.process.write(data);
                } else if (session.process && session.process.stdin) {
                    // child_process style
                    this.safeLog(`PTY Manager: Sending input to child_process for session ${sessionId}: "${data}"`);
                    session.process.stdin.write(data);
                } else {
                    // Per ora, semplicemente aggiorniamo l'attività
                    session.lastActivity = Date.now();
                    this.safeLog(`PTY Manager: Received normal input for session ${sessionId}: "${data}" (no active process)`);
                }
            }
            
            session.lastActivity = Date.now();
            return true;
        }
        console.log(`PTY Manager: session ${sessionId} not found or inactive`);
        return false;
    }

    runInteractiveCommand(session, command) {
        this.safeLog(`PTY Manager: Running interactive command: ${command}`);

        // Ambiente comune
        const env = {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            FORCE_COLOR: '1',
            TERM_PROGRAM: 'TermInA',
            PYTHONUNBUFFERED: '1',
            NODE_NO_READLINE: '1',
            // Configurazioni aggiuntive per impaginazione corretta
            COLUMNS: '80',
            LINES: '24',
            // Assicura che le applicazioni interattive funzionino correttamente
            LC_ALL: 'en_US.UTF-8',
            LANG: 'en_US.UTF-8'
        };

        this.safeLog(`PTY Manager: Platform detected: ${os.platform()}`);
        
        let childProcess;
        
        // Se node-pty è disponibile, preferiscilo sempre
        if (nodePty) {
            this.safeLog(`PTY Manager: Using node-pty for interactive command: ${command}`);
            const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'zsh');
            const pty = nodePty.spawn(shell, ['-l'], {
                name: 'xterm-256color', 
                cols: 80, 
                rows: 24,
                cwd: os.homedir(), 
                env
            });
            
            // Salva il processo PTY nella sessione
            session.process = pty;
            session.isExecuting = true;
            
            // Gestisci l'output in tempo reale
            pty.onData((data) => {
                const output = data.toString();
                this.safeLog(`PTY Manager: node-pty output (${output.length} chars):`, output.substring(0, 100) + (output.length > 100 ? '...' : ''));

                // Per comandi interattivi, assicurati che le sequenze ANSI vengano preservate
                session.buffer += output;
                const timestamp = Date.now();
                session.outputBuffer.push({
                    data: output,
                    timestamp: timestamp,
                    source: 'stdout',
                    isInteractive: true // Flag per identificare output interattivo
                });
                session.lastOutputTimestamp = timestamp;

                if (session.onData) {
                    this.safeLog(`PTY Manager: Sending ${output.length} chars to terminal via node-pty`);
                    session.onData(output);
                } else {
                    this.safeLog(`PTY Manager: No onData callback available for node-pty`);
                }
            });
            
            pty.onExit(({ exitCode, signal }) => {
                this.safeLog(`PTY Manager: node-pty command exited with code: ${exitCode}, signal: ${signal}`);
                session.isExecuting = false;
                session.process = null;
                
                // Aggiungi un prompt finale
                const promptOutput = '\n$ ';
                session.buffer += promptOutput;
                const timestamp = Date.now();
                session.outputBuffer.push({
                    data: promptOutput,
                    timestamp: timestamp,
                    source: 'prompt'
                });
                session.lastOutputTimestamp = timestamp;
                
                if (session.onData) {
                    session.onData(promptOutput);
                }
            });
            
            // Esegui il comando nella shell PTY
            pty.write(command + '\r');
            return; // Esci dalla funzione, non continuare con il fallback
        } else {
            // Soluzione intelligente: usa Python per creare un vero PTY
            // Questo simula il comportamento di ssh con pty-req usando Python
            const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'zsh');
            
            // Usa Python per creare un vero PTY e poi esegui il comando
            const pythonCmd = os.platform() === 'win32' ? 'python' : 'python3';
            const pythonCommand = `${pythonCmd} -c "import pty; pty.spawn(['${shell}', '-c', '${command}'])"`;
            this.safeLog(`PTY Manager: Using Python PTY solution: ${pythonCommand}`);
            
            // Esegui direttamente Python con il comando
            childProcess = spawn(pythonCmd, ['-c', `import pty; pty.spawn(['${shell}', '-c', '${command}'])`], { 
                stdio: ['pipe', 'pipe', 'pipe'], 
                env, 
                cwd: os.homedir(), 
                detached: false 
            });
        }
        
        // Salva il processo nella sessione
        session.process = childProcess;
        session.isExecuting = true;
        
        // Gestisci l'output in tempo reale
        childProcess.stdout.on('data', (data) => {
            const output = data.toString();
            this.safeLog(`PTY Manager: Interactive command output (${output.length} chars):`, output.substring(0, 100) + (output.length > 100 ? '...' : ''));

            // Per comandi interattivi, assicurati che le sequenze ANSI vengano preservate
            session.buffer += output;
            const timestamp = Date.now();
            session.outputBuffer.push({
                data: output,
                timestamp: timestamp,
                source: 'stdout',
                isInteractive: true // Flag per identificare output interattivo
            });
            session.lastOutputTimestamp = timestamp;

            if (session.onData) {
                this.safeLog(`PTY Manager: Sending ${output.length} chars to terminal`);
                session.onData(output);
            } else {
                this.safeLog(`PTY Manager: No onData callback available`);
            }
        });
        
        childProcess.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            this.safeLog(`PTY Manager: Interactive command error:`, errorOutput.substring(0, 100) + (errorOutput.length > 100 ? '...' : ''));
            
            session.buffer += errorOutput;
            const timestamp = Date.now();
            session.outputBuffer.push({
                data: errorOutput,
                timestamp: timestamp,
                source: 'stderr'
            });
            session.lastOutputTimestamp = timestamp;
            
            if (session.onData) {
                session.onData(errorOutput);
            }
        });
        
        childProcess.on('exit', (code) => {
            this.safeLog(`PTY Manager: Interactive command exited with code: ${code}`);
            session.isExecuting = false;
            session.process = null;
            
            // Aggiungi un prompt finale
            const promptOutput = '\n$ ';
            session.buffer += promptOutput;
            const timestamp = Date.now();
            session.outputBuffer.push({
                data: promptOutput,
                timestamp: timestamp,
                source: 'prompt'
            });
            session.lastOutputTimestamp = timestamp;
            
            if (session.onData) {
                session.onData(promptOutput);
            }
        });
        
        childProcess.on('error', (error) => {
            console.error(`PTY Manager: Interactive command error:`, error);
            const errorOutput = `Error: ${error.message}\n$ `;
            session.buffer += errorOutput;
            const timestamp = Date.now();
            session.outputBuffer.push({
                data: errorOutput,
                timestamp: timestamp,
                source: 'stderr'
            });
            session.lastOutputTimestamp = timestamp;
            
            session.isExecuting = false;
            session.process = null;
            
            if (session.onData) {
                session.onData(errorOutput);
            }
        });
    }

    resizeSession(sessionId, cols, rows) {
        const session = this.sessions.get(sessionId);
        if (session && session.isActive) {
            // Se è una sessione node-pty, applica il resize reale
            if (session.process && typeof session.process.resize === 'function') {
                try {
                    const newCols = Math.max(1, cols | 0);
                    const newRows = Math.max(1, rows | 0);
                    this.safeLog(`PTY Manager: Resizing session ${sessionId} to ${newCols}x${newRows}`);
                    session.process.resize(newCols, newRows);
                    session.lastActivity = Date.now();
                    return true;
                } catch (err) {
                    console.warn(`PTY Manager: resize failed for session ${sessionId}:`, err.message);
                    return false;
                }
            }
            // Nel fallback non possiamo ridimensionare, ma torniamo true comunque
            this.safeLog(`PTY Manager: Session ${sessionId} does not support resize (fallback mode)`);
            return true;
        }
        return false;
    }

    killSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session && session.isActive) {
            // Se c'è un processo attivo, terminarlo
            if (session.process) {
                console.log(`PTY Manager: Killing process for session ${sessionId}`);
                session.process.kill('SIGTERM');
                session.process = null;
            }
            // Rimuovi la sessione
            this.sessions.delete(sessionId);
            return true;
        }
        return false;
    }

    closeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            // Se c'è un processo attivo, terminarlo
            if (session.process) {
                console.log(`PTY Manager: Closing process for session ${sessionId}`);
                session.process.kill('SIGTERM');
                session.process = null;
            }
            // Rimuovi la sessione
            this.sessions.delete(sessionId);
            console.log(`PTY Manager: Session ${sessionId} closed`);
            return true;
        }
        return false;
    }

    clearSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.buffer = '';
            session.outputBuffer = [];
            // Per sessioni virtuali, non c'è bisogno di inviare comandi
            return true;
        }
        return false;
    }

    executeCommand(sessionId, command) {
        const session = this.sessions.get(sessionId);
        if (session && session.isActive) {
            session.currentCommand = command;
            session.isExecuting = true;
            session.commandHistory.push(command);
            
            // Esegui il comando direttamente
            this.runCommand(command).then(result => {
                const output = result.output || '';
                const errorOutput = result.stderr || '';
                const fullOutput = output + (errorOutput ? '\n' + errorOutput : '');
                
                if (fullOutput) {
                    session.buffer += fullOutput;
                    const timestamp = Date.now();
                    session.outputBuffer.push({
                        data: fullOutput,
                        timestamp: timestamp,
                        source: 'stdout'
                    });
                    session.lastOutputTimestamp = timestamp;
                    
                    if (session.onData) {
                        session.onData(fullOutput);
                    }
                }
                
                // Aggiungi un prompt finale per indicare che il comando è completato
                const promptOutput = '\n$ ';
                session.buffer += promptOutput;
                const promptTimestamp = Date.now();
                session.outputBuffer.push({
                    data: promptOutput,
                    timestamp: promptTimestamp,
                    source: 'stdout'
                });
                session.lastOutputTimestamp = promptTimestamp;
                
                if (session.onData) {
                    session.onData(promptOutput);
                }
                
                session.isExecuting = false;
                session.currentCommand = '';
                session.lastActivity = Date.now();
            }).catch(error => {
                const errorOutput = `Error: ${error.message}\n$ `;
                session.buffer += errorOutput;
                const errorTimestamp = Date.now();
                session.outputBuffer.push({
                    data: errorOutput,
                    timestamp: errorTimestamp,
                    source: 'stderr'
                });
                session.lastOutputTimestamp = errorTimestamp;
                
                if (session.onData) {
                    session.onData(errorOutput);
                }
                
                session.isExecuting = false;
                session.currentCommand = '';
                session.lastActivity = Date.now();
            });
            
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

    getSessionOutputFromBuffer(sessionId, fromTimestamp = 0) {
        const session = this.sessions.get(sessionId);
        if (session && session.outputBuffer) {
            const filteredItems = session.outputBuffer.filter(item => item.timestamp > fromTimestamp);

            // Per output interattivi, assicurati che le sequenze ANSI vengano mantenute intatte
            const hasInteractiveOutput = filteredItems.some(item => item.isInteractive);

            if (hasInteractiveOutput) {
                this.safeLog(`PTY Manager: Processing interactive output for session ${sessionId}`);
                // Per comandi interattivi, restituisci l'output completo senza modificarlo
                return filteredItems.map(item => item.data).join('');
            } else {
                // Per output normale, procedi come prima
                return filteredItems.map(item => item.data).join('');
            }
        }
        return '';
    }

    getLastOutputTimestamp(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            return session.lastOutputTimestamp || 0;
        }
        return 0;
    }

    // Crea una sessione temporanea per un singolo comando con gestione migliorata
    async runCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            console.log(`PTY Manager: Running command: ${command}`);
            
            // Se è un comando che richiede solo input interattivo, rifiutalo
            if (this.isInteractiveOnlyCommand(command)) {
                console.log(`PTY Manager: Command requires interactive input: ${command}`);
                resolve({
                    success: false,
                    output: `[Error] Command "${command}" requires interactive input. Please provide arguments or use a regular terminal.\n\nExamples:\n  ${command} --help\n  ${command} --version\n  ${command} <package-name>`,
                    exitCode: 1,
                    error: 'Interactive input required',
                    stderr: 'Command requires interactive input'
                });
                return;
            }

            // Se è un comando sudo, non usare il PTY - lascia che il sistema di gestione password lo gestisca
            if (command.trim().startsWith('sudo ')) {
                console.log(`PTY Manager: Sudo command detected, not using PTY - let password system handle it`);
                // Non eseguire il comando qui, lascia che il sistema di gestione password lo gestisca
                resolve({
                    success: false,
                    output: `[TermInA] Sudo command detected: "${command}"\n\n🔐 Password required for: ${command}\n🔄 Executing sudo command...\n\nThe system will now prompt for your password securely.`,
                    exitCode: 1,
                    error: 'Password required - use password dialog',
                    stderr: 'Sudo command requires password dialog',
                    requiresPassword: true,
                    usePasswordDialog: true
                });
                return;
            }

            // Se è un comando privilegiato e node-pty è disponibile, usalo
            if (this.isPrivilegedCommand(command) && nodePty) {
                console.log(`PTY Manager: Using node-pty for privileged command: ${command}`);
                this.runPrivilegedCommand(command, options).then(resolve).catch(reject);
                return;
            }
            
            // Determina la shell e gli argomenti
            const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'zsh');
            const args = ['-c', command];
            
            // Configurazione ambiente per comandi interattivi
            const env = {
                ...process.env,
                TERM: 'xterm-256color',
                COLORTERM: 'truecolor',
                FORCE_COLOR: '1',
                TERM_PROGRAM: 'TermInA',
                // Per npm e altri package manager
                npm_config_progress: 'true',
                npm_config_loglevel: 'info',
                // Per evitare problemi con output buffering
                PYTHONUNBUFFERED: '1',
                NODE_NO_READLINE: '1',
                // Configurazioni aggiuntive per impaginazione corretta
                COLUMNS: '80',
                LINES: '24',
                // Assicura che le applicazioni interattive funzionino correttamente
                LC_ALL: 'en_US.UTF-8',
                LANG: 'en_US.UTF-8'
            };

            // Configurazioni specifiche per comandi interattivi
            if (this.isInteractiveCommand(command)) {
                env.TERM = 'xterm-256color';
                env.COLORTERM = 'truecolor';
                env.FORCE_COLOR = '1';
                // Rimuovi variabili che potrebbero interferire con l'interattività
                delete env.CI;
                delete env.NONINTERACTIVE;
                delete env.DEBIAN_FRONTEND;
            }
            
            // Crea un processo dedicato per il comando
            const childProcess = spawn(shell, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: env,
                cwd: options.cwd || require('os').homedir(),
                detached: false
            });
            
            let output = '';
            let errorOutput = '';
            let hasStarted = false;
            let commandCompleted = false;
            
            const timeout = options.timeout || 300000; // 5 minuti di default
            
            // Timer di timeout
            const timeoutTimer = setTimeout(() => {
                if (!commandCompleted) {
                    childProcess.kill('SIGTERM');
                    reject(new Error(`Command timed out after ${timeout}ms. Output received: ${output.substring(0, 1000)}...`));
                }
            }, timeout);

            // Handler per stdout
            childProcess.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                hasStarted = true;
                
                // Debug: log dell'output per comandi npm install
                if (command.includes('npm install') || command.includes('yarn install')) {
                    console.log(`Command Output (${command}):`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
                }
            });

            // Handler per stderr
            childProcess.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                hasStarted = true;
                
                // Debug: log dell'output per comandi npm install
                if (command.includes('npm install') || command.includes('yarn install')) {
                    console.log(`Command Error (${command}):`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
                }
            });

            // Handler per la chiusura
            childProcess.on('close', (exitCode, signal) => {
                if (!commandCompleted) {
                    commandCompleted = true;
                    clearTimeout(timeoutTimer);
                    
                    // Debug: log dell'uscita per comandi npm install
                    if (command.includes('npm install') || command.includes('yarn install')) {
                        console.log(`Command Exit (${command}): exitCode=${exitCode}, signal=${signal}, outputLength=${output.length}`);
                    }
                    
                    const cleanOutput = this.cleanCommandOutput(output, command);
                    
                    // Gestione specifica degli errori
                    let errorMessage = '';
                    if (signal) {
                        errorMessage = `Process terminated by signal: ${signal}`;
                    } else if (exitCode !== 0) {
                        errorMessage = `Process exited with code: ${exitCode}`;
                    }
                    
                    resolve({
                        success: exitCode === 0 && !signal,
                        output: cleanOutput,
                        exitCode: exitCode || 0,
                        signal,
                        error: errorMessage,
                        stderr: errorOutput
                    });
                }
            });

            // Handler per errori
            childProcess.on('error', (error) => {
                if (!commandCompleted) {
                    commandCompleted = true;
                    clearTimeout(timeoutTimer);
                    
                    console.error(`Command error (${command}):`, error);
                    
                    resolve({
                        success: false,
                        output: output,
                        exitCode: 1,
                        error: error.message,
                        stderr: errorOutput
                    });
                }
            });
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
        const promptPatterns = [
            /\$\s*$/,           // Prompt bash/zsh standard
            /%\s*$/,            // Prompt zsh
            />\s*$/,            // Prompt PowerShell/Windows
            /\#\s*$/,           // Prompt root
            /❯\s*$/,            // Prompt zsh moderno
            /➜\s+.*\s+$/,       // Prompt oh-my-zsh
            /~.*\s+.*\s+.*\s*$/, // Prompt zsh con path e tempo
            /.*\s+.*\s+.*\s*$/,  // Prompt generico con caratteri speciali
            /\n.*\s+.*\s+.*\s*$/m // Prompt su nuova linea
        ];
        
        return promptPatterns.some(pattern => pattern.test(data));
    }

    // Pulisce l'output dal comando e dal prompt
    cleanCommandOutput(output, command) {
        let lines = output.split('\n');
        
        // Rimuovi le linee che contengono il comando originale (ma non per comandi npm/yarn)
        if (!command.includes('npm') && !command.includes('yarn') && !command.includes('pip')) {
            lines = lines.filter(line => !line.includes(command));
        }
        
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
        
        const result = lines.join('\n');
        
        // Debug: log del risultato pulito per comandi npm install
        if (command.includes('npm install') || command.includes('yarn install')) {
            console.log(`Cleaned output (${command}):`, result.substring(0, 500) + (result.length > 500 ? '...' : ''));
        }
        
        return result;
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
                    type: session.type,
                    currentCommand: session.currentCommand,
                    isExecuting: session.isExecuting
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

    // Verifica se un comando è interattivo
    isInteractiveCommand(command) {
        const interactiveCommands = [
            'top', 'htop', 'btop', 'btop++',
            'vim', 'vi', 'nano', 'emacs',
            'less', 'more', 'man',
            'ssh', 'telnet', 'ftp',
            'mysql', 'psql', 'sqlite3',
            'python', 'python3', 'node', 'ruby', 'perl',
            'irb', 'pry', 'rails console',
            'ipython', 'jupyter console',
            'gdb', 'lldb',
            'screen', 'tmux',
            'watch', 'tail -f', 'journalctl -f'
        ];
        
        return interactiveCommands.some(cmd => {
            return command.startsWith(cmd) || command.includes(cmd + ' ');
        });
    }

    // Verifica se un comando richiede privilegi elevati
    isPrivilegedCommand(command) {
        const privilegedCommands = [
            'sudo', 'su', 'pkexec', 'gksudo', 'kdesudo',
            'yay', 'pacman', 'apt', 'apt-get', 'dnf', 'yum', 'zypper',
            'systemctl', 'service', 'mount', 'umount',
            'chmod', 'chown', 'useradd', 'userdel', 'groupadd', 'groupdel',
            'visudo', 'passwd', 'usermod', 'groupmod',
            'iptables', 'ufw', 'firewall-cmd',
            'crontab', 'at', 'systemctl', 'service',
            'npm install -g', 'pip install --user', 'gem install',
            'docker', 'docker-compose'
        ];
        
        return privilegedCommands.some(cmd => {
            return command.startsWith(cmd) || command.includes(cmd + ' ');
        });
    }

    // Verifica se un comando richiede input interattivo
    isInteractiveOnlyCommand(command) {
        const interactiveOnlyCommands = [
            'yay', 'pacman', 'apt', 'apt-get', 'dnf', 'yum', 'zypper',
            'python', 'python3', 'node', 'ruby', 'perl', 'irb', 'pry',
            'mysql', 'psql', 'sqlite3', 'ssh', 'telnet', 'ftp'
        ];
        
        // Se il comando è esattamente uno di questi (senza argomenti), richiede input interattivo
        return interactiveOnlyCommands.some(cmd => {
            return command.trim() === cmd;
        });
    }

    // Esegue comandi privilegiati usando node-pty per gestire l'input della password
    async runPrivilegedCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            console.log(`PTY Manager: Running privileged command with node-pty: ${command}`);
            
            const env = {
                ...process.env,
                TERM: 'xterm-256color',
                COLORTERM: 'truecolor',
                FORCE_COLOR: '1',
                TERM_PROGRAM: 'TermInA',
                // Per evitare problemi con output buffering
                PYTHONUNBUFFERED: '1',
                NODE_NO_READLINE: '1',
                // Configurazioni aggiuntive per impaginazione corretta
                COLUMNS: '80',
                LINES: '24',
                // Assicura che le applicazioni interattive funzionino correttamente
                LC_ALL: 'en_US.UTF-8',
                LANG: 'en_US.UTF-8'
            };

            const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'zsh');
            
            // Crea un PTY temporaneo che esegue il comando e si chiude
            const ptyProcess = nodePty.spawn(shell, ['-c', command], {
                name: 'xterm-256color',
                cols: 80,
                rows: 24,
                cwd: options.cwd || os.homedir(),
                env
            });

            let output = '';
            let errorOutput = '';
            let commandCompleted = false;
            let hasPasswordPrompt = false;

            const timeout = options.timeout || 300000; // 5 minuti di default
            
            // Timer di timeout
            const timeoutTimer = setTimeout(() => {
                if (!commandCompleted) {
                    ptyProcess.kill('SIGTERM');
                    reject(new Error(`Privileged command timed out after ${timeout}ms. Output received: ${output.substring(0, 1000)}...`));
                }
            }, timeout);

            // Gestisci l'output del PTY
            ptyProcess.onData((data) => {
                if (commandCompleted) return; // Ignora output se il comando è già completato
                
                const text = data.toString();
                output += text;
                
                console.log(`PTY privileged command output:`, text.substring(0, 100) + (text.length > 100 ? '...' : ''));
                
                // Controlla se è richiesta una password
                if (this.isPasswordPrompt(text)) {
                    hasPasswordPrompt = true;
                    console.log('PTY Manager: Password prompt detected for privileged command');
                    
                    // Per comandi sudo, usa il sistema di gestione password esistente
                    if (command.startsWith('sudo ')) {
                        console.log('PTY Manager: Sudo command detected, using password dialog system');
                        
                        // Termina il processo corrente
                        ptyProcess.kill('SIGTERM');
                        
                        // Usa il sistema di gestione password esistente
                        const errorMsg = `[TermInA] Sudo command detected: "${command}"

🔐 To execute sudo commands with password prompt, the command will be processed through the secure password dialog.

🔄 If you see issues with interactive scripts (like Homebrew installer), try:
   - For Homebrew: Run without sudo: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   - For package managers: Use user-space alternatives when possible
   - For system changes: Ensure the command actually needs root privileges

💡 The system will now prompt for your password securely.`;
                        errorOutput = errorMsg;
                        output += errorMsg;
                        
                        clearTimeout(timeoutTimer);
                        commandCompleted = true;
                        
                        resolve({
                            success: false,
                            output: output,
                            exitCode: 1,
                            error: 'Password required - use password dialog',
                            stderr: errorOutput,
                            requiresPassword: true,
                            usePasswordDialog: true
                        });
                        return;
                    } else {
                        // Per altri comandi che richiedono password
                        const errorMsg = `[Error] Command requires password input. Please run this command in a regular terminal with sudo privileges.\nCommand: ${command}`;
                        errorOutput = errorMsg;
                        output += errorMsg;
                        
                        clearTimeout(timeoutTimer);
                        commandCompleted = true;
                        ptyProcess.kill('SIGTERM');
                        
                        resolve({
                            success: false,
                            output: output,
                            exitCode: 1,
                            error: 'Password required',
                            stderr: errorOutput,
                            requiresPassword: true
                        });
                        return;
                    }
                }
            });

            // Gestisci l'uscita del processo
            ptyProcess.onExit(({ exitCode, signal }) => {
                if (!commandCompleted) {
                    commandCompleted = true;
                    clearTimeout(timeoutTimer);
                    
                    console.log(`PTY Manager: Privileged command exited with code: ${exitCode}, signal: ${signal}`);
                    
                    const cleanOutput = this.cleanCommandOutput(output, command);
                    
                    let errorMessage = '';
                    if (signal) {
                        errorMessage = `Process terminated by signal: ${signal}`;
                    } else if (exitCode !== 0) {
                        errorMessage = `Process exited with code: ${exitCode}`;
                    }
                    
                    resolve({
                        success: exitCode === 0 && !signal,
                        output: cleanOutput,
                        exitCode: exitCode || 0,
                        signal,
                        error: errorMessage,
                        stderr: errorOutput,
                        requiresPassword: hasPasswordPrompt
                    });
                }
            });
        });
    }

    getStatus() {
        return {
            available: this.isAvailable,
            usingPty: false,
            activeSessions: this.sessions.size,
            type: 'enhanced'
        };
    }
}

module.exports = new PTYManager();