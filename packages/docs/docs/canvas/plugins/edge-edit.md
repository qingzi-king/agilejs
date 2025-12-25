# EdgeEditPlugin

边编辑插件，支持拖拽边的端点重新连接到其他节点，以及编辑折线边的路径点。

## 基本使用

```typescript
import { CanvasEngine, EdgeEditPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new EdgeEditPlugin());
engine.start();
```

## 配置与交互

### 配置选项

```typescript
interface EdgeEditPluginOptions {
  handleSize?: number;           // 控制点尺寸，默认 8
  handleColor?: string;          // 控制点颜色，默认 '#10b981'
  handleHoverColor?: string;     // 悬停颜色，默认 '#34d399'
  hitThreshold?: number;         // 命中阈值，默认 10
  enableReconnect?: boolean;     // 启用端点重连，默认 true
  enablePolylineEdit?: boolean;  // 启用折线编辑，默认 true
  pathPointHandleSize?: number;  // 路径点尺寸，默认 6
  pathPointColor?: string;       // 路径点颜色，默认 '#3b82f6'
}

// 示例
engine.plugins.use(new EdgeEditPlugin({
  handleSize: 10,
  enableReconnect: true,
  enablePolylineEdit: true
}));
```

### 交互操作

| 操作 | 触发条件 | 说明 |
|------|---------|------|
| 端点重连 | 拖拽边的端点控制点 | 重新连接到其他节点或端口 |
| 编辑路径点 | 拖拽折线边的路径点 | 调整折线的形状 |
| 高亮显示 | 鼠标悬停在控制点 | 控制点变为悬停颜色 |

## API 与事件

### 插件 ID

```typescript
readonly id = "edge-edit"
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

绘制端点和路径点控制点。

#### destroy

```typescript
destroy(): void
```

销毁插件，移除监听器。

## 常见问题

### Q: 如何禁止某些边的重连？

A: 由于插件使用命令历史，可监听事件并撤销：

```typescript
engine.events.on('edgeChanged', ({ edge }) => {
  if (edge.type === 'readonly') {
    engine.history.undo();
  }
});
```

### Q: 如何自定义控制点样式？

A: 通过配置选项设置：

```typescript
new EdgeEditPlugin({
  handleSize: 12,
  handleColor: '#ff0000',
  handleHoverColor: '#ff6666'
});
```

### Q: 如何禁用折线编辑但保留端点重连？

A: 设置 `enablePolylineEdit` 为 false：

```typescript
new EdgeEditPlugin({
  enableReconnect: true,
  enablePolylineEdit: false
});
```

## 相关内容

- [ConnectPlugin](./connect.md) - 创建连线
- [PolylineNodeEditPlugin](./polyline-node-edit.md) - 折线节点编辑
