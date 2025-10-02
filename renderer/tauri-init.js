console.log('=== TAURI SIMPLE API LOADED ===');

const TAURI_POLL_INTERVAL = 100;
const TAURI_MAX_WAIT_MS = 10000;

const adaptTauriApi = (raw) => {
    if (!raw) {
        return null;
    }

    // Tauri v1 already had invoke at the root
    if (typeof raw.invoke === 'function') {
        return raw;
    }

    // Tauri v2 exposes invoke under core
    if (raw.core && typeof raw.core.invoke === 'function') {
        const adapted = {
            ...raw,
            invoke: raw.core.invoke.bind(raw.core),
        };

        if (!adapted.event && raw.event) {
            adapted.event = raw.event;
        }

        return adapted;
    }

    return null;
};

function waitForTauriAPI() {
    const started = Date.now();

    return new Promise((resolve, reject) => {
        const check = () => {
            const raw = window.__TAURI__;
            const adapted = adaptTauriApi(raw);

            if (adapted) {
                if (!raw.invoke) {
                    // Keep invoke available at the root for legacy callers.
                    raw.invoke = adapted.invoke;
                }
                if (!raw.event && adapted.event) {
                    raw.event = adapted.event;
                }

                console.log('✅ Tauri API is available');
                resolve(adapted);
                return;
            }

            if (Date.now() - started > TAURI_MAX_WAIT_MS) {
                reject(new Error('Timed out waiting for Tauri API'));
                return;
            }

            setTimeout(check, TAURI_POLL_INTERVAL);
        };

        check();
    });
}

window.getTauriAPI = async function () {
    const adapted = adaptTauriApi(window.__TAURI__);
    if (adapted) {
        return adapted;
    }
    return waitForTauriAPI();
};

window.isTauriReady = function () {
    return !!adaptTauriApi(window.__TAURI__);
};

waitForTauriAPI()
    .then((tauriAPI) => {
        console.log('🚀 Tauri API initialized successfully');
        return tauriAPI.invoke('get_cwd')
            .then((cwd) => {
                console.log('✅ API test successful, CWD:', cwd);
            })
            .catch((error) => {
                console.error('❌ API test failed:', error);
            });
    })
    .catch((error) => {
        console.error('❌ Failed to initialize Tauri API:', error);
    });

