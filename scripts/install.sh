#!/bin/bash
# ClaudeFlow - Quick Installer
# This script clones and installs ClaudeFlow MCP tools

set -e

echo "🚀 ClaudeFlow Installer"
echo "========================================"

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Clone repository
echo "📦 Downloading repository..."
git clone https://github.com/wanta-s/ClaudeFlow.git
cd ClaudeFlow

# Run the installer
echo "🔧 Running installer..."
if command -v node &> /dev/null; then
    echo "Using Node.js installer..."
    node scripts/install-mcp-tools.js
elif [ -f scripts/install-mcp-tools.sh ]; then
    echo "Using shell installer..."
    chmod +x scripts/install-mcp-tools.sh
    ./scripts/install-mcp-tools.sh
else
    echo "❌ No suitable installer found!"
    exit 1
fi

# Cleanup
cd /
rm -rf "$TEMP_DIR"

echo "✅ Installation complete!"
echo "🎉 ClaudeFlow MCP tools are now installed in ~/.claude/"