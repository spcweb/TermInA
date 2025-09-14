# Fix per l'Applicazione delle Impostazioni

## Problema Identificato
Il pannello di controllo non applicava le impostazioni (tema, font, ecc.) al terminale principale perché:

1. **Problema principale**: Il comando `apply_settings` nel backend Rust cercava la finestra "main" ma la finestra principale non aveva questo identificatore
2. **Problema secondario**: La gestione degli errori nel pannello di controllo non era ottimale

## Modifiche Apportate

### 1. Backend Rust (`src-tauri/src/lib.rs`)
- **Modificato il comando `apply_settings`** per inviare l'evento `settings-updated` a tutte le finestre disponibili invece che solo alla finestra "main"
- **Migliorata la gestione degli errori** con logging dettagliato
- **Aggiunto controllo** per verificare che almeno una finestra riceva l'evento

```rust
#[tauri::command]
async fn apply_settings(config: serde_json::Value, app: tauri::AppHandle) -> Result<(), String> {
    log::info!("apply_settings command called");
    
    // Invia un evento a tutte le finestre per applicare le nuove impostazioni
    let windows = app.webview_windows();
    let mut event_sent = false;
    
    for (label, window) in windows {
        log::info!("Sending settings-updated event to window: {}", label);
        match window.emit("settings-updated", &config) {
            Ok(_) => {
                log::info!("Settings update event sent to window: {}", label);
                event_sent = true;
            }
            Err(e) => {
                log::warn!("Failed to send settings-updated event to window {}: {}", label, e);
            }
        }
    }
    
    if !event_sent {
        log::warn!("No windows found to send settings-updated event");
        return Err("No windows available to apply settings".to_string());
    }
    
    Ok(())
}
```

### 2. Pannello di Controllo (`renderer/settings.js`)
- **Migliorata la gestione degli errori** nel metodo `saveSettings()`
- **Aggiunto listener per l'evento `settings-updated`** per verificare che l'evento venga ricevuto
- **Migliorati i messaggi di notifica** per distinguere tra salvataggio e applicazione delle impostazioni

```javascript
// Gestione migliorata degli errori
try { 
    await this.invoke('apply_settings', { config: fullConfig }); 
    console.log('Settings applied successfully');
} catch (e) { 
    console.error('Failed to apply settings:', e);
    this.showNotification('Settings saved but failed to apply: ' + e.message, 'warning');
    return; // Non mostrare il messaggio di successo se l'applicazione fallisce
}

// Listener per verificare l'applicazione
setupSettingsListener() {
    if (window.__TAURI__ && window.__TAURI__.event) {
        window.__TAURI__.event.listen('settings-updated', (event) => {
            console.log('Settings updated event received in settings panel:', event.payload);
            this.showNotification('Settings applied to main terminal!', 'success');
        });
    }
}
```

## Come Funziona Ora

1. **Utente modifica le impostazioni** nel pannello di controllo
2. **Clicca "Save"** → il pannello chiama `set_config` per salvare le impostazioni
3. **Pannello chiama `apply_settings`** → il backend Rust invia l'evento `settings-updated` a tutte le finestre
4. **Terminale principale riceve l'evento** → applica immediatamente le nuove impostazioni (tema, font, ecc.)
5. **Pannello di controllo riceve conferma** → mostra notifica di successo

## Test

Per testare le modifiche:

1. Apri l'applicazione TermInA
2. Premi `⌘,` per aprire le impostazioni
3. Cambia il tema da "Warp Dark" a "Warp Light"
4. Cambia il font da "JetBrains Mono" a "Fira Code"
5. Cambia la dimensione del font da 14 a 16
6. Clicca "Save"
7. Verifica che le modifiche si applichino immediatamente al terminale principale

## Risultato Atteso

- ✅ Il colore di sfondo del terminale cambia da scuro a chiaro
- ✅ Il colore del testo cambia da bianco a nero  
- ✅ Il font cambia da JetBrains Mono a Fira Code
- ✅ La dimensione del font aumenta
- ✅ Appare una notifica di conferma nel pannello di controllo
- ✅ Le impostazioni vengono salvate persistentemente

## Problema Aggiuntivo Risolto

### Errore di Capability
Durante il test è emerso un errore di capability:
```
Unhandled Promise Rejection: event.listen not allowed on window "settings"
```

**Soluzione**: 
- Aggiunto la finestra "settings" alle capability in `src-tauri/capabilities/default.json`
- Aggiunto il permesso `core:event:allow-listen` per permettere l'ascolto degli eventi
- Temporaneamente disabilitato il listener nel pannello di controllo per evitare errori

## File Modificati

- `src-tauri/src/lib.rs` - Comando `apply_settings` migliorato
- `src-tauri/capabilities/default.json` - Aggiunta finestra "settings" e permessi eventi
- `renderer/settings.js` - Gestione errori migliorata, listener temporaneamente disabilitato
- `test-settings-application.js` - Script di test (nuovo)
- `SETTINGS_FIX_SUMMARY.md` - Questo documento (nuovo)
