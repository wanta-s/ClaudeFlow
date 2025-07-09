# MCP Tools Installer for AI-Context Flow (Windows PowerShell)
# This script installs essential MCP tools for enhanced Claude Code functionality

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "   MCP Tools Installer for AI-Context Flow  " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "npm version $npmVersion found" -ForegroundColor Green
} catch {
    Write-Host "Error: npm is not installed. Please install Node.js and npm first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Function to install a tool
function Install-MCPTool {
    param(
        [string]$ToolName,
        [string]$PackageName,
        [string]$Description
    )
    
    Write-Host "Installing $ToolName..." -ForegroundColor Yellow
    Write-Host "Description: $Description" -ForegroundColor Gray
    
    # Check if already installed
    $installed = npm list -g $PackageName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $ToolName is already installed" -ForegroundColor Green
        return $true
    }
    
    # Try to install
    try {
        npm install -g $PackageName
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $ToolName installed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "✗ Failed to install $ToolName" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "✗ Failed to install $ToolName" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $false
    }
    Write-Host ""
}

# Show installation plan
Write-Host "The following MCP tools will be installed:" -ForegroundColor Yellow
Write-Host "  1. Context7 (C7) - Documentation search" -ForegroundColor Gray
Write-Host "  2. Sequential - Problem decomposition" -ForegroundColor Gray
Write-Host "  3. Magic - Code compression" -ForegroundColor Gray
Write-Host "  4. Puppeteer - Browser automation" -ForegroundColor Gray
Write-Host ""

# Ask for confirmation
$confirmation = Read-Host "Do you want to proceed with the installation? (Y/n)"

if ($confirmation -ne '' -and $confirmation -notmatch '^[Yy]') {
    Write-Host "Installation cancelled by user." -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# Track installation status
$failedInstalls = @()

# Install Context7 (C7)
if (-not (Install-MCPTool -ToolName "Context7 (C7)" -PackageName "@context7/mcp-server" -Description "Official documentation search - Core tool for Research-First policy")) {
    $failedInstalls += "Context7"
}
Write-Host ""

# Install Sequential (--seq)
if (-not (Install-MCPTool -ToolName "Sequential" -PackageName "@sequential-thinking/mcp-server" -Description "Complex problem decomposition - Primary tool for Analyzer persona")) {
    $failedInstalls += "Sequential"
}
Write-Host ""

# Install Magic (--magic)
if (-not (Install-MCPTool -ToolName "Magic" -PackageName "@claudeflow/magic-mcp-server" -Description "Advanced compression and token optimization")) {
    $failedInstalls += "Magic"
}
Write-Host ""

# Install Puppeteer (--pup)
if (-not (Install-MCPTool -ToolName "Puppeteer" -PackageName "@puppeteer/mcp-server" -Description "Browser automation and web scraping")) {
    $failedInstalls += "Puppeteer"
}
Write-Host ""

# Copy AI-Context Flow configuration files
Write-Host ""
Write-Host "Installing AI-Context Flow configuration files..." -ForegroundColor Yellow

$claudeDir = "$env:USERPROFILE\.claude"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentDir = Split-Path -Parent $scriptDir

# Create .claude directory if it doesn't exist
if (-not (Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
    Write-Host "✓ Created $claudeDir" -ForegroundColor Green
}

# Copy CLAUDE.md
$claudeMdSource = Join-Path $parentDir "CLAUDE.md"
if (Test-Path $claudeMdSource) {
    Copy-Item $claudeMdSource -Destination $claudeDir -Force
    Write-Host "✓ Copied CLAUDE.md" -ForegroundColor Green
} else {
    Write-Host "⚠ CLAUDE.md not found in project root" -ForegroundColor Yellow
}

# Copy commands directory
$commandsSource = Join-Path $parentDir "commands"
$commandsTarget = Join-Path $claudeDir "commands"
if (Test-Path $commandsSource) {
    if (Test-Path $commandsTarget) {
        Remove-Item $commandsTarget -Recurse -Force
    }
    Copy-Item $commandsSource -Destination $claudeDir -Recurse -Force
    Write-Host "✓ Copied commands directory" -ForegroundColor Green
} else {
    Write-Host "⚠ commands directory not found" -ForegroundColor Yellow
}

# Copy shared directory
$sharedSource = Join-Path $parentDir "shared"
$sharedTarget = Join-Path $claudeDir "shared"
if (Test-Path $sharedSource) {
    if (Test-Path $sharedTarget) {
        Remove-Item $sharedTarget -Recurse -Force
    }
    Copy-Item $sharedSource -Destination $claudeDir -Recurse -Force
    Write-Host "✓ Copied shared directory" -ForegroundColor Green
} else {
    Write-Host "⚠ shared directory not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✓ AI-Context Flow configuration files installed successfully!" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "         Installation Summary           " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

if ($failedInstalls.Count -eq 0) {
    Write-Host "✓ All MCP tools installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now use these tools in Claude Code:" -ForegroundColor Green
    Write-Host "  - Context7 (C7): Documentation search" -ForegroundColor Gray
    Write-Host "  - Sequential (--seq): Logical problem solving" -ForegroundColor Gray
    Write-Host "  - Magic (--magic): Code compression" -ForegroundColor Gray
    Write-Host "  - Puppeteer (--pup): Browser automation" -ForegroundColor Gray
} else {
    Write-Host "Some tools failed to install:" -ForegroundColor Red
    foreach ($tool in $failedInstalls) {
        Write-Host "  - $tool" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please check the error messages above and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Happy coding with AI-Context Flow!" -ForegroundColor Green