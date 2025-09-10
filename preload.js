// Preload script per Tauri v2
// Questo script viene eseguito prima del caricamento del frontend
// e può esporre API sicure al frontend

console.log('Tauri preload script loaded');

// Espone l'API Tauri al frontend se non è già disponibile
if (!window.__TAURI__) {
    console.log('Tauri API not available, waiting for it...');
    
    // Aspetta che l'API Tauri sia disponibile
    const waitForTauri = () => {
        if (window.__TAURI__) {
            console.log('Tauri API is now available');
            return;
        }
        setTimeout(waitForTauri, 100);
    };
    
    waitForTauri();
} else {
    console.log('Tauri API already available');
}
