# GroupResizeRotatePlugin

多选节点统一控制插件，选中多个节点时提供统一的缩放和旋转控制点。

## 基本使用

```typescript
import { CanvasEngine, GroupResizeRotatePlugin } from '@agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new GroupResizeRotatePlugin());
engine.start();
```

## 配置与交互

### 配置选项

```typescript
interface GroupResizeRotatePluginOptions {
  handleSize?: number;           // 控制点尺寸，默认 8
  handleColor?: string;          // 控制点颜色，默认 '#2563eb'
  handleHoverColor?: string;     // 悬停颜色，默认 '#3b82f6'
  rotateHandleColor?: string;    // 旋转控制点颜色，默认 '#ef4444'
  enableRotation?: boolean;      // 启用旋转，默认 true
  enableResize?: boolean;        // 启用缩放，默认 true
  groupFillColor?: string;       // 选区填充色，默认 'rgba(37,99,235,0.08)'
}

// 示例
engine.plugins.use(new GroupResizeRotatePlugin({
  enableRotation: true,
  enableResize: true,
  handleSize: 10
}));
```

### 交互操作

| 操作 | 触发方式 | 说明 |
|------|---------|------|
| 缩放 | 拖拽8个角/边控制点 | 整体缩放选中的节点 |
| 旋转 | 拖拽旋转控制点 | 绕中心点旋转选区 |
| 激活 | 选中多个节点 | 自动显示统一控制点 |

## API 与事件

### 插件 ID

```typescript
readonly id = "group-resize-rotate"
```

### 生命周期方法

#### setup

```typescript
setup(engine: CanvasEngine): void
```

设置插件，注册事件监听。

#### afterRender

```typescript
afterRender(ctx: CanvasRenderingContext2D): void
```

绘制选区边框和控制点。

#### destroy

```typescript
destroy(): void
```

销毁插件，移除监听器。

## 常见问题

### Q: 如何只启用缩放不启用旋转？

A: 设置 `enableRotation` 为 false：

```typescript
new GroupResizeRotatePlugin({
  enableRotation: false,
  enableResize: true
});
```

### Q: 如何修改选区背景色？

A: 通过 `groupFillColor` 设置：

```typescript
new GroupResizeRotatePlugin({
  groupFillColor: 'rgba(255,0,0,0.1)'
});
```

### Q: 为什么缩放后节点变形了？

A: 插件按比例缩放所有节点的位置和尺寸，这是预期行为。如需保持节点尺寸，需自行扩展。

## 相关内容

- [ResizeRotatePlugin](./resize-rotate.md) - 单节点缩放旋转
- [BoxSelectPlugin](./box-select.md) - 框选
