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
  
  // AI Context operations
  getAIContext: (limit) => ipcRenderer.invoke('get-ai-context', limit),
  getCommandHistory: (limit) => ipcRenderer.invoke('get-command-history', limit),
  searchCommandHistory: (query, limit) => ipcRenderer.invoke('search-command-history', query, limit),
  getHistoryStatistics: () => ipcRenderer.invoke('get-history-statistics'),
  
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
  
  // Rust Terminal operations
  rustTerminalCreateSession: (cwd) => ipcRenderer.invoke('rust-terminal-create-session', cwd),
  rustTerminalWrite: (sessionId, data) => ipcRenderer.invoke('rust-terminal-write', sessionId, data),
  rustTerminalResize: (sessionId, cols, rows) => ipcRenderer.invoke('rust-terminal-resize', sessionId, cols, rows),
  rustTerminalKill: (sessionId) => ipcRenderer.invoke('rust-terminal-kill', sessionId),
  rustTerminalClose: (sessionId) => ipcRenderer.invoke('rust-terminal-close', sessionId),
  rustTerminalClear: (sessionId) => ipcRenderer.invoke('rust-terminal-clear', sessionId),
  rustTerminalGetOutput: (sessionId, fromIndex) => ipcRenderer.invoke('rust-terminal-get-output', sessionId, fromIndex),
  rustTerminalGetImmediateOutput: (sessionId, fromTimestamp) => ipcRenderer.invoke('rust-terminal-get-immediate-output', sessionId, fromTimestamp),
  rustTerminalRunSudoCommand: (sessionId, command, password) => ipcRenderer.invoke('rust-terminal-run-sudo-command', sessionId, command, password),
  rustTerminalGetSessions: () => ipcRenderer.invoke('rust-terminal-get-sessions'),
  rustTerminalGetStatus: () => ipcRenderer.invoke('rust-terminal-get-status'),
  
  // Interactive Terminal operations
  createInteractiveSession: (command, cwd) => ipcRenderer.invoke('create-interactive-session', command, cwd),
  closeInteractiveSession: (sessionId) => ipcRenderer.invoke('close-interactive-session', sessionId),
  setupSessionCallback: (sessionId) => ipcRenderer.invoke('setup-session-callback', sessionId),
  onSessionData: (callback) => ipcRenderer.on('session-data', (event, data) => callback(data)),
  
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
  onOpenInteractiveTerminal: (callback) => ipcRenderer.on('open-interactive-terminal', (event, data) => callback(data)),
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
