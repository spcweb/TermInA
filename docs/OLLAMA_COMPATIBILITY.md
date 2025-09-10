# 🔧 Ollama Compatibility Guide

This guide helps you diagnose and fix common Ollama compatibility issues in TermInA.

## 🚨 Common issues and fixes

### 1) API endpoints unreachable

Problem
Requests to `/api/chat` and `/api/generate` fail during tests.

Fix
- Ensure Ollama is running: `ollama serve`
- Check default port 11434 is free
- Manually test with curl

```bash
# Test endpoints
curl http://localhost:11434/api/tags
curl -X POST http://localhost:11434/api/generate \
  -d '{"model": "gemma3:270m", "prompt": "test", "stream": false}'
```

### 2) Model not found

Problem
The configured model isn’t available in Ollama.

Fix
- List available models: `ollama list`
- Pull the missing model: `ollama pull <model>`
- Update TermInA settings with the exact model name

```bash
ollama list
ollama pull gemma3:270m
```

### 3) Unrecognized response format

Problem
The AI manager can’t parse Ollama’s response.

Fix
TermInA supports multiple response shapes:
- Chat format: `{"message": {"content": "..."}}`
- Generate format: `{"response": "..."}`
- OpenAI-like: `{"choices": [{"message": {"content": "..."}}]}`

### 4) Connection timeouts

Problem
Requests take too long or fail.

Fix
- Large models are slower; try a smaller one
- Check system resources (CPU/RAM)
- Prefer lightweight models for quick tests

```bash
# Fast test models
ollama pull gemma3:270m
ollama pull phi3:mini
ollama pull tinyllama:1b
```

---

## 🔍 Diagnostics

### Basic connectivity tests
```bash
# 1) Make sure Ollama is running
ps aux | grep -i ollama | grep -v grep

# 2) Test base endpoint
curl http://localhost:11434/api/tags

# 3) Test generate endpoint
curl -X POST http://localhost:11434/api/generate \
  -d '{"model": "gemma3:270m", "prompt": "test", "stream": false}'

# 4) Test chat endpoint
curl -X POST http://localhost:11434/api/chat \
  -d '{"model": "gemma3:270m", "messages": [{"role": "user", "content": "test"}], "stream": false}'
```

### Inside TermInA
1) Open Settings
2) Select AI → "Ollama (Local)"
3) Configure endpoint and model
4) Use the Test Connection button
5) Check logs for specific errors

---

## 🛠️ Advanced troubleshooting

### Ollama doesn’t start
```bash
ollama stop
ollama serve
ollama serve --verbose
```

### Corrupted model
```bash
ollama rm <model>
ollama pull <model>
```

### Port already in use
```bash
lsof -i :11434
kill -9 <PID>
```

### Permission issues
```bash
ls -la ~/.ollama
chmod 755 ~/.ollama
```

---

## 📊 Version compatibility

### Supported Ollama versions
- Ollama 0.1.x: ✅ `/api/generate`
- Ollama 0.2.x: ✅ `/api/chat` and `/api/generate`
- Ollama 0.3.x: ✅ `/api/chat` and `/api/generate`

### Supported model formats
- GGUF: ✅ native support
- GGML: ✅ supported (deprecated)
- PyTorch: ❌ not supported (convert to GGUF)

---

## 🔧 Recommended configuration

```json
{
  "ai": {
    "provider": "ollama",
    "ollama": {
      "endpoint": "http://localhost:11434",
      "model": "gemma3:270m",
      "apiKey": ""
    }
  }
}
```

### Suggested models for testing
- gemma3:270m — fast, good quality (270M)
- phi3:mini — very fast (~3.8B)
- llama3.2:3b — balanced (3B)

---

## 📝 Logs and debugging

```bash
# Verbose server logs
ollama serve --verbose

# (If present) tail Ollama logs
tail -f ~/.ollama/logs/ollama.log
```

TermInA consoles to check:
- Main console: connection failures
- Settings console: configuration errors
- AI console: request processing errors

---

## 🆘 Support and troubleshooting

If issues persist:
1) Check Ollama version: `ollama --version`
2) System logs (Linux): `journalctl -u ollama`
3) Restart: `ollama stop && ollama serve`
4) Verify resources: RAM, CPU, disk space
5) Re-test with curl to isolate

Useful links
- Docs: https://github.com/ollama/ollama/blob/main/docs/README.md
- Discord: https://discord.gg/ollama
- Issues: https://github.com/ollama/ollama/issues

---

## ✅ Final checklist

- [ ] Ollama is running (`ollama serve`)
- [ ] Endpoint reachable (`curl http://localhost:11434/api/tags`)
- [ ] Model pulled (`ollama list`)
- [ ] Correct TermInA configuration
- [ ] Test connection passes
- [ ] No critical errors in logs

If all items are ✅, Ollama should work smoothly in TermInA. 🚀
