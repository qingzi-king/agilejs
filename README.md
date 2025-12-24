<div align="center">
  <img src="http://docs.antjob.ink/agile-ui/aLogo.svg" />
  <h3>一个轻量级、零依赖的 Canvas 可视化引擎</h3>
  <div style="font-size: 14px">AgileJS Graph 是一套基于 HTML Canvas 的图形编辑/渲染基础框架，采用「核心引擎 + 插件 + 渲染器」架构，并提供 Web 端可视化编辑器与文档站点。</div>
  <video src="http://docs.antjob.ink/agile-ui/preview.mov" muted autoplay loop playsinline width="100%" />
</div>

## 📚 Packages 一览

| Package           | 说明                                                        | 技术栈       |
| ----------------- | ----------------------------------------------------------- | ------------ |
| `packages/core`   | 画布引擎：数据模型、渲染器、交互插件等（`@agilejs/core`）   | TypeScript   |
| `packages/editor` | Web 编辑器：基于 core 的可视化编辑应用（`@agilejs/editor`） | React + Vite |
| `packages/docs`   | 文档站点：用户文档/指南/示例                                | Docusaurus   |

## 📁 项目结构（Monorepo）

```
.
├── packages/
│   ├── core/            # 画布引擎：数据模型、渲染器、交互插件等（@agilejs/core）
│   ├── editor/          # Web 编辑器：基于 core 的可视化编辑应用（@agilejs/editor）
│   └── docs/            # 文档站点：Docusaurus（用户文档/指南/示例）
├── prettier.config.cjs  # 统一代码格式化配置（2 空格缩进）
├── .prettierignore
├── pnpm-workspace.yaml
└── package.json
```

## ✨ 功能划分

### packages/core（画布引擎）

- **CanvasEngine**：渲染循环、事件系统、性能监控等引擎能力
- **Graph / Scene / Serialize**：图数据模型与序列化（导入/导出）
- **Renderers**：内置形状/连线渲染器 + 渲染器注册机制
- **Plugins**：网格、选择、拖拽、连线、缩放/平移、快捷键、编辑增强等交互插件

### packages/editor（Web 编辑器）

- 基于 React + Vite 的前端应用
- 以 `@agilejs/core` 为底座，组合 UI 面板、工具栏、属性编辑等，形成可用的图形编辑器工程

### packages/docs（文档站点）

- Docusaurus 构建的文档与示例说明

## 🚀 快速开始

```bash
pnpm -w install
```

启动编辑器：

```bash
pnpm -C packages/editor dev
```

启动文档站：

```bash
pnpm -C packages/docs dev
```

构建全部 packages：

```bash
pnpm -r run build
```

## 💄  环境要求

- Node.js：`>= 18.12.0`
- 包管理器：推荐`pnpm`

## 🔨  常用命令

根目录常用：

```bash
# 一键启动（会并行启动多个 package 的 dev）
pnpm -r run dev

# 构建
pnpm -r run build

# 格式化（Prettier，2 空格缩进）
pnpm run format
pnpm run format:check
```
