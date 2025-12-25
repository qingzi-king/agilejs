# ResizeRotatePlugin

尺寸调整和旋转插件, 为选中的节点提供可视化控制点, 支持拖拽调整大小和旋转角度。

## 基本使用

```typescript
import { CanvasEngine, ResizeRotatePlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new ResizeRotatePlugin());
engine.start();
```

## 配置与交互

### 配置选项

```typescript
interface ResizeRotatePluginOptions {
  handleSize?: number;              // 控制点大小(像素), 默认 8
  handleColor?: string;             // 控制点颜色, 默认 "#2563eb"
  rotateHandleColor?: string;       // 旋转控制点颜色, 默认 "#ef4444"
  handleHoverColor?: string;        // 悬停颜色, 默认 "#3b82f6"
  enableRotation?: boolean;         // 启用旋转, 默认 true
  enableResize?: boolean;           // 启用尺寸调整, 默认 true
  rotateHandleOffset?: number;      // 旋转控制点偏移(像素), 默认 30
  hitTargetPx?: number;             // 鼠标命中阈值, 默认等于 handleSize
  touchHitTargetPx?: number | 'auto';  // 触摸命中阈值, 默认 'auto'
}

// 示例
engine.plugins.use(
  new ResizeRotatePlugin({
    handleSize: 10,
    handleColor: '#10b981',
    rotateHandleOffset: 40
  })
);
```

### 交互操作

**调整大小:**
- 拖拽8个边角/边缘控制点
- 支持等比缩放(按住 Shift)
- 自动更新连接边

**旋转节点:**
- 拖拽顶部旋转控制点
- 围绕节点中心旋转
- 支持触摸操作

**触发条件:**
- 节点被选中
- 节点的 `resizable` 不为 `false`
- 节点的 `rotatable` 不为 `false`

## API与事件

### 插件ID

```typescript
readonly id = "resize-rotate"
```

### 生命周期方法

#### setup(engine: CanvasEngine): void
设置插件, 注册事件监听器。

#### dispose(): void
清理插件, 移除事件监听器。

#### afterRender(ctx: CanvasRenderingContext2D): void
渲染控制点和旋转手柄。

### 命令

**PluginResizeNodeCommand** - 调整节点大小

```typescript
engine.history.do(
  new PluginResizeNodeCommand(
    engine.graph,
    'node-1',
    200,  // 新宽度
    150   // 新高度
  )
);
```

**RotateNodeCommand** - 旋转节点

```typescript
engine.history.do(
  new RotateNodeCommand(
    engine.graph,
    'node-1',
    Math.PI / 4  // 弧度
  )
);
```

### 控制点类型

```typescript
enum HandleType {
  TopLeft = 'tl',       // 左上角
  TopCenter = 'tc',     // 上边中点
  TopRight = 'tr',      // 右上角
  MiddleLeft = 'ml',    // 左边中点
  MiddleRight = 'mr',   // 右边中点
  BottomLeft = 'bl',    // 左下角
  BottomCenter = 'bc',  // 下边中点
  BottomRight = 'br',   // 右下角
  Rotate = 'rotate'     // 旋转控制点
}
```

### 事件

监听尺寸或旋转变化:

```typescript
engine.events.on('graph:change', ({ reason }) => {
  if (reason === 'node-resize') {
    const node = engine.graph.getNode('node-1');
    console.log('New size:', node?.size);
  }
});
```

## 常见问题

### Q: 旋转控制点距离节点太近?

A: 增大 `rotateHandleOffset` 值:

```typescript
new ResizeRotatePlugin({ rotateHandleOffset: 50 })
```

### Q: 触摸时难以点中控制点?

A: 增大触摸命中阈值:

```typescript
new ResizeRotatePlugin({ touchHitTargetPx: 30 })
```

### Q: 如何禁用旋转或调整大小?

A: 使用配置选项:

```typescript
new ResizeRotatePlugin({
  enableRotation: false,  // 禁用旋转
  enableResize: true      // 保留调整大小
})
```

## 相关内容

- [SelectionOverlayPlugin](./selection-overlay.md) - 选择框显示
- [DragPlugin](./drag.md) - 拖拽节点
