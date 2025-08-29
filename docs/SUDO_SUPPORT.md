# TermInA - Sudo Support Guide

## 🔐 Using Sudo Commands in TermInA

TermInA now supports `sudo` commands with secure password input!

### ✅ **How It Works**

1. **Type any sudo command** in the terminal
2. **Password prompt appears** - a secure dialog window
3. **Enter your password** - input is hidden for security
4. **Command executes** with administrator privileges

### 🎯 **Example Usage**

```bash
# Example sudo commands that now work:
sudo ls /root
sudo chmod 755 /usr/local/bin/myapp
sudo npm install -g some-package
sudo systemctl restart nginx
sudo mkdir /etc/myapp
```

### 🔧 **Features**

#### Secure Password Input
- ✅ **Hidden password** - characters are masked
- ✅ **No password storage** - entered only when needed
- ✅ **Cancellable** - press Esc or Cancel button
- ✅ **Keyboard shortcuts** - Enter to confirm, Esc to cancel

#### Smart Command Detection
- ✅ **Auto-detection** - automatically detects sudo commands
- ✅ **Helpful suggestions** - provides alternatives when possible
- ✅ **Error handling** - clear error messages for failed commands

### 🎨 **Password Dialog**

When you enter a sudo command, you'll see:

```
🔐 Administrator Password Required
Enter your password to execute the sudo command:

[Password Input Field - Hidden]

[Cancel] [OK]
```

### ⌨️ **Keyboard Shortcuts**

| Key | Action |
|-----|--------|
| `Enter` | Execute sudo command with entered password |
| `Esc` | Cancel sudo command |
| `Tab` | Navigate between buttons |

### 🛡️ **Security Features**

1. **No Password Storage**: Passwords are never stored or logged
2. **Secure Transmission**: Password is sent directly to system
3. **Process Isolation**: Each sudo command runs in isolated process
4. **Timeout Protection**: Commands timeout if they take too long

### 🔄 **Command Flow**

1. User types: `sudo ls /root`
2. TermInA detects sudo command
3. Password dialog appears
4. User enters password
5. Command executes with sudo privileges
6. Output displayed in terminal

### 🚨 **Error Handling**

#### Common Error Messages:

```bash
[Error] Command failed with code 1
# Wrong password or permission denied

[Cancelled] Sudo command cancelled by user
# User pressed Cancel or Esc

[Error] Command not found
# Invalid command after sudo
```

### 💡 **Tips & Best Practices**

#### For Better Security:
- Only enter password when you trust the command
- Double-check command before entering password
- Use sudo only when necessary

#### Performance Tips:
- Recent sudo commands may not require password (sudo timeout)
- Use specific commands instead of broad permissions
- Consider using aliases for frequently used sudo commands

### 🔧 **Troubleshooting**

#### Password Dialog Doesn't Appear
- Check if command actually starts with `sudo`
- Ensure JavaScript is enabled
- Try restarting TermInA

#### Command Fails After Password Entry
- Verify password is correct
- Check if command exists and has correct syntax
- Some commands may require additional permissions

#### Styling Issues
- Password dialog inherits terminal theme
- Ensure CSS is loaded properly
- Try refreshing the application

### 📋 **Supported Sudo Operations**

✅ **File Operations**
```bash
sudo chmod, sudo chown, sudo mkdir, sudo rm
```

✅ **Package Management**
```bash
sudo npm install -g, sudo brew install
```

✅ **System Services**
```bash
sudo systemctl, sudo service
```

✅ **Network Operations**
```bash
sudo netstat, sudo ss, sudo iptables
```

✅ **Process Management**
```bash
sudo kill, sudo killall
```

### 🚀 **Advanced Usage**

#### Using with AI Commands
```bash
# AI can suggest sudo commands
ai "install nginx globally"
# Then execute the suggested sudo command

execute "set up a web server"
# AI might suggest sudo commands automatically
```

#### Batch Operations
```bash
# Each sudo command will prompt separately
sudo mkdir /etc/myapp
sudo chmod 755 /etc/myapp
sudo chown user:group /etc/myapp
```

---

**Now you can use sudo commands safely and efficiently in TermInA! 🎉**

*Note: This feature requires administrator privileges on your system.*
