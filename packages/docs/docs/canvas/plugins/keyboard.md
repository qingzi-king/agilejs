# KeyboardPlugin

键盘插件，提供常用的键盘快捷键支持。

## 基本使用

```typescript
import { CanvasEngine, KeyboardPlugin } from '@agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new KeyboardPlugin());
engine.start();
```

## 配置与交互

### 配置选项

```typescript
interface KeyboardOptions {
  nudgeStep?: number;       // 方向键步长，默认 1
  fastMultiplier?: number;  // Shift 倍数，默认 10
}

engine.plugins.use(new KeyboardPlugin({
  nudgeStep: 2,
  fastMultiplier: 20
}));
```

### 快捷键列表

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + A` | 全选 |
| `Cmd/Ctrl + Z` | 撤销 |
| `Cmd/Ctrl + Shift + Z` | 重做 |
| `Delete/Backspace` | 删除选中节点和边 |
| `Cmd/Ctrl + ]` | 置于顶层 |
| `Cmd/Ctrl + [` | 置于底层 |
| `Cmd/Ctrl + Shift + ]` | 上移一层 |
| `Cmd/Ctrl + Shift + [` | 下移一层 |
| `↑↓←→` | 微调节点位置（1px） |
| `Shift + ↑↓←→` | 快速移动（10px） |

## API 与事件

### 插件 ID

```typescript
readonly id = "keyboard"
```

### 生命周期方法

#### setup

```typescript
setup(engine: CanvasEngine): void
```

设置插件，注册键盘监听。

#### destroy

```typescript
destroy(): void
```

销毁插件，移除监听器。

## 常见问题

### Q: 如何禁用某个快捷键？

A: 监听键盘事件并阻止默认行为：

```typescript
document.addEventListener('keydown', (e) => {
  if (e.key === 'Delete') {
    e.stopPropagation();
  }
}, { capture: true });
```

### Q: 如何自定义方向键步长？

A: 通过 `nudgeStep` 配置：

```typescript
new KeyboardPlugin({
  nudgeStep: 5,
  fastMultiplier: 20
});
```

### Q: 在输入框中也触发了快捷键？

A: 插件已自动过滤输入框、文本域等元素。

## 相关内容

- [DragPlugin](./drag.md) - 节点拖拽
- [ClipboardPlugin](./clipboard.md) - 复制粘贴
