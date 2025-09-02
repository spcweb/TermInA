# Rilevamento Automatico della Lingua AI

## Panoramica

TermInA ora include il rilevamento automatico della lingua per le richieste AI. L'AI risponderà nella stessa lingua in cui viene posta la domanda, rendendo l'esperienza più naturale per gli utenti internazionali.

## Lingue Supportate

- **Italiano** (it)
- **Inglese** (en) - lingua di fallback
- **Spagnolo** (es)
- **Francese** (fr)
- **Tedesco** (de)

## Come Funziona

1. **Rilevamento**: Quando viene inviata una richiesta AI, il sistema analizza il testo per identificare la lingua
2. **Istruzione**: Viene aggiunta automaticamente un'istruzione specifica per la lingua rilevata
3. **Risposta**: L'AI risponde nella lingua appropriata

## Algoritmo di Rilevamento

Il sistema utilizza un approccio multi-livello:

### 1. Analisi delle Parole Chiave
- Parole interrogative: come, cosa, where, how, etc.
- Verbi comuni: spiegami, aiutami, explain, help, etc.
- Sostantivi tecnici: file, cartella, comando, etc.

### 2. Analisi Grammaticale
- Articoli: il/la/lo (italiano), the/a/an (inglese), etc.
- Preposizioni: di/da/in (italiano), of/from/in (inglese), etc.

### 3. Caratteri Specifici
- Accenti italiani: à, è, é, ì, ò, ù
- Accenti spagnoli: á, é, í, ñ, ó, ú, ü, ¿, ¡
- Caratteri francesi: à, â, ä, é, è, ê, ë, etc.
- Caratteri tedeschi: ä, ö, ü, ß

## Esempi di Utilizzo

### Italiano
```
ai Come posso installare Node.js?
→ AI risponde in italiano
```

### Inglese
```
ai How can I install Node.js?
→ AI responds in English
```

### Spagnolo
```
ai ¿Cómo puedo instalar Node.js?
→ AI responde en español
```

### Francese
```
ai Comment installer Node.js?
→ L'AI répond en français
```

### Tedesco
```
ai Wie installiere ich Node.js?
→ AI antwortet auf Deutsch
```

## Casi Limite

- **Comandi puri** (es. `ls -la`): Fallback all'inglese
- **Stringhe vuote**: Fallback all'inglese
- **Testo misto**: Viene scelta la lingua predominante
- **Testo ambiguo**: Fallback all'inglese

## Configurazione

La funzionalità è attiva di default e non richiede configurazione. Il rilevamento avviene automaticamente per tutti i comandi AI:

- `ai <domanda>`
- `ask <domanda>`
- `execute <compito>`
- `run <compito>`

## File Coinvolti

- `src/language-detector.js` - Classe principale per il rilevamento
- `src/ai-manager.js` - Integrazione con il gestore AI
- `src/ai-agent.js` - Integrazione con l'agente AI
- `test-language-detection.js` - Test di verifica

## Benefici

1. **Esperienza Naturale**: Gli utenti possono interagire nella loro lingua madre
2. **Accessibilità**: Supporto per utenti internazionali
3. **Automatico**: Nessuna configurazione richiesta
4. **Accurato**: Rilevamento preciso basato su multiple euristiche
5. **Robusto**: Gestione intelligente dei casi limite

## Test

Per testare il rilevamento della lingua:

```bash
node test-language-detection.js
```

Questo eseguirà una serie completa di test con frasi in tutte le lingue supportate.
