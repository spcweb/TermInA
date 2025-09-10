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
        console.log('=== DEBUG: loadConfig called ===');
        try {
            // Prova diversi modi per accedere all'API Tauri
            let tauriApi = null;
            
            // Metodo 1: window.__TAURI__
            if (window.__TAURI__ && window.__TAURI__.tauri && window.__TAURI__.tauri.invoke) {
                tauriApi = window.__TAURI__.tauri;
                console.log('✅ Found Tauri API via window.__TAURI__');
            }
            // Metodo 2: window.__TAURI_INTERNALS__
            else if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
                tauriApi = window.__TAURI_INTERNALS__;
                console.log('✅ Found Tauri API via window.__TAURI_INTERNALS__');
            }
            // Metodo 3: window.tauri
            else if (window.tauri && window.tauri.invoke) {
                tauriApi = window.tauri;
                console.log('✅ Found Tauri API via window.tauri');
            }
            // Metodo 4: window.__TAURI__.core
            else if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
                tauriApi = window.__TAURI__.core;
                console.log('✅ Found Tauri API via window.__TAURI__.core');
            }
            // Metodo 5: window.__TAURI__.api
            else if (window.__TAURI__ && window.__TAURI__.api && window.__TAURI__.api.invoke) {
                tauriApi = window.__TAURI__.api;
                console.log('✅ Found Tauri API via window.__TAURI__.api');
            }
            // Metodo 6: import dinamico
            else {
                try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    tauriApi = { invoke };
                    console.log('✅ Found Tauri API via dynamic import');
                } catch (importError) {
                    console.log('❌ Could not import Tauri API:', importError);
                }
            }
            
            if (tauriApi && tauriApi.invoke) {
                console.log('✅ Tauri API available, calling get_config');
                this.config = await tauriApi.invoke('get_config');
                console.log('✅ Configuration loaded:', this.config);
            } else {
                console.log('❌ Tauri API not available, using default config');
                this.config = {
                    ai: {
                        provider: "ollama",
                        ollama: {
                            base_url: "http://localhost:11434",
                            model: "gpt-oss:20b",
                            temperature: 0.7
                        }
                    }
                };
            }
        } catch (error) {
            console.error('❌ Error loading configuration:', error);
            this.config = {
                ai: {
                    provider: "ollama",
                    ollama: {
                        base_url: "http://localhost:11434",
                        model: "gpt-oss:20b",
                        temperature: 0.7
                    }
                }
            };
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
                this.setValueSafely('background-blur', this.config.theme.background_blur);
                
                // Aggiorna l'anteprima del tema
                this.updateThemePreview(this.config.theme);
            }

            // Terminal
            if (this.config.terminal) {
                this.setValueSafely('font-family', this.config.terminal.font_family ? this.config.terminal.font_family.split(',')[0].trim() : 'JetBrains Mono');
                this.setValueSafely('font-size', this.config.terminal.font_size || 14);
                this.setValueSafely('line-height', this.config.terminal.line_height || 1.4);
                this.setValueSafely('cursor-style', this.config.terminal.cursor_style || 'bar');
                this.setValueSafely('cursor-blink', this.config.terminal.cursor_blink !== undefined ? this.config.terminal.cursor_blink : true);
                this.setValueSafely('scrollback', this.config.terminal.scrollback || 10000);
                this.setValueSafely('bell-sound', this.config.terminal.bell_sound !== undefined ? this.config.terminal.bell_sound : false);
                this.setValueSafely('auto-scroll', this.config.terminal.auto_scroll !== undefined ? this.config.terminal.auto_scroll : true);
                this.setValueSafely('smooth-scroll', this.config.terminal.smooth_scroll !== undefined ? this.config.terminal.smooth_scroll : true);
            }

            // AI
            if (this.config.ai) {
                this.setValueSafely('ai-provider', this.config.ai.provider);
                this.setValueSafely('ai-auto-execute', this.config.ai.auto_execute);
                this.setValueSafely('ai-context-lines', this.config.ai.context_lines);
                
                // API Keys e configurazioni specifiche
                if (this.config.ai.gemini) {
                    this.setValueSafely('gemini-api-key', this.config.ai.gemini.api_key);
                    this.setValueSafely('gemini-model', this.config.ai.gemini.model);
                    if (this.config.ai.gemini.temperature !== undefined) {
                        this.setValueSafely('gemini-temperature', this.config.ai.gemini.temperature);
                    }
                    if (this.config.ai.gemini.max_output_tokens !== undefined) {
                        this.setValueSafely('gemini-max-output', this.config.ai.gemini.max_output_tokens);
                    }
                }
                if (this.config.ai.openai) {
                    this.setValueSafely('openai-api-key', this.config.ai.openai.api_key);
                    this.setValueSafely('openai-model', this.config.ai.openai.model);
                    if (this.config.ai.openai.temperature !== undefined) {
                        this.setValueSafely('openai-temperature', this.config.ai.openai.temperature);
                    }
                    if (this.config.ai.openai.max_tokens !== undefined) {
                        this.setValueSafely('openai-max-tokens', this.config.ai.openai.max_tokens);
                    }
                }
                if (this.config.ai.ollama) {
                    this.setValueSafely('ollama-endpoint', this.config.ai.ollama.base_url);
                    this.setValueSafely('ollama-model', this.config.ai.ollama.model);
                    if (this.config.ai.ollama.temperature !== undefined) {
                        this.setValueSafely('ollama-temperature', this.config.ai.ollama.temperature);
                    }
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
            
            // In Tauri v2, non usiamo sendMessage per il preview
            // Le modifiche vengono applicate automaticamente
        } catch (error) {
            console.error('Error in preview:', error);
        }
    }

    gatherFormData() {
        const formData = {
            theme: {
                name: this.getValueSafely('theme-name', 'warp-dark'),
                background: this.getValueSafely('color-background', '#1e2124'),
                foreground: this.getValueSafely('color-foreground', '#ffffff'),
                cursor: this.getValueSafely('color-cursor', '#00d4aa'),
                accent: this.getValueSafely('color-accent', '#00d4aa'),
                background_blur: this.getCheckedSafely('background-blur', true)
            },
            terminal: {
                font_family: this.getValueSafely('font-family', 'JetBrains Mono'),
                font_size: parseInt(this.getValueSafely('font-size', '14')) || 14,
                line_height: parseFloat(this.getValueSafely('line-height', '1.4')) || 1.4,
                cursor_style: this.getValueSafely('cursor-style', 'bar'),
                cursor_blink: this.getCheckedSafely('cursor-blink', true),
                scrollback: parseInt(this.getValueSafely('scrollback', '10000')) || 10000,
                bell_sound: this.getCheckedSafely('bell-sound', false),
                auto_scroll: this.getCheckedSafely('auto-scroll', true),
                smooth_scroll: this.getCheckedSafely('smooth-scroll', true)
            },
            ai: {
                provider: this.getValueSafely('ai-provider', 'gemini'),
                auto_execute: this.getCheckedSafely('ai-auto-execute', false),
                context_lines: parseInt(this.getValueSafely('ai-context-lines', '10')) || 10,
                gemini: {
                    api_key: this.getValueSafely('gemini-api-key', ''),
                    model: this.getValueSafely('gemini-model', 'gemini-2.5-flash'),
                    temperature: parseFloat(this.getValueSafely('gemini-temperature', '0.7')) || 0.7,
                    max_output_tokens: parseInt(this.getValueSafely('gemini-max-output', '4096')) || 4096
                },
                openai: {
                    api_key: this.getValueSafely('openai-api-key', ''),
                    model: this.getValueSafely('openai-model', 'gpt-4o'),
                    temperature: parseFloat(this.getValueSafely('openai-temperature', '0.7')) || 0.7,
                    max_tokens: parseInt(this.getValueSafely('openai-max-tokens', '4096')) || 4096
                },
                ollama: {
                    base_url: this.getValueSafely('ollama-endpoint', 'http://localhost:11434'),
                    model: this.getValueSafely('ollama-model', 'gpt-oss:20b'),
                    temperature: parseFloat(this.getValueSafely('ollama-temperature', '0.7')) || 0.7
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
        console.log('=== DEBUG: saveSettings called ===');
        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.innerHTML;
        
        try {
            // Mostra stato "saving"
            saveBtn.innerHTML = '💾 Saving...';
            saveBtn.disabled = true;
            saveBtn.style.background = '#2196F3';
            
            const formData = this.gatherFormData();
            console.log('Saving settings:', formData);

            // Prova diversi modi per accedere all'API Tauri
            let tauriApi = null;
            
            // Metodo 1: window.__TAURI__
            if (window.__TAURI__ && window.__TAURI__.tauri && window.__TAURI__.tauri.invoke) {
                tauriApi = window.__TAURI__.tauri;
                console.log('✅ Found Tauri API via window.__TAURI__');
            }
            // Metodo 2: window.__TAURI_INTERNALS__
            else if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
                tauriApi = window.__TAURI_INTERNALS__;
                console.log('✅ Found Tauri API via window.__TAURI_INTERNALS__');
            }
            // Metodo 3: window.tauri
            else if (window.tauri && window.tauri.invoke) {
                tauriApi = window.tauri;
                console.log('✅ Found Tauri API via window.tauri');
            }
            // Metodo 4: import dinamico
            else {
                try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    tauriApi = { invoke };
                    console.log('✅ Found Tauri API via dynamic import');
                } catch (importError) {
                    console.log('❌ Could not import Tauri API:', importError);
                }
            }
            
            if (!tauriApi || !tauriApi.invoke) {
                console.log('❌ Tauri API not available, using fallback');
                // Fallback: salva in localStorage
                localStorage.setItem('termina_settings', JSON.stringify(formData));
                console.log('✅ Settings saved to localStorage');
                saveBtn.innerHTML = '✅ Saved!';
                saveBtn.style.background = '#4CAF50';
                this.showNotification('Settings saved to localStorage!', 'success');
                return;
            }

            console.log('✅ Tauri API available, calling set_config');
            console.log('📤 Sending data to backend:', JSON.stringify(formData, null, 2));
            // Salva la configurazione
            const success = await tauriApi.invoke('set_config', { key: 'full_config', value: formData });
            console.log('✅ set_config result:', success);
            
            if (success) {
                // Successo
                saveBtn.innerHTML = '✅ Saved!';
                saveBtn.style.background = '#4CAF50';
                this.showNotification('Settings saved successfully!', 'success');
                
                // Notifica il terminale principale per applicare le nuove impostazioni
                this.notifyMainWindow(formData);
                
                // Ripristina il pulsante dopo 2 secondi
                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                    saveBtn.disabled = false;
                    saveBtn.style.background = '';
                }, 2000);
            } else {
                // Errore di salvataggio
                saveBtn.innerHTML = '❌ Error';
                saveBtn.style.background = '#f44336';
                this.showNotification('Error saving settings', 'error');
                
                // Ripristina il pulsante dopo 2 secondi
                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                    saveBtn.disabled = false;
                    saveBtn.style.background = '';
                }, 2000);
            }
        } catch (error) {
            console.error('Error saving:', error);
            
            // Errore di connessione/API
            saveBtn.innerHTML = '❌ Error';
            saveBtn.style.background = '#f44336';
            this.showNotification('Error saving settings', 'error');
            
            // Ripristina il pulsante dopo 2 secondi
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                saveBtn.style.background = '';
            }, 2000);
        }
    }

    async resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default values?')) {
            try {
                await window.__TAURI__.tauri.invoke('set_config', { key: 'reset', value: 'default' });
                await this.loadConfig();
                this.populateForm();
                this.showNotification('Settings reset to default values', 'success');
            } catch (error) {
                console.error('Error in reset:', error);
                this.showNotification('Error resetting settings', 'error');
            }
        }
    }

    async closeSettings() {
        console.log('=== DEBUG: closeSettings called ===');
        try {
            // Prova diversi modi per accedere all'API Tauri
            let tauriApi = null;
            
            // Metodo 1: window.__TAURI__
            if (window.__TAURI__ && window.__TAURI__.tauri && window.__TAURI__.tauri.invoke) {
                tauriApi = window.__TAURI__.tauri;
                console.log('✅ Found Tauri API via window.__TAURI__');
            }
            // Metodo 2: window.__TAURI_INTERNALS__
            else if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
                tauriApi = window.__TAURI_INTERNALS__;
                console.log('✅ Found Tauri API via window.__TAURI_INTERNALS__');
            }
            // Metodo 3: window.tauri
            else if (window.tauri && window.tauri.invoke) {
                tauriApi = window.tauri;
                console.log('✅ Found Tauri API via window.tauri');
            }
            // Metodo 4: import dinamico
            else {
                try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    tauriApi = { invoke };
                    console.log('✅ Found Tauri API via dynamic import');
                } catch (importError) {
                    console.log('❌ Could not import Tauri API:', importError);
                }
            }
            
            if (tauriApi && tauriApi.invoke) {
                console.log('✅ Tauri API available, trying different close methods');
                
                // Metodo 1: comando personalizzato
                try {
                    const result = await tauriApi.invoke('close_current_window');
                    console.log('✅ close_current_window result:', result);
                    return;
                } catch (e) {
                    console.log('❌ close_current_window failed:', e);
                }
                
                // Metodo 2: API Tauri v2 per chiudere la finestra corrente
                try {
                    if (window.__TAURI__.window) {
                        await window.__TAURI__.window.getCurrent().close();
                        console.log('✅ window.close() successful');
                        return;
                    }
                } catch (e) {
                    console.log('❌ window.close() failed:', e);
                }
                
                // Metodo 3: API alternativa
                try {
                    if (window.__TAURI__.core && window.__TAURI__.core.close) {
                        await window.__TAURI__.core.close();
                        console.log('✅ core.close() successful');
                        return;
                    }
                } catch (e) {
                    console.log('❌ core.close() failed:', e);
                }
            }
            
            console.log('❌ All Tauri methods failed, using window.close()');
            // Fallback: chiudi la finestra del browser
            window.close();
        } catch (error) {
            console.error('❌ Error closing settings window:', error);
            // Fallback: chiudi la finestra del browser
            window.close();
        }
    }

    async notifyMainWindow(config) {
        try {
            // Prova diversi modi per accedere all'API Tauri
            let tauriApi = null;
            
            if (window.__TAURI__ && window.__TAURI__.tauri && window.__TAURI__.tauri.invoke) {
                tauriApi = window.__TAURI__.tauri;
            } else if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
                tauriApi = window.__TAURI_INTERNALS__;
            } else if (window.tauri && window.tauri.invoke) {
                tauriApi = window.tauri;
            } else {
                try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    tauriApi = { invoke };
                } catch (importError) {
                    console.log('Could not import Tauri API for notification');
                }
            }
            
            if (tauriApi && tauriApi.invoke) {
                // Chiama un comando per notificare il terminale principale
                await tauriApi.invoke('apply_settings', { config });
                console.log('✅ Main window notified of settings changes');
            }
        } catch (error) {
            console.error('Error notifying main window:', error);
        }
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

        // Rimuovi dopo 1.5 secondi
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 1000);
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
            // Prova diversi modi per accedere all'API Tauri
            let tauriApi = null;
            
            if (window.__TAURI__ && window.__TAURI__.tauri && window.__TAURI__.tauri.invoke) {
                tauriApi = window.__TAURI__.tauri;
            } else if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
                tauriApi = window.__TAURI_INTERNALS__;
            } else if (window.tauri && window.tauri.invoke) {
                tauriApi = window.tauri;
            } else {
                try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    tauriApi = { invoke };
                } catch (importError) {
                    console.log('Could not import Tauri API for testing connection');
                }
            }
            
            if (!tauriApi || !tauriApi.invoke) {
                throw new Error('Tauri API not available');
            }
            
            // Raccogli i dati di configurazione temporanei
            const testConfig = this.gatherFormData();
            
            // Usa la nuova API per testare senza cambiare la configurazione permanente
            // Allinea provider dell'oggetto di test se differente
            const effectiveProvider = provider || testConfig.ai.provider;
            testConfig.ai.provider = effectiveProvider;

            console.log(`Calling test_ai_connection with provider: ${effectiveProvider} and config:`, testConfig.ai);
            // Invocazione adattiva: prima snake_case, poi camelCase se necessario
            let testResult;
            try {
                testResult = await tauriApi.invoke('test_ai_connection', { provider: effectiveProvider, ai_config: testConfig.ai });
            } catch (e1) {
                const msg = (e1 && (e1.message || e1.error || e1.toString())) || '';
                if (/missing required key\s*aiConfig/i.test(msg) || /invalid args\s*`?aiConfig`?/i.test(msg)) {
                    // Retry con camelCase
                    testResult = await tauriApi.invoke('test_ai_connection', { provider: effectiveProvider, aiConfig: testConfig.ai });
                } else {
                    throw e1;
                }
            }
            
            // Normalizza risposta (può arrivare come stringa)
            if (typeof testResult === 'string') {
                try { testResult = JSON.parse(testResult); } catch { testResult = { success: false, error: testResult }; }
            }
            
            console.log(`AI test result for ${effectiveProvider}:`, testResult);
            
            const responseText = (testResult && testResult.response) ? String(testResult.response) : '';
            if ((testResult.success === true) || (responseText && !/\b(Error|Errore)\b/i.test(responseText))) {
                statusIndicator.className = 'status-indicator status-connected';
                statusText.textContent = '✅ Connection successful';
                
                this.showNotification(`${this.getProviderDisplayName(effectiveProvider)} connection successful!`, 'success');
                // Invio un evento di apply_settings soft per aggiornare il pallino subito
                try {
                    let tauriApi = null;
                    if (window.__TAURI__ && window.__TAURI__.tauri && window.__TAURI__.tauri.invoke) {
                        tauriApi = window.__TAURI__.tauri;
                    } else {
                        const { invoke } = await import('@tauri-apps/api/core');
                        tauriApi = { invoke };
                    }
                    if (tauriApi && tauriApi.invoke) {
                        await tauriApi.invoke('apply_settings', { config: { ai: testConfig.ai } });
                    }
                } catch (_) {}
            } else {
                throw new Error((testResult && (testResult.error || responseText)) || 'Invalid response from AI');
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
            'lm-studio': 'LM Studio',
            'ollama': 'Ollama',
            'disabled': 'AI Off'
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
