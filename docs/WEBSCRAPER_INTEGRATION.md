# WebScraper Integration with AI Agent

This document describes the integration of the webscraper with Termina's AI agent, allowing the agent to search the internet when needed.

## Overview

The web integration system allows the AI agent to:
- Automatically determine when a request requires up-to-date information from the internet
- Perform web searches across different search engines
- Integrate retrieved information with existing AI answers
- Provide more complete and up-to-date responses

## Main Components

### 1. WebScraper (`src/webscraper.js`)
Base module for web content extraction and search engine queries.

**Features:**
- Search on Google, Bing, DuckDuckGo
- Extraction and cleanup of HTML content
- Handling of redirects and timeouts
- User-Agent rotation to avoid blocking

### 2. WebAI Integration (`src/web-ai-integration.js`)
Module that integrates the webscraper with the AI agent.

**Features:**
- Intelligent analysis of requests to decide if a web search is needed
- Integration of web results with AI responses
- Search history management
- Configurable confidence threshold

### 3. AI Agent Enhanced (`src/ai-agent.js`)
Extension of the existing AI agent with web capabilities.

**New methods:**
- `processRequestWithWeb()` — Process requests with web integration
- `isWebServiceAvailable()` — Check service availability
- `getWebSearchStats()` — Get search statistics

## Configuration

### Configuration File
Webscraper settings are configured in `~/.termina/config.json`:

```json
{
  "webscraper": {
    "enabled": true,
    "defaultSearchEngine": "google",
    "maxResults": 5,
    "confidenceThreshold": 0.7,
    "timeout": 10000,
    "maxRedirects": 3,
    "searchEngines": {
      "google": {
        "enabled": true,
        "baseUrl": "https://www.google.com/search"
      },
      "bing": {
        "enabled": true,
        "baseUrl": "https://www.bing.com/search"
      },
      "duckduckgo": {
        "enabled": true,
        "baseUrl": "https://duckduckgo.com/html/"
      }
    }
  }
}
```

### Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `enabled` | Enable/disable the webscraper | `true` |
| `defaultSearchEngine` | Default search engine | `"google"` |
| `maxResults` | Max number of results per search | `5` |
| `confidenceThreshold` | Threshold to decide whether to search online (0.0–1.0) | `0.7` |
| `timeout` | HTTP request timeout (ms) | `10000` |
| `maxRedirects` | Max number of redirects | `3` |

## Usage

### Basic Method
```javascript
const aiAgent = require('./src/ai-agent');

// Process a request with web integration
const result = await aiAgent.processRequestWithWeb(
  'What is the current price of Bitcoin?',
  [], // terminal context
  false // autoExecute
);

if (result.type === 'web_enhanced') {
  console.log('Enhanced response:', result.enhancedResponse);
  console.log('Search query:', result.searchQuery);
} else {
  console.log('Local response:', result.response);
}
```

### Advanced Method
```javascript
const webAIIntegration = require('./src/web-ai-integration');

// Analyze if a web search is required
const analysis = await webAIIntegration.shouldSearchOnline(
  'What is the latest version of Node.js?',
  'The latest version of Node.js is 20.x',
  []
);

if (analysis.shouldSearch) {
  // Perform search and integrate results
  const enhanced = await webAIIntegration.enhanceResponseWithWebSearch(
    'What is the latest version of Node.js?',
    'The latest version of Node.js is 20.x',
    analysis
  );
  
  console.log('Integrated response:', enhanced.enhancedResponse);
}
```

## Managing Searches

### History
```javascript
// Get search history
const history = aiAgent.getWebSearchHistory();

// Clear history
aiAgent.clearWebSearchHistory();
```

### Statistics
```javascript
// Get stats
const stats = aiAgent.getWebSearchStats();
console.log('Total searches:', stats.totalSearches);
console.log('Searches performed:', stats.searchesPerformed);
console.log('Average confidence:', stats.averageConfidence);
```

### Dynamic Configuration
```javascript
// Set confidence threshold
aiAgent.setWebSearchConfidenceThreshold(0.8);

// Get current threshold
const threshold = aiAgent.getWebSearchConfidenceThreshold();
```

## Response Types

### 1. `web_enhanced`
Response enhanced with information found online:
```javascript
{
  type: 'web_enhanced',
  response: 'Response enhanced with web information',
  originalResponse: 'Original AI response',
  searchQuery: 'executed search query',
  searchResults: { /* search results */ },
  confidence: 0.85,
  reason: 'Requested information may be outdated'
}
```

### 2. `local_only`
Response based only on the AI's local knowledge:
```javascript
{
  type: 'local_only',
  response: 'Local AI response',
  confidence: 0.3,
  reason: 'Sufficient information in local knowledge'
}
```

### 3. `fallback`
Fallback to normal mode if the web search fails:
```javascript
{
  type: 'fallback',
  response: 'Original AI response',
  searchError: 'Error during web search',
  reason: 'Fallback due to search error'
}
```

## Error Handling

### Common Errors
- **Timeout**: HTTP requests exceeding the time limit
- **Too many redirects**: Excessive HTTP redirects
- **Parsing failed**: Unable to extract content from pages
- **Connectivity**: Network or firewall issues

### Fallback Strategies
1. If the web search fails, the AI agent uses normal mode
2. If integration fails, the original AI response is returned
3. Detailed logs for debugging

## Security and Privacy

### Considerations
- **Rate Limiting**: Pauses between requests to be respectful
- **User-Agent Rotation**: Rotate user agents to avoid blocking
- **Timeout**: Limit wait time for requests
- **URL Validation**: Check URL validity before access

### Best Practices
- Avoid making too many requests in quick succession
- Respect website robots.txt
- Use appropriate User-Agents
- Implement retries with exponential backoff

## Testing and Debug

### Run Tests
```bash
# Run all tests
node test-webscraper.js

# Specific tests
const { testWebScraper } = require('./test-webscraper');
await testWebScraper();
```

### Logs and Debug
```javascript
// Enable detailed logs
console.log('WebAI: Processing request with web integration');

// Check service availability
const isAvailable = await aiAgent.isWebServiceAvailable();
console.log('Web service available:', isAvailable);
```

## Limitations

### Current Limitations
- **HTML Parsing**: Simplified parsing of search results
- **API Rate Limits**: Search engines may throttle requests
- **Dynamic Content**: Difficulty with JavaScript-generated content
- **Authentication**: No support for login-required sites

### Future Work
- Integration with official search engine APIs
- Support for dynamic JavaScript content
- Intelligent result caching
- Support for more content types (PDF, images, etc.)

## Troubleshooting

### Common Issues

**1. Web searches not working**
- Check internet connectivity
- Verify firewall settings
- Check webscraper configuration

**2. Responses not enhanced**
- Check the confidence threshold
- Review logs for search errors
- Check if the service is available

**3. Slow performance**
- Reduce maximum number of results
- Increase timeouts if needed
- Check connection speed

### Advanced Debug
```javascript
// Enable detailed debug
const webConfig = config.getWebScraperConfig();
console.log('Webscraper configuration:', webConfig);

// Test connectivity
const testResult = await webScraper.searchWeb('test', 'google', 1);
console.log('Connectivity test:', testResult);
```

## Contributing

To contribute to the webscraper:

1. Follow the project coding guidelines
2. Add tests for new features
3. Document changes
4. Consider performance impact
5. Respect target website policies

## License

This module is part of the Termina project and follows the same license as the main project.

