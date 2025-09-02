// Preload per abilitare funzioni sicure tra renderer e main
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  saveToDownloads: (filename, content) => ipcRenderer.invoke('save-to-downloads', filename, content),
  
  // AI operations
  aiRequest: (prompt, context) => ipcRenderer.invoke('ai-request', prompt, context),
  aiAgentRequest: (prompt, context, autoExecute) => ipcRenderer.invoke('ai-agent-request', prompt, context, autoExecute),
  getAIProviders: () => ipcRenderer.invoke('get-ai-providers'),
  testAIConnection: (provider, config) => ipcRenderer.invoke('test-ai-connection', provider, config),
  
  // Terminal operations
  runCommand: (command) => ipcRenderer.invoke('run-command', command),
  runInteractiveCommand: (command) => ipcRenderer.invoke('run-interactive-command', command),
  runSudoCommand: (command, password) => ipcRenderer.invoke('run-sudo-command', command, password),
  getCwd: () => ipcRenderer.invoke('get-cwd'),
  onCwdChanged: (callback) => ipcRenderer.on('cwd-changed', (event, cwd) => callback(cwd)),
  
  // Configuration
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  saveConfig: (newConfig) => ipcRenderer.invoke('save-config', newConfig),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  
  // Window management
  openSettings: () => ipcRenderer.invoke('open-settings'),
  closeSettings: () => ipcRenderer.invoke('close-settings'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  
  // Event listeners and messaging
  onToggleAI: (callback) => ipcRenderer.on('toggle-ai', callback),
  onClearTerminal: (callback) => ipcRenderer.on('clear-terminal', callback),
  onNewTab: (callback) => ipcRenderer.on('new-tab', callback),
  onCloseTab: (callback) => ipcRenderer.on('close-tab', callback),
  onSettingsChanged: (callback) => ipcRenderer.on('settings-changed', callback),
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
