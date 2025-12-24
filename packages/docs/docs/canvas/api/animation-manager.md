# AnimationManager API

动画管理器，负责管理和执行补间动画（Tween）。

## 基本概念

AnimationManager 是引擎内置的动画系统，用于创建和管理基于时间的补间动画。它提供了统一的动画调度机制，所有动画在每一帧中同步更新。

## 访问方式

通过引擎实例访问动画管理器：

```typescript
const animationManager = engine.animationManager;
```

## API

### add(opts: TweenOptions): void

添加一个新的补间动画。

**参数：**

```typescript
interface TweenOptions {
  duration: number;                    // 动画时长（毫秒）
  easing?: Easing;                     // 缓动函数
  onUpdate: (progress: number) => void; // 每帧更新回调
  onComplete?: () => void;             // 完成回调
}

type Easing = (t: number) => number;
```

**示例：**

```typescript
// 平滑移动节点
engine.animationManager.add({
  duration: 500,
  easing: EasingFns.easeOutQuad,
  onUpdate: (progress) => {
    node.position.x = startX + (endX - startX) * progress;
    node.position.y = startY + (endY - startY) * progress;
  },
  onComplete: () => {
    console.log('动画完成');
  }
});
```

### tick(now: number): void

更新所有活动的动画。此方法由引擎在每一帧自动调用，通常不需要手动调用。

**参数：**
- `now`: 当前时间戳（毫秒）

## 缓动函数

内置的缓动函数在 `EasingFns` 对象中：

```typescript
import { EasingFns } from '@agilejs/core';

// 可用的缓动函数
EasingFns.linear        // 线性
EasingFns.easeInQuad    // 二次缓入
EasingFns.easeOutQuad   // 二次缓出
EasingFns.easeInOutQuad // 二次缓入缓出
```

### 自定义缓动函数

```typescript
// 自定义缓动函数
const customEasing: Easing = (t: number) => {
  return t * t * t; // 三次缓动
};

engine.animationManager.add({
  duration: 300,
  easing: customEasing,
  onUpdate: (progress) => {
    // 使用自定义缓动
  }
});
```

## 使用示例

### 平滑缩放节点

```typescript
const startWidth = node.size.width;
const startHeight = node.size.height;
const targetWidth = 200;
const targetHeight = 150;

engine.animationManager.add({
  duration: 400,
  easing: EasingFns.easeInOutQuad,
  onUpdate: (progress) => {
    node.size.width = startWidth + (targetWidth - startWidth) * progress;
    node.size.height = startHeight + (targetHeight - startHeight) * progress;
    engine.graph.markDirty();
  }
});
```

### 渐变透明度

```typescript
engine.animationManager.add({
  duration: 600,
  easing: EasingFns.easeOutQuad,
  onUpdate: (progress) => {
    node.opacity = 1 - progress; // 从完全不透明到完全透明
    engine.graph.markDirty();
  },
  onComplete: () => {
    // 动画完成后移除节点
    engine.graph.removeNode(node.id);
  }
});
```

### 序列动画

```typescript
// 第一个动画
engine.animationManager.add({
  duration: 300,
  onUpdate: (progress) => {
    node.position.x = startX + deltaX * progress;
  },
  onComplete: () => {
    // 第一个动画完成后启动第二个
    engine.animationManager.add({
      duration: 300,
      onUpdate: (progress) => {
        node.position.y = startY + deltaY * progress;
      }
    });
  }
});
```

### 多个节点同步动画

```typescript
const selectedNodes = engine.graph.getSelectedNodes();

selectedNodes.forEach(node => {
  const startPos = { ...node.position };
  const offset = { x: 100, y: 50 };
  
  engine.animationManager.add({
    duration: 500,
    easing: EasingFns.easeInOutQuad,
    onUpdate: (progress) => {
      node.position.x = startPos.x + offset.x * progress;
      node.position.y = startPos.y + offset.y * progress;
    }
  });
});

// 只需标记一次脏区域
engine.graph.markDirty();
```

## 注意事项

### 性能考虑

1. **批量更新**：多个节点动画时，在所有 `onUpdate` 完成后统一调用 `markDirty()`
2. **避免过多动画**：同时运行大量动画会影响性能
3. **使用适当的帧率**：动画时长建议在 200-500ms 之间

### 与数据驱动插件的关系

如果使用了 [DataDrivenMotionPlugin](../plugins/data-driven-motion.md)，推荐使用数据驱动的方式触发动画：

```typescript
// 使用 DataDrivenMotionPlugin（推荐）
node.data.motion = {
  type: 'move',
  to: { x: 300, y: 200 },
  duration: 500,
  easing: 'easeOutQuad'
};
engine.graph.markDirty();

// 直接使用 AnimationManager（更底层）
engine.animationManager.add({
  duration: 500,
  easing: EasingFns.easeOutQuad,
  onUpdate: (progress) => {
    node.position.x = startX + (300 - startX) * progress;
    node.position.y = startY + (200 - startY) * progress;
  }
});
```

## 常见问题

### Q: 如何停止正在运行的动画？

A: 当前版本不支持直接停止单个动画。可以通过在 `onUpdate` 中添加条件判断来提前结束：

```typescript
let cancelled = false;

engine.animationManager.add({
  duration: 1000,
  onUpdate: (progress) => {
    if (cancelled) return;
    // 动画逻辑
  }
});

// 需要时设置标志
// cancelled = true;
```

### Q: 动画没有触发渲染？

A: 确保在 `onUpdate` 中调用了 `engine.graph.markDirty()`：

```typescript
engine.animationManager.add({
  duration: 500,
  onUpdate: (progress) => {
    node.position.x = startX + deltaX * progress;
    engine.graph.markDirty(); // 必需
  }
});
```

### Q: 如何实现循环动画？

A: 在 `onComplete` 中重新添加动画：

```typescript
function startLoopAnimation() {
  engine.animationManager.add({
    duration: 1000,
    onUpdate: (progress) => {
      // 动画逻辑
    },
    onComplete: () => {
      startLoopAnimation(); // 循环
    }
  });
}

startLoopAnimation();
```

## 相关内容

- [DataDrivenMotionPlugin](../plugins/data-driven-motion.md) - 数据驱动动画
- [CanvasEngine](./canvas-engine.md) - 引擎核心
- [Graph](./graph.md) - 图数据管理
