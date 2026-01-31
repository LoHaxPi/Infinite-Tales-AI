<div align="center">


# 🎭 Infinite Tales AI

**AI驱动的无限互动小说引擎**

用人工智能构建属于你的故事宇宙

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)](https://angular.io/)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![OpenAI](https://img.shields.io/badge/OpenAI-Compatible-412991?logo=openai&logoColor=white)](https://openai.com/)

</div>

---

## ✨ 项目简介

**Infinite Tales AI** 是一款基于大语言模型的互动小说引擎。它能够根据你设定的主题、世界观和角色，实时生成沉浸式的文字冒险故事。每一次选择都会影响剧情走向，创造独一无二的叙事体验。

### 🎯 核心特性

| 特性 | 描述 |
|------|------|
| 🤖 **多AI后端支持** | 同时支持 Google Gemini 和 OpenAI 兼容 API |
| 🌍 **世界观生成** | AI 自动扩写你的简单设定为丰富的世界背景 |
| 🎨 **风格模板** | 内置多种叙事风格，支持自定义创作风格 |
| 💾 **存档系统** | 随时保存/加载游戏进度，支持多存档槽 |
| 📖 **沉浸式对话** | 区分叙事、对话、角色动作的精细化展示 |
| 🎭 **动态选项** | 每个选项包含简短标签和完整动作描述 |

---

## 🚀 快速开始

### 环境要求

- **Node.js** 18.0 或更高版本
- **npm** 包管理器
- Google Gemini API Key 或 OpenAI 兼容 API Key

### 一键启动

项目提供跨平台一键启动脚本：

**Windows (PowerShell):**
```powershell
.\start.ps1
```

**Windows (CMD):**
```cmd
start.bat
```

**Linux / macOS:**
```bash
chmod +x start.sh
./start.sh
```

### 手动安装

```bash
# 1. 克隆项目
git clone https://github.com/LoHaxPi/Infinite-Tales-AI.git
cd Infinite-Tales-AI

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

应用将在 `http://localhost:4200` 启动。

---

## 🎮 使用指南

### 1️⃣ 配置 API

首次使用时，点击界面上的 **API 设置**，选择你的 AI 服务商：

- **Google Gemini**: 填入你的 Gemini API Key
- **OpenAI 兼容**: 填入 API Key、Base URL 和模型名称

### 2️⃣ 创建故事

1. **选择主题** - 从预设主题中选择，或自定义你的故事类型
2. **设定世界观** - 输入简单描述，AI 会自动扩展为完整设定
3. **创建主角** - 定义你的角色名称和背景
4. **选择风格** - 使用内置风格模板或创建个人风格

### 3️⃣ 开始冒险

- 阅读 AI 生成的场景描述和 NPC 对话
- 从三个选项中选择你的行动
- 观察故事如何根据你的选择发展
- 随时保存进度，稍后继续

---

## 🏗️ 项目结构

```
Infinite-Tales-AI/
├── src/
│   ├── app.component.ts       # 主应用组件
│   ├── app.component.html     # 主视图模板
│   ├── components/
│   │   ├── setup-view.component.ts    # 游戏设置界面
│   │   ├── game-view.component.ts     # 游戏主界面
│   │   └── save-load-modal.component.ts  # 存档管理弹窗
│   ├── services/
│   │   ├── gemini.service.ts      # Google Gemini API 服务
│   │   ├── openai.service.ts      # OpenAI 兼容 API 服务
│   │   ├── api-config.service.ts  # API 配置管理
│   │   ├── persistence.service.ts # 存档持久化服务
│   │   └── ai.interface.ts        # AI 服务接口定义
│   └── models/
│       └── save-data.model.ts     # 存档数据模型
├── index.html                 # 入口 HTML
├── start.ps1 / start.bat / start.sh  # 一键启动脚本
└── package.json               # 项目配置
```

---

## 🔧 技术栈

- **前端框架**: Angular 21 (Standalone Components)
- **样式**: TailwindCSS
- **AI SDK**: 
  - `@google/genai` - Google Gemini API
  - 原生 Fetch API - OpenAI 兼容接口
- **构建工具**: Angular CLI + Vite
- **语言**: TypeScript 5.9

---

## 📝 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

<div align="center">

**用 AI 书写无限可能的故事** 🚀

[报告问题](https://github.com/LoHaxPi/Infinite-Tales-AI/issues) · [功能建议](https://github.com/LoHaxPi/Infinite-Tales-AI/issues)

</div>
