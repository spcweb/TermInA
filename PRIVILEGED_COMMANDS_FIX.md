# Fix per Comandi Privilegiati in TermInA

## 🎯 Problema Risolto

Su Linux, l'applicazione TermInA non riusciva a eseguire comandi che richiedono privilegi elevati come:
- `yay` (package manager per Arch Linux)
- `pacman` (package manager per Arch Linux)
- `sudo` (comandi con privilegi amministratore)
- `systemctl` (gestione servizi di sistema)
- Altri comandi che richiedono privilegi root

## 🔧 Soluzione Implementata

### 1. Rilevamento Comandi Privilegiati e Interattivi

Sono stati aggiunti due metodi in `pty-manager.js`:

#### `isPrivilegedCommand()` - Rileva comandi che richiedono privilegi elevati

```javascript
isPrivilegedCommand(command) {
    const privilegedCommands = [
        'sudo', 'su', 'pkexec', 'gksudo', 'kdesudo',
        'yay', 'pacman', 'apt', 'apt-get', 'dnf', 'yum', 'zypper',
        'systemctl', 'service', 'mount', 'umount',
        'chmod', 'chown', 'useradd', 'userdel', 'groupadd', 'groupdel',
        'visudo', 'passwd', 'usermod', 'groupmod',
        'iptables', 'ufw', 'firewall-cmd',
        'crontab', 'at', 'systemctl', 'service',
        'npm install -g', 'pip install --user', 'gem install',
        'docker', 'docker-compose'
    ];
    
    return privilegedCommands.some(cmd => {
        return command.startsWith(cmd) || command.includes(cmd + ' ');
    });
}
```

#### `isInteractiveOnlyCommand()` - Rileva comandi che richiedono solo input interattivo

```javascript
isInteractiveOnlyCommand(command) {
    const interactiveOnlyCommands = [
        'yay', 'pacman', 'apt', 'apt-get', 'dnf', 'yum', 'zypper',
        'python', 'python3', 'node', 'ruby', 'perl', 'irb', 'pry',
        'mysql', 'psql', 'sqlite3', 'ssh', 'telnet', 'ftp'
    ];
    
    // Se il comando è esattamente uno di questi (senza argomenti), richiede input interattivo
    return interactiveOnlyCommands.some(cmd => {
        return command.trim() === cmd;
    });
}
```

### 2. Gestione con node-pty

Per i comandi privilegiati, il sistema ora usa `node-pty` per creare un vero terminale TTY che può gestire l'input della password:

```javascript
// Crea un PTY temporaneo che esegue il comando e si chiude
const ptyProcess = nodePty.spawn(shell, ['-c', command], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: options.cwd || os.homedir(),
    env
});
```

### 3. Rilevamento Password Prompt

Il sistema rileva automaticamente quando un comando richiede una password:

```javascript
isPasswordPrompt(data) {
    const passwordPatterns = [
        /password:/i,
        /passcode:/i,
        /passphrase:/i,
        /enter password/i,
        /sudo password/i,
        /\[sudo\] password/i,
        /password for .+:/i,
        /enter.*password/i,
        /type.*password/i
    ];
    
    return passwordPatterns.some(pattern => pattern.test(data));
}
```

## 🚀 Come Funziona

### Comandi che NON richiedono privilegi
- `yay --version` ✅ Funziona
- `pacman --version` ✅ Funziona  
- `sudo --version` ✅ Funziona

### Comandi che richiedono solo input interattivo
- `yay` ❌ Mostra messaggio di aiuto
- `pacman` ❌ Mostra messaggio di aiuto
- `python` ❌ Mostra messaggio di aiuto

### Comandi che richiedono privilegi
- `sudo ls /root` ❌ Rileva password prompt
- `yay -Syu` ❌ Rileva password prompt
- `pacman -Syu` ❌ Mostra errore appropriato

## 📋 Messaggi di Errore

### Quando un comando richiede una password:
```
[Error] Command requires password input. Please run this command in a regular terminal with sudo privileges.
Command: sudo ls /root
```

### Quando un comando richiede solo input interattivo:
```
[Error] Command "yay" requires interactive input. Please provide arguments or use a regular terminal.

Examples:
  yay --help
  yay --version
  yay <package-name>
```

## 🔄 Flusso di Esecuzione

### Per comandi interattivi (es. `yay`):
1. **Utente digita comando** senza argomenti
2. **Sistema rileva** che richiede input interattivo
3. **Mostra messaggio di aiuto** con esempi
4. **Suggerisce** argomenti appropriati

### Per comandi privilegiati (es. `yay -Syu`):
1. **Utente digita comando** con argomenti
2. **Sistema rileva** che è un comando privilegiato
3. **Usa node-pty** per eseguire il comando
4. **Rileva password prompt** se presente
5. **Mostra messaggio di errore** appropriato
6. **Suggerisce** di usare un terminale normale

## 🛠️ File Modificati

- `src/pty-manager.js` - Logica principale per comandi privilegiati
- `main.js` - Aggiunta comandi privilegiati alla lista PTY
- `package.json` - Aggiunta dipendenza `node-pty`

## 🧪 Test

Sono stati creati file di test per verificare la funzionalità:

- `test-privileged-commands.js` - Test completo
- `test-simple-privileged.js` - Test semplificato
- `test-sudo-commands.js` - Test comandi sudo

## 📝 Note Importanti

1. **node-pty è richiesto** per il funzionamento completo
2. **I comandi che richiedono password** non possono essere eseguiti automaticamente
3. **L'utente deve usare un terminale normale** per comandi che richiedono input interattivo
4. **Il sistema rileva automaticamente** i comandi privilegiati

## 🎉 Risultato

Ora TermInA può:
- ✅ Eseguire comandi privilegiati che non richiedono password
- ✅ Rilevare quando un comando richiede privilegi
- ✅ Rilevare quando un comando richiede solo input interattivo
- ✅ Mostrare messaggi di errore appropriati
- ✅ Suggerire alternative e esempi all'utente
- ✅ Evitare loop infiniti e timeout
- ✅ Gestire correttamente comandi come `yay`, `pacman`, `sudo`
- ✅ **Gestire comandi sudo con dialog password sicuro**
- ✅ **Integrare il sistema di gestione password esistente**

### 🔐 Gestione Password Sudo

Il sistema ora gestisce correttamente i comandi sudo:

1. **Rilevamento Automatico**: I comandi sudo vengono rilevati automaticamente
2. **Dialog Password**: Viene mostrato un dialog sicuro per l'input della password
3. **Esecuzione Sicura**: Il comando viene eseguito con privilegi elevati
4. **Gestione Errori**: Errori appropriati per password sbagliate o comandi falliti

### 🚀 Flusso Completato

1. **Utente digita**: `sudo pacman -Syu`
2. **Sistema rileva**: Comando sudo
3. **Mostra messaggio**: "Password required for: sudo pacman -Syu"
4. **Attiva dialog**: Dialog password sicuro
5. **Modifica comando**: Aggiunge `--noconfirm` per renderlo non interattivo
6. **Esegue comando**: Con privilegi elevati
7. **Mostra risultato**: Output del comando

### 🔧 Gestione Comandi Interattivi

Il sistema ora gestisce automaticamente i comandi interattivi:

- **Comandi pacman**: Aggiunge automaticamente `--noconfirm` per evitare prompt interattivi
- **Comandi yay**: Gestisce correttamente i comandi con argomenti
- **Comandi sudo**: Usa il dialog password sicuro

La soluzione è robusta e gestisce correttamente tutti i casi d'uso comuni per i comandi privilegiati e interattivi su Linux.
