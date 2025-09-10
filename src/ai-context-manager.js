/**
 * Gestore del Context per l'AI di TermInA
 * 
 * Questo modulo gestisce il contesto dell'AI, permettendo di accedere
 * alla cronologia dei comandi e mantenere la memoria della sessione.
 */

const CommandHistory = require('./command-history');

class AIContextManager {
    constructor() {
        this.commandHistory = new CommandHistory();
        this.conversationContext = [];
        this.maxContextLength = 50;
    }

    /**
     * Aggiunge un comando alla cronologia e al contesto
     */
    addCommand(command, result, exitCode = 0) {
        // Aggiungi alla cronologia
        const commandEntry = this.commandHistory.addCommand(command, result, exitCode);
        
        // Aggiungi al contesto della conversazione
        this.addToConversationContext({
            type: 'command',
            command: command,
            result: result,
            exitCode: exitCode,
            timestamp: commandEntry.timestamp,
            success: exitCode === 0
        });

        return commandEntry;
    }

    /**
     * Aggiunge un messaggio al contesto della conversazione
     */
    addMessage(message, isUser = true) {
        this.addToConversationContext({
            type: 'message',
            content: message,
            isUser: isUser,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Aggiunge un elemento al contesto della conversazione
     */
    addToConversationContext(item) {
        this.conversationContext.push(item);
        
        // Mantieni solo gli ultimi N elementi
        if (this.conversationContext.length > this.maxContextLength) {
            this.conversationContext = this.conversationContext.slice(-this.maxContextLength);
        }
    }

    /**
     * Ottiene il contesto completo per l'AI
     */
    getFullContext() {
        const historyContext = this.commandHistory.getAIContext(15);
        const conversationContext = this.getConversationContext();
        
        return {
            commandHistory: historyContext,
            conversation: conversationContext,
            sessionInfo: {
                sessionId: this.commandHistory.currentSession.sessionId,
                startTime: this.commandHistory.currentSession.startTime,
                totalCommands: this.commandHistory.currentSession.commands.length
            },
            contextSummary: this.generateFullContextSummary(historyContext, conversationContext)
        };
    }

    /**
     * Ottiene il contesto della conversazione
     */
    getConversationContext() {
        return this.conversationContext.slice(-20); // Ultimi 20 elementi
    }

    /**
     * Genera un riassunto completo del contesto
     */
    generateFullContextSummary(historyContext, conversationContext) {
        const lastCommand = historyContext.lastCommand;
        const recentMessages = conversationContext.filter(item => item.type === 'message');
        
        return {
            hasRecentCommands: historyContext.recentCommands.length > 0,
            lastCommand: lastCommand ? {
                command: lastCommand.command,
                success: lastCommand.success,
                exitCode: lastCommand.exitCode
            } : null,
            recentActivity: {
                commands: historyContext.recentCommands.length,
                messages: recentMessages.length,
                lastActivity: this.getLastActivityTime()
            },
            contextAvailable: true
        };
    }

    /**
     * Ottiene l'ora dell'ultima attività
     */
    getLastActivityTime() {
        const allItems = [
            ...this.commandHistory.currentSession.commands,
            ...this.conversationContext
        ];

        if (allItems.length === 0) {
            return null;
        }

        return allItems
            .map(item => item.timestamp)
            .sort()
            .pop();
    }

    /**
     * Ottiene il contesto per una richiesta specifica
     */
    getContextForRequest(userMessage) {
        const fullContext = this.getFullContext();
        
        // Analizza il messaggio per determinare il contesto rilevante
        const relevantContext = this.extractRelevantContext(userMessage, fullContext);
        
        return {
            userMessage: userMessage,
            relevantContext: relevantContext,
            fullContext: fullContext,
            contextInstructions: this.generateContextInstructions(relevantContext)
        };
    }

    /**
     * Estrae il contesto rilevante per una richiesta specifica
     */
    extractRelevantContext(userMessage, fullContext) {
        const message = userMessage.toLowerCase();
        const relevant = {
            recentCommands: [],
            relatedCommands: [],
            errorContext: null,
            successContext: null
        };

        // Se l'utente chiede del comando precedente
        if (message.includes('comando') && (message.includes('prima') || message.includes('precedente'))) {
            relevant.recentCommands = fullContext.commandHistory.recentCommands.slice(0, 5);
        }

        // Se l'utente menziona un errore
        if (message.includes('errore') || message.includes('non va') || message.includes('fallisce')) {
            relevant.errorContext = fullContext.commandHistory.recentCommands
                .filter(cmd => !cmd.success)
                .slice(0, 3);
        }

        // Se l'utente chiede di un comando specifico
        const commandKeywords = ['sudo', 'ls', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'grep', 'find'];
        for (const keyword of commandKeywords) {
            if (message.includes(keyword)) {
                relevant.relatedCommands = fullContext.commandHistory.recentCommands
                    .filter(cmd => cmd.command.toLowerCase().includes(keyword))
                    .slice(0, 3);
                break;
            }
        }

        return relevant;
    }

    /**
     * Genera istruzioni per l'AI basate sul contesto
     */
    generateContextInstructions(relevantContext) {
        const instructions = [];

        if (relevantContext.recentCommands.length > 0) {
            instructions.push("L'utente ha eseguito comandi di recente. Usa questa cronologia per fornire risposte contestuali.");
        }

        if (relevantContext.errorContext && relevantContext.errorContext.length > 0) {
            instructions.push("Ci sono stati errori recenti. Analizza gli errori per fornire soluzioni specifiche.");
        }

        if (relevantContext.relatedCommands.length > 0) {
            instructions.push("L'utente ha usato comandi simili in precedenza. Riferisciti a questi per coerenza.");
        }

        return instructions;
    }

    /**
     * Formatta il contesto per l'AI
     */
    formatContextForAI(context) {
        let formatted = "=== CONTESTO SESSIONE ===\n";
        
        if (context.commandHistory.lastCommand) {
            formatted += `Ultimo comando: ${context.commandHistory.lastCommand.command}\n`;
            formatted += `Risultato: ${context.commandHistory.lastCommand.success ? 'SUCCESSO' : 'ERRORE'} (exit code: ${context.commandHistory.lastCommand.exitCode})\n`;
            formatted += `Timestamp: ${context.commandHistory.lastCommand.timestamp}\n\n`;
        }

        if (context.commandHistory.recentCommands.length > 0) {
            formatted += "=== CRONOLOGIA RECENTE ===\n";
            context.commandHistory.recentCommands.slice(0, 5).forEach((cmd, index) => {
                formatted += `${index + 1}. ${cmd.command}\n`;
                formatted += `   Risultato: ${cmd.success ? 'SUCCESSO' : 'ERRORE'} (${cmd.exitCode})\n`;
                if (cmd.result) {
                    formatted += `   Output: ${cmd.result.substring(0, 100)}${cmd.result.length > 100 ? '...' : ''}\n`;
                }
                formatted += `   Ora: ${cmd.timestamp}\n\n`;
            });
        }

        if (context.contextSummary.hasRecentCommands) {
            formatted += "=== RIASSUNTO CONTESTO ===\n";
            formatted += `Comandi eseguiti: ${context.contextSummary.recentActivity.commands}\n`;
            formatted += `Ultima attività: ${context.contextSummary.recentActivity.lastActivity}\n`;
        }

        return formatted;
    }

    /**
     * Pulisce il contesto
     */
    clearContext() {
        this.conversationContext = [];
        this.commandHistory.clearHistory();
    }

    /**
     * Chiude la sessione
     */
    closeSession() {
        this.commandHistory.closeSession();
    }
}

module.exports = AIContextManager;
