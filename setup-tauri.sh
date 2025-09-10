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

# Create icons directory if it doesn't exist
mkdir -p src-tauri/icons

# Copy icon if it exists
if [ -f "assets/termina.png" ]; then
    cp assets/termina.png src-tauri/icons/icon.png
    echo "✅ Icon copied"
fi

# Generate additional icon sizes
echo "📦 Generating icon sizes..."
if command -v convert &> /dev/null; then
    # Using ImageMagick
    convert assets/termina.png -resize 32x32 src-tauri/icons/32x32.png
    convert assets/termina.png -resize 128x128 src-tauri/icons/128x128.png
    convert assets/termina.png -resize 256x256 src-tauri/icons/128x128@2x.png
    echo "✅ Icons generated with ImageMagick"
elif command -v sips &> /dev/null; then
    # Using macOS sips
    sips -z 32 32 assets/termina.png --out src-tauri/icons/32x32.png
    sips -z 128 128 assets/termina.png --out src-tauri/icons/128x128.png
    sips -z 256 256 assets/termina.png --out src-tauri/icons/128x128@2x.png
    echo "✅ Icons generated with sips"
else
    echo "⚠️  ImageMagick or sips not found. Please generate icons manually."
fi

echo "🎉 Setup complete! You can now run:"
echo "  npm run dev     # Start development server"
echo "  npm run build   # Build for production"
echo "  npm run build:all # Build for all platforms"
