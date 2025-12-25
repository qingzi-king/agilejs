# SelectionOverlayPlugin

选择框覆盖插件，为选中的节点显示虚线边框，并处理空白区域点击清除选择。

## 基本使用

```typescript
import { CanvasEngine, SelectionOverlayPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new SelectionOverlayPlugin());
engine.start();
```

## 配置与交互

### 配置选项

```typescript
interface SelectionOverlayOptions {
  strokeColor?: string;                    // 选择框颜色，默认 '#2563eb'
  lineWidth?: number;                      // 线宽，默认 2
  lineDash?: number[];                     // 虚线样式，默认 [6, 4]
  padding?: number;                        // 边距，默认 2
  clearSelectionOnCanvasClick?: boolean;   // 空白点击清除选择，默认 true
  handleGuardMarginPx?: number;            // 句柄保护区域，默认 40
}

engine.plugins.use(new SelectionOverlayPlugin({
  strokeColor: '#ef4444',
  lineWidth: 3
}));
```

### 交互行为

- 为所有选中节点绘制虚线边框
- 点击空白区域清除选择
- 句柄保护区域防止误点击

## API 与事件

### 插件 ID

```typescript
readonly id = "selection-overlay"
```

### 生命周期方法

#### setup

```typescript
setup(engine: CanvasEngine): void
```

设置插件，注册点击事件。

#### afterRender

```typescript
afterRender(ctx: CanvasRenderingContext2D): void
```

绘制选择框。

#### destroy

```typescript
destroy(): void
```

销毁插件，移除监听器。

## 常见问题

### Q: 如何禁用空白点击清除选择？

A: 设置 `clearSelectionOnCanvasClick` 为 false。

### Q: 如何自定义选择框样式？

A: 通过配置选项设置：

```typescript
new SelectionOverlayPlugin({
  strokeColor: '#ff0000',
  lineWidth: 3,
  lineDash: [10, 5]
});
```

### Q: 什么是句柄保护区域？

A: 在缩放/旋转句柄附近点击时不会清除选择，防止误操作。

## 相关内容

- [BoxSelectPlugin](./box-select.md) - 框选
- [DragPlugin](./drag.md) - 拖拽节点
