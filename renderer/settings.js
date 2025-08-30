// Settings Panel JavaScript
console.log('=== SETTINGS PANEL LOADED ===');

class SettingsManager {
    constructor() {
        this.config = null;
        this.sections = ['general', 'appearance', 'terminal', 'ai', 'shortcuts'];
        this.currentSection = 'general';
        this.init();
    }

    getPredefinedThemes() {
        return {
            'warp-dark': {
                name: 'warp-dark',
                background: '#1e2124',
                foreground: '#ffffff',
                cursor: '#00d4aa',
                accent: '#00d4aa',
                backgroundBlur: true
            },
            'warp-light': {
                name: 'warp-light',
                background: '#f8f9fa',
                foreground: '#212529',
                cursor: '#0066cc',
                accent: '#0066cc',
                backgroundBlur: true
            },
            'terminal-classic': {
                name: 'terminal-classic',
                background: '#000000',
                foreground: '#00ff00',
                cursor: '#00ff00',
                accent: '#00ff41',
                backgroundBlur: false
            },
            'cyberpunk': {
                name: 'cyberpunk',
                background: '#0f0f23',
                foreground: '#ff00ff',
                cursor: '#00ffff',
                accent: '#ff2d92',
                backgroundBlur: true
            },
            'oh-my-zsh': {
                name: 'oh-my-zsh',
                background: '#1a1a1a',
                foreground: '#ffffff',
                cursor: '#ff6b6b',
                accent: '#ff6b6b',
                backgroundBlur: true,
                colors: {
                    black: '#1a1a1a',
                    red: '#ff6b6b',
                    green: '#51cf66',
                    yellow: '#ffd43b',
                    blue: '#339af0',
                    magenta: '#f06292',
                    cyan: '#22d3ee',
                    white: '#ffffff',
                    brightBlack: '#6c757d',
                    brightRed: '#ff8a80',
                    brightGreen: '#69db7c',
                    brightYellow: '#ffe066',
                    brightBlue: '#4dabf7',
                    brightMagenta: '#f48fb1',
                    brightCyan: '#67e8f9',
                    brightWhite: '#ffffff'
                }
            }
        };
    }

    async init() {
        console.log('Initializing settings panel...');
        await this.loadConfig();
        this.setupEventListeners();
        this.setupNavigation();
        this.populateAvailableFonts();
        this.populateForm();
        this.showSection('general');
    }

    async loadConfig() {
        try {
            this.config = await window.electronAPI.getConfig();
            console.log('Configuration loaded:', this.config);
        } catch (error) {
            console.error('Error loading configuration:', error);
            this.config = {};
        }
    }

    setupEventListeners() {
        // Pulsanti header
        document.getElementById('save-btn').addEventListener('click', () => this.saveSettings());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetSettings());
        document.getElementById('close-btn').addEventListener('click', () => this.closeSettings());

        // Range sliders - aggiorna display valore
        document.querySelectorAll('input[type="range"]').forEach(range => {
            const valueDisplay = range.nextElementSibling;
            if (valueDisplay && valueDisplay.classList.contains('range-value')) {
                const updateValue = () => {
                    valueDisplay.textContent = range.value + (range.id === 'font-size' ? 'px' : '');
                };
                range.addEventListener('input', updateValue);
                updateValue(); // Imposta valore iniziale
            }
        });

        // Color inputs - applica cambiamenti in tempo reale per preview
        document.querySelectorAll('input[type="color"]').forEach(input => {
            input.addEventListener('input', () => this.previewChanges());
        });

        // Theme selector - applica tema predefinito quando selezionato
        document.getElementById('theme-name').addEventListener('change', (e) => {
            this.applyPredefinedTheme(e.target.value);
            this.previewChanges();
        });

        // Font family - applica cambiamenti in tempo reale
        document.getElementById('font-family').addEventListener('change', () => this.previewChanges());
        
        // AI Provider selector - mostra/nasconde sezioni configurazione
        document.getElementById('ai-provider').addEventListener('change', (e) => {
            this.showAIProviderConfig(e.target.value);
            this.previewChanges();
        });
        
        // Aggiungi event listeners per tutti gli input AI
        document.querySelectorAll('#ai input, #ai select').forEach(input => {
            input.addEventListener('change', () => this.previewChanges());
        });
        
        // Font size - applica cambiamenti in tempo reale
        document.getElementById('font-size').addEventListener('input', () => this.previewChanges());
        
        // Pulsante refresh font
        document.getElementById('refresh-fonts-btn').addEventListener('click', () => {
            console.log('Reloading font list...');
            this.populateAvailableFonts();
            // Ri-applica la selezione corrente
            if (this.config && this.config.terminal && this.config.terminal.fontFamily) {
                this.setValueSafely('font-family', this.config.terminal.fontFamily);
            }
        });
    }

    applyPredefinedTheme(themeName) {
        console.log('Applying predefined theme:', themeName);
        const predefinedThemes = this.getPredefinedThemes();
        const theme = predefinedThemes[themeName];
        
        if (!theme) {
            console.warn('Tema non trovato:', themeName);
            return;
        }

        // Applica i colori del tema ai controlli del pannello
        this.setValueSafely('color-background', theme.background);
        this.setValueSafely('color-foreground', theme.foreground);
        this.setValueSafely('color-cursor', theme.cursor);
        this.setValueSafely('color-accent', theme.accent);
        this.setValueSafely('background-blur', theme.backgroundBlur);
        
        // Aggiorna l'anteprima del tema
        this.updateThemePreview(theme);
        
        console.log('Theme applied:', theme);
    }

    updateThemePreview(theme) {
        const preview = document.getElementById('theme-preview');
        if (!preview) return;

        // Applica i colori all'anteprima
        preview.style.backgroundColor = theme.background;
        preview.style.color = theme.foreground;
        
        const prompt = preview.querySelector('.preview-prompt');
        const cursor = preview.querySelector('.preview-cursor');
        
        if (prompt) prompt.style.color = theme.accent;
        if (cursor) cursor.style.color = theme.cursor;
        
        const text = preview.querySelector('.preview-text');
        const output = preview.querySelector('.preview-output');
        
        if (text) text.style.color = theme.foreground;
        if (output) output.style.color = theme.foreground;
        
        // Special handling for Oh My ZSH! theme
        if (theme.name === 'oh-my-zsh') {
            if (text) text.textContent = 'ls -la';
            if (output) {
                output.innerHTML = '<span style="color: var(--terminal-blue)">drwxr-xr-x</span> <span style="color: var(--terminal-green)">user</span> <span style="color: var(--terminal-yellow)">Documents</span>';
            }
        }
    }

    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });
    }

    showSection(sectionName) {
        // Aggiorna navigazione
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Mostra sezione
        document.querySelectorAll('.settings-section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(sectionName).style.display = 'block';

        this.currentSection = sectionName;
        
        // Se stiamo mostrando la sezione AI, configura il provider corrente
        if (sectionName === 'ai' && this.config && this.config.ai) {
            this.showAIProviderConfig(this.config.ai.provider);
        }
    }

    showAIProviderConfig(provider) {
        // Nasconde tutte le sezioni di configurazione provider
        document.querySelectorAll('.provider-config').forEach(section => {
            section.style.display = 'none';
        });

        // Mostra la sezione appropriata
        const configSection = document.getElementById(`${provider}-config`);
        if (configSection) {
            configSection.style.display = 'block';
        }
        
        console.log(`Showing AI provider config for: ${provider}`);
    }

    populateAvailableFonts() {
        const fontSelect = document.getElementById('font-family');
        if (!fontSelect) return;

        // Lista di font monospaced da testare
        const candidateFonts = [
            // Font molto comuni su macOS
            { name: 'SF Mono', family: 'SF Mono' },
            { name: 'Monaco', family: 'Monaco' },
            { name: 'Menlo', family: 'Menlo' },
            
            // Font di sviluppo popolari (potrebbero essere installati)
            { name: 'JetBrains Mono', family: 'JetBrains Mono' },
            { name: 'Fira Code', family: 'Fira Code' },
            { name: 'Source Code Pro', family: 'Source Code Pro' },
            { name: 'Hack', family: 'Hack' },
            { name: 'Inconsolata', family: 'Inconsolata' },
            { name: 'Roboto Mono', family: 'Roboto Mono' },
            
            // Font di sistema
            { name: 'Consolas', family: 'Consolas' },
            { name: 'Courier New', family: 'Courier New' },
            { name: 'Andale Mono', family: 'Andale Mono' },
            
            // Font generici come fallback
            { name: 'monospace (sistema)', family: 'monospace' }
        ];

        // Pulisce le opzioni esistenti
        fontSelect.innerHTML = '';

        // Testa ogni font e lo aggiunge se disponibile
        const availableFonts = [];
        candidateFonts.forEach(font => {
            if (this.isFontAvailable(font.family)) {
                availableFonts.push(font);
                const option = document.createElement('option');
                option.value = font.family;
                option.textContent = font.name;
                fontSelect.appendChild(option);
            }
        });

        console.log('Available fonts found:', availableFonts.map(f => f.name));
    }

    isFontAvailable(fontName) {
        // Crea un elemento di test per verificare se il font è disponibile
        const testElement = document.createElement('span');
        testElement.style.fontFamily = fontName;
        testElement.style.fontSize = '16px';
        testElement.style.position = 'absolute';
        testElement.style.visibility = 'hidden';
        testElement.style.top = '-1000px';
        testElement.textContent = 'abcdefghijklmnopqrstuvwxyz0123456789';
        
        document.body.appendChild(testElement);
        
        // Misuriamo la larghezza con font di fallback
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
        
        // Pulisci gli elementi di test
        document.body.removeChild(testElement);
        document.body.removeChild(fallbackElement);
        
        // Se le larghezze sono diverse, il font è disponibile
        // Se sono uguali, il browser ha usato il fallback
        const isAvailable = testWidth !== fallbackWidth || fontName === 'monospace';
        
        // Alcuni font potrebbero avere la stessa larghezza ma essere disponibili
        // Facciamo un test aggiuntivo con Canvas per alcuni font importanti
        if (!isAvailable && (fontName.includes('SF Mono') || fontName.includes('Monaco') || fontName.includes('Menlo'))) {
            return this.isFontAvailableCanvas(fontName);
        }
        
        return isAvailable;
    }

    isFontAvailableCanvas(fontName) {
        // Test più accurato usando Canvas
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Testa il font con il fallback
            context.font = '16px monospace';
            const fallbackWidth = context.measureText('abcdefghijklmnopqrstuvwxyz').width;
            
            // Testa il font richiesto
            context.font = `16px "${fontName}", monospace`;
            const testWidth = context.measureText('abcdefghijklmnopqrstuvwxyz').width;
            
            return testWidth !== fallbackWidth;
        } catch (error) {
            console.warn('Error in canvas test for font:', fontName, error);
            return false;
        }
    }

    populateForm() {
        if (!this.config) return;

        try {
            // Theme/Appearance
            if (this.config.theme) {
                this.setValueSafely('theme-name', this.config.theme.name);
                this.setValueSafely('color-background', this.config.theme.background);
                this.setValueSafely('color-foreground', this.config.theme.foreground);
                this.setValueSafely('color-cursor', this.config.theme.cursor);
                this.setValueSafely('color-accent', this.config.theme.accent);
                this.setValueSafely('background-blur', this.config.theme.backgroundBlur);
                
                // Aggiorna l'anteprima del tema
                this.updateThemePreview(this.config.theme);
                
                // Se il tema ha colori ANSI personalizzati, applica il tema predefinito completo
                if (this.config.theme.colors && this.config.theme.name === 'oh-my-zsh') {
                    const predefinedThemes = this.getPredefinedThemes();
                    const ohMyZshTheme = predefinedThemes['oh-my-zsh'];
                    if (ohMyZshTheme) {
                        this.updateThemePreview(ohMyZshTheme);
                    }
                }
            }

            // Terminal
            if (this.config.terminal) {
                this.setValueSafely('font-family', this.config.terminal.fontFamily.split(',')[0].trim());
                this.setValueSafely('font-size', this.config.terminal.fontSize);
                this.setValueSafely('line-height', this.config.terminal.lineHeight);
                this.setValueSafely('cursor-style', this.config.terminal.cursorStyle);
                this.setValueSafely('cursor-blink', this.config.terminal.cursorBlink);
                this.setValueSafely('scrollback', this.config.terminal.scrollback);
                this.setValueSafely('bell-sound', this.config.terminal.bellSound);
            }

            // AI
            if (this.config.ai) {
                this.setValueSafely('ai-provider', this.config.ai.provider);
                this.setValueSafely('ai-auto-execute', this.config.ai.autoExecute);
                this.setValueSafely('ai-context-lines', this.config.ai.contextLines);
                
                // API Keys e configurazioni specifiche
                if (this.config.ai.gemini) {
                    this.setValueSafely('gemini-api-key', this.config.ai.gemini.apiKey);
                    this.setValueSafely('gemini-model', this.config.ai.gemini.model);
                }
                if (this.config.ai.openai) {
                    this.setValueSafely('openai-api-key', this.config.ai.openai.apiKey);
                    this.setValueSafely('openai-model', this.config.ai.openai.model);
                }
                if (this.config.ai.lmStudio) {
                    this.setValueSafely('lm-studio-endpoint', this.config.ai.lmStudio.endpoint);
                    this.setValueSafely('lm-studio-model', this.config.ai.lmStudio.model);
                    this.setValueSafely('lm-studio-api-key', this.config.ai.lmStudio.apiKey);
                }
                
                // Mostra la configurazione del provider attuale
                this.showAIProviderConfig(this.config.ai.provider);
            }

            // Aggiorna i display dei range
            this.updateRangeDisplays();

        } catch (error) {
            console.error('Error populating form:', error);
        }
    }

    setValueSafely(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = Boolean(value);
            } else if (elementId === 'font-family') {
                // Gestione speciale per font family
                this.setFontFamilySafely(element, value);
            } else {
                element.value = value;
            }
        }
    }

    setFontFamilySafely(selectElement, fontValue) {
        if (!fontValue) return;

        // Estrae il primo font dalla stringa (potrebbe essere "Font Name, fallback")
        const primaryFont = fontValue.split(',')[0].trim().replace(/['"]/g, '');
        
        // Cerca una corrispondenza esatta
        let found = false;
        for (let option of selectElement.options) {
            if (option.value === primaryFont || option.value.includes(primaryFont)) {
                selectElement.value = option.value;
                found = true;
                break;
            }
        }

        // Se non trova una corrispondenza esatta, cerca per nome simile
        if (!found) {
            for (let option of selectElement.options) {
                if (option.textContent.toLowerCase().includes(primaryFont.toLowerCase()) ||
                    primaryFont.toLowerCase().includes(option.textContent.toLowerCase())) {
                    selectElement.value = option.value;
                    found = true;
                    break;
                }
            }
        }

        // Se ancora non trova nulla, usa il primo font disponibile
        if (!found && selectElement.options.length > 0) {
            selectElement.value = selectElement.options[0].value;
            console.warn(`Font "${primaryFont}" non trovato, uso fallback: ${selectElement.options[0].value}`);
        }
    }

    updateRangeDisplays() {
        document.querySelectorAll('input[type="range"]').forEach(range => {
            const valueDisplay = range.nextElementSibling;
            if (valueDisplay && valueDisplay.classList.contains('range-value')) {
                valueDisplay.textContent = range.value + (range.id === 'font-size' ? 'px' : '');
            }
        });
    }

    previewChanges() {
        // Questo metodo può essere usato per applicare cambiamenti in tempo reale
        // Invia un messaggio alla finestra principale per aggiornare l'anteprima
        try {
            const previewConfig = this.gatherFormData();
            
            // Aggiorna l'anteprima locale nel pannello
            if (previewConfig.theme) {
                this.updateThemePreview(previewConfig.theme);
            }
            
            window.electronAPI.sendMessage('preview-settings', previewConfig);
        } catch (error) {
            console.error('Error in preview:', error);
        }
    }

    gatherFormData() {
        const themeName = this.getValueSafely('theme-name', 'warp-dark');
        const predefinedThemes = this.getPredefinedThemes();
        const selectedTheme = predefinedThemes[themeName];
        
        const formData = {
            theme: {
                name: themeName,
                background: this.getValueSafely('color-background', '#1e2124'),
                foreground: this.getValueSafely('color-foreground', '#ffffff'),
                cursor: this.getValueSafely('color-cursor', '#00d4aa'),
                accent: this.getValueSafely('color-accent', '#00d4aa'),
                backgroundBlur: this.getCheckedSafely('background-blur', true),
                // Include ANSI colors for Oh My ZSH! theme
                ...(selectedTheme && selectedTheme.colors ? { colors: selectedTheme.colors } : {})
            },
            terminal: {
                fontFamily: this.getValueSafely('font-family', 'JetBrains Mono'),
                fontSize: parseInt(this.getValueSafely('font-size', '14')),
                lineHeight: parseFloat(this.getValueSafely('line-height', '1.4')),
                cursorStyle: this.getValueSafely('cursor-style', 'bar'),
                cursorBlink: this.getCheckedSafely('cursor-blink', true),
                scrollback: parseInt(this.getValueSafely('scrollback', '10000')),
                bellSound: this.getCheckedSafely('bell-sound', false)
            },
            ai: {
                provider: this.getValueSafely('ai-provider', 'gemini'),
                autoExecute: this.getCheckedSafely('ai-auto-execute', false),
                contextLines: parseInt(this.getValueSafely('ai-context-lines', '10')),
                gemini: {
                    apiKey: this.getValueSafely('gemini-api-key', ''),
                    model: this.getValueSafely('gemini-model', 'gemini-2.5-flash')
                },
                openai: {
                    apiKey: this.getValueSafely('openai-api-key', ''),
                    model: this.getValueSafely('openai-model', 'gpt-3.5-turbo'),
                    endpoint: 'https://api.openai.com/v1'
                },
                lmStudio: {
                    endpoint: this.getValueSafely('lm-studio-endpoint', 'http://localhost:1234/v1'),
                    model: this.getValueSafely('lm-studio-model', 'local-model'),
                    apiKey: this.getValueSafely('lm-studio-api-key', 'lm-studio')
                }
            }
        };

        return formData;
    }

    getValueSafely(elementId, defaultValue = '') {
        const element = document.getElementById(elementId);
        return element ? element.value : defaultValue;
    }

    getCheckedSafely(elementId, defaultValue = false) {
        const element = document.getElementById(elementId);
        return element ? element.checked : defaultValue;
    }

    async saveSettings() {
        try {
            const formData = this.gatherFormData();
            console.log('Saving settings:', formData);

            // Salva la configurazione
            const success = await window.electronAPI.saveConfig(formData);
            
            if (success) {
                this.showNotification('Settings saved successfully!', 'success');
                // Invia un messaggio alla finestra principale per applicare le modifiche
                window.electronAPI.sendMessage('settings-saved', formData);
                
                // Aggiorna lo stato AI dopo il salvataggio
                try {
                    await window.electronAPI.updateAIStatus();
                } catch (error) {
                    console.error('Error updating AI status after save:', error);
                }
            } else {
                this.showNotification('Error saving settings', 'error');
            }
        } catch (error) {
            console.error('Error saving:', error);
            this.showNotification('Error saving settings', 'error');
        }
    }

    async resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default values?')) {
            try {
                await window.electronAPI.resetConfig();
                await this.loadConfig();
                this.populateForm();
                this.showNotification('Settings reset to default values', 'success');
            } catch (error) {
                console.error('Error in reset:', error);
                this.showNotification('Error resetting settings', 'error');
            }
        }
    }

    closeSettings() {
        window.electronAPI.closeSettings();
    }

    showNotification(message, type = 'info') {
        // Crea una notifica temporanea
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            transition: all 0.3s ease;
            ${type === 'success' ? 'background: #4CAF50;' : ''}
            ${type === 'error' ? 'background: #f44336;' : ''}
            ${type === 'info' ? 'background: #2196F3;' : ''}
        `;

        document.body.appendChild(notification);

        // Rimuovi dopo 3 secondi
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    async testAIConnection(provider) {
        console.log(`Testing AI connection for provider: ${provider}`);
        
        const statusElement = document.getElementById(`${provider}-status`);
        const statusIndicator = statusElement.querySelector('.status-indicator');
        const statusText = statusElement.querySelector('span');
        
        // Mostra stato di test
        statusElement.style.display = 'flex';
        statusIndicator.className = 'status-indicator status-unknown';
        statusText.textContent = 'Testing connection...';
        
        try {
            // Raccogli i dati di configurazione temporanei
            const testConfig = this.gatherFormData();
            
            // Usa la nuova API per testare senza cambiare la configurazione permanente
            const testResult = await window.electronAPI.testAIConnection(provider, testConfig.ai);
            
            console.log(`AI test result for ${provider}:`, testResult);
            
            if (testResult.success && testResult.response && 
                !testResult.response.includes('[AI] Errore') && 
                !testResult.response.includes('Error')) {
                statusIndicator.className = 'status-indicator status-connected';
                statusText.textContent = '✅ Connection successful';
                
                this.showNotification(`${this.getProviderDisplayName(provider)} connection successful!`, 'success');
            } else {
                throw new Error(testResult.error || 'Invalid response from AI');
            }
            
        } catch (error) {
            console.error(`AI connection test failed for ${provider}:`, error);
            statusIndicator.className = 'status-indicator status-disconnected';
            statusText.textContent = '❌ Connection failed';
            
            this.showNotification(`${this.getProviderDisplayName(provider)} connection failed: ${error.message}`, 'error');
        }
        
        // Nascondi lo stato dopo 5 secondi
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }

    getProviderDisplayName(provider) {
        const displayNames = {
            'gemini': 'Google Gemini',
            'openai': 'OpenAI',
            'lm-studio': 'LM Studio'
        };
        return displayNames[provider] || provider;
    }
}

// Rendi SettingsManager disponibile globalmente per i pulsanti onclick
let settingsManager;

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    settingsManager = new SettingsManager();
});
