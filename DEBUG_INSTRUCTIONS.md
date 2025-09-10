# 🔍 PTY Debug Instructions

## 🎯 Identified Problem
The PTY receives the command but produces no output. The buffer is always empty (`output length: 0`).

## 🧪 Tests to Run

### 1. PTY Detection Test
```
test-pty-detection
```
This shows whether commands are detected as PTY.

### 2. Direct API Test
```
test-pty-api
```
This tests PTY APIs directly without the wrapper.

### 3. Real Command Test
```
npm install --dry-run lodash
```
This should show all debug logs.

## 📊 Logs to Look For

### DevTools Console (F12)

#### 1. Detection
- `SimpleTerminal: shouldUsePTY(npm install --dry-run lodash) = true`

#### 2. Execution
- `SimpleTerminal: Using PTY execution`
- `SimpleTerminal: executeWithPTY called with command: npm install --dry-run lodash`
- `SimpleTerminal: Showing loading indicator for PTY command: npm install --dry-run lodash`
- `SimpleTerminal: PTY mode enabled, isActive: true/false`

#### 3. Session
- `SimpleTerminal: Starting PTY session...` (if not active)
- `SimpleTerminal: PTY session started successfully`

#### 4. Command Send
- `SimpleTerminal: Sending command to PTY: npm install --dry-run lodash`
- `PTY sending command: npm install --dry-run lodash`
- `PTY command send result: true/false`
- `SimpleTerminal: PTY sendCommand result: true/false`

#### 5. Data Flow
- `PTY Manager writing to session X: npm install --dry-run lodash\r`
- `PTY Manager received data for session X:`
- `PTY polling got new data:`

## 🚨 Possible Issues

### 1. Command Not Detected as PTY
If you see `shouldUsePTY = false`, the command is not detected as PTY.

### 2. PTY Session Not Active
If you see `isActive: false`, the PTY session is not active.

### 3. Command Not Sent
If you don't see `PTY sending command:`, the command is not being sent.

### 4. PTY Not Receiving Data
If you don't see `PTY Manager received data:`, the PTY is not receiving output from the command.

## 🔧 Quick Fixes

### Fix 1: Force PTY Mode
If the command isn't detected as PTY, add manually:
```javascript
// In shouldUsePTY, add:
if (command.includes('npm install')) return true;
```

### Fix 2: Verify node-pty
If the PTY doesn't receive data, it may be a node-pty issue:
```bash
npm rebuild node-pty
```

### Fix 3: Use Fallback
If node-pty doesn't work, the system should automatically fallback.

## 📝 Next Step

1. **Run the tests** in order
2. **Copy the logs** from DevTools console
3. **Identify where the flow stalls**
4. **Apply the appropriate fix**

## 🎯 Expected Result

After the fix, you should see:
- ✅ Command detected as PTY
- ✅ Active PTY session
- ✅ Command sent to PTY
- ✅ Output received from PTY
- ✅ Output displayed in the terminal
