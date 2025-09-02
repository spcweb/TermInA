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
    }

    createTerminalDisplay() {
        this.container.innerHTML = `
            <div class="simple-terminal-content">
                <div class="terminal-output"></div>
                <div class="terminal-input-line">
                    <span class="prompt">$ </span>
                    <span class="input-text"></span>
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
        const welcome = `
🚀 Welcome to Termina
   Modern Terminal with AI

🤖 AI Commands:
  ai <question>      - Ask AI anything
  ask <question>     - Alternative syntax
  execute <task>     - AI executes & iterates until success
  run <task>         - Same as execute

� AI Chat Management:
  save-ai-chat       - Save AI conversation to Downloads
  show-ai-chat       - Show current AI conversation history
  clear-ai-chat      - Clear AI conversation memory

�📱 Terminal Commands:
  help               - Show help
  clear              - Clear screen (⌘+L)
  exit               - Exit terminal

📜 Scroll Controls:
  toggle-autoscroll  - Enable/disable auto-scroll
  toggle-smooth-scroll - Enable/disable smooth scroll
  scroll-bottom      - Jump to bottom immediately

⚡ Smart Features:
  Tab                - Autocomplete commands
  ↑↓                 - Navigate command history
  ⌘+C/⌘+V           - Copy/Paste (⌘+A to select all)
  Auto-scroll        - Follows new output automatically

⚙️  Settings: Click the gear icon or press ⌘+,
`;
        this.addOutput(welcome);
    }

    showPrompt() {
        this.inputTextElement.textContent = this.currentLine;
        this.updateCursorPosition();
    }

    updateCursorPosition() {
        // Visualizza il testo con il cursore nella posizione corretta
        const beforeCursor = this.currentLine.substring(0, this.cursorPosition);
        const afterCursor = this.currentLine.substring(this.cursorPosition);
        
        // Usa lo stile del cursore attualmente configurato
        const cursorClass = `cursor-${this.cursorStyle}`;
        
        this.inputTextElement.innerHTML = 
            `<span class="before-cursor">${this.escapeHtml(beforeCursor)}</span>` +
            `<span class="terminal-cursor ${cursorClass}"></span>` +
            `<span class="after-cursor">${this.escapeHtml(afterCursor)}</span>`;
        
        // Aggiorna il riferimento al cursore
        this.cursor = this.inputTextElement.querySelector('.terminal-cursor');
        
        if (this.cursor) {
            this.cursor.style.opacity = '1';
            
            // Per i cursori block e underline, aggiungi contenuto per visualizzare gli spazi
            if (this.cursorStyle === 'block' || this.cursorStyle === 'underline') {
                const charAtCursor = this.currentLine.charAt(this.cursorPosition);
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
        const line = document.createElement('div');
        line.className = 'output-line';
        line.textContent = text;
        this.outputElement.appendChild(line);
        // Il MutationObserver si occuperà dello scroll automatico
    }

    // Funzione speciale per output AI
    addAIOutput(text) {
        const line = document.createElement('div');
        line.className = 'output-line ai-output';
        line.textContent = text;
        this.outputElement.appendChild(line);
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

        // Applica al testo di input
        const inputText = terminal.querySelector('.input-text');
        if (inputText) {
            inputText.style.color = theme.foreground || '#ffffff';
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
        // Gestione combinazioni di tasti (Cmd/Ctrl)
        if (e.metaKey || e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'c':
                    this.handleCopy(e);
                    return;
                case 'v':
                    this.handlePaste(e);
                    return;
                case 'a':
                    // Ctrl+A o Cmd+A - Se non c'è selezione, vai all'inizio della riga
                    if (window.getSelection().toString().length === 0) {
                        e.preventDefault();
                        this.cursorPosition = 0;
                        this.showPrompt();
                        return;
                    }
                    this.handleSelectAll(e);
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
        // Inserisce il carattere nella posizione del cursore
        this.currentLine = 
            this.currentLine.substring(0, this.cursorPosition) + 
            char + 
            this.currentLine.substring(this.cursorPosition);
        this.cursorPosition++;
        this.showPrompt();
    }

    handleBackspace() {
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
        if (this.cursorPosition < this.currentLine.length) {
            // Rimuove il carattere dopo il cursore
            this.currentLine = 
                this.currentLine.substring(0, this.cursorPosition) + 
                this.currentLine.substring(this.cursorPosition + 1);
            this.showPrompt();
        }
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

    handleSelectAll(e) {
        e.preventDefault();
        // Seleziona tutto il contenuto del terminale
        const outputElement = this.outputElement;
        const range = document.createRange();
        range.selectNodeContents(outputElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        this.addOutput('📋 All terminal content selected');
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
        
        // Mostra il comando eseguito
        this.addOutput('$ ' + command);
        
        // Aggiungi alla cronologia e resetta indice
        if (command) {
            this.history.push(command);
            this.historyIndex = -1; // Reset indice dopo nuovo comando
        }

        // Processa il comando
        if (command === 'clear') {
            this.clearTerminal();
        } else if (command === 'help') {
            this.showHelp();
        } else if (command === 'exit') {
            window.close();
        } else if (command === 'enable-pty') {
            this.ptyModeEnabled = true;
            this.addOutput('🔧 PTY mode enabled! Interactive commands (like Homebrew installer) will now work properly.');
        } else if (command === 'disable-pty') {
            this.ptyModeEnabled = false;
            this.addOutput('🔧 PTY mode disabled. Using standard command execution.');
        } else if (command === 'pty-status') {
            this.addOutput(`🔧 PTY mode: ${this.ptyModeEnabled ? 'ENABLED' : 'DISABLED'}`);
            this.addOutput('📝 PTY mode allows interactive commands like Homebrew installer to work properly.');
            this.addOutput('💡 Use "enable-pty" or "disable-pty" to toggle this feature.');
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
        } else if (command) {
            // Prova a eseguire il comando reale
            await this.executeCommand(command);
        }

        // Reset per nuovo comando
        this.currentLine = '';
        this.cursorPosition = 0;
        this.showPrompt();
    }

    async executeCommand(command) {
        try {
            // Controlla se è un comando sudo
            if (command.trim().startsWith('sudo ')) {
                await this.handleSudoCommand(command);
                return;
            }

            // Controlla se è un comando che potrebbe richiedere interazione (come installer)
            if (command.includes('curl -fsSL') && command.includes('install.sh')) {
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
                this.addOutput(result);
            } else {
                this.addOutput(`Command not found: ${command}`);
                this.addOutput('Type "help" for available commands.');
            }
        } catch (error) {
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
            this.addOutput('🔄 Executing sudo command...');
            const result = await window.electronAPI.runSudoCommand(command, password);
            this.addOutput(result);
        } catch (error) {
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

Important Notes:
  🍺 Homebrew: Enhanced mode improves compatibility with installers
  🔐 Interactive Commands: Enhanced environment variables help automation
  ⚡ Performance: Standard mode for simple commands if preferred
  📱 Compatibility: Works without external dependencies

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
        
        if (isAutoExecute) {
            this.addOutput('🚀 AI Agent executing...');
        } else {
            this.addOutput('🤖 Thinking...');
        }
        
        try {
            // Usa il nuovo AI Agent per gestire la richiesta
            const result = await window.electronAPI.aiAgentRequest(question, this.getTerminalContext(), isAutoExecute);
            
            console.log('AI Agent result:', result);
            
            // L'observer si occuperà automaticamente dello scroll per tutto l'output AI
            
            switch (result.type) {
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
    addToAIConversation(type, content, command = null, result = null) {
        this.aiConversation.push({
            timestamp: new Date().toISOString(),
            type: type, // 'user' or 'ai'
            content: content,
            command: command,
            result: result
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
        suggestionDiv.innerHTML = `
            <div class="suggestion-header">
                <span class="suggestion-icon">💡</span>
                <span class="suggestion-text">Suggested command:</span>
            </div>
            <div class="suggested-command">
                <code>${command}</code>
            </div>
            <div class="suggestion-actions">
                <button class="btn-execute" onclick="terminal.executeAISuggestion('${command.replace(/'/g, "\\'")}')">
                    ✅ Esegui
                </button>
                <button class="btn-copy" onclick="terminal.copyAISuggestion('${command.replace(/'/g, "\\'")}')">
                    📋 Copia
                </button>
                <button class="btn-edit" onclick="terminal.editAISuggestion('${command.replace(/'/g, "\\'")}')">
                    ✏️ Modifica
                </button>
                <button class="btn-dismiss" onclick="terminal.dismissAISuggestion(this.closest('.ai-command-suggestion'))">
                    ❌ Ignora
                </button>
            </div>
        `;
        
        this.outputElement.appendChild(suggestionDiv);
        this.scrollToBottom();
        
        // Aggiungi gli stili se non esistono già
        this.addSuggestionStyles();
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
}

// Variabile globale per il terminale
let terminal;

// Inizializza il terminale quando la pagina è carica
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOM CONTENT LOADED - INITIALIZING SIMPLE TERMINAL ===');
    terminal = new SimpleTerminal();
    console.log('=== SIMPLE TERMINAL INITIALIZED ===', terminal);
});
