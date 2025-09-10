# LM Studio setup with TermInA

This guide shows how to configure LM Studio to use local AI models with TermInA.

## 📦 Install LM Studio

1) Download from https://lmstudio.ai/
2) Install the app
3) Launch LM Studio

## 🤖 Download a model

1) Open LM Studio
2) Go to Search (🔍)
3) Find a compatible model, e.g.:
   - microsoft/DialoGPT-medium
   - HuggingFaceH4/zephyr-7b-beta
   - NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO
   - TheBloke/CodeLlama-7B-Instruct-GGUF
4) Select and click Download

## 🚀 Start the local server

1) Go to Local Server (🌐)
2) Pick the downloaded model
3) Server options:
   - Port: keep 1234 (default)
   - CORS: enable if needed
4) Click Start Server

Server URL: `http://localhost:1234`

## ⚙️ Configure TermInA

1) Open TermInA
2) Press ⌘+, (macOS) or Ctrl+, (Linux)
3) Open Artificial Intelligence section
4) Choose "LM Studio (Local)"
5) Set:
   - Endpoint: `http://localhost:1234/v1`
   - Model name: the loaded model name
   - API Key: `lm-studio` (or leave blank)

## 🧪 Test

1) In the terminal, type: `ai: Hello, how are you?`
2) Press Enter

If configured correctly, you’ll get a response from the local model.

## 💡 Tips

### Recommended models

| Model | Size | Speed | Quality | Use case |
|-------|------|-------|---------|----------|
| CodeLlama-7B-Instruct | ~4GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | Coding |
| Zephyr-7B-Beta | ~4GB | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | General |
| Nous-Hermes-2 | ~8GB | ⚡⚡ | ⭐⭐⭐⭐⭐ | Complex chats |
| Mixtral-8x7B | ~16GB | ⚡ | ⭐⭐⭐⭐⭐ | Highest quality |

### Performance

1) Ensure at least 8GB of free RAM
2) Larger models need stronger CPUs
3) Enable GPU acceleration if available
4) Reduce context length for faster replies

### Troubleshooting

Server doesn’t start
- Ensure port 1234 is free
- Restart LM Studio
- Check LM Studio logs

Connection errors in TermInA
- Endpoint should be `http://localhost:1234/v1`
- Ensure the server is running
- Temporarily disable firewall/antivirus if needed

Slow or incomplete responses
- Lower Max Tokens
- Use a smaller model
- Close other apps to free RAM

“Model not found”
- Model name in TermInA must match LM Studio
- Double-check in LM Studio Chat tab

## 🔧 Advanced

### Model parameters
Adjust in LM Studio:
- Temperature (0.1–1.0)
- Top P (0.1–1.0)
- Max Tokens
- Repeat Penalty

### Custom API endpoint
Configure in:
TermInA → Settings → AI → LM Studio → Endpoint

### Custom GGUF models
1) Download the .gguf
2) Drag into LM Studio
3) Load it

## 📚 Resources

- https://lmstudio.ai/docs
- https://huggingface.co/models
- https://github.com/ggerganov/ggml/blob/master/docs/gguf.md
- https://lmstudio.ai/models

---

Note: Local LLMs need significant resources. For best results, use a machine with 16GB+ RAM and a modern CPU.
