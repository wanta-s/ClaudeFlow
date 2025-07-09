#!/bin/bash
# AI-First Context Engineering - Uninstaller
# This script removes ClaudeFlow MCP tools

set -e

echo "🗑️  AI-First Context Engineering Uninstaller"
echo "==========================================="
echo ""

# Confirm uninstallation
read -p "⚠️  This will remove ClaudeFlow MCP tools from ~/.claude/. Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Uninstallation cancelled."
    exit 0
fi

echo ""
echo "🔍 Checking for installed files..."

# Remove files and directories
REMOVED_COUNT=0

# Remove main configuration file
if [ -f "$HOME/.claude/CLAUDE.md" ]; then
    echo "📄 Removing CLAUDE.md..."
    rm -f "$HOME/.claude/CLAUDE.md"
    ((REMOVED_COUNT++))
fi

# Remove commands directory
if [ -d "$HOME/.claude/commands" ]; then
    echo "📁 Removing commands directory..."
    rm -rf "$HOME/.claude/commands"
    ((REMOVED_COUNT++))
fi

# Remove shared directory
if [ -d "$HOME/.claude/shared" ]; then
    echo "📁 Removing shared directory..."
    rm -rf "$HOME/.claude/shared"
    ((REMOVED_COUNT++))
fi

# Remove claude_mcp_config.json if it exists and is empty
if [ -f "$HOME/.claude/claude_mcp_config.json" ]; then
    if [ ! -s "$HOME/.claude/claude_mcp_config.json" ]; then
        echo "📄 Removing empty claude_mcp_config.json..."
        rm -f "$HOME/.claude/claude_mcp_config.json"
        ((REMOVED_COUNT++))
    else
        echo "⚠️  Keeping claude_mcp_config.json (contains other configurations)"
    fi
fi

# Remove .claude directory if empty
if [ -d "$HOME/.claude" ]; then
    if [ -z "$(ls -A $HOME/.claude)" ]; then
        echo "📁 Removing empty .claude directory..."
        rmdir "$HOME/.claude"
        ((REMOVED_COUNT++))
    else
        echo "ℹ️  Keeping .claude directory (contains other files)"
    fi
fi

echo ""
if [ $REMOVED_COUNT -gt 0 ]; then
    echo "✅ Uninstallation complete! Removed $REMOVED_COUNT items."
else
    echo "ℹ️  No ClaudeFlow MCP tools found to uninstall."
fi

echo ""
echo "👋 Thank you for using AI-First Context Engineering!"