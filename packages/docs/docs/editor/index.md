---
sidebar_position: 1
---

# Web 应用简介

Web 应用是基于 AgileJS Canvas 引擎构建的完整示例项目，展示了如何在实际业务场景中使用 Canvas 引擎。

## 主要特性

- **可视化编辑器**：拖拽式图形编辑界面
- **属性面板**：动态配置节点和边的属性
- **锚点系统**：灵活的连接点配置和管理
- **示例集合**：多种场景示例，包括流程图、拓扑图等
- **响应式设计**：适配不同屏幕尺寸

## 快速开始

### 启动开发服务器

```bash
cd packages/web
pnpm dev
```

访问 `http://localhost:5173` 查看应用。

### 构建生产版本

```bash
cd packages/web
pnpm build
```

构建产物在 `dist` 目录。

## 功能文档

## 应用场景

### 流程图编辑器
使用节点和连线创建业务流程图，支持：
- 拖拽添加节点
- 连接节点创建流程
- 调整节点大小和位置
- 保存和导出流程图

### 网络拓扑图
展示网络架构和连接关系：
- 可视化网络设备
- 显示连接状态
- 实时更新拓扑变化

### 思维导图
组织想法和知识结构：
- 层次化节点组织
- 快速创建子节点
- 导出为图片或数据

## 技术栈

- **React 19**: UI 框架
- **TypeScript**: 类型安全
- **Vite**: 构建工具
- **Tailwind CSS**: 样式框架
- **@agilejs/core**: 图形引擎

## 目录结构

```
packages/editor/
├── src/
│   ├── components/      # React 组件
│   │   ├── Canvas/     # Canvas 相关组件
│   │   ├── PropertyPanel/ # 属性面板
│   │   └── Toolbar/    # 工具栏
│   ├── pages/          # 页面组件
│   ├── hooks/          # 自定义 Hooks
│   ├── mock/           # 模拟数据
│   ├── config/         # 配置文件
│   └── utils/          # 工具函数
├── docs/               # 文档
└── public/             # 静态资源
```

## 开发指南

### 添加新示例

1. 在 `src/mock/examples/` 创建示例数据文件
2. 在示例选择器中注册新示例
3. 测试示例功能

### 自定义组件

```typescript
import { CanvasEngine } from '@agilejs/core';
import { useEffect, useRef } from 'react';

function MyCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CanvasEngine>();

  useEffect(() => {
    if (containerRef.current) {
      const engine = new CanvasEngine({
        container: containerRef.current,
        background: '#ffffff',
      });
      
      engineRef.current = engine;
      engine.start();

      return () => {
        engine.dispose();
      };
    }
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '600px' }} />;
}
```

## 🔍 调试技巧

### 查看引擎状态

```typescript
// 在浏览器控制台
window.engine.graph.getNodes(); // 获取所有节点
window.engine.graph.getEdges(); // 获取所有边
window.engine.getInteractionConfig(); // 查看交互配置
```

### 性能监控

```typescript
engine.enablePerformanceMonitor(true);
const stats = engine.getPerformanceStats();
console.log('FPS:', stats.fps);
```

## 贡献

欢迎提交 Issue 和 Pull Request 来改进 Web 编辑器！
