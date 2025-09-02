#!/bin/bash

# Build script per Termina
# Genera eseguibili per tutte le piattaforme

echo "🚀 Building Termina for all platforms..."

# Verifica che node_modules esista
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build per macOS
echo "🍎 Building for macOS..."
npm run build:mac

# Build per Linux
echo "🐧 Building for Linux..."
npm run build:linux

# Build per Windows
echo "🪟 Building for Windows..."
npm run build:win

echo "✅ Build completed! Check the 'dist' folder for the executables."
echo ""
echo "📁 Generated files:"
echo "   - macOS: dist/Termina-2.0.0.dmg"
echo "   - Linux: dist/Termina-2.0.0.AppImage"
echo "   - Windows: dist/Termina Setup 2.0.0.exe"
