---
sidebar_position: 1
---

# Canvas 引擎简介

AgileJS Canvas 是一个基于 HTML Canvas 的轻量级图形编辑和渲染引擎。它提供了强大的插件化架构和自定义渲染器支持，适用于构建站场图、流程图、拓扑图等各类图形应用。

## 核心特性

- **插件化架构**：通过插件系统扩展功能，支持自定义交互和渲染
- **高性能渲染**：优化的渲染策略，支持大规模图形（10000+ 节点）
- **移动端支持**：支持触摸交互，提供与桌面端一致的用户体验
- **灵活的交互控制**：可配置的交互模式，支持只读、编辑等多种场景
- **自定义渲染器**：支持自定义节点和边的渲染逻辑

## 快速开始

### 安装

```bash
npm install @agilejs/core
# 或
pnpm add @agilejs/core
```

### 基础使用

```typescript
import { CanvasEngine, PanZoomPlugin, DragPlugin } from '@agilejs/core';

// 创建引擎实例
const engine = new CanvasEngine({
  container: document.getElementById('canvas'),
  background: '#ffffff',
  mode: 'edit',
});

// 注册插件
engine.plugins.use(new PanZoomPlugin());
engine.plugins.use(new DragPlugin());

// 添加节点
engine.graph.addNode({
  id: 'node1',
  shape: 'rect',
  x: 100,
  y: 100,
  width: 120,
  height: 80,
  label: '开始'
});

// 启动引擎
engine.start();
```

## 文档导航

- [交互配置](./interaction/config.md) - 了解如何配置交互行为
- [移动端支持](./mobile-support.md) - 移动端触摸交互指南
- [性能优化](./performance/quick-reference.md) - 大规模场景性能优化技巧

## 主要应用场景

- **轨道站场图**：场段图、正线图
- **流程图编辑器**：业务流程建模、工作流设计
- **拓扑图可视化**：网络拓扑、系统架构展示
