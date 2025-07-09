#!/bin/bash
# AI-First Context Engineering - Quick Installer
# This script clones and installs SuperClaude MCP tools

set -e

echo "🚀 AI-First Context Engineering Installer"
echo "========================================"

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Clone repository
echo "📦 Downloading repository..."
git clone https://github.com/wanta-s/ai-first-context-engineering.git
cd ai-first-context-engineering

# Run the installer
echo "🔧 Running installer..."
if command -v node &> /dev/null; then
    echo "Using Node.js installer..."
    node install-mcp-tools.js
elif [ -f install-mcp-tools.sh ]; then
    echo "Using shell installer..."
    chmod +x install-mcp-tools.sh
    ./install-mcp-tools.sh
else
    echo "❌ No suitable installer found!"
    exit 1
fi

# Cleanup
cd /
rm -rf "$TEMP_DIR"

echo "✅ Installation complete!"
echo "🎉 SuperClaude MCP tools are now installed in ~/.claude/"