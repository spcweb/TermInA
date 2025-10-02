// Interactive Terminal Manager
class InteractiveTerminal {
    constructor() {
        this.overlay = document.getElementById('interactive-terminal-overlay');
        this.container = document.getElementById('interactive-terminal-container');
        this.terminalElement = document.getElementById('interactive-terminal');
        this.commandNameElement = document.getElementById('interactive-command-name');
        this.closeBtn = document.getElementById('interactive-terminal-close');
        
        this.currentSessionId = null;
        this.api = null;
        this.pollInterval = null;
        this.lastTimestamp = 0;
        this.isOpen = false;
        this.pendingClose = false;
        this.terminal = null;
        this.fitAddon = null;
        this.terminalOptions = {
            fontFamily: 'SF Mono, Monaco, Menlo, Consolas, Liberation Mono, DejaVu Sans Mono, Courier New, monospace',
            fontSize: 14,
            lineHeight: 1.2,
            cursorBlink: true,
            cursorStyle: 'block',
            scrollback: 1000,
        };

        if (window.__PENDING_INTERACTIVE_TERMINAL_SETTINGS__) {
            this.updateFromSettings(window.__PENDING_INTERACTIVE_TERMINAL_SETTINGS__);
            delete window.__PENDING_INTERACTIVE_TERMINAL_SETTINGS__;
        }
        
        this.initializeEventListeners();
    }

    async _getApi() {
        if (this.api) {
            return this.api;
        }

        const adapt = (raw) => {
            if (!raw) return null;
            if (typeof raw.invoke === 'function') {
                return raw;
            }
            if (raw.core && typeof raw.core.invoke === 'function') {
                return {
                    ...raw,
                    invoke: raw.core.invoke.bind(raw.core),
                    event: raw.event || raw.core.event,
                };
            }
            return null;
        };

        const direct = adapt(window.__TAURI__);
        if (direct) {
            this.api = direct;
            return this.api;
        }

        if (window.getTauriAPI) {
            const resolved = await window.getTauriAPI();
            const adapted = adapt(resolved) || resolved;
            if (adapted && typeof adapted.invoke === 'function') {
                this.api = adapted;
                return this.api;
            }
        }

        throw new Error('Tauri API initialization function not found');
    }

    initializeEventListeners() {
        const safeClose = () => {
            this.closeTerminal().catch((error) => {
                console.error('Error closing interactive terminal:', error);
            });
        };

        this.closeBtn.addEventListener('click', safeClose);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.style.display !== 'none') {
                safeClose();
            }
        });

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                safeClose();
            }
        });
    }

    normalizeFontFamilyValue(fontFamily) {
        if (!fontFamily || typeof fontFamily !== 'string') {
            return null;
        }

        const trimmed = fontFamily.trim();
        if (!trimmed.length) {
            return null;
        }

        if (trimmed.includes(',')) {
            return trimmed;
        }

        const alreadyQuoted = /^['"].*['"]$/.test(trimmed);
        const needsQuotes = /\s/.test(trimmed) && !alreadyQuoted;
        const primary = needsQuotes ? `"${trimmed}"` : trimmed;
        return `${primary}, monospace`;
    }

    updateFromSettings(config) {
        if (!config || typeof config !== 'object') {
            return;
        }

        if (config.fontFamily) {
            const normalized = this.normalizeFontFamilyValue(config.fontFamily);
            if (normalized) {
                this.terminalOptions.fontFamily = normalized;
                if (this.terminal) {
                    this.terminal.options.fontFamily = normalized;
                }
            }
        }

        if (config.fontSize && !Number.isNaN(Number(config.fontSize))) {
            const size = Number(config.fontSize);
            this.terminalOptions.fontSize = size;
            if (this.terminal) {
                this.terminal.options.fontSize = size;
            }
        }

        if (config.lineHeight && !Number.isNaN(Number(config.lineHeight))) {
            const lh = Number(config.lineHeight);
            this.terminalOptions.lineHeight = lh;
            if (this.terminal) {
                this.terminal.options.lineHeight = lh;
            }
        }

        if (typeof config.cursorBlink === 'boolean') {
            this.terminalOptions.cursorBlink = config.cursorBlink;
            if (this.terminal) {
                this.terminal.options.cursorBlink = config.cursorBlink;
            }
        }

        if (config.cursorStyle) {
            this.terminalOptions.cursorStyle = config.cursorStyle;
            if (this.terminal) {
                this.terminal.options.cursorStyle = config.cursorStyle;
            }
        }

        if (config.scrollback && !Number.isNaN(Number(config.scrollback))) {
            const sb = Number(config.scrollback);
            this.terminalOptions.scrollback = sb;
            if (this.terminal) {
                this.terminal.options.scrollback = sb;
            }
        }

        if (this.terminal && this.fitAddon) {
            requestAnimationFrame(() => {
                try {
                    this.fitAddon.fit();
                } catch (error) {
                    console.warn('Interactive terminal fit failed after settings update:', error);
                }
            });
        }
    }

    async openTerminal(command, cwd) {
        try {
            console.log('Opening integrated terminal for command:', command, 'cwd:', cwd);

            if (this.isOpen) {
                await this.closeTerminal();
            }

            const api = await this._getApi();

            this.commandNameElement.textContent = `Terminale Interattivo - ${command}`;
            this.overlay.style.display = 'flex';
            this.isOpen = true;
            this.pendingClose = false;
            this.lastTimestamp = 0;

            const payload = {
                shell: undefined,
                cwd: cwd && cwd !== '~' ? cwd : undefined,
                cols: 120,
                rows: 32,
            };

            const sessionId = await api.invoke('pty_create_session', { payload });
            console.log('Interactive PTY session created:', sessionId);
            this.currentSessionId = sessionId;

            this.setupTerminal();

            await api.invoke('pty_write', {
                payload: {
                    session_id: sessionId,
                    input: `${command}\n`,
                },
            });

            this.startPolling();
        } catch (error) {
            console.error('Error opening interactive terminal:', error);
            this.showError('Errore nell\'apertura del terminale interattivo: ' + error.message);
            this.isOpen = false;
            this.pendingClose = false;
            this.currentSessionId = null;
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
            fontFamily: this.terminalOptions.fontFamily,
            fontSize: this.terminalOptions.fontSize,
            lineHeight: this.terminalOptions.lineHeight,
            cursorBlink: this.terminalOptions.cursorBlink,
            cursorStyle: this.terminalOptions.cursorStyle,
            scrollback: this.terminalOptions.scrollback,
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
            if (!this.currentSessionId || !this.api) {
                return;
            }
            this.api.invoke('pty_write', {
                payload: {
                    session_id: this.currentSessionId,
                    input: data,
                },
            }).catch((error) => {
                console.error('Failed to send PTY input:', error);
            });
        });

        // Propaga le dimensioni al backend (se supportato)
        this.sendResizeToBackend = () => {
            if (!this.currentSessionId) return;
            try {
                const cols = this.terminal.cols;
                const rows = this.terminal.rows;
                if (cols && rows) {
                    console.log(`Sending resize to backend: ${cols}x${rows}`);
                    if (this.api) {
                        this.api.invoke('pty_resize', {
                            payload: {
                                session_id: this.currentSessionId,
                                cols,
                                rows,
                            },
                        }).catch((error) => {
                            console.warn('Failed to send resize to backend:', error);
                        });
                    }
                }
            } catch (error) {
                console.warn('Failed to send resize to backend:', error);
            }
        };
        
        // Invia le dimensioni iniziali dopo l'apertura
        setTimeout(() => {
            this.sendResizeToBackend();
        }, 200);
        
        // Focus sul terminale
        this.terminal.focus();
        console.log('Terminal setup complete');
    }

    startPolling() {
        if (!this.currentSessionId || !this.api) {
            console.warn('Cannot start polling: session or API missing');
            return;
        }

        this.stopPolling();
        this.terminal.write('\x1b[2J\x1b[H');

        const poll = async () => {
            if (!this.currentSessionId || !this.api || this.pendingClose) {
                return;
            }

            try {
                const result = await this.api.invoke('pty_get_immediate_output', {
                    payload: {
                        session_id: this.currentSessionId,
                        timestamp: this.lastTimestamp,
                    },
                });

                if (result?.success && result.hasNewData && result.output) {
                    if (result.lastTimestamp) {
                        this.lastTimestamp = result.lastTimestamp;
                    }
                    this.terminal.write(result.output);
                } else if (result?.success === false && result.error) {
                    console.warn('Interactive PTY reported error:', result.error);
                    if (/session not found/i.test(result.error)) {
                        await this.closeTerminal();
                    }
                }
            } catch (error) {
                console.error('Error polling interactive PTY output:', error);
            }
        };

        poll();
        this.pollInterval = setInterval(() => {
            poll().catch((error) => {
                console.error('Error during interactive PTY polling:', error);
            });
        }, 100);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    async closeTerminal() {
        if (this.pendingClose) {
            return;
        }

        this.pendingClose = true;
        this.stopPolling();

        const sessionId = this.currentSessionId;
        this.currentSessionId = null;

        if (sessionId && this.api) {
            try {
                await this.api.invoke('pty_close', {
                    payload: {
                        session_id: sessionId,
                    },
                });
            } catch (error) {
                console.warn('Failed to close interactive PTY session:', error);
            }
        }

        this.overlay.style.display = 'none';

        this.lastTimestamp = 0;

        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        if (this._resizeObserver) {
            try { this._resizeObserver.disconnect(); } catch (_) {}
            this._resizeObserver = null;
        }

        if (this.terminal) {
            try {
                this.terminal.dispose();
            } catch (error) {
                console.warn('Failed to dispose interactive terminal:', error);
            }
            this.terminal = null;
        }

        this.isOpen = false;
        this.pendingClose = false;

        const terminalContainer = document.getElementById('terminal-container');
        if (terminalContainer) {
            terminalContainer.focus();
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
