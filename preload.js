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
  aiAgentRequestWithWeb: (prompt, context, autoExecute) => ipcRenderer.invoke('ai-agent-request-with-web', prompt, context, autoExecute),
  getAIProviders: () => ipcRenderer.invoke('get-ai-providers'),
  testAIConnection: (provider, config) => ipcRenderer.invoke('test-ai-connection', provider, config),
  
  // Web integration operations
  webSearch: (query, searchEngine, maxResults) => ipcRenderer.invoke('web-search', query, searchEngine, maxResults),
  getWebSearchStats: () => ipcRenderer.invoke('get-web-search-stats'),
  getWebSearchHistory: () => ipcRenderer.invoke('get-web-search-history'),
  clearWebSearchHistory: () => ipcRenderer.invoke('clear-web-search-history'),
  setWebSearchConfidenceThreshold: (threshold) => ipcRenderer.invoke('set-web-search-confidence-threshold', threshold),
  getWebSearchConfidenceThreshold: () => ipcRenderer.invoke('get-web-search-confidence-threshold'),
  isWebServiceAvailable: () => ipcRenderer.invoke('is-web-service-available'),
  
  // Terminal operations
  runCommand: (command) => ipcRenderer.invoke('run-command', command),
  runInteractiveCommand: (command) => ipcRenderer.invoke('run-interactive-command', command),
  runSudoCommand: (command, password) => ipcRenderer.invoke('run-sudo-command', command, password),
  getCwd: () => ipcRenderer.invoke('get-cwd'),
  onCwdChanged: (callback) => ipcRenderer.on('cwd-changed', (event, cwd) => callback(cwd)),
  
  // PTY operations
  ptyCreateSession: () => ipcRenderer.invoke('pty-create-session'),
  ptyWrite: (sessionId, data) => ipcRenderer.invoke('pty-write', sessionId, data),
  ptyResize: (sessionId, cols, rows) => ipcRenderer.invoke('pty-resize', sessionId, cols, rows),
  ptyKill: (sessionId) => ipcRenderer.invoke('pty-kill', sessionId),
  ptyClose: (sessionId) => ipcRenderer.invoke('pty-close', sessionId),
  ptyClear: (sessionId) => ipcRenderer.invoke('pty-clear', sessionId),
  ptyGetOutput: (sessionId, fromIndex) => ipcRenderer.invoke('pty-get-output', sessionId, fromIndex),
  ptyGetImmediateOutput: (sessionId, fromTimestamp) => ipcRenderer.invoke('pty-get-immediate-output', sessionId, fromTimestamp),
  ptyRunCommand: (command, options) => ipcRenderer.invoke('pty-run-command', command, options),
  ptyGetSessions: () => ipcRenderer.invoke('pty-get-sessions'),
  
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
