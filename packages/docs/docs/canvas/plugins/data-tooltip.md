# DataTooltipPlugin

数据悬停提示插件，鼠标悬停节点时显示 `data.custom` 自定义数据。仅在编辑模式下生效。

## 基本使用

```typescript
import { CanvasEngine, DataTooltipPlugin } from '@agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
  mode: 'edit',  // 必须是编辑模式
});

engine.plugins.use(new DataTooltipPlugin());
engine.start();

// 创建带自定义数据的节点
const node = {
  id: 'node-1',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 80 },
  data: {
    custom: {
      name: '数据节点',
      type: 'processor',
      status: 'running'
    }
  }
};
```

## 配置与交互

### 配置选项

```typescript
interface DataTooltipOptions {
  delayMs?: number;       // 悬停延时，默认 300
  maxWidthPx?: number;    // 最大宽度，默认 260
  maxLines?: number;      // 最大行数，默认 8
}

engine.plugins.use(new DataTooltipPlugin({
  delayMs: 300,
  maxWidthPx: 260,
  maxLines: 8
}));
```

## API 与事件

### 插件 ID

```typescript
readonly id = "data-tooltip"
```

### 生命周期方法

#### setup

```typescript
setup(engine: CanvasEngine): void
```

设置插件，创建提示 DOM。

#### destroy

```typescript
destroy(): void
```

销毁插件，移除 DOM。

## 常见问题

### Q: 预览模式下不显示？

A: 插件仅在编辑模式 (`mode='edit'`) 下生效，检查引擎模式。

### Q: 如何自定义提示样式？

A: 扩展插件并重写渲染逻辑，或通过 CSS 修改。

### Q: 提示内容为空？

A: 检查节点是否有 `data.custom` 对象。

## 相关内容

- [HoverCursorPlugin](./hover-cursor.md) - 悬停光标
