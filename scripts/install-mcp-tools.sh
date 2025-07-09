#!/bin/bash

# MCP Tools Installer for SuperClaude
# This script installs essential MCP tools for enhanced Claude Code functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   MCP Tools Installer for SuperClaude  ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install Node.js and npm first.${NC}"
    exit 1
fi

# Function to install a tool
install_tool() {
    local tool_name=$1
    local package_name=$2
    local description=$3
    
    echo -e "${YELLOW}Installing $tool_name...${NC}"
    echo -e "Description: $description"
    
    if npm list -g "$package_name" &> /dev/null; then
        echo -e "${GREEN}✓ $tool_name is already installed${NC}"
    else
        if npm install -g "$package_name"; then
            echo -e "${GREEN}✓ $tool_name installed successfully${NC}"
        else
            echo -e "${RED}✗ Failed to install $tool_name${NC}"
            return 1
        fi
    fi
    echo ""
}

# Ask for confirmation
echo -e "${YELLOW}The following MCP tools will be installed:${NC}"
echo "  1. Context7 (C7) - Documentation search"
echo "  2. Sequential - Problem decomposition"
echo "  3. Magic - Code compression"
echo "  4. Puppeteer - Browser automation"
echo ""

read -p "Do you want to proceed with the installation? (Y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
    echo -e "${YELLOW}Installation cancelled by user.${NC}"
    exit 0
fi

echo ""

# Track installation status
failed_installs=()

# Install Context7 (C7)
if ! install_tool "Context7 (C7)" "@context7/mcp-server" "Official documentation search - Core tool for Research-First policy"; then
    failed_installs+=("Context7")
fi

# Install Sequential (--seq)
if ! install_tool "Sequential" "@sequential-thinking/mcp-server" "Complex problem decomposition - Primary tool for Analyzer persona"; then
    failed_installs+=("Sequential")
fi

# Install Magic (--magic)
if ! install_tool "Magic" "@superclaude/magic-mcp-server" "Advanced compression and token optimization"; then
    failed_installs+=("Magic")
fi

# Install Puppeteer (--pup)
if ! install_tool "Puppeteer" "@puppeteer/mcp-server" "Browser automation and web scraping"; then
    failed_installs+=("Puppeteer")
fi

# Copy SuperClaude configuration files
echo ""
echo -e "${YELLOW}Installing SuperClaude configuration files...${NC}"

CLAUDE_DIR="$HOME/.claude"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PARENT_DIR="$( dirname "$SCRIPT_DIR" )"

# Create .claude directory if it doesn't exist
if [ ! -d "$CLAUDE_DIR" ]; then
    mkdir -p "$CLAUDE_DIR"
    echo -e "${GREEN}✓ Created $CLAUDE_DIR${NC}"
fi

# Copy CLAUDE.md
if [ -f "$PARENT_DIR/CLAUDE.md" ]; then
    cp "$PARENT_DIR/CLAUDE.md" "$CLAUDE_DIR/"
    echo -e "${GREEN}✓ Copied CLAUDE.md${NC}"
else
    echo -e "${YELLOW}⚠ CLAUDE.md not found in project root${NC}"
fi

# Copy commands directory
if [ -d "$PARENT_DIR/commands" ]; then
    cp -r "$PARENT_DIR/commands" "$CLAUDE_DIR/"
    echo -e "${GREEN}✓ Copied commands directory${NC}"
else
    echo -e "${YELLOW}⚠ commands directory not found${NC}"
fi

# Copy shared directory
if [ -d "$PARENT_DIR/shared" ]; then
    cp -r "$PARENT_DIR/shared" "$CLAUDE_DIR/"
    echo -e "${GREEN}✓ Copied shared directory${NC}"
else
    echo -e "${YELLOW}⚠ shared directory not found${NC}"
fi

echo ""
echo -e "${GREEN}✓ SuperClaude configuration files installed successfully!${NC}"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}         Installation Summary           ${NC}"
echo -e "${GREEN}========================================${NC}"

if [ ${#failed_installs[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All MCP tools installed successfully!${NC}"
    echo ""
    echo "You can now use these tools in Claude Code:"
    echo "  - Context7 (C7): Documentation search"
    echo "  - Sequential (--seq): Logical problem solving"
    echo "  - Magic (--magic): Code compression"
    echo "  - Puppeteer (--pup): Browser automation"
else
    echo -e "${RED}Some tools failed to install:${NC}"
    for tool in "${failed_installs[@]}"; do
        echo -e "${RED}  - $tool${NC}"
    done
    echo ""
    echo -e "${YELLOW}Please check the error messages above and try again.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Happy coding with SuperClaude!${NC}"