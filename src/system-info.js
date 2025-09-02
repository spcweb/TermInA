// Rilevamento informazioni di sistema e percorsi standard
// Gestisce differenze tra piattaforme e fornisce percorsi reali
// Nota: su macOS i nomi appaiono localizzati nel Finder (es. "Scrivania"),
// ma il nome reale della cartella è sempre "Desktop" nel filesystem.

const os = require('os');
const path = require('path');
const fs = require('fs');

function directoryIfExists(dir) {
  try {
    if (fs.existsSync(dir)) return dir;
  } catch (_) {}
  return null;
}

function detectDesktopDir() {
  const home = os.homedir();
  const candidates = [
    path.join(home, 'Desktop'), // macOS, Linux, Windows
    path.join(home, 'Scrivania'), // rara eccezione se utente ha rinominato manualmente
  ];
  for (const c of candidates) {
    const found = directoryIfExists(c);
    if (found) return found;
  }
  return home; // fallback
}

function detectDocumentsDir() {
  const home = os.homedir();
  const candidates = [
    path.join(home, 'Documents'),
    path.join(home, 'Documenti'),
  ];
  for (const c of candidates) {
    const found = directoryIfExists(c);
    if (found) return found;
  }
  return home;
}

const systemInfo = {
  platform: os.platform(), // 'darwin', 'win32', 'linux'
  type: os.type(),
  release: os.release(),
  arch: os.arch(),
  homeDir: os.homedir(),
  desktopDir: detectDesktopDir(),
  documentsDir: detectDocumentsDir(),
};

module.exports = systemInfo;