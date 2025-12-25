# FlowDashPlugin

边流动动画插件，为开启 `flow` 配置的边添加虚线流动效果。

## 基本使用

```typescript
import { CanvasEngine, FlowDashPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new FlowDashPlugin());
engine.start();

// 创建流动效果的边
const edge = {
  id: 'edge-1',
  source: 'node-1',
  target: 'node-2',
  data: {
    style: {
      lineDash: [12, 10],
      flow: {
        enabled: true,
        speed: 120,
        direction: 'forward'  // forward/reverse/both
      }
    }
  }
};
```

## 配置与交互

### 配置选项

```typescript
interface FlowDashPluginOptions {
  defaultDash?: number[];    // 默认虚线样式，默认 [12, 10]
  defaultSpeed?: number;     // 默认速度（像素/秒），默认 120
}

engine.plugins.use(new FlowDashPlugin({
  defaultDash: [12, 10],
  defaultSpeed: 120
}));
```

## API 与事件

### 插件 ID

```typescript
readonly id = "flow-dash"
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

每帧更新流动偏移。

## 常见问题

### Q: 如何反向流动？

A: 设置 `direction` 为 'reverse'：

```typescript
edge.data.style.flow = {
  enabled: true,
  direction: 'reverse'
};
```

### Q: 如何调整流动速度？

A: 修改 `speed` 参数，单位为像素/秒。

### Q: 支持实线流动吗？

A: 不支持，必须设置 `lineDash` 虚线样式。

## 相关内容

- [NodeFlowDashPlugin](./node-flow-dash.md) - 节点流动
