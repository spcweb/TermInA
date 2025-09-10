//! TermInA Rust Terminal
//! 
//! Questo modulo implementa un terminale che usa il sistema Rust
//! per una gestione più robusta dei comandi e del supporto sudo.

class RustTerminal {
    constructor(terminalInstance) {
        console.log('RustTerminal: Constructor called');
        this.terminal = terminalInstance;
        this.sessionId = null;
        this.isActive = false;
        this.outputBuffer = '';
        this.lastOutputIndex = 0;
        this.lastOutputTimestamp = 0;
        this.dataHandler = null;
        this.exitHandler = null;
        this.updateInterval = null;
        this.currentCommand = '';
        this.isExecuting = false;
        console.log('RustTerminal: Constructor completed');
    }

    async startSession() {
        try {
            if (this.sessionId) {
                await this.stopSession();
            }

            console.log('Rust Terminal starting new session...');
            const result = await window.__TAURI__.rustTerminalCreateSession();
            console.log('Rust Terminal create session result:', result);
            if (result.success) {
                this.sessionId = result.sessionId;
                this.isActive = true;
                this.startDataPolling();
                console.log(`Rust Terminal session started: ${this.sessionId}, isActive: ${this.isActive}`);
                return true;
            } else {
                console.error('Failed to create Rust Terminal session:', result.error);
                return false;
            }
        } catch (error) {
            console.error('Error starting Rust Terminal session:', error);
            return false;
        }
    }

    async stopSession() {
        try {
            if (this.sessionId && this.isActive) {
                console.log(`Rust Terminal stopping session ${this.sessionId}`);
                await window.__TAURI__.rustTerminalKill(this.sessionId);
                this.stopDataPolling();
                this.isActive = false;
                this.sessionId = null;
                console.log('Rust Terminal session stopped');
            }
        } catch (error) {
            console.error('Error stopping Rust Terminal session:', error);
        }
    }

    startDataPolling() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        console.log('RustTerminal: Starting enhanced data polling...');
        // Polling più frequente per output dinamici
        this.updateInterval = setInterval(async () => {
            if (!this.isActive || !this.sessionId) {
                console.log(`Rust Terminal polling: session not active (isActive: ${this.isActive}, sessionId: ${this.sessionId})`);
                return;
            }

            try {
                // Usa l'output immediato per una risposta più veloce
                const result = await window.__TAURI__.rustTerminalGetImmediateOutput(this.sessionId, this.lastOutputTimestamp);
                if (result.success && result.hasNewData && result.output) {
                    const newData = result.output;
                    if (newData.length > 0) {
                        console.log('Rust Terminal polling got new data:', newData.substring(0, 100) + (newData.length > 100 ? '...' : ''));
                        this.outputBuffer += newData;
                        this.lastOutputIndex = this.outputBuffer.length;
                        this.lastOutputTimestamp = result.lastTimestamp;
                        this.handleNewData(newData);
                    }
                } else if (result.success && !result.hasNewData) {
                    // Debug: log quando non ci sono nuovi dati (meno frequente)
                    if (Math.random() < 0.01) { // Solo 1% delle volte
                        console.log('Rust Terminal polling: no new data');
                    }
                } else if (!result.success) {
                    console.log('Rust Terminal polling: result not successful:', result);
                }
            } catch (error) {
                console.error('Error polling Rust Terminal output:', error);
            }
        }, 50); // Poll ogni 50ms per bilanciare performance e responsività
        console.log('RustTerminal: Enhanced data polling started');
    }

    stopDataPolling() {
        if (this.updateInterval) {
            console.log('RustTerminal: Stopping data polling...');
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('RustTerminal: Data polling stopped');
        }
    }

    async closeSession() {
        if (this.sessionId) {
            try {
                console.log(`RustTerminal: Closing session ${this.sessionId}`);
                await window.__TAURI__.rustTerminalClose(this.sessionId);
                this.sessionId = null;
                this.isActive = false;
                console.log('RustTerminal: Session closed');
            } catch (error) {
                console.error('Error closing Rust Terminal session:', error);
            }
        }
    }

    handleNewData(data) {
        // Debug: log dell'output ricevuto
        console.log('Rust Terminal received data:', data.substring(0, 200) + (data.length > 200 ? '...' : ''));
        
        // Processa l'output del terminale
        const lines = data.split('\n');
        
        // Controlla se è richiesta una password
        if (this.isPasswordPrompt(data)) {
            this.terminal.showPasswordPrompt(data);
            return;
        }
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Se è l'ultima linea e non termina con \n, potrebbe essere incompleta
            if (i === lines.length - 1 && !data.endsWith('\n') && line.length > 0) {
                // Aggiorna la linea corrente invece di crearne una nuova
                console.log('Rust Terminal updating current line:', line);
                this.terminal.updateCurrentLine(line);
            } else if (line.length > 0 || i < lines.length - 1) {
                // Aggiungi una nuova linea completa
                console.log('Rust Terminal adding output line:', line);
                this.terminal.addOutput(line);
            }
        }

        // Controlla se il comando è completato (presenza di prompt)
        if (this.isPromptVisible(data)) {
            console.log('Rust Terminal command completed, prompt detected');
            this.onCommandComplete();
        }
        
        // Forza l'aggiornamento del display per output dinamici
        this.terminal.forceDisplayUpdate();
    }

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

    isPromptVisible(data) {
        // Pattern comuni per i prompt della shell
        const promptPatterns = [
            /\$\s*$/m,           // Prompt bash/zsh standard
            /%\s*$/m,            // Prompt zsh
            />\s*$/m,            // Prompt PowerShell/Windows
            /\#\s*$/m,           // Prompt root
            /❯\s*$/m,            // Prompt zsh moderno
            /➜\s+.*\s+$/m,       // Prompt oh-my-zsh
            /\n\$\s*$/m,         // Prompt con newline (nostro formato)
            /\$\s*$/m            // Prompt con spazio dopo $ (nostro formato)
        ];
        
        const hasPrompt = promptPatterns.some(pattern => pattern.test(data));
        
        // Debug: log per capire cosa sta succedendo
        if (data.includes('$')) {
            console.log('Rust Terminal isPromptVisible check:', {
                data: data.substring(data.length - 50), // Ultimi 50 caratteri
                hasPrompt: hasPrompt,
                patterns: promptPatterns.map((p, i) => ({ index: i, matches: p.test(data) }))
            });
        }
        
        return hasPrompt;
    }

    onCommandComplete() {
        this.currentCommand = '';
        this.isExecuting = false;
        
        // Chiudi la sessione e ferma il polling
        this.stopDataPolling();
        this.closeSession();
        
        this.terminal.onRustTerminalCommandComplete();
    }

    async sendCommand(command) {
        if (!this.isActive || !this.sessionId) {
            console.error('Rust Terminal session not active');
            return false;
        }

        try {
            this.currentCommand = command;
            this.isExecuting = true;
            console.log(`Rust Terminal sending command: ${command}`);
            const result = await window.__TAURI__.rustTerminalWrite(this.sessionId, command + '\n');
            console.log(`Rust Terminal command send result:`, result);
            return result.success;
        } catch (error) {
            console.error('Error sending command to Rust Terminal:', error);
            return false;
        }
    }

    async sendInput(input) {
        if (!this.isActive || !this.sessionId) {
            return false;
        }

        try {
            const result = await window.__TAURI__.rustTerminalWrite(this.sessionId, input);
            return result.success;
        } catch (error) {
            console.error('Error sending input to Rust Terminal:', error);
            return false;
        }
    }

    async sendInterrupt() {
        // Invia Ctrl+C
        return await this.sendInput('\x03');
    }

    async sendEOF() {
        // Invia Ctrl+D
        return await this.sendInput('\x04');
    }

    async sendKill() {
        // Invia Ctrl+Z (sospende il processo)
        return await this.sendInput('\x1a');
    }

    async sendQuit() {
        // Invia Ctrl+\ (termina il processo)
        return await this.sendInput('\x1c');
    }

    async sendBackspace() {
        // Invia backspace
        return await this.sendInput('\x08');
    }

    async sendTab() {
        // Invia tab per autocompletamento
        return await this.sendInput('\x09');
    }

    async sendEnter() {
        // Invia enter
        return await this.sendInput('\r');
    }

    async sendEscape() {
        // Invia escape
        return await this.sendInput('\x1b');
    }

    async clear() {
        if (!this.isActive || !this.sessionId) {
            return false;
        }

        try {
            const result = await window.__TAURI__.rustTerminalClear(this.sessionId);
            if (result.success) {
                this.outputBuffer = '';
                this.lastOutputIndex = 0;
                this.terminal.clearTerminal();
            }
            return result.success;
        } catch (error) {
            console.error('Error clearing Rust Terminal:', error);
            return false;
        }
    }

    async resize(cols, rows) {
        if (!this.isActive || !this.sessionId) {
            return false;
        }

        try {
            const result = await window.__TAURI__.rustTerminalResize(this.sessionId, cols, rows);
            return result.success;
        } catch (error) {
            console.error('Error resizing Rust Terminal:', error);
            return false;
        }
    }

    async executeSudoCommand(command, password) {
        if (!this.isActive || !this.sessionId) {
            console.error('Rust Terminal session not active');
            return false;
        }

        try {
            console.log(`Rust Terminal executing sudo command: ${command}`);
            const result = await window.__TAURI__.rustTerminalRunSudoCommand(this.sessionId, command, password);
            console.log(`Rust Terminal sudo command result:`, result);
            return result;
        } catch (error) {
            console.error('Error executing sudo command in Rust Terminal:', error);
            return { success: false, error: error.message };
        }
    }

    getStatus() {
        return {
            isActive: this.isActive,
            sessionId: this.sessionId,
            currentCommand: this.currentCommand,
            isExecuting: this.isExecuting,
            bufferSize: this.outputBuffer.length,
            type: 'rust'
        };
    }
}

// Rendi disponibile globalmente
window.RustTerminal = RustTerminal;
