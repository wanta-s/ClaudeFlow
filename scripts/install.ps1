# AI-First Context Engineering - Quick Installer for Windows
# This script clones and installs SuperClaude MCP tools

Write-Host "🚀 AI-First Context Engineering Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Create temp directory
$tempDir = New-TemporaryFile | %{ rm $_; mkdir $_ }
Set-Location $tempDir

try {
    # Clone repository
    Write-Host "📦 Downloading repository..." -ForegroundColor Yellow
    git clone https://github.com/wanta-s/ai-first-context-engineering.git
    Set-Location ai-first-context-engineering

    # Run the installer
    Write-Host "🔧 Running installer..." -ForegroundColor Yellow
    if (Get-Command node -ErrorAction SilentlyContinue) {
        Write-Host "Using Node.js installer..." -ForegroundColor Green
        node scripts/install-mcp-tools.js
    } elseif (Test-Path "scripts/install-mcp-tools.ps1") {
        Write-Host "Using PowerShell installer..." -ForegroundColor Green
        .\scripts\install-mcp-tools.ps1
    } else {
        Write-Host "❌ No suitable installer found!" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Installation complete!" -ForegroundColor Green
    Write-Host "🎉 SuperClaude MCP tools are now installed in ~/.claude/" -ForegroundColor Cyan
}
finally {
    # Cleanup
    Set-Location $env:TEMP
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}