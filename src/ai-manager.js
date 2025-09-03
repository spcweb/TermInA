// Gestore AI per supportare diversi provider
const https = require('https');
const http = require('http');
const config = require('./config');
const LanguageDetector = require('./language-detector');

class AIManager {
  constructor() {
    this.providers = {
      gemini: this.geminiRequest.bind(this),
      'lm-studio': this.lmStudioRequest.bind(this),
      ollama: this.ollamaRequest.bind(this),
      openai: this.openaiRequest.bind(this)
    };
    this.languageDetector = new LanguageDetector();
  }

  async request(prompt, context = [], originalUserPrompt = null) {
    const aiConfig = config.getAIConfig();
    const provider = aiConfig.provider;
    
    if (!this.providers[provider]) {
      throw new Error(`Provider AI non supportato: ${provider}`);
    }
    
    try {
      // Rileva la lingua dalla domanda originale dell'utente, non dal prompt completo
      const textToAnalyze = originalUserPrompt || prompt;
      const detectedLanguage = this.languageDetector.detectLanguage(textToAnalyze);
      const languageInstruction = this.languageDetector.getLanguageInstruction(detectedLanguage);
      
      console.log(`Text analyzed for language: "${textToAnalyze}"`);
      console.log(`Detected language: ${detectedLanguage}`);
      console.log(`Language instruction: ${languageInstruction}`);
      
      // Aggiunge l'istruzione di lingua al prompt
      const enhancedPrompt = `${languageInstruction}\n\n${prompt}`;
      
      return await this.providers[provider](enhancedPrompt, context);
    } catch (error) {
      console.error(`Errore con provider ${provider}:`, error);
      throw error;
    }
  }

  async geminiRequest(prompt, context = []) {
    const aiConfig = config.getAIConfig();
    const { apiKey, model } = aiConfig.gemini;
    
    return new Promise((resolve, reject) => {
      const contextText = context.length > 0 ? 
        `\nContesto del terminale:\n${context.join('\n')}\n\n` : '';
      
      const fullPrompt = `${contextText}${prompt}`;
      
      const data = JSON.stringify({
        contents: [{ 
          parts: [{ text: fullPrompt }] 
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            console.log('Gemini API response:', body);
            const json = JSON.parse(body);
            console.log('Parsed JSON:', JSON.stringify(json, null, 2));
            
            if (json.candidates && json.candidates[0] && 
                json.candidates[0].content && 
                json.candidates[0].content.parts && 
                json.candidates[0].content.parts[0] && 
                json.candidates[0].content.parts[0].text) {
              resolve(json.candidates[0].content.parts[0].text);
            } else {
              console.error('Unexpected response structure:', json);
              resolve(`[AI] Nessuna risposta valida ricevuta. Debug: ${JSON.stringify(json)}`);
            }
          } catch (e) {
            console.error('JSON parse error:', e);
            console.error('Raw response:', body);
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  async lmStudioRequest(prompt, context = []) {
    const aiConfig = config.getAIConfig();
    const { endpoint, model, apiKey } = aiConfig.lmStudio;
    
    const url = new URL(endpoint + '/chat/completions');
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    return new Promise((resolve, reject) => {
      const messages = [];
      
      if (context.length > 0) {
        messages.push({
          role: 'system',
          content: `Sei un assistente AI integrato in un terminale. Contesto delle ultime operazioni:\n${context.join('\n')}`
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });
      
      const data = JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: false
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = httpModule.request(options, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.choices && json.choices[0] && json.choices[0].message) {
              resolve(json.choices[0].message.content);
            } else {
              resolve('[AI] Nessuna risposta valida ricevuta da LM Studio.');
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  async ollamaRequest(prompt, context = []) {
    const aiConfig = config.getAIConfig();
    const { endpoint, model, apiKey } = aiConfig.ollama;
    
    console.log(`Ollama request - Endpoint: ${endpoint}, Model: ${model}`);
    console.log(`Prompt: ${prompt.substring(0, 200)}...`);
    console.log(`Context length: ${context.length}`);
    
    // Determina i timeout in base al modello
    const isLargeModel = model.includes('llama3.1') || model.includes('llama3') || model.includes('8b') || model.includes('13b') || model.includes('70b') || model.includes('20b') || model.includes('gpt-oss');
    const timeout = isLargeModel ? 120000 : 30000; // 120s per modelli grandi (20b+), 30s per modelli piccoli
    
    console.log(`Using timeout: ${timeout}ms for model: ${model}`);
    
    // Prova prima l'endpoint /api/chat (versione più recente)
    let chatEndpoint = endpoint + '/api/chat';
    let generateEndpoint = endpoint + '/api/generate';
    
    const isHttps = endpoint.startsWith('https:');
    const httpModule = isHttps ? https : http;
    
    return new Promise(async (resolve, reject) => {
      try {
        // Prima prova con /api/chat
        console.log('Trying Ollama /api/chat endpoint...');
        let response = await this.tryOllamaEndpoint(chatEndpoint, model, prompt, context, apiKey, httpModule, timeout);
        if (response) {
          console.log('Ollama /api/chat success:', response.substring(0, 100));
          resolve(response);
          return;
        }
        
        // Se fallisce, prova con /api/generate (versione legacy)
        console.log('Ollama /api/chat failed, trying /api/generate...');
        response = await this.tryOllamaEndpoint(generateEndpoint, model, prompt, context, apiKey, httpModule, timeout);
        if (response) {
          console.log('Ollama /api/generate success:', response.substring(0, 100));
          resolve(response);
          return;
        }
        
        // Se entrambi falliscono, prova con formato semplice
        console.log('Ollama API endpoints failed, trying simple format...');
        response = await this.tryOllamaSimple(endpoint, model, prompt, context, apiKey, httpModule, timeout);
        if (response) {
          console.log('Ollama simple format success:', response.substring(0, 100));
          resolve(response);
          return;
        }
        
        console.error('All Ollama endpoints failed');
        reject(new Error('Tutti gli endpoint Ollama hanno fallito. Verifica che Ollama sia in esecuzione e il modello sia disponibile.'));
        
      } catch (error) {
        console.error('Ollama request error:', error);
        reject(error);
      }
    });
  }

  async tryOllamaEndpoint(endpoint, model, prompt, context, apiKey, httpModule, timeout) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint);
      const messages = [];
      
      if (context.length > 0) {
        messages.push({
          role: 'system',
          content: `Sei un assistente AI integrato in un terminale. Contesto delle ultime operazioni:\n${context.join('\n')}`
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });
      
      const data = JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2048
        }
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      if (apiKey) {
        options.headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const req = httpModule.request(options, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              console.log(`Ollama endpoint ${endpoint} ha restituito status ${res.statusCode}`);
              resolve(null);
              return;
            }
            
            const json = JSON.parse(body);
            
            // Gestisci diversi formati di risposta
            if (json.message && json.message.content) {
              resolve(json.message.content);
            } else if (json.response) {
              resolve(json.response);
            } else if (json.content) {
              resolve(json.content);
            } else if (json.choices && json.choices[0] && json.choices[0].message) {
              resolve(json.choices[0].message.content);
            } else {
              console.log(`Formato risposta Ollama non riconosciuto per ${endpoint}:`, json);
              resolve(null);
            }
          } catch (e) {
            console.log(`Errore parsing JSON per ${endpoint}:`, e.message);
            resolve(null);
          }
        });
      });

      req.on('error', (error) => {
        console.log(`Errore connessione per ${endpoint}:`, error.message);
        resolve(null);
      });
      
      req.setTimeout(timeout || 30000, () => {
        console.log(`Timeout per ${endpoint}`);
        req.destroy();
        resolve(null);
      });
      
      req.write(data);
      req.end();
    });
  }

  async tryOllamaSimple(endpoint, model, prompt, context, apiKey, httpModule, timeout) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint + '/api/generate');
      const fullPrompt = context.length > 0 ? 
        `Contesto: ${context.join('\n')}\n\nDomanda: ${prompt}` : prompt;
      
      const data = JSON.stringify({
        model: model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2048
        }
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      if (apiKey) {
        options.headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const req = httpModule.request(options, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              resolve(null);
              return;
            }
            
            const json = JSON.parse(body);
            if (json.response) {
              resolve(json.response);
            } else if (json.message && json.message.content) {
              resolve(json.message.content);
            } else if (json.content) {
              resolve(json.content);
            } else {
              console.log(`Formato risposta Ollama semplice non riconosciuto:`, json);
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null));
      req.setTimeout(timeout || 30000, () => {
        req.destroy();
        resolve(null);
      });
      
      req.write(data);
      req.end();
    });
  }

  async openaiRequest(prompt, context = []) {
    const aiConfig = config.getAIConfig();
    const { endpoint, model, apiKey } = aiConfig.openai;
    
    if (!apiKey) {
      throw new Error('API Key OpenAI non configurata');
    }
    
    return new Promise((resolve, reject) => {
      const messages = [];
      
      if (context.length > 0) {
        messages.push({
          role: 'system',
          content: `Sei un assistente AI integrato in un terminale. Contesto delle ultime operazioni:\n${context.join('\n')}`
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });
      
      const data = JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048
      });

      const options = {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.choices && json.choices[0] && json.choices[0].message) {
              resolve(json.choices[0].message.content);
            } else {
              resolve('[AI] Nessuna risposta valida ricevuta da OpenAI.');
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  getAvailableProviders() {
    return Object.keys(this.providers);
  }

  isProviderConfigured(provider) {
    const aiConfig = config.getAIConfig();
    
    switch (provider) {
      case 'gemini':
        return !!aiConfig.gemini.apiKey;
      case 'lm-studio':
        return !!aiConfig.lmStudio.endpoint;
      case 'ollama':
        return !!aiConfig.ollama.endpoint;
      case 'openai':
        return !!aiConfig.openai.apiKey;
      default:
        return false;
    }
  }
}

module.exports = new AIManager();
