# TermInA Build Guide

Complete guide for building and distributing TermInA across all platforms.

## 🚀 Quick Build

### Prerequisites
- Node.js 18+
- npm or yarn
- Platform-specific build tools (see below)

### Build Commands
```bash
# Install dependencies
npm install

# Build for current platform
npm run build

# Build for all platforms
npm run build:all

# Create distributable packages
npm run dist
```

## 🏗️ Platform-Specific Setup

### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install additional dependencies
brew install create-dmg
```

### Windows
```bash
# Install Visual Studio Build Tools
npm install --global windows-build-tools

# Or use Chocolatey
choco install visualstudio2019buildtools
```

### Linux
```bash
# Ubuntu/Debian
sudo apt-get install build-essential libgtk-3-dev libwebkit2gtk-4.0-dev

# CentOS/RHEL
sudo yum groupinstall "Development Tools"
sudo yum install gtk3-devel webkit2gtk3-devel
```

## ⚙️ Build Configuration

### package.json Scripts
```json
{
  "scripts": {
    "build": "electron-builder --dir",
    "build:all": "electron-builder -mwl",
    "dist": "electron-builder",
    "dist:all": "electron-builder -mwl",
    "postinstall": "electron-builder install-app-deps"
  }
}
```

### electron-builder.yml
```yaml
appId: com.termina.app
productName: TermInA
directories:
  output: dist
  buildResources: build
files:
  - "**/*"
  - "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}"
  - "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}"
  - "!**/node_modules/*.d.ts"
  - "!**/node_modules/.bin"
  - "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}"
  - "!.editorconfig"
  - "!**/._*"
  - "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}"
  - "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}"
  - "!**/{appveyor.yml,.travis.yml,circle.yml}"
  - "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
mac:
  category: public.app-category.developer-tools
  target:
    - target: dmg
      arch: [x64, arm64]
    - target: zip
      arch: [x64, arm64]
  icon: build/icon.icns
  darkModeSupport: true
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
win:
  target:
    - target: nsis
      arch: [x64, arm64]
    - target: portable
      arch: [x64, arm64]
  icon: build/icon.ico
  artifactName: "${productName}-Setup-${version}-${arch}.${ext}"
linux:
  target:
    - target: AppImage
      arch: [x64, arm64]
    - target: deb
      arch: [x64, arm64]
    - target: rpm
      arch: [x64, arm64]
  icon: build/icon.png
  category: Development
  desktop:
    Name: TermInA
    Comment: Advanced AI-Powered Terminal
    GenericName: Terminal Emulator
    Keywords: terminal;shell;ai;artificial intelligence
    StartupNotify: true
```

## 🎨 Icon Generation

### Generate Icons Script
```bash
# Run the icon generation script
node build/generate-icons.js
```

This script creates:
- `icon.icns` (macOS)
- `icon.ico` (Windows)
- `icon.png` (Linux)
- Various sizes for different platforms

### Icon Requirements
- **Source**: 512x512 PNG with transparency
- **Formats**: PNG, ICO, ICNS
- **Sizes**: 16, 32, 48, 64, 128, 256, 512 pixels

## 📦 Distribution

### Build Outputs
```
dist/
├── mac-arm64/
│   └── Termina.app
├── win-arm64/
│   ├── Termina.exe
│   └── Termina Setup.exe
├── linux-arm64/
│   ├── termina
│   └── Termina-0.2.0-beta-arm64.AppImage
└── builder-debug.yml
```

### Code Signing (macOS)
```bash
# Create entitlements file
cat > build/entitlements.mac.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
</dict>
</plist>
EOF

# Build with code signing
CSC_IDENTITY_AUTO_DISCOVERY=true npm run dist
```

### Code Signing (Windows)
```bash
# Set environment variables
set CSC_LINK=path\to\certificate.p12
set CSC_KEY_PASSWORD=your_password

# Build with code signing
npm run dist
```

## 🔧 Advanced Configuration

### Environment Variables
```bash
# Development
NODE_ENV=development
DEBUG=*

# Production
NODE_ENV=production
CSC_IDENTITY_AUTO_DISCOVERY=true
```

### Build Optimization
```json
{
  "build": {
    "compression": "maximum",
    "removePackageScripts": true,
    "removePackageKeywords": true,
    "extraResources": [
      {
        "from": "assets/",
        "to": "assets/"
      }
    ]
  }
}
```

## 🐛 Troubleshooting

### Common Build Issues

#### macOS
```bash
# Fix Xcode path issues
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# Reset Xcode cache
rm -rf ~/Library/Developer/Xcode/DerivedData
```

#### Windows
```bash
# Fix Python path issues
npm config set python python2.7

# Fix Visual Studio issues
npm config set msvs_version 2019
```

#### Linux
```bash
# Fix GTK issues
export DISPLAY=:0

# Fix WebKit issues
sudo apt-get install libwebkit2gtk-4.0-dev
```

### Debug Build
```bash
# Enable verbose logging
DEBUG=electron-builder npm run build

# Check build configuration
npx electron-builder --help
```

## 📊 Build Statistics

### Build Times (M1 Mac)
- **macOS**: ~2 minutes
- **Windows**: ~3 minutes  
- **Linux**: ~2.5 minutes

### Package Sizes
- **macOS DMG**: ~120 MB
- **Windows Setup**: ~110 MB
- **Linux AppImage**: ~115 MB

## 🚀 Continuous Integration

### GitHub Actions Example
```yaml
name: Build and Release
on:
  push:
    tags: ['v*']
jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: dist/
```

## 📚 Additional Resources

- [Electron Builder Documentation](https://www.electron.build/)
- [Code Signing Guide](https://www.electron.build/code-signing)
- [Auto Update Configuration](https://www.electron.build/auto-update)
- [Platform-Specific Options](https://www.electron.build/configuration/configuration)

---

**Last Updated**: September 2025  
**Version**: 0.2 BETA
