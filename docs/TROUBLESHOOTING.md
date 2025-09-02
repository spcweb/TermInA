# 🔧 Troubleshooting Termina

Guida per risolvere i problemi più comuni di Termina.

## 🚨 Problemi Comuni

### 1. Controlli finestra duplicati
**Problema**: Vedo due set di bottoni chiudi/riduci/ingrandisci
**Soluzione**: 
- Verifica che `titleBarStyle` sia impostato su `'hidden'` in main.js
- Assicurati che `frame: true` sia impostato
- Riavvia l'applicazione

### 2. Impossibile scrivere nel terminale
**Problema**: Il terminale non accetta input da tastiera
**Soluzioni**:
- Clicca nell'area del terminale per dare focus
- Verifica che il terminale sia inizializzato correttamente
- Controlla la console per errori JavaScript
- Riavvia l'applicazione

### 3. Bottoni della finestra non funzionano
**Problema**: I controlli chiudi/riduci/ingrandisci non rispondono
**Soluzioni**:
- Verifica che i gestori IPC siano registrati in main.js
- Controlla che preload.js esponga i metodi corretti
- Assicurati che gli event listener siano collegati in renderer.js

### 4. AI non risponde
**Problema**: I comandi `ai:` non funzionano
**Soluzioni**:
- Verifica la configurazione del provider AI nelle impostazioni
- Controlla la connessione internet (per provider cloud)
- Per LM Studio: assicurati che sia in esecuzione su localhost:1234
- Verifica che l'API key sia corretta (per Gemini/OpenAI)

### 5. Errori di configurazione
**Problema**: L'app non salva le impostazioni
**Soluzioni**:
- Controlla i permessi della cartella `~/.termina/`
- Verifica che il file `config.json` sia scrivibile
- Prova a eliminare `~/.termina/config.json` per reset

## 🛠️ Debug

### Aprire DevTools
Premi `F12` o `Cmd+Option+I` per aprire gli strumenti sviluppatore.

### Log del terminale
Controlla la console per messaggi di debug:
```javascript
// Nel renderer, aggiungi:
console.log('Terminal state:', this.terminal);
console.log('Config:', this.config);
```

### Test della configurazione
```bash
# Esegui il test di sistema
node test.js

# Verifica file di config
cat ~/.termina/config.json
```

### Reset completo
```bash
# Elimina la configurazione
rm -rf ~/.termina/

# Riavvia l'app
npm start
```

## 🔍 Debugging Avanzato

### 1. Problemi di dimensionamento terminale
```javascript
// Aggiungi in fitTerminal():
console.log('Container rect:', rect);
console.log('Calculated cols/rows:', cols, rows);
console.log('Character dimensions:', charWidth, charHeight);
```

### 2. Problemi AI
```javascript
// Aggiungi in ai-manager.js:
console.log('AI Request:', prompt);
console.log('AI Response:', response);
console.log('Provider config:', aiConfig);
```

### 3. Problemi IPC
```javascript
// Nel main process:
console.log('IPC handler called:', eventName, args);

// Nel renderer:
console.log('Sending IPC:', method, args);
```

## 📋 Checklist di Verifica

### Prima del avvio:
- [ ] Node.js 16+ installato
- [ ] `npm install` eseguito senza errori
- [ ] File `test.js` passa tutti i controlli

### Dopo l'avvio:
- [ ] Finestra si apre correttamente
- [ ] Un solo set di controlli finestra visibile
- [ ] Terminale accetta input da tastiera
- [ ] Bottoni finestra funzionano
- [ ] Comando `help` mostra l'aiuto
- [ ] Comando `settings` apre le impostazioni

### Test AI:
- [ ] Provider configurato nelle impostazioni
- [ ] Comando `ai: test` produce una risposta
- [ ] Suggerimenti comandi funzionano
- [ ] Esecuzione comandi con conferma

## 🐛 Report Bug

Se il problema persiste:

1. **Raccogli informazioni**:
   - Versione macOS/Linux
   - Versione Node.js (`node --version`)
   - Output di `node test.js`
   - Screenshot del problema

2. **Console log**:
   - Apri DevTools (F12)
   - Copia errori dalla console
   - Includi log del processo main

3. **File configurazione**:
   ```bash
   cat ~/.termina/config.json
   ```

4. **Crea issue**:
   - Descrizione dettagliata
   - Passi per riprodurre
   - Log e screenshot
   - Configurazione sistema

## 🚑 Riparazione Rapida

### Script di reset automatico:
```bash
#!/bin/bash
echo "🔧 Riparazione Termina..."

# Stop processi
pkill -f "electron ."

# Reset configurazione
rm -rf ~/.termina/

# Reinstalla dipendenze
cd /path/to/termina
npm install

# Restart
npm start

echo "✅ Riparazione completata!"
```

## 📞 Supporto

- 🐛 GitHub Issues: [Report un bug](https://github.com/termina/issues)
- 💬 Discord: [Comunità Termina](https://discord.gg/termina)
- 📧 Email: support@termina.app

---

**Suggerimento**: Mantieni sempre un backup della tua configurazione in `~/.termina/config.json`!
