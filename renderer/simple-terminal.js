console.log('=== SIMPLE TERMINAL FILE LOADED ===');
console.log('=== SIMPLE TERMINAL LOADING ===');

class SimpleTerminal {
    constructor() {
        console.log('=== SIMPLE TERMINAL CONSTRUCTOR ===');
        this.currentLine = '';
        this.cursorPosition = 0; // Posizione del cursore nella linea corrente
        this.cursorStyle = 'bar'; // Stile del cursore (bar, block, underline)
        this.history = [];
        this.historyIndex = -1; // Indice per navigazione cronologia
        this.output = [];
        this.cursor = null;
        this.aiConversation = []; // Cronologia conversazioni AI
    this.ptyModeEnabled = true; // Abilita PTY per comandi interattivi reali
        this.autoScrollEnabled = true; // Abilita scroll automatico
        this.smoothScrollEnabled = true; // Scroll fluido o istantaneo
        this.isUserScrolling = false; // Traccia se l'utente sta scrollando manualmente
        this.contentObserver = null; // Observer per monitorare i cambiamenti di contenuto
        this.currentAIGroup = null; // Contenitore corrente della sessione chat AI
        this.aiStatusManager = null; // Manager per lo status AI
        this.systemInfo = null; // Cache informazioni di sistema per prompt AI
        this.systemInfoTimestamp = 0;
        this.terminalSettings = {
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 14,
            lineHeight: 1.4,
            cursorStyle: 'bar',
            cursorBlink: true,
            autoScroll: true,
            smoothScroll: true,
            scrollback: 10000,
        };
        
        // Nuove proprietà PTY
        this.ptyTerminal = null;
        this.isPTYMode = false;
        this.passwordMode = false;
        this.passwordResolve = null;
        this.currentLoadingIndicator = null;
        this.commandStartTime = null;
        this.timeoutWarningShown = false;
        this.loadingAnimationFrame = null;
        this.loadingDots = 0;
        this.commandTimeoutTimer = null;
        this.isExecuting = false;
        this.api = null; // Cache per l'API Tauri
    this.cursorBlinkEnabled = true;
        this.ptyCommands = [
            'vim', 'vi', 'nano', 'emacs',           // Editor
            'htop', 'top', 'watch',                 // Monitor in tempo reale
            'yay', 'pacman', 'apt-get', 'apt',     // Package managers Linux
            'git clone', 'git pull', 'git push',    // Git con progress
            'npm install', 'npm run', 'yarn install', 'yarn add', 'yarn remove', // NPM/Yarn
            'pip install', 'pip download', 'pip uninstall', // Python
            'brew install', 'brew upgrade', 'brew uninstall', // Homebrew
            'wget', 'curl',                         // Download con progress
            'rsync', 'scp',                         // Trasferimenti
            'ssh', 'telnet',                        // Connessioni remote
            'docker run', 'docker build', 'docker pull', 'docker push', // Docker
            'make', 'cmake', 'gcc', 'g++', 'clang', // Build systems
            'node', 'python', 'python3', 'ruby', 'perl', // REPL interattivi
            'composer install', 'composer update',  // PHP Composer
            'gem install', 'gem update',            // Ruby Gems
            'cargo build', 'cargo run', 'cargo install', // Rust Cargo
            'go build', 'go run', 'go install',     // Go
            'mvn install', 'mvn compile', 'gradle build' // Java build tools
        ];
        
        console.log('=== VALORI DEFAULT INIZIALIZZATI ===');
        console.log('Auto-scroll enabled:', this.autoScrollEnabled);
        console.log('Smooth-scroll enabled:', this.smoothScrollEnabled);
        console.log('PTY mode enabled:', this.ptyModeEnabled);
        // this.init();
        // this.setupSettingsListener();
    }

    // Helper function per accedere all'API Tauri in modo robusto
    async _getApi() {
        const adapt = (raw) => {
            if (!raw) return null;
            if (typeof raw.invoke === 'function') {
                return raw;
            }
            if (raw.core && typeof raw.core.invoke === 'function') {
                const adapted = {
                    ...raw,
                    invoke: raw.core.invoke.bind(raw.core),
                };
                if (!adapted.event && raw.event) {
                    adapted.event = raw.event;
                }
                return adapted;
            }
            return null;
        };

        if (this.api && typeof this.api.invoke === 'function') {
            return this.api;
        }

        const direct = adapt(window.__TAURI__);
        if (direct) {
            this.api = direct;
            return this.api;
        }

        if (window.getTauriAPI) {
            try {
                const resolved = await window.getTauriAPI();
                const adapted = adapt(resolved) || resolved;
                if (adapted && typeof adapted.invoke === 'function') {
                    if (!adapted.event && window.__TAURI__?.event) {
                        adapted.event = window.__TAURI__.event;
                    }
                    this.api = adapted;
                    return this.api;
                }
                console.warn('⚠️ getTauriAPI returned an object without invoke:', resolved);
            } catch (error) {
                console.error('❌ Failed to resolve Tauri API via window.getTauriAPI:', error);
            }
        }

        throw new Error('Tauri API initialization function not found or invoke missing');
    }

    // Helper function per eseguire comandi tramite il terminale Rust
    async executeCommandViaRust(command) {
        const tauriApi = await this._getApi();
        if (!tauriApi || !tauriApi.invoke) {
            // Fallback simulato lato browser
            return this.executeFallbackCommand(command);
        }
        try {
            console.log('Executing command via Rust:', command);
            const result = await tauriApi.invoke('run_command', {
                payload: {
                    command,
                },
            });
            console.log('Command result:', result);
            return result;
        } catch (err) {
            console.warn('Rust command execution failed, using fallback:', err);
            return this.executeFallbackCommand(command);
        }
    }

    // Fallback locale quando l'API Tauri non è disponibile (esecuzione in puro browser)
    executeFallbackCommand(command) {
        const trimmed = command.trim();
        if (!trimmed) return '';

        // Simulazione semplice per comandi base
        if (trimmed === 'pwd') {
            return this.cwd || '~ (simulato)';
        }
        if (trimmed === 'ls') {
            return 'Simulated listing (Tauri non disponibile)\nREADME.md  docs/  src/  renderer/';
        }
        if (trimmed.startsWith('cd')) {
            const parts = trimmed.split(/\s+/);
            if (parts.length === 1 || parts[1] === '~') {
                this.cwd = '~';
            } else {
                // Non possiamo verificare il path reale; simuliamo
                const target = parts.slice(1).join(' ');
                this.cwd = (this.cwd && this.cwd !== '~' ? this.cwd : '~') + '/' + target.replace(/^\//,'');
            }
            this.showPrompt();
            return `📁 (Simulazione) Directory cambiata a: ${this.cwd}`;
        }
        if (trimmed.startsWith('ai ') || trimmed.startsWith('ask ') || trimmed.startsWith('execute ') || trimmed.startsWith('run ')) {
            // Usa già la pipeline AI fallback
            return '🤖 (Simulazione) AI non attiva senza backend Tauri. Avvia con "npm run tauri dev" per funzionalità complete.';
        }
        // Tutti gli altri comandi
        return `❌ Tauri API non disponibile. Comando non eseguito: "${trimmed}"\nAvvia la app con: npm install && npm run tauri dev`;
    }

    // Alternative method to execute AI commands without Tauri API
    async executeAICommandDirect(command) {
        try {
            // Try to use the existing AI command through a different approach
            const question = command.split(' ').slice(1).join(' ');
            const isAutoExecute = command.startsWith('execute ') || command.startsWith('run ');
            
            console.log('Executing AI command directly:', { question, isAutoExecute });
            
            // Try to use Ollama directly via shell commands
            try {
                const ollamaCommand = `curl -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d '{"model": "gemma3:270m", "prompt": "${question}", "stream": false}'`;
                const result = await this.executeShellCommand(ollamaCommand);
                
                // Parse the JSON response from Ollama
                try {
                    const jsonResponse = JSON.parse(result);
                    return jsonResponse.response || 'No response from AI';
                } catch (parseError) {
                    console.log('Could not parse Ollama response, returning raw result');
                    return result;
                }
            } catch (ollamaError) {
                console.log('Ollama not available, using fallback response');
                // Fallback response when Ollama is not available
                return `AI response for: ${question} (Auto-execute: ${isAutoExecute})\n\nNote: This is a fallback response. Ollama is not available.`;
            }
            
        } catch (error) {
            console.error('Error in executeAICommandDirect:', error);
            throw error;
        }
    }

    // Helper function to execute shell commands
    async executeShellCommand(command) {
        // In a browser environment, we can't execute shell commands directly
        // But we can use the terminal Rust to execute them
        try {
            const tauriApi = await this._getApi();
            if (tauriApi && tauriApi.invoke) {
                console.log('Using Tauri API to execute shell command');
                return await tauriApi.invoke('run_command', {
                    payload: {
                        command,
                    },
                });
            } else {
                console.log('Tauri API not available, using simulated response');
                // Simulate command execution for testing
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve('{"response": "This is a simulated AI response for testing purposes. The Tauri API is not available."}');
                    }, 1000);
                });
            }
        } catch (error) {
            console.error('Error executing shell command:', error);
            throw error;
        }
    }

    setupSettingsListener() {
        // Listener per aggiornamenti delle impostazioni dal pannello
        console.log('🔧 Setting up settings listener...');
        
        const setup = async () => {
            try {
                const tauriAPI = await this._getApi();
                await tauriAPI.event.listen('settings-updated', (event) => {
                    console.log('🎯 Settings updated event received:', event.payload);
                    this.applySettings(event.payload);
                });
                console.log('✅ Settings listener setup complete');
            } catch (error) {
                console.error('❌ Error setting up settings listener:', error);
            }
        };
        
        setup();
    }


    updateAISettings(aiConfig) {
        // Salva le impostazioni AI per l'uso nei comandi
        this.aiSettings = aiConfig;
        console.log('AI settings updated:', this.aiSettings);
    }

    async ensureAIConfigLoaded() {
        if (this.aiSettings && typeof this.aiSettings === 'object') {
            return this.aiSettings;
        }

        try {
            const config = await this.loadSettingsFromBackend();
            if (config && config.ai) {
                this.aiSettings = config.ai;
                return this.aiSettings;
            }
        } catch (error) {
            console.warn('Unable to load AI configuration:', error);
        }

        return this.aiSettings || null;
    }

    async ensureSystemInfo(force = false) {
        const now = Date.now();
        if (!force && this.systemInfo && (now - this.systemInfoTimestamp) < 5 * 60 * 1000) {
            return this.systemInfo;
        }

        try {
            const tauriApi = await this._getApi();
            if (tauriApi?.invoke) {
                const info = await tauriApi.invoke('get_system_info');
                if (info && typeof info === 'object') {
                    this.systemInfo = info;
                    this.systemInfoTimestamp = now;
                    return this.systemInfo;
                }
            }
        } catch (error) {
            console.warn('Impossibile recuperare get_system_info dal backend:', error);
        }

        const platformGuess = (() => {
            const raw = (navigator.platform || navigator.userAgent || '').toLowerCase();
            if (raw.includes('win')) return 'win32';
            if (raw.includes('mac')) return 'darwin';
            return 'linux';
        })();

        const home = (() => {
            const envHome = window.process?.env?.HOME || window.process?.env?.USERPROFILE;
            if (envHome) return envHome;
            if (platformGuess === 'win32') return '%USERPROFILE%';
            return '~';
        })();

        this.systemInfo = {
            platform: platformGuess,
            arch: window.navigator?.userAgentData?.architecture || '',
            shell: platformGuess === 'win32' ? 'powershell' : 'bash',
            homeDir: home,
            desktopDir: platformGuess === 'win32' ? `${home}\\Desktop` : `${home}/Desktop`,
            documentsDir: platformGuess === 'win32' ? `${home}\\Documents` : `${home}/Documents`,
            downloadsDir: platformGuess === 'win32' ? `${home}\\Downloads` : `${home}/Downloads`,
            picturesDir: platformGuess === 'win32' ? `${home}\\Pictures` : `${home}/Pictures`,
            musicDir: platformGuess === 'win32' ? `${home}\\Music` : `${home}/Music`,
            videosDir: platformGuess === 'win32'
                ? `${home}\\${platformGuess === 'darwin' ? 'Movies' : 'Videos'}`
                : `${home}/${platformGuess === 'darwin' ? 'Movies' : 'Videos'}`,
            publicDir: platformGuess === 'win32' ? `${home}\\Public` : `${home}/Public`,
        };
        this.systemInfoTimestamp = now;
        return this.systemInfo;
    }

    async collectDirectorySnapshots(systemInfo, currentCwd, expectCommand) {
        if (!expectCommand) {
            return [];
        }

        try {
            const tauriApi = await this._getApi();
            if (!tauriApi?.invoke) {
                return [];
            }

            const platform = (systemInfo?.platform || '').toLowerCase();
            const isWindows = platform === 'win32';
            const listCommand = isWindows ? 'dir /a /b' : 'ls -a';
            const resolvePath = (value) => {
                if (!value || typeof value !== 'string') {
                    return null;
                }
                if (value.startsWith('~') && systemInfo?.homeDir) {
                    return `${systemInfo.homeDir}${value.slice(1)}`;
                }
                return value;
            };

            const candidates = [
                currentCwd,
                systemInfo?.desktopDir,
                systemInfo?.documentsDir,
                systemInfo?.downloadsDir,
                systemInfo?.picturesDir,
            ]
                .map((item) => resolvePath(item))
                .filter((item) => item && item.length);

            const unique = Array.from(new Set(candidates));
            const snapshots = [];

            for (const directory of unique) {
                try {
                    const result = await tauriApi.invoke('run_command', {
                        payload: {
                            command: listCommand,
                            cwd: directory,
                        },
                    });

                    if (!result || result.success === false) {
                        continue;
                    }

                    const raw = (result.stdout || result.output || '').trim();
                    if (!raw) {
                        continue;
                    }

                    const entries = raw
                        .split(/\r?\n/)
                        .map((line) => line.trim())
                        .filter((line) => line && line !== '.' && line !== '..')
                        .slice(0, 25);

                    if (!entries.length) {
                        continue;
                    }

                    snapshots.push({
                        directory,
                        entries,
                    });
                } catch (error) {
                    console.warn('Directory snapshot failure:', directory, error);
                }
            }

            return snapshots;
        } catch (error) {
            console.warn('Impossibile creare snapshot directory:', error);
            return [];
        }
    }

    getRecentTerminalContext(maxLines = 6) {
        try {
            if (!this.outputElement || !maxLines || maxLines <= 0) {
                return [];
            }

            const lines = Array.from(this.outputElement.querySelectorAll('.output-line'));
            if (!lines.length) {
                return [];
            }

            return lines
                .slice(-maxLines)
                .map((node) => (node.textContent || '').trim())
                .filter((text) => text.length);
        } catch (error) {
            console.warn('Failed to collect terminal context for AI:', error);
            return [];
        }
    }

    async loadSettingsFromBackend() {
        console.log('=== LOADING SETTINGS FROM BACKEND ===');
        try {
            const tauriApi = await this._getApi();
            console.log('Tauri API obtained for settings');
            
            if (!tauriApi || !tauriApi.invoke) {
                console.log('Tauri API not available for loading settings');
                return null;
            }
            
            console.log('Loading settings from backend...');
            const config = await tauriApi.invoke('get_config');
            console.log('Settings loaded from backend:', config);
            
            if (config) {
                // Controlla se il tema è già stato applicato
                const currentBg = this.container?.style.backgroundColor;
                const hasTheme = currentBg && currentBg !== 'rgba(0, 0, 0, 0)' && currentBg !== 'transparent';
                
                if (!hasTheme || !config.theme) {
                    console.log('Applying settings (theme not yet applied or no theme in config)');
                    this.applySettings(config);
                } else {
                    console.log('Theme already applied, only updating AI settings');
                    if (config.ai) {
                        this.updateAISettings(config.ai);
                    }
                }
                
                console.log('AI Settings after applying:', this.aiSettings);
                return config;
            }
        } catch (error) {
            console.error('Error loading settings from backend:', error);
        }
        return null;
    }

    init() {
        console.log('=== INIT METHOD CALLED ===');
        this.container = document.getElementById('terminal');
        this.createTerminalDisplay();
        this.createCursor();
        this.showWelcome();
        this.showPrompt();
        this.setupEventListeners();
        this.startCursorBlink();
        
        // Focus sul container del terminale per abilitare l'input
        const terminalContainer = document.getElementById('terminal-container');
        if (terminalContainer) {
            terminalContainer.focus();
            console.log('Initial focus set on terminal container');
        }

        // Assicurati che il focus rimanga sul container - versione più aggressiva
        const ensureFocus = () => {
            const terminalContainer = document.getElementById('terminal-container');
            if (terminalContainer && document.activeElement !== terminalContainer) {
                terminalContainer.focus();
                console.log('Forced focus on terminal container');
            }
        };

        // Focus su click
        document.addEventListener('click', (e) => {
            console.log('Document click, checking focus');
            setTimeout(ensureFocus, 10);
        });

        // Focus periodico per assicurarsi che rimanga
        setInterval(() => {
            const terminalContainer = document.getElementById('terminal-container');
            if (terminalContainer && document.activeElement !== terminalContainer) {
                console.log('Periodic focus check - refocusing terminal');
                terminalContainer.focus();
            }
        }, 1000); // Ogni secondo

        // Focus su keydown se non siamo già focalizzati
        document.addEventListener('keydown', (e) => {
            const terminalContainer = document.getElementById('terminal-container');
            if (terminalContainer && document.activeElement !== terminalContainer) {
                console.log('Keydown detected, terminal not focused - focusing');
                terminalContainer.focus();
            }
        });
        
        // Carica le impostazioni iniziali in modo asincrono e non bloccante
        this.loadInitialSettings().catch(error => {
            console.error('Failed to load initial settings:', error);
        });
        
        // Setup periodic check for backend availability (fallback)
        this.setupBackendAvailabilityCheck();
        
        this.setupContentObserver(); // Nuovo observer per auto-scroll
        this.initializeAIStatusManager(); // Inizializza il manager status AI
        this.initializePTY(); // Inizializza il PTY terminal
        
        // Non carichiamo le impostazioni all'avvio - le caricheremo quando necessario
        console.log('Settings will be loaded when needed (e.g., when AI is used)');
    }

    async initializePTY() {
        try {
            console.log('SimpleTerminal: Initializing PTY Terminal...');
            this.ptyTerminal = new PTYTerminal(this);
            console.log('SimpleTerminal: PTY Terminal initialized successfully');
        } catch (error) {
            console.error('SimpleTerminal: Failed to initialize PTY Terminal:', error);
            this.ptyModeEnabled = false;
        }
    }

    createTerminalDisplay() {
        this.container.innerHTML = `
            <div class="simple-terminal-content">
                <div class="terminal-output"></div>
                <div class="terminal-prompt-block">
                    <div class="prompt-header"><span class="prompt-path">~</span></div>
                    <div class="terminal-input-line">
                        <span class="prompt">$</span>&nbsp;<span class="input-text"></span>
                    </div>
                </div>
            </div>
        `;
        
        this.outputElement = this.container.querySelector('.terminal-output');
        this.inputTextElement = this.container.querySelector('.input-text');
        this.cursor = null; // Verrà creato dinamicamente in updateCursorPosition
        
        // Identifichiamo l'elemento che ha realmente lo scroll
        this.scrollableElement = this.container.querySelector('.simple-terminal-content');
    }

    createCursor() {
        // Il cursore è già creato nell'HTML
        console.log('Cursor created:', this.cursor);
    }

    startCursorBlink() {
        setInterval(() => {
            if (this.cursor) {
                this.cursor.style.opacity = this.cursor.style.opacity === '0' ? '1' : '0';
            }
        }, 500);
    }

    showWelcome() {
        const welcomeContainer = document.getElementById('welcome-container');
        if (!welcomeContainer) {
            // Fallback se il contenitore non esiste
            this.addRichOutput(this.getWelcomeHtml(), 'welcome-wrapper');
            return;
        }

        welcomeContainer.innerHTML = `
            <div class="welcome-header-controls">
                <button id="toggle-columns-btn" title="Mostra/Nascondi Colonne">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-layout"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                </button>
            </div>
            ${this.getWelcomeHtml()}
        `;

        const welcomeBox = welcomeContainer.querySelector('.welcome-box');
        const toggleBtn = document.getElementById('toggle-columns-btn');

        if (toggleBtn && welcomeBox) {
            toggleBtn.addEventListener('click', () => {
                welcomeBox.classList.toggle('collapsed');
            });
        }
    }

    getWelcomeHtml() {
        return `
<div class="welcome-box">
    <div class="welcome-header">
        <div class="logo-col">
            <div class="logo-glow logo-has-image">
                <img src="./assets/logo.svg" alt="TermInA Logo" class="logo-image" />
            </div>
        </div>
        <div class="title-col">
            <h1>TermInA <span class="version-pill">Beta 0.2</span></h1>
            <p class="subtitle">AI‑Augmented Terminal • Fast • Modern</p>
        </div>
    </div>
    <div class="welcome-grid">
        <div class="wg-section">
            <h2>⚡ Quick Start</h2>
            <ul>
                <li><kbd>ai</kbd> <em>question</em> – ask something to the AI</li>
                <li><kbd>execute</kbd>/<kbd>run</kbd> <em>task</em> – iterative execution</li>
                <li><kbd>help</kbd> – available commands</li>
            </ul>
        </div>
        <div class="wg-section">
            <h2>🤖 AI Ops</h2>
            <ul>
                <li><kbd>save-ai-chat</kbd> save chat</li>
                <li><kbd>show-ai-chat</kbd> show memory</li>
                <li><kbd>clear-ai-chat</kbd> reset conversation</li>
            </ul>
        </div>
        <div class="wg-section">
            <h2>⌨️ Shortcuts</h2>
            <ul>
                <li><kbd>⌘</kbd><kbd>K</kbd> clear</li>
                <li><kbd>Tab</kbd> autocomplete</li>
                <li><kbd>↑</kbd><kbd>↓</kbd> history</li>
                <li><kbd>⌘</kbd><kbd>,</kbd> settings</li>
                <li><kbd>⌘</kbd><kbd>C</kbd>/<kbd>⌘</kbd><kbd>V</kbd> copy/paste</li>
            </ul>
        </div>
        <div class="wg-section">
            <h2>🧠 Features</h2>
            <ul>
                <li>Language auto‑detect</li>
                <li>Iterative agent</li>
                <li>Context aware suggestions</li>
            </ul>
        </div>
    </div>
    <div class="status-hint">Tip: press <kbd>⌘</kbd><kbd>,</kbd> to customize themes and AI provider.</div>
</div>`;
    }

    showPrompt() {
        const tryRender = () => this.renderPrompt();
        if (this.cwd) {
            tryRender();
            return;
        }
        
        const getCwdAsync = async () => {
            try {
                const tauriAPI = await this._getApi();
                const cwd = await tauriAPI.invoke('get_cwd');
                this.cwd = cwd;
            } catch (e) {
                // fallback
            } finally {
                tryRender();
            }
        };

        getCwdAsync();
    }

    // Helper sincrono leggero per punti early-init
    getQuickInvoke() {
        try {
            if (window.__TAURI__?.invoke) return window.__TAURI__.invoke.bind(window.__TAURI__);
            if (window.__TAURI__?.core?.invoke) return window.__TAURI__.core.invoke.bind(window.__TAURI__.core);
            if (typeof window.getTauriInvoke === 'function') {
                const x = window.getTauriInvoke();
                if (x) return x;
            }
            if (window.tauri?.invoke) return window.tauri.invoke.bind(window.tauri);
        } catch (_) {}
        return null;
    }

    renderPrompt() {
        const promptSpan = this.container.querySelector('.prompt');
        const headerPath = this.container.querySelector('.prompt-header .prompt-path');
        const cwdDisplay = this.cwd ? this.formatCwd(this.cwd) : '~';
        // Aggiorna header sopra il prompt (stile Warp-like)
        if (headerPath) {
            headerPath.innerHTML = this.buildPromptHeaderContent(cwdDisplay);
        }
        // Prompt minimale solo simbolo
        if (promptSpan) {
            promptSpan.textContent = '$';
        }
        this.inputTextElement.textContent = this.currentLine;
        this.updateCursorPosition();
    }

    buildPromptHeaderContent(cwdDisplay) {
        // Possibile espansione futura: aggiungere ora, git branch, status code ultimo comando
        // Per ora solo path formattato
        return this.escapeHtml(cwdDisplay);
    }

    formatCwd(cwd) {
        try {
            const home = (typeof require === 'function') ? require('os').homedir() : null;
            if (home && cwd.startsWith(home)) {
                return '~' + cwd.slice(home.length);
            }
            // Accorcia path lunghi mantenendo ultime 2 directory
            const parts = cwd.split('/').filter(Boolean);
            if (parts.length > 3) {
                return '/' + parts.slice(-3).join('/');
            }
            return cwd || '/';
        } catch (_) {
            return cwd;
        }
    }

    updateCursorPosition() {
        // Visualizza il testo con il cursore nella posizione corretta
        const beforeCursor = this.currentLine.substring(0, this.cursorPosition);
        const afterCursor = this.currentLine.substring(this.cursorPosition);
        
        // Se siamo in modalità password, nasconde l'input
        let displayBefore, displayAfter;
        if (this.passwordMode) {
            displayBefore = '*'.repeat(beforeCursor.length);
            displayAfter = '*'.repeat(afterCursor.length);
        } else {
            displayBefore = this.escapeHtml(beforeCursor);
            displayAfter = this.escapeHtml(afterCursor);
        }
        
        // Usa lo stile del cursore attualmente configurato
        const cursorClass = `cursor-${this.cursorStyle}`;
        
        this.inputTextElement.innerHTML = 
            `<span class="before-cursor">${displayBefore}</span>` +
            `<span class="terminal-cursor ${cursorClass}"></span>` +
            `<span class="after-cursor">${displayAfter}</span>`;
        
        // Aggiorna il riferimento al cursore
        this.cursor = this.inputTextElement.querySelector('.terminal-cursor');
        
        if (this.cursor) {
            this.cursor.style.opacity = '1';
            
            // Per i cursori block e underline, aggiungi contenuto per visualizzare gli spazi
            if (this.cursorStyle === 'block' || this.cursorStyle === 'underline') {
                const charAtCursor = this.passwordMode ? '*' : this.currentLine.charAt(this.cursorPosition);
                this.cursor.textContent = charAtCursor || '\u00A0'; // Spazio non-breaking se vuoto
            } else {
                this.cursor.textContent = '';
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        // Sostituisce gli spazi con spazi non-breaking per preservare la formattazione
        return div.innerHTML.replace(/ /g, '\u00A0');
    }

    addOutput(text) {
        // Debug: log dell'output aggiunto
        console.log('SimpleTerminal addOutput:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        
        // Se arriva output normale dopo una sessione AI, chiudi la sessione corrente
        if (this.currentAIGroup) {
            // Aggiungi un marcatore di fine (opzionale, per ora solo reset)
            this.currentAIGroup = null;
        }
        const line = document.createElement('div');
        line.className = 'output-line';
        line.textContent = text;
        this.outputElement.appendChild(line);
        // Il MutationObserver si occuperà dello scroll automatico
        return line;
    }

        addRichOutput(html, extraClass = '') {
                if (this.currentAIGroup) this.currentAIGroup = null;
                const wrapper = document.createElement('div');
                wrapper.className = `output-line rich-output ${extraClass}`.trim();
                // Sanitizzazione basilare: rimuove script/style
                const safeHtml = html
                    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
                wrapper.innerHTML = safeHtml;
                this.outputElement.appendChild(wrapper);
        }

    // Funzione speciale per output AI
    addAIOutput(text) {
        // Crea un nuovo contenitore di gruppo se non esiste
        if (!this.currentAIGroup) {
            const group = document.createElement('div');
            group.className = 'ai-chat-group';
            // Etichetta visiva opzionale (può essere stilizzata via ::before in CSS)
            this.outputElement.appendChild(group);
            this.currentAIGroup = group;
        }

        const line = document.createElement('div');
        line.className = 'output-line ai-output';
        line.textContent = text;
    // Aggiungi classe per animazione di evidenziazione
    line.classList.add('new-line');
    this.currentAIGroup.appendChild(line);
    // Rimuovi la classe dopo l'animazione per evitare ri-trigger
        setTimeout(() => line.classList.remove('new-line'), 1600);
        // Il MutationObserver si occuperà dello scroll automatico
        return line;
    }

    scrollToBottom() {
        // Implementazione del tuo metodo con supporto per smooth scroll
        if (this.smoothScrollEnabled) {
            this.scrollableElement.scrollTo({
                top: this.scrollableElement.scrollHeight,
                behavior: 'smooth'
            });
        } else {
            this.scrollableElement.scrollTop = this.scrollableElement.scrollHeight;
        }
    }

    // Funzione per forzare lo scroll in fondo (per comandi manuali)
    forceScrollToBottom() {
        this.isUserScrolling = false;
        this.scrollToBottom();
    }

    updateScrollState() {
        // Usa l'elemento scrollabile corretto per controllare la posizione
        const scrollTop = this.scrollableElement.scrollTop;
        const scrollHeight = this.scrollableElement.scrollHeight;
        const clientHeight = this.scrollableElement.clientHeight;
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
        
        // L'utente sta scrollando manualmente se è lontano dal fondo
        this.isUserScrolling = distanceFromBottom > 100;
    }

    // Funzione per attivare/disattivare l'auto-scroll manualmente
    toggleAutoScroll() {
        this.autoScrollEnabled = !this.autoScrollEnabled;
        if (this.autoScrollEnabled) {
            this.isUserScrolling = false;
            this.scrollToBottom();
            this.addOutput('✅ Auto-scroll abilitato');
        } else {
            this.addOutput('❌ Auto-scroll disabilitato');
        }
    }

    // Auto-Scroll con MutationObserver (metodo pulito)
    setupContentObserver() {
        // Configurazione per l'auto-scroll
        this.smoothScrollEnabled = true; // Scroll fluido o istantaneo
        
        // MutationObserver per monitorare i cambiamenti
        this.contentObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    if (this.autoScrollEnabled) {
                        this.scrollToBottom();
                    }
                }
            });
        });

        // Avvia l'osservazione del contenitore output
        this.contentObserver.observe(this.outputElement, {
            childList: true,
            subtree: true
        });
        
        console.log('Auto-scroll MutationObserver initialized');
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        document.addEventListener('click', () => {
            // Focus sempre sul terminale
            if (this.cursor) {
                this.cursor.style.opacity = '1';
            }
        });

        // Gestione del pulsante impostazioni
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettings();
            });
        }

        // Gestione del pulsante status AI
        const aiStatusBtn = document.getElementById('ai-status');
        if (aiStatusBtn) {
            aiStatusBtn.addEventListener('click', () => {
                this.refreshAIStatus();
            });
        }

        // Scorciatoia da tastiera per le impostazioni
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === ',') {
                e.preventDefault();
                this.openSettings();
            }
        });

        // Gestione scroll del terminale (usa l'elemento scrollabile corretto)
        this.container.addEventListener('scroll', () => {
            this.updateScrollState();
        });
        this.scrollableElement.addEventListener('scroll', () => {
            this.updateScrollState();
        });

        // Gestione wheel per scroll manuale
        this.container.addEventListener('wheel', (e) => {
            this.updateScrollState();
        });
        this.scrollableElement.addEventListener('wheel', (e) => {
            this.updateScrollState();
        });

        // Setup IPC listeners per aggiornamenti configurazione
        this.setupConfigListeners();

        // Listener aggiornamento cwd
            // CWD updates are handled through events in Tauri v2
            // This will be implemented through the backend event system
    }

    setupConfigListeners() {
        // Ascolta eventi di aggiornamento impostazioni da Tauri e aggiorna lo status AI
        const attach = async () => {
            try {
                const tauriAPI = await this._getApi();
                await tauriAPI.event.listen('settings-updated', (evt) => {
                    console.log('Settings updated event received:', evt);
                    let payload = evt && (evt.payload ?? evt.detail ?? evt);

                    if (typeof payload === 'string') {
                        try {
                            payload = JSON.parse(payload);
                        } catch (parseError) {
                            console.warn('Failed to parse settings payload string:', parseError);
                            payload = null;
                        }
                    }

                    if (payload && typeof payload === 'object') {
                        this.applySettings(payload);
                    } else {
                        console.warn('Ignoring settings-updated event without valid payload:', payload);
                    }
                });
            } catch (e) {
                console.warn('Impossibile attivare listener settings-updated:', e);
            }
        };
        attach();
    }

    applySettings(config) {
        try {
            console.log('🎨 APPLYING SETTINGS - START');
            console.log('🎨 Config received:', config);
            console.log('🎨 Config type:', typeof config);
            console.log('🎨 Config keys:', Object.keys(config || {}));
            
            if (!config || typeof config !== 'object') {
                console.warn('❌ Invalid config, skipping application');
                return;
            }

            // Normalizzazione chiavi tra backend (snake_case) e frontend (camelCase)
            const normalizeTheme = (t) => {
                if (!t) return null;
                return {
                    name: t.name || t.theme_name || t.theme || 'warp-dark',
                    background: t.background || t.bg || t.background_color || '#1e2124',
                    foreground: t.foreground || t.fg || t.foreground_color || '#ffffff',
                    cursor: t.cursor || t.cursor_color || '#00d4aa',
                    accent: t.accent || t.accent_color || t.cursor || '#00d4aa',
                    background_blur: (typeof t.background_blur === 'boolean') ? t.background_blur : (t.blur_background || false)
                };
            };
            const normalizeTerminal = (tc) => {
                if (!tc) return null;
                return {
                    fontFamily: tc.font_family || tc.fontFamily || 'JetBrains Mono',
                    fontSize: tc.font_size || tc.fontSize || 14,
                    lineHeight: tc.line_height || tc.lineHeight || 1.4,
                    cursorStyle: tc.cursor_style || tc.cursorStyle || 'bar',
                    cursorBlink: (typeof tc.cursor_blink === 'boolean') ? tc.cursor_blink : (tc.cursorBlink ?? true),
                    scrollback: tc.scrollback || tc.history_lines || 10000,
                    bellSound: (typeof tc.bell_sound === 'boolean') ? tc.bell_sound : (tc.bellSound ?? false),
                    autoScroll: (typeof tc.auto_scroll === 'boolean') ? tc.auto_scroll : (tc.autoScroll ?? true),
                    smoothScroll: (typeof tc.smooth_scroll === 'boolean') ? tc.smooth_scroll : (tc.smoothScroll ?? true)
                };
            };
            const normalizedTheme = config.theme ? normalizeTheme(config.theme) : null;
            const normalizedTerminal = config.terminal ? normalizeTerminal(config.terminal) : null;
            if (normalizedTheme) console.log('[settings] tema normalizzato:', normalizedTheme);
            if (normalizedTerminal) console.log('[settings] terminal normalizzato:', normalizedTerminal);
            
            // Applica tema e colori
            if (normalizedTheme) {
                this.applyTheme(normalizedTheme);
            }

            // Applica impostazioni terminale
            if (normalizedTerminal) {
                this.applyTerminalSettings(normalizedTerminal);
            }

            // Aggiorna status AI
            if (config.ai) {
                console.log('🤖 Updating AI settings...');
                if (this.aiStatusManager) {
                    this.aiStatusManager.handleSettingsUpdate(config);
                } else {
                    this.updateAIStatus(config.ai);
                }
            }

            console.log('✅ APPLYING SETTINGS - COMPLETED SUCCESSFULLY');

        } catch (error) {
            console.error('❌ Error applying settings:', error);
        }
    }

    updateAIStatus(aiConfig, preferProvided = false) {
        try {
            console.log('Aggiornamento status AI:', aiConfig);
            
            const aiStatusElement = document.getElementById('ai-status');
            const aiProviderNameElement = document.getElementById('ai-provider-name');
            const aiStatusDot = document.querySelector('.ai-status-dot');
            
            if (!aiStatusElement || !aiProviderNameElement || !aiStatusDot) {
                console.warn('Elementi AI status non trovati nella top bar');
                return;
            }

            // Aggiorna il nome del provider
            const providerNames = {
                'gemini': 'Gemini',
                'openai': 'OpenAI',
                'lm-studio': 'LM Studio',
                'ollama': 'Ollama',
                'disabled': 'AI Off'
            };
            
            const providerName = providerNames[aiConfig.provider] || aiConfig.provider;
            aiProviderNameElement.textContent = providerName;
            
            // Se il provider è "disabled", imposta direttamente lo status offline
            if (aiConfig.provider === 'disabled') {
                aiStatusElement.classList.remove('online', 'testing');
                aiStatusElement.classList.add('offline');
                console.log('AI Status: Disabilitato');
                return;
            }
            
            // Test della connessione AI per aggiornare lo status
            this.testAIConnectionStatus(aiConfig, aiStatusElement, aiStatusDot, preferProvided);
            
        } catch (error) {
            console.error('Error updating AI status:', error);
        }
    }

    async testAIConnectionStatus(aiConfig, statusElement, statusDot, preferProvided = false) {
        try {
            // Imposta status di test (giallo/pulsante) - rimuovi tutti gli stili inline
            statusElement.classList.remove('offline');
            statusElement.classList.remove('online');
            statusElement.classList.add('testing');
            statusDot.style.background = '';
            statusDot.style.boxShadow = '';
            statusDot.style.borderColor = '';
            
            // Test della connessione
            const tauriAPI = await this._getApi();
            if (tauriAPI) {
                // Se non forzato, recupera una config fresca dal backend per evitare mismatch
                let effectiveAIConfig = aiConfig;
                if (!preferProvided) {
                    try {
                        const fresh = await tauriAPI.invoke('get_config');
                        const aiFresh = fresh && fresh.ai ? fresh.ai : null;
                        if (aiFresh) {
                            effectiveAIConfig = aiFresh;
                        }
                    } catch (_) {}
                }
                // Se manca il provider ma c'è ollama, preferisci ollama
                if (!effectiveAIConfig.provider && effectiveAIConfig.ollama) {
                    effectiveAIConfig.provider = 'ollama';
                }
                // Nota: il comando Rust si aspetta la chiave 'ai_config'
                console.log('Testing AI connection with config:', effectiveAIConfig);
                let testResult = await tauriAPI.invoke('test_ai_connection', {
                    provider: effectiveAIConfig.provider,
                    aiConfig: effectiveAIConfig,
                    ai_config: effectiveAIConfig,
                });
                console.log('AI connection test result:', testResult);
                
                // Normalizza eventuale risposta stringa
                if (typeof testResult === 'string') {
                    try { testResult = JSON.parse(testResult); } catch (_) { testResult = { success: false, error: testResult }; }
                }
                const responseText = (testResult && testResult.response) ? String(testResult.response) : '';
                console.log('Parsed test result:', testResult, 'Response text:', responseText);
                
                if (testResult && testResult.success === true) {
                    
                    // Connesso (verde) - usa solo le classi CSS
                    statusElement.classList.remove('offline', 'testing');
                    statusElement.classList.add('online');
                    console.log('AI Status: Connesso ✅');
                    
                } else {
                    // Disconnesso (rosso) - usa solo le classi CSS
                    statusElement.classList.remove('online', 'testing');
                    statusElement.classList.add('offline');
                    console.log('AI Status: Disconnesso ❌ - ', (testResult && (testResult.error || responseText)) || 'Risposta non valida');
                    
                    // Prova un test alternativo se il backend fallisce
                    console.log('Trying alternative connection test...');
                    this.tryAlternativeConnectionTest(effectiveAIConfig, statusElement, statusDot);
                }
            } else {
                // API non disponibile (rosso) - usa solo le classi CSS
                statusElement.classList.remove('online', 'testing');
                statusElement.classList.add('offline');
                console.log('AI Status: API non disponibile');
            }
            
        } catch (error) {
            // Errore di connessione (rosso) - usa solo le classi CSS
            statusElement.classList.remove('online', 'testing');
            statusElement.classList.add('offline');
            console.error('AI Status: Errore nel test di connessione:', error);
        }
    }

    async tryAlternativeConnectionTest(aiConfig, statusElement, statusDot) {
        try {
            console.log('Trying alternative connection test for provider:', aiConfig.provider);
            
            // Test semplice basato sul provider
            let isConnected = false;
            
            switch (aiConfig.provider) {
                case 'gemini':
                    if (aiConfig.gemini && aiConfig.gemini.apiKey && aiConfig.gemini.apiKey.trim() !== '') {
                        isConnected = true;
                    }
                    break;
                case 'openai':
                    if (aiConfig.openai && aiConfig.openai.apiKey && aiConfig.openai.apiKey.trim() !== '') {
                        isConnected = true;
                    }
                    break;
                case 'ollama':
                    if (aiConfig.ollama && aiConfig.ollama.base_url && aiConfig.ollama.base_url.trim() !== '') {
                        isConnected = true;
                    }
                    break;
                case 'lm-studio':
                    if (aiConfig.lmStudio && aiConfig.lmStudio.endpoint && aiConfig.lmStudio.endpoint.trim() !== '') {
                        isConnected = true;
                    }
                    break;
            }
            
            if (isConnected) {
                // Se la configurazione sembra valida, imposta come connesso
                statusElement.classList.remove('offline', 'testing');
                statusElement.classList.add('online');
                console.log('AI Status: Connesso ✅ (configurazione valida)');
            } else {
                console.log('AI Status: Configurazione non valida per', aiConfig.provider);
            }
            
        } catch (error) {
            console.error('Error in alternative connection test:', error);
        }
    }

    async refreshAIStatus() {
        try {
            console.log('Refresh manuale dello status AI');
            if (this.aiStatusManager) {
                await this.aiStatusManager.checkAIStatus(true);
            } else {
                const tauriApi = await this._getApi();
                if (tauriApi && tauriApi.invoke) {
                    const config = await tauriApi.invoke('get_config');
                    if (config.ai) {
                        this.updateAIStatus(config.ai);
                    }
                }
            }
        } catch (error) {
            console.error('Error refreshing AI status:', error);
        }
    }

    initializeAIStatusManager() {
        try {
            console.log('🤖 Inizializzazione AI Status Manager...');
            
            // Inizializza il manager se disponibile
            if (window.AIStatusManager) {
                this.aiStatusManager = new AIStatusManager();
                
                // Avvia il controllo periodico
                this.aiStatusManager.startPeriodicCheck(30000); // 30 secondi
                
                // Verifica immediata dello status
                setTimeout(() => {
                    this.aiStatusManager.checkAIStatus(false);
                }, 1000); // 1 secondo dopo l'inizializzazione
                
                console.log('✅ AI Status Manager inizializzato correttamente');
            } else {
                console.warn('⚠️ AIStatusManager non disponibile, uso metodo legacy');
                this.startPeriodicAIStatusCheck(); // Fallback al metodo precedente
            }
        } catch (error) {
            console.error('❌ Errore nell\'inizializzazione AI Status Manager:', error);
            this.startPeriodicAIStatusCheck(); // Fallback al metodo precedente
        }
    }

    startPeriodicAIStatusCheck() {
        // Controlla lo status dell'AI ogni 30 secondi (metodo legacy)
        setInterval(async () => {
            try {
                const tauriAPI = await this._getApi();
                if (tauriAPI) {
                    const config = await tauriAPI.invoke('get_config');
                    if (config.ai) {
                        const aiStatusElement = document.getElementById('ai-status');
                        const aiStatusDot = document.querySelector('.ai-status-dot');
                        if (aiStatusElement && aiStatusDot) {
                            this.testAIConnectionStatus(config.ai, aiStatusElement, aiStatusDot);
                        }
                    }
                }
            } catch (error) {
                console.error('Error in periodic AI status check:', error);
            }
        }, 30000); // 30 secondi
    }

    applyTheme(theme) {
        console.log('🎨 APPLYING THEME - START');
        console.log('🎨 Theme received:', theme);
        
        const terminal = this.container;
        if (!terminal) {
            console.error('❌ Terminal container not found!');
            return;
        }
        
        console.log('🎨 Terminal container found:', terminal);

        // Aggiorna variabili CSS globali
        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            console.log('🎨 Setting CSS variables...');
            
            const bgColor = theme.background || '#1e2124';
            const fgColor = theme.foreground || '#ffffff';
            const cursorColor = theme.cursor || '#00d4aa';
            const accentColor = theme.accent || '#00d4aa';
            
            console.log('🎨 Colors:', { bgColor, fgColor, cursorColor, accentColor });
            
            root.style.setProperty('--terminal-bg', bgColor);
            root.style.setProperty('--terminal-fg', fgColor);
            root.style.setProperty('--terminal-cursor', cursorColor);
            root.style.setProperty('--terminal-accent', accentColor);
            
            console.log('🎨 CSS variables set:', {
                '--terminal-bg': root.style.getPropertyValue('--terminal-bg'),
                '--terminal-fg': root.style.getPropertyValue('--terminal-fg'),
                '--terminal-cursor': root.style.getPropertyValue('--terminal-cursor'),
                '--terminal-accent': root.style.getPropertyValue('--terminal-accent')
            });
            // Derivazioni per componenti ricchi
            const accent = theme.accent || '#00d4aa';
            const fg = theme.foreground || '#ffffff';
            const bg = theme.background || '#1e2124';
            // Colori AI
            root.style.setProperty('--ai-output-fg', theme.aiOutputFg || fg);
            root.style.setProperty('--ai-output-accent', theme.aiOutputAccent || accent);
            root.style.setProperty('--ai-output-border', theme.aiOutputBorder || 'rgba(138,180,250,0.25)');
            // Welcome box
            root.style.setProperty('--welcome-border', theme.welcomeBorder || 'rgba(95,179,255,0.25)');
            root.style.setProperty('--welcome-bg-overlay1', theme.welcomeOverlay1 || 'rgba(95,179,255,0.18)');
            root.style.setProperty('--welcome-bg-overlay2', theme.welcomeOverlay2 || 'rgba(0,212,170,0.16)');
            root.style.setProperty('--welcome-section-bg', theme.welcomeSectionBg || 'rgba(255,255,255,0.04)');
            root.style.setProperty('--welcome-section-border', theme.welcomeSectionBorder || 'rgba(255,255,255,0.06)');
        }

        // Applica anche direttamente agli elementi per compatibilità
        console.log('🎨 Applying direct styles to terminal...');
        terminal.style.backgroundColor = theme.background || '#1e2124';
        terminal.style.color = theme.foreground || '#ffffff';
        
        console.log('🎨 Terminal styles applied:', {
            backgroundColor: terminal.style.backgroundColor,
            color: terminal.style.color
        });

        // Applica colori al cursore
        if (this.cursor) {
            console.log('🎨 Applying cursor color...');
            this.cursor.style.color = theme.cursor || '#00d4aa';
            console.log('🎨 Cursor color applied:', this.cursor.style.color);
        } else {
            console.log('🎨 No cursor found to apply color to');
        }

        // Applica colori al prompt
        const prompt = terminal.querySelector('.prompt');
        if (prompt) {
            prompt.style.color = theme.accent || '#00d4aa';
        }

        // Aggiorna AI chat group colori dinamici
        this.updateDynamicStyledComponents();
        // Applica al testo di input
        const inputText = terminal.querySelector('.input-text');
        if (inputText) {
            inputText.style.color = theme.foreground || '#ffffff';
        }
        
        console.log('🎨 APPLYING THEME - COMPLETED');
    }

    updateDynamicStyledComponents() {
        // Aggiorna eventuali elementi già renderizzati (welcome box, ai output)
        try {
            const rootStyles = getComputedStyle(document.documentElement);
            const aiOutputs = this.container.querySelectorAll('.ai-chat-group .ai-output');
            aiOutputs.forEach(el => {
                el.style.color = rootStyles.getPropertyValue('--ai-output-fg').trim() || '';
            });
            const welcomeBox = this.container.querySelector('.welcome-box');
            if (welcomeBox) {
                welcomeBox.style.borderColor = rootStyles.getPropertyValue('--welcome-border').trim();
            }
        } catch (e) {
            console.warn('updateDynamicStyledComponents failed:', e);
        }
    }

    applyTerminalSettings(terminalConfig) {
        const terminal = this.container;
        if (!terminal || !terminalConfig) return;

        const root = typeof document !== 'undefined' ? document.documentElement : null;
        const mergedConfig = { ...this.terminalSettings, ...terminalConfig };

        // Gestione font
        if (root) {
            const normalizedFont = this.normalizeFontFamilyValue(mergedConfig.fontFamily || terminalConfig.fontFamily);
            if (normalizedFont) {
                mergedConfig.fontFamily = normalizedFont.cssVarValue;
                root.style.setProperty('--terminal-font-family', normalizedFont.cssVarValue);
                terminal.style.fontFamily = normalizedFont.cssVarValue;
                this.applyFontFamilyToElements(normalizedFont.cssVarValue);
            }
        }

        // Dimensioni font e line-height
        if (root && mergedConfig.fontSize) {
            const fontSizePx = `${mergedConfig.fontSize}px`;
            root.style.setProperty('--terminal-font-size', fontSizePx);
            terminal.style.fontSize = fontSizePx;
            if (this.scrollableElement) this.scrollableElement.style.fontSize = fontSizePx;
            if (this.cursor) this.cursor.style.fontSize = fontSizePx;
        }

        if (root && mergedConfig.lineHeight) {
            const lineHeightStr = `${mergedConfig.lineHeight}`;
            root.style.setProperty('--terminal-line-height', lineHeightStr);
            terminal.style.lineHeight = lineHeightStr;
            if (this.scrollableElement) this.scrollableElement.style.lineHeight = lineHeightStr;
            if (this.cursor) this.cursor.style.lineHeight = lineHeightStr;
        }

        // Stile del cursore
        if (mergedConfig.cursorStyle) {
            this.applyCursorStyle(mergedConfig.cursorStyle);
        }

        if (typeof mergedConfig.cursorBlink !== 'undefined') {
            this.cursorBlinkEnabled = mergedConfig.cursorBlink;
            if (mergedConfig.cursorBlink) {
                this.startCursorBlink();
            } else if (this.cursor) {
                this.cursor.style.opacity = '1';
                this.cursor.style.animation = 'none';
            }
        }

        // Auto-scroll e smooth scroll
        if (typeof mergedConfig.autoScroll !== 'undefined') {
            this.autoScrollEnabled = mergedConfig.autoScroll;
            console.log('Auto-scroll impostato da config:', mergedConfig.autoScroll);
        } else {
            this.autoScrollEnabled = true;
            console.log('Auto-scroll impostato di default:', true);
        }

        if (typeof mergedConfig.smoothScroll !== 'undefined') {
            this.smoothScrollEnabled = mergedConfig.smoothScroll;
            console.log('Smooth-scroll impostato da config:', mergedConfig.smoothScroll);
        } else {
            this.smoothScrollEnabled = true;
            console.log('Smooth-scroll impostato di default:', true);
        }

        this.terminalSettings = mergedConfig;
        this.applyInteractiveTerminalSettings(mergedConfig);
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
            return {
                cssVarValue: trimmed,
            };
        }

        const alreadyQuoted = /^['"].*['"]$/.test(trimmed);
        const needsQuotes = /\s/.test(trimmed) && !alreadyQuoted;
        const primary = needsQuotes ? `"${trimmed}"` : trimmed;
        return {
            cssVarValue: `${primary}, monospace`,
        };
    }

    applyFontFamilyToElements(fontFamily) {
        const targets = [
            this.scrollableElement,
            this.outputElement,
            this.inputTextElement,
            this.cursor,
        ];

        targets.forEach((node) => {
            if (node && node.style) {
                node.style.fontFamily = fontFamily;
            }
        });

        if (this.container) {
            const extraTargets = this.container.querySelectorAll('.terminal-output, .terminal-input-line, .prompt, .input-text, .before-cursor, .after-cursor, .rich-output, .ai-output, .terminal-prompt-block');
            extraTargets.forEach((node) => {
                if (node && node.style) {
                    node.style.fontFamily = fontFamily;
                }
            });
        }
    }

    applyInteractiveTerminalSettings(terminalConfig) {
        const payload = {
            fontFamily: terminalConfig.fontFamily,
            fontSize: terminalConfig.fontSize,
            lineHeight: terminalConfig.lineHeight,
            cursorBlink: terminalConfig.cursorBlink,
            cursorStyle: terminalConfig.cursorStyle,
            scrollback: terminalConfig.scrollback,
        };

        if (window.interactiveTerminal && typeof window.interactiveTerminal.updateFromSettings === 'function') {
            if (window.__PENDING_INTERACTIVE_TERMINAL_SETTINGS__) {
                delete window.__PENDING_INTERACTIVE_TERMINAL_SETTINGS__;
            }
            window.interactiveTerminal.updateFromSettings(payload);
        } else {
            window.__PENDING_INTERACTIVE_TERMINAL_SETTINGS__ = payload;
        }
    }

    applyCursorStyle(style) {
        console.log('Applicazione stile cursore:', style);

        // Salva lo stile del cursore per l'uso futuro
        this.cursorStyle = style;

        // Se non abbiamo ancora un cursore nel DOM, non fare niente
        // Lo stile verrà applicato quando il cursore viene creato
        if (!this.cursor) {
            console.log('Cursore non ancora creato, stile salvato per dopo');
            return;
        }

        // Reset di tutte le classi di stile del cursore
        this.cursor.classList.remove('cursor-bar', 'cursor-block', 'cursor-underline');
        
        // Reset degli stili inline per evitare conflitti
        this.cursor.style.backgroundColor = '';
        this.cursor.style.color = '';
        this.cursor.style.width = '';
        this.cursor.style.height = '';
        this.cursor.style.borderLeft = '';
        this.cursor.style.borderRight = '';
        this.cursor.style.borderTop = '';
        this.cursor.style.borderBottom = '';
        this.cursor.style.border = '';
        this.cursor.style.display = '';
        this.cursor.style.boxShadow = '';
        this.cursor.style.outline = '';

        // Applica la classe CSS appropriata
        const cursorClass = `cursor-${style}`;
        this.cursor.classList.add(cursorClass);

        // Per i cursori block e underline, aggiungi contenuto per visualizzare gli spazi
        if (style === 'block' || style === 'underline') {
            const charAtCursor = this.currentLine.charAt(this.cursorPosition);
            this.cursor.textContent = charAtCursor || '\u00A0'; // Spazio non-breaking se vuoto
        } else {
            this.cursor.textContent = ''; // Nessun contenuto per il cursore bar
        }

        console.log('Stile cursore applicato:', {
            style: style,
            classList: Array.from(this.cursor.classList),
            textContent: this.cursor.textContent
        });
    }

    async loadInitialSettings() {
        console.log('🎨 Loading initial settings...');
        
        // Prova a caricare le impostazioni salvate con retry
        let retries = 0;
        const maxRetries = 5;
        const retryDelay = 200; // 200ms
        
        while (retries < maxRetries) {
            try {
                console.log(`🎨 Attempt ${retries + 1} to load settings...`);
                
                const tauriAPI = await this._getApi();
                if (tauriAPI) {
                    const config = await tauriAPI.invoke('get_config');
                    console.log('🎨 Config loaded from backend:', config);
                    
                    if (config && config.theme) {
                        console.log('🎨 Applying saved theme:', config.theme);
                        this.applySettings(config);
                        return; // Successo, esci dal loop
                    } else {
                        console.log('🎨 No theme in config, will try again...');
                    }
                }
                
                retries++;
                if (retries < maxRetries) {
                    console.log(`🎨 Backend not ready, retrying in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            } catch (error) {
                console.log(`🎨 Error loading config (attempt ${retries + 1}):`, error);
                retries++;
                if (retries < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }
        
        // Se arriviamo qui, non siamo riusciti a caricare le impostazioni salvate
        console.log('🎨 Could not load saved settings, applying minimal default theme');
        this.applyMinimalDefaultTheme();
    }

    applyDefaultTheme() {
        console.log('🎨 Applying default theme');
        const defaultTheme = {
            name: 'warp-dark',
            background: '#1e2124',
            foreground: '#ffffff',
            cursor: '#00d4aa',
            accent: '#00d4aa'
        };
        this.applyTheme(defaultTheme);
    }

    applyMinimalDefaultTheme() {
        console.log('🎨 Applying minimal default theme (no red background)');
        // Applica solo i colori essenziali per evitare lo sfondo rosso
        // senza sovrascrivere eventuali temi già applicati
        const terminal = this.container;
        if (terminal && !terminal.style.backgroundColor) {
            // Applica solo se non c'è già un colore di sfondo
            terminal.style.backgroundColor = '#1e2124';
            terminal.style.color = '#ffffff';
        }
        
        // Applica le variabili CSS solo se non sono già impostate
        const root = document.documentElement;
        if (!root.style.getPropertyValue('--terminal-bg')) {
            root.style.setProperty('--terminal-bg', '#1e2124');
            root.style.setProperty('--terminal-fg', '#ffffff');
            root.style.setProperty('--terminal-cursor', '#00d4aa');
            root.style.setProperty('--terminal-accent', '#00d4aa');
        }
    }

    setupBackendAvailabilityCheck() {
        // Controlla periodicamente se il backend diventa disponibile
        // per caricare le impostazioni salvate
        let checkCount = 0;
        const maxChecks = 10;
        const checkInterval = 1000; // 1 secondo
        
        const checkBackend = async () => {
            if (checkCount >= maxChecks) {
                console.log('🎨 Backend availability check completed');
                return;
            }
            
            checkCount++;
            console.log(`🎨 Checking backend availability (${checkCount}/${maxChecks})...`);
            
            try {
                const tauriAPI = await this._getApi();
                if (tauriAPI) {
                    const config = await tauriAPI.invoke('get_config');
                    if (config && config.theme) {
                        console.log('🎨 Backend available, applying saved theme:', config.theme);
                        this.applySettings(config);
                        return; // Trovato, esci
                    }
                }
            } catch (error) {
                console.log(`🎨 Backend still not ready (attempt ${checkCount}):`, error.message);
            }
            
            // Continua a controllare
            setTimeout(checkBackend, checkInterval);
        };
        
        // Inizia il controllo dopo un breve delay
        setTimeout(checkBackend, 500);
    }

    handleKeydown(e) {
        console.log('Keydown event:', e.key, 'target:', e.target);
        // Se siamo in modalità password, gestisci diversamente
        if (this.passwordMode) {
            return this.handlePasswordKeydown(e);
        }

        // Se siamo in modalità PTY e la sessione è attiva, invia i tasti direttamente al PTY
        if (this.isPTYMode && this.ptyTerminal && this.ptyTerminal.isActive) {
            return this.handlePTYKeydown(e);
        }

        // Gestione combinazioni di tasti (Cmd/Ctrl)
        if (e.metaKey || e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'c':
                    // In modalità PTY, Ctrl+C invia interrupt
                    if (this.isPTYMode && this.ptyTerminal && this.ptyTerminal.isActive) {
                        e.preventDefault();
                        this.ptyTerminal.sendInterrupt();
                        return;
                    }
                    this.handleCopy(e);
                    return;
                case 'v':
                    this.handlePaste(e);
                    return;
                case 'a':
                    // Cmd/Ctrl + A: seleziona SOLO la linea corrente di input
                    e.preventDefault();
                    this.handleSelectInputLine();
                    return;
                case 'e':
                    // Ctrl+E - Vai alla fine della riga
                    e.preventDefault();
                    this.cursorPosition = this.currentLine.length;
                    this.showPrompt();
                    return;
                case 'k':
                    e.preventDefault();
                    this.clearTerminal();
                    return;
                case 'l':
                    e.preventDefault();
                    this.clearTerminal();
                    return;
                case 'd':
                    // Ctrl+D - EOF
                    if (this.isPTYMode && this.ptyTerminal && this.ptyTerminal.isActive) {
                        e.preventDefault();
                        this.ptyTerminal.sendEOF();
                        return;
                    }
                    break;
                case 'end':
                case 'j':
                    // Ctrl+J o Cmd+End - Vai in fondo al terminale
                    e.preventDefault();
                    this.forceScrollToBottom();
                    return;
                default:
                    // Lascia passare altre combinazioni (come Cmd+, per settings)
                    return;
            }
        }

        // Gestione tasti speciali
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.navigateHistory(-1);
            return;
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.navigateHistory(1);
            return;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            this.handleArrowKey(e.key);
            return;
        } else if (e.key === 'Home') {
            e.preventDefault();
            this.cursorPosition = 0;
            this.showPrompt();
            return;
        } else if (e.key === 'End') {
            e.preventDefault();
            this.cursorPosition = this.currentLine.length;
            this.showPrompt();
            return;
        } else if (e.key === 'PageDown') {
            e.preventDefault();
            this.forceScrollToBottom();
            return;
        } else if (e.key === 'Delete') {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
                e.preventDefault();
                const removed = this.handleDeleteSelectedLines();
                if (removed) return;
            }
            e.preventDefault();
            this.handleDelete();
            return;
        }

        // Gestione tasti normali
        e.preventDefault();
        
        if (e.key === 'Enter') {
            this.processCommand();
        } else if (e.key === 'Backspace') {
            this.handleBackspace();
        } else if (e.key === 'Tab') {
            this.handleTab();
        } else if (e.key.length === 1) {
            this.addCharacter(e.key);
        }
    }

    addCharacter(char) {
        // Se c'è selezione sulla linea di input, rimpiazza
        if (this.isInputSelectionActive()) {
            this.currentLine = '';
            this.cursorPosition = 0;
        }
        // Inserisce il carattere nella posizione del cursore
        this.currentLine = 
            this.currentLine.substring(0, this.cursorPosition) + 
            char + 
            this.currentLine.substring(this.cursorPosition);
        this.cursorPosition++;
        this.showPrompt();
    }

    handleBackspace() {
        if (this.isInputSelectionActive()) {
            // Cancella intera selezione
            this.currentLine = '';
            this.cursorPosition = 0;
            this.clearInputSelection();
            this.showPrompt();
            return;
        }
        if (this.cursorPosition > 0) {
            // Rimuove il carattere prima del cursore
            this.currentLine = 
                this.currentLine.substring(0, this.cursorPosition - 1) + 
                this.currentLine.substring(this.cursorPosition);
            this.cursorPosition--;
            this.showPrompt();
        }
    }

    handleDelete() {
        if (this.isInputSelectionActive()) {
            this.currentLine = '';
            this.cursorPosition = 0;
            this.clearInputSelection();
            this.showPrompt();
            return;
        }
        if (this.cursorPosition < this.currentLine.length) {
            // Rimuove il carattere dopo il cursore
            this.currentLine = 
                this.currentLine.substring(0, this.cursorPosition) + 
                this.currentLine.substring(this.cursorPosition + 1);
            this.showPrompt();
        }
    }

    handleDeleteSelectedLines() {
        if (!this.outputElement) return false;
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return false;
        const lines = Array.from(this.outputElement.querySelectorAll('.output-line'));
        let removed = 0;
        lines.forEach(line => {
            try {
                if (sel.containsNode(line, true)) {
                    line.remove();
                    removed++;
                }
            } catch (_) { /* containsNode fallback non necessario */ }
        });
        if (removed > 0) {
            sel.removeAllRanges();
            // Non aggiungiamo output per evitare di "sporcare" il terminale dopo la rimozione
            console.log(`Deleted ${removed} line(s) from terminal output.`);
            return true;
        }
        return false;
    }

    handleArrowKey(key) {
        if (key === 'ArrowLeft' && this.cursorPosition > 0) {
            this.cursorPosition--;
            this.showPrompt();
        } else if (key === 'ArrowRight' && this.cursorPosition < this.currentLine.length) {
            this.cursorPosition++;
            this.showPrompt();
        }
    }

    handleTab() {
        // Autocompletamento comandi
        if (this.currentLine.trim()) {
            this.handleAutoComplete();
        } else {
            // Aggiungi tab alla posizione del cursore
            this.currentLine = 
                this.currentLine.substring(0, this.cursorPosition) + 
                '    ' + 
                this.currentLine.substring(this.cursorPosition);
            this.cursorPosition += 4;
            this.showPrompt();
        }
    }

    // Gestione copia/incolla
    handleCopy(e) {
        const selection = window.getSelection();
        if (selection.toString().length > 0) {
            // Se c'è testo selezionato, usa il comportamento predefinito
            return;
        } else {
            // Se non c'è selezione, copia la linea corrente
            e.preventDefault();
            navigator.clipboard.writeText(this.currentLine).then(() => {
                this.addOutput('📋 Current line copied to clipboard');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    }

    async handlePaste(e) {
        e.preventDefault();
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                // Pulisce il testo da caratteri di controllo e newlines
                const cleanText = text.replace(/[\r\n]+/g, ' ').trim();
                // Inserisce il testo nella posizione del cursore
                this.currentLine = 
                    this.currentLine.substring(0, this.cursorPosition) + 
                    cleanText + 
                    this.currentLine.substring(this.cursorPosition);
                this.cursorPosition += cleanText.length;
                this.showPrompt();
                this.addOutput('📋 Text pasted from clipboard');
            }
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            this.addOutput('❌ Failed to paste from clipboard');
        }
    }

    handleSelectAll() {
        // Seleziona output + linea di input corrente
        const selection = window.getSelection();
        if (!selection) return;
        selection.removeAllRanges();
        const range = document.createRange();
        const contentRoot = this.container.querySelector('.simple-terminal-content');
        if (contentRoot) {
            range.selectNodeContents(contentRoot);
            selection.addRange(range);
        }
    }

    handleSelectInputLine() {
        const selection = window.getSelection();
        if (!selection) return;
        selection.removeAllRanges();
        const inputLine = this.container.querySelector('.terminal-input-line');
        if (!inputLine) return;
        const range = document.createRange();
        range.selectNodeContents(inputLine.querySelector('.input-text'));
        selection.addRange(range);
    }

    isInputSelectionActive() {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return false;
        const inputText = this.container.querySelector('.input-text');
        if (!inputText) return false;
        // Verifica che la selezione ricada tutta dentro input-text
        for (let i = 0; i < sel.rangeCount; i++) {
            const range = sel.getRangeAt(i);
            if (!inputText.contains(range.startContainer) || !inputText.contains(range.endContainer)) {
                return false;
            }
        }
        // Selezione completa? (facoltativo) - la usiamo solo come stato
        return true;
    }

    clearInputSelection() {
        const sel = window.getSelection();
        if (sel) sel.removeAllRanges();
    }

    // Navigazione cronologia comandi
    navigateHistory(direction) {
        if (this.history.length === 0) return;

        if (direction === -1) { // Arrow Up
            if (this.historyIndex === -1) {
                this.historyIndex = this.history.length - 1;
            } else if (this.historyIndex > 0) {
                this.historyIndex--;
            }
        } else { // Arrow Down
            if (this.historyIndex === -1) return;
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
            } else {
                this.historyIndex = -1;
                this.currentLine = '';
                this.cursorPosition = 0;
                this.showPrompt();
                return;
            }
        }

        if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
            this.currentLine = this.history[this.historyIndex];
            this.cursorPosition = this.currentLine.length; // Cursore alla fine
            this.showPrompt();
        }
    }

    // Autocompletamento comandi
    handleAutoComplete() {
        const commands = [
            'ai', 'ask', 'execute', 'run', 'help', 'clear', 'exit',
            'ls', 'pwd', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep',
            'ps', 'top', 'kill', 'chmod', 'chown', 'find', 'locate',
            'git', 'npm', 'node', 'python', 'pip', 'brew', 'curl', 'wget'
        ];

        const currentWord = this.currentLine.split(' ').pop();
        const matches = commands.filter(cmd => cmd.startsWith(currentWord));

        if (matches.length === 1) {
            // Completa automaticamente
            const words = this.currentLine.split(' ');
            words[words.length - 1] = matches[0];
            this.currentLine = words.join(' ') + ' ';
            this.cursorPosition = this.currentLine.length;
            this.showPrompt();
        } else if (matches.length > 1) {
            // Mostra opzioni disponibili
            this.addOutput(`💡 Available completions: ${matches.join(', ')}`);
            this.showPrompt();
        } else {
            // Nessuna corrispondenza, aggiungi tab normale alla posizione cursore
            this.currentLine = 
                this.currentLine.substring(0, this.cursorPosition) + 
                '    ' + 
                this.currentLine.substring(this.cursorPosition);
            this.cursorPosition += 4;
            this.showPrompt();
        }
    }

    async processCommand() {
        const command = this.currentLine.trim();
        
        // Se siamo in modalità password, gestisci diversamente
        if (this.passwordMode) {
            await this.handlePasswordInput();
            return;
        }
        
        // Mostra il comando eseguito
        this.addOutput('$ ' + command);
        
        // Aggiungi alla cronologia e resetta indice
        if (command) {
            this.history.push(command);
            this.historyIndex = -1; // Reset indice dopo nuovo comando
        }

        if (this.isInteractiveCommand(command)) {
            await this.launchInteractiveCommand(command);
            this.currentLine = '';
            this.cursorPosition = 0;
            this.showPrompt();
            return;
        }

        // Controlla se il comando dovrebbe usare PTY
        const shouldUsePTY = this.shouldUsePTY(command);
        console.log(`SimpleTerminal: shouldUsePTY(${command}) = ${shouldUsePTY}`);
        
        if (shouldUsePTY) {
            console.log('SimpleTerminal: Using PTY execution');
            await this.executeWithPTY(command);
        } else {
            console.log('SimpleTerminal: Using traditional execution');
            // Usa il sistema tradizionale per comandi semplici
            await this.executeWithTraditionalSystem(command);
        }

        // Reset per nuovo comando
        this.currentLine = '';
        this.cursorPosition = 0;
        this.showPrompt();
    }

    shouldUsePTY(command) {
        if (!this.ptyModeEnabled || !this.ptyTerminal) {
            return false;
        }

        if (this.isInteractiveCommand(command)) {
            return false;
        }

        // Comandi interni che non necessitano PTY
        const internalCommands = [
            'clear', 'help', 'exit', 'enable-pty', 'disable-pty', 'pty-status',
            'save-ai-chat', 'clear-ai-chat', 'show-ai-chat', 'toggle-autoscroll',
            'scroll-bottom', 'autoscroll-status', 'toggle-smooth-scroll',
            'debug-fonts', 'debug-cursor', 'install-homebrew'
        ];

        if (internalCommands.includes(command) || 
            command.startsWith('cursor-') ||
            command.startsWith('ai ') || command.startsWith('ask ') ||
            command.startsWith('execute ') || command.startsWith('run ')) {
            return false;
        }

        // Usa PTY solo per comandi specifici che ne hanno bisogno
        const ptyCommands = [
            'npm install', 'npm run', 'yarn install', 'yarn add', 'yarn remove',
            'pip install', 'pip download', 'pip uninstall',
            'brew install', 'brew upgrade', 'brew uninstall',
            'git clone', 'git pull', 'git push',
            'docker run', 'docker build', 'docker pull', 'docker push',
            'make', 'cmake', 'gcc', 'g++', 'clang',
            'cargo build', 'cargo run', 'cargo install',
            'go build', 'go run', 'go install',
            'mvn install', 'mvn compile', 'gradle build',
            'composer install', 'composer update',
            'gem install', 'gem update',
            // Comandi interattivi che richiedono PTY reale
            'btop', 'htop', 'top', 'nano', 'vim', 'vi', 'emacs', 'less', 'more',
            'man', 'info', 'watch', 'tail -f', 'journalctl -f', 'systemctl status',
            'tmux', 'screen', 'ssh', 'telnet', 'nc', 'netcat'
        ];

        // Controlla se il comando inizia con uno dei comandi PTY
        const shouldUsePty = ptyCommands.some(cmd => {
            return command.startsWith(cmd) || command.includes(cmd + ' ');
        });

        if (!shouldUsePty) {
            return false;
        }

        // I comandi sudo usano il sistema sicuro di password
        if (command.startsWith('sudo ')) {
            return false; // Gestiti separatamente
        }

        // Verifica se è un comando che beneficia del PTY
        const shouldUse = this.ptyCommands.some(cmd => {
            // Controlla se il comando inizia con il comando PTY
            if (command.startsWith(cmd)) return true;
            
            // Controlla se il comando contiene il comando PTY seguito da spazio
            if (command.includes(cmd + ' ')) return true;
            
                    // Controlli speciali per comandi specifici
        if (cmd === 'npm install' && command.includes('npm install')) return true;
        if (cmd === 'yarn install' && command.includes('yarn install')) return true;
        if (cmd === 'pip install' && command.includes('pip install')) return true;
        
        // Fix temporaneo: NON usare PTY per npm install, esegui direttamente
        if (command.includes('npm install')) return false;
            
            return false;
        }) ||
        command.includes('curl -fsSL') && command.includes('install.sh') ||
        command.includes('|') || // Pipes
        command.includes('&&') || // Comandi concatenati
        command.includes('npm ') || // Tutti i comandi npm
        command.includes('yarn ') || // Tutti i comandi yarn
        command.includes('pip ') || // Tutti i comandi pip
        command.includes('brew ') || // Tutti i comandi brew
        command.includes('apt ') || // Tutti i comandi apt
        command.includes('pacman ') || // Tutti i comandi pacman
        command.includes('yay ') || // Tutti i comandi yay
        command.includes('docker ') || // Tutti i comandi docker
        command.includes('git ') || // Tutti i comandi git
        command.includes('make ') || // Tutti i comandi make
        command.includes('cmake ') || // Tutti i comandi cmake
        command.includes('cargo ') || // Tutti i comandi cargo
        command.includes('go ') || // Tutti i comandi go
        command.includes('mvn ') || // Tutti i comandi maven
        command.includes('gradle ') || // Tutti i comandi gradle
        command.length > 50; // Comandi complessi
        
        // Debug: log per comandi npm install
        if (command.includes('npm install') || command.includes('yarn install')) {
            console.log(`shouldUsePTY(${command}): ${shouldUse}`);
        }
        
        return shouldUse;
    }

    isInteractiveCommand(command) {
        if (!command) {
            return false;
        }

        const interactiveCommands = [
            'top', 'htop', 'btop', 'glances',
            'vim', 'vi', 'nano', 'emacs',
            'less', 'more', 'man', 'info',
            'watch', 'tail -f', 'journalctl -f',
            'tmux', 'screen', 'ssh', 'telnet', 'nc', 'netcat',
            'python', 'python3', 'node', 'ruby', 'perl',
            'mysql', 'psql', 'sqlite3',
        ];

        return interactiveCommands.some((cmd) => {
            return command === cmd || command.startsWith(`${cmd} `);
        });
    }

    async launchInteractiveCommand(command) {
        if (!window.interactiveTerminal) {
            this.addOutput('❌ Terminale interattivo non disponibile in questa build.');
            return;
        }

        try {
            this.addOutput(`🖥️ Aprendo terminale interattivo per: ${command}`);
            this.isPTYMode = false;
            this.updatePTYStatusIndicator();
            await window.interactiveTerminal.openTerminal(command, this.cwd);
            this.addOutput('ℹ️ Premi `q` o ⌃C all\'interno della sessione per uscire. Usa ESC o la ✕ per chiudere la finestra.');
        } catch (error) {
            console.error('Failed to launch interactive terminal:', error);
            this.addOutput(`❌ Impossibile avviare terminale interattivo: ${error.message || error}`);
        }
    }

    async executeWithPTY(command) {
        try {
            console.log(`SimpleTerminal: executeWithPTY called with command: ${command}`);
            let loadingStartTime = null;
            
            // Mostra l'indicatore di loading per comandi PTY (tendenzialmente più lunghi)
            if (this.shouldShowLoading(command)) {
                loadingStartTime = Date.now();
                console.log(`SimpleTerminal: Showing loading indicator for PTY command: ${command}`);
                this.showLoadingIndicator(command, {
                    timeout: 300000, // 5 minuti per comandi PTY
                    style: 'spinner',
                    message: `Running in PTY: ${command}`
                });
            }
            
            this.isPTYMode = true;
            console.log(`SimpleTerminal: PTY mode enabled, isActive: ${this.ptyTerminal.isActive}`);
            
            // Assicurati che la sessione PTY sia attiva
            if (!this.ptyTerminal.isActive) {
                console.log(`SimpleTerminal: Starting PTY session...`);
                const started = await this.ptyTerminal.startSession();
                if (!started) {
                    throw new Error('Failed to start PTY session');
                }
                console.log(`SimpleTerminal: PTY session started successfully`);
            }

            // Aggiorna l'indicatore dello stato PTY
            this.updatePTYStatusIndicator();

            // Invia il comando al PTY
            console.log(`SimpleTerminal: Sending command to PTY: ${command}`);
            const success = await this.ptyTerminal.sendCommand(command);
            console.log(`SimpleTerminal: PTY sendCommand result: ${success}`);
            if (!success) {
                throw new Error('Failed to send command to PTY');
            }

            // Il PTY gestirà l'output in tempo reale attraverso il polling
            // Il loading indicator verrà rimosso quando il comando completa in onPTYCommandComplete
            console.log(`SimpleTerminal: Command sent to PTY, waiting for output...`);
            
        } catch (error) {
            console.error('PTY execution failed:', error);
            this.hideLoadingIndicator();
            this.addOutput(`❌ PTY execution failed: ${error.message}`);
            this.addOutput('🔄 Falling back to traditional execution...');
            await this.executeWithTraditionalSystem(command);
        }
    }

    async executeInstallCommand(command) {
        try {
            this.addOutput(`🚀 Executing: ${command}`);
            
            // Mostra loading indicator
            this.showLoadingIndicator(command, {
                timeout: 300000, // 5 minuti
                style: 'spinner',
                message: `Installing packages: ${command}`
            });

            // Esegui il comando con output in tempo reale
            const api5 = await this._getApi();
            const result = api5?.invoke
                ? await api5.invoke('run_command', {
                      payload: {
                          command,
                      },
                  })
                : '[fallback]';
            
            // Nascondi loading indicator
            this.hideLoadingIndicator();
            
            if (result.success) {
                // Mostra l'output del comando
                if (result.output) {
                    this.addOutput(result.output);
                }
                this.addOutput(`✅ Command completed successfully`);
            } else {
                this.addOutput(`❌ Command failed: ${result.error || 'Unknown error'}`);
                if (result.output) {
                    this.addOutput(result.output);
                }
            }
        } catch (error) {
            this.hideLoadingIndicator();
            this.addOutput(`❌ Error executing command: ${error.message}`);
        }
    }

    async executeWithTraditionalSystem(command) {
        // Processa il comando con il sistema tradizionale
        if (command === 'clear') {
            this.clearTerminal();
        } else if (command === 'help') {
            this.showHelp();
        } else if (command === 'exit') {
            window.close();
        } else if (command === 'debug-fonts') {
            this.showAvailableFonts();
        } else if (command === 'debug-cursor') {
            this.showCursorStyles();
        } else if (command === 'refresh-config') {
            const api = await this.getTauriAPI();
            if (api?.invoke) {
                try {
                    const cfg = await api.invoke('get_config');
                    this.applySettings(cfg);
                    this.addOutput('🔄 Config ricaricata dal backend');
                } catch (e) {
                    this.addOutput('❌ Errore reload config: ' + e.message);
                }
            } else {
                this.addOutput('⚙️ Backend non disponibile (refresh-config)');
            }
        } else if (command.startsWith('cursor-')) {
            this.testCursorStyle(command.replace('cursor-', ''));
        } else if (command.startsWith('theme-')) {
            this.testTheme(command.replace('theme-', ''));
        } else if (command === 'test-themes') {
            this.testAllThemes();
        } else if (command === 'test-cursors') {
            this.testAllCursorStyles();
        } else if (command.startsWith('ai ') || command.startsWith('ask ') || 
                   command.startsWith('execute ') || command.startsWith('run ')) {
            await this.processAICommand(command);
        } else if (command) {
            // Prova a eseguire il comando reale
            await this.executeCommand(command);
        }

        // Reset per nuovo comando
        this.currentLine = '';
        this.showPrompt();
    }

    async processAICommand(command) {
        let thinkingLine = null;

        try {
            const trimmed = (command || '').trim();
            const match = trimmed.match(/^(ai|ask|execute|run)\s+/i);
            const keyword = match ? match[1].toLowerCase() : 'ai';
            const question = match ? trimmed.slice(match[0].length).trim() : trimmed;
            const expectCommand = keyword !== 'ask';

            if (!question) {
                this.addAIOutput('⚠️ Specifica una richiesta per l\'assistente AI.');
                return;
            }

            this.clearAISuggestions();

            this.aiConversation.push({ role: 'user', text: question });
            this.addAIOutput(`🙋 ${question}`);

            thinkingLine = this.addAIOutput('🤖 Sto elaborando...');

            const aiConfig = await this.ensureAIConfigLoaded();
            if (!aiConfig || (aiConfig.provider && aiConfig.provider === 'disabled')) {
                this.updateAILineWithText(thinkingLine, '⚠️ L\'assistente AI è disabilitato nelle impostazioni.');
                return;
            }

            const systemInfo = await this.ensureSystemInfo();
            const currentCwd = this.cwd || systemInfo?.homeDir || '~';
            const directorySnapshots = await this.collectDirectorySnapshots(systemInfo, currentCwd, expectCommand);

            const contextLines = this.getRecentTerminalContext(aiConfig.context_lines || 5);
            const rawResponse = await this.invokeAIProvider(question, {
                expectCommand,
                keyword,
                contextLines,
                originalQuestion: question,
                systemInfo,
                cwd: currentCwd,
                directorySnapshots,
            });

            const aiResult = this.parseAIResult(rawResponse, {
                expectCommand,
                originalQuestion: question,
            });

            await this.presentAIResult(aiResult, {
                thinkingLine,
                expectCommand,
                originalQuestion: question,
            });
        } catch (mainError) {
            console.error('processAICommand error:', mainError);

            if (!thinkingLine) {
                thinkingLine = this.addAIOutput('🤖');
            }

            try {
                const fallback = await this.executeAICommandDirect(command);
                const fallbackText = typeof fallback === 'string'
                    ? fallback
                    : (fallback?.output || JSON.stringify(fallback));
                this.updateAILineWithText(thinkingLine, `🤖 ${fallbackText}`);
                this.aiConversation.push({ role: 'assistant', text: fallbackText });
            } catch (fallbackError) {
                console.error('AI fallback failed:', fallbackError);
                this.updateAILineWithText(thinkingLine, `❌ Errore AI: ${mainError.message || mainError}`);
            }
        }
    }

    parseAIResult(rawResponse, options = {}) {
        const { expectCommand = false } = options || {};
        const text = typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse || '');
        const json = this.extractJSONFromText(text);
        const fallbackSummary = 'Comando suggerito dall\'AI';

        const normalizeCommandItem = (entry, defaultExplanation) => {
            if (!entry) {
                return null;
            }

            if (typeof entry === 'string') {
                const commandText = entry.trim();
                if (!commandText) {
                    return null;
                }
                return {
                    command: commandText,
                    explanation: defaultExplanation || fallbackSummary,
                };
            }

            if (typeof entry === 'object') {
                const commandText = (entry.command || entry.shell || entry.cmd || entry.value || entry.text || '')
                    .toString()
                    .trim();

                if (!commandText) {
                    return null;
                }

                const rawDanger = entry.danger ?? entry.warning ?? entry.risk ?? false;
                const danger = typeof rawDanger === 'string'
                    ? ['true', 'yes', 'y', 'danger', 'warning', 'warn'].includes(rawDanger.toLowerCase())
                    : rawDanger === true;

                return {
                    command: commandText,
                    explanation: entry.explanation || entry.summary || entry.reason || defaultExplanation || fallbackSummary,
                    summary: entry.summary || defaultExplanation || fallbackSummary,
                    notes: entry.notes || entry.details || entry.comment || '',
                    danger,
                    cwd: entry.cwd || entry.directory || entry.path || '',
                };
            }

            return null;
        };

        if (json) {
            const mode = (json.mode || json.type || '').toString().toLowerCase();
            const summary = json.summary || json.explanation || json.response || json.text || json.message || '';
            const commands = [];

            if (Array.isArray(json.commands)) {
                json.commands.forEach((item) => {
                    const normalized = normalizeCommandItem(item, summary);
                    if (normalized) {
                        commands.push(normalized);
                    }
                });
            }

            if (!commands.length && Array.isArray(json.command)) {
                json.command.forEach((item) => {
                    const normalized = normalizeCommandItem(item, summary);
                    if (normalized) {
                        commands.push(normalized);
                    }
                });
            }

            if (!commands.length && json.command) {
                const normalized = normalizeCommandItem(json.command, summary);
                if (normalized) {
                    commands.push(normalized);
                }
            }

            if (!commands.length && Array.isArray(json.actions)) {
                json.actions.forEach((item) => {
                    const normalized = normalizeCommandItem(item, summary);
                    if (normalized) {
                        commands.push(normalized);
                    }
                });
            }

            if (!commands.length && json.next_command) {
                const normalized = normalizeCommandItem(json.next_command, summary);
                if (normalized) {
                    commands.push(normalized);
                }
            }

            if (commands.length) {
                return {
                    type: 'suggestion',
                    summary: summary || commands[0].explanation || fallbackSummary,
                    commands,
                };
            }

            if (summary) {
                return {
                    type: 'informational',
                    text: summary,
                };
            }

            if (mode === 'informational' && (json.response || json.message)) {
                return {
                    type: 'informational',
                    text: json.response || json.message,
                };
            }
        }

        if (expectCommand) {
            const codeBlockMatch = text.match(/```(?:bash|sh|shell)?\s*([\s\S]*?)```/i);
            const codeCandidate = codeBlockMatch ? codeBlockMatch[1] : '';
            const codeLine = codeCandidate
                .split(/\r?\n/)
                .map((line) => line.trim())
                .find((line) => line.length > 0);

            const fallbackLine = text
                .split(/\r?\n/)
                .map((line) => line.trim())
                .find((line) => line.length > 0);

            const commandLine = codeLine || fallbackLine;

            if (commandLine) {
                return {
                    type: 'suggestion',
                    summary: fallbackSummary,
                    commands: [
                        {
                            command: commandLine,
                            explanation: fallbackSummary,
                        },
                    ],
                };
            }
        }

        return {
            type: 'informational',
            text,
        };
    }

    extractJSONFromText(text) {
        if (!text || typeof text !== 'string') {
            return null;
        }

        let cleaned = text.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
        }

        try {
            return JSON.parse(cleaned);
        } catch (_) {}

        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch (error) {
                console.warn('Failed to parse JSON from AI response:', error);
            }
        }

        return null;
    }

    async invokeAIProvider(question, options = {}) {
        const aiConfig = this.aiSettings || {};
        let provider = (aiConfig.provider || '').toLowerCase();

        if (!provider && aiConfig.ollama) {
            provider = 'ollama';
        }

        switch (provider) {
            case 'ollama':
                return await this.invokeOllama(question, options);
            default:
                throw new Error(`Provider AI non supportato: ${provider || 'n/d'}`);
        }
    }

    async invokeOllama(question, options = {}) {
        const settings = this.aiSettings?.ollama || {};
        const baseUrl = (settings.base_url || settings.endpoint || 'http://localhost:11434').replace(/\/+$/, '');
        const model = settings.model || 'llama3.1';
        const contextLines = options.contextLines || [];
        const expectCommand = options.expectCommand === true;
        const systemInfo = options.systemInfo || {};
        const cwd = options.cwd || systemInfo.homeDir || this.cwd || '~';
        const directorySnapshots = Array.isArray(options.directorySnapshots)
            ? options.directorySnapshots
            : [];

        const contextBlock = contextLines.length
            ? `Contesto recente del terminale:\n${contextLines.join('\n')}`
            : '';

        const systemLines = [];
        if (systemInfo.platform) {
            const release = systemInfo.release ? ` ${systemInfo.release}` : '';
            systemLines.push(`Sistema operativo: ${systemInfo.platform}${release}`.trim());
        }
        if (systemInfo.arch) {
            systemLines.push(`Architettura: ${systemInfo.arch}`);
        }
        if (systemInfo.shell) {
            systemLines.push(`Shell preferita: ${systemInfo.shell}`);
        }
        if (systemInfo.username || systemInfo.hostname) {
            const identity = [systemInfo.username, systemInfo.hostname].filter(Boolean).join('@');
            if (identity) {
                systemLines.push(`Identità: ${identity}`);
            }
        }
        systemLines.push(`Directory corrente del terminale: ${cwd}`);

        const systemBlock = systemLines.length ? `Informazioni di sistema:\n${systemLines.join('\n')}` : '';

        const dirEntries = [
            ['Home', systemInfo.homeDir],
            ['Desktop', systemInfo.desktopDir],
            ['Documenti', systemInfo.documentsDir],
            ['Download', systemInfo.downloadsDir],
            ['Immagini', systemInfo.picturesDir],
            ['Musica', systemInfo.musicDir],
            ['Video', systemInfo.videosDir],
            ['Public', systemInfo.publicDir],
        ]
            .filter(([, value]) => typeof value === 'string' && value.length);

        const directoriesBlock = dirEntries.length
            ? `Percorsi conosciuti:\n${dirEntries
                .map(([label, value]) => `- ${label}: ${value}`)
                .join('\n')}`
            : '';

        const snapshotBlock = directorySnapshots.length
            ? `Contenuto directory recente:\n${directorySnapshots
                .map((item) => {
                    const list = item.entries
                        .map((entry) => `  - ${entry}`)
                        .join('\n');
                    return `${item.directory}:\n${list}`;
                })
                .join('\n')}`
            : '';

        const exampleJson = `{"mode":"suggestion","summary":"Sposta 1.png nelle Immagini","commands":[{"command":"mkdir -p ~/Pictures && mv ~/Desktop/1.png ~/Pictures/1.png","explanation":"Crea la cartella se manca e sposta il file","notes":"Usa && per creare la cartella solo se assente","danger":false,"cwd":"~"}]}`;

        const guidance = expectCommand
            ? `L'utente desidera un comando pronto all'uso per rispondere a: "${question}".\n\nRestituisci SOLO JSON valido (senza testo aggiuntivo) seguendo queste regole:\n- Usa il campo "mode" con valore "suggestion" quando fornisci comandi.\n- Popola SEMPRE "commands" come array (anche con un solo elemento).\n- Ogni comando deve essere già pronto: combina passaggi multipli con "&&" nell'ordine corretto.\n- Includi "notes" con prerequisiti o avvertenze brevi.\n- Imposta "danger" a true se il comando può causare perdita di dati o modifiche di sistema.\n- Usa percorsi reali dai dati forniti (es. ${systemInfo.picturesDir || '~/Pictures'}).\n- Se una cartella potrebbe mancare, inserisci nel comando la creazione idempotente (es. mkdir -p).\n- Se non è possibile fornire un comando, restituisci JSON con "mode": "informational" e un campo "text" che spiega il motivo.\n- Non usare backtick o formattazioni Markdown.\n- Esempio di risposta valida: ${exampleJson}`
            : `Domanda dell'utente: "${question}". Rispondi in modo conciso e utile per l'uso in un terminale, senza includere testo ridondante.`;

        const instruction = [
            contextBlock,
            systemBlock,
            directoriesBlock,
            snapshotBlock,
            guidance,
        ]
            .filter(Boolean)
            .join('\n\n');

        const messages = [
            {
                role: 'system',
                content: 'Sei TermInA AI, un assistente integrato in un terminale moderno. Rispondi nella stessa lingua dell\'utente e mantieni le risposte concise.',
            },
            {
                role: 'user',
                content: instruction,
            },
        ];

        const headers = {
            'Content-Type': 'application/json',
        };
        if (settings.api_key) {
            headers['Authorization'] = `Bearer ${settings.api_key}`;
        }

        let lastError = null;

        try {
            const response = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model,
                    messages,
                    stream: false,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                return this.extractOllamaContent(data);
            }

            const errorText = await response.text();
            throw new Error(`Ollama /api/chat ${response.status}: ${errorText}`);
        } catch (error) {
            console.warn('Ollama chat endpoint failed:', error);
            lastError = error;
        }

        try {
            const response = await fetch(`${baseUrl}/api/generate`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model,
                    prompt: `${contextBlock}${instruction}`,
                    stream: false,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                return this.extractOllamaContent(data);
            }

            const errorText = await response.text();
            throw new Error(`Ollama /api/generate ${response.status}: ${errorText}`);
        } catch (error) {
            console.error('Ollama generate endpoint failed:', error);
            throw lastError || error;
        }
    }

    extractOllamaContent(data) {
        if (!data) {
            return '';
        }

        if (typeof data === 'string') {
            return data;
        }

        if (data.message && data.message.content) {
            return data.message.content;
        }

        if (Array.isArray(data.messages)) {
            const last = data.messages.filter((item) => item && item.role !== 'system').pop();
            if (last?.content) {
                return last.content;
            }
        }

        if (Array.isArray(data?.content)) {
            return data.content
                .map((part) => (typeof part === 'string' ? part : part?.text || ''))
                .join('\n')
                .trim();
        }

        if (Array.isArray(data?.choices) && data.choices[0]?.message?.content) {
            return data.choices[0].message.content;
        }

        if (data.response) {
            return data.response;
        }

        if (data.output) {
            return data.output;
        }

        return JSON.stringify(data);
    }

    updateAILineWithText(lineElement, text) {
        if (typeof text !== 'string') {
            return;
        }

        const lines = text.split(/\r?\n/);

        if (!lineElement) {
            const first = lines.shift();
            this.addAIOutput(first || '');
            lines.forEach((line) => this.addAIOutput(line));
            return;
        }

        const firstLine = lines.shift();
        if (firstLine !== undefined) {
            lineElement.textContent = firstLine;
        }

        lines.forEach((line) => this.addAIOutput(line));
    }

    async presentAIResult(result, { thinkingLine, expectCommand }) {
        if (!result) {
            this.updateAILineWithText(thinkingLine, '❌ Nessuna risposta dalla AI.');
            return;
        }

        switch (result.type) {
            case 'suggestion':
            case 'auto_execute': {
                const collected = Array.isArray(result.commands) ? result.commands.slice() : [];

                if (!collected.length && result.command) {
                    collected.push({
                        command: result.command,
                        explanation: result.explanation,
                        notes: result.notes,
                        danger: result.danger,
                        cwd: result.cwd,
                    });
                }

                const summary = result.summary
                    || result.explanation
                    || (collected[0]?.explanation)
                    || 'Suggerimento comando dall\'AI';

                if (!collected.length) {
                    const fallbackText = expectCommand
                        ? `${summary} (nessun comando disponibile).`
                        : summary;
                    this.updateAILineWithText(thinkingLine, `🤖 ${fallbackText}`);
                    this.aiConversation.push({ role: 'assistant', text: fallbackText });
                    break;
                }

                this.updateAILineWithText(thinkingLine, `🤖 ${summary}`);

                collected.forEach((entry) => {
                    if (!entry) {
                        return;
                    }
                    const suggestion = typeof entry === 'string' ? { command: entry } : entry;
                    if (!suggestion || !suggestion.command) {
                        return;
                    }
                    this.suggestCommand({
                        command: suggestion.command,
                        explanation: suggestion.explanation || suggestion.summary || summary,
                        summary,
                        notes: suggestion.notes,
                        danger: suggestion.danger,
                        cwd: suggestion.cwd,
                    });
                });

                const conversationText = [
                    summary,
                    ...collected
                        .map((item) => (typeof item === 'string' ? item : item?.command))
                        .filter(Boolean),
                ]
                    .join('\n')
                    .trim();

                this.aiConversation.push({
                    role: 'assistant',
                    text: conversationText || summary,
                });
                break;
            }
            case 'informational':
            default: {
                const text = result.text || 'Nessuna risposta disponibile.';
                this.updateAILineWithText(thinkingLine, `🤖 ${text}`);
                this.aiConversation.push({ role: 'assistant', text });
                break;
            }
        }
    }

    suggestCommand(entry) {
        const data = typeof entry === 'string' ? { command: entry } : (entry || {});
        const command = (data.command || '').trim();
        if (!command) {
            return;
        }

        const summary = data.summary || data.explanation || 'Suggerimento comando dall\'AI';
        const notes = (data.notes || '').toString();
        const cwd = (data.cwd || '').toString();
        const isDangerous = data.danger === true;

        // Crea un elemento di suggerimento comando stile Warp
        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = `ai-command-suggestion${isDangerous ? ' danger' : ''}`;
        
        // Genera un ID unico per questo suggerimento
        const suggestionId = 'suggestion_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Salva il comando in un attributo data per evitare problemi con caratteri speciali
        suggestionDiv.setAttribute('data-command', command);
        suggestionDiv.setAttribute('data-summary', summary);
        if (isDangerous) {
            suggestionDiv.setAttribute('data-danger', 'true');
        }
        if (cwd) {
            suggestionDiv.setAttribute('data-cwd', cwd);
        }
        if (notes) {
            suggestionDiv.setAttribute('data-notes', notes);
        }
        
        const formattedNotes = notes
            ? this.escapeHtml(notes).replace(/\n/g, '<br>')
            : '';

        const cwdHtml = cwd
            ? `<div class="suggestion-meta"><span class="meta-icon">📁</span><span class="meta-label">Directory:</span> <code>${this.escapeHtml(cwd)}</code></div>`
            : '';

        suggestionDiv.innerHTML = `
            <div class="suggestion-header">
                <span class="suggestion-icon">${isDangerous ? '⚠️' : '💡'}</span>
                <span class="suggestion-text">${this.escapeHtml(summary)}</span>
            </div>
            <div class="suggested-command">
                <code>${this.escapeHtml(command)}</code>
            </div>
            ${cwdHtml}
            ${formattedNotes ? `<div class="suggestion-notes">${formattedNotes}</div>` : ''}
            <div class="suggestion-actions">
                <button class="btn-execute" data-suggestion-id="${suggestionId}">
                    ${isDangerous ? '⚠️ Esegui con cautela' : '✅ Esegui'}
                </button>
                <button class="btn-copy" data-suggestion-id="${suggestionId}">
                    📋 Copia
                </button>
                <button class="btn-edit" data-suggestion-id="${suggestionId}">
                    ✏️ Modifica
                </button>
                <button class="btn-dismiss" data-suggestion-id="${suggestionId}">
                    ❌ Ignora
                </button>
            </div>
        `;
        
        this.outputElement.appendChild(suggestionDiv);
        this.scrollToBottom();
        
        // Aggiungi event listeners per i bottoni
        this.attachSuggestionEventListeners(suggestionDiv, suggestionId);
        
        // Aggiungi gli stili se non esistono già
        this.addSuggestionStyles();
    }

    // Metodo helper per escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Attacca event listeners per i bottoni di suggerimento
    attachSuggestionEventListeners(suggestionDiv, suggestionId) {
    const command = suggestionDiv.getAttribute('data-command');
    const summary = suggestionDiv.getAttribute('data-summary') || '';
    const cwd = suggestionDiv.getAttribute('data-cwd') || '';
    const danger = suggestionDiv.getAttribute('data-danger') === 'true';
    const notes = suggestionDiv.getAttribute('data-notes') || '';
        
        // Bottone Esegui
        const executeBtn = suggestionDiv.querySelector('.btn-execute');
        if (executeBtn) {
            executeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.executeAISuggestion(command, {
                    summary,
                    cwd,
                    danger,
                    notes,
                });
            });
        }
        
        // Bottone Copia
        const copyBtn = suggestionDiv.querySelector('.btn-copy');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.copyAISuggestion(command, { summary, cwd, notes });
            });
        }
        
        // Bottone Modifica
        const editBtn = suggestionDiv.querySelector('.btn-edit');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.editAISuggestion(command, { summary, cwd, notes });
            });
        }
        
        // Bottone Ignora
        const dismissBtn = suggestionDiv.querySelector('.btn-dismiss');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.dismissAISuggestion(suggestionDiv);
            });
        }
    }

    executeAISuggestion(command, meta = {}) {
        const details = meta || {};
        if (details.danger && typeof window !== 'undefined') {
            const confirmationMessage = details.summary
                ? `⚠️ ${details.summary}\n\nEseguire comunque il comando suggerito?`
                : '⚠️ Questo comando potrebbe essere rischioso. Procedere?';
            if (!window.confirm(confirmationMessage)) {
                this.addOutput('⛔ Esecuzione annullata.');
                this.clearAISuggestions();
                return;
            }
        }

        const adapted = this.adaptCommandToPlatform(command);
        const targetCwd = (details.cwd || '').trim();
        const finalCommand = targetCwd && targetCwd !== this.cwd
            ? `cd ${this.shellQuote(targetCwd)} && ${adapted}`
            : adapted;

        this.addOutput('$ ' + finalCommand);
        this.executeCommand(finalCommand);
        // Rimuovi tutti i suggerimenti dopo l'esecuzione
        this.clearAISuggestions();
    }

    shellQuote(value) {
        if (!value) {
            return "''";
        }

        if (value === '~') {
            return '~';
        }

        if (/^[\w@\/\.\-]+$/.test(value)) {
            return value;
        }

        return `'${value.split("'").join("'\\''")}'`;
    }

    adaptCommandToPlatform(command) {
        if (!command || typeof command !== 'string') {
            return command;
        }

        const info = this.systemInfo || {};
        const platform = (info.platform || '').toLowerCase();
        let result = command.trim();

        const dirMap = {
            Desktop: info.desktopDir,
            Documents: info.documentsDir,
            Downloads: info.downloadsDir,
            Pictures: info.picturesDir,
            Music: info.musicDir,
            Videos: info.videosDir,
            Public: info.publicDir,
        };

        const quoteForPlatform = (value) => {
            if (!value) return value;
            if (platform === 'win32') {
                return /\s/.test(value) ? `"${value}"` : value;
            }
            return this.shellQuote(value);
        };

        if (platform !== 'win32') {
            const home = info.homeDir || '~';
            result = result.replace(/%USERPROFILE%/gi, home);
            result = result.replace(/%HOMEPATH%/gi, home);

            for (const [label, realPath] of Object.entries(dirMap)) {
                if (!realPath) continue;
                const quoted = quoteForPlatform(realPath);
                const patterns = [
                    new RegExp(`%USERPROFILE%[\\\\/]${label}`, 'gi'),
                    new RegExp(`%HOMEPATH%[\\\\/]${label}`, 'gi'),
                    new RegExp(`~[\\\\/]${label}`, 'g'),
                ];
                patterns.forEach((re) => {
                    result = result.replace(re, quoted);
                });
            }

            result = result.replace(/\\/g, '/');

            if (/^\s*mkdir\s+/i.test(result) && !/\s-+[^\n]*\bp\b/.test(result)) {
                result = result.replace(/^\s*mkdir\s+/i, 'mkdir -p ');
            }
        } else {
            const home = info.homeDir || '%USERPROFILE%';
            result = result.replace(/~\\/g, `${home}\\`);
            result = result.replace(/\$HOME\\/gi, `${home}\\`);
            result = result.replace(/\$HOME\//gi, `${home}\\`);
            result = result.replace(/\//g, '\\');

            for (const [label, realPath] of Object.entries(dirMap)) {
                if (!realPath) continue;
                const patterns = [
                    new RegExp(`~\\${label}`, 'gi'),
                    new RegExp(`~/${label}`, 'gi'),
                ];
                patterns.forEach((re) => {
                    result = result.replace(re, realPath);
                });
            }
        }

        return result;
    }

    copyAISuggestion(command, meta = {}) {
        const payload = (meta?.cwd && meta.cwd !== this.cwd)
            ? `cd ${this.shellQuote(meta.cwd)} && ${command}`
            : command;

        navigator.clipboard.writeText(payload).then(() => {
            this.addOutput('📋 Comando copiato negli appunti');
        });
    }

    editAISuggestion(command, meta = {}) {
        // Inserisce il comando nell'input per permettere modifiche
        const target = (meta?.cwd && meta.cwd !== this.cwd)
            ? `cd ${this.shellQuote(meta.cwd)} && ${command}`
            : command;
        this.currentLine = target;
        this.showPrompt();
        this.clearAISuggestions();
    }

    dismissAISuggestion(suggestionElement) {
        suggestionElement.remove();
    }

    clearAISuggestions() {
        const suggestions = this.outputElement.querySelectorAll('.ai-command-suggestion');
        suggestions.forEach(suggestion => suggestion.remove());
    }

    addSuggestionStyles() {
        if (document.getElementById('ai-suggestion-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ai-suggestion-styles';
        style.textContent = `
            .ai-command-suggestion {
                background: linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(0, 168, 255, 0.1) 100%);
                border: 1px solid rgba(0, 212, 170, 0.3);
                border-radius: 12px;
                padding: 16px;
                margin: 12px 0;
                backdrop-filter: blur(10px);
                animation: slideInSuggestion 0.3s ease-out;
            }

            .ai-command-suggestion.danger {
                background: linear-gradient(135deg, rgba(255, 94, 91, 0.18) 0%, rgba(255, 166, 0, 0.18) 100%);
                border-color: rgba(255, 114, 94, 0.6);
            }
            
            @keyframes slideInSuggestion {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .suggestion-header {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                font-weight: 600;
                color: #00d4aa;
            }

            .ai-command-suggestion.danger .suggestion-header {
                color: #ff5e5b;
            }
            
            .suggestion-icon {
                margin-right: 8px;
                font-size: 16px;
            }
            
            .suggested-command {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                padding: 12px;
                margin: 8px 0;
                font-family: 'Monaco', 'Menlo', monospace;
            }
            
            .suggested-command code {
                color: #ffffff;
                font-size: 14px;
            }
            
            .suggestion-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
                flex-wrap: wrap;
            }
            
            .suggestion-actions button {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                color: #ffffff;
                padding: 6px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                backdrop-filter: blur(5px);
            }
            
            .btn-execute {
                background: rgba(76, 175, 80, 0.2) !important;
                border-color: rgba(76, 175, 80, 0.5) !important;
            }
            
            .btn-execute:hover {
                background: rgba(76, 175, 80, 0.3) !important;
                transform: translateY(-1px);
            }
            
            .btn-copy:hover,
            .btn-edit:hover {
                background: rgba(0, 212, 170, 0.2);
                border-color: rgba(0, 212, 170, 0.5);
                transform: translateY(-1px);
            }
            
            .btn-dismiss {
                background: rgba(244, 67, 54, 0.2) !important;
                border-color: rgba(244, 67, 54, 0.5) !important;
            }
            
            .btn-dismiss:hover {
                background: rgba(244, 67, 54, 0.3) !important;
                transform: translateY(-1px);
            }
        `;
        document.head.appendChild(style);
    }

    async handlePTYKeydown(e) {
        if (!this.ptyTerminal || !this.ptyTerminal.isActive) {
            this.isPTYMode = false;
            this.updatePTYStatusIndicator();
            return;
        }

        const pty = this.ptyTerminal;
        const key = e.key;

        const sendSequence = async (sequence) => {
            try {
                await pty.sendInput(sequence);
            } catch (error) {
                console.error('Failed to send PTY sequence:', error);
            }
        };

        if (e.metaKey || e.ctrlKey) {
            const lower = key.toLowerCase();
            if (lower === 'c') {
                e.preventDefault();
                await pty.sendInterrupt();
                return;
            }
            if (lower === 'd') {
                e.preventDefault();
                await pty.sendEOF();
                return;
            }
            if (lower === 'z') {
                e.preventDefault();
                await pty.sendKill();
                return;
            }
            if (lower === 'l') {
                e.preventDefault();
                await pty.clear();
                return;
            }
            if (lower === 'v') {
                e.preventDefault();
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        await pty.sendInput(text);
                    }
                } catch (err) {
                    console.error('Clipboard paste failed in PTY mode:', err);
                }
                return;
            }
        }

        e.preventDefault();

        switch (key) {
            case 'Enter':
                await pty.sendEnter();
                this.currentLine = '';
                this.cursorPosition = 0;
                this.showPrompt();
                break;
            case 'Backspace':
                await pty.sendBackspace();
                break;
            case 'Tab':
                await pty.sendTab();
                break;
            case 'Escape':
                await pty.sendEscape();
                break;
            case 'ArrowUp':
                await sendSequence('\u001b[A');
                break;
            case 'ArrowDown':
                await sendSequence('\u001b[B');
                break;
            case 'ArrowRight':
                await sendSequence('\u001b[C');
                break;
            case 'ArrowLeft':
                await sendSequence('\u001b[D');
                break;
            case 'Home':
                await sendSequence('\u001b[H');
                break;
            case 'End':
                await sendSequence('\u001b[F');
                break;
            case 'Delete':
                await sendSequence('\u001b[3~');
                break;
            case 'PageUp':
                await sendSequence('\u001b[5~');
                break;
            case 'PageDown':
                await sendSequence('\u001b[6~');
                break;
            default:
                if (key.length === 1) {
                    await pty.sendInput(key);
                }
        }

        this.forceDisplayUpdate();
    }

    updatePTYStatusIndicator() {
        const container = document.getElementById('terminal-container');
        if (container) {
            const active = this.isPTYMode && this.ptyTerminal && this.ptyTerminal.isActive;
            container.dataset.ptyActive = active ? 'true' : 'false';
        }
    }

    shouldShowLoading(command = '') {
        if (!command) return false;
        const longRunningPrefixes = [
            'npm ', 'yarn ', 'pnpm ', 'pip ', 'brew ', 'cargo ', 'go ', 'mvn ',
            'gradle ', 'docker ', 'git ', 'bundle ', 'composer ', 'rails ',
            'watch ', 'tail -f', 'journalctl', 'systemctl ', 'make ', 'cmake '
        ];
        return longRunningPrefixes.some(prefix => command.startsWith(prefix) || command.includes(`${prefix} `));
    }

    showLoadingIndicator(command, options = {}) {
        this.hideLoadingIndicator();

        const message = options.message || `Running: ${command}`;
        const timeout = options.timeout || 0;

        const container = this.container.querySelector('.terminal-output');
        if (!container) return;

        const indicator = document.createElement('div');
        indicator.className = 'terminal-loading-indicator';
        indicator.innerHTML = `
            <div class="terminal-loading-spinner"></div>
            <div class="terminal-loading-text">${message}</div>
        `;

        container.appendChild(indicator);
        this.currentLoadingIndicator = indicator;
        this.loadingDots = 0;
        this.timeoutWarningShown = false;

        if (!document.getElementById('terminal-loading-indicator-styles')) {
            const style = document.createElement('style');
            style.id = 'terminal-loading-indicator-styles';
            style.textContent = `
                .terminal-loading-indicator {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    margin: 12px 0;
                    border-radius: 12px;
                    border: 1px solid rgba(0, 212, 170, 0.2);
                    background: rgba(0, 212, 170, 0.08);
                    color: #e5f8f3;
                    font-size: 13px;
                    backdrop-filter: blur(12px);
                }
                .terminal-loading-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(0, 212, 170, 0.3);
                    border-top-color: rgba(0, 212, 170, 0.9);

                .ai-command-suggestion.danger .suggestion-actions .btn-execute {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 114, 94, 0.6);
                }

                .ai-command-suggestion .suggestion-meta {
                    margin-top: 10px;
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.75);
                    display: flex;
                    gap: 6px;
                    align-items: center;
                }

                .ai-command-suggestion .meta-icon {
                    font-size: 12px;
                }

                .ai-command-suggestion .suggestion-meta .meta-label {
                    font-weight: 600;
                }

                .ai-command-suggestion .suggestion-notes {
                    margin-top: 12px;
                    padding: 10px 12px;
                    background: rgba(255, 255, 255, 0.08);
                    border-radius: 8px;
                    font-size: 13px;
                    line-height: 1.4;
                }
                    border-radius: 50%;
                    animation: terminal-loading-spin 0.8s linear infinite;
                }
                .terminal-loading-text {
                    font-family: 'JetBrains Mono', 'Menlo', monospace;
                    letter-spacing: 0.3px;
                }
                @keyframes terminal-loading-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        const updateMessage = () => {
            if (!this.currentLoadingIndicator) return;
            this.loadingDots = (this.loadingDots + 1) % 4;
            const dots = '.'.repeat(this.loadingDots);
            const textEl = this.currentLoadingIndicator.querySelector('.terminal-loading-text');
            if (textEl) {
                textEl.textContent = `${message}${dots}`;
            }
        };

        this.loadingAnimationFrame = window.setInterval(updateMessage, 400);
        updateMessage();

        if (timeout > 0) {
            this.commandTimeoutTimer = window.setTimeout(() => {
                this.timeoutWarningShown = true;
                this.addOutput(`⏳ Command is taking longer than expected: ${command}`);
            }, timeout);
        }
    }

    hideLoadingIndicator() {
        if (this.currentLoadingIndicator && this.currentLoadingIndicator.remove) {
            this.currentLoadingIndicator.remove();
        }
        this.currentLoadingIndicator = null;

        if (this.loadingAnimationFrame) {
            window.clearInterval(this.loadingAnimationFrame);
            this.loadingAnimationFrame = null;
        }

        if (this.commandTimeoutTimer) {
            window.clearTimeout(this.commandTimeoutTimer);
            this.commandTimeoutTimer = null;
        }
    }

    forceDisplayUpdate() {
        this.scrollToBottom();
        this.updateCursorPosition();
    }

    logTauriDiagnostics() {
        try {
            const raw = window.__TAURI__;
            const adapted = this.api;
            console.group('🔍 Tauri diagnostics');
            console.log('raw __TAURI__:', raw);
            console.log('cached api:', adapted);
            if (adapted && typeof adapted.invoke !== 'function') {
                console.warn('Cached API does not expose invoke:', adapted);
            }
            if (raw && !adapted) {
                console.warn('Raw __TAURI__ available but not cached.');
            }
            console.groupEnd();
        } catch (error) {
            console.error('Failed to collect Tauri diagnostics:', error);
        }
    }

    updateCurrentLine(text) {
        if (!this.outputElement) return;

        let lastLine = this.outputElement.lastElementChild;
        if (!lastLine || !lastLine.classList.contains('output-line')) {
            lastLine = document.createElement('div');
            lastLine.className = 'output-line';
            this.outputElement.appendChild(lastLine);
        }

        lastLine.textContent = text;
        lastLine.dataset.ptyLive = 'true';
        this.scrollToBottom();
    }

    onPTYCommandComplete() {
        this.isPTYMode = false;
        this.updatePTYStatusIndicator();
        this.hideLoadingIndicator();
        this.showPrompt();
        this.forceDisplayUpdate();
    }

    onRustTerminalCommandComplete() {
        this.hideLoadingIndicator();
        this.showPrompt();
        this.forceDisplayUpdate();
    }

    async executeCommand(command) {
        if (!command) {
            return;
        }

        const invoke = async (payload) => {
            try {
                const tauriApi = await this._getApi();
                if (tauriApi && typeof tauriApi.invoke === 'function') {
                    return await tauriApi.invoke('run_command', { payload });
                }
            } catch (error) {
                console.error('❌ invoke(run_command) failed:', error);
                this.addOutput(`❌ invoke(run_command) failed: ${error.message || error}`);
            }
            console.warn('⚠️ run_command invoke unavailable. Payload:', payload, 'API snapshot:', this.api || window.__TAURI__);
            return null;
        };

        const sanitizeArg = (arg) => {
            if (!arg) return "";
            if (arg === '~') return '~';
            const escaped = arg.split("'").join("'\\''");
            return "'" + escaped + "'";
        };

        const payloadBase = {};
        if (this.cwd && this.cwd !== '~') {
            payloadBase.cwd = this.cwd;
        }

        try {
            if (command === 'pwd') {
                const result = await invoke({ ...payloadBase, command: 'pwd' });
                if (result) {
                    const output = (result.stdout || result.output || '').trim();
                    if (output) {
                        this.cwd = output;
                        this.addOutput(output);
                        this.showPrompt();
                    }
                } else {
                    this.addOutput(this.executeFallbackCommand(command));
                }
                return;
            }

            if (command === 'cd' || command.startsWith('cd ')) {
                const target = command.length === 2 ? '' : command.slice(3).trim();
                const resolved = target || '~';
                const cdCommand = `cd ${sanitizeArg(resolved)} && pwd`;
                const result = await invoke({ ...payloadBase, command: cdCommand });
                if (result && result.success) {
                    const newPath = (result.stdout || result.output || '').trim();
                    if (newPath) {
                        this.cwd = newPath;
                        this.addOutput(`📁 Directory changed to ${newPath}`);
                    } else {
                        this.addOutput('❔ Unable to determine the new directory');
                    }
                    this.showPrompt();
                } else if (result) {
                    const errorText = result.stderr || result.output || 'cd failed';
                    this.addOutput(`❌ ${errorText}`);
                } else {
                    this.addOutput(this.executeFallbackCommand(command));
                }
                return;
            }

            const result = await invoke({ ...payloadBase, command });
            if (!result) {
                const fallback = this.executeFallbackCommand(command);
                if (fallback) {
                    this.addOutput(`⚠️ Falling back to simulation (invoke missing).`);
                    this.addOutput(fallback);
                }
                this.logTauriDiagnostics();
                return;
            }

            const printLines = (text, prefix = '') => {
                if (!text) return;
                text.split(/\r?\n/).forEach(line => {
                    if (line.length === 0 && prefix === '') {
                        this.addOutput('');
                    } else {
                        this.addOutput(prefix ? `${prefix} ${line}` : line);
                    }
                });
            };

            if (result.stdout) {
                printLines(result.stdout);
            }

            if (result.stderr) {
                printLines(result.stderr, '⚠️');
            }

            if (!result.stdout && !result.stderr && result.output) {
                printLines(result.output);
            }

            if (!result.success) {
                const msg = result.stderr || result.output || 'Command failed';
                this.addOutput(`❌ ${msg}`);
            }

            if (/^\s*pwd\s*$/.test(command)) {
                const output = (result.stdout || result.output || '').trim();
                if (output) {
                    this.cwd = output;
                }
            }
        } catch (error) {
            console.error('executeCommand error:', error);
            const fallback = this.executeFallbackCommand(command);
            if (fallback) {
                this.addOutput(fallback);
            } else {
                this.addOutput(`❌ ${error.message}`);
            }
        } finally {
            this.showPrompt();
        }
    }

    async openSettings() {
        console.log('Opening settings window...');
        try {
            const tauriAPI = await this._getApi();
            console.log('Tauri API obtained, invoking open_settings_window');
            await tauriAPI.invoke('open_settings_window');
            console.log('Settings window opened successfully');
        } catch (error) {
            console.error('Failed to open settings window:', error);
            this.addOutput('❌ Could not open settings. Is Tauri running?');
        }
    }
}
