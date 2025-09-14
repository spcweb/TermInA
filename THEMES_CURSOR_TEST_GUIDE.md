# Guida Test Temi e Cursore

## 🎨 Panoramica

Questa guida ti aiuta a testare e verificare che i temi e le impostazioni del cursore funzionino correttamente in TermInA.

## 🚀 Avvio Rapido

### 1. Avvia l'Applicazione
```bash
cd /home/simone/TermInA
npm run tauri dev
```

### 2. Apri la Console del Browser
- Premi `F12` per aprire gli strumenti di sviluppo
- Vai alla tab "Console"

### 3. Carica il Test Script
Copia e incolla il contenuto di `test-themes-cursor.js` nella console, oppure esegui:
```javascript
// Carica il test script
fetch('/test-themes-cursor.js')
  .then(response => response.text())
  .then(script => eval(script));
```

## 🧪 Test Disponibili

### Test Temi
```javascript
testThemes()
```
- Testa tutti i temi predefiniti
- Cambia automaticamente tra: Warp Dark, Warp Light, Terminal Classic, Cyberpunk
- Durata: ~8 secondi

### Test Stili Cursore
```javascript
testCursorStyles()
```
- Testa tutti gli stili del cursore
- Cambia tra: bar, block, underline
- Durata: ~6 secondi

### Test Blink Cursore
```javascript
testCursorBlink()
```
- Testa l'attivazione/disattivazione del blink
- Cursore rosso con blink ON, verde con blink OFF
- Durata: ~6 secondi

### Test Dimensioni Font
```javascript
testFontSizes()
```
- Testa diverse dimensioni del font
- Cambia tra: 12px, 14px, 16px, 18px, 20px, 24px
- Durata: ~9 secondi

### Test Font
```javascript
testFonts()
```
- Testa diversi font
- Cambia tra: JetBrains Mono, Fira Code, Consolas, Monaco, Courier New, Arial
- Durata: ~12 secondi

### Test Completo
```javascript
testAll()
```
- Esegue tutti i test in sequenza
- Durata totale: ~60 secondi

## 🎯 Cosa Verificare

### ✅ Temi
- **Background**: Il colore di sfondo cambia correttamente
- **Foreground**: Il colore del testo cambia correttamente
- **Cursor**: Il colore del cursore cambia correttamente
- **Accent**: I colori di accento (prompt, AI) cambiano correttamente

### ✅ Cursore
- **Stile Bar**: Cursore verticale sottile
- **Stile Block**: Cursore che riempie il carattere
- **Stile Underline**: Cursore che sottolinea il carattere
- **Blink**: Il cursore lampeggia quando abilitato
- **Visibilità**: Il cursore è sempre visibile

### ✅ Font
- **Famiglia**: Il font cambia correttamente
- **Dimensione**: La dimensione del font cambia correttamente
- **Line Height**: L'altezza delle righe si adatta
- **Rendering**: Il testo è leggibile e ben formattato

## 🔧 Test Manuale

### Test Pannello di Controllo
1. Apri impostazioni (`⌘,`)
2. Vai alla sezione "Appearance"
3. Cambia il tema da "Warp Dark" a "Warp Light"
4. Cambia il font da "JetBrains Mono" a "Arial"
5. Cambia la dimensione da 14 a 20
6. Cambia lo stile del cursore da "bar" a "block"
7. Disabilita il blink del cursore
8. Clicca "Save"
9. Verifica che le modifiche si applichino immediatamente

### Test Comandi Console
```javascript
// Test tema specifico
window.terminal.applySettings({
    theme: {
        background: '#ff0000',
        foreground: '#ffffff',
        cursor: '#00ff00',
        accent: '#0000ff'
    }
});

// Test cursore specifico
window.terminal.applySettings({
    terminal: {
        cursor_style: 'block',
        cursor_blink: false
    }
});

// Test font specifico
window.terminal.applySettings({
    terminal: {
        font_family: 'Arial',
        font_size: 20
    }
});
```

## 🐛 Problemi Comuni

### Cursore Non Visibile
- Verifica che `cursor_blink` non sia disabilitato
- Controlla che il colore del cursore sia diverso dal background
- Verifica che lo stile del cursore sia applicato correttamente

### Tema Non Si Applica
- Controlla la console per errori
- Verifica che l'evento `settings-updated` venga ricevuto
- Controlla che le variabili CSS vengano aggiornate

### Font Non Cambia
- Verifica che il font sia installato nel sistema
- Controlla che la dimensione sia valida (numero positivo)
- Verifica che il font family sia una stringa valida

## 📊 Log di Debug

Durante i test, controlla la console per questi messaggi:

```
🎨 APPLYING SETTINGS - START
🎨 Config received: {theme: {...}, terminal: {...}}
🎨 [settings] tema normalizzato: {...}
🎨 [settings] terminal normalizzato: {...}
🖱️ Applicazione stile cursore: bar
✅ APPLYING SETTINGS - COMPLETED SUCCESSFULLY
```

## 🎉 Risultati Attesi

Dopo aver eseguito tutti i test, dovresti vedere:

1. **Temi**: Cambiamenti visibili di colori
2. **Cursore**: Cambiamenti di stile e comportamento
3. **Font**: Cambiamenti di tipo e dimensione
4. **Console**: Messaggi di debug senza errori
5. **Pannello**: Impostazioni che si applicano immediatamente

## 🔄 Ripristino

Per ripristinare le impostazioni predefinite:
```javascript
window.terminal.applySettings({
    theme: {
        background: '#1e2124',
        foreground: '#ffffff',
        cursor: '#00d4aa',
        accent: '#00d4aa'
    },
    terminal: {
        font_family: 'JetBrains Mono',
        font_size: 14,
        cursor_style: 'bar',
        cursor_blink: true
    }
});
```

