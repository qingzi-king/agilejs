# BlinkPlugin

节点闪烁插件，通过改变节点透明度实现闪烁效果，支持 API 控制或数据驱动。

## 基本使用

```typescript
import { CanvasEngine, BlinkPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new BlinkPlugin());
engine.start();

// API 方式：启动闪烁
engine.plugins.get('blink').start(['node-1', 'node-2'], {
  period: 800,
  min: 0.25,
  max: 1
});

// 停止闪烁
engine.plugins.get('blink').stop(['node-1']);
```

## 配置与交互

### 数据驱动方式

通过节点数据配置：

```typescript
node.data = {
  blink: {
    enabled: true,
    period: 600,    // 周期（ms）
    min: 0.3,       // 最小透明度
    max: 1          // 最大透明度
  }
};
```

## API 与事件

### 插件 ID

```typescript
readonly id = "blink"
```

### 方法

#### start

```typescript
start(nodeIds: string[], options?: BlinkOptions): void
```

启动指定节点的闪烁。

#### stop

```typescript
stop(nodeIds: string[]): void
```

停止指定节点的闪烁。

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

每帧更新闪烁状态。

## 常见问题

### Q: 如何停止所有闪烁？

A: 获取所有闪烁节点ID并调用stop：

```typescript
const plugin = engine.plugins.get('blink');
plugin.stop(plugin.getBlinkingNodes());
```

### Q: 如何自定义闪烁速度？

A: 调整 `period` 参数，值越小闪烁越快。

### Q: 支持边闪烁吗？

A: 当前仅支持节点闪烁。

## 相关内容

- [DataDrivenMotionPlugin](./data-driven-motion.md) - 数据驱动
