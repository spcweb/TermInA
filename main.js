// IMPORT
const { app, BrowserWindow, ipcMain, Menu, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const config = require('./src/config');

// Gestione globale degli errori non catturati per evitare crash
process.on('uncaughtException', (error) => {
  // Gestisci errori EPIPE silenziosamente (pipe chiuso)
  if (error.code === 'EPIPE') {
    console.warn('Pipe closed - ignoring EPIPE error');
    return;
  }

  // Per altri errori, logga ma non terminare il processo
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
const aiManager = require('./src/ai-manager');
const aiAgent = require('./src/ai-agent');
const ptyManager = require('./src/pty-manager');
const webScraper = require('./src/webscraper-playwright');
const webAIIntegration = require('./src/web-ai-integration');

let mainWindow;
let settingsWindow;
let currentWorkingDirectory = require('os').homedir();
let previousWorkingDirectory = currentWorkingDirectory;

function resolvePath(inputPath) {
  const os = require('os');
  if (!inputPath || inputPath.trim() === '') return os.homedir();
  let p = inputPath.trim();
  if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
    p = p.slice(1, -1);
  }
  if (p.startsWith('~')) {
    p = p.replace(/^~(\/)?/, os.homedir() + '/');
  }
  const path = require('path');
  if (path.isAbsolute(p)) return p;
  return path.resolve(currentWorkingDirectory, p);
}

function changeDirectory(targetRaw) {
  const fs = require('fs');
  const path = require('path');
  const target = resolvePath(targetRaw);
  try {
    const stat = fs.statSync(target);
    if (!stat.isDirectory()) {
      return { success: false, message: `[cd] Non è una directory: ${target}` };
    }
    previousWorkingDirectory = currentWorkingDirectory;
    currentWorkingDirectory = path.resolve(target);
    if (mainWindow) {
      mainWindow.webContents.send('cwd-changed', currentWorkingDirectory);
    }
    return { success: true, message: '' };
  } catch (e) {
    return { success: false, message: `[cd] Directory non trovata: ${target}` };
  }
}

// HANDLER IPC
ipcMain.handle('read-file', async (event, filePath) => {
  return fs.promises.readFile(filePath, 'utf8');
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  return fs.promises.writeFile(filePath, content, 'utf8');
});

// Handler per salvare file nella cartella Downloads
ipcMain.handle('save-to-downloads', async (event, filename, content) => {
  const os = require('os');
  const path = require('path');
  const downloadsPath = path.join(os.homedir(), 'Downloads', filename);
  
  try {
    await fs.promises.writeFile(downloadsPath, content, 'utf8');
    return { success: true, path: downloadsPath };
  } catch (error) {
    console.error('Error saving to downloads:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ai-request', async (event, prompt, context = []) => {
  try {
    return await aiManager.request(prompt, context);
  } catch (error) {
    console.error('Errore richiesta AI:', error);
    return `[AI] Errore: ${error.message}`;
  }
});

// Nuovo handler per AI Agent con iterazione
ipcMain.handle('ai-agent-request', async (event, prompt, context = [], autoExecute = false) => {
  try {
    // Configura l'esecutore di comandi per l'AI Agent
    aiAgent.setCommandExecutor(async (command) => {
      return new Promise((resolve) => {
  exec(command, { encoding: 'utf8', maxBuffer: 1024 * 1024, cwd: currentWorkingDirectory }, (error, stdout, stderr) => {
          resolve({
            success: !error,
            output: error ? error.message : (stderr || stdout || ''),
            exitCode: error ? error.code || 1 : 0,
            stdout: stdout || '',
            stderr: stderr || ''
          });
        });
      });
    });

    return await aiAgent.processRequest(prompt, context, autoExecute);
  } catch (error) {
    console.error('Errore AI Agent:', error);
    return {
      type: 'error',
      response: `Errore AI Agent: ${error.message}`,
      iterations: 0,
      history: []
    };
  }
});

// Handler per AI Agent con integrazione web
ipcMain.handle('ai-agent-request-with-web', async (event, prompt, context = [], autoExecute = false) => {
  try {
    // Configura l'esecutore di comandi per l'AI Agent
    aiAgent.setCommandExecutor(async (command) => {
      return new Promise((resolve) => {
        exec(command, { encoding: 'utf8', maxBuffer: 1024 * 1024, cwd: currentWorkingDirectory }, (error, stdout, stderr) => {
          resolve({
            success: !error,
            output: error ? error.message : (stderr || stdout || ''),
            exitCode: error ? error.code || 1 : 0,
            stdout: stdout || '',
            stderr: stderr || ''
          });
        });
      });
    });

    return await aiAgent.processRequestWithWeb(prompt, context, autoExecute);
  } catch (error) {
    console.error('Errore AI Agent con Web:', error);
    return {
      type: 'error',
      response: `Errore AI Agent con Web: ${error.message}`,
      iterations: 0,
      history: []
    };
  }
});

ipcMain.handle('run-command', async (event, command) => {
  return new Promise(async (resolve, reject) => {
    const trimmed = command.trim();
    // Gestione comando cd (supporta: cd, cd <path>, cd .., cd -, cd "dir con spazi", cd dir && ls)
    const cdMatch = trimmed.match(/^cd(\s+([^&;]+))?(?:\s*&&\s*(.*))?$/);
    if (cdMatch) {
      const target = cdMatch[2];
      if (!target) {
        const res = changeDirectory('');
        if (!res.success) { resolve(res.message); return; }
      } else if (target === '-') {
        const old = currentWorkingDirectory;
        currentWorkingDirectory = previousWorkingDirectory;
        previousWorkingDirectory = old;
        if (mainWindow) mainWindow.webContents.send('cwd-changed', currentWorkingDirectory);
      } else if (target === '.') {
        // no-op
      } else if (target === '..') {
        const res = changeDirectory('..');
      } else {
        const res = changeDirectory(target);
        if (!res.success) { resolve(res.message); return; }
      }
      const chained = cdMatch[3];
      if (chained) {
        exec(chained, { encoding: 'utf8', maxBuffer: 1024 * 1024, cwd: currentWorkingDirectory }, (error, stdout, stderr) => {
          if (error) resolve(`[Error] ${error.message}`);
          else if (stderr) resolve(`[Stderr] ${stderr}`);
          else resolve(stdout);
        });
      } else {
        resolve('');
      }
      return;
    }

    if (trimmed === 'pwd') { resolve(currentWorkingDirectory + '\n'); return; }

    // Controlla se il comando richiede sudo
    if (command.trim().startsWith('sudo ')) {
      // Per comandi sudo, suggerisci l'uso del dialog password
      resolve(`[TermInA] Sudo command detected: "${command}"

🔐 To execute sudo commands with password prompt, the command will be processed through the secure password dialog.

� If you see issues with interactive scripts (like Homebrew installer), try:
   - For Homebrew: Run without sudo: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   - For package managers: Use user-space alternatives when possible
   - For system changes: Ensure the command actually needs root privileges

The command will now be executed through the sudo handler...`);
      return;
    }

    // Controlla se è un comando che probabilmente richiederà sudo internamente
    const mightNeedSudo = command.includes('curl -fsSL') && command.includes('install.sh') ||
                         command.includes('npm install -g') ||
                         command.includes('pip install') && !command.includes('--user') ||
                         command.includes('homebrew') ||
                         command.includes('Install');

    if (mightNeedSudo) {
      // Suggerisci di usare il comando sudo con dialog
      resolve(`[TermInA] Command may require administrator privileges: "${command}"

🔐 This command might ask for a password during execution.

🎯 For a better experience with password input, try:
   sudo ${command}

This will use TermInA's secure password dialog instead of asking for password in the external terminal.

💡 Alternative: Continue with current command (may prompt for password in the terminal where you started TermInA).

Recommendation: Use "sudo ${command}" for secure password input.`);
      return;
    }

    // Lista dei comandi che richiedono un terminale completo (interattivi)
    const fullTerminalCommands = [
      'top', 'htop', 'btop', 'btop++',        // Monitor di sistema
      'vim', 'vi', 'nano', 'emacs',           // Editor di testo
      'less', 'more', 'man',                  // Visualizzatori
      'ssh', 'telnet', 'ftp',                 // Connessioni remote
      'mysql', 'psql', 'sqlite3',             // Database CLI
      'python', 'python3', 'node', 'ruby', 'perl', // REPL interattivi
      'irb', 'pry', 'rails console',          // Ruby REPL
      'ipython', 'jupyter console',           // Python REPL
      'gdb', 'lldb',                          // Debugger
      'screen', 'tmux',                       // Multiplexer
      'watch', 'tail -f', 'journalctl -f'     // Monitor in tempo reale
    ];

    // Lista dei comandi che beneficiano del PTY (interattivi o con output dinamico)
    const ptyCommands = [
      'git clone', 'git pull', 'git push',    // Git con progress
      'npm install', 'npm run', 'yarn install', 'yarn add', 'yarn remove', // NPM/Yarn
      'pip install', 'pip download', 'pip uninstall', // Python
      'brew install', 'brew upgrade', 'brew uninstall', // Homebrew
      'yay', 'pacman', 'apt-get', 'apt', 'apt install', 'apt remove', // Package managers Linux
      'wget', 'curl',                         // Download con progress
      'rsync', 'scp',                         // Trasferimenti
      'docker run', 'docker build', 'docker pull', 'docker push', // Docker
      'make', 'cmake', 'gcc', 'g++', 'clang', // Build systems
      'composer install', 'composer update',  // PHP Composer
      'gem install', 'gem update',            // Ruby Gems
      'cargo build', 'cargo run', 'cargo install', // Rust Cargo
      'go build', 'go run', 'go install',     // Go
      'mvn install', 'mvn compile', 'gradle build' // Java build tools
    ];

    // Verifica se il comando richiede un terminale completo
    const requiresFullTerminal = fullTerminalCommands.some(cmd => {
      // Controlla se il comando inizia con il comando
      if (trimmed.startsWith(cmd)) return true;
      
      // Controlla se il comando contiene il comando seguito da spazio
      if (trimmed.includes(cmd + ' ')) return true;
      
      // Controlli speciali per comandi specifici
      if (cmd === 'tail -f' && trimmed.includes('tail -f')) return true;
      if (cmd === 'journalctl -f' && trimmed.includes('journalctl -f')) return true;
      
      return false;
    });

    // Se richiede un terminale completo, apri una finestra integrata
    if (requiresFullTerminal) {
      console.log(`Opening integrated terminal for command: ${command}`);
      if (mainWindow) {
        mainWindow.webContents.send('open-interactive-terminal', {
          command: command,
          cwd: currentWorkingDirectory
        });
      }
      resolve(`[TermInA] Opening interactive command "${command}" in integrated terminal...`);
      return;
    }

    // Verifica se il comando dovrebbe usare PTY
    const shouldUsePty = ptyCommands.some(cmd => {
      // Controlla se il comando inizia con il comando PTY
      if (trimmed.startsWith(cmd)) return true;
      
      // Controlla se il comando contiene il comando PTY seguito da spazio
      if (trimmed.includes(cmd + ' ')) return true;
      
      // Controlli speciali per comandi specifici
      if (cmd === 'npm install' && trimmed.includes('npm install')) return true;
      if (cmd === 'yarn install' && trimmed.includes('yarn install')) return true;
      if (cmd === 'pip install' && trimmed.includes('pip install')) return true;
      
      return false;
    }) || 
    trimmed.includes('curl -fsSL') && trimmed.includes('install.sh') ||
    trimmed.includes('|') || // Pipes potrebbero essere interattivi
    (trimmed.includes('&&') && !cdMatch) || // Comandi concatenati
    trimmed.includes('npm ') || // Tutti i comandi npm
    trimmed.includes('yarn ') || // Tutti i comandi yarn
    trimmed.includes('pip ') || // Tutti i comandi pip
    trimmed.includes('brew ') || // Tutti i comandi brew
    trimmed.includes('apt ') || // Tutti i comandi apt
    trimmed.includes('pacman ') || // Tutti i comandi pacman
    trimmed.includes('yay ') || // Tutti i comandi yay
    trimmed.includes('docker ') || // Tutti i comandi docker
    trimmed.includes('git ') || // Tutti i comandi git
    trimmed.includes('make ') || // Tutti i comandi make
    trimmed.includes('cmake ') || // Tutti i comandi cmake
    trimmed.includes('cargo ') || // Tutti i comandi cargo
    trimmed.includes('go ') || // Tutti i comandi go
    trimmed.includes('mvn ') || // Tutti i comandi maven
    trimmed.includes('gradle '); // Tutti i comandi gradle

    if (shouldUsePty) {
      try {
        console.log(`Using PTY for command: ${command}`);
        // Determina il timeout basato sul tipo di comando
        let timeout = 120000; // Default 2 minuti
        if (trimmed.includes('npm install') || trimmed.includes('yarn install')) {
          timeout = 600000; // 10 minuti per installazioni npm/yarn
        } else if (trimmed.includes('pip install') || trimmed.includes('brew install')) {
          timeout = 300000; // 5 minuti per installazioni pip/brew
        } else if (trimmed.includes('docker build') || trimmed.includes('make')) {
          timeout = 1800000; // 30 minuti per build complesse
        } else if (trimmed.includes('git clone') || trimmed.includes('wget') || trimmed.includes('curl')) {
          timeout = 300000; // 5 minuti per download
        }
        
        const ptyResult = await ptyManager.runCommand(command, { 
          cwd: currentWorkingDirectory,
          timeout: timeout
        });
        
        if (ptyResult.success) {
          resolve(ptyResult.output || '[Success] Command completed');
        } else {
          let errorMessage = `[Error] Command failed`;
          if (ptyResult.error) {
            errorMessage += `: ${ptyResult.error}`;
          } else if (ptyResult.signal) {
            errorMessage += ` (terminated by signal: ${ptyResult.signal})`;
          } else if (ptyResult.exitCode !== 0) {
            errorMessage += ` with exit code ${ptyResult.exitCode}`;
          }
          if (ptyResult.output) {
            errorMessage += `\n${ptyResult.output}`;
          }
          resolve(errorMessage);
        }
      } catch (error) {
        console.error('PTY command failed, falling back to exec:', error.message);
        // Fallback a exec normale
        exec(command, { encoding: 'utf8', maxBuffer: 1024 * 1024, cwd: currentWorkingDirectory }, (error, stdout, stderr) => {
          if (error) {
            resolve(`[Error] ${error.message}`);
          } else if (stderr) {
            resolve(`[Stderr] ${stderr}`);
          } else {
            resolve(stdout);
          }
        });
      }
      return;
    }

  exec(command, { encoding: 'utf8', maxBuffer: 1024 * 1024, cwd: currentWorkingDirectory }, (error, stdout, stderr) => {
      if (error) {
        resolve(`[Error] ${error.message}`);
      } else if (stderr) {
        resolve(`[Stderr] ${stderr}`);
      } else {
        resolve(stdout);
      }
    });
  });
});

// IPC per ottenere cwd corrente
ipcMain.handle('get-cwd', async () => currentWorkingDirectory);

// ===== NUOVO SISTEMA PTY =====

// Crea una nuova sessione PTY
ipcMain.handle('pty-create-session', async (event) => {
  try {
    console.log('Main: Creating new PTY session...');
    const session = ptyManager.createSession();
    console.log(`Main: PTY session created: ${session.id}, type: ${session.type}`);
    return { success: true, sessionId: session.id };
  } catch (error) {
    console.error('Error creating PTY session:', error);
    return { success: false, error: error.message };
  }
});

// Invia dati a una sessione PTY
ipcMain.handle('pty-write', async (event, sessionId, data) => {
  try {
    console.log(`Main: Writing to PTY session ${sessionId}:`, data.substring(0, 100) + (data.length > 100 ? '...' : ''));
    const success = ptyManager.writeToSession(sessionId, data);
    console.log(`Main: PTY write result:`, success);
    return { success };
  } catch (error) {
    console.error('Error writing to PTY:', error);
    return { success: false, error: error.message };
  }
});

// Ridimensiona una sessione PTY
ipcMain.handle('pty-resize', async (event, sessionId, cols, rows) => {
  try {
    const success = ptyManager.resizeSession(sessionId, cols, rows);
    return { success };
  } catch (error) {
    console.error('Error resizing PTY:', error);
    return { success: false, error: error.message };
  }
});

// Uccidi una sessione PTY
ipcMain.handle('pty-kill', async (event, sessionId) => {
  try {
    const success = ptyManager.killSession(sessionId);
    return { success };
  } catch (error) {
    console.error('Error killing PTY:', error);
    return { success: false, error: error.message };
  }
});

// Chiudi una sessione PTY
ipcMain.handle('pty-close', async (event, sessionId) => {
  try {
    const success = ptyManager.closeSession(sessionId);
    return { success };
  } catch (error) {
    console.error('Error closing PTY:', error);
    return { success: false, error: error.message };
  }
});

// Pulisce una sessione PTY (comando clear)
ipcMain.handle('pty-clear', async (event, sessionId) => {
  try {
    const success = ptyManager.clearSession(sessionId);
    return { success };
  } catch (error) {
    console.error('Error clearing PTY:', error);
    return { success: false, error: error.message };
  }
});

// Ottieni l'output di una sessione PTY
ipcMain.handle('pty-get-output', async (event, sessionId, fromIndex) => {
  try {
    const output = ptyManager.getSessionOutput(sessionId, fromIndex);
    return { success: true, output };
  } catch (error) {
    console.error('Error getting PTY output:', error);
    return { success: false, error: error.message };
  }
});

// Ottieni l'output immediato di una sessione PTY (per output dinamici)
ipcMain.handle('pty-get-immediate-output', async (event, sessionId, fromTimestamp) => {
  try {
    const session = ptyManager.getSession(sessionId);
    if (session && session.isActive) {
      const output = ptyManager.getSessionOutputFromBuffer(sessionId, fromTimestamp);
      const lastTimestamp = ptyManager.getLastOutputTimestamp(sessionId);
      console.log(`Main: pty-get-immediate-output for session ${sessionId}, fromTimestamp: ${fromTimestamp}, output length: ${output.length}`);
      return { 
        success: true, 
        output, 
        hasNewData: output.length > 0,
        lastTimestamp: lastTimestamp
      };
    }
    console.log(`Main: pty-get-immediate-output for session ${sessionId} - session not found or inactive`);
    return { success: false, output: '', hasNewData: false, lastTimestamp: 0 };
  } catch (error) {
    console.error('Error getting immediate PTY output:', error);
    return { success: false, error: error.message, output: '', hasNewData: false, lastTimestamp: 0 };
  }
});

// Esegui un comando singolo con PTY
ipcMain.handle('pty-run-command', async (event, command, options = {}) => {
  try {
    // Aggiorna la working directory se necessario
    if (options.cwd) {
      currentWorkingDirectory = options.cwd;
    }
    
    const result = await ptyManager.runCommand(command, {
      ...options,
      cwd: currentWorkingDirectory
    });
    
    return { success: true, ...result };
  } catch (error) {
    console.error('Error running PTY command:', error);
    return { 
      success: false, 
      error: error.message,
      output: '',
      exitCode: 1
    };
  }
});

// Ottieni lista delle sessioni attive
ipcMain.handle('pty-get-sessions', async (event) => {
  try {
    const sessions = ptyManager.getActiveSessions();
    return { success: true, sessions };
  } catch (error) {
    console.error('Error getting PTY sessions:', error);
    return { success: false, error: error.message };
  }
});

// ===== FINE NUOVO SISTEMA PTY =====

// ===== SISTEMA TERMINALE INTERATTIVO INTEGRATO =====

// Crea una sessione PTY per comandi interattivi
ipcMain.handle('create-interactive-session', async (event, command, cwd) => {
  try {
    // Gestisci il log in modo sicuro per evitare errori EPIPE
    try {
      console.log(`Creating interactive session for command: ${command}`);
    } catch (logError) {
      // Ignora errori di log se il processo sta terminando
      if (logError.code !== 'EPIPE') {
        throw logError;
      }
    }
    // Determina se è un comando interattivo
    const isInteractive = ptyManager.isInteractiveCommand(command);
    console.log(`DEBUG: Command "${command}" is interactive: ${isInteractive}`);
    
    let session;
    if (isInteractive) {
      // Per comandi interattivi, usa createInteractiveSession
      session = ptyManager.createInteractiveSession(cwd);
      console.log(`DEBUG: Created interactive session ${session.id} for command: ${command}`);
      
      // Esegui il comando nella sessione interattiva
      if (command) {
        ptyManager.writeToSession(session.id, command + '\r');
      }
    } else {
      // Per comandi normali, usa createSession
      session = ptyManager.createSession();
      
      // Esegui il comando nella sessione
      if (command) {
        ptyManager.writeToSession(session.id, command + '\r');
      }
    }
    
    return { success: true, sessionId: session.id };
  } catch (error) {
    console.error('Error creating interactive session:', error);
    return { success: false, error: error.message };
  }
});

// Chiudi una sessione interattiva
ipcMain.handle('close-interactive-session', async (event, sessionId) => {
  try {
    const success = ptyManager.closeSession(sessionId);
    return { success };
  } catch (error) {
    console.error('Error closing interactive session:', error);
    return { success: false, error: error.message };
  }
});

// Imposta il callback per ricevere dati in tempo reale
ipcMain.handle('setup-session-callback', async (event, sessionId) => {
  try {
    const session = ptyManager.getSession(sessionId);
    if (session) {
      // Imposta il callback per inviare dati al frontend
      session.onData = (data) => {
        console.log(`DEBUG: Sending data to frontend for session ${sessionId}: ${data.length} chars`);
        event.sender.send('session-data', { sessionId, data });
      };
      console.log(`DEBUG: Callback setup completed for session ${sessionId}`);
      return { success: true };
    }
    return { success: false, error: 'Session not found' };
  } catch (error) {
    console.error('Error setting up session callback:', error);
    return { success: false, error: error.message };
  }
});

// ===== FINE SISTEMA TERMINALE INTERATTIVO INTEGRATO =====

// Handler speciale per comandi che richiedono input interattivo (come password)
ipcMain.handle('run-interactive-command', async (event, command) => {
  return new Promise((resolve, reject) => {
    console.log(`Executing interactive command: ${command}`);
    
    try {
      // Per Homebrew, non usiamo script ma creiamo un ambiente che simula interattività
      // Homebrew rileva l'interattività principalmente attraverso variabili d'ambiente
      
  const childProcess = spawn('bash', ['-c', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Ambiente che simula un terminale interattivo
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          FORCE_COLOR: '1',
          
          // Variabili specifiche per Homebrew
          HOMEBREW_NO_AUTO_UPDATE: '1',
          HOMEBREW_NO_ANALYTICS: '1',
          HOMEBREW_NO_INSTALL_CLEANUP: '1',
          
          // Importante: rimuoviamo variabili che indicano non-interattività
          CI: undefined,
          NONINTERACTIVE: undefined,
          DEBIAN_FRONTEND: undefined,
          
          // Aggiungiamo variabili che indicano che siamo in un terminale
          // Anche se non abbiamo un vero TTY, proviamo a convincere Homebrew
          TERM_PROGRAM: 'TermInA',
          TERM_PROGRAM_VERSION: '2.0.0',
          
          // Per macOS specificamente
          SHELL: process.env.SHELL || '/bin/zsh'
  },
  cwd: currentWorkingDirectory
      });

      let output = '';
      let errorOutput = '';
      let needsSudo = false;

      childProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        
        // Rileva se il comando ha bisogno di sudo in modo interattivo
        if (text.includes('Password:') || 
            text.includes('sudo password') ||
            text.includes('Administrator') ||
            text.includes('Need sudo access')) {
          needsSudo = true;
        }
      });

      childProcess.on('close', (code) => {
        console.log(`Interactive command finished with code: ${code}`);
        
        if (code === 0) {
          if (command.includes('install.sh') && command.includes('Homebrew')) {
            resolve(`✅ Homebrew installation completed successfully!

📦 Installation output:
${output}

🎯 Next steps:
1. Restart your terminal or run: source ~/.zshrc
2. Try: brew --version
3. Install packages with: brew install <package-name>

${errorOutput ? `📝 Installation notes:\n${errorOutput}` : ''}`);
          } else {
            resolve(output || '[Success] Interactive command executed successfully');
          }
        } else {
          // Gestione specifica degli errori comuni
          if (errorOutput.includes('stdin is not a TTY') || 
              errorOutput.includes('tcgetattr') ||
              errorOutput.includes('Operation not supported on socket')) {
            
            resolve(`[Info] Terminal compatibility issue detected.

🔍 Issue: The installer cannot detect a proper interactive terminal environment.

💡 Solutions to try:
1. Install via package manager alternative: 
   curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | NONINTERACTIVE=1 bash

2. Or try the manual installation:
   mkdir homebrew && curl -L https://github.com/Homebrew/brew/tarball/master | tar xz --strip 1 -C homebrew

3. Check system permissions and try in Terminal.app

📄 Command output:
${output}

⚠️ Technical details:
${errorOutput}`);
          
          } else if (errorOutput.includes("Don't run this as root")) {
            
            resolve(`[Info] Homebrew should not be installed with sudo.

🔍 Issue: Homebrew installer refuses to run as root for security reasons.

💡 Solution: Run the command WITHOUT sudo:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

📄 Command output:
${output}

⚠️ Error details:
${errorOutput}`);
          
          } else {
            resolve(`[Error] Interactive command failed with code ${code}

📤 Command output:
${output}

❌ Error details:
${errorOutput}`);
          }
        }
      });

      childProcess.on('error', (err) => {
        console.error(`Interactive command error: ${err.message}`);
        resolve(`[Error] Failed to execute interactive command: ${err.message}`);
      });

      // Timeout di 15 minuti per installer
      setTimeout(() => {
        childProcess.kill('SIGTERM');
        resolve(`[Timeout] Interactive command timed out after 15 minutes\n\nOutput: ${output}\nErrors: ${errorOutput}`);
      }, 15 * 60 * 1000);

    } catch (error) {
      console.error(`Failed to create interactive process: ${error.message}`);
      resolve(`[Error] Failed to create interactive process: ${error.message}`);
    }
  });
});

// Handler per comandi sudo con prompt password
ipcMain.handle('run-sudo-command', async (event, command, password) => {
  return new Promise((resolve, reject) => {
    if (!command.startsWith('sudo ')) {
      resolve('[Error] This handler is only for sudo commands');
      return;
    }

    console.log(`Executing sudo command: ${command}`);

    // Rimuovi sudo dal comando
    const actualCommand = command.substring(5);
    
    // Per comandi sudo con installer interattivi (come Homebrew)
    const isInteractiveInstaller = actualCommand.includes('install.sh') || 
                                   actualCommand.includes('curl') ||
                                   actualCommand.includes('wget');
    
    let sudoArgs, sudoEnv;
    
    if (isInteractiveInstaller) {
      // Per installer interattivi, usa bash con un ambiente più completo
      sudoArgs = ['-S', '-p', '', 'bash', '-c', actualCommand];
      sudoEnv = {
        ...process.env,
        SUDO_ASKPASS: '',
        PATH: process.env.PATH,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        FORCE_COLOR: '1',
        HOMEBREW_NO_AUTO_UPDATE: '1',
        HOMEBREW_NO_ANALYTICS: '1',
        // Importante: non settare NONINTERACTIVE
        CI: undefined,
        NONINTERACTIVE: undefined
      };
    } else {
      // Per comandi sudo normali
      sudoArgs = ['-S', '-p', '', 'sh', '-c', actualCommand];
      sudoEnv = { 
        ...process.env,
        SUDO_ASKPASS: '',
        PATH: process.env.PATH
      };
    }
    
    const sudoProcess = spawn('sudo', sudoArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: sudoEnv
    });

    let output = '';
    let errorOutput = '';

    // Invia la password immediatamente
    sudoProcess.stdin.write(password + '\n');
    sudoProcess.stdin.end();

    sudoProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    sudoProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    sudoProcess.on('close', (code) => {
      console.log(`Sudo command finished with code: ${code}`);
      
      // Filtra messaggi di password da stderr
      const filteredError = errorOutput
        .split('\n')
        .filter(line => !line.includes('Password:') && !line.includes('Sorry, try again'))
        .join('\n')
        .trim();
        
      if (code === 0) {
        if (isInteractiveInstaller && actualCommand.includes('install.sh')) {
          resolve(`✅ Homebrew installation completed successfully!

📦 Installation output:
${output}

🎯 Next steps:
1. Restart your terminal or run: source ~/.zshrc
2. Try: brew --version
3. Install packages with: brew install <package-name>

${filteredError ? `⚠️ Additional notes:\n${filteredError}` : ''}`);
        } else {
          resolve(output || '[Success] Sudo command executed successfully');
        }
      } else {
        if (isInteractiveInstaller) {
          resolve(`❌ Homebrew installation failed (exit code ${code})

📤 Installation output:
${output}

❌ Error details:
${filteredError}

💡 Common solutions:
1. Check your internet connection
2. Ensure you have Administrator privileges
3. Try running in a regular Terminal.app
4. Check Homebrew's troubleshooting guide`);
        } else {
          resolve(`[Error] Sudo command failed with code ${code}\n${filteredError}`);
        }
      }
    });

    sudoProcess.on('error', (err) => {
      console.error(`Sudo process error: ${err.message}`);
      resolve(`[Error] ${err.message}`);
    });

    // Timeout appropriato basato sul tipo di comando
    const timeoutMinutes = isInteractiveInstaller ? 20 : 5;
    setTimeout(() => {
      sudoProcess.kill('SIGTERM');
      resolve(`[Timeout] Sudo command timed out after ${timeoutMinutes} minutes\n\nOutput: ${output}\nErrors: ${errorOutput}`);
    }, timeoutMinutes * 60 * 1000);
  });
});

// Funzione per eseguire comandi interattivi con spawn migliorato
function runCommandWithPty(command, resolve) {
  return runCommandWithEnhancedSpawn(command, resolve);
}

// Funzione per comandi interattivi usando spawn ottimizzato
function runCommandWithEnhancedSpawn(command, resolve) {
  try {
  const childProcess = spawn('bash', ['-c', command], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        FORCE_COLOR: '1',
        // Rimuovi variabili che interferiscono con Homebrew
        CI: undefined,
        DEBIAN_FRONTEND: undefined,
        // Per Homebrew specificamente
        HOMEBREW_NO_AUTO_UPDATE: '1',
        HOMEBREW_NO_INSTALL_CLEANUP: '1',
        // Simula ambiente interattivo
        INTERACTIVE: '1'
      },
      cwd: currentWorkingDirectory
    });

    let output = '';
    let errorOutput = '';

    childProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve(output || '[Success] Command executed successfully');
      } else {
        // Analizza specificamente gli errori di Homebrew
        if (command.includes('install.sh') && command.includes('Homebrew')) {
          if (errorOutput.includes('Need sudo access')) {
            resolve(`[Info] Homebrew installation needs sudo access.

� The installer detected that you need administrator privileges.

🎯 Here's what you can do:

1. � Use the built-in sudo support:
   sudo /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   This will show a secure password dialog.

2. 🍺 Or install in Terminal.app (recommended):
   - Open Terminal.app
   - Run: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   - Follow the interactive prompts
   - Then use brew commands in TermInA

📄 Installation output:
${output}

⚠️ Error details:
${errorOutput}`);
          } else {
            resolve(`[Error] Homebrew installation failed with code ${code}

📤 Command output:
${output}

❌ Error details:
${errorOutput}

💡 Try installing in Terminal.app for full interactive support.`);
          }
        } else {
          resolve(`[Error] Command failed with code ${code}

📤 Command output:
${output}

❌ Error details:
${errorOutput}`);
        }
      }
    });

    childProcess.on('error', (err) => {
      resolve(`[Error] Failed to execute command: ${err.message}`);
    });

    // Timeout di sicurezza
    setTimeout(() => {
      childProcess.kill('SIGTERM');
      resolve(`[Timeout] Command timed out after 5 minutes\n\nOutput received:\n${output}\n\nErrors:\n${errorOutput}`);
    }, 5 * 60 * 1000);

  } catch (error) {
    resolve(`[Error] Failed to create process: ${error.message}`);
  }
}

// Gestione configurazione
ipcMain.handle('get-config', async (event, key) => {
  return key ? config.get(key) : config.config;
});

ipcMain.handle('set-config', async (event, key, value) => {
  return config.set(key, value);
});

ipcMain.handle('get-ai-providers', async () => {
  return aiManager.getAvailableProviders().map(provider => ({
    id: provider,
    name: provider.charAt(0).toUpperCase() + provider.slice(1),
    configured: aiManager.isProviderConfigured(provider)
  }));
});

// Nuovo handler per testare la connessione AI
ipcMain.handle('test-ai-connection', async (event, provider, testConfig) => {
  try {
    // Salva temporaneamente la configurazione
    const originalConfig = config.getAIConfig();
    config.set('ai', testConfig);
    
    // Test della connessione
    const testPrompt = "Test connection - respond with 'OK' if you can read this.";
    const response = await aiManager.request(testPrompt, []);
    
    // Ripristina la configurazione originale
    config.set('ai', originalConfig);
    
    return {
      success: true,
      response: response
    };
  } catch (error) {
    // Ripristina la configurazione originale in caso di errore
    const originalConfig = config.getAIConfig();
    config.set('ai', originalConfig);
    
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('reset-config', async () => {
  return config.resetToDefaults();
});

ipcMain.handle('save-config', async (event, newConfig) => {
  return config.saveFullConfig(newConfig);
});

ipcMain.handle('open-settings', () => {
  createSettingsWindow();
});

ipcMain.handle('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

// Gestori per messaggi in tempo reale dalle impostazioni
ipcMain.on('preview-settings', (event, previewConfig) => {
  // Invia l'anteprima alla finestra principale
  if (mainWindow) {
    mainWindow.webContents.send('settings-preview', previewConfig);
  }
});

ipcMain.on('settings-saved', (event, newConfig) => {
  // Invia le nuove impostazioni alla finestra principale per applicarle
  if (mainWindow) {
    mainWindow.webContents.send('settings-changed', newConfig);
  }
});

// Gestori per i controlli finestra
ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

// Handler per WebScraper e integrazione web
ipcMain.handle('web-search', async (event, query, searchEngine = 'google', maxResults = 5) => {
  try {
    return await webScraper.searchWeb(query, searchEngine, maxResults);
  } catch (error) {
    console.error('Errore ricerca web:', error);
    return {
      success: false,
      error: error.message,
      query: query,
      searchEngine: searchEngine
    };
  }
});

ipcMain.handle('get-web-search-stats', async () => {
  try {
    return webAIIntegration.getSearchStats();
  } catch (error) {
    console.error('Errore statistiche web:', error);
    return {
      totalSearches: 0,
      searchesPerformed: 0,
      averageConfidence: 0,
      mostCommonReasons: []
    };
  }
});

ipcMain.handle('get-web-search-history', async () => {
  try {
    return webAIIntegration.getSearchHistory();
  } catch (error) {
    console.error('Errore cronologia web:', error);
    return [];
  }
});

ipcMain.handle('clear-web-search-history', async () => {
  try {
    webAIIntegration.clearSearchHistory();
    return { success: true };
  } catch (error) {
    console.error('Errore pulizia cronologia web:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-web-search-confidence-threshold', async (event, threshold) => {
  try {
    const success = webAIIntegration.setConfidenceThreshold(threshold);
    return { success: success };
  } catch (error) {
    console.error('Errore impostazione soglia web:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-web-search-confidence-threshold', async () => {
  try {
    return webAIIntegration.confidenceThreshold;
  } catch (error) {
    console.error('Errore lettura soglia web:', error);
    return 0.7;
  }
});

ipcMain.handle('is-web-service-available', async () => {
  try {
    return await webAIIntegration.isServiceAvailable();
  } catch (error) {
    console.error('Errore verifica disponibilità web:', error);
    return false;
  }
});

// ELECTRON WINDOW
function createWindow() {
  const windowConfig = config.getWindowConfig();
  
  // Create the browser window with proper configuration
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // macOS style without custom controls
    titleBarOverlay: false,
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    backgroundColor: '#1e1e1e',
    vibrancy: 'dark'
  });

  mainWindow.loadFile('renderer/index.html');
  
  // Mostra la finestra quando è pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Sempre apri DevTools per debug (commentato per produzione)
    // mainWindow.webContents.openDevTools();
  });

  // Gestione shortcuts globali
  registerGlobalShortcuts();
  
  // Menu personalizzato
  createMenu();
  
  mainWindow.on('closed', () => {
    mainWindow = null;
    globalShortcut.unregisterAll();
  });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    parent: mainWindow,
    modal: true,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'dark',
    transparent: true,
    frame: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false
    },
    show: false,
    backgroundColor: config.get('theme.background')
  });

  settingsWindow.loadFile('renderer/settings.html');
  
  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function registerGlobalShortcuts() {
  const shortcuts = config.get('shortcuts');
  
  // Registra le scorciatoie globali
  globalShortcut.register(shortcuts.toggleAI, () => {
    if (mainWindow) {
      mainWindow.webContents.send('toggle-ai');
    }
  });

  globalShortcut.register(shortcuts.settings, () => {
    createSettingsWindow();
  });

  globalShortcut.register(shortcuts.clearTerminal, () => {
    if (mainWindow) {
      mainWindow.webContents.send('clear-terminal');
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'Termina',
      submenu: [
        {
          label: 'Informazioni su Termina',
          click: () => {
            // Mostra finestra about
          }
        },
        { type: 'separator' },
        {
          label: 'Impostazioni...',
          accelerator: 'CmdOrCtrl+,',
          click: () => createSettingsWindow()
        },
        { type: 'separator' },
        {
          label: 'Nascondi Termina',
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Esci',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Modifica',
      submenu: [
        { label: 'Annulla', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Ripeti', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Taglia', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copia', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Incolla', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Seleziona tutto', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
      ]
    },
    {
      label: 'Terminale',
      submenu: [
        {
          label: 'Nuovo Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('new-tab');
            }
          }
        },
        {
          label: 'Chiudi Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('close-tab');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Pulisci terminale',
          accelerator: 'CmdOrCtrl+K',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('clear-terminal');
            }
          }
        }
      ]
    },
    {
      label: 'AI',
      submenu: [
        {
          label: 'Toggle AI Panel',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('toggle-ai');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Cambia Provider AI...',
          click: () => createSettingsWindow()
        }
      ]
    },
    {
      label: 'Visualizza',
      submenu: [
        { label: 'Ricarica', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Forza ricarica', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Strumenti sviluppatore', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Zoom avanti', accelerator: 'CmdOrCtrl+Plus', role: 'zoomin' },
        { label: 'Zoom indietro', accelerator: 'CmdOrCtrl+-', role: 'zoomout' },
        { label: 'Zoom normale', accelerator: 'CmdOrCtrl+0', role: 'resetzoom' },
        { type: 'separator' },
        { label: 'Schermo intero', accelerator: 'Ctrl+Command+F', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Finestra',
      submenu: [
        { label: 'Riduci', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Chiudi', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});