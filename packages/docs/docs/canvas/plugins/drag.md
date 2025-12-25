# DragPlugin

拖拽插件，支持鼠标和触摸操作，允许用户拖拽单个或多个节点。

## 基本使用

```typescript
import { CanvasEngine, DragPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new DragPlugin());
engine.start();
```

## 配置与交互

### 拖拽功能

| 功能 | 说明 |
|------|------|
| 单节点拖拽 | 点击并拖动节点移动位置 |
| 多节点拖拽 | 按住 Shift/Cmd/Ctrl 多选后同步拖动 |
| 组内拖拽 | 拖动组内节点，整个组同步移动 |
| 折线边联动 | 拖动节点时，折线边的控制点随之移动 |

### 触发条件

1. 鼠标左键或单指触摸
2. 点击位置在节点上
3. 节点的 `draggable` 不为 `false`
4. 引擎的 `enableDrag` 为 `true`（默认）

```typescript
// 禁用拖拽
engine.setInteractionConfig({ enableDrag: false });

// 禁用特定节点的拖拽
node.draggable = false;
```

### 选择行为

- **单选**：点击未选中节点，清除其他选择
- **多选**：Shift/Cmd/Ctrl + 点击，加入选择集
- **组选**：点击组内节点，选中整个组

## API 与事件

### 插件 ID

```typescript
readonly id = "drag"
```

### 命令

#### moveNodes

```typescript
history.do(new GraphCommands.moveNodes({
  engine,
  nodeIds: selectedNodeIds,
  deltaX,
  deltaY
}));
```

移动节点位置。

### 生命周期方法

#### setup

```typescript
setup(engine: CanvasEngine): void
```

设置插件，注册事件监听。

#### destroy

```typescript
destroy(): void
```

销毁插件，移除监听器。

## 常见问题

### Q: 如何禁止某些节点被拖拽？

A: 设置节点的 `draggable` 属性：

```typescript
node.draggable = false;
```

### Q: 如何在拖拽时限制移动范围？

A: 监听节点变化事件并验证位置：

```typescript
engine.events.on('node:drag-move', ({ nodeIds, positions }) => {
  // 实时检查位置限制
  positions.forEach((pos, id) => {
    if (pos.x < 0) pos.x = 0;
    if (pos.x > 1000) pos.x = 1000;
  });
});
```

### Q: 拖拽多个节点时卡顿？

A: 插件已启用批量拖拽优化，如仍有问题可减少节点数量。

## 相关内容

- [SnapToGridPlugin](./snap-to-grid.md) - 网格吸附
- [GuidesPlugin](./guides.md) - 对齐参考线
