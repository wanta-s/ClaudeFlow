# MCP Tools Installer for AI-Context Flow

This installer helps you set up essential MCP (Model Context Protocol) tools for enhanced Claude Code functionality.

## Tools Included

1. **Context7 (C7)** - Official documentation search tool
2. **Sequential (--seq)** - Complex problem decomposition
3. **Magic (--magic)** - Advanced compression and token optimization
4. **Puppeteer (--pup)** - Browser automation and web scraping

## Installation Methods

### Method 1: Node.js (Cross-platform)
```bash
node install-mcp-tools.js
```

### Method 2: Bash (Linux/macOS)
```bash
chmod +x install-mcp-tools.sh
./install-mcp-tools.sh
```


## Prerequisites

- Node.js and npm must be installed
- Internet connection for downloading packages
- Administrator/sudo privileges may be required

## Troubleshooting

If installation fails:
1. Ensure npm is properly installed: `npm --version`
2. Try running with administrator privileges
3. Check your internet connection
4. Clear npm cache: `npm cache clean --force`

## Manual Installation

If the installer doesn't work, you can install tools manually:

```bash
npm install -g @context7/mcp-server
npm install -g @sequential-thinking/mcp-server
npm install -g @claudeflow/magic-mcp-server
npm install -g @puppeteer/mcp-server
```

## After Installation

Once installed, these tools will be available in Claude Code to enhance your development experience with AI-Context Flow's advanced features.