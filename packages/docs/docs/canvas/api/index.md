---
sidebar_position: 1
---

# API 总览

AgileJS Canvas 引擎提供了完整的 API 体系，包括核心引擎、图形管理、命令历史、插件系统等模块。

## 核心模块

### [CanvasEngine](canvas-engine.md)
画布引擎核心类，负责渲染循环、视口管理、插件协调等。

**主要功能：**
- 渲染管理（启动/停止/手动渲染）
- 视口控制（缩放/平移/适配）
- 交互配置（全局开关）
- 主题管理
- 性能优化（降质渲染、空间索引）

### [Graph](graph.md)
图形数据模型，管理节点和边的增删改查。

**主要功能：**
- 节点/边的 CRUD 操作
- 脏标记机制
- 版本追踪
- 缓存优化

### [CommandHistory](command-history.md)
命令历史系统，支持撤销/重做、事务、命令合并。

**主要功能：**
- 执行/撤销/重做
- 事务支持（批量操作）
- 命令合并（连续操作）
- 历史调试

### [EventBus](../events.md)
事件总线，提供发布-订阅模式的事件通信。

**主要功能：**
- 事件注册/注销
- 事件触发
- 类型安全

## 管理器

### [PluginManager](plugin-manager.md)
插件管理器，负责插件的注册、卸载和生命周期管理。

### [RendererRegistry](../custom-renderers.md)
渲染器注册表，管理各种形状的渲染器。

### [AnimationManager](animation-manager.md)
动画管理器，提供补间动画支持。

## 命令系统

### [Commands](commands.md)
内置命令类，包括：
- 节点操作命令（添加/删除/移动/缩放/旋转）
- 边操作命令（添加/删除/更新）
- 分组命令（创建/解散）
- 画布命令（背景/网格/参考线）

## 类型定义

### Types
核心数据类型定义：
- `NodeData` - 节点数据结构
- `EdgeData` - 边数据结构
- `PortData` - 端口数据结构
- `EngineOptions` - 引擎配置选项
- `InteractionConfig` - 交互配置

## 工具函数

### [Utilities](../utilities.md)
常用工具函数：
- 坐标转换
- 碰撞检测
- 边界计算
- 空间索引
