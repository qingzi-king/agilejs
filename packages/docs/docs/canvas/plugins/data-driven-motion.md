# DataDrivenMotionPlugin

数据驱动动画插件，通过节点/边的 `data.motion` 属性触发动画效果。

## 基本使用

```typescript
import { CanvasEngine, DataDrivenMotionPlugin } from '@agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new DataDrivenMotionPlugin());
engine.start();

// 触发移动动画
const node = engine.graph.getNode('node-1');
if (node) {
  node.data = {
    ...node.data,
    motion: {
      type: 'move',
      to: { x: 300, y: 200 },
      duration: 500,
      easing: 'easeOutQuad'
    }
  };
  engine.graph.markDirty();
}
```

## 配置与交互

### 动画类型

| 类型 | 说明 | 适用对象 |
|------|------|----------|
| `move` | 平滑移动位置 | 节点 |
| `scale` | 平滑缩放尺寸 | 节点 |
| `zIndex` | 平滑改变层级 | 节点 |
| `edge-style` | 平滑改变样式 | 边 |

### 移动动画

```typescript
node.data.motion = [{
  type: 'move',
  to: { x: 300, y: 200 },
  duration: 500,
  easing: 'easeOutQuad'
}];
```

### 缩放动画

```typescript
node.data.motion = [{
  type: 'scale',
  to: { width: 200, height: 150 },
  duration: 500
}];
```

### 边样式动画

:::warning

边动画是挂载节点上的，为什么呢？在大多数图应用场景中，节点（Node） 通常代表业务实体（如服务器、任务、人员），而 边（Edge） 代表关系，边的样式变化往往是节点状态变化的“副作用”，即“状态（节点）驱动关系（边）”的设计模式；另一方面减少遍历（当前只遍历了节点，边数量通常大于节点数）。

虽然技术上任意节点都可以，但为了代码逻辑的可维护性，建议遵循以下习惯之一：
 - 挂载在关联节点：将边的动画指令挂载在该边的 source 或 target 节点上；
 - 挂载在控制节点：如果有一个专门用于控制全局状态的“控制器节点”，挂载在它上面也是合理的。

:::

```typescript
node.data.motion = [{
  type: "edge-style",
  duration: 1000,
  easing: "easeInOutQuad",
  to: {
    edgeId: "e_1760251275688",
    lineWidth: 8,
    alpha: 0.5,
    stroke: "#ff0000",
    lineDash: [5, 5]
  }
}];
```

## API 与事件

### 插件 ID

```typescript
readonly id = "data-driven-motion"
```

### 生命周期方法

#### setup

```typescript
setup(engine: CanvasEngine): void
```

设置插件。

#### tick

```typescript
tick(): void
```

每帧更新动画进度。

## 常见问题

### Q: 如何监听动画完成？

A: 监听节点或边的数据变化，当 `motion` 属性被删除时即为完成。

### Q: 支持哪些缓动函数？

A: 支持 `linear`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad` 等常见缓动。

### Q: 如何停止动画？

A: 删除节点的 `data.motion` 属性：

```typescript
delete node.data.motion;
engine.graph.markDirty();
```

## 相关内容

- [BlinkPlugin](./blink.md) - 闪烁效果
- [FlowDashPlugin](./flow-dash.md) - 流动效果
