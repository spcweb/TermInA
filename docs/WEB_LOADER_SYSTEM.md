# WebScraper Loader System

Progressive loader UX for the webscraper + AI agent integration.

## Overview

The loader provides clear visual feedback during web searches, showing progress and the current processing stage.

## Loader Phases

### 1) Initial Phase
**Message**: `🤖 Analyzing request...`  
**Timing**: Immediate  
**Description**: The AI analyzes the prompt to determine if a web search is needed.

### 2) Extended Analysis
**Message**: `🤖 Analyzing (may search web)...`  
**Timing**: After 1 second  
**Description**: The AI is still analyzing and may decide to search online.

### 3) Likely Web Search
**Message**: `🌐 Likely searching internet...`  
**Timing**: After 3 seconds  
**Description**: The AI will likely perform a web search.

## Response Types and Loaders

### Web Enhanced (`web_enhanced`)
When the AI actually searches the web:

```
🌐 Looking on internet...          [800ms]
🔍 Searching for: [query]          [600ms]
📊 Integrating results...          [400ms]
[Final result]
```

**CSS**: `.web-search-loading` with spin animation

### Local Only (`local_only`)
When only local knowledge is used:

```
🧠 Using local knowledge...        [500ms]
[Final result]
```

**CSS**: `.ai-thinking` with pulse animation

### Fallback (`fallback`)
When the web search fails:

```
🌐 Attempting to look on internet... [1000ms]
⚠️ Web search failed, using local knowledge... [800ms]
[Final result]
```

**CSS**: `.web-search-loading` transitioning to warning

## CSS Styles

### Base Loader
```css
.web-search-loading {
  color: var(--accent-blue);
  font-style: italic;
  animation: webSearchPulse 2s ease-in-out infinite;
  position: relative;
  padding-left: 20px;
}
```

### Spinner Icon
```css
.web-search-loading::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  border: 2px solid var(--accent-blue);
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: webSearchSpin 1s linear infinite;
}
```

### Animations
```css
@keyframes webSearchPulse {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}

@keyframes webSearchSpin {
  0% { transform: translateY(-50%) rotate(0deg); }
  100% { transform: translateY(-50%) rotate(360deg); }
}
```

## Technical Implementation

### Progressive Timeouts
```javascript
const progressTimeouts = [];

// Dopo 1 secondo
progressTimeouts.push(setTimeout(() => {
    thinkingMessageElement.textContent = '🤖 Analyzing (may search web)...';
}, 1000));

// Dopo 3 secondi
progressTimeouts.push(setTimeout(() => {
    thinkingMessageElement.textContent = '🌐 Likely searching internet...';
    thinkingMessageElement.className = 'web-search-loading';
}, 3000));
```

### Timeout Cleanup
```javascript
// Pulizia normale
progressTimeouts.forEach(timeout => clearTimeout(timeout));

// Pulizia in caso di errore
if (typeof progressTimeouts !== 'undefined') {
    progressTimeouts.forEach(timeout => clearTimeout(timeout));
}
```

### Progressive Loader for Web Enhanced
```javascript
async showWebSearchLoader(loadingElement, searchQuery) {
    const loadingSteps = [
        { text: '🌐 Looking on internet...', duration: 800 },
        { text: `🔍 Searching for: ${searchQuery}`, duration: 600 },
        { text: '📊 Integrating results...', duration: 400 }
    ];
    
    for (const step of loadingSteps) {
        if (loadingElement.parentNode) {
            loadingElement.textContent = step.text;
            loadingElement.className = 'web-search-loading';
            await new Promise(resolve => setTimeout(resolve, step.duration));
        }
    }
}
```

## User Experience

### Scenario 1: Successful Web Search
```
🤖 Analyzing request...
🤖 Analyzing (may search web)...      [dopo 1s]
🌐 Likely searching internet...       [dopo 3s]
🌐 Looking on internet...             [durante web_enhanced]
🔍 Searching for: Bitcoin price       [durante web_enhanced]
📊 Integrating results...             [durante web_enhanced]
🌐 [Risposta finale con info web]
```

### Scenario 2: Local Only
```
🤖 Analyzing request...
🤖 Analyzing (may search web)...      [dopo 1s]
🧠 Using local knowledge...           [durante local_only]
🤖 [Risposta finale locale]
```

### Scenario 3: Fallback
```
🤖 Analyzing request...
🌐 Likely searching internet...       [dopo 3s]
🌐 Attempting to look on internet... [durante fallback]
⚠️ Web search failed...              [durante fallback]
🤖 [Risposta finale locale]
```

## Configuration

### Configurable Timings
Loader timings can be configured by adjusting the timeouts:

```javascript
// Timing attuali
const ANALYZE_TIMEOUT = 1000;      // 1 secondo
const WEB_LIKELY_TIMEOUT = 3000;   // 3 secondi
const WEB_STEP_DURATION = 800;     // 800ms per step
```

### Customizable Messages
Messages can be localized for different languages:

```javascript
const LOADER_MESSAGES = {
  it: {
    analyzing: '🤖 Analyzing request...',
    maySearchWeb: '🤖 Analyzing (may search web)...',
    likelySearching: '🌐 Likely searching internet...',
    lookingOnline: '🌐 Looking on internet...',
    usingLocal: '🧠 Using local knowledge...'
  },
  en: {
    analyzing: '🤖 Analyzing request...',
    maySearchWeb: '🤖 Analyzing (may search web)...',
    likelySearching: '🌐 Likely searching internet...',
    lookingOnline: '🌐 Looking on internet...',
    usingLocal: '🧠 Using local knowledge...'
  }
};
```

## Testing and Debugging

### Loader Test
```bash
# Test completo del loader
node test-loader.js

# Test specifico delle animazioni
# (da eseguire nel terminale dell'app)
ai: Qual è il prezzo di Bitcoin?
```

### Timing Debug
```javascript
// Abilita log per debug timing
console.time('AI Request');
const result = await window.electronAPI.aiAgentRequestWithWeb(...);
console.timeEnd('AI Request');
```

### Animation Verification
- **Spinner**: Should spin continuously during web search
- **Pulse**: Should pulse during analysis
- **Transitions**: Should be smooth between states

## Common Issues

### Loader Not Visible
- **Cause**: Timeouts too short for fast responses
- **Solution**: Increase timeouts or reduce durations

### Frozen Animations
- **Cause**: CSS not loaded or style conflicts
- **Solution**: Ensure styles are correctly loaded

### Uncleaned Timeouts
- **Cause**: Errors during execution
- **Solution**: Ensure timeouts are cleared in catch blocks

## Future Improvements

### v0.3
- [ ] Loader driven by real events from the webscraper
- [ ] Progress bar for long searches
- [ ] Dynamically localized messages
- [ ] Manual cancellation of searches

### v0.4
- [ ] Theme-customizable loaders
- [ ] Loader performance statistics
- [ ] Result caching with indicators
- [ ] Specialized loaders (news, prices, etc.)

## Technical Notes

### Performance
- Timeouts are optimized to avoid performance impact
- CSS animations are hardware-accelerated when possible
- Messages update only when necessary

### Compatibility
- Works on all modern browsers
- Compatible with dark/light themes
- Responsive across window sizes

### Security
- No inline JavaScript in loader elements
- Automatic cleanup of all timeouts
- Safe DOM element handling

---

**Introduced in**: v0.2.0-beta  
**Last Modified**: December 2024  
**Status**: Stable
