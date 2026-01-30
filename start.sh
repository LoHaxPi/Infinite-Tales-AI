#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       🎮 Infinite Tales AI - 一键启动器 (Unix)                 ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未检测到 Node.js${NC}"
    echo ""
    echo "请先安装 Node.js:"
    echo "  • macOS: brew install node"
    echo "  • Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  • 或访问: https://nodejs.org/"
    echo ""
    exit 1
fi

# 显示 Node.js 版本
echo -e "${GREEN}✓ Node.js 版本: $(node --version)${NC}"

# 显示 npm 版本
echo -e "${GREEN}✓ npm 版本: $(npm --version)${NC}"
echo ""

# 获取脚本所在目录并切换
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 首次运行，正在安装依赖...${NC}"
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}❌ 依赖安装失败，请检查网络连接或手动运行 npm install${NC}"
        exit 1
    fi
    echo ""
    echo -e "${GREEN}✓ 依赖安装完成!${NC}"
    echo ""
fi

# 启动开发服务器
echo -e "${BLUE}🚀 正在启动开发服务器...${NC}"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  应用将在浏览器中自动打开，或手动访问:"
echo -e "  👉 ${CYAN}http://localhost:4200${NC}"
echo ""
echo "  按 Ctrl+C 停止服务器"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 使用 npm run dev 启动，带 --open 自动打开浏览器
npm run dev -- --open
