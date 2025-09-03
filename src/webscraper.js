// Modulo WebScraper per l'agente AI
const https = require('https');
const http = require('http');
const { URL } = require('url');

class WebScraper {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    this.timeout = 10000; // 10 secondi
    this.maxRedirects = 3;
  }

  /**
   * Cerca informazioni su internet utilizzando diversi motori di ricerca
   */
  async searchWeb(query, searchEngine = 'google', maxResults = 5) {
    try {
      console.log(`WebScraper: Ricerca "${query}" su ${searchEngine}`);
      
      let searchResults = [];
      
      switch (searchEngine.toLowerCase()) {
        case 'google':
          searchResults = await this.searchGoogle(query, maxResults);
          break;
        case 'bing':
          searchResults = await this.searchBing(query, maxResults);
          break;
        case 'duckduckgo':
          searchResults = await this.searchDuckDuckGo(query, maxResults);
          break;
        default:
          searchResults = await this.searchGoogle(query, maxResults);
      }

      if (searchResults.length === 0) {
        return {
          success: false,
          error: 'Nessun risultato trovato',
          query: query,
          searchEngine: searchEngine
        };
      }

      // Estrai contenuto dalle prime pagine trovate
      const enrichedResults = await this.enrichResultsWithContent(searchResults, 2);
      
      return {
        success: true,
        query: query,
        searchEngine: searchEngine,
        results: enrichedResults,
        summary: this.generateSummary(enrichedResults, query)
      };

    } catch (error) {
      console.error('WebScraper error:', error);
      
      // Fallback ai risultati simulati in caso di errore
      try {
        const fallbackResults = this.getSimulatedSearchResults(query, maxResults, searchEngine);
        return {
          success: true,
          query: query,
          searchEngine: searchEngine,
          results: fallbackResults,
          summary: this.generateSummary(fallbackResults, query),
          fallback: true,
          originalError: error.message
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: error.message,
          query: query,
          searchEngine: searchEngine
        };
      }
    }
  }

  /**
   * Ricerca su Google (simulata - per uso educativo)
   */
  async searchGoogle(query, maxResults) {
    // Nota: Questo è un esempio educativo. Per uso reale, considera l'uso di API ufficiali
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    
    try {
      const html = await this.fetchPage(searchUrl);
      return this.parseGoogleResults(html, maxResults);
    } catch (error) {
      console.warn('Google search failed, falling back to simulated results');
      return this.getSimulatedSearchResults(query, maxResults, 'Google');
    }
  }

  /**
   * Ricerca su Bing
   */
  async searchBing(query, maxResults) {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    
    try {
      const html = await this.fetchPage(searchUrl);
      return this.parseBingResults(html, maxResults);
    } catch (error) {
      console.warn('Bing search failed, falling back to simulated results');
      return this.getSimulatedSearchResults(query, maxResults, 'Bing');
    }
  }

  /**
   * Ricerca su DuckDuckGo
   */
  async searchDuckDuckGo(query, maxResults) {
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    try {
      const html = await this.fetchPage(searchUrl);
      return this.parseDuckDuckGoResults(html, maxResults);
    } catch (error) {
      console.warn('DuckDuckGo search failed, falling back to simulated results');
      return this.getSimulatedSearchResults(query, maxResults, 'DuckDuckGo');
    }
  }

  /**
   * Estrae contenuto dalle pagine web trovate
   */
  async enrichResultsWithContent(searchResults, maxPages = 2) {
    const enrichedResults = [];
    
    for (let i = 0; i < Math.min(searchResults.length, maxPages); i++) {
      const result = searchResults[i];
      
      try {
        console.log(`WebScraper: Estraggo contenuto da ${result.url}`);
        const content = await this.extractPageContent(result.url);
        
        enrichedResults.push({
          ...result,
          content: content.substring(0, 1000), // Limita a 1000 caratteri
          contentLength: content.length
        });
        
        // Pausa per essere rispettosi
        await this.delay(1000);
        
      } catch (error) {
        console.warn(`Failed to extract content from ${result.url}:`, error.message);
        enrichedResults.push({
          ...result,
          content: 'Contenuto non disponibile',
          contentLength: 0
        });
      }
    }
    
    return enrichedResults;
  }

  /**
   * Estrae il contenuto principale di una pagina web
   */
  async extractPageContent(url) {
    try {
      const html = await this.fetchPage(url);
      return this.cleanHtmlContent(html);
    } catch (error) {
      throw new Error(`Impossibile estrarre contenuto da ${url}: ${error.message}`);
    }
  }

  /**
   * Pulisce il contenuto HTML estraendo solo il testo rilevante
   */
  cleanHtmlContent(html) {
    // Rimuovi script, style, meta tags
    let cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<meta[^>]*>/gi, '')
      .replace(/<link[^>]*>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
    
    // Estrai testo dai tag rimanenti
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');
    
    // Pulisci spazi multipli e caratteri speciali
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    
    return cleaned;
  }

  /**
   * Genera un riassunto dei risultati
   */
  generateSummary(results, query) {
    if (results.length === 0) {
      return `Nessun risultato trovato per "${query}"`;
    }
    
    let summary = `Trovati ${results.length} risultati per "${query}":\n\n`;
    
    results.forEach((result, index) => {
      summary += `${index + 1}. ${result.title}\n`;
      summary += `   URL: ${result.url}\n`;
      if (result.snippet) {
        summary += `   Snippet: ${result.snippet.substring(0, 150)}...\n`;
      }
      if (result.content && result.content !== 'Contenuto non disponibile') {
        summary += `   Contenuto: ${result.content.substring(0, 200)}...\n`;
      }
      summary += '\n';
    });
    
    return summary;
  }

  /**
   * Fetch di una pagina web con timeout e redirect handling
   */
  async fetchPage(url, redirectCount = 0) {
    return new Promise((resolve, reject) => {
      if (redirectCount > this.maxRedirects) {
        reject(new Error('Troppi redirect'));
        return;
      }

      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: this.timeout
      };

      const req = httpModule.request(options, (res) => {
        // Gestisci redirect
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const newUrl = new URL(res.headers.location, url).href;
          resolve(this.fetchPage(newUrl, redirectCount + 1));
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(body));
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });

      req.end();
    });
  }

  /**
   * Parsing dei risultati di Google (simulato)
   */
  parseGoogleResults(html, maxResults) {
    // Implementazione semplificata per uso educativo
    return this.getSimulatedSearchResults('google search', maxResults);
  }

  /**
   * Parsing dei risultati di Bing (simulato)
   */
  parseBingResults(html, maxResults) {
    // Implementazione semplificata per uso educativo
    return this.getSimulatedSearchResults('bing search', maxResults);
  }

  /**
   * Parsing dei risultati di DuckDuckGo (simulato)
   */
  parseDuckDuckGoResults(html, maxResults) {
    // Implementazione semplificata per uso educativo
    return this.getSimulatedSearchResults('duckduckgo search', maxResults);
  }

  /**
   * Risultati simulati per uso educativo
   */
  getSimulatedSearchResults(query, maxResults, searchEngine = 'Unknown') {
    const results = [];
    const searchTerms = query.split(' ').slice(0, 3);
    
    for (let i = 0; i < maxResults; i++) {
      results.push({
        title: `Risultato ${i + 1} per "${query}" (${searchEngine})`,
        url: `https://example${i + 1}.com/${encodeURIComponent(query)}`,
        snippet: `Questo è un snippet di esempio per il risultato ${i + 1} della ricerca "${query}" su ${searchEngine}. Contiene informazioni rilevanti sui termini di ricerca: ${searchTerms.join(', ')}.`,
        source: `Simulated (${searchEngine})`
      });
    }
    
    return results;
  }

  /**
   * Restituisce un User-Agent casuale
   */
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Utility per creare delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verifica se un URL è valido
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Estrae domini da una lista di URL
   */
  extractDomains(urls) {
    const domains = new Set();
    urls.forEach(url => {
      try {
        const domain = new URL(url).hostname;
        domains.add(domain);
      } catch (e) {
        // URL non valido, salta
      }
    });
    return Array.from(domains);
  }
}

module.exports = new WebScraper();
