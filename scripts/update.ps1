# AI-First Context Engineering - Quick Updater for Windows
# This script updates ClaudeFlow MCP tools to the latest version

Write-Host "🔄 AI-First Context Engineering Updater" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Create temp directory
$tempDir = New-TemporaryFile | %{ rm $_; mkdir $_ }
Set-Location $tempDir

try {
    # Clone repository
    Write-Host "📦 Downloading latest version..." -ForegroundColor Yellow
    git clone https://github.com/wanta-s/ai-first-context-engineering.git
    Set-Location ai-first-context-engineering

    # Run the updater
    Write-Host "🔧 Running updater..." -ForegroundColor Yellow
    if (Get-Command node -ErrorAction SilentlyContinue) {
        Write-Host "Using Node.js updater..." -ForegroundColor Green
        node scripts/install-mcp-tools.js --update
    } else {
        Write-Host "❌ Node.js is required for updating!" -ForegroundColor Red
        Write-Host "Please install Node.js first or use the manual update method." -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Update complete!" -ForegroundColor Green
}
finally {
    # Cleanup
    Set-Location $env:TEMP
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}