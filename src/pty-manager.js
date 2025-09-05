const { spawn } = require('child_process');
let nodePty = null;
try {
    // Optional: real PTY if available
    nodePty = require('node-pty');
} catch (err) {
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
        
        console.log('PTY Manager: Using enhanced child_process implementation');
    }

    createSession(sessionId = null) {
        const id = sessionId || this.nextSessionId++;
        return this.createEnhancedSession(id);
    }

    createInteractiveSession(cwd) {
        const id = this.nextSessionId++;
        if (!nodePty) {
            console.log('PTY Manager: node-pty not available, falling back to enhanced session');
            return this.createEnhancedSession(id);
        }
        console.log(`PTY Manager creating node-pty session ${id}`);
        const env = {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            FORCE_COLOR: '1',
            TERM_PROGRAM: 'TermInA'
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
            console.log(`PTY Manager: node-pty session ${id} exited: code=${exitCode}, signal=${signal}`);
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
        console.log(`PTY Manager creating enhanced session ${id}`);
        
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
            console.log(`PTY Manager writing to session ${sessionId}:`, data.substring(0, 100) + (data.length > 100 ? '...' : ''));
            
            // Se è un comando completo, eseguilo direttamente
            if (data.includes('\r') || data.includes('\n')) {
                const command = data.replace(/[\r\n]/g, '').trim();
                console.log(`PTY Manager: Detected complete command: "${command}"`);
                if (command) {
                    session.commandHistory.push(command);
                    session.currentCommand = command;
                    session.isExecuting = true;
                    
                    console.log(`PTY Manager: Starting execution of command: "${command}"`);
                    
                    // Per comandi interattivi, usa un approccio diverso
                    if (this.isInteractiveCommand(command)) {
                        this.runInteractiveCommand(session, command);
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
                    console.log(`PTY Manager: Sending input to PTY for session ${sessionId}: "${data}"`);
                    session.process.write(data);
                } else if (session.process && session.process.stdin) {
                    // child_process style
                    console.log(`PTY Manager: Sending input to process for session ${sessionId}: "${data}"`);
                    session.process.stdin.write(data);
                } else {
                    // Per ora, semplicemente aggiorniamo l'attività
                    session.lastActivity = Date.now();
                    console.log(`PTY Manager: Received normal input for session ${sessionId}: "${data}"`);
                }
            }
            
            session.lastActivity = Date.now();
            return true;
        }
        console.log(`PTY Manager: session ${sessionId} not found or inactive`);
        return false;
    }

    runInteractiveCommand(session, command) {
        console.log(`PTY Manager: Running interactive command: ${command}`);
        
        // Ambiente comune
        const env = {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            FORCE_COLOR: '1',
            TERM_PROGRAM: 'TermInA',
            PYTHONUNBUFFERED: '1',
            NODE_NO_READLINE: '1'
        };
        
        let childProcess;
        
        // Se node-pty è disponibile, preferiscilo
        if (nodePty) {
            const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'zsh');
            const pty = nodePty.spawn(shell, ['-l'], {
                name: 'xterm-256color', cols: 80, rows: 24,
                cwd: os.homedir(), env
            });
            // Adatta l'API per il resto del codice
            childProcess = {
                write: (data) => pty.write(data),
                kill: (sig) => pty.kill(sig || 'SIGTERM'),
                on: (evt, cb) => {
                    if (evt === 'exit') pty.onExit(({ exitCode, signal }) => cb(exitCode, signal));
                },
                stdout: { on: (evt, cb) => { if (evt === 'data') pty.onData(cb); } },
                stderr: { on: () => {} }
            };
            // Esegui il comando nella shell PTY
            pty.write(command + '\r');
        } else if (os.platform() === 'darwin' && (command === 'top' || command.startsWith('top '))) {
            // macOS: usa top in modalità batch per stream continuo senza TTY
            const args = ['-l', '0', '-s', '1'];
            console.log(`PTY Manager: Spawning darwin top ${args.join(' ')}`);
            childProcess = spawn('/usr/bin/top', args, { stdio: ['ignore', 'pipe', 'pipe'], env, cwd: os.homedir(), detached: false });
        } else if (os.platform() === 'linux' && (command === 'top' || command.startsWith('top '))) {
            // Linux: top batch mode
            const args = ['-b', '-d', '1'];
            console.log(`PTY Manager: Spawning linux top ${args.join(' ')}`);
            childProcess = spawn('top', args, { stdio: ['ignore', 'pipe', 'pipe'], env, cwd: os.homedir(), detached: false });
        } else {
            // Fallback: shell con pipe (non interattivo vero, ma funziona per molti comandi)
            const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'zsh');
            const args = ['-c', command];
            console.log(`PTY Manager: Spawning shell fallback: ${shell} ${args.join(' ')}`);
            childProcess = spawn(shell, args, { stdio: ['pipe', 'pipe', 'pipe'], env, cwd: os.homedir(), detached: false });
        }
        
        // Salva il processo nella sessione
        session.process = childProcess;
        session.isExecuting = true;
        
        // Gestisci l'output in tempo reale
        childProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`PTY Manager: Interactive command output:`, output.substring(0, 100) + (output.length > 100 ? '...' : ''));
            
            session.buffer += output;
            const timestamp = Date.now();
            session.outputBuffer.push({
                data: output,
                timestamp: timestamp,
                source: 'stdout'
            });
            session.lastOutputTimestamp = timestamp;
            
            if (session.onData) {
                session.onData(output);
            }
        });
        
        childProcess.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            console.log(`PTY Manager: Interactive command error:`, errorOutput.substring(0, 100) + (errorOutput.length > 100 ? '...' : ''));
            
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
            console.log(`PTY Manager: Interactive command exited with code: ${code}`);
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
                    session.process.resize(Math.max(1, cols | 0), Math.max(1, rows | 0));
                    session.lastActivity = Date.now();
                    return true;
                } catch (err) {
                    console.warn(`PTY Manager: resize failed for session ${sessionId}:`, err.message);
                    return false;
                }
            }
            // Nel fallback non possiamo ridimensionare, ma torniamo true comunque
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
            return session.outputBuffer
                .filter(item => item.timestamp > fromTimestamp)
                .map(item => item.data)
                .join('');
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
                NODE_NO_READLINE: '1'
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
            /➜\s+.*\s+$/        // Prompt oh-my-zsh
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