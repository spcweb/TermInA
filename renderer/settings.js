// Settings Manager semplificato per TermInA
class SettingsManager {
    constructor() {
        this.config = null;
    this.invoke = null;
    this.invokeTries = 0;
    this.maxInvokeTries = 6; // ~ (100+200+400+800+1600+3200)ms = ~6s
        this.init();
    }

    async init() {
        console.log('Settings Manager initialized');
        await this.loadConfig();
        this.setupEventListeners();
        this.setupSettingsListener();
        this.populateForm();
    }

    async loadConfig() {
        console.log('Loading config...');
        try {
            if (!this.invoke) this.invoke = await this.getInvoke();
            if (this.invoke) {
                this.config = await this.invoke('get_config');
                console.log('Config loaded:', this.config);
            } else {
                if (this.invokeTries < this.maxInvokeTries) {
                    const delay = 100 * Math.pow(2, this.invokeTries); // backoff
                    this.invokeTries++;
                    setTimeout(() => this.loadConfig(), delay);
                    return;
                }
                console.warn('Tauri API not available, using default config dopo retry');
                this.config = this.getDefaultConfig();
            }
        } catch (error) {
            console.error('Error loading config:', error);
            this.config = this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            theme: {
                name: 'dark',
                background: '#1e1e1e',
                foreground: '#ffffff'
            },
            ai: {
                provider: 'ollama',
                model: 'llama3.2',
                enabled: true
            }
        };
    }

    setupEventListeners() {
        // Save button (HTML usa id="save-btn")
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
            console.log('[settings] save button listener attached');
        } else {
            console.warn('[settings] save button not found');
        }

        // Reset button (HTML usa id="reset-btn")
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
            console.log('[settings] reset button listener attached');
        } else {
            console.warn('[settings] reset button not found');
        }

        // Close button (HTML usa id="close-btn")
        const closeBtn = document.getElementById('close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSettings());
            console.log('[settings] close button listener attached');
        } else {
            console.warn('[settings] close button not found');
        }

        // Navigazione tab
        const navLinks = document.querySelectorAll('.nav-link');
        if (navLinks.length) {
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = link.getAttribute('data-section');
                    if (!section) return;
                    this.activateSection(section, link);
                });
            });
            console.log('[settings] navigation listeners attached');
        } else {
            console.warn('[settings] no nav links found');
        }

        // Theme preview functionality
        this.setupThemePreview();
        this.setupThemePresets();
    }

    activateSection(sectionId, linkEl) {
        const sections = document.querySelectorAll('.settings-section');
        sections.forEach(s => s.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');

        const links = document.querySelectorAll('.nav-link');
        links.forEach(l => l.classList.remove('active'));
        if (linkEl) linkEl.classList.add('active');

        // Aggiorna hash URL (non ricarica)
        if (history.replaceState) {
            history.replaceState(null, '', '#' + sectionId);
        }
    }
    populateForm() {
        if (!this.config) return;
        const cfg = this.config;
        // Theme
        if (cfg.theme) {
            this.setValueSafely('theme-name', cfg.theme.name);
            this.setValueSafely('color-background', cfg.theme.background);
            this.setValueSafely('color-foreground', cfg.theme.foreground);
            this.setValueSafely('color-cursor', cfg.theme.cursor);
            this.setValueSafely('color-accent', cfg.theme.accent);
            this.setValueSafely('background-blur', cfg.theme.background_blur);
        }
        // Terminal
        if (cfg.terminal) {
            this.setValueSafely('font-family', cfg.terminal.font_family);
            this.setValueSafely('font-size', cfg.terminal.font_size);
            this.setValueSafely('line-height', cfg.terminal.line_height);
            this.setValueSafely('cursor-style', cfg.terminal.cursor_style);
            this.setValueSafely('cursor-blink', cfg.terminal.cursor_blink);
            this.setValueSafely('scrollback', cfg.terminal.scrollback);
            this.setValueSafely('bell-sound', cfg.terminal.bell_sound);
            this.setValueSafely('auto-scroll', cfg.terminal.auto_scroll);
            this.setValueSafely('smooth-scroll', cfg.terminal.smooth_scroll);
        }
        // AI
        if (cfg.ai) {
            this.setValueSafely('ai-provider', cfg.ai.provider);
            this.setValueSafely('ai-auto-execute', cfg.ai.auto_execute);
            this.setValueSafely('ai-context-lines', cfg.ai.context_lines);
            // Gemini
            if (cfg.ai.gemini) {
                this.setValueSafely('gemini-api-key', cfg.ai.gemini.api_key);
                this.setValueSafely('gemini-model', cfg.ai.gemini.model);
                this.setValueSafely('gemini-temperature', cfg.ai.gemini.temperature);
                this.setValueSafely('gemini-max-output', cfg.ai.gemini.max_output_tokens);
            }
            // OpenAI
            if (cfg.ai.openai) {
                this.setValueSafely('openai-api-key', cfg.ai.openai.api_key);
                this.setValueSafely('openai-model', cfg.ai.openai.model);
            }
            // Ollama
            if (cfg.ai.ollama) {
                this.setValueSafely('ollama-endpoint', cfg.ai.ollama.base_url);
                this.setValueSafely('ollama-model', cfg.ai.ollama.model);
            }
        }
    }

    setValueSafely(id, value) {
        const element = document.getElementById(id);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = Boolean(value);
            } else {
                element.value = String(value || '');
            }
        }
    }

    async saveSettings() {
        if (this._saving) {
            console.log('[settings] save ignored (already in progress)');
            return;
        }
        this._saving = true;
        console.log('Saving settings...');
        const saveBtn = document.getElementById('save-btn');
        const originalLabel = saveBtn ? saveBtn.innerHTML : null;
        if (saveBtn) {
            saveBtn.innerHTML = '💾 Saving...';
            saveBtn.disabled = true;
        }

        try {
            const fullConfig = this.gatherFormData();
            if (!this.invoke) this.invoke = await this.getInvoke();
            if (this.invoke) {
                await this.invoke('set_config', { key: 'full_config', value: fullConfig });
                try { 
                    await this.invoke('apply_settings', { config: fullConfig }); 
                    console.log('Settings applied successfully');
                } catch (e) { 
                    console.error('Failed to apply settings:', e);
                    this.showNotification('Settings saved but failed to apply: ' + e.message, 'warning');
                    return; // Non mostrare il messaggio di successo se l'applicazione fallisce
                }
                console.log('Settings saved successfully');
                this.showNotification('Settings saved and applied successfully!', 'success');
            } else {
                console.warn('Tauri API not available, settings not saved');
                this.showNotification('Settings not saved - API not available', 'warning');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Error saving settings: ' + error.message, 'error');
        } finally {
            if (saveBtn) {
                saveBtn.innerHTML = originalLabel || '💾 Save';
                setTimeout(() => { saveBtn.disabled = false; }, 150); // piccolo debounce
            }
            this._saving = false;
        }
    }

    gatherFormData() {
        const base = this.config || this.getDefaultConfig();
        const get = id => document.getElementById(id);
        const val = id => get(id)?.value;
        const checked = id => !!get(id)?.checked;
        const num = id => { const v = val(id); return v !== undefined ? Number(v) : undefined; };
        const float = id => { const v = val(id); return v !== undefined ? parseFloat(v) : undefined; };

        const theme = { ...base.theme };
        theme.name = val('theme-name') || theme.name;
        theme.background = val('color-background') || theme.background;
        theme.foreground = val('color-foreground') || theme.foreground;
        theme.cursor = val('color-cursor') || theme.cursor;
        theme.accent = val('color-accent') || theme.accent;
        theme.background_blur = checked('background-blur');

        const terminal = { ...base.terminal };
        terminal.font_family = val('font-family') || terminal.font_family;
        terminal.font_size = num('font-size') || terminal.font_size;
        terminal.line_height = parseFloat(val('line-height') || terminal.line_height);
        terminal.cursor_style = val('cursor-style') || terminal.cursor_style;
        terminal.cursor_blink = checked('cursor-blink');
        terminal.scrollback = num('scrollback') || terminal.scrollback;
        terminal.bell_sound = checked('bell-sound');
        terminal.auto_scroll = checked('auto-scroll');
        terminal.smooth_scroll = checked('smooth-scroll');

        const ai = { ...base.ai };
        ai.provider = val('ai-provider') || ai.provider;
        ai.auto_execute = checked('ai-auto-execute');
        ai.context_lines = num('ai-context-lines') || ai.context_lines;
        // Gemini
        if (ai.gemini) {
            ai.gemini.api_key = val('gemini-api-key') || ai.gemini.api_key;
            ai.gemini.model = val('gemini-model') || ai.gemini.model;
            const t = float('gemini-temperature'); if (!isNaN(t)) ai.gemini.temperature = t;
            const mo = num('gemini-max-output'); if (mo) ai.gemini.max_output_tokens = mo;
        }
        // OpenAI
        if (ai.openai) {
            ai.openai.api_key = val('openai-api-key') || ai.openai.api_key;
            ai.openai.model = val('openai-model') || ai.openai.model;
        }
        // Ollama
        if (ai.ollama) {
            ai.ollama.base_url = val('ollama-endpoint') || ai.ollama.base_url;
            ai.ollama.model = val('ollama-model') || ai.ollama.model;
        }

        return {
            auto_save: base.auto_save,
            show_welcome: base.show_welcome,
            theme,
            terminal,
            ai,
        };
    }

    async resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default values?')) {
            try {
                if (!this.invoke) this.invoke = await this.getInvoke();
                if (this.invoke) {
                    await this.invoke('set_config', { key: 'reset', value: 'default' });
                    await this.loadConfig();
                    this.populateForm();
                    this.showNotification('Settings reset to default values', 'success');
                } else {
                    this.config = this.getDefaultConfig();
                    this.populateForm();
                    this.showNotification('Settings reset to default values (local only)', 'success');
                }
            } catch (error) {
                console.error('Error resetting settings:', error);
                this.showNotification('Error resetting settings: ' + error.message, 'error');
            }
        }
    }

    async closeSettings() {
        console.log('Closing settings...');
        try {
            // Prova via comando custom se disponibile
            if (!this.invoke) this.invoke = await this.getInvoke();
            if (this.invoke) {
                try {
                    await this.invoke('close_current_window');
                    return;
                } catch (e) {
                    console.warn('close_current_window invoke fallito, provo API window diretta:', e);
                }
            }
            // Fallback: API modulo @tauri-apps/api/window (v2)
            if (window.__TAURI__?.window?.getCurrent) {
                await window.__TAURI__.window.getCurrent().close();
                return;
            }
            try {
                const winMod = await import('@tauri-apps/api/window');
                if (winMod?.getCurrent) {
                    await winMod.getCurrent().close();
                    return;
                }
            } catch (e) { console.warn('Dynamic import window module failed:', e); }
            window.close();
        } catch (error) {
            console.error('Error closing settings:', error);
            window.close();
        }
    }

    async getInvoke() {
        try {
            if (window.__TAURI__?.invoke) return window.__TAURI__.invoke.bind(window.__TAURI__);
            if (window.__TAURI__?.core?.invoke) return window.__TAURI__.core.invoke.bind(window.__TAURI__.core);
            if (typeof window.getTauriInvoke === 'function') {
                const h = window.getTauriInvoke();
                if (h) return h;
            }
            if (window.tauri?.invoke) return window.tauri.invoke.bind(window.tauri);
            try {
                const core = await import('@tauri-apps/api/core');
                if (core?.invoke) return core.invoke;
            } catch (_) {}
        } catch (e) {
            console.warn('Settings invoke detection error:', e);
        }
        return null;
    }
    showBackendBanner(available, msg) {
        // Backend banner removed as requested
        // This method is kept for compatibility but does nothing
        return;
    }

    setupSettingsListener() {
        // Listener per verificare che l'evento settings-updated venga ricevuto
        // Temporaneamente disabilitato a causa di problemi di capability
        console.log('Settings listener setup skipped due to capability restrictions');
        /*
        if (window.__TAURI__ && window.__TAURI__.event) {
            window.__TAURI__.event.listen('settings-updated', (event) => {
                console.log('Settings updated event received in settings panel:', event.payload);
                // Mostra una notifica di conferma
                this.showNotification('Settings applied to main terminal!', 'success');
            });
        }
        */
    }

    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Qui potresti aggiungere una notifica visiva se necessario
    }

    setupThemePreview() {
        // Theme preview functionality
        const themeSelect = document.getElementById('theme-name');
        const colorInputs = ['color-background', 'color-foreground', 'color-cursor', 'color-accent'];
        
        if (themeSelect) {
            themeSelect.addEventListener('change', () => this.updateThemePreview());
        }
        
        colorInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.updateThemePreview());
            }
        });
    }

    updateThemePreview() {
        const preview = document.getElementById('theme-preview');
        if (!preview) return;

        const bgColor = document.getElementById('color-background')?.value || '#1e2124';
        const fgColor = document.getElementById('color-foreground')?.value || '#ffffff';
        const cursorColor = document.getElementById('color-cursor')?.value || '#00d4aa';
        const accentColor = document.getElementById('color-accent')?.value || '#00d4aa';

        preview.style.backgroundColor = bgColor;
        preview.style.color = fgColor;
        
        const prompt = preview.querySelector('.preview-prompt');
        const cursor = preview.querySelector('.preview-cursor');
        if (prompt) prompt.style.color = accentColor;
        if (cursor) cursor.style.color = cursorColor;
    }

    setupThemePresets() {
        const themeSelect = document.getElementById('theme-name');
        if (!themeSelect) return;

        themeSelect.addEventListener('change', (e) => {
            const themeName = e.target.value;
            this.applyThemePreset(themeName);
        });
    }

    applyThemePreset(themeName) {
        const presets = {
            'warp-dark': {
                background: '#1e2124',
                foreground: '#ffffff',
                cursor: '#00d4aa',
                accent: '#00d4aa'
            },
            'warp-light': {
                background: '#ffffff',
                foreground: '#1e2124',
                cursor: '#007acc',
                accent: '#007acc'
            },
            'terminal-classic': {
                background: '#000000',
                foreground: '#00ff00',
                cursor: '#00ff00',
                accent: '#00ff00'
            },
            'cyberpunk': {
                background: '#0d1117',
                foreground: '#ff0080',
                cursor: '#00ffff',
                accent: '#ff0080'
            }
        };

        const preset = presets[themeName];
        if (preset) {
            document.getElementById('color-background').value = preset.background;
            document.getElementById('color-foreground').value = preset.foreground;
            document.getElementById('color-cursor').value = preset.cursor;
            document.getElementById('color-accent').value = preset.accent;
            this.updateThemePreview();
        }
    }
}

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});
