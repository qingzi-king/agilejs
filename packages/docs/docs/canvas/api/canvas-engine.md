---
sidebar_position: 2
---

# CanvasEngine API

`CanvasEngine` 是画布引擎的核心类，负责渲染循环、视口管理、插件协调和性能优化。

## 构造函数

```typescript
constructor(options: EngineOptions)
```

创建引擎实例。

### EngineOptions

```typescript
interface EngineOptions {
  // 必需：容器元素
  container: HTMLElement;
  
  // 可选：画布尺寸（默认使用容器尺寸）
  width?: number;
  height?: number;
  
  // 可选：背景颜色
  background?: string;
  
  // 可选：运行模式（默认 'edit'）
  mode?: 'edit' | 'view' | 'none';
  
  // 可选：交互控制配置
  interactionConfig?: InteractionConfig;
  
  // 可选：边快照模式（默认 'auto'）
  edgeSnapshot?: 'auto' | 'off' | 'always';
  
  // 可选：拖拽时边渲染阈值
  dragEdgeRenderThreshold?: {
    nodes?: number;  // 默认 400
    edges?: number;  // 默认 800
  };
  
  // 可选：标签渲染阈值
  labelRenderThreshold?: {
    nodes?: number;  // 默认 1500
    edges?: number;  // 默认 3000
  };
  
  // 可选：激进降质阈值
  aggressiveDegradation?: {
    totalNodes?: number;  // 默认 5000
    totalEdges?: number;  // 默认 10000
  };
  
  // 可选：空间索引配置
  spatialIndex?: {
    enabled?: boolean;  // 默认 true
    maxItems?: number;  // 默认 16
    maxDepth?: number;  // 默认 8
    disableDuringDrag?: boolean;  // 默认 true
    padding?: number;  // 默认 32
  };
}
```

### InteractionConfig

```typescript
interface InteractionConfig {
  enableZoom?: boolean;      // 是否允许缩放（默认 true）
  enablePan?: boolean;       // 是否允许平移（默认 true）
  enableSelection?: boolean; // 是否允许节点选中（默认 true）
  enableDrag?: boolean;      // 是否允许节点拖拽（默认 true）
  enableResize?: boolean;    // 是否允许节点缩放（默认 true）
  enableRotate?: boolean;    // 是否允许节点旋转（默认 true）
}
```

### 示例

```typescript
const engine = new CanvasEngine({
  container: document.getElementById('canvas')!,
  width: 1200,
  height: 800,
  background: '#ffffff',
  mode: 'edit',
  interactionConfig: {
    enableZoom: true,
    enablePan: true,
    enableSelection: true,
    enableDrag: true
  },
  dragEdgeRenderThreshold: {
    nodes: 400,
    edges: 800
  }
});
```

## 属性

### canvas
```typescript
readonly canvas: HTMLCanvasElement
```
Canvas DOM 元素。

### ctx
```typescript
readonly ctx: CanvasRenderingContext2D
```
2D 渲染上下文。

### events
```typescript
readonly events: EventBus<EngineEvents & { [key: string]: any }>
```
事件总线。详见 [事件系统](../events.md)。

### history
```typescript
readonly history: CommandHistory
```
命令历史管理器。详见 [命令历史](./command-history.md)。

### graph
```typescript
readonly graph: Graph
```
图形数据模型。详见 [Graph API](./graph.md)。

### renderers
```typescript
readonly renderers: RendererRegistry
```
渲染器注册表。详见 [渲染器注册表](../custom-renderers.md)。

### plugins
```typescript
readonly plugins: PluginManager
```
插件管理器。详见 [插件管理器](./plugin-manager.md)。

### animations
```typescript
readonly animations: AnimationManager
```
动画管理器。详见 [动画管理器](./animation-manager.md)。

## 渲染控制

### start()
```typescript
start(): void
```
启动引擎渲染循环。每帧自动调用 `render()` 并触发 `engine:tick` 事件。

```typescript
engine.start();
```

### stop()
```typescript
stop(): void
```
停止引擎渲染循环。

```typescript
engine.stop();
```

### render()
```typescript
render(time: number): void
```
手动触发一次渲染（通常在停止状态下使用）。

**参数：**
- `time`: 当前时间戳（通常来自 `performance.now()`）

```typescript
engine.stop();
engine.render(performance.now());  // 渲染一帧
```

### destroy()
```typescript
destroy(): void
```
销毁引擎，清理所有资源（停止渲染、断开 ResizeObserver、移除事件监听器）。

```typescript
engine.destroy();
```

## 视口管理

### getScale()
```typescript
getScale(): number
```
获取当前缩放比例。

```typescript
const scale = engine.getScale();  // 例如 1.5
```

### setScale()
```typescript
setScale(scale: number): void
```
设置缩放比例（范围：0.1 ~ 10）。

```typescript
engine.setScale(1.5);
```

### getTranslation()
```typescript
getTranslation(): { x: number; y: number }
```
获取当前平移量（屏幕空间）。

```typescript
const { x, y } = engine.getTranslation();
```

### setTranslation()
```typescript
setTranslation(x: number, y: number): void
```
设置平移量（屏幕空间）。

```typescript
engine.setTranslation(100, 50);
```

### zoomAt()
```typescript
zoomAt(factor: number, screenX: number, screenY: number): void
```
在指定屏幕坐标处缩放（保持该点世界坐标不变）。

**参数：**
- `factor`: 缩放因子（例如 1.2 表示放大 20%）
- `screenX`: 屏幕 X 坐标
- `screenY`: 屏幕 Y 坐标

```typescript
// 在鼠标位置放大 20%
engine.zoomAt(1.2, mouseX, mouseY);
```

### fitView()
```typescript
fitView(options?: {
  selectionOnly?: boolean;  // 仅适配选中节点（默认 false）
  padding?: number;         // 边距（默认 40）
  minScale?: number;        // 最小缩放（默认 0.1）
  maxScale?: number;        // 最大缩放（默认 10）
}): boolean
```
自动缩放和平移以适配节点。返回是否成功执行（无节点时返回 `false`）。

```typescript
// 适配所有节点
engine.fitView({ padding: 50 });

// 仅适配选中节点
engine.fitView({ selectionOnly: true });

// 自定义缩放范围
engine.fitView({ minScale: 0.5, maxScale: 2 });
```

## 坐标转换

### toScreen()
```typescript
toScreen(world: { x: number; y: number }): { x: number; y: number }
```
世界坐标转屏幕坐标。

```typescript
const screenPos = engine.toScreen({ x: 100, y: 100 });
```

### toWorld()
```typescript
toWorld(screen: { x: number; y: number }): { x: number; y: number }
```
屏幕坐标转世界坐标。

```typescript
const worldPos = engine.toWorld({ x: clientX, y: clientY });
```

## 交互配置

### getInteractionConfig()
```typescript
getInteractionConfig(): Readonly<InteractionConfig>
```
获取当前交互配置。

```typescript
const config = engine.getInteractionConfig();
console.log(config.enableDrag);  // true/false
```

### setInteractionConfig()
```typescript
setInteractionConfig(config: Partial<InteractionConfig>): void
```
设置交互配置（部分更新）。

```typescript
// 禁用拖拽和选中
engine.setInteractionConfig({
  enableDrag: false,
  enableSelection: false
});

// 恢复拖拽
engine.setInteractionConfig({
  enableDrag: true
});
```

## 运行模式

### getMode()
```typescript
getMode(): 'edit' | 'view' | 'none'
```
获取当前运行模式。

```typescript
const mode = engine.getMode();  // 'edit' | 'view' | 'none'
```

### setMode()
```typescript
setMode(mode: 'edit' | 'view' | 'none'): void
```
设置运行模式。影响部分插件的行为（如 DataTooltipPlugin 仅在 'edit' 模式下工作）。

```typescript
engine.setMode('view');  // 切换到预览模式
```

## 主题管理

### getTheme()
```typescript
getTheme(): 'light' | 'dark'
```
获取当前主题。

```typescript
const theme = engine.getTheme();  // 'light' | 'dark'
```

### setTheme()
```typescript
setTheme(
  theme: 'light' | 'dark',
  overrides?: Partial<{
    background: string;
    grid: { color?: string; alpha?: number };
    guides: { color?: string };
    minimap: {
      background?: string;
      borderColor?: string;
      nodeColor?: string;
      edgeColor?: string;
      viewportStroke?: string;
      viewportFill?: string;
    };
  }>
): void
```
设置主题。会自动应用到画布背景和支持主题的插件（GridPlugin、GuidesPlugin、MinimapPlugin）。

**参数：**
- `theme`: 主题名称
- `overrides`: 可选的调色板覆盖

```typescript
// 切换到深色主题
engine.setTheme('dark');

// 自定义背景色
engine.setTheme('light', {
  background: '#f5f5f5',
  grid: { color: '#e0e0e0' }
});
```

## 性能优化

### setPanning()
```typescript
setPanning(flag: boolean): void
```
设置平移状态（用于内部降质渲染）。通常由 PanZoomPlugin 调用。

```typescript
engine.setPanning(true);  // 进入平移模式
```

### isCurrentlyPanning()
```typescript
isCurrentlyPanning(): boolean
```
检查当前是否处于平移状态。

```typescript
const isPanning = engine.isCurrentlyPanning();
```

### setDraggingNodes()
```typescript
setDraggingNodes(flag: boolean, count?: number): void
```
设置节点拖动状态（用于内部降质渲染）。通常由 DragPlugin 调用。

**参数：**
- `flag`: 是否正在拖动
- `count`: 拖动的节点数量（可选，默认 0）

```typescript
engine.setDraggingNodes(true, 5);  // 开始拖动 5 个节点
```

### isCurrentlyDraggingNodes()
```typescript
isCurrentlyDraggingNodes(): boolean
```
检查当前是否处于节点拖动状态。

```typescript
const isDragging = engine.isCurrentlyDraggingNodes();
```

### getDraggingNodeCount()
```typescript
getDraggingNodeCount(): number
```
获取当前拖动的节点数量。

```typescript
const count = engine.getDraggingNodeCount();
```

### getEdgeSnapshotMode()
```typescript
getEdgeSnapshotMode(): 'auto' | 'off' | 'always'
```
获取当前边快照模式。

```typescript
const mode = engine.getEdgeSnapshotMode();
```

### setEdgeSnapshotMode()
```typescript
setEdgeSnapshotMode(mode: 'auto' | 'off' | 'always'): void
```
设置边快照模式：
- `'auto'`（默认）：无动态流动效果时使用快照；有 flow 动画时每帧重建
- `'off'`：关闭快照，改为每帧在 world-space 绘制边
- `'always'`：始终使用快照（即使存在 flow 动画，动画会被"冻结"）

```typescript
// 关闭边快照（适用于边动画密集场景）
engine.setEdgeSnapshotMode('off');

// 强制使用快照（提升性能但禁用边动画）
engine.setEdgeSnapshotMode('always');
```

## 历史调试

### getHistoryData()
```typescript
getHistoryData(format?: 'object' | 'array'): any
```
获取历史数据（用于调试）。

**参数：**
- `format`: 数据格式
  - `'object'`（默认）：返回结构化对象
  - `'array'`：返回扁平数组

```typescript
const history = engine.getHistoryData('object');
console.log(history);
```

## 尺寸调整

### resize()
```typescript
resize(width: number, height: number): void
```
手动调整画布尺寸。通常不需要调用，引擎会自动监听容器尺寸变化。

```typescript
engine.resize(1200, 800);
```

## 事件

引擎会触发以下事件：

### engine:tick
```typescript
{ time: number }
```
每帧触发，包含时间戳。

```typescript
engine.events.on('engine:tick', ({ time }) => {
  console.log('Frame time:', time);
});
```

### engine:resize
```typescript
{ width: number; height: number }
```
画布尺寸改变时触发。

```typescript
engine.events.on('engine:resize', ({ width, height }) => {
  console.log('Canvas resized:', width, height);
});
```

### graph:change
```typescript
{ reason: string }
```
图形数据改变时触发。

```typescript
engine.events.on('graph:change', ({ reason }) => {
  console.log('Graph changed:', reason);
});
```

### engine:theme-change
```typescript
{ theme: string }
```
主题改变时触发。

```typescript
engine.events.on('engine:theme-change', ({ theme }) => {
  console.log('Theme changed:', theme);
});
```

## 使用示例

### 完整初始化

```typescript
import { 
  CanvasEngine, 
  RectRenderer, 
  GridPlugin, 
  DragPlugin,
  PanZoomPlugin 
} from '@agilejs/core';

// 创建引擎
const engine = new CanvasEngine({
  container: document.getElementById('canvas')!,
  background: '#ffffff',
  mode: 'edit',
  interactionConfig: {
    enableZoom: true,
    enablePan: true,
    enableSelection: true,
    enableDrag: true
  }
});

// 注册渲染器
engine.renderers.register(new RectRenderer());

// 启用插件
engine.plugins.use(new GridPlugin({ size: 20, color: '#f0f0f0' }));
engine.plugins.use(new DragPlugin());
engine.plugins.use(new PanZoomPlugin());

// 添加节点
engine.graph.addNode({
  id: 'node-1',
  shape: 'rect',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 80 }
});

// 启动渲染
engine.start();

// 适配视口
engine.fitView({ padding: 50 });
```

### 切换模式

```typescript
// 切换到预览模式
engine.setMode('view');
engine.setInteractionConfig({
  enableDrag: false,
  enableSelection: false
});

// 切换回编辑模式
engine.setMode('edit');
engine.setInteractionConfig({
  enableDrag: true,
  enableSelection: true
});
```

### 性能监控

```typescript
let frameCount = 0;
let lastTime = performance.now();

engine.events.on('engine:tick', ({ time }) => {
  frameCount++;
  const elapsed = time - lastTime;
  
  if (elapsed >= 1000) {
    const fps = frameCount / (elapsed / 1000);
    console.log('FPS:', fps.toFixed(2));
    
    if (fps < 30) {
      console.warn('Low FPS detected, consider optimizations');
    }
    
    frameCount = 0;
    lastTime = time;
  }
});
```

## 性能优化建议

1. **大规模场景**：使用空间索引（默认启用）
2. **边动画密集**：考虑设置 `edgeSnapshot: 'off'`
3. **高频拖动**：调整 `dragEdgeRenderThreshold` 阈值
4. **交互禁用**：在特定场景禁用不必要的交互
5. **批量操作**：使用事务包裹多个命令
