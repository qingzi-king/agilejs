# ConnectPlugin

连接插件，允许用户通过节点端口创建边，支持可视化连线预览和端口吸附。

## 基本使用

```typescript
import { CanvasEngine, ConnectPlugin } from '@agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new ConnectPlugin());
engine.start();
```

## 配置与交互

### 配置选项

```typescript
interface ConnectPluginOptions {
  portHitRadius?: number;      // 端口命中半径（像素），默认 8
  requireModifier?: boolean;   // 是否需要修饰键，默认 false
}

// 示例
engine.plugins.use(new ConnectPlugin({
  portHitRadius: 12,
  requireModifier: true  // 需按住 Cmd/Ctrl 才能连线
}));
```

### 连线操作流程

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1. 开始连线 | 点击源端口 | 或按住 Cmd/Ctrl 点击节点（自动选择最近端口） |
| 2. 拖拽连线 | 移动鼠标 | 显示临时连线，靠近目标端口时高亮显示 |
| 3. 完成连线 | 松开在目标端口 | 创建新边并触发 `edgeAdded` 事件 |
| 4. 取消连线 | 松开在空白处 | 取消连线操作 |

### 端口吸附

临时连线靠近目标端口在 `portHitRadius` 范围内时自动吸附并高亮显示。

## API 与事件

### 插件 ID

```typescript
readonly id = "connect"
```

### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `portHitRadius` | `number` | `8` | 端口命中半径（像素） |
| `requireModifier` | `boolean` | `false` | 是否需要按住修饰键 |

### 触发事件

#### edgeAdded

```typescript
engine.events.on('edgeAdded', ({ edge }) => {
  console.log('新建边:', edge);
});
```

连线完成时触发。

### 生命周期方法

#### setup

```typescript
setup(engine: CanvasEngine): void
```

设置插件，注册鼠标事件监听。

#### beforeRender

```typescript
beforeRender(ctx: CanvasRenderingContext2D): void
```

渲染临时连线。

#### destroy

```typescript
destroy(): void
```

销毁插件，移除监听器。

## 常见问题

### Q: 如何禁止某些端口连线?

A: 监听 `edgeAdded` 事件并撤销：

```typescript
engine.events.on('edgeAdded', ({ edge }) => {
  const sourceNode = engine.getNode(edge.source);
  if (sourceNode?.type === 'readonly') {
    engine.history.undo();
  }
});
```

### Q: 如何实现连线验证?

A: 在 `edgeAdded` 事件中检查并撤销不合法的连线：

```typescript
engine.events.on('edgeAdded', ({ edge }) => {
  // 验证规则
  if (edge.source === edge.target) {
    engine.history.undo(); // 不允许自连
  }
});
```

### Q: 如何自定义临时连线样式?

A: 扩展插件并重写 `beforeRender` 方法：

```typescript
class CustomConnectPlugin extends ConnectPlugin {
  beforeRender(ctx: CanvasRenderingContext2D): void {
    // 自定义绘制逻辑
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    // ...
  }
}
```

## 相关内容

- [EdgeEditPlugin](./edge-edit.md) - 编辑边
- [HoverCursorPlugin](./hover-cursor.md) - 光标提示
