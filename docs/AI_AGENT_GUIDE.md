# AI Agent (Iterative) — User Guide

## What’s new

The built-in AI Agent now supports automatic execution and iteration on tasks, going beyond simple suggestions.

## Commands

### Suggestion mode (previous behavior)
```bash
ai "create a folder named test"
ask "show available disk space"
```


```bash
execute "create a folder named test"
run "show available disk space"
```

## How iteration works

When you use `execute` or `run`, the agent will:

1) Analyze the request to determine the command(s)
2) Execute the command(s)
3) Verify whether the outcome meets the original goal
4) Iterate up to 5 attempts if needed
5) Try alternative approaches on errors

## Practical examples

### Example 1: Create a directory
```bash
execute "create a directory for my Python projects"
```
The agent will:
- Suggest: `mkdir python_projects`
- Run it
- Verify the directory exists
- Confirm success or try an alternative

### Example 2: System monitoring
```bash
run "check how much free disk space I have and whether I should clean up"
```
The agent will:
- Run: `df -h`
- Analyze usage
- If needed, run `du -sh *` to find large folders/files
- Provide recommendations

### Example 3: Process management
```bash
execute "find and kill Chrome processes using too much memory"
```
The agent will:
- Run: `ps aux | grep -i chrome`
- Analyze memory usage
- Kill the problematic PIDs
- Verify they’re gone

## Why iteration helps

### ✅ Automatic error recovery
```bash
execute "install python"
```
- Try: `apt-get install -y python3` (Linux) or `brew install python@3` (macOS)
- If it fails: fetch download instructions from the official site

### ✅ Result verification
```bash
run "create a backup of the documents folder"
```
- Execute backup command
- Verify backup exists
- Check file integrity
- Confirm success

### ✅ Uses context
```bash
execute "find the largest file in my home directory"
```
- Attempt 1: `find ~ -type f -printf '%s %p\n' | sort -nr | head -1`
- If slow: `du -ah ~ | sort -rh | head -20`

## Safety and control

### Transparent history
Each run shows:
- ✅ Executed command
- 💭 AI reasoning
- 📤 Result
- 🔄 Iterations

### Safety limits
- Max 5 iterations
- Potentially dangerous commands require confirmation
- Full logs retained

## When to use

### Power users
```bash
execute "optimize system performance"
execute "set up a Node.js dev environment"
execute "clean temporary files"
```

### Learning
```bash
ai "how can I monitor CPU usage?"
ai "what are the most useful git commands?"
```

## Advanced scenarios

### Full system diagnosis
```bash
execute "run a full system health check and highlight issues"
```

### Dev environment setup
```bash
run "configure a Python venv for machine learning"
```

### Cleanup and maintenance
```bash
execute "free disk space by finding duplicates and clearing caches"
```

## Tips

1) Be specific — the more details, the better
2) Use context — the agent remembers the session
3) Mix modes — use `ai` to explore and `execute` to apply
4) Always review important changes

## Troubleshooting

If it doesn’t work as expected:
1) Check AI settings are correct
2) Ensure your provider (Gemini/LM Studio/OpenAI/Ollama) is running and reachable
3) Use `ai` instead of `execute` to preview commands
4) Check terminal logs for errors

---

Note: This feature is under active development. Feedback is welcome.
