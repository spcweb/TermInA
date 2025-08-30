// Rilevatore di lingua per l'AI Agent
class LanguageDetector {
  constructor() {
    // Mappatura delle lingue più comuni con i loro identificatori
    this.languagePatterns = {
      'italiano': {
        patterns: [
          /\b(come|cosa|quando|dove|perché|chi|quale|quali|quanto|quanta|quanti|quante)\b/i,
          /\b(aiutami|aiuto|vorrei|posso|devo|voglio|crea|elimina|trova|mostra|apri|chiudi)\b/i,
          /\b(per favore|grazie|scusa|mi dispiace|va bene|ok|si|no)\b/i,
          /\b(file|cartella|directory|percorso|comando|terminal|sistema)\b/i
        ],
        response: 'Rispondi sempre in italiano, mantenendo un tono professionale ma amichevole.'
      },
      'english': {
        patterns: [
          /\b(how|what|when|where|why|who|which|how much|how many)\b/i,
          /\b(help|please|can you|could you|would you|i want|i need|create|delete|find|show|open|close)\b/i,
          /\b(thank you|thanks|sorry|excuse me|okay|ok|yes|no)\b/i,
          /\b(file|folder|directory|path|command|terminal|system)\b/i
        ],
        response: 'Always respond in English, maintaining a professional but friendly tone.'
      },
      'español': {
        patterns: [
          /\b(cómo|qué|cuándo|dónde|por qué|quién|cuál|cuáles|cuánto|cuánta|cuántos|cuántas)\b/i,
          /\b(ayúdame|ayuda|quisiera|puedo|debo|quiero|crea|elimina|encuentra|muestra|abre|cierra)\b/i,
          /\b(por favor|gracias|perdón|lo siento|está bien|ok|sí|no)\b/i,
          /\b(archivo|carpeta|directorio|ruta|comando|terminal|sistema)\b/i
        ],
        response: 'Responde siempre en español, manteniendo un tono profesional pero amigable.'
      },
      'français': {
        patterns: [
          /\b(comment|quoi|quand|où|pourquoi|qui|quel|quelle|quels|quelles|combien)\b/i,
          /\b(aide|aide-moi|voudrais|peux|dois|veux|crée|supprime|trouve|montre|ouvre|ferme)\b/i,
          /\b(s\'il vous plaît|merci|désolé|excusez-moi|d\'accord|ok|oui|non)\b/i,
          /\b(fichier|dossier|répertoire|chemin|commande|terminal|système)\b/i
        ],
        response: 'Répondez toujours en français, en maintenant un ton professionnel mais amical.'
      },
      'deutsch': {
        patterns: [
          /\b(wie|was|wann|wo|warum|wer|welche|welcher|welches|wie viel|wie viele)\b/i,
          /\b(hilfe|hilf|möchte|kann|muss|will|erstelle|lösche|finde|zeige|öffne|schließe)\b/i,
          /\b(bitte|danke|entschuldigung|tut mir leid|okay|ok|ja|nein)\b/i,
          /\b(datei|ordner|verzeichnis|pfad|befehl|terminal|system)\b/i
        ],
        response: 'Antworten Sie immer auf Deutsch, mit einem professionellen aber freundlichen Ton.'
      },
      'português': {
        patterns: [
          /\b(como|o que|quando|onde|por que|quem|qual|quais|quanto|quanta|quantos|quantas)\b/i,
          /\b(ajuda|ajude-me|gostaria|posso|devo|quero|cria|elimina|encontra|mostra|abre|fecha)\b/i,
          /\b(por favor|obrigado|obrigada|desculpe|sinto muito|ok|sim|não)\b/i,
          /\b(arquivo|pasta|diretorio|caminho|comando|terminal|sistema)\b/i
        ],
        response: 'Responda sempre em português, mantendo um tom profissional mas amigável.'
      },
      'русский': {
        patterns: [
          /\b(как|что|когда|где|почему|кто|какой|какая|какие|сколько)\b/i,
          /\b(помоги|помощь|хочу|могу|должен|создай|удали|найди|покажи|открой|закрой)\b/i,
          /\b(пожалуйста|спасибо|извините|извини|хорошо|ок|да|нет)\b/i,
          /\b(файл|папка|директория|путь|команда|терминал|система)\b/i
        ],
        response: 'Всегда отвечайте на русском языке, сохраняя профессиональный, но дружелюбный тон.'
      },
      '中文': {
        patterns: [
          /\b(如何|什么|何时|哪里|为什么|谁|哪个|多少)\b/i,
          /\b(帮助|请|想要|可以|必须|创建|删除|找到|显示|打开|关闭)\b/i,
          /\b(谢谢|抱歉|对不起|好的|是|否)\b/i,
          /\b(文件|文件夹|目录|路径|命令|终端|系统)\b/i
        ],
        response: '始终用中文回答，保持专业但友好的语调。'
      },
      '日本語': {
        patterns: [
          /\b(どのように|何|いつ|どこ|なぜ|誰|どちら|いくつ|いくら)\b/i,
          /\b(助けて|お願い|したい|できます|しなければ|作成|削除|見つける|表示|開く|閉じる)\b/i,
          /\b(ありがとう|すみません|申し訳ありません|はい|いいえ)\b/i,
          /\b(ファイル|フォルダ|ディレクトリ|パス|コマンド|ターミナル|システム)\b/i
        ],
        response: '常に日本語で回答し、専門的だが親しみやすい口調を保ってください。'
      }
    };
  }

  detectLanguage(text) {
    const scores = {};
    
    // Inizializza i punteggi per tutte le lingue
    Object.keys(this.languagePatterns).forEach(lang => {
      scores[lang] = 0;
    });

    // Analizza il testo per ogni lingua
    Object.entries(this.languagePatterns).forEach(([language, config]) => {
      config.patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          scores[language] += matches.length;
        }
      });
    });

    // Trova la lingua con il punteggio più alto
    let detectedLanguage = 'english'; // Default
    let maxScore = 0;

    Object.entries(scores).forEach(([language, score]) => {
      if (score > maxScore) {
        maxScore = score;
        detectedLanguage = language;
      }
    });

    // Se non ci sono match significativi, prova a rilevare caratteri specifici
    if (maxScore === 0) {
      if (/[\u4e00-\u9fff]/.test(text)) {
        detectedLanguage = '中文';
      } else if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
        detectedLanguage = '日本語';
      } else if (/[\u0400-\u04ff]/.test(text)) {
        detectedLanguage = 'русский';
      } else if (/[àáâãäåçèéêëìíîïñòóôõöùúûüýÿ]/.test(text)) {
        // Caratteri latini con accenti - potrebbe essere italiano, spagnolo, francese o portoghese
        // Usa l'italiano come default per caratteri latini accentati
        detectedLanguage = 'italiano';
      }
    }

    return {
      language: detectedLanguage,
      confidence: maxScore,
      responseInstruction: this.languagePatterns[detectedLanguage]?.response || 
                          'Always respond in English, maintaining a professional but friendly tone.'
    };
  }

  addLanguageInstruction(prompt, detectedLanguage) {
    const instruction = detectedLanguage.responseInstruction;
    
    // Aggiungi l'istruzione all'inizio del prompt
    return `${instruction}\n\n${prompt}`;
  }
}

module.exports = new LanguageDetector();
