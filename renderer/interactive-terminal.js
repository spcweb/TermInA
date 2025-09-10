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
        // In Tauri v2, gli eventi vengono gestiti diversamente
        // Per ora, rimuoviamo questa funzionalità che non è supportata
        console.log('Interactive terminal IPC initialized (Tauri v2)');
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
            const result = await window.__TAURI__.createInteractiveSession(command, cwd);
            console.log('Session creation result:', result);
            
            if (!result.success) {
                console.error('Failed to create session:', result.error);
                this.showError(`Failed to create session: ${result.error}`);
                return;
            }
            
            if (result.success) {
                this.currentSessionId = result.sessionId;
                
                // Imposta il callback per ricevere dati in tempo reale
                console.log(`DEBUG: Setting up callback for session ${this.currentSessionId}`);
                const callbackResult = await window.__TAURI__.setupSessionCallback(this.currentSessionId);
                console.log('DEBUG: Session callback setup result:', callbackResult);
                
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
            fontFamily: 'SF Mono, Monaco, Menlo, Consolas, Liberation Mono, DejaVu Sans Mono, Courier New, monospace',
            fontSize: 14,
            lineHeight: 1.2,
            cursorBlink: true,
            cursorStyle: 'block',
            scrollback: 1000,
            tabStopWidth: 4,
            // Configurazioni ottimizzate per comandi interattivi
            allowTransparency: false,
            bellStyle: 'none',
            convertEol: false,
            termName: 'xterm-256color',
            screenReaderMode: false,
            // Abilita il supporto completo per le sequenze ANSI
            windowsMode: false,
            // Gestione migliore del flusso di dati
            fastScrollModifier: 'alt',
            fastScrollSensitivity: 5,
            scrollSensitivity: 1,
            // Supporto per applicazioni full-screen
            altClickMovesCursor: true,
            rightClickSelectsWord: true,
            // Migliore supporto per applicazioni interattive come top
            macOptionIsMeta: true,
            macOptionClickForcesSelection: false,
            disableStdin: false,
            // Configurazioni aggiuntive per impaginazione corretta
            cols: 80,
            rows: 24
        });

        // Carica gli addon necessari per xterm.js
        console.log('Loading xterm.js addons...');

        // FitAddon per il ridimensionamento
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
            console.warn('FitAddon not available');
            this.fitAddon = null;
        }

        // WebLinksAddon per gestire i link (opzionale)
        if (window.WebLinksAddon && typeof window.WebLinksAddon === 'function') {
            try {
                this.webLinksAddon = new window.WebLinksAddon.WebLinksAddon();
                this.terminal.loadAddon(this.webLinksAddon);
                console.log('WebLinksAddon loaded successfully');
            } catch (error) {
                console.warn('Failed to load WebLinksAddon:', error);
                this.webLinksAddon = null;
            }
        }

        // SearchAddon per la ricerca (opzionale)
        if (window.SearchAddon && typeof window.SearchAddon === 'function') {
            try {
                this.searchAddon = new window.SearchAddon.SearchAddon();
                this.terminal.loadAddon(this.searchAddon);
                console.log('SearchAddon loaded successfully');
            } catch (error) {
                console.warn('Failed to load SearchAddon:', error);
                this.searchAddon = null;
            }
        }
        
        // Apri il terminale
        this.terminal.open(this.terminalElement);
        console.log('Terminal opened in DOM element');
        
        // Fit solo se disponibile
        if (this.fitAddon) {
            // Applica il fit iniziale con un piccolo delay per assicurarsi che il DOM sia pronto
            setTimeout(() => {
                try {
                    this.fitAddon.fit();
                    console.log('FitAddon applied initially');
                } catch (error) {
                    console.warn('Initial fit failed:', error);
                }
            }, 100);
            
            // Riesegui fit su resize della finestra e del container
            const resizeHandler = () => {
                try { 
                    this.fitAddon.fit();
                    // Invia le nuove dimensioni al backend PTY
                    this.sendResizeToBackend();
                } catch (error) {
                    console.warn('Resize fit failed:', error);
                }
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
                window.__TAURI__.ptyWrite(this.currentSessionId, data);
            }
        });

        // Propaga le dimensioni al backend (se supportato)
        this.sendResizeToBackend = () => {
            if (!this.currentSessionId) return;
            try {
                const cols = this.terminal.cols;
                const rows = this.terminal.rows;
                if (cols && rows) {
                    console.log(`Sending resize to backend: ${cols}x${rows}`);
                    window.__TAURI__.ptyResize(this.currentSessionId, cols, rows);
                }
            } catch (error) {
                console.warn('Failed to send resize to backend:', error);
            }
        };
        
        // Invia le dimensioni iniziali dopo l'apertura
        setTimeout(() => {
            this.sendResizeToBackend();
        }, 200);

        // Imposta il listener per i dati in tempo reale
        this.setupDataListener();
        
        // Focus sul terminale
        this.terminal.focus();
        console.log('Terminal setup complete');
    }

    setupDataListener() {
        if (!this.currentSessionId) return;

        // Messaggio di inizializzazione più pulito
        console.log('Setting up real-time terminal for interactive command');
        this.terminal.write('\x1b[2J\x1b[H'); // Clear screen e posiziona cursore all'inizio

        // Imposta il listener per i dati in tempo reale
        console.log(`DEBUG: Setting up data listener for session ${this.currentSessionId}`);
        window.__TAURI__.onSessionData((data) => {
            console.log(`DEBUG: Received session data event:`, { sessionId: data.sessionId, currentSessionId: this.currentSessionId });
            if (data.sessionId === this.currentSessionId) {
                console.log(`DEBUG: Writing data to terminal for session ${data.sessionId}:`, data.data.substring(0, 200) + (data.data.length > 200 ? '...' : ''));
                
                // Processa le sequenze ANSI per una migliore visualizzazione
                let processedData = data.data;
                
                // Rileva se contiene sequenze di clear screen
                if (/\x1b\[2J/.test(processedData) || /\x1b\[H\x1b\[2J/.test(processedData)) {
                    console.log('DEBUG: Clear screen detected, clearing terminal');
                    this.terminal.clear();
                    // Rimuovi le sequenze di clear screen dal dato da scrivere
                    processedData = processedData.replace(/\x1b\[2J/g, '').replace(/\x1b\[H\x1b\[2J/g, '');
                }
                
                // Per comandi interattivi come top, htop, btop, assicurati che le sequenze ANSI
                // vengano processate correttamente per l'impaginazione
                if (this.isInteractiveOutput(processedData)) {
                    console.log('DEBUG: Interactive output detected, preserving ANSI sequences');
                    // Non modificare l'output per comandi interattivi
                    this.terminal.write(processedData);
                } else {
                    // Per output normale, scrivi direttamente
                    this.terminal.write(processedData);
                }
            } else {
                console.log(`DEBUG: Ignoring data for different session ${data.sessionId}`);
            }
        });

        console.log('DEBUG: Real-time data listener setup completed for session:', this.currentSessionId);
    }

    // Rileva se l'output proviene da un comando interattivo
    isInteractiveOutput(output) {
        // Pattern per identificare output di comandi interattivi
        const interactivePatterns = [
            /\x1b\[2J/,  // Clear screen
            /\x1b\[[0-9;]*H/,  // Cursor positioning
            /\x1b\[[0-9;]*J/,  // Clear line/screen
            /top - /,  // top command output
            /PID\s+USER/,  // top/ps headers
            /load average:/,  // System load info
            /Tasks:/,  // Process info
            /Mem:/,  // Memory info
            /Swap:/,  // Swap info
            /htop/,  // htop command
            /btop/   // btop command
        ];

        return interactivePatterns.some(pattern => pattern.test(output));
    }

    closeTerminal() {
        // Chiudi la sessione PTY se attiva
        if (this.currentSessionId) {
            window.__TAURI__.closeInteractiveSession(this.currentSessionId);
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
