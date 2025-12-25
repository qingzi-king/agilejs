# InlineTextEditPlugin

内联文本编辑插件，支持双击节点或边的标签区域进行快速文本编辑。

## 基本使用

```typescript
import { CanvasEngine, InlineTextEditPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new InlineTextEditPlugin());
engine.start();
```

## 配置与交互

### 编辑触发

| 目标 | 触发方式 | 编辑字段 |
|------|---------|----------|
| 节点标签 | 双击标签区域 | `label` 或 `text` |
| 边标签 | 双击边的标签 | `label` |

### 交互行为

- 输入框自动定位到标签位置
- 自动聚焦并选中文本
- 输入框宽度自适应
- 按 Enter 或失去焦点保存
- 通过命令历史支持撤销/重做

## API 与事件

### 插件 ID

```typescript
readonly id = "inline-text-edit"
```

### 命令

#### updateNode / updateEdge

```typescript
history.do(new GraphCommands.updateNode({
  engine,
  nodeId: node.id,
  updates: { label: newText }
}));

history.do(new GraphCommands.updateEdge({
  engine,
  edgeId: edge.id,
  updates: { label: newText }
}));
```

更新节点或边的文本。

### 生命周期方法

#### setup

```typescript
setup(engine: CanvasEngine): void
```

设置插件，注册双击监听。

#### destroy

```typescript
destroy(): void
```

销毁插件，移除监听器和输入框。

## 常见问题

### Q: 如何禁止某些节点的文本编辑？

A: 监听双击事件并阻止默认行为：

```typescript
canvas.addEventListener('dblclick', (e) => {
  const node = hitTestNode(e);
  if (node?.type === 'readonly') {
    e.stopPropagation();
  }
}, { capture: true });
```

### Q: 如何自定义输入框样式？

A: 扩展插件并重写创建输入框的方法，或直接通过 CSS 修改。

### Q: 支持多行文本编辑吗？

A: 当前仅支持单行编辑，如需多行可使用 `<textarea>` 扩展插件。

## 相关内容

- [KeyboardPlugin](./keyboard.md) - 快捷键处理
- [LabelOverlayPlugin](./label-overlay.md) - 标签覆盖层
