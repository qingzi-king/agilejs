# NodeFlowDashPlugin

节点描边流动动画插件，为节点的虚线边框添加流动效果。

## 基本使用

```typescript
import { CanvasEngine, NodeFlowDashPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new NodeFlowDashPlugin());
engine.start();

// 创建流动边框的节点
const node = {
  id: 'node-1',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 80 },
  data: {
    style: {
      strokeColor: '#3b82f6',
      strokeWidth: 3,
      lineDash: [12, 10],
      flow: {
        enabled: true,
        speed: 120,
        direction: 'cw'  // cw(顺时针)/ccw(逆时针)
      }
    }
  }
};
```

## 配置与交互

### 配置选项

```typescript
interface NodeFlowDashPluginOptions {
  defaultDash?: number[];    // 默认虚线样式，默认 [12, 10]
  defaultSpeed?: number;     // 默认速度（像素/秒），默认 120
}

engine.plugins.use(new NodeFlowDashPlugin({
  defaultDash: [12, 10],
  defaultSpeed: 120
}));
```

## API 与事件

### 插件 ID

```typescript
readonly id = "node-flow-dash"
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

### Q: 如何逆时针流动？

A: 设置 `direction` 为 'ccw'：

```typescript
node.data.style.flow = {
  enabled: true,
  direction: 'ccw'
};
```

### Q: 如何调整流动速度？

A: 修改 `speed` 参数，单位为像素/秒。

### Q: 支持实线边框流动吗？

A: 不支持，必须设置 `lineDash` 虚线样式。

## 相关内容

- [FlowDashPlugin](./flow-dash.md) - 边流动
