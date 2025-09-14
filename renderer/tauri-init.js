// Tauri API semplificata per TermInA
console.log('=== TAURI SIMPLE API LOADED ===');

// Funzione per aspettare che l'API Tauri sia disponibile
function waitForTauriAPI() {
    return new Promise((resolve) => {
        const checkAPI = () => {
            if (window.__TAURI__ && window.__TAURI__.invoke) {
                console.log('✅ Tauri API is available');
                resolve(window.__TAURI__);
            } else {
                console.log('⏳ Waiting for Tauri API...');
                setTimeout(checkAPI, 100);
            }
        };
        checkAPI();
    });
}

// Espone funzioni globali per l'API Tauri
window.getTauriAPI = async function() {
    if (window.__TAURI__ && window.__TAURI__.invoke) {
        return window.__TAURI__;
    }
    return await waitForTauriAPI();
};

window.isTauriReady = function() {
    return !!(window.__TAURI__ && window.__TAURI__.invoke);
};

// Inizializza l'API Tauri
waitForTauriAPI().then((tauriAPI) => {
    console.log('🚀 Tauri API initialized successfully');
    
    // Test dell'API
    tauriAPI.invoke('get_cwd').then(cwd => {
        console.log('✅ API test successful, CWD:', cwd);
    }).catch(error => {
        console.error('❌ API test failed:', error);
    });
}).catch(error => {
    console.error('❌ Failed to initialize Tauri API:', error);
});

