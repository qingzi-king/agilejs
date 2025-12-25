# BoxSelectPlugin

框选插件，允许用户通过拖拽矩形框来选择多个节点。

## 基本使用

```typescript
import { CanvasEngine, BoxSelectPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new BoxSelectPlugin());
engine.start();
```

## 配置与交互

### 框选操作

| 操作 | 快捷键 | 说明 |
|------|--------|------|
| 框选 | `Cmd/Ctrl + 拖拽` | 在空白区域拖拽矩形框 |
| 叠加选择 | `Shift + Cmd/Ctrl + 拖拽` | 保留已有选择 |

### 触发条件

1. 鼠标左键（`button === 0`）
2. 按住 Cmd 或 Ctrl 键
3. 点击在空白区域（不在任何节点上）
4. `enableSelection` 为 `true`（默认）

### 选择规则

- **完全包含**：只有完全在框选区域内的节点才会被选中
- **可选性检查**：跳过 `selectable: false` 的节点
- **可见性检查**：跳过 `visible: false` 的节点
- **微小拖动过滤**：拖动距离小于 2px 视为点击

## API 与事件

### 插件 ID

```typescript
readonly id = "box-select"
```

### 事件

#### canvas:box-select-start

```typescript
engine.events.on('canvas:box-select-start', () => {
  console.log('框选开始');
});
```

#### canvas:box-select-end

```typescript
engine.events.on('canvas:box-select-end', ({ nodes }) => {
  console.log('选中节点:', nodes);
});
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

绘制框选矩形。

#### destroy

```typescript
destroy(): void
```

销毁插件，移除监听器。

## 常见问题

### Q: 如何禁用框选？

A: 设置交互配置：

```typescript
engine.setInteractionConfig({ enableSelection: false });
```

### Q: 如何自定义框选样式？

A: 扩展插件并重写 `afterRender` 方法。

### Q: 如何实现部分包含选择？

A: 当前仅支持完全包含，需自行扩展插件实现。

## 相关内容

- [DragPlugin](./drag.md) - 节点拖拽
- [SelectionOverlayPlugin](./selection-overlay.md) - 选择框显示
