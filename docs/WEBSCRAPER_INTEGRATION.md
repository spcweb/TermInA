# Integrazione WebScraper con Agente AI

Questo documento descrive l'integrazione del webscraper con l'agente AI di Termina, permettendo all'agente di cercare informazioni su internet quando necessario.

## Panoramica

Il sistema di integrazione web permette all'agente AI di:
- Determinare automaticamente quando una richiesta richiede informazioni aggiornate da internet
- Eseguire ricerche web su diversi motori di ricerca
- Integrare le informazioni trovate con le risposte AI esistenti
- Fornire risposte più complete e aggiornate

## Componenti Principali

### 1. WebScraper (`src/webscraper.js`)
Modulo base per l'estrazione di contenuti web e la ricerca su motori di ricerca.

**Funzionalità:**
- Ricerca su Google, Bing, DuckDuckGo
- Estrazione e pulizia di contenuti HTML
- Gestione di redirect e timeout
- User-Agent rotazione per evitare blocchi

### 2. WebAI Integration (`src/web-ai-integration.js`)
Modulo che integra il webscraper con l'agente AI.

**Funzionalità:**
- Analisi intelligente delle richieste per determinare se serve una ricerca web
- Integrazione dei risultati web con le risposte AI
- Gestione della cronologia delle ricerche
- Configurazione della soglia di confidenza

### 3. AI Agent Enhanced (`src/ai-agent.js`)
Estensione dell'agente AI esistente con capacità web.

**Nuovi metodi:**
- `processRequestWithWeb()` - Processa richieste con integrazione web
- `isWebServiceAvailable()` - Verifica disponibilità del servizio
- `getWebSearchStats()` - Ottiene statistiche delle ricerche

## Configurazione

### File di Configurazione
Le impostazioni del webscraper sono configurate in `~/.termina/config.json`:

```json
{
  "webscraper": {
    "enabled": true,
    "defaultSearchEngine": "google",
    "maxResults": 5,
    "confidenceThreshold": 0.7,
    "timeout": 10000,
    "maxRedirects": 3,
    "searchEngines": {
      "google": {
        "enabled": true,
        "baseUrl": "https://www.google.com/search"
      },
      "bing": {
        "enabled": true,
        "baseUrl": "https://www.bing.com/search"
      },
      "duckduckgo": {
        "enabled": true,
        "baseUrl": "https://duckduckgo.com/html/"
      }
    }
  }
}
```

### Parametri di Configurazione

| Parametro | Descrizione | Default |
|-----------|-------------|---------|
| `enabled` | Abilita/disabilita il webscraper | `true` |
| `defaultSearchEngine` | Motore di ricerca predefinito | `"google"` |
| `maxResults` | Numero massimo di risultati per ricerca | `5` |
| `confidenceThreshold` | Soglia per decidere se cercare online (0.0-1.0) | `0.7` |
| `timeout` | Timeout per le richieste HTTP (ms) | `10000` |
| `maxRedirects` | Numero massimo di redirect | `3` |

## Utilizzo

### Metodo Base
```javascript
const aiAgent = require('./src/ai-agent');

// Processa una richiesta con integrazione web
const result = await aiAgent.processRequestWithWeb(
  'Qual è il prezzo attuale di Bitcoin?',
  [], // contesto del terminale
  false // autoExecute
);

if (result.type === 'web_enhanced') {
  console.log('Risposta arricchita:', result.enhancedResponse);
  console.log('Query di ricerca:', result.searchQuery);
} else {
  console.log('Risposta locale:', result.response);
}
```

### Metodo Avanzato
```javascript
const webAIIntegration = require('./src/web-ai-integration');

// Analizza se serve una ricerca web
const analysis = await webAIIntegration.shouldSearchOnline(
  'Qual è la versione più recente di Node.js?',
  'La versione più recente di Node.js è la 20.x',
  []
);

if (analysis.shouldSearch) {
  // Esegui ricerca e integra risultati
  const enhanced = await webAIIntegration.enhanceResponseWithWebSearch(
    'Qual è la versione più recente di Node.js?',
    'La versione più recente di Node.js è la 20.x',
    analysis
  );
  
  console.log('Risposta integrata:', enhanced.enhancedResponse);
}
```

## Gestione delle Ricerche

### Cronologia
```javascript
// Ottieni cronologia ricerche
const history = aiAgent.getWebSearchHistory();

// Pulisci cronologia
aiAgent.clearWebSearchHistory();
```

### Statistiche
```javascript
// Ottieni statistiche
const stats = aiAgent.getWebSearchStats();
console.log('Ricerche totali:', stats.totalSearches);
console.log('Ricerche eseguite:', stats.searchesPerformed);
console.log('Confidenza media:', stats.averageConfidence);
```

### Configurazione Dinamica
```javascript
// Imposta soglia di confidenza
aiAgent.setWebSearchConfidenceThreshold(0.8);

// Ottieni soglia attuale
const threshold = aiAgent.getWebSearchConfidenceThreshold();
```

## Tipi di Risposta

### 1. `web_enhanced`
Risposta arricchita con informazioni trovate su internet:
```javascript
{
  type: 'web_enhanced',
  response: 'Risposta integrata con informazioni web',
  originalResponse: 'Risposta AI originale',
  searchQuery: 'query di ricerca eseguita',
  searchResults: { /* risultati della ricerca */ },
  confidence: 0.85,
  reason: 'Informazioni richieste potrebbero essere obsolete'
}
```

### 2. `local_only`
Risposta basata solo sulla conoscenza locale dell'AI:
```javascript
{
  type: 'local_only',
  response: 'Risposta AI locale',
  confidence: 0.3,
  reason: 'Informazioni sufficienti nella conoscenza locale'
}
```

### 3. `fallback`
Fallback alla modalità normale se la ricerca web fallisce:
```javascript
{
  type: 'fallback',
  response: 'Risposta AI originale',
  searchError: 'Errore durante la ricerca web',
  reason: 'Fallback per errore di ricerca'
}
```

## Gestione degli Errori

### Errori Comuni
- **Timeout**: Richieste HTTP che superano il limite di tempo
- **Redirect eccessivi**: Troppi redirect HTTP
- **Parsing fallito**: Impossibilità di estrarre contenuto dalle pagine
- **Connettività**: Problemi di rete o firewall

### Strategie di Fallback
1. Se la ricerca web fallisce, l'agente AI usa la modalità normale
2. Se l'integrazione fallisce, viene restituita la risposta AI originale
3. Log dettagliati per il debugging

## Sicurezza e Privacy

### Considerazioni
- **Rate Limiting**: Pause tra le richieste per essere rispettosi
- **User-Agent Rotation**: Rotazione degli User-Agent per evitare blocchi
- **Timeout**: Limitazione del tempo di attesa per le richieste
- **Validazione URL**: Verifica della validità degli URL prima dell'accesso

### Best Practices
- Non eseguire troppe richieste in rapida successione
- Rispettare i robots.txt dei siti web
- Utilizzare User-Agent appropriati
- Implementare retry con backoff esponenziale

## Test e Debug

### Esecuzione Test
```bash
# Esegui tutti i test
node test-webscraper.js

# Test specifici
const { testWebScraper } = require('./test-webscraper');
await testWebScraper();
```

### Log e Debug
```javascript
// Abilita log dettagliati
console.log('WebAI: Processamento richiesta con integrazione web');

// Verifica disponibilità servizio
const isAvailable = await aiAgent.isWebServiceAvailable();
console.log('Servizio web disponibile:', isAvailable);
```

## Limitazioni

### Limitazioni Attuali
- **Parsing HTML**: Il parsing dei risultati di ricerca è semplificato
- **API Rate Limits**: I motori di ricerca potrebbero limitare le richieste
- **Contenuto Dinamico**: Difficoltà con contenuti generati via JavaScript
- **Autenticazione**: Non supporta siti che richiedono login

### Sviluppi Futuri
- Integrazione con API ufficiali dei motori di ricerca
- Supporto per contenuti JavaScript dinamici
- Cache intelligente dei risultati
- Supporto per più tipi di contenuto (PDF, immagini, etc.)

## Troubleshooting

### Problemi Comuni

**1. Ricerche web non funzionano**
- Verifica la connettività internet
- Controlla le impostazioni firewall
- Verifica la configurazione del webscraper

**2. Risposte non arricchite**
- Controlla la soglia di confidenza
- Verifica i log per errori di ricerca
- Controlla se il servizio è disponibile

**3. Performance lente**
- Riduci il numero massimo di risultati
- Aumenta i timeout se necessario
- Verifica la velocità di connessione

### Debug Avanzato
```javascript
// Abilita debug dettagliato
const webConfig = config.getWebScraperConfig();
console.log('Configurazione webscraper:', webConfig);

// Test connettività
const testResult = await webScraper.searchWeb('test', 'google', 1);
console.log('Test connettività:', testResult);
```

## Contributi

Per contribuire al miglioramento del webscraper:

1. Segui le linee guida di codifica del progetto
2. Aggiungi test per nuove funzionalità
3. Documenta le modifiche
4. Considera l'impatto sulle performance
5. Rispetta le politiche dei siti web target

## Licenza

Questo modulo è parte del progetto Termina e segue la stessa licenza del progetto principale.

