# 🦙 Setting up Ollama in TermInA

Ollama is a local LLM runtime. TermInA supports Ollama natively as a private, zero-cost alternative to cloud AI.

## 🚀 Why use Ollama

- 🔒 Privacy: everything stays on your machine
- 💰 Free: no recurring costs after install
- ⚡ Fast: no network latency
- 🔄 Open source
- 📱 Simple: easy setup
- 🎯 Optimized models available

---

## 📥 Install Ollama

### macOS / Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama --version
```

### Windows
1) Download installer from https://ollama.ai/
2) Run the installer
3) Restart your terminal
4) Verify: `ollama --version`

---

## 🎯 Popular models

### General-purpose
```bash
ollama pull gemma3:270m      # very fast, small
ollama pull llama3.2:3b      # fast
ollama pull llama3.2:8b      # balanced
ollama pull mistral:7b       # high quality

# Larger (slower, higher quality)
ollama pull llama3.2:70b
ollama pull codellama:70b
```

### Specialized
```bash
# Coding
ollama pull codellama:7b
ollama pull deepseek-coder

# Chat
ollama pull llama3.2:8b
ollama pull mistral:7b

# Lightweight
ollama pull phi3:mini
ollama pull tinyllama:1b
```

---

## ⚙️ Configure TermInA

1) Open Settings (⌘+, on macOS / Ctrl+, on Linux)
2) AI section → choose "Ollama (Local)"
3) Parameters
  - Endpoint: `http://localhost:11434`
  - Model: exact model name (e.g., `gemma3:270m`)
  - API Key: leave empty
4) Click "Test Connection"
5) Save

---

## 🧰 Manage models

```bash
ollama list                 # list models
ollama pull <model>         # download
ollama rm <model>           # remove
ollama show <model>         # show info
```

---

## 🚀 Start and control

### Background service
- macOS: starts at login
- Linux: systemd service
- Windows: background service

### Manual
```bash
ollama serve
curl http://localhost:11434/api/tags
```

### Stop
```bash
ollama stop
```

---

## 📊 Hardware requirements

Minimum
- RAM: 4GB
- CPU: 2018+ processor
- Storage: 2GB free

Recommended
- RAM: 8GB+
- CPU: modern multi-core
- Storage: 5GB+
- GPU: optional

Optimal
- RAM: 16GB+
- CPU: modern multi-core
- GPU: NVIDIA 8GB+ VRAM
- Storage: fast SSD

---

## 🧪 Test

```bash
ollama run gemma3:270m "Hello!"
ollama run gemma3:270m "Explain briefly what AI is"
```

In TermInA
1) Open the app
2) Press ⌘+Shift+A
3) Ask a simple question
4) Confirm the response comes from Ollama

Connectivity
```bash
curl http://localhost:11434/api/tags
curl -X POST http://localhost:11434/api/generate -d '{"model": "gemma3:270m", "prompt": "Test"}'
```

---

## � Troubleshooting

Common

❌ Ollama doesn’t start
```bash
ps aux | grep -i ollama
ollama stop
ollama serve
```

❌ Model not found
```bash
ollama list
ollama pull <model>
```

❌ Out of memory
- Try a smaller model
- Close other apps
- Increase available RAM

❌ Connection refused
```bash
curl http://localhost:11434/api/tags
ollama serve --verbose
```

Logs
```bash
ollama serve --verbose
ollama status
```

---

## 🎯 Optimization

Performance
```bash
ollama pull llama3.2:3b   # speed
ollama pull llama3.2:70b  # quality
```

Memory / env
```bash
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_ORIGINS=*
```

GPU
```bash
nvidia-smi  # NVIDIA
rocm-smi    # AMD
# Ollama uses GPU automatically when available
```

---

## 🔄 Updates

Ollama
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

Models
```bash
ollama pull --latest
ollama pull <model>:latest
```

---

## 📚 Resources

- https://ollama.ai/
- https://github.com/ollama/ollama
- https://github.com/ollama/ollama/blob/main/docs/README.md
- https://discord.gg/ollama
- https://ollama.ai/library

---

## 💡 Advanced

Custom models
```bash
ollama create custom-model -f Modelfile

# Modelfile example
FROM llama3.2:8b
SYSTEM "You are an expert Python assistant"
```

Ecosystem
- LangChain
- Ollama Python
- Ollama JavaScript

Backup and restore
```bash
ollama cp <model> <backup-model>
ollama cp <backup-model> <model>
```

---

## 🎉 Next steps

1) Install Ollama
2) Pull a base model (e.g., gemma3:270m)
3) Configure TermInA
4) Test connectivity
5) Explore different models
