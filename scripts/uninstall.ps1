# AI-First Context Engineering - Uninstaller for Windows
# This script removes ClaudeFlow MCP tools

Write-Host "🗑️  AI-First Context Engineering Uninstaller" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""

# Confirm uninstallation
$confirmation = Read-Host "⚠️  This will remove ClaudeFlow MCP tools from ~/.claude/. Continue? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Uninstallation cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔍 Checking for installed files..." -ForegroundColor Yellow

# Define paths
$claudeDir = "$env:USERPROFILE\.claude"
$removedCount = 0

# Remove main configuration file
$claudeMd = Join-Path $claudeDir "CLAUDE.md"
if (Test-Path $claudeMd) {
    Write-Host "📄 Removing CLAUDE.md..." -ForegroundColor Yellow
    Remove-Item $claudeMd -Force
    $removedCount++
}

# Remove commands directory
$commandsDir = Join-Path $claudeDir "commands"
if (Test-Path $commandsDir) {
    Write-Host "📁 Removing commands directory..." -ForegroundColor Yellow
    Remove-Item $commandsDir -Recurse -Force
    $removedCount++
}

# Remove shared directory
$sharedDir = Join-Path $claudeDir "shared"
if (Test-Path $sharedDir) {
    Write-Host "📁 Removing shared directory..." -ForegroundColor Yellow
    Remove-Item $sharedDir -Recurse -Force
    $removedCount++
}

# Remove claude_mcp_config.json if it exists and is empty
$configFile = Join-Path $claudeDir "claude_mcp_config.json"
if (Test-Path $configFile) {
    $fileInfo = Get-Item $configFile
    if ($fileInfo.Length -eq 0) {
        Write-Host "📄 Removing empty claude_mcp_config.json..." -ForegroundColor Yellow
        Remove-Item $configFile -Force
        $removedCount++
    } else {
        Write-Host "⚠️  Keeping claude_mcp_config.json (contains other configurations)" -ForegroundColor Cyan
    }
}

# Remove .claude directory if empty
if (Test-Path $claudeDir) {
    $items = Get-ChildItem $claudeDir -Force
    if ($items.Count -eq 0) {
        Write-Host "📁 Removing empty .claude directory..." -ForegroundColor Yellow
        Remove-Item $claudeDir -Force
        $removedCount++
    } else {
        Write-Host "ℹ️  Keeping .claude directory (contains other files)" -ForegroundColor Cyan
    }
}

Write-Host ""
if ($removedCount -gt 0) {
    Write-Host "✅ Uninstallation complete! Removed $removedCount items." -ForegroundColor Green
} else {
    Write-Host "ℹ️  No ClaudeFlow MCP tools found to uninstall." -ForegroundColor Cyan
}

Write-Host ""
Write-Host "👋 Thank you for using AI-First Context Engineering!" -ForegroundColor Cyan