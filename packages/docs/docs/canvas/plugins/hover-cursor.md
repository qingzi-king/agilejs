# HoverCursorPlugin

鼠标悬停光标插件，根据鼠标悬停位置自动改变光标样式，提升交互体验。

## 基本使用

```typescript
import { CanvasEngine, HoverCursorPlugin } from '@agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new HoverCursorPlugin());
engine.start();
```

## 配置与交互

### 光标样式规则

根据鼠标悬停位置自动切换：

| 悬停位置 | 光标样式 | 说明 |
|---------|---------|------|
| 端口区域 | `crosshair` | 十字光标，提示可连接 |
| 节点区域 | `move` | 移动光标，提示可拖拽 |
| 空白区域 | `default` | 默认光标 |

### 优先级机制

光标样式优先级：**端口 > 节点 > 默认**

### 非侵入性设计

只在当前光标为默认样式或由本插件设置时才改变，避免覆盖其他插件（如 EdgeEditPlugin、ResizeRotatePlugin）的光标设置。

## API 与事件

### 插件 ID

```typescript
readonly id = "hover-cursor"
```

### 生命周期方法

#### setup

```typescript
setup(engine: CanvasEngine): void
```

设置插件，注册鼠标移动监听。

#### destroy

```typescript
destroy(): void
```

销毁插件，移除监听器。

## 常见问题

### Q: 光标样式被其他插件覆盖了？

A: 这是正常行为，HoverCursorPlugin 设计为低优先级，不会覆盖其他插件的光标设置。

### Q: 如何自定义光标样式？

A: 扩展插件并重写光标逻辑：

```typescript
class CustomHoverCursorPlugin extends HoverCursorPlugin {
  protected getPortCursor(): string {
    return 'pointer'; // 使用手型光标
  }
  
  protected getNodeCursor(): string {
    return 'grab'; // 使用抓手光标
  }
}
```

### Q: 如何禁用某个区域的光标改变？

A: 扩展插件并添加条件判断。

## 相关内容

- [DragPlugin](./drag.md) - 节点拖拽
- [ConnectPlugin](./connect.md) - 连线功能
