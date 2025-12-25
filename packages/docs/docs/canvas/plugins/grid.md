# GridPlugin

网格插件, 在画布背景显示网格线, 帮助用户对齐和布局节点。

## 基本使用

```typescript
import { CanvasEngine, GridPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new GridPlugin());
engine.start();
```

## 配置与交互

### 配置选项

```typescript
interface GridPluginOptions {
  size?: number;              // 网格大小(世界坐标单位), 默认 20
  color?: string;             // 网格线颜色, 默认 "#e5e7eb"
  alpha?: number;             // 透明度 (0-1), 默认 1
  type?: 'line' | 'dot';      // 网格类型: 线条或点状, 默认 'line'
  visible?: boolean;          // 是否显示网格, 默认 true
}

// 示例
engine.plugins.use(
  new GridPlugin({
    size: 30,              // 30 单位网格
    color: '#cbd5e1',      // 浅灰色
    alpha: 0.5,            // 半透明
    type: 'dot',           // 点状网格
    visible: true          // 启用显示
  })
);
```

### 功能特性

**网格对齐:**
- 网格线自动对齐到网格单位
- 只绘制可见区域的网格线(性能优化)

**样式支持:**
- 支持传统的线条网格 (`line`)
- 支持现代的点状网格 (`dot`)，视觉干扰更小

**显示控制:**
- 可通过 `visible` 属性随时开启或关闭网格显示，无需移除插件

**主题支持:**
- 深色主题: `color: '#374151'`
- 浅色主题: `color: '#e5e7eb'`

**视口裁剪:**
```typescript
// 获取视口范围
const topLeft = engine.toWorld({ x: 0, y: 0 });
const bottomRight = engine.toWorld({ x: canvas.width, y: canvas.height });

// 只绘制此范围内的网格线
```

## API与事件

### 插件ID

```typescript
readonly id = "grid"
```

### 生命周期方法

#### setup(engine: CanvasEngine): void
设置插件。

#### dispose(): void
清理插件。

#### beforeRender(ctx: CanvasRenderingContext2D): void
在节点和边之前渲染网格(作为背景层)。

### 动态配置

可以运行时修改网格配置:

```typescript
const gridPlugin = engine.plugins.get('grid') as GridPlugin;

// 切换样式
gridPlugin.type = 'dot';

// 隐藏网格
gridPlugin.visible = false;

// 根据缩放调整网格
engine.events.on('tick', () => {
  const scale = engine.getScale();
  if (scale < 0.5) {
    gridPlugin.size = 40;  // 增大网格
  } else {
    gridPlugin.size = 20;  // 默认网格
  }
});
```

## 常见问题

### Q: 如何隐藏网格?

A: 设置 `visible` 属性为 `false`，或者移除插件:

```typescript
// 推荐：临时隐藏
const grid = engine.plugins.get('grid');
if (grid) grid.visible = false;

// 或者：完全移除
engine.plugins.eject('grid');
```

### Q: 网格线太淡/太深?

A: 调整 `alpha` 和 `color`:

```typescript
new GridPlugin({
  alpha: 0.3,        // 更淡
  color: '#d1d5db'   // 更浅的灰色
})
```

### Q: 缩放时网格太密/太疏?

A: 根据缩放级别动态调整网格大小(见上面动态配置示例)。

## 相关内容

- [SnapToGridPlugin](./snap-to-grid.md) - 网格吸附
- [GuidesPlugin](./guides.md) - 对齐参考线
