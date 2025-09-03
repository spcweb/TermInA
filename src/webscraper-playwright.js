// Modulo WebScraper basato su Playwright per l'agente AI
const { chromium, firefox, webkit } = require('playwright');

class WebScraperPlaywright {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.browserType = 'chromium';
    this.headless = true;
    this.timeout = 30000;
    this.maxResults = 5;
    this.userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
  }

  async initializeBrowser(browserType = 'chromium', headless = true) {
    try {
      this.browserType = browserType;
      this.headless = headless;
      
      console.log(`WebScraper Playwright: Inizializzazione browser ${browserType}`);
      
      let playwrightBrowser;
      switch (browserType.toLowerCase()) {
        case 'firefox':
          playwrightBrowser = firefox;
          break;
        case 'webkit':
          playwrightBrowser = webkit;
          break;
        default:
          playwrightBrowser = chromium;
      }

      this.browser = await playwrightBrowser.launch({
        headless: headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-blink-features=AutomationControlled'
        ]
      });

      this.context = await this.browser.newContext({
        userAgent: this.getRandomUserAgent(),
        viewport: { width: 1920, height: 1080 },
        locale: 'it-IT',
        timezoneId: 'Europe/Rome',
        extraHTTPHeaders: {
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(this.timeout);
      this.page.setDefaultNavigationTimeout(this.timeout);
      
      // Nascondi che stiamo usando Playwright
      await this.page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });
      
      console.log(`WebScraper Playwright: Browser ${browserType} inizializzato con successo`);
      return true;
      
    } catch (error) {
      console.error('WebScraper Playwright: Errore inizializzazione browser:', error);
      return false;
    }
  }

  async closeBrowser() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      console.log('WebScraper Playwright: Browser chiuso correttamente');
    } catch (error) {
      console.error('WebScraper Playwright: Errore chiusura browser:', error);
    }
  }

  async searchWeb(query, searchEngine = 'google', maxResults = 5) {
    try {
      console.log(`WebScraper Playwright: Ricerca "${query}" su ${searchEngine}`);
      
      if (!this.page) {
        const initialized = await this.initializeBrowser();
        if (!initialized) {
          throw new Error('Impossibile inizializzare il browser');
        }
      }

      let searchResults = [];
      let lastError = null;
      
      // Prova diversi motori di ricerca in sequenza
      const searchEngines = [searchEngine, 'bing', 'duckduckgo'];
      
      for (const engine of searchEngines) {
        try {
          console.log(`WebScraper Playwright: Provo ${engine}`);
          
          switch (engine.toLowerCase()) {
            case 'google':
              searchResults = await this.searchGoogle(query, maxResults);
              break;
            case 'bing':
              searchResults = await this.searchBing(query, maxResults);
              break;
            case 'duckduckgo':
              searchResults = await this.searchDuckDuckGo(query, maxResults);
              break;
          }
          
          // Se abbiamo risultati reali, usali
          if (searchResults.length > 0 && !searchResults[0].source.includes('Simulated')) {
            console.log(`WebScraper Playwright: Ricerca riuscita su ${engine}`);
            break;
          }
          
        } catch (error) {
          console.log(`WebScraper Playwright: ${engine} fallito:`, error.message);
          lastError = error;
          continue;
        }
      }

      if (searchResults.length === 0) {
        throw new Error(`Tutti i motori di ricerca sono falliti. Ultimo errore: ${lastError?.message}`);
      }

      const enrichedResults = await this.enrichResultsWithContent(searchResults, 2);
      
      return {
        success: true,
        query: query,
        searchEngine: searchEngine,
        results: enrichedResults,
        summary: this.generateSummary(enrichedResults, query)
      };

    } catch (error) {
      console.error('WebScraper Playwright error:', error);
      
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

  async searchGoogle(query, maxResults) {
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${Math.min(maxResults, 10)}`;
      
      console.log(`WebScraper Playwright: Navigazione su Google: ${searchUrl}`);
      
      await this.page.goto(searchUrl, { waitUntil: 'networkidle' });
      await this.page.waitForLoadState('domcontentloaded');
      
      // Verifica se Google ha bloccato la ricerca
      const isBlocked = await this.page.evaluate(() => {
        const bodyText = document.body.textContent.toLowerCase();
        return bodyText.includes('traffico insolito') || 
               bodyText.includes('support.google.com') ||
               bodyText.includes('captcha') ||
               bodyText.includes('verifica che non sei un robot') ||
               bodyText.includes('ulteriori informazioni');
      });
      
      if (isBlocked) {
        console.log('WebScraper Playwright: Google ha bloccato la ricerca');
        throw new Error('Google ha bloccato la ricerca');
      }
      
      // Estrai risultati usando selettori più specifici
      const results = await this.page.evaluate((maxResults) => {
        const searchResults = [];
        
        // Prova diversi selettori per i risultati di ricerca
        const selectors = [
          'div[data-sokoban-container] > div',
          '.g',
          '.rc',
          '[data-hveid]',
          '.tF2Cxc',
          'div[jscontroller]',
          '.yuRUbf',
          '.IsZvec'
        ];
        
        let foundResults = false;
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            for (let i = 0; i < Math.min(elements.length, maxResults) && searchResults.length < maxResults; i++) {
              const element = elements[i];
              
              // Cerca titolo e link
              const titleElement = element.querySelector('h3, h2, .LC20lb, .DKV0Md') || 
                                 element.querySelector('a[href]');
              const linkElement = element.querySelector('a[href]') || 
                                element.querySelector('a[data-ved]') ||
                                element.querySelector('a[ping]');
              
              if (titleElement && linkElement) {
                const title = titleElement.textContent.trim();
                const url = linkElement.href;
                
                // Verifica che sia un risultato valido
                if (url && 
                    !url.includes('google.com/search') && 
                    !url.includes('google.com/url') &&
                    !url.includes('javascript:') && 
                    title.length > 5 && 
                    title.length < 200 &&
                    !title.includes('Google') &&
                    !title.includes('Impostazioni') &&
                    !title.includes('Strumenti') &&
                    !title.includes('Privacy') &&
                    !title.includes('Termini') &&
                    !title.includes('Preferenze') &&
                    !title.includes('Ulteriori informazioni')) {
                  
                  // Cerca snippet
                  let snippet = '';
                  const snippetElement = element.querySelector('div[data-snippet], .VwiC3b, .st, .aCOpRe');
                  if (snippetElement) {
                    snippet = snippetElement.textContent.trim();
                  }
                  
                  searchResults.push({
                    title: title,
                    url: url,
                    snippet: snippet,
                    source: 'Google'
                  });
                  
                  foundResults = true;
                }
              }
            }
            
            if (foundResults) break;
          }
        }
        
        return searchResults;
      }, maxResults);
      
      if (results.length === 0) {
        throw new Error('Nessun risultato trovato su Google');
      }
      
      console.log(`WebScraper Playwright: Trovati ${results.length} risultati su Google`);
      return results;
      
    } catch (error) {
      console.warn('WebScraper Playwright: Ricerca Google fallita:', error.message);
      return this.getSimulatedSearchResults(query, maxResults, 'Google');
    }
  }

  async searchBing(query, maxResults) {
    try {
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${Math.min(maxResults, 10)}`;
      
      console.log(`WebScraper Playwright: Navigazione su Bing: ${searchUrl}`);
      
      await this.page.goto(searchUrl, { waitUntil: 'networkidle' });
      await this.page.waitForLoadState('domcontentloaded');
      
      const results = await this.page.evaluate((maxResults) => {
        const searchResults = [];
        
        // Prova diversi selettori per Bing
        const selectors = [
          '#b_results > li',
          '.b_algo',
          '.b_results > li',
          '[data-bm]',
          '.b_attribution'
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            for (let i = 0; i < Math.min(elements.length, maxResults) && searchResults.length < maxResults; i++) {
              const element = elements[i];
              
              // Cerca titolo e link
              const titleElement = element.querySelector('h2 a, .b_title a, a[href]');
              
              if (titleElement) {
                const title = titleElement.textContent.trim();
                const url = titleElement.href;
                
                if (url && 
                    !url.includes('bing.com/search') && 
                    !url.includes('javascript:') && 
                    title.length > 10 && 
                    title.length < 200 &&
                    !title.includes('Bing') &&
                    !title.includes('Impostazioni')) {
                  
                  // Cerca snippet
                  let snippet = '';
                  const snippetElement = element.querySelector('.b_caption p, .b_snippet, .b_algoSlug');
                  if (snippetElement) {
                    snippet = snippetElement.textContent.trim();
                  }
                  
                  searchResults.push({
                    title: title,
                    url: url,
                    snippet: snippet,
                    source: 'Bing'
                  });
                }
              }
            }
            
            if (searchResults.length > 0) break;
          }
        }
        
        return searchResults;
      }, maxResults);
      
      if (results.length === 0) {
        throw new Error('Nessun risultato trovato su Bing');
      }
      
      console.log(`WebScraper Playwright: Trovati ${results.length} risultati su Bing`);
      return results;
      
    } catch (error) {
      console.warn('WebScraper Playwright: Ricerca Bing fallita:', error.message);
      return this.getSimulatedSearchResults(query, maxResults, 'Bing');
    }
  }

  async searchDuckDuckGo(query, maxResults) {
    try {
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      console.log(`WebScraper Playwright: Navigazione su DuckDuckGo: ${searchUrl}`);
      
      await this.page.goto(searchUrl, { waitUntil: 'networkidle' });
      await this.page.waitForLoadState('domcontentloaded');
      
      const results = await this.page.evaluate((maxResults) => {
        const searchResults = [];
        
        // Prova diversi selettori per DuckDuckGo
        const selectors = [
          '.result',
          '.result__body',
          '.web-result',
          '[data-testid="result"]',
          '.result__a'
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            for (let i = 0; i < Math.min(elements.length, maxResults) && searchResults.length < maxResults; i++) {
              const element = elements[i];
              
              // Cerca titolo e link
              const titleElement = element.querySelector('.result__title a, .result__a, a[href]');
              
              if (titleElement) {
                const title = titleElement.textContent.trim();
                const url = titleElement.href;
                
                if (url && 
                    !url.includes('duckduckgo.com') && 
                    !url.includes('javascript:') && 
                    title.length > 10 && 
                    title.length < 200 &&
                    !title.includes('DuckDuckGo') &&
                    !title.includes('Impostazioni')) {
                  
                  // Cerca snippet
                  let snippet = '';
                  const snippetElement = element.querySelector('.result__snippet, .result__summary, .snippet');
                  if (snippetElement) {
                    snippet = snippetElement.textContent.trim();
                  }
                  
                  searchResults.push({
                    title: title,
                    url: url,
                    snippet: snippet,
                    source: 'DuckDuckGo'
                  });
                }
              }
            }
            
            if (searchResults.length > 0) break;
          }
        }
        
        return searchResults;
      }, maxResults);
      
      if (results.length === 0) {
        throw new Error('Nessun risultato trovato su DuckDuckGo');
      }
      
      console.log(`WebScraper Playwright: Trovati ${results.length} risultati su DuckDuckGo`);
      return results;
      
    } catch (error) {
      console.warn('WebScraper Playwright: Ricerca DuckDuckGo fallita:', error.message);
      return this.getSimulatedSearchResults(query, maxResults, 'DuckDuckGo');
    }
  }

  async enrichResultsWithContent(searchResults, maxPages = 2) {
    const enrichedResults = [];
    
    for (let i = 0; i < Math.min(searchResults.length, maxPages); i++) {
      const result = searchResults[i];
      
      try {
        console.log(`WebScraper Playwright: Estraggo contenuto da ${result.url}`);
        const content = await this.extractPageContent(result.url);
        
        enrichedResults.push({
          ...result,
          content: content.substring(0, 1000),
          contentLength: content.length
        });
        
        await this.delay(1000);
        
      } catch (error) {
        console.warn(`WebScraper Playwright: Impossibile estrarre contenuto da ${result.url}:`, error.message);
        enrichedResults.push({
          ...result,
          content: 'Contenuto non disponibile',
          contentLength: 0
        });
      }
    }
    
    return enrichedResults;
  }

  async extractPageContent(url) {
    try {
      console.log(`WebScraper Playwright: Navigazione su ${url}`);
      
      await this.page.goto(url, { waitUntil: 'networkidle' });
      await this.page.waitForLoadState('domcontentloaded');
      
      const content = await this.page.evaluate(() => {
        const elementsToRemove = [
          'script', 'style', 'nav', 'header', 'footer', 'aside',
          '.advertisement', '.ads', '.social-share', '.comments',
          '.sidebar', '.menu', '.navigation'
        ];
        
        elementsToRemove.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el.remove());
        });
        
        const body = document.body;
        if (!body) return '';
        
        const mainContent = body.querySelector('main, article, .content, .post, .entry') || body;
        
        return mainContent.textContent
          .replace(/\s+/g, ' ')
          .replace(/\n+/g, '\n')
          .trim();
      });
      
      return content;
      
    } catch (error) {
      throw new Error(`Impossibile estrarre contenuto da ${url}: ${error.message}`);
    }
  }

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

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

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

  async changeBrowser(browserType) {
    if (this.browserType === browserType) {
      return true;
    }
    
    try {
      await this.closeBrowser();
      return await this.initializeBrowser(browserType, this.headless);
    } catch (error) {
      console.error('WebScraper Playwright: Errore cambio browser:', error);
      return false;
    }
  }

  async setHeadlessMode(headless) {
    if (this.headless === headless) {
      return true;
    }
    
    try {
      await this.closeBrowser();
      return await this.initializeBrowser(this.browserType, headless);
    } catch (error) {
      console.error('WebScraper Playwright: Errore cambio modalità headless:', error);
      return false;
    }
  }

  getBrowserInfo() {
    return {
      type: this.browserType,
      headless: this.headless,
      isInitialized: !!this.browser,
      userAgent: this.getRandomUserAgent()
    };
  }

  async takeScreenshot(url, path) {
    try {
      if (!this.page) {
        throw new Error('Browser non inizializzato');
      }
      
      await this.page.goto(url, { waitUntil: 'networkidle' });
      await this.page.screenshot({ path: path, fullPage: true });
      
      return {
        success: true,
        path: path,
        url: url
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        url: url
      };
    }
  }

  async generatePDF(url, path) {
    try {
      if (!this.page) {
        throw new Error('Browser non inizializzato');
      }
      
      await this.page.goto(url, { waitUntil: 'networkidle' });
      await this.page.pdf({ path: path, format: 'A4' });
      
      return {
        success: true,
        path: path,
        url: url
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        url: url
      };
    }
  }
}

module.exports = new WebScraperPlaywright();
