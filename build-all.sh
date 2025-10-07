#!/bin/bash

set -euo pipefail

# Build script per Termina
# Genera eseguibili per tutte le piattaforme supportate sull'host corrente

echo "🚀 Building Termina for all platforms..."

# Verifica che node_modules esista
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Assicura che il logo sia disponibile per il frontend
if [ -f "logo.svg" ]; then
    echo "🎨 Copying logo.svg to asset folders..."
    mkdir -p assets renderer/assets
    cp logo.svg assets/logo.svg
    cp logo.svg renderer/assets/logo.svg
else
    echo "⚠️  logo.svg non trovato nella root del repository."
fi

# Sincronizza le risorse statiche nel folder dist usato dalla build Tauri
echo "🧱 Preparing dist/ assets from renderer/..."
npm run prepare:dist

# Genera le icone nativamente supportate da Tauri a partire dalla sorgente SVG
echo "🖼️  Generating platform icons from logo.svg..."
npm run icons

HOST_OS=$(uname -s)

build_mac() {
    if [[ "$HOST_OS" == "Darwin" ]]; then
        echo "🍎 Building for macOS (aarch64-apple-darwin)..."
        npm run build:mac
    else
        echo "⏭️  macOS build skipped: run this step on macOS."
    fi
}

ensure_rust_target() {
    local target="$1"

    if ! command -v rustup &>/dev/null; then
        echo "⚠️  rustup non è disponibile. Impossibile installare il target ${target}."
        return 1
    fi

    if ! rustup target list --installed | grep -q "^${target}$"; then
        echo "📦 Installing Rust target ${target}..."
        rustup target add "${target}"
    fi

    return 0
}

build_linux() {
    local target="x86_64-unknown-linux-gnu"
    echo "🐧 Building for Linux (${target})..."

    if ensure_rust_target "${target}"; then
        npm run build:linux
    else
        echo "⏭️  Linux build skipped: install rustup and the ${target} toolchain."
    fi
}

build_windows() {
    local target="x86_64-pc-windows-msvc"

    if [[ "$HOST_OS" == MSYS_NT* || "$HOST_OS" == MINGW* || "$HOST_OS" == CYGWIN* || "$HOST_OS" == "Windows_NT" ]]; then
        echo "🪟 Building for Windows (${target})..."
        if ensure_rust_target "${target}"; then
            npm run build:win
        else
            echo "⏭️  Windows build skipped: install rustup and the ${target} toolchain."
        fi
    else
        echo "⏭️  Windows build skipped: run this step on a Windows host with the MSVC toolchain."
    fi
}

build_mac
build_linux
build_windows

echo "✅ Build task completed. Check the platform-specific bundle directories under src-tauri/target/."
