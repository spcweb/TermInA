# AI Language Auto-Detection

## Overview

TermInA includes automatic language detection for AI requests. The AI will reply in the same language as the prompt, making the experience natural for international users.

## Supported languages

- Italian (it)
- English (en) — fallback
- Spanish (es)
- French (fr)
- German (de)

## How it works

1) Detection: when a request is sent to the AI, we analyze the text to infer its language
2) Instruction: we add a language-specific instruction to the prompt
3) Response: the AI answers in the appropriate language

## Detection approach

Multi-layer heuristic:

### 1) Keyword analysis
- Interrogatives: come, cosa, where, how, etc.
- Common verbs: spiegami, aiutami, explain, help, etc.
- Technical nouns: file, cartella, comando, etc.

### 2) Grammar hints
- Articles: il/la/lo (IT), the/a/an (EN), etc.
- Prepositions: di/da/in (IT), of/from/in (EN), etc.

### 3) Script-specific characters
- Italian accents: à, è, é, ì, ò, ù
- Spanish accents: á, é, í, ñ, ó, ú, ü, ¿, ¡
- French characters: à, â, ä, é, è, ê, ë, etc.
- German characters: ä, ö, ü, ß

## Examples

Italian
```
ai Come posso installare Node.js?
→ AI risponde in italiano
```

English
```
ai How can I install Node.js?
→ AI responds in English
```

Spanish
```
ai ¿Cómo puedo instalar Node.js?
→ La IA responde en español
```

French
```
ai Comment installer Node.js?
→ L'AI répond en français
```

German
```
ai Wie installiere ich Node.js?
→ AI antwortet auf Deutsch
```

## Edge cases

- Pure commands (e.g., `ls -la`): fallback to English
- Empty strings: fallback to English
- Mixed text: pick the dominant language
- Ambiguous text: fallback to English

## Configuration

This is enabled by default; no setup required. It applies to all AI commands:

- `ai <question>`
- `ask <question>`
- `execute <task>`
- `run <task>`

## Related files

- `src/language-detector.js` — detection heuristics
- `src/ai-manager.js` — AI pipeline integration
- `src/ai-agent.js` — agent integration

## Benefits

1) Natural UX for non-English users
2) Zero configuration
3) Accurate heuristics across five languages
4) Robust handling of edge cases

## Manual testing

Try different prompts in the terminal using the commands above and verify the response language matches the input.
