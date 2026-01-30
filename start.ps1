# Infinite Tales AI - PowerShell 启动器
# 支持 Windows PowerShell 和 PowerShell Core (跨平台)

$Host.UI.RawUI.WindowTitle = "Infinite Tales AI - 启动器"

function Write-ColorText {
    param(
        [string]$Text,
        [ConsoleColor]$Color = "White"
    )
    Write-Host $Text -ForegroundColor $Color
}

Write-Host ""
Write-ColorText "╔═══════════════════════════════════════════════════════════════╗" -Color Cyan
Write-ColorText "║       🎮 Infinite Tales AI - 一键启动器 (PowerShell)           ║" -Color Cyan
Write-ColorText "╚═══════════════════════════════════════════════════════════════╝" -Color Cyan
Write-Host ""

# 切换到脚本所在目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 检查 Node.js 是否安装
try {
    $nodeVersion = node --version 2>$null
    if (-not $nodeVersion) {
        throw "Node.js not found"
    }
    Write-ColorText "✓ Node.js 版本: $nodeVersion" -Color Green
} catch {
    Write-ColorText "❌ 错误: 未检测到 Node.js" -Color Red
    Write-Host ""
    Write-Host "请先安装 Node.js: https://nodejs.org/"
    Write-Host ""
    Read-Host "按回车键退出"
    exit 1
}

# 检查 npm 版本
try {
    $npmVersion = npm --version 2>$null
    Write-ColorText "✓ npm 版本: $npmVersion" -Color Green
} catch {
    Write-ColorText "❌ 错误: npm 不可用" -Color Red
    exit 1
}
Write-Host ""

# 检查 node_modules 是否存在
if (-not (Test-Path "node_modules")) {
    Write-ColorText "📦 首次运行，正在安装依赖..." -Color Yellow
    Write-Host ""
    
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-ColorText "❌ 依赖安装失败，请检查网络连接或手动运行 npm install" -Color Red
        Read-Host "按回车键退出"
        exit 1
    }
    
    Write-Host ""
    Write-ColorText "✓ 依赖安装完成!" -Color Green
    Write-Host ""
}

# 启动开发服务器
Write-ColorText "🚀 正在启动开发服务器..." -Color Blue
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host "  应用将在浏览器中自动打开，或手动访问:"
Write-ColorText "  👉 http://localhost:4200" -Color Cyan
Write-Host ""
Write-Host "  按 Ctrl+C 停止服务器"
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host ""

# 使用 npm run dev 启动，带 --open 自动打开浏览器
npm run dev -- --open
