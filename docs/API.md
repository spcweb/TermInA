# API di Termina e Sviluppo Plugin

Questa documentazione descrive l'architettura interna di Termina e come sviluppare estensioni.

## 🏗️ Architettura

### Processi Electron

```
Main Process (main.js)
├── Config Manager (src/config.js)
├── AI Manager (src/ai-manager.js)
└── IPC Handlers

Renderer Process (renderer/renderer.js)
├── Terminal Class
├── AI Integration
└── UI Management

Preload (preload.js)
└── Security Bridge
```

### Flusso dei Dati

```mermaid
graph TD
    A[User Input] --> B[Terminal Handler]
    B --> C{Command Type?}
    C -->|ai:| D[AI Manager]
    C -->|run:| E[System Command]
    C -->|settings| F[Settings Window]
    D --> G[AI Provider]
    G --> H[Response Processing]
    H --> I[Terminal Output]
    E --> J[Command Execution]
    J --> I
```

## 🔌 Sistema Plugin (Futuro)

### Struttura Plugin

```javascript
// plugin-example.js
class TerminaPlugin {
  constructor(api) {
    this.api = api;
    this.name = 'ExamplePlugin';
    this.version = '1.0.0';
  }

  // Chiamato quando il plugin viene caricato
  onLoad() {
    this.api.addCommand('example', this.handleExample.bind(this));
    this.api.addTheme('example-theme', {
      background: '#000000',
      foreground: '#ffffff'
    });
  }

  // Gestisce il comando personalizzato
  async handleExample(args) {
    return `Hello from ${this.name}! Args: ${args.join(' ')}`;
  }

  // Chiamato quando il plugin viene scaricato
  onUnload() {
    this.api.removeCommand('example');
    this.api.removeTheme('example-theme');
  }
}

module.exports = TerminaPlugin;
```

### API Plugin

```javascript
// API che sarà disponibile ai plugin
class PluginAPI {
  // Comandi
  addCommand(name, handler) { }
  removeCommand(name) { }
  
  // Temi
  addTheme(name, theme) { }
  removeTheme(name) { }
  
  // Eventi
  on(event, callback) { }
  off(event, callback) { }
  emit(event, data) { }
  
  // Terminal
  write(text) { }
  writeln(text) { }
  clear() { }
  
  // AI
  requestAI(prompt) { }
  
  // Storage
  getPluginData(key) { }
  setPluginData(key, value) { }
  
  // UI
  showNotification(message) { }
  showDialog(options) { }
}
```

## 🛠️ API Interna Attuale

### Config Manager

```javascript
const config = require('./src/config');

// Lettura configurazione
const theme = config.get('theme');
const aiProvider = config.get('ai.provider');

// Scrittura configurazione
config.set('theme.background', '#000000');
config.set('ai.provider', 'openai');

// Reset configurazione
config.resetToDefaults();
```

### AI Manager

```javascript
const aiManager = require('./src/ai-manager');

// Richiesta AI
const response = await aiManager.request(prompt, context);

// Verifica provider
const isConfigured = aiManager.isProviderConfigured('gemini');

// Lista provider
const providers = aiManager.getAvailableProviders();
```

### Terminal Class

```javascript
// Metodi pubblici della classe ModernTerminal
class ModernTerminal {
  // Setup
  async init()
  async loadConfig()
  setupTerminal()
  
  // I/O
  async handleInput(data)
  async executeCommand()
  
  // AI
  async handleAICommand(prompt)
  writeAIResponse(response)
  
  // UI
  writeWelcome()
  prompt()
  clearTerminal()
  
  // Utility
  wrapText(text, maxWidth)
  extractCommand(response)
  isValidCommand(command)
}
```

## 📡 IPC Events

### Main → Renderer

```javascript
// Eventi che il main process invia al renderer
mainWindow.webContents.send('toggle-ai');
mainWindow.webContents.send('clear-terminal');
mainWindow.webContents.send('new-tab');
mainWindow.webContents.send('close-tab');
```

### Renderer → Main

```javascript
// Eventi che il renderer invia al main process
ipcRenderer.invoke('get-config', key);
ipcRenderer.invoke('set-config', key, value);
ipcRenderer.invoke('ai-request', prompt, context);
ipcRenderer.invoke('run-command', command);
ipcRenderer.invoke('open-settings');
```

## 🎨 Estensioni UI

### Custom CSS

I plugin potranno iniettare CSS personalizzato:

```css
/* plugin-styles.css */
.plugin-example {
  background: linear-gradient(45deg, #ff0000, #00ff00);
  border-radius: 8px;
  padding: 10px;
}

.terminal-custom-prompt {
  color: #ff69b4;
  font-weight: bold;
}
```

### Custom Components

```javascript
// Componenti UI personalizzati
class CustomComponent {
  constructor(container) {
    this.container = container;
    this.element = null;
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = 'plugin-component';
    this.element.innerHTML = `
      <h3>Plugin Component</h3>
      <button onclick="this.handleClick()">Click me</button>
    `;
    this.container.appendChild(this.element);
  }

  handleClick() {
    // Logica del click
  }

  destroy() {
    if (this.element) {
      this.element.remove();
    }
  }
}
```

## 🔐 Sicurezza Plugin

### Sandboxing

I plugin saranno eseguiti in un ambiente sandboxed:

```javascript
// Plugin sandbox
class PluginSandbox {
  constructor(pluginCode) {
    this.vm = new VM({
      timeout: 5000,
      sandbox: {
        console: { log: this.safeLog.bind(this) },
        require: this.safeRequire.bind(this),
        api: this.createPluginAPI()
      }
    });
  }

  safeRequire(module) {
    const allowedModules = ['path', 'util'];
    if (allowedModules.includes(module)) {
      return require(module);
    }
    throw new Error(`Module ${module} not allowed`);
  }
}
```

### Permissions

```json
{
  "pluginManifest": {
    "name": "example-plugin",
    "version": "1.0.0",
    "permissions": [
      "terminal.write",
      "ai.request", 
      "storage.read",
      "storage.write"
    ],
    "trustedDomains": [
      "api.example.com"
    ]
  }
}
```

## 📊 Eventi e Hooks

### Eventi del Terminale

```javascript
// Eventi disponibili per i plugin
api.on('terminal.ready', () => {
  console.log('Terminal is ready');
});

api.on('command.executed', (command, output) => {
  console.log(`Command: ${command}, Output: ${output}`);
});

api.on('ai.response', (prompt, response) => {
  console.log(`AI responded to: ${prompt}`);
});

api.on('theme.changed', (newTheme) => {
  console.log(`Theme changed to: ${newTheme.name}`);
});
```

### Hooks di Modifica

```javascript
// Hook per modificare comportamenti
api.addHook('command.before', (command) => {
  // Modifica il comando prima dell'esecuzione
  if (command.startsWith('sudo')) {
    return `echo "Sudo not allowed in plugins" && ${command}`;
  }
  return command;
});

api.addHook('ai.prompt', (prompt) => {
  // Modifica il prompt prima di inviarlo all'AI
  return `[Plugin Context] ${prompt}`;
});
```

## 🧪 Testing API

### Unit Tests

```javascript
// test/plugin-api.test.js
const { PluginAPI } = require('../src/plugin-api');

describe('Plugin API', () => {
  let api;

  beforeEach(() => {
    api = new PluginAPI();
  });

  test('should register command', () => {
    const handler = jest.fn();
    api.addCommand('test', handler);
    
    expect(api.commands['test']).toBe(handler);
  });

  test('should execute command', async () => {
    const handler = jest.fn().mockResolvedValue('test output');
    api.addCommand('test', handler);
    
    const result = await api.executeCommand('test', ['arg1']);
    expect(result).toBe('test output');
    expect(handler).toHaveBeenCalledWith(['arg1']);
  });
});
```

### Integration Tests

```javascript
// test/integration.test.js
const { app } = require('electron');
const { ModernTerminal } = require('../renderer/renderer');

describe('Terminal Integration', () => {
  let terminal;

  beforeEach(async () => {
    terminal = new ModernTerminal();
    await terminal.init();
  });

  test('should handle AI command', async () => {
    const result = await terminal.executeCommand('ai: test question');
    expect(result).toContain('AI Response');
  });
});
```

## 📦 Package e Distribuzione

### Plugin Package Structure

```
my-plugin/
├── package.json
├── index.js          # Entry point
├── manifest.json     # Plugin manifest
├── styles/
│   └── plugin.css
├── assets/
│   └── icon.png
└── test/
    └── plugin.test.js
```

### Plugin Manifest

```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0", 
  "description": "An awesome plugin for Termina",
  "author": "Your Name",
  "license": "MIT",
  "termina": {
    "minVersion": "2.0.0",
    "maxVersion": "3.0.0"
  },
  "main": "index.js",
  "permissions": [
    "terminal.write",
    "ai.request"
  ],
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
```

---

**Nota**: Il sistema plugin è in fase di progettazione e sarà implementato nella versione 2.1 di Termina.
