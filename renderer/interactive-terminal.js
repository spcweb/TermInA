// Interactive Terminal Manager
class InteractiveTerminal {
    constructor() {
        this.overlay = document.getElementById('interactive-terminal-overlay');
        this.container = document.getElementById('interactive-terminal-container');
        this.terminalElement = document.getElementById('interactive-terminal');
        this.commandNameElement = document.getElementById('interactive-command-name');
        this.closeBtn = document.getElementById('interactive-terminal-close');
        
        this.currentSessionId = null;
        
        this.initializeEventListeners();
        this.initializeIPC();
    }

    initializeEventListeners() {
        // Chiudi terminale interattivo
        this.closeBtn.addEventListener('click', () => {
            this.closeTerminal();
        });

        // Chiudi con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.style.display !== 'none') {
                this.closeTerminal();
            }
        });

        // Chiudi cliccando sull'overlay
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.closeTerminal();
            }
        });
    }

    initializeIPC() {
        // Ascolta per aprire il terminale interattivo
        window.electronAPI.onOpenInteractiveTerminal((data) => {
            this.openTerminal(data.command, data.cwd);
        });
    }

    async openTerminal(command, cwd) {
        try {
            console.log('Opening integrated terminal for command:', command, 'cwd:', cwd);
            
            // Aggiorna il titolo
            this.commandNameElement.textContent = `Terminale Interattivo - ${command}`;
            
            // Mostra l'overlay
            this.overlay.style.display = 'flex';
            console.log('Container shown, setting up terminal...');
            
            // Crea una sessione PTY per il comando interattivo
            const result = await window.electronAPI.createInteractiveSession(command, cwd);
            console.log('Session creation result:', result);
            
            if (!result.success) {
                console.error('Failed to create session:', result.error);
                this.showError(`Failed to create session: ${result.error}`);
                return;
            }
            
            if (result.success) {
                this.currentSessionId = result.sessionId;
                this.setupTerminal();
            } else {
                console.error('Failed to create interactive session:', result.error);
                this.showError('Errore nella creazione della sessione interattiva: ' + result.error);
            }
        } catch (error) {
            console.error('Error opening interactive terminal:', error);
            this.showError('Errore nell\'apertura del terminale interattivo: ' + error.message);
        }
    }

    setupTerminal() {
        console.log('Setting up terminal...');
        
        // Pulisci il terminale
        this.terminalElement.innerHTML = '';
        
        // Verifica che xterm.js sia disponibile
        if (typeof window.Terminal === 'undefined') {
            console.error('xterm.js not available');
            this.showError('xterm.js non è disponibile. Assicurati che sia caricato correttamente.');
            return;
        }
        
        console.log('xterm.js is available, creating terminal...');
        
        // Crea un terminale xterm.js
        const Terminal = window.Terminal;
        
        this.terminal = new Terminal({
            theme: {
                background: '#1e1e1e',
                foreground: '#ffffff',
                cursor: '#007acc',
                selection: 'rgba(0, 212, 170, 0.3)',
                black: '#000000',
                red: '#ff5555',
                green: '#50fa7b',
                yellow: '#f1fa8c',
                blue: '#bd93f9',
                magenta: '#ff79c6',
                cyan: '#8be9fd',
                white: '#f8f8f2',
                brightBlack: '#6272a4',
                brightRed: '#ff6e6e',
                brightGreen: '#69ff94',
                brightYellow: '#ffffa5',
                brightBlue: '#d6acff',
                brightMagenta: '#ff92df',
                brightCyan: '#a4ffff',
                brightWhite: '#ffffff'
            },
            fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
            fontSize: 14,
            lineHeight: 1.4,
            cursorBlink: true,
            cursorStyle: 'block',
            scrollback: 1000,
            tabStopWidth: 4
        });

        // Carica FitAddon ora che sappiamo che è disponibile
        console.log('Checking FitAddon availability...');
        console.log('window.FitAddon:', window.FitAddon);
        console.log('typeof window.FitAddon:', typeof window.FitAddon);
        
        // FitAddon è disponibile come oggetto con proprietà FitAddon
        if (window.FitAddon && window.FitAddon.FitAddon && typeof window.FitAddon.FitAddon === 'function') {
            try {
                this.fitAddon = new window.FitAddon.FitAddon();
                this.terminal.loadAddon(this.fitAddon);
                console.log('FitAddon loaded successfully');
            } catch (error) {
                console.warn('Failed to load FitAddon:', error);
                this.fitAddon = null;
            }
        } else if (window.FitAddon && typeof window.FitAddon === 'function') {
            try {
                this.fitAddon = new window.FitAddon();
                this.terminal.loadAddon(this.fitAddon);
                console.log('FitAddon loaded successfully (direct)');
            } catch (error) {
                console.warn('Failed to load FitAddon (direct):', error);
                this.fitAddon = null;
            }
        } else {
            console.warn('FitAddon not available or not a constructor');
            console.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('fit')));
            this.fitAddon = null;
        }
        
        // Apri il terminale
        this.terminal.open(this.terminalElement);
        console.log('Terminal opened in DOM element');
        
        // Fit solo se disponibile
        if (this.fitAddon) {
            this.fitAddon.fit();
            console.log('FitAddon applied');
            // Riesegui fit su resize della finestra e del container
            const resizeHandler = () => {
                try { this.fitAddon.fit(); } catch (_) {}
            };
            this._resizeHandler = resizeHandler;
            window.addEventListener('resize', resizeHandler);
            const ro = new ResizeObserver(() => resizeHandler());
            this._resizeObserver = ro;
            ro.observe(this.container);
        }
        
        // Gestisci input del terminale
        this.terminal.onData((data) => {
            console.log('Terminal input received:', data);
            if (this.currentSessionId) {
                window.electronAPI.ptyWrite(this.currentSessionId, data);
            }
        });

        // Propaga le dimensioni al backend (se supportato)
        const sendResize = () => {
            if (!this.currentSessionId) return;
            try {
                const cols = this.terminal.cols;
                const rows = this.terminal.rows;
                if (cols && rows) {
                    window.electronAPI.ptyResize(this.currentSessionId, cols, rows);
                }
            } catch (_) {}
        };
        // invia subito dopo l'apertura
        setTimeout(sendResize, 0);
        // anche su resize handler
        if (this._resizeHandler) {
            const prev = this._resizeHandler;
            this._resizeHandler = () => { prev(); sendResize(); };
        }

        // Avvia il polling per l'output
        this.startOutputPolling();
        
        // Focus sul terminale
        this.terminal.focus();
        console.log('Terminal setup complete');
    }

    startOutputPolling() {
        if (!this.currentSessionId) return;
        
        // Aggiungi un messaggio di test per verificare che il terminale funzioni
        console.log('Adding test message to terminal');
        this.terminal.write('Terminale interattivo inizializzato...\r\n');
        this.terminal.write('Avvio del comando...\r\n');
        
        let lastTimestamp = 0;
        let pollCount = 0;
        
        const pollOutput = async () => {
            try {
                pollCount++;
                console.log(`Poll ${pollCount} - Session ID: ${this.currentSessionId}, Last timestamp: ${lastTimestamp}`);
                
                const result = await window.electronAPI.ptyGetImmediateOutput(
                    this.currentSessionId, 
                    lastTimestamp
                );
                
                console.log(`Poll ${pollCount} result:`, result);
                
                if (result.success && result.hasNewData) {
                    console.log('Writing output to terminal:', result.output);
                    this.terminal.write(result.output);
                    lastTimestamp = result.lastTimestamp;
                } else if (result.success && !result.hasNewData) {
                    console.log(`Poll ${pollCount}: No new data available`);
                } else {
                    console.error(`Poll ${pollCount} failed:`, result.error || 'Unknown error');
                }
                
                // Continua il polling finché l'overlay è visibile
                const session = await window.electronAPI.ptyGetSessions();
                console.log('Session status check:', session);
                const overlayVisible = this.overlay && this.overlay.style.display !== 'none';
                const currentSession = (session.success && Array.isArray(session.sessions))
                  ? session.sessions.find(s => s.id === this.currentSessionId)
                  : null;
                console.log('Current session found:', currentSession);
                
                if (overlayVisible) {
                    setTimeout(pollOutput, 100); // continua polling
                } else {
                    console.log('Overlay hidden, stopping polling');
                }
            } catch (error) {
                console.error('Error polling terminal output:', error);
            }
        };
        
        // Inizia il polling
        console.log('Starting output polling for session:', this.currentSessionId);
        setTimeout(pollOutput, 200);
    }

    closeTerminal() {
        // Chiudi la sessione PTY se attiva
        if (this.currentSessionId) {
            window.electronAPI.closeInteractiveSession(this.currentSessionId);
            this.currentSessionId = null;
        }
        
        // Nascondi l'overlay
        this.overlay.style.display = 'none';
        
        // Cleanup resize listeners
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        if (this._resizeObserver) {
            try { this._resizeObserver.disconnect(); } catch (_) {}
            this._resizeObserver = null;
        }

        // Pulisci il terminale
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = null;
        }
    }

    showError(message) {
        this.terminalElement.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #ff5555;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 16px;
                text-align: center;
                padding: 20px;
            ">
                <div>
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <div style="margin-bottom: 16px;">${message}</div>
                    <div style="font-size: 14px; color: #888; margin-bottom: 16px;">
                        Debug info: Controlla la console per maggiori dettagli
                    </div>
                    <button onclick="window.interactiveTerminal.closeTerminal()" style="
                        background: #007acc;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Chiudi</button>
                </div>
            </div>
        `;
    }
}

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.interactiveTerminal = new InteractiveTerminal();
});
