// Agente AI avanzato con capacità di iterazione e esecuzione automatica
const aiManager = require('./ai-manager');
const systemInfo = require('./system-info');
const pathAlias = require('./path-alias');
const webAIIntegration = require('./web-ai-integration');

class AIAgent {
  constructor() {
    this.maxIterations = 5; // Limite per evitare loop infiniti
    this.currentIteration = 0;
    this.executionHistory = [];
    this.isExecuting = false;
  }

  async processRequest(prompt, terminalContext = [], autoExecute = false) {
    this.currentIteration = 0;
    this.executionHistory = [];
    this.isExecuting = true;

    try {
      const result = await this.iterateUntilSuccess(prompt, terminalContext, autoExecute);
      this.isExecuting = false;
      return result;
    } catch (error) {
      this.isExecuting = false;
      throw error;
    }
  }

  /**
   * Processa una richiesta con integrazione web per informazioni aggiornate
   */
  async processRequestWithWeb(prompt, terminalContext = [], autoExecute = false) {
    this.currentIteration = 0;
    this.executionHistory = [];
    this.isExecuting = true;

    try {
      console.log('AI Agent: Valutazione se necessaria integrazione web');
      
      // Determina se la richiesta necessita di ricerca web
      const needsWebSearch = this.shouldUseWebSearch(prompt);
      
      if (needsWebSearch) {
        console.log('AI Agent: Attivazione integrazione web per ricerca informazioni aggiornate');
        
        // Prova con l'integrazione web
        const webResult = await webAIIntegration.processRequestWithWebIntegration(
          prompt, 
          terminalContext, 
          autoExecute
        );
        
        if (webResult.type === 'web_enhanced') {
          // Risposta arricchita con informazioni web
          this.isExecuting = false;
          return {
            type: 'web_enhanced',
            response: webResult.enhancedResponse,
            originalResponse: webResult.originalResponse,
            searchQuery: webResult.searchQuery,
            searchResults: webResult.searchResults,
            confidence: webResult.confidence,
            reason: webResult.reason,
            iterations: 1,
            history: this.executionHistory
          };
        } else if (webResult.type === 'fallback') {
          // Fallback alla modalità normale se la ricerca web fallisce
          console.log('AI Agent: Fallback alla modalità normale');
          const result = await this.iterateUntilSuccess(prompt, terminalContext, autoExecute);
          this.isExecuting = false;
          return result;
        }
      }
      
      // Nessuna ricerca web necessaria, usa la modalità normale
      console.log('AI Agent: Nessuna ricerca web necessaria, uso modalità normale');
      const result = await this.iterateUntilSuccess(prompt, terminalContext, autoExecute);
      this.isExecuting = false;
      return result;
      
    } catch (error) {
      console.error('AI Agent: Error in processRequestWithWeb:', error);
      this.isExecuting = false;
      
      // Fallback alla modalità normale in caso di errore
      try {
        const result = await this.iterateUntilSuccess(prompt, terminalContext, autoExecute);
        return result;
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
  }

  /**
   * Determina se una richiesta necessita di ricerca web
   */
  shouldUseWebSearch(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    // Richieste che NON necessitano di web search
    const noWebSearchKeywords = [
      'ciao', 'salve', 'buongiorno', 'buonasera', 'come stai',
      'crea', 'cancella', 'elimina', 'sposta', 'copia', 'rinomina',
      'elenca', 'mostra', 'trova file', 'trova cartella',
      'installa', 'aggiorna', 'configura', 'imposta',
      'test', 'verifica', 'controlla', 'esegui', 'avvia'
    ];
    
    // Richieste che necessitano di web search
    const webSearchKeywords = [
      'notizie', 'ultime notizie', 'cosa succede', 'tendenze',
      'prezzi', 'costo', 'quanto costa', 'miglior', 'recensione',
      'come fare', 'tutorial', 'guida', 'istruzioni',
      'tempo', 'meteo', 'previsioni', 'previsione', 'traffico', 'orari', 'orario',
      'guerra', 'ucraina', 'russia', 'politica', 'economia', 'sport',
      'tecnologia', 'ai', 'intelligenza artificiale', 'software', 'hardware',
      'film', 'serie tv', 'musica', 'libri', 'cultura', 'scienza'
    ];
    
    // Se contiene parole che NON necessitano di web search, non attivare
    if (noWebSearchKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return false;
    }
    
    // Se contiene parole che necessitano di web search, attivare
    if (webSearchKeywords.some(keyword => lowerPrompt.includes(keyword))) {
      return true;
    }
    
    // Default: non attivare web search per richieste semplici
    return false;
  }

  async iterateUntilSuccess(originalPrompt, terminalContext, autoExecute) {
    while (this.currentIteration < this.maxIterations) {
      this.currentIteration++;
      
      console.log(`=== AI Agent Iteration ${this.currentIteration} ===`);
      
      // Costruisci il prompt con contesto
      const contextualPrompt = this.buildContextualPrompt(
        originalPrompt, 
        terminalContext, 
        this.executionHistory
      );

      // Chiedi all'AI cosa fare
      const aiResponse = await this.getAIDecision(contextualPrompt, originalPrompt);
      
      if (!aiResponse.requiresCommand) {
        // Risposta informativa, non serve iterazione
        return {
          type: 'informational',
          response: aiResponse.response,
          iterations: this.currentIteration,
          history: this.executionHistory
        };
      }

      // L'AI ha suggerito un comando
      console.log(`AI suggested command: ${aiResponse.command}`);
      
      if (!autoExecute) {
        // Modalità manuale - restituisci suggerimento
        return {
          type: 'suggestion',
          response: aiResponse.response,
          command: aiResponse.command,
          iterations: this.currentIteration,
          history: this.executionHistory
        };
      }

      // Modalità automatica - esegui il comando
      const executionResult = await this.executeCommand(aiResponse.command);
      
      // Aggiungi alla cronologia
      this.executionHistory.push({
        iteration: this.currentIteration,
        command: aiResponse.command,
        reasoning: aiResponse.response,
        result: executionResult
      });

      // Analizza se il risultato è soddisfacente
      const analysisResult = await this.analyzeResult(
        originalPrompt, 
        aiResponse.command, 
        executionResult,
        originalPrompt
      );

      if (analysisResult.isSuccessful) {
        // Successo! Ritorna il risultato
        return {
          type: 'success',
          response: analysisResult.explanation,
          finalCommand: aiResponse.command,
          finalResult: executionResult,
          iterations: this.currentIteration,
          history: this.executionHistory
        };
      }

      // Il risultato non è soddisfacente, continua a iterare
      console.log(`Iteration ${this.currentIteration} not successful: ${analysisResult.reason}`);
      
      if (this.currentIteration >= this.maxIterations) {
        return {
          type: 'max_iterations',
          response: `Raggiunto il limite di ${this.maxIterations} tentativi. Ultimo risultato:`,
          finalResult: executionResult,
          iterations: this.currentIteration,
          history: this.executionHistory
        };
      }
    }
  }

  buildContextualPrompt(originalPrompt, terminalContext, executionHistory) {
    const aliasEnrichment = pathAlias.enrichPromptWithAliasInfo(originalPrompt);
    let prompt = `Richiesta originale dell'utente: "${aliasEnrichment.prompt}"\n`;
    if (aliasEnrichment.note) {
      prompt += `${aliasEnrichment.note}\n`;
    }
    prompt += `\n`;
    // Aggiungi informazioni di sistema e percorsi utili
    try {
      prompt += `Informazioni di sistema:\n` +
        `- Piattaforma: ${systemInfo.platform}\n` +
        `- Tipo OS: ${systemInfo.type}\n` +
        `- Versione: ${systemInfo.release}\n` +
        `- Architettura: ${systemInfo.arch}\n` +
        `- Home directory: ${systemInfo.homeDir}\n` +
        `- Directory Desktop reale (filesystem): ${systemInfo.desktopDir}\n` +
        `- Directory Documenti reale: ${systemInfo.documentsDir}\n` +
        `Nota: su macOS in lingua italiana il Finder mostra "Scrivania" ma il path reale è "Desktop". Usa sempre il path reale del filesystem.\n\n`;
  prompt += `Mappa alias directory disponibile (solo riferimento):\n${pathAlias.buildAliasMappingList()}\n\n`;
    } catch (_) {}
    
    if (terminalContext.length > 0) {
      prompt += `Contesto del terminale corrente:\n${terminalContext.join('\n')}\n\n`;
    }

    if (executionHistory.length > 0) {
      prompt += `Cronologia dei tentativi precedenti:\n`;
      executionHistory.forEach((entry, index) => {
        prompt += `Tentativo ${entry.iteration}:\n`;
        prompt += `  Comando: ${entry.command}\n`;
        prompt += `  Ragionamento: ${entry.reasoning}\n`;
        prompt += `  Risultato: ${entry.result.output.substring(0, 200)}${entry.result.output.length > 200 ? '...' : ''}\n`;
        prompt += `  Successo: ${entry.result.success ? 'Sì' : 'No'}\n\n`;
      });
    }

    return prompt;
  }

  async getAIDecision(contextualPrompt, originalUserPrompt = null) {
    const decisionPrompt = `${contextualPrompt}

Analizza la richiesta e determina se è necessario eseguire un comando o se è una richiesta informativa.

Se è necessario un comando, fornisci la risposta in questo formato JSON:
{
  "requiresCommand": true,
  "command": "il comando da eseguire",
  "response": "spiegazione di cosa fa il comando e perché lo hai scelto",
  "expectedOutcome": "descrizione del risultato atteso"
}

Se è una richiesta informativa, fornisci:
{
  "requiresCommand": false,
  "response": "la risposta informativa completa"
}

Considera la cronologia dei tentativi precedenti per evitare di ripetere comandi che non hanno funzionato.
Sistema operativo: macOS (comandi Unix/bash compatibili).
Ricorda: se l'utente chiede percorsi come "Scrivania" (mac italiano) usa il path reale ${systemInfo.desktopDir}. Evita di ricreare cartelle se esistono già: in caso esista fornisci messaggio che esiste e NON considerare l'errore critico.
Se l'utente menziona alias di directory (es. scrivania, documenti, immagini, downloads, musica, film, fotos, immagini) mappa l'alias al path reale prima di proporre il comando. Non proporre mai un comando con alias linguistici non reali nel filesystem.
Fornisci SOLO il JSON, senza testo aggiuntivo.`;

    const response = await aiManager.request(decisionPrompt, [], originalUserPrompt);
    
    try {
      // Estrai JSON dalla risposta
      let jsonText = response.trim();
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Error parsing AI decision:', error);
      
      // Fallback intelligente basato sul prompt originale
      const lowerPrompt = (originalUserPrompt || '').toLowerCase();
      
      // Se la richiesta contiene parole che suggeriscono un comando, prova a generare una risposta di fallback
      if (lowerPrompt.includes('crea') || lowerPrompt.includes('cancella') || lowerPrompt.includes('elimina') || 
          lowerPrompt.includes('trova') || lowerPrompt.includes('installa') || lowerPrompt.includes('configura')) {
        
        // Genera un comando di fallback basato sul contesto
        let fallbackCommand = '';
        let fallbackResponse = '';
        
        if (lowerPrompt.includes('cartella') || lowerPrompt.includes('directory')) {
          // Estrai il nome della cartella dal prompt se presente
          const nameMatch = lowerPrompt.match(/chiama[ta]?\s+(\w+)|nome\s+(\w+)|chiamata\s+(\w+)|test(\d+)/);
          const folderName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4]) : 'test1';
          
          if (lowerPrompt.includes('desktop') || lowerPrompt.includes('scrivania')) {
            fallbackCommand = `mkdir -p ~/Desktop/${folderName}`;
            fallbackResponse = `Creo una cartella chiamata "${folderName}" sul desktop. Se la cartella esiste già, non sarà un problema.`;
          } else {
            fallbackCommand = `mkdir -p ${folderName}`;
            fallbackResponse = `Creo una cartella chiamata "${folderName}" nella directory corrente.`;
          }
        } else if (lowerPrompt.includes('file')) {
          fallbackCommand = 'touch test.txt';
          fallbackResponse = 'Creo un file di test nella directory corrente.';
        } else if (lowerPrompt.includes('elenca') || lowerPrompt.includes('mostra')) {
          fallbackCommand = 'ls -la';
          fallbackResponse = 'Elencherò tutti i file e le cartelle nella directory corrente.';
        }
        
        if (fallbackCommand) {
          return {
            requiresCommand: true,
            command: fallbackCommand,
            response: fallbackResponse,
            expectedOutcome: "Esecuzione del comando di fallback"
          };
        }
      }
      
      // Fallback generico per richieste informativi
      return {
        requiresCommand: false,
        response: "Mi dispiace, sto avendo problemi di connessione con il servizio AI. Prova a riavviare l'applicazione o riprova più tardi."
      };
    }
  }

  async executeCommand(command) {
    console.log(`Executing command: ${command}`);
    
    // Questo sarà sovrascritto da setCommandExecutor
    return {
      success: false,
      output: 'Command executor not configured',
      exitCode: 1,
      command: command
    };
  }

  async analyzeResult(originalPrompt, command, executionResult, originalUserPrompt = null) {
    const analysisPrompt = `Analizza se il risultato di questo comando soddisfa la richiesta originale dell'utente.

Richiesta originale: "${originalPrompt}"
Comando eseguito: "${command}"
Risultato del comando:
- Successo: ${executionResult.success}
- Output: ${executionResult.output}
- Exit code: ${executionResult.exitCode}

Determina se:
1. Il comando è stato eseguito correttamente
2. Il risultato soddisfa la richiesta originale
3. Se non soddisfa la richiesta, quale potrebbe essere il prossimo passo

Regola speciale: se l'output contiene messaggi come "File exists" per mkdir o cartelle già presenti, considera comunque l'obiettivo raggiunto se lo scopo era creare la cartella (perché esiste già). Indica che la cartella era già presente e non è un errore critico.

Rispondi in formato JSON:
{
  "isSuccessful": true/false,
  "reason": "spiegazione del risultato",
  "explanation": "spiegazione per l'utente del risultato ottenuto",
  "suggestedNextStep": "se non successful, cosa provare dopo (opzionale)"
}

Fornisci SOLO il JSON.`;

    const response = await aiManager.request(analysisPrompt, [], originalUserPrompt);
    
    try {
      let jsonText = response.trim();
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Error parsing analysis result:', error);
      return {
        isSuccessful: executionResult.success,
        reason: 'Could not analyze result',
        explanation: `Command ${executionResult.success ? 'completed' : 'failed'}: ${executionResult.output}`
      };
    }
  }

  // Metodo per collegare l'esecuzione reale dei comandi
  setCommandExecutor(executorFunction) {
    this.executeCommand = async (command) => {
      try {
        const result = await executorFunction(command);
        return {
          success: result.exitCode === 0 || result.success === true,
          output: result.output || result.stdout || result.stderr || '',
          exitCode: result.exitCode || (result.success ? 0 : 1),
          command: command
        };
      } catch (error) {
        return {
          success: false,
          output: error.message,
          exitCode: 1,
          command: command
        };
      }
    };
  }

  // Metodi di utilità
  isExecuting() {
    return this.isExecuting;
  }

  getCurrentIteration() {
    return this.currentIteration;
  }

  getExecutionHistory() {
    return [...this.executionHistory];
  }

  stopExecution() {
    this.isExecuting = false;
  }

  // Metodi per la gestione del webscraper
  async isWebServiceAvailable() {
    return await webAIIntegration.isServiceAvailable();
  }

  getWebSearchStats() {
    return webAIIntegration.getSearchStats();
  }

  getWebSearchHistory() {
    return webAIIntegration.getSearchHistory();
  }

  clearWebSearchHistory() {
    return webAIIntegration.clearSearchHistory();
  }

  setWebSearchConfidenceThreshold(threshold) {
    return webAIIntegration.setConfidenceThreshold(threshold);
  }

  getWebSearchConfidenceThreshold() {
    return webAIIntegration.confidenceThreshold;
  }
}

module.exports = new AIAgent();
