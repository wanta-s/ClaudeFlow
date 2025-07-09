#!/bin/bash
# Quick installer - Downloads and runs the MCP tools installer

echo "Downloading and running MCP Tools installer..."

# Method 1: Using curl
if command -v curl &> /dev/null; then
    curl -sSL https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/scripts/install-mcp-tools.js | node
    exit 0
fi

# Method 2: Using wget
if command -v wget &> /dev/null; then
    wget -qO- https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/scripts/install-mcp-tools.js | node
    exit 0
fi

echo "Error: Neither curl nor wget is installed."
exit 1