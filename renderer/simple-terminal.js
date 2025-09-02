console.log('=== SIMPLE TERMINAL FILE LOADED ===');
console.log('=== SIMPLE TERMINAL LOADING ===');

class SimpleTerminal {
    constructor() {
        console.log('=== SIMPLE TERMINAL CONSTRUCTOR ===');
        this.currentLine = '';
        this.history = [];
        this.historyIndex = -1; // Indice per navigazione cronologia
        this.output = [];
        this.cursor = null;
        this.aiConversation = []; // Cronologia conversazioni AI
        this.ptyModeEnabled = true; // Abilita PTY per default per comandi interattivi
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
    }

    createTerminalDisplay() {
        this.container.innerHTML = `
            <div class="simple-terminal-content">
                <div class="terminal-output"></div>
                <div class="terminal-input-line">
                    <span class="prompt">$ </span>
                    <span class="input-text"></span>
                    <span class="terminal-cursor cursor-bar"></span>
                </div>
            </div>
        `;
        
        this.outputElement = this.container.querySelector('.terminal-output');
        this.inputTextElement = this.container.querySelector('.input-text');
        this.cursor = this.container.querySelector('.terminal-cursor');
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

⚡ Smart Features:
  Tab                - Autocomplete commands
  ↑↓                 - Navigate command history
  ⌘+C/⌘+V           - Copy/Paste (⌘+A to select all)

⚙️  Settings: Click the gear icon or press ⌘+,
`;
        this.addOutput(welcome);
    }

    showPrompt() {
        this.inputTextElement.textContent = this.currentLine;
        this.updateCursorPosition();
    }

    updateCursorPosition() {
        // Il cursore è sempre dopo il testo
        const prompt = this.container.querySelector('.prompt');
        const inputText = this.container.querySelector('.input-text');
        const cursor = this.container.querySelector('.terminal-cursor');
        
        if (cursor) {
            cursor.style.opacity = '1';
        }
    }

    addOutput(text) {
        const line = document.createElement('div');
        line.className = 'output-line';
        line.textContent = text;
        this.outputElement.appendChild(line);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
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

        // Scorciatoia da tastiera per le impostazioni
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === ',') {
                e.preventDefault();
                this.openSettings();
            }
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

        } catch (error) {
            console.error('Error applying settings:', error);
        }
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
        if (!this.cursor) return;

        console.log('Applicazione stile cursore:', style);

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
        switch (style) {
            case 'block':
                this.cursor.classList.add('cursor-block');
                this.cursor.textContent = '\u00A0'; // Spazio non-breaking per riempire il blocco
                break;
            case 'underline':
                this.cursor.classList.add('cursor-underline');
                this.cursor.textContent = '\u00A0'; // Spazio non-breaking per mostrare la sottolineatura
                break;
            case 'bar':
            default:
                this.cursor.classList.add('cursor-bar');
                this.cursor.textContent = ''; // Nessun contenuto, solo il bordo
                break;
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
                    this.handleSelectAll(e);
                    return;
                case 'k':
                    e.preventDefault();
                    this.clearTerminal();
                    return;
                case 'l':
                    e.preventDefault();
                    this.clearTerminal();
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
            // TODO: Implementare movimento cursore nella linea
            e.preventDefault();
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
        this.currentLine += char;
        this.showPrompt();
    }

    handleBackspace() {
        if (this.currentLine.length > 0) {
            this.currentLine = this.currentLine.slice(0, -1);
            this.showPrompt();
        }
    }

    handleTab() {
        // Autocompletamento comandi
        if (this.currentLine.trim()) {
            this.handleAutoComplete();
        } else {
            this.currentLine += '    ';
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
                this.currentLine += cleanText;
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
                this.showPrompt();
                return;
            }
        }

        if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
            this.currentLine = this.history[this.historyIndex];
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
            this.showPrompt();
        } else if (matches.length > 1) {
            // Mostra opzioni disponibili
            this.addOutput(`💡 Available completions: ${matches.join(', ')}`);
            this.showPrompt();
        } else {
            // Nessuna corrispondenza, aggiungi tab normale
            this.currentLine += '    ';
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
        this.showWelcome();
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
            
            switch (result.type) {
                case 'informational':
                    this.addOutput('🤖 ' + result.response);
                    this.addToAIConversation('ai', result.response);
                    if (result.iterations > 1) {
                        this.addOutput(`ℹ️ Elaborato in ${result.iterations} iterazioni`);
                    }
                    break;
                    
                case 'suggestion':
                    this.addOutput('🤖 ' + result.response);
                    this.addToAIConversation('ai', result.response, result.command);
                    this.suggestCommand(result.command);
                    break;
                    
                case 'success':
                    this.addOutput('✅ ' + result.response);
                    this.addOutput('📋 Comando finale: ' + result.finalCommand);
                    this.addOutput('📤 Risultato:\n' + result.finalResult.output);
                    this.addOutput(`ℹ️ Completato in ${result.iterations} iterazioni`);
                    this.addToAIConversation('ai', result.response, result.finalCommand, result.finalResult.output);
                    this.showExecutionHistory(result.history);
                    break;
                    
                case 'max_iterations':
                    this.addOutput('⚠️ ' + result.response);
                    this.addOutput('📤 Ultimo risultato:\n' + result.finalResult.output);
                    this.addOutput(`ℹ️ Raggiunto limite di ${result.iterations} iterazioni`);
                    this.addToAIConversation('ai', result.response, null, result.finalResult.output);
                    this.showExecutionHistory(result.history);
                    break;
                    
                default:
                    this.addOutput('❓ Tipo di risposta AI non riconosciuto: ' + result.type);
                    this.addToAIConversation('ai', 'Errore: tipo risposta non riconosciuto');
                    break;
            }
            
        } catch (error) {
            console.error('AI Agent error:', error);
            const errorMsg = 'AI Agent Error: ' + error.message;
            this.addOutput('❌ ' + errorMsg);
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
        
        this.addOutput('\n📚 Cronologia esecuzione:');
        history.forEach((entry, index) => {
            this.addOutput(`  ${entry.iteration}. ${entry.command}`);
            this.addOutput(`     💭 ${entry.reasoning}`);
            if (entry.result.success) {
                this.addOutput(`     ✅ Successo`);
            } else {
                this.addOutput(`     ❌ Errore: ${entry.result.output.substring(0, 100)}...`);
            }
        });
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
