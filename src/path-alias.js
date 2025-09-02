// Gestione alias di percorsi in linguaggio naturale -> percorsi reali filesystem
// Funziona multi-lingua (IT/EN) e fornisce utility per arricchire i prompt AI.

const systemInfo = require('./system-info');
const path = require('path');

// Directory canoniche (nomi reali sul FS in macOS/Linux/Win) - mac usa sempre questi
const canonicalDirs = {
  desktop: systemInfo.desktopDir,
  documents: systemInfo.documentsDir,
  downloads: path.join(systemInfo.homeDir, 'Downloads'),
  pictures: path.join(systemInfo.homeDir, 'Pictures'),
  photos: path.join(systemInfo.homeDir, 'Pictures'),
  images: path.join(systemInfo.homeDir, 'Pictures'),
  music: path.join(systemInfo.homeDir, 'Music'),
  movies: path.join(systemInfo.homeDir, 'Movies'),
  videos: path.join(systemInfo.homeDir, 'Movies'),
  home: systemInfo.homeDir
};

// Sinonimi in linguaggio naturale (minuscolo) -> chiave canonicalDirs
const aliasMap = {
  // Desktop
  'desktop': 'desktop',
  'scrivania': 'desktop',
  // Documents
  'documenti': 'documents',
  'documents': 'documents',
  'docs': 'documents',
  // Downloads
  'download': 'downloads',
  'downloads': 'downloads',
  'scaricati': 'downloads',
  // Pictures / Photos
  'immagini': 'pictures',
  'immagine': 'pictures',
  'pictures': 'pictures',
  'foto': 'photos',
  'photos': 'photos',
  'image': 'pictures',
  'images': 'pictures',
  // Music
  'musica': 'music',
  'music': 'music',
  // Videos / Movies
  'video': 'movies',
  'videos': 'movies',
  'film': 'movies',
  'movies': 'movies',
  // Home
  'home': 'home',
  'cartella personale': 'home',
  'directory personale': 'home'
};

// Costruiamo una regex unica per trovare tutte le parole chiave
const aliasRegex = new RegExp(`\\b(${Object.keys(aliasMap).map(k => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'gi');

function findAliasesInText(text) {
  const found = new Map();
  if (!text) return found;
  const lower = text.toLowerCase();
  let match;
  while ((match = aliasRegex.exec(lower)) !== null) {
    const word = match[1];
    const canonicalKey = aliasMap[word];
    if (canonicalKey && !found.has(word)) {
      found.set(word, canonicalKey);
    }
  }
  return found;
}

function buildAliasMappingList() {
  // Reverse map canonical -> lista alias
  const reverse = {};
  for (const [alias, key] of Object.entries(aliasMap)) {
    if (!reverse[key]) reverse[key] = new Set();
    reverse[key].add(alias);
  }
  return Object.entries(reverse).map(([key, set]) => {
    const pathValue = canonicalDirs[key] || '(sconosciuto)';
    return `${key} => ${pathValue} (alias: ${Array.from(set).join(', ')})`;
  }).join('\n');
}

function enrichPromptWithAliasInfo(originalPrompt) {
  const detected = findAliasesInText(originalPrompt);
  if (detected.size === 0) {
    return {
      prompt: originalPrompt,
      note: ''
    };
  }
  const parts = [];
  for (const [alias, key] of detected.entries()) {
    const realPath = canonicalDirs[key];
    if (realPath) {
      parts.push(`"${alias}" -> ${realPath}`);
    }
  }
  const note = parts.length ? `Alias percorsi rilevati: ${parts.join('; ')}` : '';
  // Non alteriamo il testo utente, aggiungiamo solo nota che verrà inserita nel prompt contestuale
  return {
    prompt: originalPrompt,
    note
  };
}

function getCanonicalPathForAlias(alias) {
  const key = aliasMap[alias.toLowerCase()];
  return key ? canonicalDirs[key] : null;
}

module.exports = {
  canonicalDirs,
  aliasMap,
  findAliasesInText,
  buildAliasMappingList,
  enrichPromptWithAliasInfo,
  getCanonicalPathForAlias
};
