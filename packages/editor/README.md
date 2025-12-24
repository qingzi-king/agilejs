# AgileJS Editor

AgileJS Web 编辑器（`@agilejs/editor`）是基于 `@agilejs/core` 的可视化图形编辑应用，用于演示与验证引擎能力，并提供一套可落地的编辑器工程模板。

## 能力概览

- 基于画布引擎的图形编辑：节点/连线绘制、选择、拖拽、缩放/平移等
- 属性面板与工具栏：常用编辑操作与配置入口
- 数据导入/导出：配合 `core` 的序列化能力

## 开发

在仓库根目录安装依赖：

```bash
pnpm -w install
```

启动本地开发（默认端口 `5187`）：

```bash
pnpm -C packages/editor dev
```

本地预览构建产物：

```bash
pnpm -C packages/editor serve
```

## 构建与部署

- 生产构建：

```bash
pnpm -C packages/editor pro
```

- 部署脚本（会先构建再执行 `deploy/production.sh`）：

```bash
pnpm -C packages/editor deploy
```

## 代码质量

```bash
pnpm -C packages/editor lint
pnpm -C packages/editor format
pnpm -C packages/editor format:check
```

## 目录结构

```
packages/editor/
├── src/
│   ├── pages/           # 页面（编辑/预览等）
│   ├── components/      # UI 组件（面板、工具栏等）
│   ├── store/           # 状态管理
│   ├── routes/          # 路由
│   ├── utils/           # 工具方法
│   └── assets/          # 静态资源与样式
└── vite.config.ts
```

## 相关链接

- 在线文档/示例： https://agilejs.funenc.com/
