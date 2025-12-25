---
sidebar_position: 2
slug: /getting-started
---

# 快速开始

## 安装依赖

```bash
# 在项目根目录
pnpm install
```

## 构建项目

```bash
# 构建所有包
pnpm build

# 或使用 VS Code 任务
# 按 Cmd+Shift+P，选择 "Tasks: Run Task"，然后选择 "build-all"
```

## 启动编辑器服务

```bash
# 启动 Web 应用
cd packages/editor
pnpm dev
```

访问 `http://localhost:5187` 查看应用。

## 启动文档服务

```bash
# 在 packages/docs 目录
cd packages/docs
pnpm start
```

访问 `http://localhost:3000` 查看文档。

## 项目结构

```
agilejs/
├── packages/
│   ├── core/            # Canvas 引擎核心包 (@fnt-agilejs/core)
│   │   ├── src/
│   │   │   ├── commands/   # 命令系统（撤销/重做）
│   │   │   ├── core/       # 核心引擎（CanvasEngine、EventBus、Animation 等）
│   │   │   ├── model/      # 数据模型（Graph、Scene、Serialize）
│   │   │   ├── plugins/    # 插件系统（26+ 内置插件）
│   │   │   ├── renderer/   # 渲染管线
│   │   │   ├── renderers/  # 节点/边渲染器
│   │   │   ├── utils/      # 工具函数（碰撞检测、端口计算等）
│   │   │   ├── workers/    # Web Workers
│   │   │   └── index.ts    # 导出入口
│   │   └── docs/           # 技术文档（性能优化、锚点系统等）
│   │
│   ├── editor/          # Web 编辑器示例应用（基于 Vite + React）
│   │   ├── src/
│   │   │   ├── app.tsx       # 应用入口组件
│   │   │   ├── main.tsx      # 主入口文件
│   │   │   ├── assets/       # 静态资源（图片、图标等）
│   │   │   ├── components/   # 可复用组件
│   │   │   ├── config/       # 配置文件（画布配置、节点类型等）
│   │   │   ├── hooks/        # 自定义 React Hooks
│   │   │   ├── mock/         # 模拟数据
│   │   │   ├── pages/        # 页面组件
│   │   │   ├── routes/       # 路由配置
│   │   │   ├── service/      # API 服务层
│   │   │   ├── store/        # 状态管理（Zustand）
│   │   │   ├── types/        # TypeScript 类型定义
│   │   │   └── utils/        # 工具函数
│   │   └── docs/             # 编辑器文档
│   │
│   └── docs/            # 文档站点（Docusaurus 3.9）
│       ├── docs/             # 整合后的 Markdown 文档
│       │   ├── intro.md      # 首页介绍
│       │   ├── canvas/       # Canvas 引擎文档
│       │   └── editor/       # 编辑器应用文档
│       ├── src/              # 文档站点源码
│       ├── static/           # 静态资源
│       ├── docusaurus.config.ts  # 站点配置
│       └── sidebars.ts       # 侧边栏配置
│
└── pnpm-workspace.yaml  # pnpm 工作区配置
```
