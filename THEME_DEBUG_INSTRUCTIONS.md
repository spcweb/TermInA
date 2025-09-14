# Istruzioni Debug Temi

## 🚨 Problema
I temi non vengono applicati al terminale principale.

## 🔍 Debug Steps

### 1. Avvia l'Applicazione
```bash
cd /home/simone/TermInA
npm run tauri dev
```

### 2. Apri la Console del Browser
- Premi `F12` per aprire gli strumenti di sviluppo
- Vai alla tab "Console"

### 3. Test Semplice del Tema
Nel terminale, esegui:
```bash
test-simple-theme
```

Questo comando:
- Applica un tema con sfondo rosso brillante
- Mostra i log di debug nella console
- Verifica se il colore è stato applicato

### 4. Controlla i Log nella Console
Dovresti vedere questi messaggi:
```
🧪 Testing simple theme application...
🧪 Test tema semplice - sfondo rosso...
🧪 Applying test theme: {background: "#ff0000", ...}
🎨 APPLYING THEME - START
🎨 Theme received: {background: "#ff0000", ...}
🎨 Terminal container found: <div id="terminal">
🎨 Setting CSS variables...
🎨 Colors: {bgColor: "#ff0000", fgColor: "#ffffff", ...}
🎨 CSS variables set: {--terminal-bg: "#ff0000", ...}
🎨 Applying direct styles to terminal...
🎨 Terminal styles applied: {backgroundColor: "rgb(255, 0, 0)", ...}
🎨 APPLYING THEME - COMPLETED
🧪 Terminal background color: rgb(255, 0, 0)
🧪 Colore sfondo applicato: rgb(255, 0, 0)
✅ Tema applicato correttamente!
```

### 5. Test dalla Console del Browser
```javascript
// Test diretto del tema
testSimpleTheme()

// Test del metodo applySettings
testSettings()

// Simula evento settings-updated
simulateSettingsEvent()
```

## 🎯 Cosa Cercare

### ✅ Se Funziona
- Il terminale diventa rosso
- I log mostrano che il tema è stato applicato
- Il messaggio "✅ Tema applicato correttamente!" appare

### ❌ Se Non Funziona
- **Terminal container not found**: Il container del terminale non esiste
- **CSS variables not set**: Le variabili CSS non vengono impostate
- **Direct styles not applied**: Gli stili diretti non vengono applicati
- **Color mismatch**: Il colore applicato non corrisponde a quello richiesto

## 🔧 Possibili Problemi

### 1. Container Terminale Non Trovato
Se vedi "❌ Terminal container not found!":
- Il problema è nell'inizializzazione del terminale
- Verifica che `this.container` sia impostato correttamente

### 2. CSS Variables Non Impostate
Se le variabili CSS non vengono impostate:
- Il problema è nel metodo `applyTheme`
- Verifica che `document.documentElement` sia disponibile

### 3. Stili Diretti Non Applicati
Se gli stili diretti non vengono applicati:
- Il problema è nell'applicazione degli stili inline
- Verifica che `terminal.style.backgroundColor` funzioni

### 4. Colore Non Corrisponde
Se il colore applicato non corrisponde:
- Il problema è nella conversione dei colori
- Verifica che il formato del colore sia corretto

## 🧪 Test Aggiuntivi

### Test CSS Variables
```javascript
// Verifica le variabili CSS
const root = document.documentElement;
console.log('CSS Variables:', {
    '--terminal-bg': root.style.getPropertyValue('--terminal-bg'),
    '--terminal-fg': root.style.getPropertyValue('--terminal-fg'),
    '--terminal-cursor': root.style.getPropertyValue('--terminal-cursor'),
    '--terminal-accent': root.style.getPropertyValue('--terminal-accent')
});
```

### Test Computed Styles
```javascript
// Verifica gli stili computati
const terminal = document.getElementById('terminal');
if (terminal) {
    const computedStyle = window.getComputedStyle(terminal);
    console.log('Computed Styles:', {
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color
    });
}
```

### Test Direct Styles
```javascript
// Verifica gli stili diretti
const terminal = document.getElementById('terminal');
if (terminal) {
    console.log('Direct Styles:', {
        backgroundColor: terminal.style.backgroundColor,
        color: terminal.style.color
    });
}
```

## 📊 Risultati Attesi

### ✅ Tema Funzionante
- Sfondo rosso visibile
- Testo bianco visibile
- Cursore verde visibile
- Log di debug completi

### ❌ Tema Non Funzionante
- Sfondo rimane invariato
- Nessun cambiamento visibile
- Errori nei log di debug

## 🔄 Ripristino

Per ripristinare il tema predefinito:
```bash
theme-warp-dark
```

O dalla console:
```javascript
terminal.applySettings({
    theme: {
        background: '#1e2124',
        foreground: '#ffffff',
        cursor: '#00d4aa',
        accent: '#00d4aa'
    }
});
```

## 📝 Prossimi Passi

1. **Esegui il test**: `test-simple-theme`
2. **Controlla i log**: Verifica i messaggi nella console
3. **Identifica il problema**: Basandoti sui log di debug
4. **Riporta i risultati**: Condividi i log per l'analisi

## 🎯 Obiettivo

Identificare esattamente dove si blocca l'applicazione dei temi per poter correggere il problema.
