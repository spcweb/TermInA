// Integrazione WebScraper con Agente AI
const webScraper = require('./webscraper-playwright');
const aiManager = require('./ai-manager');

class WebAIIntegration {
  constructor() {
    this.searchHistory = [];
    this.maxSearchHistory = 50;
    this.confidenceThreshold = 0.7; // Soglia di confidenza per decidere se cercare online
  }

  /**
   * Determina se una richiesta richiede ricerca su internet
   */
  async shouldSearchOnline(prompt, aiResponse, context = []) {
    try {
      const analysisPrompt = `Analizza questa richiesta dell'utente e determina se richiede informazioni che potrebbero non essere disponibili nella tua conoscenza attuale.

Richiesta utente: "${prompt}"
Risposta AI attuale: "${aiResponse}"

Considera questi fattori:
1. La richiesta riguarda eventi recenti o notizie attuali?
2. La richiesta chiede informazioni specifiche su prodotti, servizi o aziende?
3. La richiesta riguarda fatti o statistiche che potrebbero essere cambiate?
4. La richiesta riguarda informazioni locali o specifiche di un luogo?
5. La richiesta riguarda informazioni tecniche molto specifiche o aggiornate?
6. La richiesta riguarda prezzi, quotazioni, o dati di mercato?
7. La richiesta riguarda versioni software o aggiornamenti recenti?

Rispondi in formato JSON:
{
  "shouldSearch": true/false,
  "confidence": 0.0-1.0,
  "reason": "spiegazione della decisione",
  "searchQuery": "query ottimizzata per la ricerca (se shouldSearch=true)",
  "searchEngine": "google/bing/duckduckgo (se shouldSearch=true)",
  "maxResults": 3-10 (se shouldSearch=true)"
}

IMPORTANTE: Se la richiesta è in italiano, rispondi in italiano. Se è in inglese, rispondi in inglese.
Fornisci SOLO il JSON.`;

      const response = await aiManager.request(analysisPrompt, context, prompt);
      
      try {
        let jsonText = response.trim();
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }
        
        const analysis = JSON.parse(jsonText);
        
        // Aggiungi alla cronologia
        this.addToSearchHistory({
          prompt: prompt,
          shouldSearch: analysis.shouldSearch,
          confidence: analysis.confidence,
          reason: analysis.reason,
          timestamp: new Date().toISOString()
        });
        
        return analysis;
        
      } catch (error) {
        console.error('Error parsing search analysis:', error);
        return {
          shouldSearch: false,
          confidence: 0.0,
          reason: 'Errore nell\'analisi della richiesta',
          searchQuery: '',
          searchEngine: 'google',
          maxResults: 5
        };
      }
      
    } catch (error) {
      console.error('Error in shouldSearchOnline:', error);
      return {
        shouldSearch: false,
        confidence: 0.0,
        reason: 'Errore nella valutazione',
        searchQuery: '',
        searchEngine: 'google',
        maxResults: 5
      };
    }
  }

  /**
   * Esegue una ricerca web e integra i risultati con la risposta AI
   */
  async enhanceResponseWithWebSearch(prompt, originalAIResponse, searchAnalysis) {
    try {
      console.log(`WebAI: Ricerca web per "${searchAnalysis.searchQuery}"`);
      
      // Esegui la ricerca web
      const searchResults = await webScraper.searchWeb(
        searchAnalysis.searchQuery,
        searchAnalysis.searchEngine,
        searchAnalysis.maxResults
      );
      
      if (!searchResults.success) {
        console.warn('WebAI: Ricerca web fallita:', searchResults.error);
        return {
          enhanced: false,
          originalResponse: originalAIResponse,
          searchError: searchResults.error,
          reason: 'Ricerca web non riuscita'
        };
      }
      
      // Integra i risultati della ricerca con la risposta AI
      const enhancedResponse = await this.integrateSearchResults(
        prompt,
        originalAIResponse,
        searchResults
      );
      
      return {
        enhanced: true,
        originalResponse: originalAIResponse,
        enhancedResponse: enhancedResponse,
        searchResults: searchResults,
        searchQuery: searchAnalysis.searchQuery
      };
      
    } catch (error) {
      console.error('WebAI: Error enhancing response:', error);
      return {
        enhanced: false,
        originalResponse: originalAIResponse,
        searchError: error.message,
        reason: 'Errore durante l\'integrazione'
      };
    }
  }

  /**
   * Integra i risultati della ricerca web con la risposta AI
   */
  async integrateSearchResults(prompt, originalAIResponse, searchResults) {
    try {
      const integrationPrompt = `Integra queste informazioni trovate su internet con la tua risposta originale per fornire una risposta completa e aggiornata.

Richiesta originale dell'utente: "${prompt}"
Risposta AI originale: "${originalAIResponse}"

Informazioni trovate su internet:
${searchResults.summary}

Istruzioni:
1. Mantieni la tua risposta originale se è corretta
2. Aggiungi o correggi informazioni basate sui risultati web
3. Cita le fonti quando appropriato
4. Mantieni un tono professionale e informativo
5. Se ci sono contraddizioni, spiega le differenze
6. Fornisci una risposta finale integrata e completa
7. IMPORTANTE: Rispondi nella stessa lingua della richiesta originale dell'utente

Risposta integrata:`;

      const integratedResponse = await aiManager.request(integrationPrompt, [], prompt);
      
      return integratedResponse.trim();
      
    } catch (error) {
      console.error('WebAI: Error integrating search results:', error);
      return `${originalAIResponse}\n\n[Informazioni aggiuntive trovate su internet: ${searchResults.summary}]`;
    }
  }

  /**
   * Processa una richiesta completa con integrazione web
   */
  async processRequestWithWebIntegration(prompt, context = [], autoExecute = false) {
    try {
      console.log('WebAI: Processamento richiesta con integrazione web');
      
      // Prima, ottieni una risposta dall'AI
      const initialPrompt = `Rispondi a questa richiesta dell'utente: "${prompt}"

Se non hai informazioni sufficienti o se le informazioni potrebbero essere obsolete, indica chiaramente i limiti della tua conoscenza.

IMPORTANTE: Rispondi nella stessa lingua della richiesta originale dell'utente.

Risposta:`;
      
      const initialAIResponse = await aiManager.request(initialPrompt, context, prompt);
      
      // Analizza se serve una ricerca web
      const searchAnalysis = await this.shouldSearchOnline(prompt, initialAIResponse, context);
      
      if (searchAnalysis.shouldSearch && searchAnalysis.confidence >= this.confidenceThreshold) {
        console.log(`WebAI: Ricerca web richiesta (confidenza: ${searchAnalysis.confidence})`);
        
        // Esegui la ricerca web e integra i risultati
        const enhancedResult = await this.enhanceResponseWithWebSearch(
          prompt,
          initialAIResponse,
          searchAnalysis
        );
        
        if (enhancedResult.enhanced) {
          return {
            type: 'web_enhanced',
            originalResponse: enhancedResult.originalResponse,
            enhancedResponse: enhancedResult.enhancedResponse,
            searchQuery: enhancedResult.searchQuery,
            searchResults: enhancedResult.searchResults,
            confidence: searchAnalysis.confidence,
            reason: searchAnalysis.reason
          };
        } else {
          // Fallback alla risposta originale se l'integrazione fallisce
          return {
            type: 'fallback',
            response: enhancedResult.originalResponse,
            searchError: enhancedResult.searchError,
            reason: enhancedResult.reason
          };
        }
      } else {
        // Nessuna ricerca web necessaria
        return {
          type: 'local_only',
          response: initialAIResponse,
          confidence: searchAnalysis.confidence,
          reason: searchAnalysis.reason
        };
      }
      
    } catch (error) {
      console.error('WebAI: Error in processRequestWithWebIntegration:', error);
      throw error;
    }
  }

  /**
   * Aggiunge una ricerca alla cronologia
   */
  addToSearchHistory(searchEntry) {
    this.searchHistory.push(searchEntry);
    
    // Mantieni solo le ultime N ricerche
    if (this.searchHistory.length > this.maxSearchHistory) {
      this.searchHistory = this.searchHistory.slice(-this.maxSearchHistory);
    }
  }

  /**
   * Ottiene la cronologia delle ricerche
   */
  getSearchHistory() {
    return [...this.searchHistory];
  }

  /**
   * Pulisce la cronologia delle ricerche
   */
  clearSearchHistory() {
    this.searchHistory = [];
  }

  /**
   * Ottiene statistiche sulle ricerche
   */
  getSearchStats() {
    if (this.searchHistory.length === 0) {
      return {
        totalSearches: 0,
        searchesPerformed: 0,
        averageConfidence: 0,
        mostCommonReasons: []
      };
    }
    
    const searchesPerformed = this.searchHistory.filter(entry => entry.shouldSearch).length;
    const totalConfidence = this.searchHistory.reduce((sum, entry) => sum + entry.confidence, 0);
    const averageConfidence = totalConfidence / this.searchHistory.length;
    
    // Analizza le ragioni più comuni
    const reasonCounts = {};
    this.searchHistory.forEach(entry => {
      const reason = entry.reason || 'N/A';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    
    const mostCommonReasons = Object.entries(reasonCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));
    
    return {
      totalSearches: this.searchHistory.length,
      searchesPerformed: searchesPerformed,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      mostCommonReasons: mostCommonReasons
    };
  }

  /**
   * Configura la soglia di confidenza
   */
  setConfidenceThreshold(threshold) {
    if (threshold >= 0 && threshold <= 1) {
      this.confidenceThreshold = threshold;
      return true;
    }
    return false;
  }

  /**
   * Verifica se il servizio è disponibile
   */
  async isServiceAvailable() {
    try {
      // Test di connettività semplice
      const testResult = await webScraper.searchWeb('test', 'google', 1);
      return testResult.success || testResult.error !== 'Nessun risultato trovato';
    } catch (error) {
      return false;
    }
  }
}

module.exports = new WebAIIntegration();
