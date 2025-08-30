# Rilevamento Automatico della Lingua

## Panoramica

TermInA ora include un sistema di rilevamento automatico della lingua che permette all'AI di rispondere sempre nella stessa lingua in cui viene posta la domanda. Questa funzionalità migliora significativamente l'esperienza utente, specialmente per utenti multilingue.

## Come Funziona

### 1. Rilevamento della Lingua
Il sistema analizza automaticamente il testo della domanda dell'utente per identificare la lingua utilizzando:

- **Pattern di parole chiave**: Riconosce parole comuni e frasi tipiche di ogni lingua
- **Caratteri specifici**: Identifica caratteri unici di lingue come cinese, giapponese, russo
- **Punteggio di confidenza**: Assegna un punteggio per determinare la lingua più probabile

### 2. Lingue Supportate

Il sistema supporta attualmente le seguenti lingue:

| Lingua | Codice | Esempio di Rilevamento |
|--------|--------|----------------------|
| Italiano | `italiano` | "Come posso creare una cartella?" |
| English | `english` | "How can I create a folder?" |
| Español | `español` | "¿Cómo puedo crear una carpeta?" |
| Français | `français` | "Comment puis-je créer un dossier?" |
| Deutsch | `deutsch` | "Wie kann ich einen Ordner erstellen?" |
| Português | `português` | "Como posso criar uma pasta?" |
| Русский | `русский` | "Как я могу создать папку?" |
| 中文 | `中文` | "我如何创建文件夹？" |
| 日本語 | `日本語` | "フォルダを作成するには？" |

### 3. Istruzioni Automatiche

Per ogni lingua rilevata, il sistema aggiunge automaticamente un'istruzione specifica al prompt dell'AI:

```javascript
// Esempio per l'italiano
"Rispondi sempre in italiano, mantenendo un tono professionale ma amichevole."

// Esempio per l'inglese
"Always respond in English, maintaining a professional but friendly tone."
```

## Implementazione Tecnica

### File Principali

- `src/language-detector.js`: Modulo principale per il rilevamento della lingua
- `src/ai-agent.js`: Integrazione con l'agente AI
- `src/ai-manager.js`: Integrazione con il gestore AI

### Algoritmo di Rilevamento

1. **Analisi Pattern**: Conta le occorrenze di parole chiave specifiche per ogni lingua
2. **Calcolo Punteggio**: Assegna un punteggio di confidenza basato sui match trovati
3. **Fallback Caratteri**: Se non ci sono pattern specifici, analizza i caratteri Unicode
4. **Default**: Se tutto fallisce, usa l'inglese come lingua di default

### Esempio di Utilizzo

```javascript
const languageDetector = require('./src/language-detector');

// Rileva la lingua di un testo
const result = languageDetector.detectLanguage("Ciao, come stai?");
console.log(result.language); // "italiano"
console.log(result.confidence); // 3
console.log(result.responseInstruction); // "Rispondi sempre in italiano..."

// Aggiungi l'istruzione al prompt
const enhancedPrompt = languageDetector.addLanguageInstruction(
  "Crea una cartella", 
  result
);
```

## Test e Verifica

### Eseguire i Test

```bash
node test-language-detection.js
```

### Casi di Test

Il sistema include test per:
- Tutte le lingue supportate
- Testo misto (più lingue)
- Testo generico senza pattern specifici
- Caratteri speciali e Unicode

## Configurazione

### Aggiungere Nuove Lingue

Per aggiungere una nuova lingua, modifica `src/language-detector.js`:

```javascript
'nuova_lingua': {
  patterns: [
    /\b(parola1|parola2|parola3)\b/i,
    // Altri pattern...
  ],
  response: 'Istruzione per rispondere in questa lingua.'
}
```

### Personalizzare le Istruzioni

Puoi modificare le istruzioni per ogni lingua cambiando il campo `response` nel file `language-detector.js`.

## Vantaggi

1. **Esperienza Utente Migliorata**: L'AI risponde sempre nella lingua dell'utente
2. **Nessuna Configurazione**: Funziona automaticamente senza impostazioni
3. **Supporto Multilingue**: Gestisce 9 lingue diverse
4. **Fallback Intelligente**: Usa l'inglese come lingua di default
5. **Alta Precisione**: Rileva correttamente la lingua nella maggior parte dei casi

## Limitazioni

1. **Testo Misto**: Per testo che mescola più lingue, sceglie la lingua dominante
2. **Lingue Simili**: Giapponese e cinese possono essere confuse per caratteri simili
3. **Testo Breve**: Per testi molto brevi, la precisione può diminuire

## Troubleshooting

### Problemi Comuni

1. **Lingua Rilevata Incorrettamente**
   - Verifica che il testo contenga parole chiave specifiche della lingua
   - Usa frasi più lunghe per migliorare la precisione

2. **Risposta in Lingua Sbagliata**
   - Controlla che l'AI sia configurata correttamente
   - Verifica che il provider AI supporti la lingua richiesta

3. **Testo Misto**
   - Il sistema sceglie la lingua con più pattern match
   - Per risultati migliori, usa una sola lingua per domanda

## Sviluppi Futuri

- [ ] Supporto per più lingue
- [ ] Miglioramento del rilevamento per testo misto
- [ ] Configurazione personalizzabile delle lingue preferite
- [ ] Rilevamento basato su machine learning
- [ ] Supporto per dialetti regionali
