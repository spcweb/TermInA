# Sistema di Loader per WebScraper

Documentazione del sistema di caricamento progressivo per l'integrazione webscraper con l'agente AI.

## Panoramica

Il sistema di loader fornisce feedback visivo all'utente durante le operazioni di ricerca web, mostrando lo stato di avanzamento e il tipo di elaborazione in corso.

## Fasi del Loader

### 1. Fase Iniziale
**Messaggio**: `🤖 Analyzing request...`  
**Durata**: Immediata  
**Descrizione**: L'AI sta analizzando la richiesta per determinare se serve una ricerca web

### 2. Fase di Analisi Avanzata
**Messaggio**: `🤖 Analyzing (may search web)...`  
**Durata**: Dopo 1 secondo  
**Descrizione**: L'AI sta ancora analizzando e potrebbe decidere di cercare online

### 3. Fase di Ricerca Probabile
**Messaggio**: `🌐 Likely searching internet...`  
**Durata**: Dopo 3 secondi  
**Descrizione**: L'AI sta probabilmente cercando informazioni su internet

## Tipi di Risposta e Loader

### Web Enhanced (`web_enhanced`)
Quando l'AI cerca effettivamente su internet:

```
🌐 Looking on internet...          [800ms]
🔍 Searching for: [query]          [600ms]
📊 Integrating results...          [400ms]
[Risultato finale]
```

**Stili CSS**: `.web-search-loading` con animazione di spin

### Local Only (`local_only`)
Quando l'AI usa solo conoscenza locale:

```
🧠 Using local knowledge...        [500ms]
[Risultato finale]
```

**Stili CSS**: `.ai-thinking` con animazione di pulse

### Fallback (`fallback`)
Quando la ricerca web fallisce:

```
🌐 Attempting to look on internet... [1000ms]
⚠️ Web search failed, using local knowledge... [800ms]
[Risultato finale]
```

**Stili CSS**: `.web-search-loading` che diventa warning

## Stili CSS

### Loader Base
```css
.web-search-loading {
  color: var(--accent-blue);
  font-style: italic;
  animation: webSearchPulse 2s ease-in-out infinite;
  position: relative;
  padding-left: 20px;
}
```

### Icona Spinner
```css
.web-search-loading::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  border: 2px solid var(--accent-blue);
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: webSearchSpin 1s linear infinite;
}
```

### Animazioni
```css
@keyframes webSearchPulse {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}

@keyframes webSearchSpin {
  0% { transform: translateY(-50%) rotate(0deg); }
  100% { transform: translateY(-50%) rotate(360deg); }
}
```

## Implementazione Tecnica

### Timeout Progressivi
```javascript
const progressTimeouts = [];

// Dopo 1 secondo
progressTimeouts.push(setTimeout(() => {
    thinkingMessageElement.textContent = '🤖 Analyzing (may search web)...';
}, 1000));

// Dopo 3 secondi
progressTimeouts.push(setTimeout(() => {
    thinkingMessageElement.textContent = '🌐 Likely searching internet...';
    thinkingMessageElement.className = 'web-search-loading';
}, 3000));
```

### Pulizia dei Timeout
```javascript
// Pulizia normale
progressTimeouts.forEach(timeout => clearTimeout(timeout));

// Pulizia in caso di errore
if (typeof progressTimeouts !== 'undefined') {
    progressTimeouts.forEach(timeout => clearTimeout(timeout));
}
```

### Loader Progressivo per Web Enhanced
```javascript
async showWebSearchLoader(loadingElement, searchQuery) {
    const loadingSteps = [
        { text: '🌐 Looking on internet...', duration: 800 },
        { text: `🔍 Searching for: ${searchQuery}`, duration: 600 },
        { text: '📊 Integrating results...', duration: 400 }
    ];
    
    for (const step of loadingSteps) {
        if (loadingElement.parentNode) {
            loadingElement.textContent = step.text;
            loadingElement.className = 'web-search-loading';
            await new Promise(resolve => setTimeout(resolve, step.duration));
        }
    }
}
```

## Esperienza Utente

### Scenario 1: Ricerca Web Riuscita
```
🤖 Analyzing request...
🤖 Analyzing (may search web)...      [dopo 1s]
🌐 Likely searching internet...       [dopo 3s]
🌐 Looking on internet...             [durante web_enhanced]
🔍 Searching for: Bitcoin price       [durante web_enhanced]
📊 Integrating results...             [durante web_enhanced]
🌐 [Risposta finale con info web]
```

### Scenario 2: Solo Conoscenza Locale
```
🤖 Analyzing request...
🤖 Analyzing (may search web)...      [dopo 1s]
🧠 Using local knowledge...           [durante local_only]
🤖 [Risposta finale locale]
```

### Scenario 3: Fallback
```
🤖 Analyzing request...
🌐 Likely searching internet...       [dopo 3s]
🌐 Attempting to look on internet... [durante fallback]
⚠️ Web search failed...              [durante fallback]
🤖 [Risposta finale locale]
```

## Configurazione

### Timing Configurabile
I timing dei loader possono essere configurati modificando i timeout:

```javascript
// Timing attuali
const ANALYZE_TIMEOUT = 1000;      // 1 secondo
const WEB_LIKELY_TIMEOUT = 3000;   // 3 secondi
const WEB_STEP_DURATION = 800;     // 800ms per step
```

### Messaggi Personalizzabili
I messaggi possono essere personalizzati per diverse lingue:

```javascript
const LOADER_MESSAGES = {
  it: {
    analyzing: '🤖 Analyzing request...',
    maySearchWeb: '🤖 Analyzing (may search web)...',
    likelySearching: '🌐 Likely searching internet...',
    lookingOnline: '🌐 Looking on internet...',
    usingLocal: '🧠 Using local knowledge...'
  },
  en: {
    analyzing: '🤖 Analyzing request...',
    maySearchWeb: '🤖 Analyzing (may search web)...',
    likelySearching: '🌐 Likely searching internet...',
    lookingOnline: '🌐 Looking on internet...',
    usingLocal: '🧠 Using local knowledge...'
  }
};
```

## Test e Debug

### Test del Loader
```bash
# Test completo del loader
node test-loader.js

# Test specifico delle animazioni
# (da eseguire nel terminale dell'app)
ai: Qual è il prezzo di Bitcoin?
```

### Debug Timing
```javascript
// Abilita log per debug timing
console.time('AI Request');
const result = await window.electronAPI.aiAgentRequestWithWeb(...);
console.timeEnd('AI Request');
```

### Verifica Animazioni
- **Spinner**: Dovrebbe ruotare continuamente durante la ricerca web
- **Pulse**: Dovrebbe pulsare durante l'analisi
- **Transizioni**: Dovrebbero essere fluide tra i diversi stati

## Problemi Comuni

### Loader Non Visibile
- **Causa**: Timeout troppo brevi per richieste veloci
- **Soluzione**: Aumentare i timeout o ridurre le durate

### Animazioni Bloccate
- **Causa**: CSS non caricato o conflitti di stile
- **Soluzione**: Verificare che gli stili siano caricati correttamente

### Timeout Non Puliti
- **Causa**: Errori durante l'esecuzione
- **Soluzione**: Assicurarsi che tutti i timeout siano puliti nei catch

## Miglioramenti Futuri

### v2.1
- [ ] Loader basato su eventi reali dal webscraper
- [ ] Progress bar per ricerche lunghe
- [ ] Messaggi localizzati dinamicamente
- [ ] Cancellazione manuale delle ricerche

### v2.2
- [ ] Loader personalizzabili per tema
- [ ] Statistiche di performance dei loader
- [ ] Cache dei risultati con indicatori
- [ ] Loader per diversi tipi di ricerca (news, prezzi, etc.)

## Note Tecniche

### Performance
- I timeout sono ottimizzati per non impattare le performance
- Le animazioni CSS sono hardware-accelerated quando possibile
- I messaggi sono aggiornati solo se necessario

### Compatibilità
- Funziona su tutti i browser moderni
- Compatibile con dark/light theme
- Responsive per diverse dimensioni di finestra

### Sicurezza
- Nessun JavaScript inline negli elementi del loader
- Pulizia automatica di tutti i timeout
- Gestione sicura degli elementi DOM

---

**Implementato in**: v2.0.0  
**Ultima modifica**: Dicembre 2024  
**Stato**: Stabile
