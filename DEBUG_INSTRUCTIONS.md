# Istruzioni per il Debug delle Impostazioni

## Problema
Le impostazioni non si applicano al terminale principale, anche se non ci sono errori in console.

## Test da Eseguire

### 1. Avvia l'Applicazione
```bash
cd /home/simone/TermInA
npm run tauri dev
```

### 2. Apri la Console del Browser
- Premi `F12` per aprire gli strumenti di sviluppo
- Vai alla tab "Console"

### 3. Controlla i Log di Inizializzazione
Dovresti vedere questi messaggi:
```
🔧 Setting up settings listener...
🔧 window.__TAURI__: true
🔧 window.__TAURI__.event: true
🔧 window.__TAURI__.event.listen: true
✅ Tauri event API available, setting up listener
✅ Settings listener setup complete
🧪 Testing applySettings method...
🧪 this.applySettings exists: true
🧪 Testing with dummy config...
🎨 APPLYING SETTINGS - START
✅ APPLYING SETTINGS - COMPLETED SUCCESSFULLY
```

### 4. Test Manuale delle Impostazioni
Nella console del browser, esegui:
```javascript
// Test del metodo applySettings
testSettings()

// Simula un evento di aggiornamento impostazioni
simulateSettingsEvent()
```

### 5. Test del Pannello di Controllo
1. Apri il pannello di controllo (⌘,)
2. Cambia il tema da "Warp Dark" a "Warp Light"
3. Cambia il font da "JetBrains Mono" a "Arial"
4. Cambia la dimensione del font da 14 a 20
5. Clicca "Save"
6. Controlla la console per i messaggi:
   - `Settings applied successfully`
   - `🎯 Settings updated event received:`
   - `🎨 APPLYING SETTINGS - START`

## Cosa Cercare

### ✅ Se Funziona
- I messaggi di debug appaiono nella console
- Il test manuale funziona (`simulateSettingsEvent()`)
- Le impostazioni si applicano visivamente al terminale
- L'evento `settings-updated` viene ricevuto

### ❌ Se Non Funziona
- **API Tauri non disponibile**: `window.__TAURI__.event: false`
- **Metodo applySettings non trovato**: `this.applySettings exists: false`
- **Evento non ricevuto**: Nessun messaggio `🎯 Settings updated event received`
- **Errore nell'applicazione**: Messaggi di errore nella console

## Possibili Problemi

### 1. API Tauri Non Disponibile
Se `window.__TAURI__.event` è `false`, il problema è nella configurazione di Tauri.

### 2. Metodo applySettings Non Trovato
Se `this.applySettings exists: false`, c'è un problema con la definizione del metodo.

### 3. Evento Non Ricevuto
Se l'evento `settings-updated` non viene ricevuto, il problema è nella comunicazione tra pannello e terminale.

### 4. Applicazione Non Funziona
Se l'evento viene ricevuto ma le impostazioni non si applicano, il problema è nel metodo `applySettings`.

## Prossimi Passi

1. **Esegui i test** seguendo le istruzioni sopra
2. **Riporta i risultati** della console
3. **Identifica il punto di fallimento** basandoti sui messaggi di debug
4. **Applica la correzione** appropriata

## Funzioni di Test Disponibili

- `testSettings()` - Testa il metodo applySettings
- `simulateSettingsEvent()` - Simula un aggiornamento delle impostazioni
- `terminal` - Riferimento globale al terminale principale