/**
 * Sistema di Cronologia Comandi per TermInA
 * 
 * Questo modulo gestisce la cronologia dei comandi eseguiti,
 * permettendo all'AI di accedere al contesto precedente.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class CommandHistory {
    constructor() {
        this.historyFile = path.join(os.homedir(), '.termina', 'command-history.json');
        this.maxHistorySize = 1000;
        this.history = this.loadHistory();
        this.currentSession = {
            sessionId: this.generateSessionId(),
            startTime: new Date().toISOString(),
            commands: []
        };
    }

    /**
     * Genera un ID univoco per la sessione
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Carica la cronologia dal file
     */
    loadHistory() {
        try {
            // Crea la directory se non esiste
            const historyDir = path.dirname(this.historyFile);
            if (!fs.existsSync(historyDir)) {
                fs.mkdirSync(historyDir, { recursive: true });
            }

            if (fs.existsSync(this.historyFile)) {
                const data = fs.readFileSync(this.historyFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.warn('Errore nel caricamento della cronologia:', error.message);
        }

        return {
            sessions: [],
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Salva la cronologia nel file
     */
    saveHistory() {
        try {
            this.history.lastUpdated = new Date().toISOString();
            fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
        } catch (error) {
            console.error('Errore nel salvataggio della cronologia:', error.message);
        }
    }

    /**
     * Aggiunge un comando alla cronologia
     */
    addCommand(command, result, exitCode = 0, timestamp = null) {
        const commandEntry = {
            id: this.generateCommandId(),
            command: command,
            result: result,
            exitCode: exitCode,
            timestamp: timestamp || new Date().toISOString(),
            sessionId: this.currentSession.sessionId
        };

        this.currentSession.commands.push(commandEntry);

        // Salva ogni 10 comandi o quando la sessione finisce
        if (this.currentSession.commands.length % 10 === 0) {
            this.saveCurrentSession();
        }

        return commandEntry;
    }

    /**
     * Genera un ID univoco per il comando
     */
    generateCommandId() {
        return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Salva la sessione corrente nella cronologia
     */
    saveCurrentSession() {
        if (this.currentSession.commands.length > 0) {
            this.currentSession.endTime = new Date().toISOString();
            this.currentSession.totalCommands = this.currentSession.commands.length;
            
            this.history.sessions.push(this.currentSession);

            // Mantieni solo le ultime N sessioni
            if (this.history.sessions.length > 50) {
                this.history.sessions = this.history.sessions.slice(-50);
            }

            this.saveHistory();

            // Inizia una nuova sessione
            this.currentSession = {
                sessionId: this.generateSessionId(),
                startTime: new Date().toISOString(),
                commands: []
            };
        }
    }

    /**
     * Ottiene la cronologia recente
     */
    getRecentHistory(limit = 20) {
        const allCommands = [];
        
        // Aggiungi comandi dalla sessione corrente
        allCommands.push(...this.currentSession.commands);
        
        // Aggiungi comandi dalle sessioni precedenti
        for (const session of this.history.sessions.slice(-5)) {
            allCommands.push(...session.commands);
        }

        // Ordina per timestamp e limita
        return allCommands
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    /**
     * Ottiene il contesto per l'AI
     */
    getAIContext(limit = 10) {
        const recentCommands = this.getRecentHistory(limit);
        
        return {
            sessionId: this.currentSession.sessionId,
            totalCommands: this.currentSession.commands.length,
            recentCommands: recentCommands.map(cmd => ({
                command: cmd.command,
                result: cmd.result,
                exitCode: cmd.exitCode,
                timestamp: cmd.timestamp,
                success: cmd.exitCode === 0
            })),
            lastCommand: recentCommands[0] || null,
            contextSummary: this.generateContextSummary(recentCommands)
        };
    }

    /**
     * Genera un riassunto del contesto
     */
    generateContextSummary(commands) {
        if (commands.length === 0) {
            return "Nessun comando eseguito in precedenza";
        }

        const lastCommand = commands[0];
        const successCount = commands.filter(cmd => cmd.exitCode === 0).length;
        const errorCount = commands.length - successCount;

        return {
            lastCommand: lastCommand.command,
            lastResult: lastCommand.exitCode === 0 ? "successo" : "errore",
            lastExitCode: lastCommand.exitCode,
            recentSuccessRate: `${successCount}/${commands.length}`,
            hasErrors: errorCount > 0,
            errorCount: errorCount
        };
    }

    /**
     * Cerca comandi nella cronologia
     */
    searchCommands(query, limit = 10) {
        const allCommands = this.getRecentHistory(100);
        
        return allCommands
            .filter(cmd => 
                cmd.command.toLowerCase().includes(query.toLowerCase()) ||
                cmd.result.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, limit);
    }

    /**
     * Ottiene statistiche della cronologia
     */
    getStatistics() {
        const allCommands = this.getRecentHistory(1000);
        const successCount = allCommands.filter(cmd => cmd.exitCode === 0).length;
        const errorCount = allCommands.length - successCount;

        return {
            totalCommands: allCommands.length,
            successCount: successCount,
            errorCount: errorCount,
            successRate: allCommands.length > 0 ? (successCount / allCommands.length * 100).toFixed(1) : 0,
            mostUsedCommands: this.getMostUsedCommands(allCommands),
            recentErrors: allCommands.filter(cmd => cmd.exitCode !== 0).slice(0, 5)
        };
    }

    /**
     * Ottiene i comandi più utilizzati
     */
    getMostUsedCommands(commands) {
        const commandCounts = {};
        
        commands.forEach(cmd => {
            const baseCommand = cmd.command.split(' ')[0];
            commandCounts[baseCommand] = (commandCounts[baseCommand] || 0) + 1;
        });

        return Object.entries(commandCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([command, count]) => ({ command, count }));
    }

    /**
     * Pulisce la cronologia
     */
    clearHistory() {
        this.history = {
            sessions: [],
            lastUpdated: new Date().toISOString()
        };
        this.currentSession = {
            sessionId: this.generateSessionId(),
            startTime: new Date().toISOString(),
            commands: []
        };
        this.saveHistory();
    }

    /**
     * Chiude la sessione corrente
     */
    closeSession() {
        this.saveCurrentSession();
    }
}

module.exports = CommandHistory;
