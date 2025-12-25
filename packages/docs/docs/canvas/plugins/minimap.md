# MinimapPlugin

迷你地图插件，在画布角落显示整个图的缩略图，支持点击跳转和拖拽视口。

## 基本使用

```typescript
import { CanvasEngine, MinimapPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new MinimapPlugin());
engine.start();
```

## 配置与交互

### 配置选项

```typescript
interface MinimapOptions {
  width?: number;              // 宽度，默认 200
  height?: number;             // 高度，默认 140
  position?: string;           // 位置，默认 'bottom-right'
  margin?: number;             // 外边距，默认 12
  showNodes?: boolean;         // 显示节点，默认 true
  showEdges?: boolean;         // 显示边，默认 true
  clickToCenter?: boolean;     // 点击居中，默认 true
  draggableViewport?: boolean; // 拖拽视口，默认 true
  focusMode?: string;          // 聚焦模式，默认 'auto'
}

engine.plugins.use(new MinimapPlugin({
  width: 200,
  height: 140,
  position: 'bottom-right'
}));
```

### 交互操作

| 操作 | 说明 |
|------|------|
| 点击 | 将点击位置居中到主画布 |
| 拖拽蓝色矩形 | 移动视口位置 |
| 自动聚焦 | focusMode='auto' 时自动适配内容 |

## API 与事件

### 插件 ID

```typescript
readonly id = "minimap"
```

### 生命周期方法

#### setup

```typescript
setup(engine: CanvasEngine): void
```

设置插件，创建迷你地图 DOM 元素。

#### afterRender

```typescript
afterRender(ctx: CanvasRenderingContext2D): void
```

在迷你地图上绘制节点、边和视口。

#### destroy

```typescript
destroy(): void
```

销毁插件，移除 DOM 元素。

## 常见问题

### Q: 如何自定义迷你地图位置？

A: 通过 `position` 和 `margin` 配置：

```typescript
new MinimapPlugin({
  position: 'top-left',
  margin: 20
});
```

### Q: 如何隐藏节点或边？

A: 设置 `showNodes` 或 `showEdges` 为 false。

### Q: 迷你地图太小看不清？

A: 调整 `width` 和 `height`：

```typescript
new MinimapPlugin({
  width: 300,
  height: 200
});
```

## 相关内容

- [PanZoomPlugin](./pan-zoom.md) - 平移缩放
