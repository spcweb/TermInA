// Rilevatore di lingua per l'AI Assistant
class LanguageDetector {
  constructor() {
    // Parole chiave comuni per identificare le lingue
    this.languagePatterns = {
      italian: {
        keywords: [
          'ciao', 'salve', 'buongiorno', 'buonasera', 'buonanotte', 'arrivederci', 'addio',
          'come', 'cosa', 'dove', 'quando', 'perché', 'perche', 'chi', 'quale', 'quanto',
          'spiegami', 'dimmi', 'mostrami', 'aiutami', 'puoi', 'riesci', 'vorrei',
          'cancella', 'elimina', 'crea', 'installa', 'configura', 'imposta',
          'file', 'cartella', 'directory', 'comando', 'terminale', 'sistema',
          'grazie', 'prego', 'scusa', 'perfetto', 'bene', 'male', 'problema',
          'errore', 'funziona', 'non', 'sì', 'si', 'no', 'fatto', 'ok', 'okay',
          'rispondi', 'rispondimi', 'senza', 'cercare', 'cerca', 'web', 'internet',
          'nel', 'nella', 'dello', 'della', 'degli', 'delle'
        ],
        articles: ['il', 'la', 'lo', 'gli', 'le', 'un', 'una', 'uno'],
        prepositions: ['di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'del', 'della', 'dello', 'degli', 'delle']
      },
      english: {
        keywords: [
          'hello', 'hi', 'hey', 'goodbye', 'bye', 'good morning', 'good evening', 'good night',
          'how', 'what', 'where', 'when', 'why', 'who', 'which', 'how much', 'how many',
          'explain', 'tell', 'show', 'help', 'can', 'could', 'would', 'should',
          'delete', 'remove', 'create', 'install', 'configure', 'setup', 'set',
          'file', 'folder', 'directory', 'command', 'terminal', 'system',
          'thanks', 'thank you', 'please', 'sorry', 'perfect', 'good', 'bad', 'problem',
          'error', 'works', 'not', 'yes', 'no', 'done', 'ok', 'okay'
        ],
        articles: ['the', 'a', 'an'],
        prepositions: ['of', 'from', 'in', 'with', 'on', 'for', 'between', 'about', 'at', 'by', 'to']
      },
      spanish: {
        keywords: [
          'cómo', 'como', 'qué', 'que', 'dónde', 'donde', 'cuándo', 'cuando', 'por qué', 'porque', 'quién', 'quien', 'cuál', 'cual', 'cuánto', 'cuanto',
          'explícame', 'dime', 'muéstrame', 'ayúdame', 'puedes', 'podrías', 'quisiera',
          'borrar', 'eliminar', 'crear', 'instalar', 'configurar', 'establecer',
          'archivo', 'carpeta', 'directorio', 'comando', 'terminal', 'sistema',
          'gracias', 'por favor', 'perdón', 'perfecto', 'bien', 'mal', 'problema',
          'error', 'funciona', 'no', 'sí', 'si'
        ],
        articles: ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas'],
        prepositions: ['de', 'desde', 'en', 'con', 'sobre', 'para', 'entre', 'del', 'al']
      },
      french: {
        keywords: [
          'comment', 'quoi', 'où', 'ou', 'quand', 'pourquoi', 'qui', 'quel', 'quelle', 'combien',
          'explique', 'dis', 'montre', 'aide', 'peux', 'pourrais', 'voudrais',
          'supprimer', 'effacer', 'créer', 'installer', 'configurer', 'paramétrer',
          'fichier', 'dossier', 'répertoire', 'commande', 'terminal', 'système',
          'merci', 'sil vous plaît', 'pardon', 'parfait', 'bien', 'mal', 'problème',
          'erreur', 'fonctionne', 'non', 'oui'
        ],
        articles: ['le', 'la', 'les', 'un', 'une', 'des'],
        prepositions: ['de', 'du', 'des', 'dans', 'avec', 'sur', 'pour', 'entre', 'chez']
      },
      german: {
        keywords: [
          'wie', 'was', 'wo', 'wann', 'warum', 'wer', 'welche', 'welcher', 'wieviel',
          'erkläre', 'sage', 'zeige', 'hilf', 'kannst', 'könntest', 'möchte',
          'löschen', 'entfernen', 'erstellen', 'installieren', 'konfigurieren', 'einrichten',
          'datei', 'ordner', 'verzeichnis', 'befehl', 'terminal', 'system',
          'danke', 'bitte', 'entschuldigung', 'perfekt', 'gut', 'schlecht', 'problem',
          'fehler', 'funktioniert', 'nicht', 'ja', 'nein'
        ],
        articles: ['der', 'die', 'das', 'ein', 'eine', 'einen', 'einem', 'einer'],
        prepositions: ['von', 'aus', 'in', 'mit', 'auf', 'für', 'zwischen', 'über', 'unter']
      }
    };
  }

  detectLanguage(text) {
    if (!text || typeof text !== 'string') {
      return 'english'; // Default fallback
    }

    const normalizedText = text.toLowerCase();
    const words = normalizedText.split(/\s+/);
    
    const scores = {};
    
    // Inizializza i punteggi
    Object.keys(this.languagePatterns).forEach(lang => {
      scores[lang] = 0;
    });

    // Calcola il punteggio per ogni lingua
    Object.keys(this.languagePatterns).forEach(lang => {
      const patterns = this.languagePatterns[lang];
      
      // Controlla parole chiave
      patterns.keywords.forEach(keyword => {
        if (normalizedText.includes(keyword)) {
          scores[lang] += 3; // Peso alto per le parole chiave
        }
      });
      
      // Controlla articoli
      patterns.articles.forEach(article => {
        words.forEach(word => {
          if (word === article) {
            scores[lang] += 2; // Peso medio per gli articoli
          }
        });
      });
      
      // Controlla preposizioni
      patterns.prepositions.forEach(prep => {
        words.forEach(word => {
          if (word === prep) {
            scores[lang] += 1; // Peso basso per le preposizioni
          }
        });
      });
    });

    // Trova la lingua con il punteggio più alto
    let detectedLanguage = 'english';
    let maxScore = 0;
    
    Object.keys(scores).forEach(lang => {
      if (scores[lang] > maxScore) {
        maxScore = scores[lang];
        detectedLanguage = lang;
      }
    });

    // Se nessuna lingua ha un punteggio significativo, usa euristica basata su caratteri
    if (maxScore < 2) {
      detectedLanguage = this.detectByCharacteristics(normalizedText);
    }

    console.log('Language detection scores:', scores);
    console.log('Detected language:', detectedLanguage);
    
    return detectedLanguage;
  }

  detectByCharacteristics(text) {
    // Caratteri specifici per lingua
    if (/[àèéìíîòóù]/.test(text)) return 'italian';
    if (/[áéíñóúü¿¡]/.test(text)) return 'spanish';
    if (/[àâäéèêëïîôöùûüÿç]/.test(text)) return 'french';
    if (/[äöüß]/.test(text)) return 'german';
    
    return 'english';
  }

  getLanguageInstruction(language) {
    const instructions = {
      italian: "Rispondi SEMPRE in italiano. Usa un tono professionale ma amichevole.",
      english: "Always respond in English. Use a professional but friendly tone.",
      spanish: "Responde SIEMPRE en español. Usa un tono profesional pero amigable.",
      french: "Réponds TOUJOURS en français. Utilise un ton professionnel mais amical.",
      german: "Antworte IMMER auf Deutsch. Verwende einen professionellen aber freundlichen Ton."
    };
    
    return instructions[language] || instructions.english;
  }

  getLanguageCode(language) {
    const codes = {
      italian: 'it',
      english: 'en',
      spanish: 'es',
      french: 'fr',
      german: 'de'
    };
    
    return codes[language] || 'en';
  }
}

module.exports = LanguageDetector;
