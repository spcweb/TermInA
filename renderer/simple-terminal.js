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
        this.ptyModeEnabled = true; // Abilita PTY per default per comandi interattivi
        this.autoScrollEnabled = true; // Abilita scroll automatico
        this.smoothScrollEnabled = true; // Scroll fluido o istantaneo
        this.isUserScrolling = false; // Traccia se l'utente sta scrollando manualmente
        this.contentObserver = null; // Observer per monitorare i cambiamenti di contenuto
        this.currentAIGroup = null; // Contenitore corrente della sessione chat AI
        
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
        this.init();
    }

    init() {
        this.container = document.getElementById('terminal');
        this.createTerminalDisplay();
        this.createCursor();
        this.showWelcome();
        this.showPrompt();
        this.setupEventListeners();
        this.startCursorBlink();
        this.loadInitialSettings();
        this.setupContentObserver(); // Nuovo observer per auto-scroll
        this.startPeriodicAIStatusCheck(); // Controllo periodico status AI
        this.initializePTY(); // Inizializza il PTY terminal
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
        // Prompt arricchito con cwd
        if (!this.cwd) {
            if (window.electronAPI && window.electronAPI.getCwd) {
                window.electronAPI.getCwd().then(cwd => {
                    this.cwd = cwd;
                    this.renderPrompt();
                });
                return;
            }
        }
        this.renderPrompt();
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
        if (window.electronAPI && window.electronAPI.onCwdChanged) {
            window.electronAPI.onCwdChanged((cwd) => {
                this.cwd = cwd;
                this.renderPrompt();
            });
        }
    }

    setupConfigListeners() {
        // Listener per modifiche configurazione
        if (window.electronAPI) {
            window.electronAPI.onSettingsChanged((event, newConfig) => {
                console.log('Ricevute nuove impostazioni:', newConfig);
                this.applySettings(newConfig);
            });
        }
    }

    applySettings(config) {
        try {
            console.log('Applicazione impostazioni:', config);
            
            // Applica tema e colori
            if (config.theme) {
                this.applyTheme(config.theme);
            }

            // Applica impostazioni terminale
            if (config.terminal) {
                this.applyTerminalSettings(config.terminal);
            }

            // Aggiorna status AI
            if (config.ai) {
                this.updateAIStatus(config.ai);
            }

        } catch (error) {
            console.error('Error applying settings:', error);
        }
    }

    updateAIStatus(aiConfig) {
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
                'lm-studio': 'LM Studio'
            };
            
            const providerName = providerNames[aiConfig.provider] || aiConfig.provider;
            aiProviderNameElement.textContent = providerName;
            
            // Test della connessione AI per aggiornare lo status
            this.testAIConnectionStatus(aiConfig, aiStatusElement, aiStatusDot);
            
        } catch (error) {
            console.error('Error updating AI status:', error);
        }
    }

    async testAIConnectionStatus(aiConfig, statusElement, statusDot) {
        try {
            // Imposta status di test (giallo/pulsante)
            statusElement.classList.remove('offline');
            statusDot.style.background = 'linear-gradient(135deg, #ffa502 0%, #ff6348 100%)';
            statusDot.style.boxShadow = '0 0 12px rgba(255, 165, 2, 0.6), 0 0 4px rgba(255, 165, 2, 0.8)';
            
            // Test della connessione
            if (window.electronAPI && window.electronAPI.testAIConnection) {
                const testResult = await window.electronAPI.testAIConnection(aiConfig.provider, aiConfig);
                
                if (testResult.success && testResult.response && 
                    !testResult.response.includes('[AI] Errore') && 
                    !testResult.response.includes('Error')) {
                    
                    // Connesso (verde)
                    statusElement.classList.remove('offline');
                    statusDot.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                    statusDot.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.9), 0 0 4px rgba(16, 185, 129, 1)';
                    console.log('AI Status: Connesso');
                    
                } else {
                    // Disconnesso (rosso)
                    statusElement.classList.add('offline');
                    statusDot.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                    statusDot.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.9), 0 0 4px rgba(239, 68, 68, 1)';
                    console.log('AI Status: Disconnesso - ', testResult.error || 'Risposta non valida');
                }
            } else {
                // API non disponibile (rosso)
                statusElement.classList.add('offline');
                statusDot.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                statusDot.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.9), 0 0 4px rgba(239, 68, 68, 1)';
                console.log('AI Status: API non disponibile');
            }
            
        } catch (error) {
            // Errore di connessione (rosso)
            statusElement.classList.add('offline');
            statusDot.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            statusDot.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.9), 0 0 4px rgba(239, 68, 68, 1)';
            console.error('AI Status: Errore nel test di connessione:', error);
        }
    }

    async refreshAIStatus() {
        try {
            console.log('Refresh manuale dello status AI');
            if (window.electronAPI && window.electronAPI.getConfig) {
                const config = await window.electronAPI.getConfig();
                if (config.ai) {
                    this.updateAIStatus(config.ai);
                }
            }
        } catch (error) {
            console.error('Error refreshing AI status:', error);
        }
    }

    startPeriodicAIStatusCheck() {
        // Controlla lo status dell'AI ogni 30 secondi
        setInterval(async () => {
            try {
                if (window.electronAPI && window.electronAPI.getConfig) {
                    const config = await window.electronAPI.getConfig();
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
        const terminal = this.container;
        if (!terminal) return;

        // Aggiorna variabili CSS globali
        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            root.style.setProperty('--terminal-bg', theme.background || '#1e2124');
            root.style.setProperty('--terminal-fg', theme.foreground || '#ffffff');
            root.style.setProperty('--terminal-cursor', theme.cursor || '#00d4aa');
            root.style.setProperty('--terminal-accent', theme.accent || '#00d4aa');
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
        terminal.style.backgroundColor = theme.background || '#1e2124';
        terminal.style.color = theme.foreground || '#ffffff';

        // Applica colori al cursore
        if (this.cursor) {
            this.cursor.style.color = theme.cursor || '#00d4aa';
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
        if (!terminal) return;

        // Aggiorna variabili CSS globali
        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            
            if (terminalConfig.fontFamily) {
                root.style.setProperty('--terminal-font-family', terminalConfig.fontFamily);
                terminal.style.fontFamily = terminalConfig.fontFamily;
            }

            if (terminalConfig.fontSize) {
                root.style.setProperty('--terminal-font-size', terminalConfig.fontSize + 'px');
                terminal.style.fontSize = terminalConfig.fontSize + 'px';
            }

            if (terminalConfig.lineHeight) {
                root.style.setProperty('--terminal-line-height', terminalConfig.lineHeight);
                terminal.style.lineHeight = terminalConfig.lineHeight;
            }
        }

        // Applica stile cursore
        if (this.cursor && terminalConfig.cursorStyle) {
            this.applyCursorStyle(terminalConfig.cursorStyle);
        }

        // Applica blink del cursore
        if (typeof terminalConfig.cursorBlink !== 'undefined') {
            this.cursorBlinkEnabled = terminalConfig.cursorBlink;
            if (!terminalConfig.cursorBlink && this.cursor) {
                this.cursor.style.opacity = '1';
                this.cursor.style.animation = 'none';
            } else if (this.cursor) {
                this.cursor.style.animation = 'cursor-blink 1s infinite';
            }
        }

        if (typeof terminalConfig.autoScroll !== 'undefined') {
            this.autoScrollEnabled = terminalConfig.autoScroll;
            console.log('Auto-scroll impostato da config:', terminalConfig.autoScroll);
        } else {
            // Assicurati che sia true di default
            this.autoScrollEnabled = true;
            console.log('Auto-scroll impostato di default:', true);
        }
        if (typeof terminalConfig.smoothScroll !== 'undefined') {
            this.smoothScrollEnabled = terminalConfig.smoothScroll;
            console.log('Smooth-scroll impostato da config:', terminalConfig.smoothScroll);
        } else {
            // Assicurati che sia true di default
            this.smoothScrollEnabled = true;
            console.log('Smooth-scroll impostato di default:', true);
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
        try {
            if (window.electronAPI && window.electronAPI.getConfig) {
                const config = await window.electronAPI.getConfig();
                console.log('Caricamento configurazione iniziale:', config);
                this.applySettings(config);
            }
        } catch (error) {
            console.error('Error loading initial configuration:', error);
        }
    }

    handleKeydown(e) {
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
            'gem install', 'gem update'
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
            const result = await window.electronAPI.runCommand(command);
            
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
        } else if (command.includes('npm install') || command.includes('yarn install') || command.includes('pip install')) {
            // Esegui comandi di installazione con output in tempo reale
            await this.executeInstallCommand(command);
        } else if (command === 'exit') {
            window.close();
        } else if (command === 'enable-pty') {
            this.ptyModeEnabled = true;
            this.addOutput('🔧 PTY mode enabled! Interactive commands will now work properly.');
        } else if (command === 'disable-pty') {
            this.ptyModeEnabled = false;
            this.addOutput('🔧 PTY mode disabled. Using standard command execution.');
            if (this.ptyTerminal && this.ptyTerminal.isActive) {
                await this.ptyTerminal.stopSession();
                this.isPTYMode = false;
            }
        } else if (command === 'pty-status') {
            this.addOutput(`🔧 PTY mode: ${this.ptyModeEnabled ? 'ENABLED' : 'DISABLED'}`);
            this.addOutput(`🔌 PTY session: ${this.ptyTerminal && this.ptyTerminal.isActive ? 'ACTIVE' : 'INACTIVE'}`);
            this.addOutput(`⚡ Current mode: ${this.isPTYMode ? 'PTY' : 'TRADITIONAL'}`);
            
            // Ottieni lo status del PTY Manager
            if (window.electronAPI && window.electronAPI.ptyGetSessions) {
                try {
                    const result = await window.electronAPI.ptyGetSessions();
                    if (result.success) {
                        this.addOutput(`📊 Active PTY sessions: ${result.sessions.length}`);
                        result.sessions.forEach(session => {
                            this.addOutput(`   - Session ${session.id}: ${session.type} (buffer: ${session.bufferSize} chars)`);
                        });
                    }
                } catch (error) {
                    this.addOutput(`❌ Error getting PTY status: ${error.message}`);
                }
            }
            
            this.addOutput('📝 PTY mode allows full interactive commands like yay, htop, vim, etc.');
            this.addOutput('💡 Use "enable-pty" or "disable-pty" to toggle this feature.');
            this.addOutput('🔄 Use "pty-restart" to restart the PTY session.');
        } else if (command === 'pty-restart') {
            if (this.ptyTerminal) {
                await this.ptyTerminal.stopSession();
                const started = await this.ptyTerminal.startSession();
                this.addOutput(started ? '✅ PTY session restarted' : '❌ Failed to restart PTY session');
            } else {
                this.addOutput('❌ PTY not initialized');
            }
        } else if (command === 'test-pty-simple') {
            this.addOutput('🧪 Testing PTY with simple command...');
            if (this.ptyTerminal) {
                // Test diretto senza loading indicator
                const started = await this.ptyTerminal.startSession();
                if (started) {
                    this.addOutput('✅ PTY session started');
                    const success = await this.ptyTerminal.sendCommand('echo "PTY test successful"');
                    this.addOutput(success ? '✅ Command sent to PTY' : '❌ Failed to send command');
                    
                    // Aspetta un po' e poi mostra il buffer
                    setTimeout(async () => {
                        try {
                            const result = await window.electronAPI.ptyGetOutput(this.ptyTerminal.sessionId, 0);
                            this.addOutput(`📊 PTY buffer content: ${result.output || 'empty'}`);
                        } catch (error) {
                            this.addOutput(`❌ Error getting PTY output: ${error.message}`);
                        }
                    }, 2000);
                } else {
                    this.addOutput('❌ Failed to start PTY session');
                }
            } else {
                this.addOutput('❌ PTY not available');
            }
        } else if (command === 'test-pty-direct') {
            this.addOutput('🧪 Testing direct PTY output...');
            if (this.ptyTerminal && this.ptyTerminal.isActive) {
                try {
                    const result = await window.electronAPI.ptyGetOutput(this.ptyTerminal.sessionId, 0);
                    this.addOutput(`📊 Direct PTY output: "${result.output || 'empty'}"`);
                    this.addOutput(`📊 Output length: ${result.output ? result.output.length : 0} characters`);
                } catch (error) {
                    this.addOutput(`❌ Error: ${error.message}`);
                }
            } else {
                this.addOutput('❌ PTY session not active');
            }
        } else if (command === 'force-output') {
            this.addOutput('🧪 Forcing PTY output display...');
            if (this.ptyTerminal && this.ptyTerminal.isActive) {
                try {
                    // Forza la lettura dell'output
                    const result = await window.electronAPI.ptyGetOutput(this.ptyTerminal.sessionId, 0);
                    if (result.output && result.output.length > 0) {
                        this.addOutput('📊 PTY has output, displaying it:');
                        this.addOutput(result.output);
                    } else {
                        this.addOutput('📊 PTY buffer is empty');
                    }
                } catch (error) {
                    this.addOutput(`❌ Error: ${error.message}`);
                }
            } else {
                this.addOutput('❌ PTY session not active');
            }
        } else if (command === 'test-pty-api') {
            this.addOutput('🧪 Testing PTY API directly...');
            try {
                // Test creazione sessione
                const createResult = await window.electronAPI.ptyCreateSession();
                this.addOutput(`📊 Create session result: ${JSON.stringify(createResult)}`);
                
                if (createResult.success) {
                    const sessionId = createResult.sessionId;
                    
                    // Test invio comando
                    const writeResult = await window.electronAPI.ptyWrite(sessionId, 'echo "API test"\r');
                    this.addOutput(`📊 Write result: ${JSON.stringify(writeResult)}`);
                    
                    // Test lettura output dopo delay
                    setTimeout(async () => {
                        try {
                            const outputResult = await window.electronAPI.ptyGetOutput(sessionId, 0);
                            this.addOutput(`📊 Output result: ${JSON.stringify(outputResult)}`);
                            
                            // Cleanup
                            await window.electronAPI.ptyKill(sessionId);
                        } catch (error) {
                            this.addOutput(`❌ Error in delayed test: ${error.message}`);
                        }
                    }, 3000);
                }
            } catch (error) {
                this.addOutput(`❌ API test error: ${error.message}`);
            }
        } else if (command === 'test-pty-detection') {
            this.addOutput('🧪 Testing PTY command detection...');
            const testCommands = [
                'npm install lodash',
                'yarn add lodash', 
                'pip install requests',
                'echo "test"',
                'ls -la'
            ];
            
            testCommands.forEach(cmd => {
                const shouldUse = this.shouldUsePTY(cmd);
                this.addOutput(`📊 shouldUsePTY("${cmd}") = ${shouldUse}`);
            });
            
            this.addOutput('💡 Now try: npm install --dry-run lodash');
        } else if (command === 'test-sudo') {
            this.addOutput('🧪 Testing sudo functionality...');
            this.addOutput('💡 Try: sudo ls -la /root');
            this.addOutput('💡 Try: sudo softwareupdate -ia');
            this.addOutput('💡 The system will prompt for password securely.');
        } else if (command === 'test-pty') {
            this.addOutput('🧪 Testing PTY functionality...');
            if (this.ptyTerminal) {
                const started = await this.ptyTerminal.startSession();
                if (started) {
                    this.addOutput('✅ PTY session started successfully');
                    this.addOutput('💡 Try these commands:');
                    this.addOutput('   - htop (if installed)');
                    this.addOutput('   - watch date');
                    this.addOutput('   - ping -c 3 google.com');
                } else {
                    this.addOutput('❌ Failed to start PTY session');
                }
            } else {
                this.addOutput('❌ PTY not available');
            }
        } else if (command === 'save-ai-chat') {
            this.saveAIConversation();
        } else if (command === 'clear-ai-chat') {
            this.clearAIConversation();
        } else if (command === 'show-ai-chat') {
            this.showAIConversation();
        } else if (command === 'toggle-autoscroll') {
            this.toggleAutoScroll();
        } else if (command === 'scroll-bottom') {
            this.forceScrollToBottom();
            this.addOutput('📜 Scrollato in fondo');
        } else if (command === 'autoscroll-status') {
            this.addOutput(`📜 Auto-scroll: ${this.autoScrollEnabled ? 'ABILITATO' : 'DISABILITATO'}`);
            this.addOutput(`📍 Scroll manuale: ${this.isUserScrolling ? 'ATTIVO' : 'INATTIVO'}`);
            this.addOutput(`🌊 Smooth scroll: ${this.smoothScrollEnabled ? 'ABILITATO' : 'DISABILITATO'}`);
            this.addOutput('💡 Usa "toggle-autoscroll" per attivare/disattivare auto-scroll');
            this.addOutput('💡 Usa "toggle-smooth-scroll" per attivare/disattivare smooth scroll');
            this.addOutput('💡 Usa "scroll-bottom" per andare in fondo immediatamente');
        } else if (command === 'toggle-smooth-scroll') {
            this.smoothScrollEnabled = !this.smoothScrollEnabled;
            this.addOutput(`🌊 Smooth scroll: ${this.smoothScrollEnabled ? 'ABILITATO' : 'DISABILITATO'}`);
        } else if (command === 'debug-fonts') {
            this.showAvailableFonts();
        } else if (command === 'debug-cursor') {
            this.showCursorStyles();
        } else if (command.startsWith('cursor-')) {
            this.testCursorStyle(command.replace('cursor-', ''));
        } else if (command === 'install-homebrew') {
            await this.installHomebrew();
        } else if (command.startsWith('ai ') || command.startsWith('ask ') ||
                   command.startsWith('execute ') || command.startsWith('run ')) {
            await this.processAICommand(command);
        } else if (command.startsWith('sudo ')) {
            // Gestione speciale per comandi sudo
            await this.handleSudoCommand(command);
        } else if (command) {
            // Prova a eseguire il comando reale
            await this.executeCommand(command);
        }
    }

    async handleSudoCommand(command) {
        this.addOutput('🔐 Sudo command detected: ' + command);
        this.addOutput('🔑 Please enter your password when prompted...');
        
        try {
            // Usa il sistema sudo sicuro dell'app
            if (window.electronAPI && window.electronAPI.runSudoCommand) {
                // Richiedi la password in modo sicuro
                const password = await this.promptSecurePassword();
                if (password) {
                    this.addOutput('🔄 Executing sudo command...');
                    const result = await window.electronAPI.runSudoCommand(command, password);
                    this.addOutput(result);
                } else {
                    this.addOutput('❌ Password not provided, command cancelled');
                }
            } else {
                this.addOutput('❌ Secure sudo not available, using standard execution');
                await this.executeCommand(command);
            }
        } catch (error) {
            this.addOutput(`❌ Error executing sudo command: ${error.message}`);
        }
    }

    async promptSecurePassword() {
        return new Promise((resolve) => {
            this.addOutput('🔐 Enter your password below:');
            this.passwordMode = true;
            this.currentLine = '';
            this.cursorPosition = 0;
            this.showPrompt();
            
            // Store resolve function to call when password is entered
            this.passwordResolve = resolve;
        });
    }

    // Callback chiamato quando un comando PTY è completato
    onPTYCommandComplete() {
        this.isPTYMode = false;
        
        // Nascondi il loading indicator se presente
        this.hideLoadingIndicator();
        
        // Aggiorna lo stato del PTY indicator
        this.updatePTYStatusIndicator();
        
        // Debug: log command completion
        console.log('PTY command completed');
    }

    // Mostra un prompt per la password
    showPasswordPrompt(promptText) {
        this.addOutput('🔐 Password required:');
        this.addOutput(promptText.trim());
        this.addOutput('💡 Type your password and press Enter (input will be hidden)');
        
        // Attiva modalità password
        this.passwordMode = true;
        this.currentLine = '';
        this.cursorPosition = 0;
        this.showPrompt();
    }

    // Gestisce l'input in modalità password
    async handlePasswordInput() {
        if (!this.passwordMode) {
            return;
        }

        const password = this.currentLine;
        this.passwordMode = false;
        
        // Nasconde la password nell'output
        this.addOutput('🔐 [Password entered]');
        
        // Se c'è una resolve function in attesa (per sudo), chiamala
        if (this.passwordResolve) {
            const resolve = this.passwordResolve;
            this.passwordResolve = null;
            resolve(password);
        } else if (this.ptyTerminal) {
            // Altrimenti invia al PTY
            const success = await this.ptyTerminal.sendInput(password + '\r');
            if (success) {
                this.addOutput('🔄 Password sent, continuing...');
            } else {
                this.addOutput('❌ Failed to send password');
            }
        }

        // Reset della linea
        this.currentLine = '';
        this.cursorPosition = 0;
        this.showPrompt();
    }

    // Metodo per aggiornare la linea corrente (usato dal PTY per output parziale)
    updateCurrentLine(text) {
        // Debug: log dell'aggiornamento della linea corrente
        console.log('SimpleTerminal updateCurrentLine:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        
        // Questo metodo può essere usato per aggiornare l'output in tempo reale
        // durante l'esecuzione di comandi PTY
        const lastLine = this.outputElement.lastElementChild;
        if (lastLine && lastLine.classList.contains('pty-live-output')) {
            lastLine.textContent = text;
        } else {
            const line = document.createElement('div');
            line.className = 'output-line pty-live-output';
            line.textContent = text;
            this.outputElement.appendChild(line);
        }
    }

    // Forza l'aggiornamento del display per output dinamici
    forceDisplayUpdate() {
        // Forza il reflow del DOM per aggiornamenti immediati
        if (this.outputElement) {
            this.outputElement.offsetHeight; // Trigger reflow
        }
        
        // Se l'auto-scroll è abilitato e l'utente non sta scrollando manualmente
        if (this.autoScrollEnabled && !this.isUserScrolling) {
            this.scrollToBottom();
        }
    }

    // Mostra un indicatore di loading per un comando
    showLoadingIndicator(command, type = 'default') {
        this.removeLoadingIndicator();
        
        const container = document.createElement('div');
        container.className = 'command-executing';
        
        let content = '';
        switch (type) {
            case 'pty':
                content = `
                    <div class="loading-indicator">
                        <div class="spinner"></div>
                        <span>Executing in PTY mode: <span class="command-text">${this.escapeHtml(command)}</span></span>
                    </div>
                `;
                break;
            case 'sudo':
                content = `
                    <div class="loading-indicator sudo-password-prompt">
                        <div class="progress-dots"></div>
                        <span>Executing sudo command: <span class="command-text">${this.escapeHtml(command)}</span></span>
                    </div>
                `;
                break;
            case 'long':
                content = `
                    <div class="loading-indicator">
                        <div class="spinner"></div>
                        <span>Executing long-running command: <span class="command-text">${this.escapeHtml(command)}</span></span>
                    </div>
                `;
                break;
            default:
                content = `
                    <div class="loading-indicator">
                        <div class="progress-dots"></div>
                        <span>Executing: <span class="command-text">${this.escapeHtml(command)}</span></span>
                    </div>
                `;
        }
        
        container.innerHTML = content;
        this.outputElement.appendChild(container);
        this.currentLoadingIndicator = container;
        this.commandStartTime = Date.now();
        
        // Avvia il controllo del timeout
        this.startTimeoutWarning(command);
        
        return container;
    }

    // Rimuove l'indicatore di loading
    removeLoadingIndicator() {
        if (this.currentLoadingIndicator) {
            this.currentLoadingIndicator.remove();
            this.currentLoadingIndicator = null;
            this.commandStartTime = null;
            this.timeoutWarningShown = false;
        }
    }

    // Avvia il controllo del timeout per mostrare avvisi
    startTimeoutWarning(command) {
        // Dopo 10 secondi, mostra un avviso che il comando sta ancora eseguendo
        setTimeout(() => {
            if (this.currentLoadingIndicator && !this.timeoutWarningShown) {
                this.timeoutWarningShown = true;
                const warning = document.createElement('div');
                warning.className = 'command-timeout-warning';
                warning.innerHTML = `
                    <div class="loading-indicator">
                        ⏳ Command is taking longer than expected...
                    </div>
                    <div style="font-size: 0.9em; margin-top: 4px;">
                        💡 For interactive commands, try pressing Enter or Ctrl+C if stuck
                    </div>
                `;
                this.outputElement.appendChild(warning);
            }
        }, 10000);

        // Dopo 30 secondi, mostra suggerimenti più specifici
        setTimeout(() => {
            if (this.currentLoadingIndicator) {
                const suggestion = document.createElement('div');
                suggestion.className = 'command-timeout-warning';
                
                let suggestionText = '';
                if (command.includes('sudo')) {
                    suggestionText = '🔐 If waiting for password, check if a password prompt appeared above';
                } else if (command.includes('softwareupdate')) {
                    suggestionText = '📦 Software updates can take 30+ minutes depending on update size';
                } else if (command.includes('yay') || command.includes('pacman')) {
                    suggestionText = '📦 Package installations may require user confirmation - check for prompts';
                } else {
                    suggestionText = '⚡ Long-running command detected - this is normal for some operations';
                }
                
                suggestion.innerHTML = `
                    <div class="loading-indicator">
                        ${suggestionText}
                    </div>
                `;
                this.outputElement.appendChild(suggestion);
            }
        }, 30000);
    }

    // Aggiorna l'indicatore con nuovo testo
    updateLoadingIndicator(text) {
        if (this.currentLoadingIndicator) {
            const textSpan = this.currentLoadingIndicator.querySelector('.command-text');
            if (textSpan) {
                textSpan.textContent = text;
            }
        }
    }

    // Mostra l'indicatore dello stato PTY
    updatePTYStatusIndicator() {
        // Cerca un indicatore esistente
        let indicator = document.querySelector('.pty-session-indicator');
        
        if (!indicator) {
            // Crea nuovo indicatore
            indicator = document.createElement('div');
            indicator.className = 'pty-session-indicator';
            
            // Aggiungilo al prompt header
            const promptHeader = document.querySelector('.prompt-header');
            if (promptHeader) {
                promptHeader.appendChild(indicator);
            }
        }
        
        // Aggiorna lo stato
        const isActive = this.ptyTerminal && this.ptyTerminal.isActive;
        indicator.className = `pty-session-indicator ${isActive ? 'active' : 'inactive'}`;
        indicator.innerHTML = `
            <div class="status-dot"></div>
            <span>PTY ${isActive ? 'Active' : 'Inactive'}</span>
        `;
    }

    async executeCommand(command) {
        try {
            // Verifica se il comando richiede un loading indicator
            const needsLoading = this.shouldShowLoading(command);
            let loadingStartTime = null;
            
            if (needsLoading) {
                loadingStartTime = Date.now();
                this.showLoadingIndicator(command, {
                    timeout: 60000, // 1 minuto timeout
                    style: 'spinner'
                });
            }

            // Controlla se è un comando sudo
            if (command.trim().startsWith('sudo ')) {
                await this.handleSudoCommand(command);
                
                // Nascondi loading solo se è stato mostrato abbastanza a lungo
                if (needsLoading) {
                    const elapsed = Date.now() - loadingStartTime;
                    if (elapsed < 500) {
                        // Se il comando è stato molto veloce, aspetta un po' prima di nascondere
                        setTimeout(() => this.hideLoadingIndicator(), 500 - elapsed);
                    } else {
                        this.hideLoadingIndicator();
                    }
                }
                return;
            }

            // Controlla se è un comando che potrebbe richiedere interazione (come installer)
            if (command.includes('curl -fsSL') && command.includes('install.sh')) {
                if (needsLoading) this.hideLoadingIndicator();
                this.addOutput(`🔄 Executing installer with interactive support...`);
                
                if (window.electronAPI && window.electronAPI.runInteractiveCommand) {
                    const result = await window.electronAPI.runInteractiveCommand(command);
                    this.addOutput(result);
                } else {
                    this.addOutput('❌ Interactive command support not available');
                }
                return;
            }

            // Usa l'API per eseguire comandi reali
            if (window.electronAPI && window.electronAPI.runCommand) {
                const result = await window.electronAPI.runCommand(command);
                
                // Nascondi loading con logica intelligente
                if (needsLoading) {
                    const elapsed = Date.now() - loadingStartTime;
                    if (elapsed < 500) {
                        // Comando molto veloce, aspetta un po'
                        setTimeout(() => this.hideLoadingIndicator(), 500 - elapsed);
                    } else {
                        this.hideLoadingIndicator();
                    }
                }
                
                this.addOutput(result);
            } else {
                if (needsLoading) this.hideLoadingIndicator();
                this.addOutput(`Command not found: ${command}`);
                this.addOutput('Type "help" for available commands.');
            }
        } catch (error) {
            this.hideLoadingIndicator();
            this.addOutput(`Error executing command: ${error.message}`);
        }
    }

    async handleSudoCommand(command) {
        this.addOutput(`🔐 Password required for: ${command}`);
        
        // Crea un prompt di password
        const password = await this.promptPassword();
        
        if (password === null) {
            this.addOutput('[Cancelled] Sudo command cancelled by user');
            return;
        }

        try {
            // Nascondi il loading precedente e mostra uno specifico per sudo
            this.hideLoadingIndicator();
            const loadingStartTime = Date.now();
            
            this.showLoadingIndicator(command, {
                timeout: 180000, // 3 minuti per comandi sudo lunghi
                style: 'spinner',
                message: `Executing sudo command: ${command.substring(5)}` // Rimuove "sudo "
            });
            
            this.addOutput('🔄 Executing sudo command...');
            const result = await window.electronAPI.runSudoCommand(command, password);
            
            // Logica intelligente per nascondere il loading
            const elapsed = Date.now() - loadingStartTime;
            if (elapsed < 500) {
                setTimeout(() => this.hideLoadingIndicator(), 500 - elapsed);
            } else {
                this.hideLoadingIndicator();
            }
            
            this.addOutput(result);
        } catch (error) {
            this.hideLoadingIndicator();
            this.addOutput(`[Error] Failed to execute sudo command: ${error.message}`);
        }
    }

    async promptPassword() {
        return new Promise((resolve) => {
            console.log('Creating password dialog...');
            
            // Rimuovi eventuali dialog esistenti
            const existingOverlay = document.querySelector('.password-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            // Crea un overlay più semplice
            const overlay = document.createElement('div');
            overlay.className = 'password-overlay';
            overlay.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.9) !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                z-index: 999999 !important;
                pointer-events: auto !important;
            `;

            const dialog = document.createElement('div');
            dialog.className = 'password-dialog';
            dialog.style.cssText = `
                background: #1e1e1e !important;
                border: 2px solid #00d4aa !important;
                border-radius: 12px !important;
                padding: 30px !important;
                min-width: 450px !important;
                max-width: 500px !important;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8) !important;
                text-align: center !important;
                font-family: 'Monaco', 'Menlo', monospace !important;
                color: #fff !important;
                pointer-events: auto !important;
            `;

            dialog.innerHTML = `
                <h3 style="color: #00d4aa; margin-bottom: 20px; font-size: 18px;">🔐 Administrator Password</h3>
                <p style="margin-bottom: 20px; color: #ccc;">Enter your system password to execute sudo command:</p>
                <input type="password" id="sudo-password-input" placeholder="Password" style="
                    width: 100% !important;
                    padding: 15px !important;
                    margin: 15px 0 !important;
                    background: #2d2d2d !important;
                    border: 2px solid #444 !important;
                    border-radius: 8px !important;
                    color: #fff !important;
                    font-size: 16px !important;
                    font-family: monospace !important;
                    box-sizing: border-box !important;
                    outline: none !important;
                    text-security: disc !important;
                    -webkit-text-security: disc !important;
                ">
                <div style="margin-top: 20px;">
                    <button id="sudo-cancel-btn" style="
                        padding: 12px 20px !important;
                        margin: 0 10px !important;
                        background: #444 !important;
                        border: 1px solid #666 !important;
                        border-radius: 6px !important;
                        color: #fff !important;
                        cursor: pointer !important;
                        font-size: 14px !important;
                    ">Cancel</button>
                    <button id="sudo-ok-btn" style="
                        padding: 12px 20px !important;
                        margin: 0 10px !important;
                        background: #00d4aa !important;
                        border: 1px solid #00d4aa !important;
                        border-radius: 6px !important;
                        color: #000 !important;
                        cursor: pointer !important;
                        font-weight: bold !important;
                        font-size: 14px !important;
                    ">OK</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const passwordInput = document.getElementById('sudo-password-input');
            const okBtn = document.getElementById('sudo-ok-btn');
            const cancelBtn = document.getElementById('sudo-cancel-btn');

            console.log('Elements created:', { passwordInput, okBtn, cancelBtn });

            const cleanup = () => {
                console.log('Cleaning up dialog...');
                if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            };

            okBtn.addEventListener('click', () => {
                console.log('OK button clicked');
                const password = passwordInput.value;
                cleanup();
                resolve(password);
            });

            cancelBtn.addEventListener('click', () => {
                console.log('Cancel button clicked');
                cleanup();
                resolve(null);
            });

            // Gestione tastiera
            passwordInput.addEventListener('keydown', (e) => {
                console.log('Key pressed:', e.key);
                e.stopPropagation();
                if (e.key === 'Enter') {
                    e.preventDefault();
                    okBtn.click();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelBtn.click();
                }
            });

            // Focus con debug
            setTimeout(() => {
                console.log('Attempting to focus password input...');
                passwordInput.focus();
                
                // Test se l'input è focusabile
                console.log('Active element:', document.activeElement);
                console.log('Input focused:', document.activeElement === passwordInput);
                
                // Forza il focus
                passwordInput.click();
                passwordInput.select();
                
                // Verifica nuovamente
                setTimeout(() => {
                    console.log('After forced focus - Active element:', document.activeElement);
                    console.log('Input value can be set:', passwordInput.value = 'test', passwordInput.value === 'test');
                    passwordInput.value = ''; // Reset
                }, 100);
            }, 100);
        });
    }

    clearTerminal() {
        this.outputElement.innerHTML = '';
        this.currentLine = '';
        this.cursorPosition = 0;
        // Reset dello stato di scrolling
        this.isUserScrolling = false;
        this.autoScrollEnabled = true;
        this.showWelcome();
        // L'observer si occuperà automaticamente dello scroll dopo il welcome
    }

    showHelp() {
        const help = `
Available commands:
  ai <question>      - Ask AI anything (suggests commands)
  ask <question>     - Alternative syntax for AI
  execute <question> - AI executes commands automatically with iteration
  run <question>     - Alternative syntax for auto-execution
  
  save-ai-chat       - Save AI conversation to file
  show-ai-chat       - Display AI conversation history  
  clear-ai-chat      - Clear AI conversation history
  
  enable-pty         - Enable enhanced mode for interactive commands
  disable-pty        - Disable enhanced mode (use standard execution)
  pty-status         - Show current enhanced mode status
  
  toggle-autoscroll  - Enable/disable automatic scrolling
  toggle-smooth-scroll - Enable/disable smooth scrolling animation
  scroll-bottom      - Force scroll to bottom immediately
  autoscroll-status  - Show current scrolling settings
  
  install-homebrew   - Homebrew installation helper with multiple methods
  
  help               - Show this help
  clear              - Clear screen (Ctrl+K/Cmd+K)
  exit               - Exit terminal
  
  debug-fonts        - Show available fonts
  debug-cursor       - Show cursor styles
  cursor-bar         - Test bar cursor
  cursor-block       - Test block cursor
  cursor-underline   - Test underline cursor

System Commands:
  sudo <command>     - Execute commands with administrator privileges
                      (Password prompt will appear securely)
  
  Any Unix/Linux command like: ls, cd, mkdir, npm, git, etc.

Enhanced Mode (🔧 ENABLED by default):
  🍺 Homebrew installer: /bin/bash -c "$(curl -fsSL https://...)"
  📦 Interactive installs: npm install, pip install, etc.
  🌐 Downloads: wget, curl with progress bars
  📁 Git operations: git clone with progress
  🔧 Package managers: yay, pacman, apt-get (full interactive support)
  📝 Text editors: vim, nano, emacs (full terminal support)
  📊 System monitors: htop, top, watch (real-time updates)

PTY Commands:
  pty-status         - Show PTY mode and session status
  pty-restart        - Restart the PTY session
  enable-pty         - Enable PTY mode for interactive commands
  disable-pty        - Disable PTY mode (use traditional execution)
  test-pty           - Test PTY functionality
  test-sudo          - Test sudo functionality with secure password

Important Notes:
  🍺 Homebrew: Enhanced mode improves compatibility with installers
  🔐 Interactive Commands: Full terminal emulation with real TTY
  ⚡ Performance: Automatic fallback for simple commands
  📱 Compatibility: Works with all standard Unix/Linux tools
  🎮 Interactive Tools: yay, htop, vim work exactly like in a real terminal

Keyboard Shortcuts:
  ↑/↓                - Navigate command history
  Tab                - Auto-complete commands
  Ctrl/Cmd+C         - Copy selected text or current line
  Ctrl/Cmd+V         - Paste from clipboard
  Ctrl/Cmd+A         - Select all terminal content
  Ctrl/Cmd+K         - Clear terminal
  Ctrl/Cmd+L         - Clear terminal (alternative)
  Ctrl/Cmd+J         - Scroll to bottom instantly
  Page Down          - Scroll to bottom instantly

AI Commands:
  ai "create a folder called test"     - AI suggests the command
  execute "create a folder called test" - AI creates folder automatically
  run "show disk space"               - AI executes and verifies result
`;
        this.addOutput(help);
    }

    async processAICommand(command) {
        console.log('=== PROCESS AI COMMAND CALLED ===');
        console.log('Full command received:', command);
        
        const question = command.replace(/^(ai|ask|execute|run)\s+/, '');
        const isAutoExecute = command.startsWith('execute ') || command.startsWith('run ');
        
        console.log('Extracted question:', question);
        console.log('Auto-execute mode:', isAutoExecute);
        
        // Registra la domanda dell'utente
        this.addToAIConversation('user', question);
        
        let thinkingMessageElement;
        let webSearchMessageElement = null;
        
        if (isAutoExecute) {
            thinkingMessageElement = this.addOutput('🚀 AI Agent executing...');
        } else {
            // Mostra un messaggio più informativo che indica che potrebbe cercare online
            thinkingMessageElement = this.addOutput('🤖 Analyzing request...');
            thinkingMessageElement.className = 'ai-thinking';
        }
        
        try {
            // Implementa un sistema di timeout progressivo per mostrare l'avanzamento
            const progressTimeouts = [];
            
            // Dopo 1 secondo, suggerisci che potrebbe cercare online
            progressTimeouts.push(setTimeout(() => {
                if (thinkingMessageElement && thinkingMessageElement.parentNode) {
                    thinkingMessageElement.textContent = '🤖 Analyzing (may search web)...';
                }
            }, 1000));
            
            // Dopo 3 secondi, mostra che probabilmente sta cercando online
            progressTimeouts.push(setTimeout(() => {
                if (thinkingMessageElement && thinkingMessageElement.parentNode) {
                    thinkingMessageElement.textContent = '🌐 Likely searching internet...';
                    thinkingMessageElement.className = 'web-search-loading';
                    webSearchMessageElement = thinkingMessageElement;
                }
            }, 3000));
            
            // Usa il nuovo AI Agent con integrazione web per gestire la richiesta
            const result = await window.electronAPI.aiAgentRequestWithWeb(question, this.getTerminalContext(), isAutoExecute);
            
            // Pulisci tutti i timeout
            progressTimeouts.forEach(timeout => clearTimeout(timeout));
            
            // Rimuovi tutti i messaggi di loading
            if (thinkingMessageElement) {
                thinkingMessageElement.remove();
            }
            if (webSearchMessageElement) {
                webSearchMessageElement.remove();
            }

            console.log('AI Agent with Web result:', result);
            
            // L'observer si occuperà automaticamente dello scroll per tutto l'output AI
            
            switch (result.type) {
                case 'web_enhanced':
                    // Mostra che l'AI ha effettivamente cercato su internet
                    const webLoadingMessage = this.addOutput('🌐 Looking on internet...');
                    webLoadingMessage.className = 'web-search-loading';
                    
                    // Mostra il loader progressivo
                    await this.showWebSearchLoader(webLoadingMessage, result.searchQuery);
                    
                    // Rimuovi il messaggio di caricamento web
                    webLoadingMessage.remove();
                    
                    this.addAIOutput('🌐 ' + result.response);
                    this.addAIOutput('🔍 Ricerca web eseguita per: ' + result.searchQuery);
                    this.addAIOutput('📊 Confidenza: ' + (result.confidence * 100).toFixed(0) + '%');
                    this.addAIOutput('💡 L\'AI ha cercato informazioni aggiornate su internet per fornirti una risposta più accurata');
                    this.addToAIConversation('ai', result.response, null, null, 'web_enhanced');
                    break;
                    
                case 'local_only':
                    // Mostra brevemente che l'AI ha analizzato ma non ha cercato online
                    if (thinkingMessageElement && thinkingMessageElement.parentNode) {
                        thinkingMessageElement.textContent = '🧠 Using local knowledge...';
                        thinkingMessageElement.className = 'ai-thinking';
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    
                    this.addAIOutput('🤖 ' + result.response);
                    this.addAIOutput('ℹ️ Risposta basata su conoscenza locale (confidenza: ' + (result.confidence * 100).toFixed(0) + '%)');
                    this.addAIOutput('💡 L\'AI ha fornito una risposta basata sulla sua conoscenza esistente');
                    this.addToAIConversation('ai', result.response);
                    break;
                    
                case 'fallback':
                    // Mostra brevemente che l'AI ha tentato di cercare online
                    const fallbackLoadingMessage = this.addOutput('🌐 Attempting to look on internet...');
                    fallbackLoadingMessage.className = 'web-search-loading';
                    
                    // Simula un breve tentativo
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    fallbackLoadingMessage.textContent = '⚠️ Web search failed, using local knowledge...';
                    
                    await new Promise(resolve => setTimeout(resolve, 800));
                    fallbackLoadingMessage.remove();
                    
                    this.addAIOutput('🤖 ' + result.response);
                    this.addAIOutput('⚠️ Ricerca web fallita, usando risposta locale');
                    this.addAIOutput('💡 L\'AI ha tentato di cercare online ma ha dovuto usare la sua conoscenza locale');
                    this.addToAIConversation('ai', result.response);
                    break;
                    
                case 'informational':
                    this.addAIOutput('🤖 ' + result.response);
                    this.addToAIConversation('ai', result.response);
                    if (result.iterations > 1) {
                        this.addAIOutput(`ℹ️ Elaborato in ${result.iterations} iterazioni`);
                    }
                    break;
                    
                case 'suggestion':
                    this.addAIOutput('🤖 ' + result.response);
                    this.addToAIConversation('ai', result.response, result.command);
                    this.suggestCommand(result.command);
                    break;
                    
                case 'success':
                    this.addAIOutput('✅ ' + result.response);
                    this.addAIOutput('📋 Comando finale: ' + result.finalCommand);
                    this.addAIOutput('📤 Risultato:\n' + result.finalResult.output);
                    this.addAIOutput(`ℹ️ Completato in ${result.iterations} iterazioni`);
                    this.addToAIConversation('ai', result.response, result.finalCommand, result.finalResult.output);
                    this.showExecutionHistory(result.history);
                    break;
                    
                case 'max_iterations':
                    this.addAIOutput('⚠️ ' + result.response);
                    this.addAIOutput('📤 Ultimo risultato:\n' + result.finalResult.output);
                    this.addAIOutput(`ℹ️ Raggiunto limite di ${result.iterations} iterazioni`);
                    this.addToAIConversation('ai', result.response, null, result.finalResult.output);
                    this.showExecutionHistory(result.history);
                    break;
                    
                default:
                    this.addAIOutput('❓ Tipo di risposta AI non riconosciuto: ' + result.type);
                    this.addToAIConversation('ai', 'Errore: tipo risposta non riconosciuto');
                    break;
            }
            
        } catch (error) {
            // Pulisci tutti i timeout in caso di errore
            if (typeof progressTimeouts !== 'undefined') {
                progressTimeouts.forEach(timeout => clearTimeout(timeout));
            }
            
            if (thinkingMessageElement) {
                thinkingMessageElement.remove();
            }
            if (webSearchMessageElement && webSearchMessageElement !== thinkingMessageElement) {
                webSearchMessageElement.remove();
            }
            
            console.error('AI Agent error:', error);
            const errorMsg = 'AI Agent Error: ' + error.message;
            this.addAIOutput('❌ ' + errorMsg);
            this.addToAIConversation('ai', errorMsg);
        }
    }

    getTerminalContext() {
        // Raccoglie le ultime righe del terminale come contesto
        const outputLines = this.outputElement.textContent.split('\n');
        return outputLines.slice(-10).filter(line => line.trim() !== '');
    }

    /**
     * Mostra un loader progressivo per la ricerca web
     */
    async showWebSearchLoader(loadingElement, searchQuery) {
        if (!loadingElement) return;
        
        const loadingSteps = [
            { text: '🌐 Looking on internet...', duration: 800 },
            { text: `🔍 Searching for: ${searchQuery}`, duration: 600 },
            { text: '📊 Integrating results...', duration: 400 }
        ];
        
        for (const step of loadingSteps) {
            if (loadingElement.parentNode) { // Verifica che l'elemento esista ancora
                loadingElement.textContent = step.text;
                loadingElement.className = 'web-search-loading';
                await new Promise(resolve => setTimeout(resolve, step.duration));
            }
        }
    }

    showExecutionHistory(history) {
        if (!history || history.length === 0) return;
        
        this.addAIOutput('\n📚 Cronologia esecuzione:');
        history.forEach((entry, index) => {
            this.addAIOutput(`  ${entry.iteration}. ${entry.command}`);
            this.addAIOutput(`     💭 ${entry.reasoning}`);
            if (entry.result.success) {
                this.addAIOutput(`     ✅ Successo`);
            } else {
                this.addAIOutput(`     ❌ Errore: ${entry.result.output.substring(0, 100)}...`);
            }
        });
        // L'observer si occuperà automaticamente dello scroll
    }

    // Gestione conversazioni AI
    saveAIConversation() {
        if (this.aiConversation.length === 0) {
            this.addOutput('❌ Nessuna conversazione AI da salvare');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `ai-chat-${timestamp}.txt`;
        
        let chatContent = `TermInA AI Conversation - ${new Date().toLocaleString()}\n`;
        chatContent += '='.repeat(60) + '\n\n';
        
        this.aiConversation.forEach((entry, index) => {
            chatContent += `[${entry.timestamp}] ${entry.type.toUpperCase()}: ${entry.content}\n`;
            if (entry.type === 'ai' && entry.command) {
                chatContent += `  → Suggested Command: ${entry.command}\n`;
            }
            if (entry.type === 'ai' && entry.result) {
                chatContent += `  → Result: ${entry.result}\n`;
            }
            chatContent += '\n';
        });

        // Salva usando l'API Electron
        this.saveToFile(filename, chatContent);
        this.addOutput(`💾 Conversazione AI salvata come: ${filename}`);
    }

    async saveToFile(filename, content) {
        try {
            if (window.electronAPI && window.electronAPI.saveToDownloads) {
                const result = await window.electronAPI.saveToDownloads(filename, content);
                if (result.success) {
                    this.addOutput(`📁 File salvato in: ${result.path}`);
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Fallback usando download browser
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.addOutput(`📁 File scaricato: ${filename}`);
            }
        } catch (error) {
            console.error('Error saving file:', error);
            // Fallback: usa il download del browser
            try {
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.addOutput(`📁 File scaricato come fallback: ${filename}`);
            } catch (fallbackError) {
                this.addOutput(`❌ Errore nel salvare il file: ${error.message}`);
            }
        }
    }

    clearAIConversation() {
        this.aiConversation = [];
        this.addOutput('🗑️ Cronologia conversazioni AI cancellata');
    }

    // Gestione loading indicator per comandi lunghi
    showLoadingIndicator(command, options = {}) {
        // Rimuovi eventuali loading indicator esistenti
        this.hideLoadingIndicator();

        // Configura opzioni
        const config = {
            showTime: options.showTime !== false, // Default true
            timeout: options.timeout || 30000,    // 30 secondi default
            style: options.style || 'spinner',    // 'dots', 'spinner', 'bar'
            message: options.message || `Executing: ${command}`,
            minDisplayTime: options.minDisplayTime || 500, // Mostra per almeno 500ms
            ...options
        };

        // Crea elemento loading
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'command-loading-indicator';
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="loading-animation">
                    <span class="loading-icon"></span>
                    <span class="loading-text">${config.message}</span>
                </div>
                <div class="loading-time" ${!config.showTime ? 'style="display: none;"' : ''}>
                    <span class="time-elapsed">0s</span>
                </div>
            </div>
        `;

        // Aggiungi all'output
        this.outputElement.appendChild(loadingDiv);
        this.currentLoadingIndicator = loadingDiv;
        this.commandStartTime = Date.now();
        this.timeoutWarningShown = false;

        // Avvia animazione
        this.startLoadingAnimation(config.style);

        // Timer per aggiornare il tempo
        if (config.showTime) {
            this.startTimeUpdater();
        }

        // Timer di timeout
        if (config.timeout > 0) {
            this.commandTimeoutTimer = setTimeout(() => {
                this.showTimeoutWarning(config.timeout / 1000);
            }, config.timeout);
        }

        // Auto-scroll
        this.scrollToBottom();
    }

    hideLoadingIndicator() {
        if (this.currentLoadingIndicator) {
            this.currentLoadingIndicator.remove();
            this.currentLoadingIndicator = null;
        }

        // Ferma animazioni e timer
        if (this.loadingAnimationFrame) {
            cancelAnimationFrame(this.loadingAnimationFrame);
            this.loadingAnimationFrame = null;
        }

        if (this.commandTimeoutTimer) {
            clearTimeout(this.commandTimeoutTimer);
            this.commandTimeoutTimer = null;
        }

        this.commandStartTime = null;
        this.timeoutWarningShown = false;
    }

    startLoadingAnimation(style = 'dots') {
        if (!this.currentLoadingIndicator) return;

        const iconElement = this.currentLoadingIndicator.querySelector('.loading-icon');
        if (!iconElement) return;

        const animate = () => {
            if (!this.currentLoadingIndicator) return;

            switch (style) {
                case 'dots':
                    this.loadingDots = (this.loadingDots + 1) % 4;
                    iconElement.textContent = '⚪'.repeat(this.loadingDots) + '⚫'.repeat(3 - this.loadingDots);
                    break;
                case 'spinner':
                    const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
                    this.loadingDots = (this.loadingDots + 1) % spinners.length;
                    iconElement.textContent = spinners[this.loadingDots];
                    break;
                case 'bar':
                    const bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'];
                    this.loadingDots = (this.loadingDots + 1) % bars.length;
                    iconElement.textContent = bars[this.loadingDots];
                    break;
            }

            this.loadingAnimationFrame = setTimeout(animate, 200);
        };

        animate();
    }

    startTimeUpdater() {
        if (!this.currentLoadingIndicator || !this.commandStartTime) return;

        const timeElement = this.currentLoadingIndicator.querySelector('.time-elapsed');
        if (!timeElement) return;

        const updateTime = () => {
            if (!this.currentLoadingIndicator || !this.commandStartTime) return;

            const elapsed = Math.floor((Date.now() - this.commandStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;

            if (minutes > 0) {
                timeElement.textContent = `${minutes}m ${seconds}s`;
            } else {
                timeElement.textContent = `${seconds}s`;
            }

            // Cambia colore se impiega troppo tempo
            if (elapsed > 30) {
                timeElement.style.color = '#ff9500'; // Arancione
            }
            if (elapsed > 60) {
                timeElement.style.color = '#ff5722'; // Rosso
            }

            setTimeout(updateTime, 1000);
        };

        updateTime();
    }

    showTimeoutWarning(timeoutSeconds) {
        if (this.timeoutWarningShown || !this.currentLoadingIndicator) return;
        this.timeoutWarningShown = true;

        const warningDiv = document.createElement('div');
        warningDiv.className = 'timeout-warning';
        warningDiv.innerHTML = `
            ⚠️ Command is taking longer than expected (${timeoutSeconds}s).
            Press Ctrl+C to cancel or wait for completion.
        `;

        this.currentLoadingIndicator.appendChild(warningDiv);
    }

    // Verifica se un comando richiede un loading indicator
    shouldShowLoading(command) {
        // Comandi interni che sono sempre istantanei
        const instantCommands = [
            'clear', 'help', 'exit', 'pwd', 'cd', 'ls', 'dir', 'echo',
            'enable-pty', 'disable-pty', 'pty-status', 'pty-restart',
            'save-ai-chat', 'clear-ai-chat', 'show-ai-chat', 
            'toggle-autoscroll', 'scroll-bottom', 'autoscroll-status',
            'toggle-smooth-scroll', 'debug-fonts', 'debug-cursor',
            'test-pty', 'test-sudo', 'install-homebrew'
        ];

        const trimmedCommand = command.trim().toLowerCase();
        
        // Non mostrare loading per comandi AI (hanno il loro feedback)
        if (trimmedCommand.startsWith('ai ') || 
            trimmedCommand.startsWith('ask ') ||
            trimmedCommand.startsWith('execute ') || 
            trimmedCommand.startsWith('run ') ||
            trimmedCommand.startsWith('cursor-')) {
            return false;
        }

        // Non mostrare loading per comandi interni istantanei
        if (instantCommands.includes(trimmedCommand) || 
            instantCommands.some(cmd => trimmedCommand.startsWith(cmd + ' '))) {
            return false;
        }

        // Mostra loading per tutti gli altri comandi
        // Questo copre automaticamente tutti i comandi di sistema su tutte le piattaforme
        return true;
    }

    showAIConversation() {
        if (this.aiConversation.length === 0) {
            this.addOutput('ℹ️ Nessuna conversazione AI nella cronologia');
            return;
        }

        this.addOutput('💬 Cronologia conversazioni AI:');
        this.addOutput('─'.repeat(50));
        
        this.aiConversation.forEach((entry, index) => {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            if (entry.type === 'user') {
                this.addOutput(`[${time}] 👤 ${entry.content}`);
            } else if (entry.type === 'ai') {
                this.addOutput(`[${time}] 🤖 ${entry.content}`);
                if (entry.command) {
                    this.addOutput(`    💡 Comando: ${entry.command}`);
                }
            }
        });
        
        this.addOutput('─'.repeat(50));
        this.addOutput(`ℹ️ Totale: ${this.aiConversation.length} messaggi`);
    }

    // Aggiungi messaggio alla conversazione AI
    addToAIConversation(type, content, command = null, result = null, responseType = null) {
        this.aiConversation.push({
            timestamp: new Date().toISOString(),
            type: type, // 'user' or 'ai'
            content: content,
            command: command,
            result: result,
            responseType: responseType // 'web_enhanced', 'local_only', 'fallback', etc.
        });

        // Mantieni solo gli ultimi 100 messaggi per gestione memoria
        if (this.aiConversation.length > 100) {
            this.aiConversation = this.aiConversation.slice(-100);
        }
    }

    // Versione migliorata del processCommand per supportare i nuovi comandi
    async processCommandOriginal() {
        const command = this.currentLine.trim();
        
        // Mostra il comando eseguito
        this.addOutput('$ ' + command);
        
        // Aggiungi alla cronologia
        if (command) {
            this.history.push(command);
        }

        // Processa il comando
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
        } else if (command.startsWith('cursor-')) {
            this.testCursorStyle(command.replace('cursor-', ''));
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

    suggestCommand(command) {
        // Crea un elemento di suggerimento comando stile Warp
        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'ai-command-suggestion';
        
        // Genera un ID unico per questo suggerimento
        const suggestionId = 'suggestion_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Salva il comando in un attributo data per evitare problemi con caratteri speciali
        suggestionDiv.setAttribute('data-command', command);
        
        suggestionDiv.innerHTML = `
            <div class="suggestion-header">
                <span class="suggestion-icon">💡</span>
                <span class="suggestion-text">Suggested command:</span>
            </div>
            <div class="suggested-command">
                <code>${this.escapeHtml(command)}</code>
            </div>
            <div class="suggestion-actions">
                <button class="btn-execute" data-suggestion-id="${suggestionId}">
                    ✅ Esegui
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
        
        // Bottone Esegui
        const executeBtn = suggestionDiv.querySelector('.btn-execute');
        if (executeBtn) {
            executeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.executeAISuggestion(command);
            });
        }
        
        // Bottone Copia
        const copyBtn = suggestionDiv.querySelector('.btn-copy');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.copyAISuggestion(command);
            });
        }
        
        // Bottone Modifica
        const editBtn = suggestionDiv.querySelector('.btn-edit');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.editAISuggestion(command);
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

    executeAISuggestion(command) {
        this.addOutput('$ ' + command);
        this.executeCommand(command);
        // Rimuovi tutti i suggerimenti dopo l'esecuzione
        this.clearAISuggestions();
    }

    copyAISuggestion(command) {
        navigator.clipboard.writeText(command).then(() => {
            this.addOutput('📋 Command copied to clipboard');
        });
    }

    editAISuggestion(command) {
        // Inserisce il comando nell'input per permettere modifiche
        this.currentLine = command;
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

    openSettings() {
        // Chiama l'API per aprire le impostazioni
        if (window.electronAPI && window.electronAPI.openSettings) {
            window.electronAPI.openSettings();
        } else {
            this.addOutput('⚙️ Settings panel will open soon...');
        }
    }

    showAvailableFonts() {
        this.addOutput('🔤 Font disponibili nel sistema:');
        
        const testFonts = [
            'SF Mono', 'Monaco', 'Menlo', 'JetBrains Mono', 'Fira Code', 
            'Source Code Pro', 'Hack', 'Inconsolata', 'Roboto Mono',
            'Consolas', 'Courier New', 'Andale Mono'
        ];
        
        testFonts.forEach(font => {
            const isAvailable = this.isFontAvailable(font);
            const status = isAvailable ? '✅' : '❌';
            this.addOutput(`${status} ${font}`);
        });
        
        this.addOutput('');
        this.addOutput('💡 Usa il pannello impostazioni (⌘+,) per cambiare font');
    }

    isFontAvailable(fontName) {
        // Stesso metodo del pannello di controllo per coerenza
        const testElement = document.createElement('span');
        testElement.style.fontFamily = fontName;
        testElement.style.fontSize = '16px';
        testElement.style.position = 'absolute';
        testElement.style.visibility = 'hidden';
        testElement.style.top = '-1000px';
        testElement.textContent = 'abcdefghijklmnopqrstuvwxyz0123456789';
        
        document.body.appendChild(testElement);
        
        const fallbackElement = document.createElement('span');
        fallbackElement.style.fontFamily = 'monospace';
        fallbackElement.style.fontSize = '16px';
        fallbackElement.style.position = 'absolute';
        fallbackElement.style.visibility = 'hidden';
        fallbackElement.style.top = '-1000px';
        fallbackElement.textContent = 'abcdefghijklmnopqrstuvwxyz0123456789';
        
        document.body.appendChild(fallbackElement);
        
        const testWidth = testElement.offsetWidth;
        const fallbackWidth = fallbackElement.offsetWidth;
        
        document.body.removeChild(testElement);
        document.body.removeChild(fallbackElement);
        
        return testWidth !== fallbackWidth || fontName === 'monospace';
    }

    async installHomebrew() {
        this.addOutput('🍺 Homebrew Installation Helper');
        this.addOutput('');
        this.addOutput('Homebrew requires specific conditions for installation:');
        this.addOutput('• Administrator privileges');
        this.addOutput('• Interactive terminal (TTY)');
        this.addOutput('• Network access');
        this.addOutput('');
        this.addOutput('💡 Trying different installation methods...');
        this.addOutput('');

        // Metodo 1: Non-interactive
        this.addOutput('📋 Method 1: Non-interactive installation...');
        try {
            if (window.electronAPI && window.electronAPI.runCommand) {
                const result1 = await window.electronAPI.runCommand('curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | NONINTERACTIVE=1 bash');
                
                if (result1.includes('[Success]') || result1.includes('Installation successful')) {
                    this.addOutput('✅ Non-interactive installation succeeded!');
                    this.addOutput(result1);
                    return;
                } else {
                    this.addOutput('❌ Non-interactive method failed');
                    this.addOutput('');
                }
            }
        } catch (error) {
            this.addOutput(`❌ Method 1 failed: ${error.message}`);
        }

        // Metodo 2: Manual download and install
        this.addOutput('📋 Method 2: Manual installation...');
        this.addOutput('');
        this.addOutput('🔧 Alternative commands you can try:');
        this.addOutput('');
        this.addOutput('1. In Terminal.app (recommended):');
        this.addOutput('   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
        this.addOutput('');
        this.addOutput('2. Non-interactive version:');
        this.addOutput('   curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | NONINTERACTIVE=1 bash');
        this.addOutput('');
        this.addOutput('3. Manual tarball installation:');
        this.addOutput('   mkdir homebrew && curl -L https://github.com/Homebrew/brew/tarball/master | tar xz --strip 1 -C homebrew');
        this.addOutput('');
        this.addOutput('4. Using Rosetta (for M1 Macs with compatibility issues):');
        this.addOutput('   arch -x86_64 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
        this.addOutput('');
        this.addOutput('💡 After installation, you may need to:');
        this.addOutput('• Restart your terminal');
        this.addOutput('• Run: source ~/.zshrc or source ~/.bash_profile');
        this.addOutput('• Add Homebrew to your PATH');
        this.addOutput('');
        this.addOutput('🔍 Check if Homebrew is already installed:');
        this.addOutput('   brew --version');
    }

    handlePTYKeydown(e) {
        // Gestione tasti speciali in modalità PTY
        e.preventDefault();
        
        let keyToSend = '';
        
        if (e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'c':
                    keyToSend = '\x03'; // Ctrl+C (interrupt)
                    break;
                case 'd':
                    keyToSend = '\x04'; // Ctrl+D (EOF)
                    break;
                case 'z':
                    keyToSend = '\x1a'; // Ctrl+Z (suspend)
                    break;
                case 'l':
                    keyToSend = '\x0c'; // Ctrl+L (clear)
                    break;
                case '\\':
                    keyToSend = '\x1c'; // Ctrl+\ (quit)
                    break;
                case 'h':
                    keyToSend = '\x08'; // Ctrl+H (backspace)
                    break;
                case 'i':
                    keyToSend = '\x09'; // Ctrl+I (tab)
                    break;
                case 'm':
                    keyToSend = '\r'; // Ctrl+M (enter)
                    break;
                case '[':
                    keyToSend = '\x1b'; // Ctrl+[ (escape)
                    break;
                case 'u':
                    keyToSend = '\x15'; // Ctrl+U (kill line)
                    break;
                case 'k':
                    keyToSend = '\x0b'; // Ctrl+K (kill to end of line)
                    break;
                case 'w':
                    keyToSend = '\x17'; // Ctrl+W (kill word)
                    break;
                case 'a':
                    keyToSend = '\x01'; // Ctrl+A (beginning of line)
                    break;
                case 'e':
                    keyToSend = '\x05'; // Ctrl+E (end of line)
                    break;
                case 'b':
                    keyToSend = '\x02'; // Ctrl+B (backward char)
                    break;
                case 'f':
                    keyToSend = '\x06'; // Ctrl+F (forward char)
                    break;
                case 'n':
                    keyToSend = '\x0e'; // Ctrl+N (next line)
                    break;
                case 'p':
                    keyToSend = '\x10'; // Ctrl+P (previous line)
                    break;
                case 'r':
                    keyToSend = '\x12'; // Ctrl+R (reverse search)
                    break;
                case 's':
                    keyToSend = '\x13'; // Ctrl+S (forward search)
                    break;
                case 't':
                    keyToSend = '\x14'; // Ctrl+T (transpose chars)
                    break;
                case 'y':
                    keyToSend = '\x19'; // Ctrl+Y (yank)
                    break;
                default:
                    return; // Altri Ctrl+ non gestiti
            }
        } else if (e.key === 'Enter') {
            keyToSend = '\r';
        } else if (e.key === 'Backspace') {
            keyToSend = '\x7f';
        } else if (e.key === 'Tab') {
            keyToSend = '\t';
        } else if (e.key === 'Escape') {
            keyToSend = '\x1b';
        } else if (e.key === 'ArrowUp') {
            keyToSend = '\x1b[A';
        } else if (e.key === 'ArrowDown') {
            keyToSend = '\x1b[B';
        } else if (e.key === 'ArrowRight') {
            keyToSend = '\x1b[C';
        } else if (e.key === 'ArrowLeft') {
            keyToSend = '\x1b[D';
        } else if (e.key === 'Home') {
            keyToSend = '\x1b[H';
        } else if (e.key === 'End') {
            keyToSend = '\x1b[F';
        } else if (e.key === 'PageUp') {
            keyToSend = '\x1b[5~';
        } else if (e.key === 'PageDown') {
            keyToSend = '\x1b[6~';
        } else if (e.key === 'Delete') {
            keyToSend = '\x1b[3~';
        } else if (e.key === 'Insert') {
            keyToSend = '\x1b[2~';
        } else if (e.key === 'F1') {
            keyToSend = '\x1bOP';
        } else if (e.key === 'F2') {
            keyToSend = '\x1bOQ';
        } else if (e.key === 'F3') {
            keyToSend = '\x1bOR';
        } else if (e.key === 'F4') {
            keyToSend = '\x1bOS';
        } else if (e.key === 'F5') {
            keyToSend = '\x1b[15~';
        } else if (e.key === 'F6') {
            keyToSend = '\x1b[17~';
        } else if (e.key === 'F7') {
            keyToSend = '\x1b[18~';
        } else if (e.key === 'F8') {
            keyToSend = '\x1b[19~';
        } else if (e.key === 'F9') {
            keyToSend = '\x1b[20~';
        } else if (e.key === 'F10') {
            keyToSend = '\x1b[21~';
        } else if (e.key === 'F11') {
            keyToSend = '\x1b[23~';
        } else if (e.key === 'F12') {
            keyToSend = '\x1b[24~';
        } else if (e.key.length === 1) {
            // Caratteri normali
            keyToSend = e.key;
        } else {
            return; // Tasto non gestito
        }
        
        if (keyToSend && this.ptyTerminal) {
            this.ptyTerminal.sendInput(keyToSend);
        }
    }

    handlePasswordKeydown(e) {
        // Gestione limitata per modalità password
        e.preventDefault();
        
        if (e.key === 'Enter') {
            // Conferma password
            this.processCommand();
        } else if (e.key === 'Escape' || (e.ctrlKey && e.key.toLowerCase() === 'c')) {
            // Cancella modalità password
            this.passwordMode = false;
            this.currentLine = '';
            this.cursorPosition = 0;
            this.addOutput('❌ Password input cancelled');
            this.showPrompt();
        } else if (e.key === 'Backspace') {
            // Cancella carattere
            if (this.cursorPosition > 0) {
                this.currentLine = 
                    this.currentLine.substring(0, this.cursorPosition - 1) + 
                    this.currentLine.substring(this.cursorPosition);
                this.cursorPosition--;
                this.showPrompt();
            }
        } else if (e.key === 'ArrowLeft') {
            // Muovi cursore a sinistra
            if (this.cursorPosition > 0) {
                this.cursorPosition--;
                this.showPrompt();
            }
        } else if (e.key === 'ArrowRight') {
            // Muovi cursore a destra
            if (this.cursorPosition < this.currentLine.length) {
                this.cursorPosition++;
                this.showPrompt();
            }
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            // Aggiungi carattere normale
            this.currentLine = 
                this.currentLine.substring(0, this.cursorPosition) + 
                e.key + 
                this.currentLine.substring(this.cursorPosition);
            this.cursorPosition++;
            this.showPrompt();
        }
    }

    // Chiamato quando un comando PTY viene completato
    onPTYCommandComplete() {
        // Rimuovi l'indicatore di loading
        this.removeLoadingIndicator();
        
        // Aggiungi un separatore per indicare che il comando è terminato
        const separator = document.createElement('div');
        separator.className = 'command-completion-separator';
        separator.innerHTML = `
            <div style="border-top: 1px solid #4a5568; margin: 8px 0; opacity: 0.3;"></div>
        `;
        this.outputElement.appendChild(separator);
        
        // Aggiorna lo stato PTY
        this.updatePTYStatusIndicator();
        
        // Scroll al bottom
        this.scrollToBottom();
    }

    // Funzione di utilità per l'escape dell'HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Variabile globale per il terminale
let terminal;

// Inizializza il terminale quando la pagina è carica
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOM CONTENT LOADED - INITIALIZING SIMPLE TERMINAL ===');
    terminal = new SimpleTerminal();
    console.log('=== SIMPLE TERMINAL INITIALIZED ===', terminal);
});
