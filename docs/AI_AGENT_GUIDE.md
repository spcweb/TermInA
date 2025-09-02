# AI Agent Iterativo - Guida Utente

## Nuove Funzionalità

L'AI Agent integrato in TermInA ora supporta **esecuzione automatica e iterazione** sui comandi, andando oltre il semplice suggerimento di comandi.

## Comandi Disponibili

### Modalità Suggerimento (comportamento precedente)
```bash
ai "crea una cartella chiamata test"
ask "mostra lo spazio disco disponibile"
```

### Modalità Esecuzione Automatica (nuova!)
```bash
execute "crea una cartella chiamata test"
run "mostra lo spazio disco disponibile"
```

## Come Funziona l'Iterazione

Quando usi `execute` o `run`, l'AI Agent:

1. **Analizza** la richiesta per determinare il comando necessario
2. **Esegue** automaticamente il comando
3. **Verifica** se il risultato soddisfa la richiesta originale
4. **Itera** fino a un massimo di 5 tentativi se il risultato non è soddisfacente
5. **Propone soluzioni alternative** in caso di errori

## Esempi Pratici

### Esempio 1: Creazione Directory
```bash
execute "crea una directory per i miei progetti Python"
```

L'AI Agent:
- Suggerisce: `mkdir python_projects`
- Esegue il comando
- Verifica che la directory sia stata creata
- Conferma il successo o prova alternative

### Esempio 2: Monitoraggio Sistema
```bash
run "controlla quanto spazio ho sul disco e dimmi se devo liberare spazio"
```

L'AI Agent:
- Esegue: `df -h`
- Analizza l'output per determinare l'utilizzo
- Se necessario, suggerisce ed esegue comandi aggiuntivi come `du -sh *` per identificare file grandi
- Fornisce raccomandazioni finali

### Esempio 3: Gestione Processi
```bash
execute "trova e termina tutti i processi Chrome che usano troppa memoria"
```

L'AI Agent:
- Prima esegue: `ps aux | grep -i chrome`
- Analizza l'utilizzo memoria
- Identifica processi problematici
- Esegue `kill` sui PID appropriati
- Verifica che i processi siano stati terminati

## Vantaggi dell'Iterazione

### ✅ Risoluzione Automatica degli Errori
Se un comando fallisce, l'AI prova approcci alternativi:
```bash
execute "installa Python"
```
- Prova: `brew install python3`
- Se fallisce: `curl https://www.python.org/downloads/ | grep latest`
- Se necessario: guida all'installazione manuale

### ✅ Verifica dei Risultati
L'AI non si ferma all'esecuzione, ma verifica che l'obiettivo sia raggiunto:
```bash
run "crea un backup della cartella documenti"
```
- Esegue il comando di backup
- Verifica che il backup sia stato creato
- Controlla l'integrità dei file
- Conferma il successo

### ✅ Apprendimento dal Contesto
Ogni iterazione tiene conto dei tentativi precedenti:
```bash
execute "trova il file più grande nella home directory"
```
- Tentativo 1: `find ~ -type f -exec ls -la {} \; | sort -k5 -rn | head -1`
- Se troppo lento: `find ~ -type f -exec du -h {} \; | sort -rh | head -10`
- Se ancora problematico: `du -ah ~ | sort -rh | head -20`

## Controllo e Sicurezza

### Cronologia Trasparente
Ogni esecuzione mostra:
- ✅ Comando eseguito
- 💭 Ragionamento dell'AI
- 📤 Risultato ottenuto
- 🔄 Numero di iterazioni

### Limiti di Sicurezza
- Massimo 5 iterazioni per evitare loop infiniti
- Comandi potenzialmente pericolosi richiedono conferma
- Log completo di tutte le operazioni

## Modalità di Utilizzo

### Per Utenti Esperti
Usa `execute` quando vuoi che l'AI gestisca completamente il task:
```bash
execute "ottimizza le performance del sistema"
execute "configura un ambiente di sviluppo Node.js"
execute "pulisci i file temporanei"
```

### Per Apprendimento
Usa `ai` per vedere i comandi e imparare:
```bash
ai "come posso monitorare l'utilizzo della CPU?"
ai "quali sono i comandi git più utili?"
```

## Esempi Avanzati

### Diagnosi Sistema Completa
```bash
execute "esegui una diagnosi completa del sistema e dimmi se ci sono problemi"
```

### Setup Ambiente di Sviluppo
```bash
run "configura un ambiente Python con virtual environment per machine learning"
```

### Pulizia e Manutenzione
```bash
execute "libera spazio su disco trovando e rimuovendo file duplicati e cache inutili"
```

## Tips & Tricks

1. **Sii specifico**: Più dettagli fornisci, migliore sarà l'esecuzione
2. **Usa il contesto**: L'AI ricorda le operazioni precedenti nella sessione
3. **Combina le modalità**: Usa `ai` per esplorare e `execute` per applicare
4. **Controlla sempre**: Anche se automatico, verifica sempre i risultati importanti

## Risoluzione Problemi

Se l'AI Agent non funziona come aspettato:

1. Verifica che la configurazione AI sia corretta nelle impostazioni
2. Controlla che il provider AI (Gemini/LM Studio/OpenAI) sia attivo
3. Usa `ai` invece di `execute` per vedere i comandi suggeriti
4. Controlla i log del terminale per errori

---

**Nota**: Questa funzionalità è ancora in sviluppo. Feedback e suggerimenti sono benvenuti!
