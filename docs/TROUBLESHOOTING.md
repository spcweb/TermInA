# �️ TermInA Troubleshooting Guide

Quick guide to diagnose and fix the most common TermInA issues.

## 🚨 Common Issues

### 1) Duplicate window controls
Problem: You see two sets of close/minimize/maximize buttons.
Fix:
- Ensure `titleBarStyle: 'hidden'` in your main window options
- Ensure `frame: true` is set
- Restart the app

### 2) Can't type in the terminal
Problem: The terminal ignores keyboard input.
Fixes:
- Click inside the terminal to give it focus
- Ensure the terminal is properly initialized
- Check the DevTools console for JavaScript errors
- Restart the app

### 3) Window buttons not working
Problem: Close/minimize/maximize buttons don’t respond.
Fixes:
- Verify IPC handlers are registered in main process
- Ensure `preload.js` exposes the expected APIs
- Check that renderer event listeners are wired up

### 4) AI not responding
Problem: `ai:`/`execute`/`run` commands don’t produce output.
Fixes:
- Check the AI provider configuration in Settings
- For cloud providers, verify internet connectivity
- For LM Studio, ensure it’s running on localhost:1234
- For Gemini/OpenAI, verify the API key

### 5) Settings not saved
Problem: App fails to persist preferences.
Fixes:
- Check permissions of `~/.termina/`
- Ensure `~/.termina/config.json` is writable
- As a last resort, remove `~/.termina/config.json` to reset

## � Debug

### Open DevTools
Press `F12` or `Cmd+Option+I` (macOS) / `Ctrl+Shift+I` (Linux/Windows).

### Terminal logs
Use the console to inspect state:
```javascript
// In the renderer
console.log('Terminal state:', this.terminal);
console.log('Config:', this.config);
```

### Config quick check
```bash
# Inspect config file
cat ~/.termina/config.json
```

### Full reset
```bash
# Remove user config (irreversible)
rm -rf ~/.termina/

# Reinstall dependencies and start (from project root)
npm install && npm start
```

## 🔍 Advanced debugging

### 1) Terminal sizing issues
```javascript
// Inside fitTerminal()
console.log('Container rect:', rect);
console.log('Calculated cols/rows:', cols, rows);
console.log('Character dimensions:', charWidth, charHeight);
```

### 2) AI issues
```javascript
// In ai-manager.js
console.log('AI Request:', prompt);
console.log('AI Response:', response);
console.log('Provider config:', aiConfig);
```

### 3) IPC issues
```javascript
// In main process
console.log('IPC handler called:', eventName, args);

// In renderer
console.log('Sending IPC:', method, args);
```

## 📋 Verification checklist

### Before starting
- [ ] Node.js 16+ installed
- [ ] `npm install` completes without errors

### After starting
- [ ] Window opens correctly
- [ ] Only one set of window controls is visible
- [ ] Terminal accepts keyboard input
- [ ] Window buttons work
- [ ] `help` shows usage
- [ ] `settings` opens preferences

### AI
- [ ] Provider configured in Settings
- [ ] `ai: test` returns a response
- [ ] Command suggestions show up
- [ ] Execution with confirmation works

## 🐛 Bug report

If the problem persists:

1) Collect details
- OS version (Linux/macOS)
- Node.js version (`node --version`)
- Screenshots of the issue

2) Console logs
- Open DevTools
- Copy errors from the console
- Include any main-process logs

3) Config file
```bash
cat ~/.termina/config.json
```

4) Create an issue
- Clear description
- Steps to reproduce
- Logs and screenshots
- System configuration

## 🚑 Quick repair script (optional)

```bash
#!/usr/bin/env bash
echo "🔧 Repairing TermInA..."

# Stop any running dev instance
pkill -f "electron ." 2>/dev/null || true

# Reset user config (irreversible)
rm -rf ~/.termina/

# Reinstall dependencies and start (adjust path)
cd /path/to/TermInA
npm install
npm start

echo "✅ Repair completed"
```

## 📞 Support

- GitHub Issues: open an issue in the repository
- Community: Discord server (if available)
- Email: support@termina.app

---

Tip: Keep a backup of `~/.termina/config.json` if you customized settings.
