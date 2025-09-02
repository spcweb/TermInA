# Configurazione LM Studio con Termina

Questa guida ti mostrerà come configurare LM Studio per utilizzare modelli AI locali con Termina.

## 📦 Installazione di LM Studio

1. Scarica LM Studio dal sito ufficiale: https://lmstudio.ai/
2. Installa l'applicazione sul tuo sistema
3. Avvia LM Studio

## 🤖 Download di un Modello

1. Apri LM Studio
2. Vai alla sezione "Search" (🔍)
3. Cerca un modello compatibile, ad esempio:
   - `microsoft/DialoGPT-medium`
   - `HuggingFaceH4/zephyr-7b-beta`
   - `NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO`
   - `TheBloke/CodeLlama-7B-Instruct-GGUF`

4. Seleziona il modello e clicca "Download"

## 🚀 Avvio del Server Locale

1. Una volta scaricato il modello, vai alla sezione "Local Server" (🌐)
2. Seleziona il modello che hai scaricato
3. Configura le impostazioni del server:
   - **Port**: Mantieni 1234 (default)
   - **Cross-Origin Resource Sharing (CORS)**: Abilita se necessario
4. Clicca "Start Server"

Il server sarà disponibile all'indirizzo: `http://localhost:1234`

## ⚙️ Configurazione in Termina

1. Apri Termina
2. Premi `⌘,` per aprire le impostazioni
3. Vai alla sezione "Intelligenza Artificiale"
4. Seleziona "LM Studio (Locale)" come provider
5. Configura:
   - **Endpoint**: `http://localhost:1234/v1`
   - **Nome modello**: Il nome del modello che hai caricato
   - **API Key**: `lm-studio` (o lascia vuoto)

## 🧪 Test della Configurazione

1. Torna al terminale
2. Digita: `ai: Ciao, come stai?`
3. Premi Invio

Se tutto è configurato correttamente, dovresti ricevere una risposta dal modello locale.

## 💡 Suggerimenti

### Modelli Consigliati per Termini

| Modello | Dimensione | Velocità | Qualità | Uso Consigliato |
|---------|------------|----------|---------|-----------------|
| **CodeLlama-7B-Instruct** | ~4GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | Programmazione |
| **Zephyr-7B-Beta** | ~4GB | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | Uso generale |
| **Nous-Hermes-2** | ~8GB | ⚡⚡ | ⭐⭐⭐⭐⭐ | Conversazioni complesse |
| **Mixtral-8x7B** | ~16GB | ⚡ | ⭐⭐⭐⭐⭐ | Massima qualità |

### Ottimizzazione delle Prestazioni

1. **RAM**: Assicurati di avere almeno 8GB di RAM libera
2. **CPU**: I modelli più grandi richiedono CPU potenti
3. **GPU**: Se disponibile, abilita l'accelerazione GPU in LM Studio
4. **Context Length**: Riduci la lunghezza del contesto per risposte più veloci

### Risoluzione Problemi

#### Il server non si avvia
- Verifica che la porta 1234 non sia in uso
- Riavvia LM Studio
- Controlla i log nella console di LM Studio

#### Errori di connessione in Termina
- Verifica che l'endpoint sia `http://localhost:1234/v1`
- Controlla che il server sia effettivamente avviato
- Prova a disabilitare firewall/antivirus temporaneamente

#### Risposte lente o incomplete
- Riduci il parametro "Max Tokens" in LM Studio
- Usa un modello più piccolo
- Chiudi altre applicazioni per liberare RAM

#### Errore "Model not found"
- Verifica che il nome del modello in Termina corrisponda a quello caricato in LM Studio
- Controlla la sezione "Chat" di LM Studio per vedere il nome esatto

## 🔧 Configurazione Avanzata

### Parametri del Modello

In LM Studio puoi regolare:

- **Temperature**: (0.1-1.0) Creatività delle risposte
- **Top P**: (0.1-1.0) Diversità del vocabolario
- **Max Tokens**: Lunghezza massima della risposta
- **Repeat Penalty**: Evita ripetizioni

### API Personalizzate

Se usi un endpoint diverso da quello standard, puoi configurarlo in:
`Termina → Impostazioni → AI → LM Studio → Endpoint`

### Modelli Personalizzati

Puoi anche usare modelli GGUF personalizzati:
1. Scarica il file .gguf
2. Trascinalo in LM Studio
3. Caricalo come al solito

## 📚 Risorse Utili

- [LM Studio Documentation](https://lmstudio.ai/docs)
- [Hugging Face Model Hub](https://huggingface.co/models)
- [GGUF Format Guide](https://github.com/ggerganov/ggml/blob/master/docs/gguf.md)
- [Model Recommendations](https://lmstudio.ai/models)

---

**Nota**: I modelli AI locali richiedono risorse significative. Per prestazioni ottimali, usa un computer con almeno 16GB di RAM e una CPU moderna.
