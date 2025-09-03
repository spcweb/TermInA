# Guida Configurazione AI Multiple

TermInA supporta tre provider AI differenti che puoi configurare e utilizzare a piacimento. Ecco una guida completa per configurare ciascuno di essi.

## 🤖 Provider AI Supportati

### 1. Google Gemini (Consigliato)
- **Veloce e gratuito** (con limiti)
- **Multimodale** (testo, immagini, code)
- **Ottimo per uso generale**

### 2. OpenAI (GPT)
- **Qualità eccellente**
- **Modelli avanzati** (GPT-4, GPT-4o)
- **A pagamento**

### 3. LM Studio (Locale)
- **Completamente privato**
- **Nessun costo dopo setup**
- **Richiede hardware potente**

### 4. Ollama (Locale)
- **Completamente privato e open source**
- **Facile da installare e configurare**
- **Modelli ottimizzati per diverse task**
- **Nessun costo dopo setup**

---

## 📝 Configurazione Step-by-Step

### 🔮 Google Gemini

#### 1. Ottieni API Key
1. Vai su [Google AI Studio](https://makersuite.google.com/)
2. Accedi con il tuo account Google
3. Crea un nuovo progetto o seleziona esistente
4. Vai su "API Keys" nel menu laterale
5. Clicca "Create API Key"
6. Copia la chiave generata (formato: `AIzaSy...`)

#### 2. Configura in TermInA
1. Apri Impostazioni (⌘+,)
2. Vai alla sezione "Artificial Intelligence"
3. Seleziona "Google Gemini" dal dropdown
4. Incolla la API Key nel campo "API Key"
5. Scegli il modello:
   - **Gemini 2.5 Flash**: Veloce, ideale per uso generale
   - **Gemini Pro**: Più potente, per task complessi
6. Clicca "Test Connection" per verificare
7. Salva le impostazioni

#### 3. Limiti e Costi
- **Gratuito**: 15 richieste/minuto, 1M token/mese
- **A pagamento**: $0.075 per 1M token input, $0.30 per 1M token output

---

### 🧠 OpenAI (ChatGPT)

#### 1. Ottieni API Key
1. Vai su [OpenAI Platform](https://platform.openai.com/)
2. Crea un account o accedi
3. Aggiungi un metodo di pagamento
4. Vai su "API Keys" nel dashboard
5. Crea una nuova Secret Key
6. Copia la chiave (formato: `sk-...`)

#### 2. Configura in TermInA
1. Impostazioni → AI → Seleziona "OpenAI"
2. Incolla la API Key
3. Scegli il modello:
   - **GPT-3.5 Turbo**: Economico, buona qualità
   - **GPT-4**: Qualità superiore, più costoso
   - **GPT-4 Turbo**: Versione ottimizzata di GPT-4
   - **GPT-4o**: Modello più recente e veloce
4. Test della connessione
5. Salva

#### 3. Costi Approssimativi
- **GPT-3.5 Turbo**: $0.50 per 1M token input, $1.50 per 1M token output
- **GPT-4**: $30 per 1M token input, $60 per 1M token output
- **GPT-4o**: $5 per 1M token input, $15 per 1M token output

---

### 🏠 LM Studio (AI Locale)

#### 1. Installa LM Studio
1. Scarica da [lmstudio.ai](https://lmstudio.ai/)
2. Installa l'applicazione
3. Apri LM Studio

#### 2. Scarica un Modello
1. Vai alla sezione "Search" in LM Studio
2. Cerca modelli consigliati:
   - **Llama 2 7B**: Buon equilibrio qualità/velocità
   - **Code Llama 7B**: Specializzato in programmazione
   - **Mistral 7B**: Eccellente qualità, multilingue
   - **Phi-3 Mini**: Molto veloce, buono per chat
3. Clicca "Download" sul modello scelto
4. Attendi il completamento (può richiedere tempo)

#### 3. Avvia il Server Locale
1. Vai alla sezione "Local Server" in LM Studio
2. Seleziona il modello scaricato
3. Configura le impostazioni:
   - **Port**: 1234 (default)
   - **Context Length**: 4096 o superiore
   - **GPU Layers**: Massimo supportato dall'hardware
4. Clicca "Start Server"
5. Verifica che mostri "Server is running on http://localhost:1234"

#### 4. Configura in TermInA
1. Impostazioni → AI → Seleziona "LM Studio (Local)"
2. Endpoint: `http://localhost:1234/v1`
3. Model name: Nome del modello (es. "llama-2-7b-chat")
4. API Key: Lascia "lm-studio" (default)
5. Test della connessione
6. Salva

#### 5. Requisiti Hardware
- **Minimum**: 8GB RAM, CPU moderno
- **Raccomandato**: 16GB+ RAM, GPU dedicata
- **Ottimale**: 32GB+ RAM, GPU NVIDIA con 8GB+ VRAM

---

### 🦙 Ollama (AI Locale)

#### 1. Installa Ollama
1. Scarica da [ollama.ai](https://ollama.ai/)
2. Installa l'applicazione per il tuo sistema operativo
3. Apri il terminale e verifica l'installazione:
   ```bash
   ollama --version
   ```

#### 2. Scarica un Modello
1. Nel terminale, scarica un modello:
   ```bash
   # Modelli generali
   ollama pull gemma3:270m    # Molto veloce, buona qualità
   ollama pull llama3.2
   ollama pull mistral
   ollama pull codellama
   
   # Modelli specializzati
   ollama pull llama3.2:3b    # Versione leggera
   ollama pull llama3.2:8b    # Versione bilanciata
   ollama pull llama3.2:70b   # Versione completa
   ```

#### 3. Avvia Ollama
1. Ollama si avvia automaticamente come servizio
2. Verifica che sia attivo:
   ```bash
   curl http://localhost:11434/api/tags
   ```
3. Dovresti vedere la lista dei modelli disponibili

#### 4. Configura in TermInA
1. Impostazioni → AI → Seleziona "Ollama (Local)"
2. Endpoint: `http://localhost:11434` (default)
3. Model name: Nome del modello scaricato (es. "gemma3:270m")
4. API Key: Lascia vuoto per installazioni locali
5. Test della connessione
6. Salva

#### 5. Requisiti Hardware
- **Minimum**: 4GB RAM, CPU moderno
- **Raccomandato**: 8GB+ RAM, CPU multi-core
- **Ottimale**: 16GB+ RAM, GPU dedicata (opzionale)

---

## 🔄 Switching tra Provider

### Cambio Rapido
1. Apri Impostazioni (⌘+,)
2. Sezione AI → Cambia "AI Provider"
3. Salva
4. L'AI si adatta immediatamente al nuovo provider

### Provider per Scenario
- **Gemini**: Uso quotidiano, domande generali
- **OpenAI**: Task complessi, analisi profonde
- **LM Studio**: Privacy, uso offline, sperimentazione
- **Ollama**: Privacy, facile setup, modelli ottimizzati

---

## 🧪 Test delle Configurazioni

Ogni provider ha un pulsante "Test Connection" che:
1. ✅ Verifica la connettività
2. ✅ Testa l'autenticazione
3. ✅ Conferma che il modello risponde
4. ✅ Mostra eventuali errori di configurazione

### Risoluzione Problemi Comuni

#### Gemini
- **❌ 403 Forbidden**: API Key non valida
- **❌ 429 Too Many Requests**: Limite rate raggiunto
- **❌ 400 Bad Request**: Controlla formato richiesta

#### OpenAI
- **❌ 401 Unauthorized**: API Key non valida o scaduta
- **❌ 429 Rate limit**: Troppi richieste, aspetta
- **❌ 402 Payment Required**: Metodo pagamento richiesto

#### LM Studio
- **❌ Connection failed**: Server non avviato
- **❌ 404 Not Found**: Endpoint URL errato
- **❌ 500 Internal Error**: Modello non caricato correttamente

#### Ollama
- **❌ Connection failed**: Ollama non avviato
- **❌ 404 Not Found**: Endpoint URL errato
- **❌ 500 Internal Error**: Modello non scaricato o corrotto
- **❌ Model not found**: Verifica che il modello sia stato scaricato con `ollama list`

---

## 💡 Suggerimenti Avanzati

### Ottimizzazione Prestazioni
```bash
# Test velocità provider
ai "dimmi solo 'ok'"        # Test velocità base
execute "crea file test"    # Test esecuzione comando
```

### Configurazioni Multiple
Puoi facilmente passare da un provider all'altro per ottimizzare:
- **Gemini**: Per comandi rapidi e frequenti
- **OpenAI**: Per analisi complesse
- **LM Studio**: Per privacy e controllo completo
- **Ollama**: Per privacy, facilità d'uso e modelli specializzati

### Backup Configurazioni
Le configurazioni sono salvate in `~/.termina/config.json`:
```bash
# Backup configurazioni
cp ~/.termina/config.json ~/.termina/config.backup.json
```

### Monitoraggio Costi
- **Gemini**: Monitora su [Google Cloud Console](https://console.cloud.google.com/)
- **OpenAI**: Dashboard usage su [platform.openai.com](https://platform.openai.com/usage)
- **LM Studio**: Gratuito dopo setup iniziale
- **Ollama**: Completamente gratuito dopo setup iniziale

---

## 🚨 Note sulla Sicurezza

1. **Non condividere mai le API Keys**
2. **Usa variabili d'ambiente per deployment**
3. **Monitora l'uso per evitare costi imprevisti**
4. **LM Studio e Ollama sono le opzioni più private** (tutto locale)
5. **Revoca le chiavi se compromesse**
6. **Ollama offre il massimo controllo sui dati** (open source, locale)

---

## 📞 Supporto

Se hai problemi con la configurazione:
1. Controlla i log di TermInA
2. Verifica la connessione internet
3. Testa con il pulsante "Test Connection"
4. Consulta la documentazione del provider
5. Apri un issue su GitHub

**Buona sperimentazione con l'AI integrata in TermInA! 🚀**
