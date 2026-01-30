@echo off
chcp 65001 >nul
title Infinite Tales AI - 启动器

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║       🎮 Infinite Tales AI - 一键启动器 (Windows)             ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Node.js
    echo.
    echo 请先安装 Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 显示 Node.js 版本
echo ✓ Node.js 版本: 
node --version

:: 显示 npm 版本
echo ✓ npm 版本: 
npm --version
echo.

:: 检查 node_modules 是否存在
if not exist "node_modules\" (
    echo 📦 首次运行，正在安装依赖...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo ❌ 依赖安装失败，请检查网络连接或手动运行 npm install
        pause
        exit /b 1
    )
    echo.
    echo ✓ 依赖安装完成!
    echo.
)

:: 启动开发服务器
echo 🚀 正在启动开发服务器...
echo.
echo ═══════════════════════════════════════════════════════════════
echo   应用将在浏览器中自动打开，或手动访问:
echo   👉 http://localhost:4200
echo.
echo   按 Ctrl+C 停止服务器
echo ═══════════════════════════════════════════════════════════════
echo.

:: 使用 npm run dev 启动，带 --open 自动打开浏览器
call npm run dev -- --open
