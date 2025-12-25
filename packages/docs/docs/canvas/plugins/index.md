# 插件

插件是扩展画布引擎功能的核心机制。通过插件系统，您可以为画布添加交互、编辑、视觉效果等各种功能。

## 插件概览

### 交互类插件

用于处理用户输入和交互操作：

- **[PanZoomPlugin](pan-zoom.md)** - 平移和缩放画布，支持鼠标和触摸
- **[DragPlugin](drag.md)** - 拖拽节点，支持多选拖拽和分组
- **[SelectionOverlayPlugin](selection-overlay.md)** - 显示选中节点的边框
- **[BoxSelectPlugin](box-select.md)** - 框选多个节点
- **[HoverCursorPlugin](hover-cursor.md)** - 鼠标悬停时改变光标样式

### 编辑类插件

用于节点和边的编辑操作：

- **[ResizeRotatePlugin](resize-rotate.md)** - 调整节点大小和旋转角度
- **[GroupResizeRotatePlugin](group-resize-rotate.md)** - 调整组的大小和旋转角度
- **[InlineTextEditPlugin](inline-text-edit.md)** - 双击节点进行文本编辑
- **[EdgeEditPlugin](edge-edit.md)** - 编辑边的端点和路径
- **[PolylineNodeEditPlugin](polyline-node-edit.md)** - 编辑多边形节点的顶点

### 连接和辅助类插件

用于创建连接和提供视觉辅助：

- **[ConnectPlugin](connect.md)** - 通过端口创建节点间的连接
- **[PortOverlayPlugin](port-overlay.md)** - 显示节点端口的可视化覆盖层
- **[GridPlugin](grid.md)** - 显示网格背景
- **[GuidesPlugin](guides.md)** - 显示对齐参考线
- **[SnapToGridPlugin](snap-to-grid.md)** - 节点吸附到网格

### 功能类插件

提供额外的功能特性：

- **[KeyboardPlugin](keyboard.md)** - 键盘快捷键支持
- **[ClipboardPlugin](clipboard.md)** - 复制粘贴功能
- **[MinimapPlugin](minimap.md)** - 显示画布缩略图导航
- **[LabelOverlayPlugin](label-overlay.md)** - 渲染节点和边的标签
- **[BlinkPlugin](blink.md)** - 节点闪烁效果

### 高级类插件

用于复杂场景和数据驱动：

- **[DataDrivenMotionPlugin](data-driven-motion.md)** - 数据驱动的节点更新
- **[DataTooltipPlugin](data-tooltip.md)** - 数据提示框
- **[FlowDashPlugin](flow-dash.md)** - 边的流动动画效果
- **[NodeFlowDashPlugin](node-flow-dash.md)** - 节点边框的流动动画
- **[GroupPlugin](group.md)** - 节点分组功能

## 使用插件

### 基本使用

```typescript
import { CanvasEngine, PanZoomPlugin, DragPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

// 注册插件
engine.plugins.use(new PanZoomPlugin());
engine.plugins.use(new DragPlugin());

engine.start();
```

### 配置插件选项

大多数插件支持配置选项：

```typescript
import { ResizeRotatePlugin } from '@fnt-agilejs/core';

engine.plugins.use(
  new ResizeRotatePlugin({
    handleSize: 10,
    handleColor: '#2563eb',
    enableRotation: true,
    enableResize: true
  })
);
```

### 动态管理插件

```typescript
// 获取插件实例
const dragPlugin = engine.plugins.get('drag');

// 检查插件是否已注册
if (engine.plugins.has('pan-zoom')) {
  console.log('PanZoom plugin is registered');
}

// 移除插件
engine.plugins.eject('drag');
```

## 插件生命周期

每个插件都实现了 `Plugin` 接口，支持以下生命周期钩子：

```typescript
interface Plugin {
  readonly id: string;
  
  // 插件设置（必需）
  setup(engine: CanvasEngine): void;
  
  // 插件清理（必需，需要的场景如：创建了DOM元素、绑定全局事件、定时器、订阅了事件总线）
  // 轻量级或纯逻辑插件不需要
  dispose?(): void;
  
  // 渲染前回调（可选）
  beforeRender?(ctx: CanvasRenderingContext2D): void;
  
  // 渲染后回调（可选）
  afterRender?(ctx: CanvasRenderingContext2D): void;
  
  // 渲染节点标签（可选）
  renderNodeLabels?(ctx: CanvasRenderingContext2D): void;
  
  // 渲染边标签（可选）
  renderEdgeLabels?(ctx: CanvasRenderingContext2D): void;
}
```

## 创建自定义插件

您可以创建自己的插件来扩展功能：

```typescript
import { Plugin, CanvasEngine } from '@fnt-agilejs/core';

class MyCustomPlugin implements Plugin {
  readonly id = 'my-custom-plugin';
  private engine!: CanvasEngine;
  
  setup(engine: CanvasEngine): void {
    this.engine = engine;
    // 设置事件监听器
    engine.canvas.addEventListener('click', this.onClick);
  }
  
  dispose(): void {
    // 清理资源
    this.engine.canvas.removeEventListener('click', this.onClick);
  }
  
  private onClick = (e: MouseEvent) => {
    // 处理点击事件
    console.log('Canvas clicked!');
  };
  
  afterRender(ctx: CanvasRenderingContext2D): void {
    // 自定义渲染逻辑
    ctx.fillStyle = 'red';
    ctx.fillRect(10, 10, 50, 50);
  }
}

// 使用自定义插件
engine.plugins.use(new MyCustomPlugin());
```

## 插件最佳实践

### 1. 性能考虑

- 避免在 `afterRender` 中进行重计算，使用缓存
- 使用事件节流来限制频繁操作
- 在不需要时及时清理事件监听器

```typescript
class PerformantPlugin implements Plugin {
  readonly id = 'performant';
  private engine!: CanvasEngine;
  private cachedData: any = null;
  
  setup(engine: CanvasEngine): void {
    this.engine = engine;
    
    // 监听图变化，清除缓存
    engine.events.on('graphChanged', () => {
      this.cachedData = null;
    });
  }
  
  afterRender(ctx: CanvasRenderingContext2D): void {
    // 使用缓存避免重复计算
    if (!this.cachedData) {
      this.cachedData = this.computeExpensiveData();
    }
    this.renderWithCache(ctx, this.cachedData);
  }
  
  private computeExpensiveData() {
    // 昂贵的计算
    return {};
  }
  
  private renderWithCache(ctx: CanvasRenderingContext2D, data: any) {
    // 使用缓存数据渲染
  }
  
  dispose(): void {
    this.cachedData = null;
  }
}
```

### 2. 事件传播

当插件处理事件时，注意事件的传播：

```typescript
private onMouseDown = (e: MouseEvent) => {
  // 检查是否应该处理此事件
  if (someCondition) {
    // 阻止其他插件处理此事件
    e.preventDefault();
    e.stopPropagation();
  }
};
```

### 3. 配置交互开关

尊重引擎的全局交互配置：

```typescript
private onMouseDown = (e: MouseEvent) => {
  const config = this.engine.getInteractionConfig();
  
  // 检查功能是否被禁用
  if (!config.enableDrag) return;
  
  // 继续处理...
};
```

### 4. 坐标转换

正确处理屏幕坐标和世界坐标的转换：

```typescript
private onClick = (e: MouseEvent) => {
  const rect = this.engine.canvas.getBoundingClientRect();
  const screenPos = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
  
  // 转换为世界坐标
  const worldPos = this.engine.toWorld(screenPos);
  
  // 进行命中测试
  const hitNode = hitTestNodes(worldPos, this.engine.graph.getNodes(), {
    scale: this.engine.getScale(),
    pixelThresholdPx: 10
  });
};
```

## 常见问题

### Q: 插件的执行顺序重要吗？

A: 是的。插件按注册顺序执行。对于事件处理插件（如 `DragPlugin` 和 `PanZoomPlugin`），建议将更具体的插件放在前面。

```typescript
// 推荐顺序
engine.plugins.use(
  new DragPlugin(),          // 先处理拖拽
  new PanZoomPlugin(),       // 再处理平移缩放
  new SelectionOverlayPlugin() // 最后渲染选择框
);
```

### Q: 如何避免插件冲突？

A: 使用 `e.preventDefault()` 和 `e.stopPropagation()` 来控制事件传播，并在适当时检查其他插件的状态。

### Q: 插件可以访问其他插件吗？

A: 可以通过 `engine.plugins.get(id)` 获取其他插件的实例：

```typescript
setup(engine: CanvasEngine): void {
  this.engine = engine;
  
  // 获取其他插件
  const guidesPlugin = engine.plugins.get('guides') as GuidesPlugin;
  if (guidesPlugin) {
    // 与其他插件交互
  }
}
```

## 下一步

- 查看各个插件的详细文档了解具体用法
- 阅读 [插件管理器 API](../api/plugin-manager.md) 了解插件管理接口
- 参考 [命令系统](../api/commands.md) 了解如何在插件中执行可撤销的操作
