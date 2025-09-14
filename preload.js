// Preload script per Tauri v2
// Questo script viene eseguito prima del caricamento del frontend
// e può esporre API sicure al frontend

console.log('[Preload] Tauri preload script loaded');
console.log('[Preload] Available window properties:', Object.keys(window).filter(key => key.toLowerCase().includes('tauri')));

// Espone l'API Tauri al frontend se non è già disponibile
// Normalizza accesso a invoke per evitare codice fragile nel frontend
function buildInvokeWrapper() {
    try {
        const tauri = window.__TAURI__;
        if (tauri?.invoke) return tauri.invoke.bind(tauri);
        if (tauri?.core?.invoke) return tauri.core.invoke.bind(tauri.core);
        if (window.tauri?.invoke) return window.tauri.invoke.bind(window.tauri);
    } catch (e) {
        console.warn('[Preload] Error building invoke wrapper:', e);
    }
    return null;
}

// Esporta un helper stabile
window.getTauriInvoke = () => buildInvokeWrapper();

if (!window.__TAURI__) {
    console.log('[Preload] __TAURI__ not yet available, polling...');
    const waitForTauri = () => {
        if (buildInvokeWrapper()) {
            console.log('[Preload] Tauri invoke ready');
            return;
        }
        setTimeout(waitForTauri, 120);
    };
    waitForTauri();
} else {
    console.log('[Preload] __TAURI__ object present at load');
}
