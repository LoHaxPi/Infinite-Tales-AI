# Infinite Tales AI - PowerShell Launcher
# Supports Windows PowerShell and PowerShell Core (cross-platform)

$Host.UI.RawUI.WindowTitle = "Infinite Tales AI - Launcher"

function Write-ColorText {
    param(
        [string]$Text,
        [ConsoleColor]$Color = [ConsoleColor]::White
    )
    Write-Host $Text -ForegroundColor $Color
}

Write-Host ""
Write-ColorText "======================================================" -Color Cyan
Write-ColorText "       Infinite Tales AI - One-Click Launcher         " -Color Cyan
Write-ColorText "======================================================" -Color Cyan
Write-Host ""

# Switch to script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    if (-not $nodeVersion) {
        throw "Node.js not found"
    }
    Write-ColorText "[OK] Node.js: $nodeVersion" -Color Green
}
catch {
    Write-ColorText "[ERROR] Node.js not detected" -Color Red
    Write-Host ""
    Write-Host "Please install Node.js: https://nodejs.org/"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm version
try {
    $npmVersion = npm --version 2>$null
    Write-ColorText "[OK] npm: $npmVersion" -Color Green
}
catch {
    Write-ColorText "[ERROR] npm not available" -Color Red
    exit 1
}
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-ColorText "[*] First run, installing dependencies..." -Color Yellow
    Write-Host ""
    
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-ColorText "[ERROR] Dependency installation failed" -Color Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    Write-Host ""
    Write-ColorText "[OK] Dependencies installed!" -Color Green
    Write-Host ""
}

# Start dev server
Write-ColorText "[*] Starting development server..." -Color Blue
Write-Host ""
Write-Host "======================================================"
Write-Host "  App will open in browser, or visit manually:"
Write-ColorText "  -> http://localhost:4200" -Color Cyan
Write-Host ""
Write-Host "  Press Ctrl+C to stop the server"
Write-Host "======================================================"
Write-Host ""

# Start with npm run dev and --open flag
npm run dev -- --open
