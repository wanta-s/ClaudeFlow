#!/bin/bash
# ClaudeFlow - Quick Updater
# This script updates ClaudeFlow MCP tools to the latest version

set -e

echo "🔄 ClaudeFlow Updater"
echo "======================================="

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Clone repository
echo "📦 Downloading latest version..."
git clone https://github.com/wanta-s/ClaudeFlow.git
cd ClaudeFlow

# Run the updater
echo "🔧 Running updater..."
if command -v node &> /dev/null; then
    echo "Using Node.js updater..."
    node scripts/install-mcp-tools.js --update
else
    echo "❌ Node.js is required for updating!"
    echo "Please install Node.js first or use the manual update method."
    exit 1
fi

# Cleanup
cd /
rm -rf "$TEMP_DIR"

echo "✅ Update complete!"