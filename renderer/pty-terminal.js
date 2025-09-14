class PTYTerminal {
    constructor(terminalInstance) {
        console.log('PTYTerminal: Constructor called');
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
        console.log('PTYTerminal: Constructor completed');
    }

    async startSession() {
        try {
            if (this.sessionId) {
                await this.stopSession();
            }

            console.log('PTY starting new session...');
            if (!window.__TAURI__ || !window.__TAURI__.invoke) {
                throw new Error('Tauri API not available');
            }
            const sessionId = await window.__TAURI__.invoke('pty_create_session');
            this.sessionId = sessionId;
            this.isActive = true;
            this.startDataPolling();
            console.log(`PTY session started: ${this.sessionId}, isActive: ${this.isActive}`);
            return true;
        } catch (error) {
            console.error('Error starting PTY session:', error);
            return false;
        }
    }

    async stopSession() {
        try {
            if (this.sessionId && this.isActive) {
                console.log(`PTY stopping session ${this.sessionId}`);
                // Use pty_close to gracefully close the session
                await window.__TAURI__.invoke('pty_close', { session_id: this.sessionId });
                this.stopDataPolling();
                this.isActive = false;
                this.sessionId = null;
                console.log('PTY session stopped');
            }
        } catch (error) {
            console.error('Error stopping PTY session:', error);
        }
    }

    startDataPolling() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        console.log('PTYTerminal: Starting enhanced data polling...');
        // Polling più frequente per output dinamici come npm install
        this.updateInterval = setInterval(async () => {
            if (!this.isActive || !this.sessionId) {
                console.log(`PTY polling: session not active (isActive: ${this.isActive}, sessionId: ${this.sessionId})`);
                return;
            }

            try {
                // Usa l'output immediato per una risposta più veloce
                const result = await window.__TAURI__.invoke('pty_get_immediate_output', { session_id: this.sessionId, timestamp: this.lastOutputTimestamp });
                if (result.success && result.hasNewData && result.output) {
                    const newData = result.output;
                    if (newData.length > 0) {
                        console.log('PTY polling got new data:', newData.substring(0, 100) + (newData.length > 100 ? '...' : ''));
                        this.outputBuffer += newData;
                        this.lastOutputIndex = this.outputBuffer.length;
                        this.lastOutputTimestamp = result.lastTimestamp;
                        this.handleNewData(newData);
                    }
                } else if (result.success && !result.hasNewData) {
                    // Debug: log quando non ci sono nuovi dati (meno frequente)
                    if (Math.random() < 0.01) { // Solo 1% delle volte
                        console.log('PTY polling: no new data');
                    }
                } else if (!result.success) {
                    console.log('PTY polling: result not successful:', result);
                }
            } catch (error) {
                console.error('Error polling PTY output:', error);
            }
        }, 50); // Poll ogni 50ms per bilanciare performance e responsività
        console.log('PTYTerminal: Enhanced data polling started');
    }

    stopDataPolling() {
        if (this.updateInterval) {
            console.log('PTYTerminal: Stopping data polling...');
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('PTYTerminal: Data polling stopped');
        }
    }

    async closeSession() {
        if (this.sessionId) {
            try {
                console.log(`PTYTerminal: Closing session ${this.sessionId}`);
                await window.__TAURI__.invoke('pty_close', { session_id: this.sessionId });
                this.sessionId = null;
                this.isActive = false;
                console.log('PTYTerminal: Session closed');
            } catch (error) {
                console.error('Error closing PTY session:', error);
            }
        }
    }

    handleNewData(data) {
        // Debug: log dell'output ricevuto
        console.log('PTY received data:', data.substring(0, 200) + (data.length > 200 ? '...' : ''));
        
        // Processa l'output del PTY
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
                console.log('PTY updating current line:', line);
                this.terminal.updateCurrentLine(line);
            } else if (line.length > 0 || i < lines.length - 1) {
                // Aggiungi una nuova linea completa
                console.log('PTY adding output line:', line);
                this.terminal.addOutput(line);
            }
        }

        // Controlla se il comando è completato (presenza di prompt)
        if (this.isPromptVisible(data)) {
            console.log('PTY command completed, prompt detected');
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
            console.log('PTY isPromptVisible check:', {
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
        // Do not stop polling or close the PTY automatically; keep interactive session alive
        this.terminal.onPTYCommandComplete();
    }

    async sendCommand(command) {
        if (!this.isActive || !this.sessionId) {
            console.error('PTY session not active');
            return false;
        }

        try {
            this.currentCommand = command;
            this.isExecuting = true;
            console.log(`PTY sending command: ${command}`);
            await window.__TAURI__.invoke('pty_write', { session_id: this.sessionId, input: command + '\n' });
            return true;
        } catch (error) {
            console.error('Error sending command to PTY:', error);
            return false;
        }
    }

    async sendInput(input) {
        if (!this.isActive || !this.sessionId) {
            return false;
        }

        try {
            const result = await window.__TAURI__.invoke('pty_write', { session_id: this.sessionId, input: input });
            return result.success;
        } catch (error) {
            console.error('Error sending input to PTY:', error);
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
            const result = await window.__TAURI__.invoke('pty_clear', { session_id: this.sessionId });
            if (result.success) {
                this.outputBuffer = '';
                this.lastOutputIndex = 0;
                this.terminal.clearTerminal();
            }
            return result.success;
        } catch (error) {
            console.error('Error clearing PTY:', error);
            return false;
        }
    }

    async resize(cols, rows) {
        if (!this.isActive || !this.sessionId) {
            return false;
        }

        try {
            const result = await window.__TAURI__.invoke('pty_resize', { session_id: this.sessionId, cols: cols, rows: rows });
            return result.success;
        } catch (error) {
            console.error('Error resizing PTY:', error);
            return false;
        }
    }

    getStatus() {
        return {
            isActive: this.isActive,
            sessionId: this.sessionId,
            currentCommand: this.currentCommand,
            isExecuting: this.isExecuting,
            bufferSize: this.outputBuffer.length
        };
    }
}

// Rendi disponibile globalmente
window.PTYTerminal = PTYTerminal;
