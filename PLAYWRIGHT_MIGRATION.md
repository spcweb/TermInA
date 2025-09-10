# Migration from HTTP WebScraper to Playwright

## Overview

This document describes migrating the web scraping system from a native HTTP-based approach to Playwright, a modern browser automation framework.

## Main Changes

### 1. Module Replacement

- **Old**: `src/webscraper.js` and `src/webscraper-enhanced.js`
- **New**: `src/webscraper-playwright.js`

### 2. Dependency Updates

```json
{
  "dependencies": {
    "playwright": "^1.40.0"
  }
}
```

### 3. Updated Files

- `main.js` — Import the new webscraper
- `src/web-ai-integration.js` — Reference to the new module
- `examples/web-integration-example.js` — Updated example

## Benefits of Playwright

### 1. Advanced Browser Handling
- Support for Chromium, Firefox, and WebKit
- Automatic handling of dynamic JavaScript
- Full page rendering

### 2. Advanced Features
- Automatic screenshots
- PDF generation
- Handling of popups and dialogs
- SPA (Single Page Applications) support

### 3. Reliability
- Automatic timeout handling
- Automatic retries
- Improved error handling

## Compatible API

The new `WebScraperPlaywright` keeps the same public interface as the old system:

```javascript
// Metodi principali (invariati)
await webScraper.searchWeb(query, searchEngine, maxResults);
await webScraper.extractPageContent(url);
webScraper.isValidUrl(url);
webScraper.extractDomains(urls);

// Nuovi metodi aggiuntivi
await webScraper.initializeBrowser(browserType, headless);
await webScraper.closeBrowser();
await webScraper.takeScreenshot(url, path);
await webScraper.generatePDF(url, path);
await webScraper.changeBrowser(browserType);
await webScraper.setHeadlessMode(headless);
webScraper.getBrowserInfo();
```

## Configuration

### 1. Installation

```bash
npm install playwright
npx playwright install
```

### 2. Browser Configuration

```javascript
// Automatic initialization (default)
const webScraper = require('./src/webscraper-playwright');

// Manual initialization
await webScraper.initializeBrowser('chromium', true);
await webScraper.initializeBrowser('firefox', false);
await webScraper.initializeBrowser('webkit', true);
```

### 3. Resource Management

```javascript
// Important: always close the browser when done
await webScraper.closeBrowser();

// Or use try-finally
try {
  const results = await webScraper.searchWeb('query', 'google', 5);
  // ... use results
} finally {
  await webScraper.closeBrowser();
}
```

## Testing and Verification

### 1. Full Test

```bash
node test-playwright-webscraper.js
```

### 2. Specific Tests

```javascript
const { testPlaywrightWebScraper } = require('./test-playwright-webscraper');
await testPlaywrightWebScraper();
```

## Troubleshooting

### 1. Missing Dependencies

If you encounter dependency errors on Linux:

```bash
sudo pacman -S icu libxml2 libwebp libffi
```

### 2. Browser Not Initialized

```javascript
// Check browser status
const browserInfo = webScraper.getBrowserInfo();
console.log('Browser initialized:', browserInfo.isInitialized);

// Re-initialize if needed
if (!browserInfo.isInitialized) {
  await webScraper.initializeBrowser();
}
```

### 3. Timeouts and Network Errors

```javascript
// Increase timeouts if necessary
webScraper.timeout = 60000; // 60 secondi

// Use automatic fallback
const results = await webScraper.searchWeb('query', 'google', 5);
if (results.fallback) {
  console.log('Used fallback results');
}
```
## Gradual Migration

### 1. Phase 1: Install and Test
- Install Playwright
- Test the new system
- Verify compatibility

### 2. Phase 2: Replacement
- Replace module references
- Update imports
- Test features

### 3. Phase 3: Cleanup
- Remove old modules
- Update documentation
- Verify performance

## Performance and Resources

### 1. Memory Usage
- **Old system**: ~50–100 MB
- **New system**: ~200–500 MB (depends on browser)

### 2. Speed
- **Old system**: Faster for simple requests
- **New system**: Slower on startup, but handles complex JavaScript

### 3. Reliability
- **Old system**: May fail with dynamic JavaScript
- **New system**: Automatically handles most cases

## Compatibility

### 1. Operating Systems
- ✅ Linux (Ubuntu, Arch, etc.)
- ✅ macOS
- ✅ Windows

### 2. Supported Browsers
- ✅ Chromium (Chrome, Edge)
- ✅ Firefox
- ✅ WebKit (Safari)

### 3. Architectures
- ✅ x64
- ✅ ARM64 (Apple Silicon, ARM Linux)

## Conclusions

Migrating to Playwright represents a significant improvement to the web scraping system:

1. **Reliability**: Automatic handling of JavaScript and dynamic content
2. **Features**: Screenshots, PDF, multi-browser support
3. **Maintainability**: Cleaner, standardized code
4. **Future-proof**: Actively maintained and updated framework

The system remains compatible with the existing API, making the migration transparent to end users.
