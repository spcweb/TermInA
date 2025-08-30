// Agente AI avanzato con capacità di iterazione e esecuzione automatica
const aiManager = require('./ai-manager');
const languageDetector = require('./language-detector');

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
      const aiResponse = await this.getAIDecision(contextualPrompt);
      
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
        executionResult
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
    let prompt = `Richiesta originale dell'utente: "${originalPrompt}"\n\n`;
    
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

  extractOriginalPrompt(contextualPrompt) {
    // Estrae la richiesta originale dal prompt contestuale
    const match = contextualPrompt.match(/Richiesta originale dell'utente: "([^"]+)"/);
    if (match) {
      return match[1];
    }
    
    // Se non trova il pattern, restituisce il prompt completo
    return contextualPrompt;
  }

  async getAIDecision(contextualPrompt) {
    // Rileva il sistema operativo e i percorsi localizzati
    const osInfo = await this.getSystemInfo();
    
    // Rileva la lingua della richiesta originale
    const originalPrompt = this.extractOriginalPrompt(contextualPrompt);
    const languageInfo = languageDetector.detectLanguage(originalPrompt);
    
    // Aggiungi l'istruzione per rispondere nella lingua rilevata
    const languageInstruction = languageDetector.addLanguageInstruction('', languageInfo);
    
    const decisionPrompt = `${languageInstruction}${contextualPrompt}

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

IMPORTANTE - Informazioni sul sistema:
- Sistema operativo: ${osInfo.platform}
- Directory home: ${osInfo.homeDir}
- Directory Desktop/Scrivania: ${osInfo.desktopDir}
- Lingua del sistema: ${osInfo.language}
- Separatore di percorso: ${osInfo.pathSeparator}

Quando crei percorsi, usa sempre i percorsi corretti per questo sistema:
- Per la scrivania usa: ${osInfo.desktopDir}
- Per la home usa: ${osInfo.homeDir}
- Usa sempre il separatore di percorso corretto: ${osInfo.pathSeparator}

Considera la cronologia dei tentativi precedenti per evitare di ripetere comandi che non hanno funzionato.
Fornisci SOLO il JSON, senza testo aggiuntivo.`;

    const response = await aiManager.request(decisionPrompt);
    
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
      throw new Error('AI response format invalid');
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

  async analyzeResult(originalPrompt, command, executionResult) {
    // Rileva il sistema operativo per l'analisi
    const osInfo = await this.getSystemInfo();
    
    // Rileva la lingua della richiesta originale
    const languageInfo = languageDetector.detectLanguage(originalPrompt);
    const languageInstruction = languageDetector.addLanguageInstruction('', languageInfo);
    
    const analysisPrompt = `${languageInstruction}Analizza se il risultato di questo comando soddisfa la richiesta originale dell'utente.

Richiesta originale: "${originalPrompt}"
Comando eseguito: "${command}"
Risultato del comando:
- Successo: ${executionResult.success}
- Output: ${executionResult.output}
- Exit code: ${executionResult.exitCode}

Informazioni sul sistema:
- Sistema operativo: ${osInfo.platform}
- Directory home: ${osInfo.homeDir}
- Directory Desktop/Scrivania: ${osInfo.desktopDir}
- Lingua del sistema: ${osInfo.language}

Determina se:
1. Il comando è stato eseguito correttamente
2. Il risultato soddisfa la richiesta originale
3. Se non soddisfa la richiesta, quale potrebbe essere il prossimo passo
4. Se l'errore è dovuto a percorsi non corretti, suggerisci il percorso giusto

Rispondi in formato JSON:
{
  "isSuccessful": true/false,
  "reason": "spiegazione del risultato",
  "explanation": "spiegazione per l'utente del risultato ottenuto",
  "suggestedNextStep": "se non successful, cosa provare dopo (opzionale)"
}

Fornisci SOLO il JSON.`;

    const response = await aiManager.request(analysisPrompt);
    
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
  async getSystemInfo() {
    // Rileva informazioni del sistema per percorsi corretti
    const os = require('os');
    const path = require('path');
    const fs = require('fs').promises;
    
    const platform = os.platform();
    let homeDir = os.homedir();
    const language = process.env.LANG || process.env.LANGUAGE || 'en_US.UTF-8';
    const pathSeparator = path.sep;
    
    // Determina la directory della scrivania
    let desktopDir = '';
    try {
      // Prova prima i percorsi comuni per la scrivania
      const possibleDesktopPaths = [
        path.join(homeDir, 'Desktop'),
        path.join(homeDir, 'Scrivania'),
        path.join(homeDir, 'Escritorio'), // Spagnolo
        path.join(homeDir, 'Bureau'),      // Francese
        path.join(homeDir, 'Schreibtisch') // Tedesco
      ];
      
      for (const desktopPath of possibleDesktopPaths) {
        try {
          const stats = await fs.stat(desktopPath);
          if (stats.isDirectory()) {
            desktopDir = desktopPath;
            break;
          }
        } catch (e) {
          // Continua con il prossimo percorso
        }
      }
      
      // Se non trova nessuna directory, usa Desktop come fallback
      if (!desktopDir) {
        desktopDir = path.join(homeDir, 'Desktop');
      }
    } catch (error) {
      console.error('Error detecting desktop directory:', error);
      desktopDir = path.join(homeDir, 'Desktop');
    }
    
    // Gestione specifica per Windows
    let adjustedPathSeparator = pathSeparator;
    if (platform === 'win32') {
      adjustedPathSeparator = '\\';
      // Assicurati che i percorsi usino il separatore corretto per Windows
      homeDir = homeDir.replace(/\//g, '\\');
      desktopDir = desktopDir.replace(/\//g, '\\');
    }
    
    return {
      platform,
      homeDir,
      desktopDir,
      language,
      pathSeparator: adjustedPathSeparator
    };
  }

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
}

module.exports = new AIAgent();
