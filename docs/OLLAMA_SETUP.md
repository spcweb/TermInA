# 🦙 Guida Configurazione Ollama in TermInA

Ollama è un sistema per eseguire modelli di linguaggio locali in modo semplice ed efficiente. TermInA supporta nativamente Ollama per offrirti un'alternativa completamente privata e gratuita alle AI cloud.

## 🚀 Vantaggi di Ollama

- **🔒 Privacy completa**: Tutti i dati rimangono sul tuo computer
- **💰 Gratuito**: Nessun costo dopo l'installazione iniziale
- **⚡ Veloce**: Esecuzione locale senza latenza di rete
- **🔄 Open Source**: Controllo completo sul codice
- **📱 Facile**: Installazione e configurazione semplici
- **🎯 Modelli ottimizzati**: Supporto per modelli specializzati

---

## 📥 Installazione di Ollama

### macOS
```bash
# Download e installazione automatica
curl -fsSL https://ollama.ai/install.sh | sh

# Verifica installazione
ollama --version
```

### Linux
```bash
# Download e installazione automatica
curl -fsSL https://ollama.ai/install.sh | sh

# Verifica installazione
ollama --version
```

### Windows
1. Scarica l'installer da [ollama.ai](https://ollama.ai/)
2. Esegui l'installer
3. Riavvia il terminale
4. Verifica: `ollama --version`

---

## 🎯 Modelli Disponibili

### Modelli Generali
```bash
# Modelli base (veloci, buona qualità)
ollama pull gemma3:270m      # 270M parametri - molto veloce
ollama pull llama3.2:3b      # 3B parametri - veloce
ollama pull llama3.2:8b      # 8B parametri - bilanciato
ollama pull mistral:7b       # 7B parametri - eccellente qualità

# Modelli avanzati (più lenti, qualità superiore)
ollama pull llama3.2:70b     # 70B parametri - massima qualità
ollama pull codellama:70b    # 70B parametri - specializzato in codice
```

### Modelli Specializzati
```bash
# Programmazione
ollama pull codellama:7b     # Specializzato in codice
ollama pull deepseek-coder   # Ottimo per sviluppo

# Chat e assistenza
ollama pull llama3.2:8b      # Conversazioni naturali
ollama pull mistral:7b       # Multilingue, versatile

# Modelli leggeri
ollama pull phi3:mini        # Molto veloce, buono per chat
ollama pull tinyllama:1b     # Estremamente veloce
```

---

## ⚙️ Configurazione in TermInA

### 1. Apri le Impostazioni
- Premi `⌘+,` (macOS) o `Ctrl+,` (Windows/Linux)
- Vai alla sezione "Artificial Intelligence"

### 2. Seleziona Ollama
- Cambia "AI Provider" a "Ollama (Local)"

### 3. Configura i Parametri
- **Endpoint**: `http://localhost:11434` (default)
- **Model name**: Nome del modello scaricato (es. "gemma3:270m")
- **API Key**: Lascia vuoto per installazioni locali

### 4. Test della Connessione
- Clicca "Test Connection"
- Verifica che la connessione sia riuscita

### 5. Salva le Impostazioni
- Clicca "Save" per applicare le modifiche

---

## 🔧 Gestione Modelli

### Lista Modelli Installati
```bash
ollama list
```

### Rimuovere un Modello
```bash
ollama rm nome-modello
```

### Aggiornare un Modello
```bash
ollama pull nome-modello
```

### Informazioni su un Modello
```bash
ollama show nome-modello
```

---

## 🚀 Avvio e Gestione

### Avvio Automatico
Ollama si avvia automaticamente come servizio:
- **macOS**: Si avvia al login
- **Linux**: Servizio systemd
- **Windows**: Servizio Windows

### Avvio Manuale
```bash
# Avvia Ollama
ollama serve

# In un altro terminale, verifica lo stato
curl http://localhost:11434/api/tags
```

### Fermare Ollama
```bash
# Ferma il servizio
ollama stop
```

---

## 📊 Requisiti Hardware

### Requisiti Minimi
- **RAM**: 4GB
- **CPU**: Processore moderno (2018+)
- **Storage**: 2GB liberi per modelli base

### Requisiti Raccomandati
- **RAM**: 8GB+
- **CPU**: Multi-core recente
- **Storage**: 5GB+ liberi
- **GPU**: Opzionale ma consigliata

### Requisiti Ottimali
- **RAM**: 16GB+
- **CPU**: CPU moderna multi-core
- **GPU**: NVIDIA con 8GB+ VRAM
- **Storage**: SSD veloce

---

## 🧪 Test e Verifica

### Test Base
```bash
# Test semplice
ollama run gemma3:270m "Ciao, come stai?"

# Test con contesto
ollama run gemma3:270m "Spiega brevemente cosa è l'intelligenza artificiale"
```

### Test in TermInA
1. Apri TermInA
2. Premi `⌘+Shift+A` per attivare l'AI
3. Fai una domanda semplice
4. Verifica che la risposta provenga da Ollama

### Verifica Connessione
```bash
# Test endpoint API
curl http://localhost:11434/api/tags

# Test completamento
curl -X POST http://localhost:11434/api/generate \
  -d '{"model": "gemma3:270m", "prompt": "Test"}'
```

---

## 🔍 Risoluzione Problemi

### Problemi Comuni

#### ❌ Ollama non si avvia
```bash
# Verifica se è già in esecuzione
ps aux | grep ollama

# Riavvia il servizio
ollama stop
ollama serve
```

#### ❌ Modello non trovato
```bash
# Verifica modelli installati
ollama list

# Scarica il modello mancante
ollama pull nome-modello
```

#### ❌ Errore di memoria
- Riduci la dimensione del modello
- Chiudi altre applicazioni
- Aumenta la RAM disponibile

#### ❌ Connessione rifiutata
```bash
# Verifica che Ollama sia in esecuzione
curl http://localhost:11434/api/tags

# Controlla i log
ollama serve --verbose
```

### Log e Debug
```bash
# Avvia con log dettagliati
ollama serve --verbose

# Verifica stato servizio
ollama status
```

---

## 🎯 Ottimizzazioni

### Performance
```bash
# Usa modelli più piccoli per velocità
ollama pull llama3.2:3b

# Usa modelli più grandi per qualità
ollama pull llama3.2:70b
```

### Memoria
```bash
# Configura limiti di memoria
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_ORIGINS=*
```

### GPU
```bash
# Verifica supporto GPU
nvidia-smi  # NVIDIA
rocm-smi    # AMD

# Ollama usa automaticamente la GPU se disponibile
```

---

## 🔄 Aggiornamenti

### Aggiornare Ollama
```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Scarica e installa la nuova versione
```

### Aggiornare Modelli
```bash
# Aggiorna tutti i modelli
ollama pull --latest

# Aggiorna un modello specifico
ollama pull nome-modello:latest
```

---

## 📚 Risorse Utili

### Documentazione Ufficiale
- [ollama.ai](https://ollama.ai/) - Sito ufficiale
- [GitHub](https://github.com/ollama/ollama) - Codice sorgente
- [Documentazione](https://github.com/ollama/ollama/blob/main/docs/README.md)

### Community
- [Discord](https://discord.gg/ollama) - Community ufficiale
- [Reddit](https://reddit.com/r/ollama) - Discussioni e supporto

### Modelli Popolari
- [Ollama Library](https://ollama.ai/library) - Catalogo modelli
- [Hugging Face](https://huggingface.co/) - Modelli alternativi

---

## 💡 Suggerimenti Avanzati

### Modelli Personalizzati
```bash
# Crea un modello personalizzato
ollama create custom-model -f Modelfile

# Esempio Modelfile
FROM llama3.2:8b
SYSTEM "Sei un assistente esperto in programmazione Python"
```

### Integrazione con Altri Strumenti
- **LangChain**: Framework per applicazioni AI
- **Ollama Python**: Client Python ufficiale
- **Ollama JavaScript**: Client JavaScript ufficiale

### Backup e Ripristino
```bash
# Backup modelli
ollama cp nome-modello backup-modello

# Ripristina modello
ollama cp backup-modello nome-modello
```

---

## 🎉 Prossimi Passi

1. **Installa Ollama** seguendo questa guida
2. **Scarica un modello** di base (es. gemma3:270m)
3. **Configura TermInA** per usare Ollama
4. **Testa la connessione** con domande semplici
5. **Esplora modelli** diversi per trovare quello migliore per te
6. **Condividi la tua esperienza** con la community

**Buon divertimento con Ollama in TermInA! 🚀**
