# Multi-AI Setup Guide

TermInA supports multiple AI providers you can configure and switch between. This guide covers how to set up each one.

## 🤖 Supported AI providers

### 1) Google Gemini (recommended)
- Fast and free (with limits)
- Multimodal (text, images, code)
- Great for general use

### 2) OpenAI (GPT)
- Excellent quality
- Advanced models (GPT-4, GPT-4o)
- Paid

### 3) LM Studio (local)
- Fully private
- No cost after setup
- Requires stronger hardware

### 4) Ollama (local)
- Fully private and open source
- Easy to install and configure
- Optimized models for many tasks
- No cost after setup

---

## 📝 Step-by-step configuration

### 🔮 Google Gemini

#### 1) Get an API key
1) Go to Google AI Studio: https://makersuite.google.com/
2) Sign in
3) Create/select a project
4) Open “API Keys”
5) Click “Create API Key”
6) Copy the key (e.g., `AIzaSy...`)

#### 2) Configure TermInA
1) Open Settings (⌘+,)
2) Open Artificial Intelligence
3) Choose “Google Gemini”
4) Paste the API key
5) Pick a model:
   - Gemini 2.5 Flash — fast, great for general tasks
   - Gemini Pro — more powerful for complex tasks
6) Click “Test Connection”
7) Save

#### 3) Limits and costs (typical)
- Free: ~15 req/min, ~1M tokens/month
- Paid: see latest Google pricing

---

### 🧠 OpenAI (ChatGPT)

#### 1) Get an API key
1) https://platform.openai.com/
2) Sign up / sign in
3) Add a payment method
4) Create a new API key
5) Copy it (format: `sk-...`)

#### 2) Configure TermInA
1) Settings → AI → choose “OpenAI”
2) Paste the API key
3) Choose a model:
   - GPT-3.5 Turbo — cheaper, decent quality
   - GPT-4 — higher quality, higher cost
   - GPT-4 Turbo — optimized GPT-4
   - GPT-4o — latest, faster
4) Test connection
5) Save

#### 3) Costs (typical)
- See OpenAI pricing for up-to-date rates

---

### 🏠 LM Studio (local)

#### 1) Install LM Studio
https://lmstudio.ai/

#### 2) Download a model
Use Search in LM Studio, e.g. Llama 2 7B, Code Llama 7B, Mistral 7B, Phi-3 Mini

#### 3) Start local server
- Port: 1234 (default)
- Context: 4096+
- GPU Layers: as supported
Click Start Server; verify “Server is running on http://localhost:1234”.

#### 4) Configure TermInA
- Settings → AI → “LM Studio (Local)”
- Endpoint: `http://localhost:1234/v1`
- Model name: e.g., `llama-2-7b-chat`
- API Key: `lm-studio` (or blank)
- Test connection and Save

#### 5) Hardware
- Minimum: 8GB RAM, modern CPU
- Recommended: 16GB+ RAM, dedicated GPU
- Optimal: 32GB+ RAM, NVIDIA 8GB+ VRAM

---

### 🦙 Ollama (local)

See dedicated guides:
- docs/OLLAMA_SETUP.md — setup
- docs/OLLAMA_COMPATIBILITY.md — troubleshooting

---

## 🔄 Switching providers

### Quick switch
1) Open Settings (⌘+,)
2) AI → change “AI Provider”
3) Save
4) The app switches immediately

### Which provider when
- Gemini: everyday use, general questions
- OpenAI: complex tasks, deep analysis
- LM Studio: privacy, offline, experiments
- Ollama: privacy, easy setup, optimized models

---

## 🧪 Testing

Each provider has a “Test Connection” button that:
1) Verifies connectivity
2) Tests authentication
3) Confirms the model responds
4) Shows configuration errors

### Common troubleshooting

Gemini
- 403 Forbidden — invalid API key
- 429 Too Many Requests — rate limit
- 400 Bad Request — check payload shape

OpenAI
- 401 Unauthorized — invalid/expired key
- 429 Rate limit — too many requests
- 402 Payment Required — set up billing

LM Studio
- Connection failed — server not running
- 404 Not Found — wrong URL
- 500 Internal Error — model not loaded

Ollama
- Connection failed — Ollama not running
- 404 Not Found — wrong URL
- 500 Internal Error — model missing/corrupted
- Model not found — ensure it’s pulled (`ollama list`)

---

## 💡 Advanced tips

```bash
# Quick sanity tests
ai "say only: ok"
execute "create a file named testfile.txt"
```

### Multiple configurations
Switch providers based on needs:
- Gemini: quick, frequent queries
- OpenAI: complex analysis
- LM Studio: privacy and control
- Ollama: privacy and optimized local models

### Backup configuration
Settings live in `~/.termina/config.json`:
```bash
# Backup settings
cp ~/.termina/config.json ~/.termina/config.backup.json
```

### Cost monitoring
- Gemini: Google Cloud Console
- OpenAI: https://platform.openai.com/usage
- LM Studio: free after setup
- Ollama: free after setup

---

## 🚨 Security notes

1) Never share API keys
2) Use environment variables in deployments
3) Monitor usage to avoid surprises
4) LM Studio and Ollama are the most private (all local)
5) Revoke keys if compromised
6) Ollama offers maximum local control

---

## 📞 Support

If you run into issues:
1) Check TermInA logs
2) Verify internet connection (for cloud)
3) Use the Test Connection button
4) Consult the provider’s docs
5) Open a GitHub issue

Enjoy exploring TermInA’s AI! 🚀
