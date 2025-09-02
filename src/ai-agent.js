// Agente AI avanzato con capacità di iterazione e esecuzione automatica
const aiManager = require('./ai-manager');

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
}

module.exports = new AIAgent();
