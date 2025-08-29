// Sistema di configurazione per Termina
const fs = require('fs');
const path = require('path');
const os = require('os');

class Config {
  constructor() {
    this.configDir = path.join(os.homedir(), '.termina');
    this.configFile = path.join(this.configDir, 'config.json');
    this.defaultConfig = {
      theme: {
        name: 'warp-dark',
        background: '#1e2124',
        backgroundBlur: true,
        foreground: '#ffffff',
        cursor: '#00d4aa',
        selection: '#264f78',
        accent: '#00d4aa',
        border: '#36393f',
        tabBackground: '#2f3136',
        tabActive: '#36393f'
      },
      terminal: {
        fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
        fontSize: 14,
        lineHeight: 1.4,
        cursorBlink: true,
        cursorStyle: 'bar',
        scrollback: 10000,
        bellSound: false
      },
      ai: {
        provider: 'gemini', // 'gemini', 'lm-studio', 'openai'
        gemini: {
          apiKey: '',
          model: 'gemini-2.5-flash'
        },
        lmStudio: {
          endpoint: 'http://localhost:1234/v1',
          model: 'local-model',
          apiKey: 'lm-studio'
        },
        openai: {
          apiKey: '',
          model: 'gpt-3.5-turbo',
          endpoint: 'https://api.openai.com/v1'
        },
        autoExecute: false,
        contextLines: 10
      },
      window: {
        width: 1200,
        height: 800,
        titleBarStyle: 'hiddenInset',
        vibrancy: 'dark',
        transparency: true,
        frame: false
      },
      shortcuts: {
        toggleAI: 'Cmd+Shift+A',
        newTab: 'Cmd+T',
        closeTab: 'Cmd+W',
        settings: 'Cmd+,',
        clearTerminal: 'Cmd+K'
      }
    };
    
    this.config = this.loadConfig();
  }

  ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  loadConfig() {
    this.ensureConfigDir();
    
    if (fs.existsSync(this.configFile)) {
      try {
        const configData = fs.readFileSync(this.configFile, 'utf8');
        const config = JSON.parse(configData);
        return { ...this.defaultConfig, ...config };
      } catch (error) {
        console.error('Errore nel caricamento della configurazione:', error);
        return this.defaultConfig;
      }
    }
    
    return this.defaultConfig;
  }

  saveConfig() {
    this.ensureConfigDir();
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error('Errore nel salvataggio della configurazione:', error);
      return false;
    }
  }

  get(key) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  set(key, value) {
    const keys = key.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
    return this.saveConfig();
  }

  getTheme() {
    return this.get('theme');
  }

  getAIConfig() {
    return this.get('ai');
  }

  getTerminalConfig() {
    return this.get('terminal');
  }

  getWindowConfig() {
    return this.get('window');
  }

  resetToDefaults() {
    this.config = { ...this.defaultConfig };
    return this.saveConfig();
  }

  saveFullConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this.saveConfig();
  }
}

module.exports = new Config();
