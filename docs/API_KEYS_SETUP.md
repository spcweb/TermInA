# TermInA - API Keys Setup Guide

## 🔑 API Key Removed for Security

Your Gemini API key has been **removed from source code** and saved in:
- Backup file: `.credentials-backup.txt` (excluded from Git)

## 🚀 How to Re-insert the Key

### Method 1: Via Interface (Recommended)
1. Open TermInA
2. Click the **⚙️ Settings** icon
3. Go to **"AI Configuration"** section
4. Find the **"Gemini Configuration"** section
5. Enter your API key in the "API Key" field
6. Click **"Test Connection"** to verify
7. Click **"Save Settings"**

### Method 2: Via Configuration File
If you prefer to edit the file directly:
```json
// In src/config.js, modify:
gemini: {
  apiKey: 'YOUR_KEY_HERE',
  model: 'gemini-2.5-flash'
}
```

## 🔒 Security

### ✅ Done for You:
- API key removed from source code
- Backup file created (excluded from Git)
- .gitignore updated to exclude credentials

### 📝 For the Future:
- **NEVER** put API keys directly in code
- Always use app settings to insert keys
- Keys are saved in a local config file

## 🎯 Advantages of This Approach

1. **Security**: No keys in public repository
2. **Flexibility**: Each user can use their own keys
3. **Configurability**: Change providers without modifying code
4. **Sharing**: Project can be shared without concerns

## 🆘 If You Lose the Key

Your key is saved in `.credentials-backup.txt`, but if you lose it:

1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Login with your Google account
3. Click on "Get API Key"
4. Generate a new key
5. Insert it in TermInA settings

## ✨ Now the Project is Ready for Sharing!

Your TermInA project is now "production-ready" and can be shared publicly without security risks! 🎉
