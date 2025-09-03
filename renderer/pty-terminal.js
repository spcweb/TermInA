class PTYTerminal {
    constructor(terminalInstance) {
        this.terminal = terminalInstance;
        this.sessionId = null;
        this.isActive = false;
        this.outputBuffer = '';
        this.lastOutputIndex = 0;
        this.dataHandler = null;
        this.exitHandler = null;
        this.updateInterval = null;
        this.currentCommand = '';
    }

    async startSession() {
        try {
            if (this.sessionId) {
                await this.stopSession();
            }

            const result = await window.electronAPI.ptyCreateSession();
            if (result.success) {
                this.sessionId = result.sessionId;
                this.isActive = true;
                this.startDataPolling();
                console.log(`PTY session started: ${this.sessionId}`);
                return true;
            } else {
                console.error('Failed to create PTY session:', result.error);
                return false;
            }
        } catch (error) {
            console.error('Error starting PTY session:', error);
            return false;
        }
    }

    async stopSession() {
        try {
            if (this.sessionId && this.isActive) {
                await window.electronAPI.ptyKill(this.sessionId);
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

        this.updateInterval = setInterval(async () => {
            if (!this.isActive || !this.sessionId) return;

            try {
                const result = await window.electronAPI.ptyGetOutput(this.sessionId, this.lastOutputIndex);
                if (result.success && result.output) {
                    const newData = result.output;
                    if (newData.length > 0) {
                        this.outputBuffer += newData;
                        this.lastOutputIndex = this.outputBuffer.length;
                        this.handleNewData(newData);
                    }
                }
            } catch (error) {
                console.error('Error polling PTY output:', error);
            }
        }, 100); // Poll ogni 100ms per responsività
    }

    stopDataPolling() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    handleNewData(data) {
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
                this.terminal.updateCurrentLine(line);
            } else if (line.length > 0 || i < lines.length - 1) {
                // Aggiungi una nuova linea completa
                this.terminal.addOutput(line);
            }
        }

        // Controlla se il comando è completato (presenza di prompt)
        if (this.isPromptVisible(data)) {
            this.onCommandComplete();
        }
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
            /➜\s+.*\s+$/m        // Prompt oh-my-zsh
        ];
        
        return promptPatterns.some(pattern => pattern.test(data));
    }

    onCommandComplete() {
        this.currentCommand = '';
        this.terminal.onPTYCommandComplete();
    }

    async sendCommand(command) {
        if (!this.isActive || !this.sessionId) {
            console.error('PTY session not active');
            return false;
        }

        try {
            this.currentCommand = command;
            const result = await window.electronAPI.ptyWrite(this.sessionId, command + '\r');
            return result.success;
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
            const result = await window.electronAPI.ptyWrite(this.sessionId, input);
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

    async clear() {
        if (!this.isActive || !this.sessionId) {
            return false;
        }

        try {
            const result = await window.electronAPI.ptyClear(this.sessionId);
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
            const result = await window.electronAPI.ptyResize(this.sessionId, cols, rows);
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
            bufferSize: this.outputBuffer.length
        };
    }
}

// Rendi disponibile globalmente
window.PTYTerminal = PTYTerminal;
