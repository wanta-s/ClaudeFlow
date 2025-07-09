#!/bin/bash
# AI-First Context Engineering - Quick Installer
# This script clones and installs AI-Context Flow MCP tools

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
echo "🎉 AI-Context Flow MCP tools are now installed in ~/.claude/"