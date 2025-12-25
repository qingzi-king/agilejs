# GuidesPlugin

对齐参考线插件, 在拖拽节点时自动显示对齐参考线, 帮助用户精确对齐节点。

## 基本使用

```typescript
import { CanvasEngine, GuidesPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new GuidesPlugin());
engine.start();
```

## 配置与交互

### 配置选项

```typescript
interface GuidesPluginOptions {
  threshold?: number;      // 对齐阈值(像素), 默认 6
  color?: string;          // 参考线颜色, 默认 "#ef4444"(红色)
  lineWidth?: number;      // 线宽, 默认 1
  lineDash?: number[];     // 虚线样式, 默认 [4, 3]
  visible?: boolean;       // 是否显示对齐线, 默认 true
}

// 示例
engine.plugins.use(
  new GuidesPlugin({
    visible: true,          // 启用显示
    threshold: 8,           // 8 像素内触发对齐
    color: '#10b981',       // 绿色参考线
    lineWidth: 1.5,
    lineDash: [6, 4]
  })
);
```

### 功能特性

**自动对齐检测:**
- 左对齐: 节点左边缘对齐
- 右对齐: 节点右边缘对齐
- 水平居中: 节点水平中心对齐
- 上对齐: 节点上边缘对齐
- 下对齐: 节点下边缘对齐
- 垂直居中: 节点垂直中心对齐

**参考线显示:**
- 当检测到对齐时显示虚线参考线
- 支持同时显示多条参考线
- 拖拽结束后自动隐藏

## API与事件

### 插件ID

```typescript
readonly id = "guides"
```

### 生命周期方法

#### setup(engine: CanvasEngine): void
设置插件, 监听鼠标事件。

#### dispose(): void
清理插件, 移除事件监听。

#### afterRender(ctx: CanvasRenderingContext2D): void
渲染参考线。

### 对齐算法

```typescript
// 计算节点对齐点
const alignPoints = {
  left: node.position.x,
  right: node.position.x + node.size.width,
  centerX: node.position.x + node.size.width / 2,
  top: node.position.y,
  bottom: node.position.y + node.size.height,
  centerY: node.position.y + node.size.height / 2
};

// 对齐检测(屏幕像素)
const diff = Math.abs(screenPos1 - screenPos2);
if (diff <= threshold) {
  // 显示参考线
}
```

## 常见问题

### Q: 参考线不显示?

A: 检查:
1. 是否安装了 DragPlugin
2. 是否正在拖拽节点
3. 阈值是否太小

### Q: 参考线太敏感/不敏感?

A: 调整 `threshold` 值:

```typescript
new GuidesPlugin({
  threshold: 10  // 增加阈值, 降低敏感度
})
```

### Q: 如何自定义参考线样式?

A: 使用配置选项:

```typescript
new GuidesPlugin({
  color: '#3b82f6',    // 蓝色
  lineWidth: 2,
  lineDash: [8, 4]     // 长虚线
})
```

## 相关内容

- [GridPlugin](./grid.md)
- [SnapToGridPlugin](./snap-to-grid.md)
