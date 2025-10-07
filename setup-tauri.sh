#!/bin/bash

echo "🚀 Setting up TermInA with Tauri..."

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "📦 Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    echo "✅ Rust installed successfully"
else
    echo "✅ Rust is already installed"
fi

# Check if Tauri CLI is installed
if ! command -v tauri &> /dev/null; then
    echo "📦 Installing Tauri CLI..."
    cargo install tauri-cli
    echo "✅ Tauri CLI installed successfully"
else
    echo "✅ Tauri CLI is already installed"
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Assicura che il logo principale sia raggiungibile
if [ -f "logo.svg" ]; then
    mkdir -p assets renderer/assets
    cp logo.svg assets/logo.svg
    cp logo.svg renderer/assets/logo.svg
    echo "✅ logo.svg copiato nelle cartelle assets/"

    echo "📦 Generating icon set from logo.svg via Tauri CLI..."
    npm run prepare:dist
    npm run icons
else
    echo "⚠️  logo.svg non trovato: salta la generazione delle icone."
fi

echo "🎉 Setup complete! You can now run:"
echo "  npm run dev     # Start development server"
echo "  npm run build   # Build for production"
echo "  npm run build:all # Build for all platforms"
