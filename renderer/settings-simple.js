// Settings Manager semplificato per TermInA
class SettingsManager {
    constructor() {
        this.config = null;
    this.invoke = null;
    this.invokeTries = 0;
    this.maxInvokeTries = 6;
        this.init();
    }

    async init() {
        console.log('Settings Manager initialized');
        await this.loadConfig();
        this.setupEventListeners();
        this.populateForm();
    }

    async loadConfig() {
        console.log('Loading config...');
        try {
            if (!this.invoke) this.invoke = await this.getInvoke();
            if (this.invoke) {
                this.config = await this.invoke('get_config');
                this.showBackendBanner(true, 'Backend attivo');
                console.log('Config loaded:', this.config);
            } else {
                if (this.invokeTries < this.maxInvokeTries) {
                    const delay = 100 * Math.pow(2, this.invokeTries);
                    this.showBackendBanner(null, `Attendo backend... tentativo ${this.invokeTries+1}`);
                    this.invokeTries++;
                    setTimeout(() => this.loadConfig(), delay);
                    return;
                }
                this.showBackendBanner(false, 'Backend non disponibile');
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
    // Save button (HTML principale usa save-btn, se questa versione è caricata altrove fallback)
    const saveBtn = document.getElementById('save-btn') || document.getElementById('save-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }

    // Reset button
    const resetBtn = document.getElementById('reset-btn') || document.getElementById('reset-settings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }

    // Close button
    const closeBtn = document.getElementById('close-btn') || document.getElementById('close-settings');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSettings());
        }

        // Navigazione tab
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                if (!section) return;
                this.activateSection(section, link);
            });
        });
    }

    activateSection(sectionId, linkEl) {
        const sections = document.querySelectorAll('.settings-section');
        sections.forEach(s => s.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');
        const links = document.querySelectorAll('.nav-link');
        links.forEach(l => l.classList.remove('active'));
        if (linkEl) linkEl.classList.add('active');
        if (history.replaceState) history.replaceState(null, '', '#' + sectionId);
    }

    populateForm() {
        if (!this.config) return;

        // Theme settings
        if (this.config.theme) {
            this.setValueSafely('theme-name', this.config.theme.name);
            this.setValueSafely('color-background', this.config.theme.background);
            this.setValueSafely('color-foreground', this.config.theme.foreground);
        }

        // AI settings
        if (this.config.ai) {
            this.setValueSafely('ai-provider', this.config.ai.provider);
            this.setValueSafely('ai-model', this.config.ai.model);
            this.setValueSafely('ai-enabled', this.config.ai.enabled);
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
        console.log('Saving settings...');
        const saveBtn = document.getElementById('save-btn') || document.getElementById('save-settings');
        if (saveBtn) {
            saveBtn.innerHTML = '💾 Saving...';
            saveBtn.disabled = true;
        }

        try {
            const formData = this.gatherFormData();
            
            if (!this.invoke) this.invoke = await this.getInvoke();
            if (this.invoke) {
                await this.invoke('set_config', {
                    payload: {
                        key: 'full_config',
                        value: formData,
                    },
                });
                console.log('Settings saved successfully');
                this.showNotification('Settings saved successfully!', 'success');
            } else {
                console.warn('Tauri API not available, settings not saved');
                this.showNotification('Settings not saved - API not available', 'warning');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Error saving settings: ' + error.message, 'error');
        } finally {
            if (saveBtn) {
                saveBtn.innerHTML = '💾 Save Settings';
                saveBtn.disabled = false;
            }
        }
    }

    gatherFormData() {
        return {
            theme: {
                name: document.getElementById('theme-name')?.value || 'dark',
                background: document.getElementById('color-background')?.value || '#1e1e1e',
                foreground: document.getElementById('color-foreground')?.value || '#ffffff'
            },
            ai: {
                provider: document.getElementById('ai-provider')?.value || 'ollama',
                model: document.getElementById('ai-model')?.value || 'llama3.2',
                enabled: document.getElementById('ai-enabled')?.checked || false
            }
        };
    }

    async resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default values?')) {
            try {
                if (!this.invoke) this.invoke = await this.getInvoke();
                if (this.invoke) {
                    await this.invoke('set_config', {
                        payload: {
                            key: 'reset',
                            value: 'default',
                        },
                    });
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
            if (window.__TAURI__?.window?.getCurrent) {
                await window.__TAURI__.window.getCurrent().close();
            } else {
                window.close();
            }
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
            try { const core = await import('@tauri-apps/api/core'); if (core?.invoke) return core.invoke; } catch(_) {}
        } catch (e) { console.warn('settings-simple invoke detection error:', e); }
        return null;
    }

    showBackendBanner(available, msg) {
        let banner = document.getElementById('backend-status-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'backend-status-banner';
            banner.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:6px 10px;font:12px monospace;z-index:9999;text-align:center;display:flex;gap:12px;justify-content:center;align-items:center;pointer-events:none;opacity:0.9;backdrop-filter:blur(4px)';
            const reconnectBtn = document.createElement('button');
            reconnectBtn.id = 'reconnect-backend';
            reconnectBtn.textContent = 'Reconnect';
            reconnectBtn.style.cssText = 'padding:3px 8px;font-size:11px;cursor:pointer;border:1px solid #ccc;border-radius:4px;background:#222;color:#eee;pointer-events:auto';
            reconnectBtn.addEventListener('click', async () => {
                reconnectBtn.disabled = true;
                reconnectBtn.textContent = '...';
                this.invokeTries = 0;
                this.invoke = null;
                await this.loadConfig();
                reconnectBtn.disabled = false;
                reconnectBtn.textContent = 'Reconnect';
            });
            banner.appendChild(document.createElement('span'));
            banner.appendChild(reconnectBtn);
            document.body.appendChild(banner);
            document.body.style.paddingTop = '32px';
        }
        const textSpan = banner.querySelector('span');
        if (available === true) {
            banner.style.background = '#093';
            banner.style.color = '#fff';
            textSpan.textContent = msg || '✅ Backend Tauri attivo';
            banner.querySelector('#reconnect-backend').style.display = 'none';
        } else if (available === false) {
            banner.style.background = '#632';
            banner.style.color = '#fff';
            textSpan.textContent = msg || '⚠️ Backend non disponibile – modifiche non salvate';
            banner.querySelector('#reconnect-backend').style.display = 'inline-block';
        } else {
            banner.style.background = '#444';
            banner.style.color = '#fff';
            textSpan.textContent = msg || '⏳ In attesa backend...';
            banner.querySelector('#reconnect-backend').style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Qui potresti aggiungere una notifica visiva se necessario
    }
}

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});

