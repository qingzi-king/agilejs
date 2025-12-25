# LabelOverlayPlugin

标签覆盖渲染插件，负责在画布上渲染节点和边的标签文本。

## 基本使用

```typescript
import { CanvasEngine, LabelOverlayPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new LabelOverlayPlugin());
engine.start();
```

## 配置与交互

### 节点标签配置

通过 `node.data.style.label` 配置：

```typescript
node.data = {
  label: 'Node Label',
  style: {
    label: {
      fontSize: 14,
      color: '#000',
      fontFamily: 'Arial',
      textAlign: 'center',
      position: 'bottom',     // top/bottom/left/right/center
      overflow: 'ellipsis',   // wrap/ellipsis/shrink/clip
      maxLines: 2
    }
  }
};
```

### 边标签配置

通过 `edge.data.style.label` 配置：

```typescript
edge.data = {
  label: 'Edge Label',
  style: {
    label: {
      fontSize: 12,
      color: '#666',
      background: '#fff',
      padding: 4
    }
  }
};
```

## API 与事件

### 插件 ID

```typescript
readonly id = "label-overlay"
```

### 生命周期方法

#### setup

```typescript
setup(engine: CanvasEngine): void
```

设置插件。

#### afterRender

```typescript
afterRender(ctx: CanvasRenderingContext2D): void
```

渲染所有节点和边的标签。

## 常见问题

### Q: 标签太长被截断了？

A: 调整 `overflow` 和 `maxLines`：

```typescript
label: {
  overflow: 'wrap',  // 换行显示
  maxLines: 3
}
```

### Q: 如何隐藏标签？

A: 设置 `visible: false` 或删除 `label` 字段。

### Q: 标签影响性能？

A: 插件已使用 LRU 缓存优化，如仍有问题可减少标签数量或简化样式。

## 相关内容

- [InlineTextEditPlugin](./inline-text-edit.md) - 文本编辑
