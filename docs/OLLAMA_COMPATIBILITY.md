# 🔧 Guida Compatibilità Ollama

Questa guida ti aiuta a risolvere i problemi di compatibilità più comuni con Ollama in TermInA.

## 🚨 Problemi Comuni e Soluzioni

### 1. **Endpoint API non raggiungibili**

#### Problema
Gli endpoint `/api/chat` e `/api/generate` non sono raggiungibili durante i test.

#### Soluzione
- **Verifica che Ollama sia in esecuzione**: `ollama serve`
- **Controlla la porta**: Ollama usa la porta 11434 per default
- **Testa manualmente**: Usa curl per verificare gli endpoint

```bash
# Test endpoint
curl http://localhost:11434/api/tags
curl -X POST http://localhost:11434/api/generate \
  -d '{"model": "gemma3:270m", "prompt": "test", "stream": false}'
```

### 2. **Modello non trovato**

#### Problema
Il modello configurato non è disponibile in Ollama.

#### Soluzione
- **Verifica modelli disponibili**: `ollama list`
- **Scarica il modello mancante**: `ollama pull nome-modello`
- **Aggiorna la configurazione** in TermInA con il nome corretto

```bash
# Lista modelli disponibili
ollama list

# Scarica un modello
ollama pull gemma3:270m
```

### 3. **Formato risposta non riconosciuto**

#### Problema
L'AI Manager non riesce a interpretare la risposta di Ollama.

#### Soluzione
TermInA supporta automaticamente diversi formati di risposta:
- **Formato Chat**: `{"message": {"content": "..."}}`
- **Formato Generate**: `{"response": "..."}`
- **Formato OpenAI**: `{"choices": [{"message": {"content": "..."}}]}`

### 4. **Timeout di connessione**

#### Problema
Le richieste ad Ollama impiegano troppo tempo o falliscono.

#### Soluzione
- **Verifica performance del modello**: Modelli più grandi sono più lenti
- **Controlla risorse sistema**: RAM e CPU sufficienti
- **Usa modelli più piccoli** per test rapidi

```bash
# Modelli veloci per test
ollama pull gemma3:270m    # 270M parametri
ollama pull phi3:mini      # Molto veloce
ollama pull tinyllama:1b   # Estremamente veloce
```

---

## 🔍 Diagnostica Problemi

### Test di Connessione Base
```bash
# 1. Verifica che Ollama sia in esecuzione
ps aux | grep ollama

# 2. Test endpoint base
curl http://localhost:11434/api/tags

# 3. Test endpoint completamento
curl -X POST http://localhost:11434/api/generate \
  -d '{"model": "gemma3:270m", "prompt": "test", "stream": false}'

# 4. Test endpoint chat
curl -X POST http://localhost:11434/api/chat \
  -d '{"model": "gemma3:270m", "messages": [{"role": "user", "content": "test"}], "stream": false}'
```

### Test in TermInA
1. **Apri Impostazioni** (⌘+,)
2. **Sezione AI** → Seleziona "Ollama (Local)"
3. **Configura endpoint** e modello
4. **Testa connessione** con pulsante dedicato
5. **Verifica log** per errori specifici

---

## 🛠️ Risoluzione Problemi Avanzata

### Problema: Ollama non si avvia
```bash
# Riavvia il servizio
ollama stop
ollama serve

# Verifica log
ollama serve --verbose
```

### Problema: Modello corrotto
```bash
# Rimuovi e riscarica il modello
ollama rm nome-modello
ollama pull nome-modello
```

### Problema: Porta già in uso
```bash
# Trova processo che usa la porta
lsof -i :11434

# Termina processo
kill -9 PID
```

### Problema: Permessi insufficienti
```bash
# Verifica permessi directory Ollama
ls -la ~/.ollama

# Correggi permessi se necessario
chmod 755 ~/.ollama
```

---

## 📊 Compatibilità Versioni

### Versioni Ollama Supportate
- **Ollama 0.1.x**: ✅ Supportato (endpoint `/api/generate`)
- **Ollama 0.2.x**: ✅ Supportato (endpoint `/api/chat` e `/api/generate`)
- **Ollama 0.3.x**: ✅ Supportato (endpoint `/api/chat` e `/api/generate`)

### Formati Modello Supportati
- **GGUF**: ✅ Supportato nativamente
- **GGML**: ✅ Supportato (deprecato)
- **PyTorch**: ❌ Non supportato (converti in GGUF)

---

## 🔧 Configurazione Ottimale

### Configurazione Raccomandata
```json
{
  "ai": {
    "provider": "ollama",
    "ollama": {
      "endpoint": "http://localhost:11434",
      "model": "gemma3:270m",
      "apiKey": ""
    }
  }
}
```

### Modelli Consigliati per Test
- **gemma3:270m**: Veloce, buona qualità, 270M parametri
- **phi3:mini**: Molto veloce, 3.8B parametri
- **llama3.2:3b**: Bilanciato, 3B parametri

---

## 📝 Log e Debug

### Abilita Log Dettagliati
```bash
# Avvia Ollama con log dettagliati
ollama serve --verbose

# In un altro terminale, verifica log
tail -f ~/.ollama/logs/ollama.log
```

### Log TermInA
- **Console principale**: Errori di connessione
- **Console impostazioni**: Errori di configurazione
- **Console AI**: Errori di elaborazione richieste

---

## 🆘 Supporto e Troubleshooting

### Se i problemi persistono:
1. **Verifica versione Ollama**: `ollama --version`
2. **Controlla log sistema**: `journalctl -u ollama` (Linux)
3. **Riavvia Ollama**: `ollama stop && ollama serve`
4. **Verifica risorse**: RAM, CPU, spazio disco
5. **Testa con curl** per isolare il problema

### Risorse Utili
- [Documentazione Ollama](https://github.com/ollama/ollama/blob/main/docs/README.md)
- [Community Discord](https://discord.gg/ollama)
- [Issues GitHub](https://github.com/ollama/ollama/issues)

---

## ✅ Checklist Risoluzione

- [ ] Ollama è in esecuzione (`ollama serve`)
- [ ] Endpoint raggiungibile (`curl http://localhost:11434/api/tags`)
- [ ] Modello scaricato (`ollama list`)
- [ ] Configurazione corretta in TermInA
- [ ] Test connessione superato
- [ ] Log senza errori critici

**Se tutti i punti sono verificati, Ollama dovrebbe funzionare correttamente in TermInA! 🚀**
