# PortOverlayPlugin

端口可视化插件，鼠标悬停节点时显示所有端口，连线时高亮最近端口。

## 基本使用

```typescript
import { CanvasEngine, PortOverlayPlugin } from '@agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new PortOverlayPlugin());
engine.start();

// 创建带端口的节点
const node = {
  id: 'node-1',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 80 },
  ports: [
    { id: 'port-left', offset: { x: 0, y: 40 }, radius: 5 },
    { id: 'port-right', offset: { x: 120, y: 40 }, radius: 5 },
    { id: 'port-top', offset: { x: 60, y: 0 }, radius: 5 },
    { id: 'port-bottom', offset: { x: 60, y: 80 }, radius: 5 }
  ]
};
```

## 配置与交互

### 显示时机

| 时机 | 说明 |
|------|------|
| 鼠标悬停节点 | 显示该节点所有端口 |
| 连线操作中 | 显示所有节点端口并高亮最近端口 |
| 鼠标离开 | 隐藏端口显示 |

## API 与事件

### 插件 ID

```typescript
readonly id = "port-overlay"
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

绘制端口圆圈。

#### destroy

```typescript
destroy(): void
```

销毁插件，移除监听器。

## 常见问题

### Q: 如何自定义端口样式？

A: 扩展插件并重写 `afterRender` 方法。

### Q: 端口不显示？

A: 检查：
1. 节点是否有 `ports` 数组
2. 端口 `offset` 和 `radius` 是否正确
3. 插件是否已注册

### Q: 如何禁用端口显示？

A: 移除该插件：

```typescript
engine.plugins.eject('port-overlay');
```

## 相关内容

- [ConnectPlugin](./connect.md) - 创建连线
- [EdgeEditPlugin](./edge-edit.md) - 编辑连线
