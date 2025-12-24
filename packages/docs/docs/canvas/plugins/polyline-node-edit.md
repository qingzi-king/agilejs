# PolylineNodeEditPlugin

折线节点编辑插件，用于编辑 `shape='line'` 类型的节点，支持拖拽顶点、新增/删除折点。

## 基本使用

```typescript
import { CanvasEngine, PolylineNodeEditPlugin } from '@agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new PolylineNodeEditPlugin());
engine.start();

// 创建折线节点
const lineNode = {
  id: 'line-1',
  shape: 'line',  // 必须是 'line'
  position: { x: 100, y: 100 },
  size: { width: 200, height: 150 },
  data: {
    line: {
      pointsNormalized: [  // 归一化坐标（0-1范围）
        { u: 0.1, v: 0.9 },
        { u: 0.5, v: 0.1 },
        { u: 0.9, v: 0.5 }
      ]
    }
  }
};
```

## 配置与交互

### 配置选项

```typescript
interface PolylineNodeEditPluginOptions {
  handleSize?: number;      // 控制点尺寸，默认 8
  handleColor?: string;     // 控制点颜色，默认 '#16a34a'
  hitThreshold?: number;    // 命中阈值，默认 8
}

engine.plugins.use(new PolylineNodeEditPlugin({
  handleSize: 10,
  handleColor: '#ff0000'
}));
```

### 交互操作

| 操作 | 触发方式 | 说明 |
|------|---------|------|
| 拖拽顶点 | 拖拽折线控制点 | 调整折线形状 |
| 添加折点 | 点击折线线段 | 在点击位置添加新控制点 |
| 删除折点 | Alt+点击控制点 | 删除该控制点 |

## API 与事件

### 插件 ID

```typescript
readonly id = "polyline-node-edit"
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

绘制折线控制点。

#### destroy

```typescript
destroy(): void
```

销毁插件，移除监听器。

## 常见问题

### Q: 如何限制折点数量？

A: 监听节点变化事件并验证：

```typescript
engine.events.on('graph:change', () => {
  const node = engine.graph.getNode('line-1');
  if (node && node.data.line.pointsNormalized.length > 10) {
    engine.history.undo();
  }
});
```

### Q: 如何禁用删除控制点？

A: 监听Alt+点击并阻止，或扩展插件并重写删除逻辑。

### Q: 支持曲线节点吗？

A: 当前仅支持直线折线，不支持贝塞尔曲线。

## 相关内容

- [EdgeEditPlugin](./edge-edit.md) - 编辑边的折点
