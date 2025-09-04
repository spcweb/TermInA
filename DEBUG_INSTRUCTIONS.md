# 🔍 Istruzioni per Debug PTY

## 🎯 Problema Identificato
Il PTY riceve il comando ma non produce output. Il buffer è sempre vuoto (`output length: 0`).

## 🧪 Test da Eseguire

### 1. Test Detection PTY
```
test-pty-detection
```
Questo mostrerà se i comandi vengono rilevati come PTY.

### 2. Test API Diretta
```
test-pty-api
```
Questo testerà le API PTY direttamente senza il wrapper.

### 3. Test Comando Reale
```
npm install --dry-run lodash
```
Questo dovrebbe mostrare tutti i log di debug.

## 📊 Log da Cercare

### Console DevTools (F12)

#### 1. Detection
- `SimpleTerminal: shouldUsePTY(npm install --dry-run lodash) = true`

#### 2. Execution
- `SimpleTerminal: Using PTY execution`
- `SimpleTerminal: executeWithPTY called with command: npm install --dry-run lodash`
- `SimpleTerminal: Showing loading indicator for PTY command: npm install --dry-run lodash`
- `SimpleTerminal: PTY mode enabled, isActive: true/false`

#### 3. Session
- `SimpleTerminal: Starting PTY session...` (se non attiva)
- `SimpleTerminal: PTY session started successfully`

#### 4. Command Send
- `SimpleTerminal: Sending command to PTY: npm install --dry-run lodash`
- `PTY sending command: npm install --dry-run lodash`
- `PTY command send result: true/false`
- `SimpleTerminal: PTY sendCommand result: true/false`

#### 5. Data Flow
- `PTY Manager writing to session X: npm install --dry-run lodash\r`
- `PTY Manager received data for session X:`
- `PTY polling got new data:`

## 🚨 Possibili Problemi

### 1. Comando Non Rilevato come PTY
Se vedi `shouldUsePTY = false`, il comando non viene rilevato come PTY.

### 2. Sessione PTY Non Attiva
Se vedi `isActive: false`, la sessione PTY non è attiva.

### 3. Comando Non Inviato
Se non vedi `PTY sending command:`, il comando non viene inviato.

### 4. PTY Non Riceve Dati
Se non vedi `PTY Manager received data:`, il PTY non riceve output dal comando.

## 🔧 Fix Rapidi

### Fix 1: Forza PTY Mode
Se il comando non viene rilevato come PTY, aggiungi manualmente:
```javascript
// In shouldUsePTY, aggiungi:
if (command.includes('npm install')) return true;
```

### Fix 2: Verifica node-pty
Se il PTY non riceve dati, potrebbe essere un problema con node-pty:
```bash
npm rebuild node-pty
```

### Fix 3: Usa Fallback
Se node-pty non funziona, il sistema dovrebbe usare il fallback automaticamente.

## 📝 Prossimo Passo

1. **Esegui i test** in ordine
2. **Copia i log** dalla console DevTools
3. **Identifica dove si blocca** il flusso
4. **Applica il fix** appropriato

## 🎯 Risultato Atteso

Dopo il fix, dovresti vedere:
- ✅ Comando rilevato come PTY
- ✅ Sessione PTY attiva
- ✅ Comando inviato al PTY
- ✅ Output ricevuto dal PTY
- ✅ Output visualizzato nel terminale
