// Gestore AI per supportare diversi provider
const https = require('https');
const http = require('http');
const config = require('./config');

class AIManager {
  constructor() {
    this.providers = {
      gemini: this.geminiRequest.bind(this),
      'lm-studio': this.lmStudioRequest.bind(this),
      openai: this.openaiRequest.bind(this)
    };
  }

  async request(prompt, context = []) {
    const aiConfig = config.getAIConfig();
    const provider = aiConfig.provider;
    
    if (!this.providers[provider]) {
      throw new Error(`Provider AI non supportato: ${provider}`);
    }
    
    try {
      return await this.providers[provider](prompt, context);
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
      case 'openai':
        return !!aiConfig.openai.apiKey;
      default:
        return false;
    }
  }
}

module.exports = new AIManager();
