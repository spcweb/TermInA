/**
 * AI Status Manager
 * Gestisce lo stato di connessione dell'AI e aggiorna l'interfaccia utente
 */
class AIStatusManager {
    constructor() {
        this.statusElement = null;
        this.providerNameElement = null;
        this.statusDot = null;
        this.currentConfig = null;
        this.checkInterval = null;
        this.isChecking = false;
        
        // Provider display names
        this.providerNames = {
            'gemini': 'Gemini',
            'openai': 'OpenAI', 
            'lm-studio': 'LM Studio',
            'ollama': 'Ollama',
            'disabled': 'AI Off'
        };
        
        this.init();
    }
    
    /**
     * Inizializza il manager
     */
    init() {
        console.log('🤖 AI Status Manager: Inizializzazione...');
        
        // Trova gli elementi DOM
        this.statusElement = document.getElementById('ai-status');
        this.providerNameElement = document.getElementById('ai-provider-name');
        this.statusDot = document.querySelector('.ai-status-dot');
        
        if (!this.statusElement || !this.providerNameElement || !this.statusDot) {
            console.warn('⚠️ AI Status Manager: Elementi DOM non trovati');
            return;
        }
        
        // Aggiungi event listener per il click
        this.statusElement.addEventListener('click', () => {
            this.handleStatusClick();
        });
        
        // Aggiungi cursore pointer per indicare che è cliccabile
        this.statusElement.style.cursor = 'pointer';
        
        // Aggiungi tooltip
        this.statusElement.title = 'Clicca per verificare la connessione AI';
        
        console.log('✅ AI Status Manager: Inizializzato correttamente');
    }
    
    /**
     * Gestisce il click sullo status AI
     */
    async handleStatusClick() {
        if (this.isChecking) {
            console.log('🔄 AI Status Manager: Test già in corso...');
            return;
        }
        
        console.log('🖱️ AI Status Manager: Click rilevato, avvio verifica...');
        await this.checkAIStatus(true);
    }
    
    /**
     * Verifica lo stato dell'AI
     * @param {boolean} isManual - Se true, è una verifica manuale (click)
     */
    async checkAIStatus(isManual = false) {
        if (this.isChecking) {
            return;
        }
        
        this.isChecking = true;
        
        try {
            console.log(`🔍 AI Status Manager: Verifica ${isManual ? 'manuale' : 'automatica'} dello status AI`);
            
            // Ottieni la configurazione corrente
            const config = await this.getCurrentConfig();
            if (!config || !config.ai) {
                console.warn('⚠️ AI Status Manager: Configurazione AI non trovata');
                this.setStatus('offline', 'Configurazione non trovata');
                return;
            }
            
            this.currentConfig = config.ai;
            
            // Aggiorna il nome del provider
            this.updateProviderName(config.ai.provider);
            
            // Se il provider è disabilitato, imposta offline
            if (config.ai.provider === 'disabled') {
                this.setStatus('offline', 'AI disabilitato');
                return;
            }
            
            // Imposta stato di test
            this.setStatus('testing', 'Verifica connessione...');
            
            // Testa la connessione
            const isConnected = await this.testConnection(config.ai);
            
            if (isConnected) {
                this.setStatus('online', 'Connesso');
                console.log('✅ AI Status Manager: Connessione AI verificata');
            } else {
                this.setStatus('offline', 'Disconnesso');
                console.log('❌ AI Status Manager: Connessione AI fallita');
            }
            
        } catch (error) {
            console.error('❌ AI Status Manager: Errore durante la verifica:', error);
            this.setStatus('offline', 'Errore di connessione');
        } finally {
            this.isChecking = false;
        }
    }
    
    /**
     * Ottiene la configurazione corrente
     */
    async getCurrentConfig() {
        try {
            const inv = await this.getInvoke();
            if (inv) return await inv('get_config');
        } catch (error) {
            console.error('❌ AI Status Manager: Errore nel recupero configurazione:', error);
        }
        return null;
    }
    
    /**
     * Testa la connessione AI
     */
    async testConnection(aiConfig) {
        try {
            const inv = await this.getInvoke();
            if (!inv) {
                console.warn('⚠️ AI Status Manager: API Tauri non disponibile');
                return this.testConnectionFallback(aiConfig);
            }
            
            console.log('🧪 AI Status Manager: Test connessione con backend...');
            const testResult = await inv('test_ai_connection', { provider: aiConfig.provider, ai_config: aiConfig });
            
            // Normalizza la risposta
            let result = testResult;
            if (typeof testResult === 'string') {
                try {
                    result = JSON.parse(testResult);
                } catch {
                    result = { success: false, error: testResult };
                }
            }
            
            const responseText = result?.response ? String(result.response) : '';
            const isSuccess = result?.success === true || 
                            (responseText && !/\b(Error|Errore|Failed|Fallito)\b/i.test(responseText));
            
            console.log('📊 AI Status Manager: Risultato test:', { 
                success: isSuccess, 
                response: responseText,
                error: result?.error 
            });
            
            return isSuccess;
            
        } catch (error) {
            console.error('❌ AI Status Manager: Errore nel test backend:', error);
            return this.testConnectionFallback(aiConfig);
        }
    }
    
    /**
     * Test di fallback basato sulla configurazione
     */
    testConnectionFallback(aiConfig) {
        console.log('🔄 AI Status Manager: Test di fallback...');
        
        switch (aiConfig.provider) {
            case 'gemini':
                return !!(aiConfig.gemini?.api_key?.trim());
            case 'openai':
                return !!(aiConfig.openai?.api_key?.trim());
            case 'ollama':
                return !!(aiConfig.ollama?.base_url?.trim());
            case 'lm-studio':
                return !!(aiConfig.lmStudio?.endpoint?.trim());
            default:
                return false;
        }
    }
    
    /**
     * Imposta lo stato dell'AI
     */
    setStatus(status, message = '') {
        if (!this.statusElement) return;
        
        // Rimuovi tutte le classi di stato
        this.statusElement.classList.remove('online', 'offline', 'testing');
        
        // Aggiungi la classe appropriata
        this.statusElement.classList.add(status);
        
        // Aggiorna il tooltip
        const statusMessages = {
            'online': 'AI connesso e funzionante',
            'offline': 'AI disconnesso o non disponibile',
            'testing': 'Verifica connessione in corso...'
        };
        
        this.statusElement.title = statusMessages[status] || message;
        
        console.log(`🎯 AI Status Manager: Stato impostato a "${status}" - ${message}`);
    }
    
    /**
     * Aggiorna il nome del provider
     */
    updateProviderName(provider) {
        if (!this.providerNameElement) return;
        
        const displayName = this.providerNames[provider] || provider;
        this.providerNameElement.textContent = displayName;
        
        console.log(`🏷️ AI Status Manager: Provider aggiornato a "${displayName}"`);
    }
    
    /**
     * Avvia il controllo periodico
     */
    startPeriodicCheck(intervalMs = 30000) {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        console.log(`⏰ AI Status Manager: Avvio controllo periodico ogni ${intervalMs}ms`);
        
        this.checkInterval = setInterval(() => {
            this.checkAIStatus(false);
        }, intervalMs);
    }
    
    /**
     * Ferma il controllo periodico
     */
    stopPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('⏹️ AI Status Manager: Controllo periodico fermato');
        }
    }
    
    /**
     * Gestisce l'aggiornamento delle impostazioni
     */
    async handleSettingsUpdate(newConfig) {
        console.log('⚙️ AI Status Manager: Aggiornamento impostazioni ricevuto');
        
        if (newConfig && newConfig.ai) {
            this.currentConfig = newConfig.ai;
            await this.checkAIStatus(false);
        }
    }
    
    /**
     * Ottiene l'API Tauri
     */
    async getInvoke() {
        try {
            if (window.__TAURI__?.invoke) return window.__TAURI__.invoke.bind(window.__TAURI__);
            if (window.__TAURI__?.core?.invoke) return window.__TAURI__.core.invoke.bind(window.__TAURI__.core);
            if (typeof window.getTauriInvoke === 'function') {
                const h = window.getTauriInvoke();
                if (h) return h;
            }
            if (window.tauri?.invoke) return window.tauri.invoke.bind(window.tauri);
            // dynamic import fallback
            try {
                const core = await import('@tauri-apps/api/core');
                if (core?.invoke) return core.invoke;
            } catch (_) {}
        } catch (e) {
            console.warn('AI Status Manager invoke detection error:', e);
        }
        return null;
    }
    
    /**
     * Distrugge il manager
     */
    destroy() {
        this.stopPeriodicCheck();
        this.statusElement = null;
        this.providerNameElement = null;
        this.statusDot = null;
        this.currentConfig = null;
        console.log('🗑️ AI Status Manager: Distrutto');
    }
}

// Esporta la classe per uso globale
window.AIStatusManager = AIStatusManager;
