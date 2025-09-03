#!/usr/bin/env node

/**
 * Esempio di utilizzo dell'integrazione web con l'agente AI
 * 
 * Questo file mostra come utilizzare le nuove funzionalità di webscraper
 * integrate con l'agente AI di Termina.
 */

const aiAgent = require('../src/ai-agent');
const webAIIntegration = require('../src/web-ai-integration');
const webScraper = require('../src/webscraper-playwright');

async function exampleBasicUsage() {
  console.log('=== Esempio: Utilizzo Base ===\n');
  
  try {
    // Esempio 1: Richiesta che probabilmente richiede informazioni web
    console.log('1. Richiesta con integrazione web automatica...');
    const result1 = await aiAgent.processRequestWithWeb(
      'Qual è il prezzo attuale di Bitcoin?',
      [],
      false
    );
    
    console.log('Tipo risultato:', result1.type);
    if (result1.type === 'web_enhanced') {
      console.log('✅ Risposta arricchita con informazioni web');
      console.log('Query di ricerca:', result1.searchQuery);
      console.log('Risposta:', result1.response.substring(0, 200) + '...');
    } else {
      console.log('ℹ️ Risposta basata su conoscenza locale');
      console.log('Risposta:', result1.response);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Esempio 2: Richiesta che non richiede informazioni web
    console.log('2. Richiesta che non richiede web...');
    const result2 = await aiAgent.processRequestWithWeb(
      'Come creo una cartella in terminale?',
      [],
      false
    );
    
    console.log('Tipo risultato:', result2.type);
    console.log('Risposta:', result2.response);
    
  } catch (error) {
    console.error('Errore nell\'esempio base:', error);
  }
}

async function exampleAdvancedUsage() {
  console.log('\n=== Esempio: Utilizzo Avanzato ===\n');
  
  try {
    // Esempio 1: Analisi manuale se serve ricerca web
    console.log('1. Analisi manuale per ricerca web...');
    const analysis = await webAIIntegration.shouldSearchOnline(
      'Qual è la versione più recente di Node.js?',
      'La versione più recente di Node.js è la 20.x',
      []
    );
    
    console.log('Analisi:', {
      shouldSearch: analysis.shouldSearch,
      confidence: analysis.confidence,
      reason: analysis.reason,
      searchQuery: analysis.searchQuery
    });
    
    // Esempio 2: Ricerca web diretta
    if (analysis.shouldSearch) {
      console.log('\n2. Ricerca web diretta...');
      const searchResults = await webScraper.searchWeb(
        analysis.searchQuery,
        analysis.searchEngine,
        analysis.maxResults
      );
      
      console.log('Risultati ricerca:', {
        success: searchResults.success,
        resultsCount: searchResults.results?.length,
        summary: searchResults.summary?.substring(0, 150) + '...'
      });
    }
    
    // Esempio 3: Integrazione manuale dei risultati
    console.log('\n3. Integrazione manuale risultati...');
    const enhanced = await webAIIntegration.enhanceResponseWithWebSearch(
      'Qual è la versione più recente di Node.js?',
      'La versione più recente di Node.js è la 20.x',
      analysis
    );
    
    if (enhanced.enhanced) {
      console.log('✅ Risposta integrata con successo');
      console.log('Risposta finale:', enhanced.enhancedResponse.substring(0, 200) + '...');
    } else {
      console.log('⚠️ Integrazione fallita:', enhanced.reason);
    }
    
  } catch (error) {
    console.error('Errore nell\'esempio avanzato:', error);
  }
}

async function exampleConfiguration() {
  console.log('\n=== Esempio: Configurazione ===\n');
  
  try {
    // Esempio 1: Verifica configurazione attuale
    console.log('1. Configurazione attuale...');
    const currentThreshold = aiAgent.getWebSearchConfidenceThreshold();
    console.log('Soglia confidenza attuale:', currentThreshold);
    
    // Esempio 2: Modifica configurazione
    console.log('\n2. Modifica configurazione...');
    const newThreshold = 0.6;
    const success = aiAgent.setWebSearchConfidenceThreshold(newThreshold);
    console.log(`Impostazione soglia ${newThreshold}:`, success ? '✅ Riuscita' : '❌ Fallita');
    
    // Esempio 3: Statistiche
    console.log('\n3. Statistiche utilizzo...');
    const stats = aiAgent.getWebSearchStats();
    console.log('Statistiche:', {
      totalSearches: stats.totalSearches,
      searchesPerformed: stats.searchesPerformed,
      averageConfidence: stats.averageConfidence
    });
    
    // Esempio 4: Cronologia
    console.log('\n4. Cronologia ricerche...');
    const history = aiAgent.getWebSearchHistory();
    console.log('Ultime ricerche:', history.slice(-3).map(h => ({
      prompt: h.prompt.substring(0, 30) + '...',
      shouldSearch: h.shouldSearch,
      confidence: h.confidence,
      timestamp: h.timestamp
    })));
    
  } catch (error) {
    console.error('Errore nell\'esempio configurazione:', error);
  }
}

async function exampleErrorHandling() {
  console.log('\n=== Esempio: Gestione Errori ===\n');
  
  try {
    // Esempio 1: Verifica disponibilità servizio
    console.log('1. Verifica disponibilità servizio...');
    const isAvailable = await aiAgent.isWebServiceAvailable();
    console.log('Servizio web disponibile:', isAvailable ? '✅ Sì' : '❌ No');
    
    // Esempio 2: Test con URL non valido
    console.log('\n2. Test con URL non valido...');
    const isValid = webScraper.isValidUrl('not-a-valid-url');
    console.log('URL valido:', isValid ? '✅ Sì' : '❌ No');
    
    // Esempio 3: Gestione timeout
    console.log('\n3. Test gestione timeout...');
    try {
      // Questo potrebbe fallire se la connessione è lenta
      const timeoutTest = await webScraper.searchWeb('test', 'google', 1);
      console.log('Test timeout:', timeoutTest.success ? '✅ Riuscito' : '❌ Fallito');
    } catch (error) {
      console.log('Test timeout fallito (previsto):', error.message);
    }
    
  } catch (error) {
    console.error('Errore nell\'esempio gestione errori:', error);
  }
}

async function runAllExamples() {
  console.log('🚀 Avvio esempi di integrazione web con AI\n');
  
  try {
    await exampleBasicUsage();
    await exampleAdvancedUsage();
    await exampleConfiguration();
    await exampleErrorHandling();
    
    console.log('\n✅ Tutti gli esempi completati con successo!');
    console.log('\n💡 Suggerimenti:');
    console.log('- Usa processRequestWithWeb() per richieste che potrebbero richiedere info aggiornate');
    console.log('- Configura la soglia di confidenza in base alle tue esigenze');
    console.log('- Monitora le statistiche per ottimizzare l\'utilizzo');
    console.log('- Gestisci gli errori per una migliore esperienza utente');
    
  } catch (error) {
    console.error('\n❌ Errore durante l\'esecuzione degli esempi:', error);
  }
}

// Esegui gli esempi se il file viene chiamato direttamente
if (require.main === module) {
  runAllExamples().catch(console.error);
}

module.exports = {
  exampleBasicUsage,
  exampleAdvancedUsage,
  exampleConfiguration,
  exampleErrorHandling,
  runAllExamples
};

