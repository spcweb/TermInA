// Rilevamento informazioni di sistema e percorsi standard
// Gestisce differenze tra piattaforme e fornisce percorsi reali, con supporto XDG su Linux.
// Nota: i nomi mostrati nelle GUI possono essere localizzati (es. "Scrivania"),
// ma i nomi delle cartelle reali nel filesystem sono quelli riportati qui.

const os = require('os');
const path = require('path');
const fs = require('fs');

function directoryIfExists(dir) {
  try {
    if (dir && fs.existsSync(dir)) return dir;
  } catch (_) {}
  return null;
}

function expandHome(p, home) {
  if (!p) return null;
  return p.replace(/^\$HOME/, home);
}

function parseXdgUserDirs() {
  // Linux: ~/.config/user-dirs.dirs definisce le directory utente
  const home = os.homedir();
  const cfg = path.join(home, '.config', 'user-dirs.dirs');
  const result = {};
  try {
    if (!fs.existsSync(cfg)) return result;
    const content = fs.readFileSync(cfg, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const m = trimmed.match(/^XDG_(\w+)_DIR=(?:\"([^\"]+)\"|'([^']+)'|(.+))$/);
      if (m) {
        const key = m[1];
        const val = expandHome((m[2] || m[3] || m[4] || '').trim(), home);
        if (val) result[key] = val;
      }
    }
  } catch (_) {}
  return result;
}

function detectDirs() {
  const platform = os.platform();
  const home = os.homedir();

  // Predefiniti comuni
  let desktop = path.join(home, 'Desktop');
  let documents = path.join(home, 'Documents');
  let downloads = path.join(home, 'Downloads');
  let pictures = path.join(home, 'Pictures');
  let music = path.join(home, 'Music');
  let videos = path.join(home, platform === 'darwin' ? 'Movies' : 'Videos');
  let publicShare = path.join(home, 'Public');
  let templates = path.join(home, 'Templates');

  if (platform === 'linux') {
    // Supporto XDG
    const xdg = parseXdgUserDirs();
    desktop = directoryIfExists(xdg.DESKTOP || desktop) || desktop;
    documents = directoryIfExists(xdg.DOCUMENTS || documents) || documents;
    downloads = directoryIfExists(xdg.DOWNLOAD || downloads) || downloads;
    pictures = directoryIfExists(xdg.PICTURES || pictures) || pictures;
    music = directoryIfExists(xdg.MUSIC || music) || music;
    videos = directoryIfExists(xdg.VIDEOS || videos) || videos;
    publicShare = directoryIfExists(xdg.PUBLICSHARE || publicShare) || publicShare;
    templates = directoryIfExists(xdg.TEMPLATES || templates) || templates;
  } else if (platform === 'win32') {
    // Windows: usa convenzioni note nella home (USERPROFILE)
    // Nota: per robustezza manteniamo fallback se cartelle non esistono.
    desktop = directoryIfExists(path.join(home, 'Desktop')) || desktop;
    documents = directoryIfExists(path.join(home, 'Documents')) || documents;
    downloads = directoryIfExists(path.join(home, 'Downloads')) || downloads;
    pictures = directoryIfExists(path.join(home, 'Pictures')) || pictures;
    music = directoryIfExists(path.join(home, 'Music')) || music;
    videos = directoryIfExists(path.join(home, 'Videos')) || videos;
    publicShare = directoryIfExists(path.join(home, 'Public')) || publicShare;
    templates = directoryIfExists(path.join(home, 'Templates')) || templates;
  } else if (platform === 'darwin') {
    // macOS: nomi standard
    desktop = directoryIfExists(path.join(home, 'Desktop')) || desktop;
    documents = directoryIfExists(path.join(home, 'Documents')) || documents;
    downloads = directoryIfExists(path.join(home, 'Downloads')) || downloads;
    pictures = directoryIfExists(path.join(home, 'Pictures')) || pictures;
    music = directoryIfExists(path.join(home, 'Music')) || music;
    videos = directoryIfExists(path.join(home, 'Movies')) || videos;
    publicShare = directoryIfExists(path.join(home, 'Public')) || publicShare;
    templates = directoryIfExists(path.join(home, 'Templates')) || templates;
  }

  return {
    desktopDir: directoryIfExists(desktop) || home,
    documentsDir: directoryIfExists(documents) || home,
    downloadsDir: directoryIfExists(downloads) || home,
    picturesDir: directoryIfExists(pictures) || home,
    musicDir: directoryIfExists(music) || home,
    videosDir: directoryIfExists(videos) || home,
    publicDir: directoryIfExists(publicShare) || home,
    templatesDir: directoryIfExists(templates) || home,
  };
}

function detectShell() {
  // Prova SHELL su Unix-like, su Windows prova ComSpec o PowerShell default
  const platform = os.platform();
  if (platform === 'win32') {
    // Rileva se PowerShell è in uso come default (best-effort)
    // Non sempre affidabile; esponiamo info generica.
    return process.env.COMSPEC && process.env.COMSPEC.toLowerCase().includes('powershell')
      ? 'powershell'
      : 'cmd';
  }
  return process.env.SHELL || 'bash';
}

const base = {
  platform: os.platform(), // 'darwin', 'win32', 'linux'
  type: os.type(),
  release: os.release(),
  arch: os.arch(),
  homeDir: os.homedir(),
  shell: detectShell(),
};

const dirs = detectDirs();

const systemInfo = {
  ...base,
  ...dirs,
};

module.exports = systemInfo;