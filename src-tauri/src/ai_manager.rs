use serde::{Deserialize, Serialize};
use anyhow::Result;
use reqwest::Client;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIProvider {
    pub name: String,
    pub api_url: String,
    pub api_key: String,
    pub model: String,
    pub max_tokens: u32,
    pub temperature: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIRequest {
    pub prompt: String,
    pub context: Vec<String>,
    pub provider: String,
    pub model: Option<String>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponse {
    pub content: String,
    pub provider: String,
    pub model: String,
    pub tokens_used: Option<u32>,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIAgentRequest {
    pub prompt: String,
    pub context: Vec<String>,
    pub auto_execute: bool,
    pub max_iterations: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIAgentResponse {
    pub response_type: String, // "response", "command", "error"
    pub content: String,
    pub command: Option<String>,
    pub iterations: u32,
    pub history: Vec<String>,
}

pub struct AIManager {
    providers: HashMap<String, AIProvider>,
    client: Client,
    default_provider: String,
}

impl AIManager {
    pub fn new() -> Self {
        let mut providers = HashMap::new();
        
        // OpenAI provider
        providers.insert("openai".to_string(), AIProvider {
            name: "OpenAI".to_string(),
            api_url: "https://api.openai.com/v1/chat/completions".to_string(),
            api_key: String::new(),
            model: "gpt-3.5-turbo".to_string(),
            max_tokens: 2000,
            temperature: 0.7,
        });

        // Anthropic provider
        providers.insert("anthropic".to_string(), AIProvider {
            name: "Anthropic".to_string(),
            api_url: "https://api.anthropic.com/v1/messages".to_string(),
            api_key: String::new(),
            model: "claude-3-sonnet-20240229".to_string(),
            max_tokens: 2000,
            temperature: 0.7,
        });

        // Google Gemini provider
        providers.insert("gemini".to_string(), AIProvider {
            name: "Google Gemini".to_string(),
            api_url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent".to_string(),
            api_key: String::new(),
            model: "gemini-pro".to_string(),
            max_tokens: 2000,
            temperature: 0.7,
        });

        Self {
            providers,
            client: Client::new(),
            default_provider: "openai".to_string(),
        }
    }

    pub async fn request(&self, prompt: &str, context: &[String]) -> Result<String> {
        let provider = self.providers.get(&self.default_provider)
            .ok_or_else(|| anyhow::anyhow!("Default provider not found"))?;

        if provider.api_key.is_empty() {
            return Err(anyhow::anyhow!("API key not configured for provider: {}", provider.name));
        }

        let response = match provider.name.as_str() {
            "OpenAI" => self.request_openai(provider, prompt, context).await?,
            "Anthropic" => self.request_anthropic(provider, prompt, context).await?,
            "Google Gemini" => self.request_gemini(provider, prompt, context).await?,
            _ => return Err(anyhow::anyhow!("Unsupported provider: {}", provider.name)),
        };

        Ok(response)
    }

    pub async fn request_with_config(&self, prompt: &str, context: &[String], ai_config: &serde_json::Value) -> Result<String> {
        // Estrai il provider dalla configurazione
        let provider_name = ai_config.get("provider")
            .and_then(|v| v.as_str())
            .unwrap_or(&self.default_provider);

        // Crea un provider temporaneo basato sulla configurazione
        let provider = match provider_name {
            "gemini" => {
                if let Some(gemini_config) = ai_config.get("gemini") {
                    AIProvider {
                        name: "Google Gemini".to_string(),
                        api_url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent".to_string(),
                        api_key: gemini_config.get("api_key").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                        model: gemini_config.get("model").and_then(|v| v.as_str()).unwrap_or("gemini-2.5-flash").to_string(),
                        max_tokens: gemini_config.get("max_output_tokens").and_then(|v| v.as_u64()).unwrap_or(4096) as u32,
                        temperature: gemini_config.get("temperature").and_then(|v| v.as_f64()).unwrap_or(0.7) as f32,
                    }
                } else {
                    return Err(anyhow::anyhow!("Gemini configuration not found"));
                }
            }
            "openai" => {
                if let Some(openai_config) = ai_config.get("openai") {
                    AIProvider {
                        name: "OpenAI".to_string(),
                        api_url: "https://api.openai.com/v1/chat/completions".to_string(),
                        api_key: openai_config.get("api_key").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                        model: openai_config.get("model").and_then(|v| v.as_str()).unwrap_or("gpt-4o").to_string(),
                        max_tokens: openai_config.get("max_tokens").and_then(|v| v.as_u64()).unwrap_or(4096) as u32,
                        temperature: openai_config.get("temperature").and_then(|v| v.as_f64()).unwrap_or(0.7) as f32,
                    }
                } else {
                    return Err(anyhow::anyhow!("OpenAI configuration not found"));
                }
            }
            "ollama" => {
                if let Some(ollama_config) = ai_config.get("ollama") {
                    AIProvider {
                        name: "Ollama".to_string(),
                        api_url: format!("{}/api/generate", ollama_config.get("base_url").and_then(|v| v.as_str()).unwrap_or("http://localhost:11434")),
                        api_key: "".to_string(), // Ollama non richiede API key
                        model: ollama_config.get("model").and_then(|v| v.as_str()).unwrap_or("gpt-oss:20b").to_string(),
                        max_tokens: 4096,
                        temperature: ollama_config.get("temperature").and_then(|v| v.as_f64()).unwrap_or(0.7) as f32,
                    }
                } else {
                    return Err(anyhow::anyhow!("Ollama configuration not found"));
                }
            }
            _ => {
                return Err(anyhow::anyhow!("Unsupported provider: {}", provider_name));
            }
        };

        if provider.api_key.is_empty() && provider.name != "Ollama" {
            return Err(anyhow::anyhow!("API key not configured for provider: {}", provider.name));
        }

        let response = match provider.name.as_str() {
            "OpenAI" => self.request_openai(&provider, prompt, context).await?,
            "Anthropic" => self.request_anthropic(&provider, prompt, context).await?,
            "Google Gemini" => self.request_gemini(&provider, prompt, context).await?,
            "Ollama" => self.request_ollama(&provider, prompt, context).await?,
            _ => return Err(anyhow::anyhow!("Unsupported provider: {}", provider.name)),
        };

        Ok(response)
    }

    async fn request_openai(&self, provider: &AIProvider, prompt: &str, context: &[String]) -> Result<String> {
        let mut messages = Vec::new();
        
        // Add system message
        messages.push(serde_json::json!({
            "role": "system",
            "content": "You are a helpful AI assistant integrated into a terminal emulator. Provide concise, accurate responses and suggest relevant terminal commands when appropriate."
        }));

        // Add context if available
        if !context.is_empty() {
            let context_content = context.join("\n");
            messages.push(serde_json::json!({
                "role": "system",
                "content": format!("Context from previous commands:\n{}", context_content)
            }));
        }

        // Add user message
        messages.push(serde_json::json!({
            "role": "user",
            "content": prompt
        }));

        let request_body = serde_json::json!({
            "model": provider.model,
            "messages": messages,
            "max_tokens": provider.max_tokens,
            "temperature": provider.temperature
        });

        let response = self.client
            .post(&provider.api_url)
            .header("Authorization", format!("Bearer {}", provider.api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("OpenAI API error: {}", error_text));
        }

        let response_json: serde_json::Value = response.json().await?;
        let content = response_json["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid response format"))?;

        Ok(content.to_string())
    }

    async fn request_anthropic(&self, provider: &AIProvider, prompt: &str, context: &[String]) -> Result<String> {
        let mut messages = Vec::new();
        
        // Add context if available
        if !context.is_empty() {
            let context_content = context.join("\n");
            messages.push(serde_json::json!({
                "role": "user",
                "content": format!("Context from previous commands:\n{}\n\nUser request: {}", context_content, prompt)
            }));
        } else {
            messages.push(serde_json::json!({
                "role": "user",
                "content": prompt
            }));
        }

        let request_body = serde_json::json!({
            "model": provider.model,
            "max_tokens": provider.max_tokens,
            "temperature": provider.temperature,
            "messages": messages
        });

        let response = self.client
            .post(&provider.api_url)
            .header("x-api-key", &provider.api_key)
            .header("Content-Type", "application/json")
            .header("anthropic-version", "2023-06-01")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("Anthropic API error: {}", error_text));
        }

        let response_json: serde_json::Value = response.json().await?;
        let content = response_json["content"][0]["text"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid response format"))?;

        Ok(content.to_string())
    }

    async fn request_gemini(&self, provider: &AIProvider, prompt: &str, context: &[String]) -> Result<String> {
        let mut content_parts = Vec::new();
        
        // Add context if available
        if !context.is_empty() {
            let context_content = context.join("\n");
            content_parts.push(format!("Context from previous commands:\n{}", context_content));
        }
        
        content_parts.push(prompt.to_string());
        let full_content = content_parts.join("\n\n");

        let request_body = serde_json::json!({
            "contents": [{
                "parts": [{
                    "text": full_content
                }]
            }],
            "generationConfig": {
                "maxOutputTokens": provider.max_tokens,
                "temperature": provider.temperature
            }
        });

        let url = format!("{}?key={}", provider.api_url, provider.api_key);
        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("Gemini API error: {}", error_text));
        }

        let response_json: serde_json::Value = response.json().await?;
        let content = response_json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid response format"))?;

        Ok(content.to_string())
    }

    async fn request_ollama(&self, provider: &AIProvider, prompt: &str, context: &[String]) -> Result<String> {
        let mut content_parts = Vec::new();
        
        // Add context if available
        if !context.is_empty() {
            let context_content = context.join("\n");
            content_parts.push(format!("Context from previous commands:\n{}", context_content));
        }
        
        content_parts.push(prompt.to_string());
        let full_content = content_parts.join("\n\n");

        let request_body = serde_json::json!({
            "model": provider.model,
            "prompt": full_content,
            "stream": false,
            "options": {
                "temperature": provider.temperature,
                "num_predict": provider.max_tokens
            }
        });

        let response = self.client
            .post(&provider.api_url)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("Ollama API error: {}", error_text));
        }

        let response_json: serde_json::Value = response.json().await?;
        let content = response_json["response"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid response format"))?;

        Ok(content.to_string())
    }

    pub async fn process_request(
        &self,
        prompt: &str,
        context: &[String],
        auto_execute: bool,
        command_executor: Box<dyn Fn(String) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<String, anyhow::Error>> + Send>> + Send + Sync>,
    ) -> Result<serde_json::Value>
    {
        let mut history = Vec::new();
        let mut iterations = 0;
        let max_iterations = 5;

        let mut current_prompt = prompt.to_string();
        
        loop {
            if iterations >= max_iterations {
                break;
            }

            let response = self.request(&current_prompt, context).await?;
            history.push(response.clone());

            // Check if the response contains a command suggestion
            if let Some(command) = self.extract_command(&response) {
                if auto_execute {
                    match command_executor(command.clone()).await {
                        Ok(output) => {
                            history.push(format!("Command executed: {}\nOutput: {}", command, output));
                            // Continue with the output as context for next iteration
                            current_prompt = format!("The command '{}' was executed with output: {}\n\nPlease analyze this output and provide any follow-up suggestions or explanations.", command, output);
                        }
                        Err(e) => {
                            history.push(format!("Command failed: {}\nError: {}", command, e));
                            return Ok(serde_json::json!({
                                "type": "error",
                                "response": format!("Command execution failed: {}", e),
                                "iterations": iterations,
                                "history": history
                            }));
                        }
                    }
                } else {
                    return Ok(serde_json::json!({
                        "type": "command",
                        "response": response,
                        "command": Some(command),
                        "iterations": iterations,
                        "history": history
                    }));
                }
            } else {
                return Ok(serde_json::json!({
                    "type": "response",
                    "response": response,
                    "command": None::<String>,
                    "iterations": iterations,
                    "history": history
                }));
            }

            iterations += 1;
        }

        Ok(serde_json::json!({
            "type": "response",
            "response": "Maximum iterations reached",
            "command": None::<String>,
            "iterations": iterations,
            "history": history
        }))
    }

    fn extract_command(&self, response: &str) -> Option<String> {
        // Look for command patterns in the response
        let lines: Vec<&str> = response.lines().collect();
        
        for line in lines {
            let line = line.trim();
            
            // Look for lines that start with $ or > or contain common command patterns
            if line.starts_with('$') || line.starts_with('>') {
                return Some(line[1..].trim().to_string());
            }
            
            // Look for code blocks with commands
            if line.starts_with("```") && line.len() > 3 {
                continue;
            }
            
            // Look for lines that look like commands (contain common command words)
            let command_words = ["ls", "cd", "mkdir", "rm", "cp", "mv", "git", "npm", "pip", "brew", "apt", "yum", "docker", "kubectl"];
            if command_words.iter().any(|&word| line.starts_with(word)) {
                return Some(line.to_string());
            }
        }
        
        None
    }

    pub fn set_provider_api_key(&mut self, provider: &str, api_key: String) -> Result<()> {
        if let Some(provider_config) = self.providers.get_mut(provider) {
            provider_config.api_key = api_key;
            Ok(())
        } else {
            Err(anyhow::anyhow!("Provider not found: {}", provider))
        }
    }

    pub fn get_available_providers(&self) -> Vec<String> {
        self.providers.keys().cloned().collect()
    }

    pub fn is_provider_configured(&self, provider: &str) -> bool {
        self.providers.get(provider)
            .map(|p| !p.api_key.is_empty())
            .unwrap_or(false)
    }

    pub fn set_default_provider(&mut self, provider: String) -> Result<()> {
        if self.providers.contains_key(&provider) {
            self.default_provider = provider;
            Ok(())
        } else {
            Err(anyhow::anyhow!("Provider not found: {}", provider))
        }
    }
}

impl Default for AIManager {
    fn default() -> Self {
        Self::new()
    }
}

impl AIManager {
    pub async fn test_connection(
        &self,
        provider: &str,
        ai_config: &serde_json::Value,
        prompt: &str,
        _context: &[String],
    ) -> Result<String> {
        log::info!("Testing AI connection for provider: {}", provider);
        
        // Usa direttamente la configurazione AI passata
        
        // Testa la connessione con una richiesta semplice
        match provider {
            "gemini" => {
                if let Some(gemini_config) = ai_config.get("gemini") {
                    if let Some(api_key) = gemini_config.get("api_key").and_then(|v| v.as_str()) {
                        if api_key.is_empty() {
                            return Err(anyhow::anyhow!("Gemini API key is empty"));
                        }
                        
                        // Testa con una richiesta semplice
                        let test_request = serde_json::json!({
                            "contents": [{
                                "parts": [{"text": prompt}]
                            }],
                            "generationConfig": {
                                "temperature": 0.1,
                                "maxOutputTokens": 50
                            }
                        });
                        
                        let client = reqwest::Client::new();
                        let response = client
                            .post(&format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}", api_key))
                            .json(&test_request)
                            .send()
                            .await?;
                        
                        if response.status().is_success() {
                            let result: serde_json::Value = response.json().await?;
                            if let Some(candidates) = result.get("candidates") {
                                if let Some(candidate) = candidates.get(0) {
                                    if let Some(content) = candidate.get("content") {
                                        if let Some(parts) = content.get("parts") {
                                            if let Some(part) = parts.get(0) {
                                                if let Some(text) = part.get("text") {
                                                    return Ok(text.as_str().unwrap_or("Connection successful").to_string());
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        return Err(anyhow::anyhow!("Invalid response from Gemini API"));
                    } else {
                        return Err(anyhow::anyhow!("Gemini API key not found"));
                    }
                } else {
                    return Err(anyhow::anyhow!("Gemini configuration not found"));
                }
            }
            "openai" => {
                if let Some(openai_config) = ai_config.get("openai") {
                    if let Some(api_key) = openai_config.get("api_key").and_then(|v| v.as_str()) {
                        if api_key.is_empty() {
                            return Err(anyhow::anyhow!("OpenAI API key is empty"));
                        }
                        
                        let test_request = serde_json::json!({
                            "model": "gpt-3.5-turbo",
                            "messages": [{"role": "user", "content": prompt}],
                            "max_tokens": 50
                        });
                        
                        let client = reqwest::Client::new();
                        let response = client
                            .post("https://api.openai.com/v1/chat/completions")
                            .header("Authorization", format!("Bearer {}", api_key))
                            .json(&test_request)
                            .send()
                            .await?;
                        
                        if response.status().is_success() {
                            let result: serde_json::Value = response.json().await?;
                            if let Some(choices) = result.get("choices") {
                                if let Some(choice) = choices.get(0) {
                                    if let Some(message) = choice.get("message") {
                                        if let Some(content) = message.get("content") {
                                            return Ok(content.as_str().unwrap_or("Connection successful").to_string());
                                        }
                                    }
                                }
                            }
                        }
                        
                        return Err(anyhow::anyhow!("Invalid response from OpenAI API"));
                    } else {
                        return Err(anyhow::anyhow!("OpenAI API key not found"));
                    }
                } else {
                    return Err(anyhow::anyhow!("OpenAI configuration not found"));
                }
            }
            "ollama" => {
                if let Some(ollama_config) = ai_config.get("ollama") {
                    if let Some(base_url) = ollama_config.get("base_url").and_then(|v| v.as_str()) {
                        let test_request = serde_json::json!({
                            "model": ollama_config.get("model").and_then(|v| v.as_str()).unwrap_or("gpt-oss:20b"),
                            "prompt": prompt,
                            "stream": false
                        });
                        
                        let client = reqwest::Client::new();
                        let response = client
                            .post(&format!("{}/api/generate", base_url))
                            .json(&test_request)
                            .send()
                            .await?;
                        
                        if response.status().is_success() {
                            let result: serde_json::Value = response.json().await?;
                            if let Some(response_text) = result.get("response") {
                                return Ok(response_text.as_str().unwrap_or("Connection successful").to_string());
                            }
                        }
                        
                        return Err(anyhow::anyhow!("Invalid response from Ollama API"));
                    } else {
                        return Err(anyhow::anyhow!("Ollama base URL not found"));
                    }
                } else {
                    return Err(anyhow::anyhow!("Ollama configuration not found"));
                }
            }
            "lm-studio" => {
                if let Some(lm_studio_config) = ai_config.get("lmStudio") {
                    if let Some(endpoint) = lm_studio_config.get("endpoint").and_then(|v| v.as_str()) {
                        let test_request = serde_json::json!({
                            "model": lm_studio_config.get("model").and_then(|v| v.as_str()).unwrap_or("local-model"),
                            "messages": [{"role": "user", "content": prompt}],
                            "max_tokens": 50
                        });
                        
                        let client = reqwest::Client::new();
                        let response = client
                            .post(&format!("{}/chat/completions", endpoint))
                            .header("Authorization", format!("Bearer {}", lm_studio_config.get("apiKey").and_then(|v| v.as_str()).unwrap_or("lm-studio")))
                            .json(&test_request)
                            .send()
                            .await?;
                        
                        if response.status().is_success() {
                            let result: serde_json::Value = response.json().await?;
                            if let Some(choices) = result.get("choices") {
                                if let Some(choice) = choices.get(0) {
                                    if let Some(message) = choice.get("message") {
                                        if let Some(content) = message.get("content") {
                                            return Ok(content.as_str().unwrap_or("Connection successful").to_string());
                                        }
                                    }
                                }
                            }
                        }
                        
                        return Err(anyhow::anyhow!("Invalid response from LM Studio API"));
                    } else {
                        return Err(anyhow::anyhow!("LM Studio endpoint not found"));
                    }
                } else {
                    return Err(anyhow::anyhow!("LM Studio configuration not found"));
                }
            }
            _ => {
                return Err(anyhow::anyhow!("Unsupported provider: {}", provider));
            }
        }
    }
}