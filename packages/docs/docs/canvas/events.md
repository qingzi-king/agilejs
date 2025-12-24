---
sidebar_position: 9
---

# 事件

引擎内置事件系统，支持发布/订阅模式，用于组件间通信和状态同步。

## 事件列表

以下是所有内置事件的完整列表：

| 事件名 | 描述 | 触发时机 | Payload 类型 | 支持输入 |
|--------|------|----------|-------------|----------|
| **引擎生命周期** |
| `engine:tick` | 每帧渲染 | 每次渲染循环 | `{ time: number }` | - |
| `engine:resize` | 画布尺寸改变 | 画布大小变化时 | `{ width: number; height: number }` | - |
| `engine:theme-change` | 主题改变 | 切换主题时 | `{ theme: 'light' \| 'dark' }` | - |
| **图形变化** |
| `graph:change` | 图形数据改变 | 节点/边增删改、选择变化等 | `{ reason: string }` | - |
| `graph:selection-change` | 选择改变 | 节点/边选择状态变化 | `{ nodes: string[]; edges: string[]; reason: string }` | - |
| **交互事件** |
| `node:click` | 点击节点 | 点击节点时 | `{ nodeId: string; event: MouseEvent \| TouchEvent }` | 🖱️ 鼠标 / 👆 触摸 |
| `node:removed` | 节点移除 | 节点被删除时 | `{ node: NodeData }` | - |
| `edge:click` | 点击边 | 点击边时 | `{ edgeId: string; event: MouseEvent \| TouchEvent }` | 🖱️ 鼠标 / 👆 触摸 |
| `edge:removed` | 边移除 | 边被删除时 | `{ edge: EdgeData }` | - |
| `canvas:click` | 点击画布 | 点击画布空白处时 | `{ event: MouseEvent \| TouchEvent }` | 🖱️ 鼠标 / 👆 触摸 |
| **拖拽事件** |
| `node:drag-start` | 开始拖拽节点 | 鼠标/触摸按下并移动节点 | `{ nodeId: string; selectedNodeIds: string[]; screen: Point; world: Point }` | 🖱️ 鼠标 / 👆 触摸 |
| `node:drag-move` | 拖拽移动中 | 拖拽过程中持续触发 | `{ nodeIds: string[]; delta: Point; positions: Map<string, Point> }` | 🖱️ 鼠标 / 👆 触摸 |
| `node:drag-end` | 结束拖拽节点 | 鼠标/触摸释放 | `{ nodeIds: string[]; hasMoved: boolean }` | 🖱️ 鼠标 / 👆 触摸 |
| **缩放旋转事件** |
| `node:resize-start` | 开始调整节点大小 | 拖拽调整控制点 | `{ nodeId: string; handle: HandleType; startSize: Size }` | 🖱️ 鼠标 / 👆 触摸 |
| `node:resize-move` | 调整大小中 | 调整过程中持续触发 | `{ nodeId: string; size: Size; position: Point }` | 🖱️ 鼠标 / 👆 触摸 |
| `node:resize-end` | 结束调整大小 | 释放调整控制点 | `{ nodeId: string; size: Size; position: Point }` | 🖱️ 鼠标 / 👆 触摸 |
| `node:rotate-start` | 开始旋转节点 | 拖拽旋转控制点 | `{ nodeId: string; startRotation: number; center: Point }` | 🖱️ 鼠标 / 👆 触摸 |
| `node:rotate-move` | 旋转中 | 旋转过程中持续触发 | `{ nodeId: string; rotation: number; deltaRad: number }` | 🖱️ 鼠标 / 👆 触摸 |
| `node:rotate-end` | 结束旋转 | 释放旋转控制点 | `{ nodeId: string; rotation: number }` | 🖱️ 鼠标 / 👆 触摸 |
| **组操作事件** |
| `group:resize-start` | 开始调整组大小 | 多选节点调整大小 | `{ nodeIds: string[]; handle: HandleType; startRect: Rect; angleRad: number }` | 🖱️ 鼠标 / 👆 触摸 |
| `group:resize-move` | 组调整大小中 | 组调整过程中 | `{ nodeIds: string[]; handle: HandleType; scale: { sx: number; sy: number }; angleRad: number }` | 🖱️ 鼠标 / 👆 触摸 |
| `group:resize-end` | 结束组调整大小 | 完成组调整 | `{ nodeIds: string[]; updates: Array; handle: HandleType }` | 🖱️ 鼠标 / 👆 触摸 |
| `group:rotate-start` | 开始组旋转 | 多选节点旋转 | `{ nodeIds: string[]; center: Point; angleRad: number }` | 🖱️ 鼠标 / 👆 触摸 |
| `group:rotate-move` | 组旋转中 | 组旋转过程中 | `{ nodeIds: string[]; deltaRad: number; center: Point }` | 🖱️ 鼠标 / 👆 触摸 |
| `group:rotate-end` | 结束组旋转 | 完成组旋转 | `{ nodeIds: string[]; updates: Array }` | 🖱️ 鼠标 / 👆 触摸 |
| **框选事件** |
| `canvas:box-select-start` | 开始框选 | 空白处按下鼠标/触摸 | `{ start: Point; additive: boolean }` | 🖱️ 鼠标 |
| `canvas:box-select-change` | 框选范围改变 | 拖动框选框 | `{ start: Point; current: Point; rect: Rect; additive: boolean }` | 🖱️ 鼠标 |
| `canvas:box-select-end` | 结束框选 | 释放鼠标 | `{ start: Point; end: Point; rect: Rect; additive: boolean; canceled: boolean; selected: string[] }` | 🖱️ 鼠标 |

**输入支持说明：**
- 🖱️ 鼠标：支持鼠标操作
- 👆 触摸：支持触摸屏操作（移动端）
- `-`：不涉及用户输入

## EventBus

### 基本用法

```typescript
// 监听事件
engine.events.on('graph:change', ({ reason }) => {
  console.log('图形变化:', reason);
});

// 触发事件
engine.events.emit('graph:change', { reason: 'node-added' });

// 取消监听
const handler = ({ reason }) => console.log(reason);
engine.events.on('graph:change', handler);
engine.events.off('graph:change', handler);
```

## 内置事件

### 引擎生命周期事件

#### `engine:tick`
每帧渲染时触发。

```typescript
engine.events.on('engine:tick', ({ time }) => {
  console.log('Frame time:', time);
});
```

**Payload:**
```typescript
{ time: number }  // 时间戳 (ms)
```

#### `engine:resize`
画布尺寸改变时触发。

```typescript
engine.events.on('engine:resize', ({ width, height }) => {
  console.log(`Canvas resized to ${width}x${height}`);
});
```

**Payload:**
```typescript
{ width: number; height: number }
```

### 图形事件

#### `graph:change`
图形数据改变时触发。

```typescript
engine.events.on('graph:change', ({ reason }) => {
  console.log('Graph changed:', reason);
});
```

**Payload:**
```typescript
{
  reason: string;  // 如 'node-added', 'node-removed', 'node-selection', 
                   // 'edge-selection-cleared', 'box-select', 'inline-text-edit' 等
}
```

#### `graph:selection-change`
选择改变时触发。
选择改变时触发。

```typescript
engine.events.on('graph:selection-change', ({ nodes, edges, reason }) => {
  console.log('Selected nodes:', nodes);
  console.log('Selected edges:', edges);
  console.log('Reason:', reason);
});
```

**Payload:**
```typescript
{
  nodes: string[];      // 选中的节点 ID 列表
  edges: string[];      // 选中的边 ID 列表
  reason: string;       // 如 'node-click', 'clear' 等
}
```

### 交互事件

#### `node:click`
点击节点时触发。

```typescript
engine.events.on('node:click', ({ nodeId, event }) => {
  console.log('Clicked node:', nodeId);
  // 阻止事件冒泡（如果需要）
  // event.stopPropagation();
});
```

**Payload:**
```typescript
{
  nodeId: string;
  event: MouseEvent | TouchEvent;
}
```

#### `node:removed`
节点被移除时触发。

```typescript
engine.events.on('node:removed', ({ node }) => {
  console.log('Node removed:', node.id);
});
```

**Payload:**
```typescript
{
  node: NodeData; // 被移除的节点数据对象
}
```

#### `edge:click`
点击边时触发。

```typescript
engine.events.on('edge:click', ({ edgeId, event }) => {
  console.log('Clicked edge:', edgeId);
});
```

**Payload:**
```typescript
{
  edgeId: string;
  event: MouseEvent | TouchEvent;
}
```

#### `edge:removed`
边被移除时触发。

```typescript
engine.events.on('edge:removed', ({ edge }) => {
  console.log('Edge removed:', edge.id);
});
```

**Payload:**
```typescript
{
  edge: EdgeData; // 被移除的边数据对象
}
```

#### `canvas:click`
点击画布空白处时触发。

```typescript
engine.events.on('canvas:click', ({ event }) => {
  console.log('Clicked canvas at:', event.clientX, event.clientY);
});
```

**Payload:**
```typescript
{
  event: MouseEvent | TouchEvent;
}
```

### 主题事件

#### `engine:theme-change`
主题改变时触发。

```typescript
engine.events.on('engine:theme-change', ({ theme }) => {
  console.log('Theme changed to:', theme);
});
```

**Payload:**
```typescript
{ theme: 'light' | 'dark' }
```

## 拖拽事件

### `node:drag-start`

开始拖拽节点时触发。

```typescript
engine.events.on('node:drag-start', ({ nodeId, selectedNodeIds, screen, world }) => {
  console.log('开始拖拽:', nodeId);
  console.log('选中的节点:', selectedNodeIds);
  console.log('屏幕坐标:', screen);
  console.log('世界坐标:', world);
});
```

**Payload:**
```typescript
{
  nodeId: string;           // 被拖拽的主节点 ID
  selectedNodeIds: string[]; // 所有被拖拽的节点 ID（包含主节点）
  screen: { x: number; y: number };  // 屏幕坐标
  world: { x: number; y: number };   // 世界坐标
}
```

### `node:drag-move`

拖拽移动中持续触发。

```typescript
engine.events.on('node:drag-move', ({ nodeIds, delta, positions }) => {
  console.log('拖拽中:', nodeIds);
  console.log('位移:', delta);
});
```

**Payload:**
```typescript
{
  nodeIds: string[];        // 被拖拽的节点 ID 列表
  delta: { x: number; y: number };   // 位移量
  positions: Map<string, { x: number; y: number }>; // 各节点当前位置
}
```

### `node:drag-end`

结束拖拽节点时触发。

```typescript
engine.events.on('node:drag-end', ({ nodeIds, hasMoved }) => {
  console.log('结束拖拽:', nodeIds);
  console.log('是否移动:', hasMoved);
});
```

**Payload:**
```typescript
{
  nodeIds: string[];    // 被拖拽的节点 ID 列表
  hasMoved: boolean;    // 是否实际发生了移动
}
```

## 调整大小事件

### `node:resize-start`

开始调整节点大小时触发。

```typescript
engine.events.on('node:resize-start', ({ nodeId, handle, startSize }) => {
  console.log('开始调整大小:', nodeId);
  console.log('控制点:', handle);
  console.log('初始大小:', startSize);
});
```

**Payload:**
```typescript
{
  nodeId: string;
  handle: HandleType;   // 控制点类型
  startSize: { width: number; height: number };
}
```

### `node:resize-move`

调整大小过程中持续触发。

```typescript
engine.events.on('node:resize-move', ({ nodeId, size, position }) => {
  console.log('调整中:', nodeId);
  console.log('当前大小:', size);
  console.log('当前位置:', position);
});
```

**Payload:**
```typescript
{
  nodeId: string;
  size: { width: number; height: number };
  position: { x: number; y: number };
}
```

### `node:resize-end`

结束调整大小时触发。

```typescript
engine.events.on('node:resize-end', ({ nodeId, size, position }) => {
  console.log('结束调整:', nodeId);
  console.log('最终大小:', size);
  console.log('最终位置:', position);
});
```

**Payload:**
```typescript
{
  nodeId: string;
  size: { width: number; height: number };
  position: { x: number; y: number };
}
```

## 旋转事件

### `node:rotate-start`

开始旋转节点时触发。

```typescript
engine.events.on('node:rotate-start', ({ nodeId, startRotation }) => {
  console.log('开始旋转:', nodeId);
  console.log('初始角度:', startRotation);
});
```

**Payload:**
```typescript
{
  nodeId: string;
  startRotation: number;
}
```

### `node:rotate-move`

旋转过程中持续触发。

```typescript
engine.events.on('node:rotate-move', ({ nodeId, rotation }) => {
  console.log('旋转中:', nodeId);
  console.log('当前角度:', rotation);
});
```

**Payload:**
```typescript
{
  nodeId: string;
  rotation: number;
}
```

### `node:rotate-end`

结束旋转时触发。

```typescript
engine.events.on('node:rotate-end', ({ nodeId, rotation }) => {
  console.log('结束旋转:', nodeId);
  console.log('最终角度:', rotation);
});
```



## 组操作事件

### `group:resize-start`

开始调整多选节点组大小时触发。

```typescript
engine.events.on('group:resize-start', ({ nodeIds, handle, startRect, angleRad }) => {
  console.log('开始组调整:', nodeIds);
  console.log('控制点:', handle);
  console.log('初始矩形:', startRect);
});
```

**Payload:**
```typescript
{
  nodeIds: string[];
  handle: HandleType;
  startRect: { x: number; y: number; width: number; height: number };
  angleRad: number;   // 组旋转角度（弧度）
}
```

### `group:resize-move`

组调整大小过程中持续触发。

```typescript
engine.events.on('group:resize-move', ({ nodeIds, handle, scale, angleRad }) => {
  console.log('组调整中:', nodeIds);
  console.log('缩放比例:', scale);
});
```

**Payload:**
```typescript
{
  nodeIds: string[];
  handle: HandleType;
  scale: { sx: number; sy: number };  // x/y 方向缩放比例
  angleRad: number;
}
```

### `group:resize-end`

结束组调整大小时触发。

```typescript
engine.events.on('group:resize-end', ({ nodeIds, updates, handle }) => {
  console.log('结束组调整:', nodeIds);
  console.log('变更列表:', updates);
});
```

**Payload:**
```typescript
{
  nodeIds: string[];
  updates: Array<any>;  // 变更详情
  handle: HandleType;
}
```

### `group:rotate-start`

开始旋转多选节点组时触发。

```typescript
engine.events.on('group:rotate-start', ({ nodeIds, center, angleRad }) => {
  console.log('开始组旋转:', nodeIds);
  console.log('旋转中心:', center);
});
```

**Payload:**
```typescript
{
  nodeIds: string[];
  center: { x: number; y: number };
  angleRad: number;   // 初始角度（弧度）
}
```

### `group:rotate-move`

组旋转过程中持续触发。

```typescript
engine.events.on('group:rotate-move', ({ nodeIds, deltaRad, center }) => {
  console.log('组旋转中:', nodeIds);
  console.log('角度变化:', deltaRad);
});
```

**Payload:**
```typescript
{
  nodeIds: string[];
  deltaRad: number;   // 角度变化量（弧度）
  center: { x: number; y: number };
}
```

### `group:rotate-end`

结束组旋转时触发。

```typescript
engine.events.on('group:rotate-end', ({ nodeIds, updates }) => {
  console.log('结束组旋转:', nodeIds);
  console.log('变更列表:', updates);
});
```

**Payload:**
```typescript
{
  nodeIds: string[];
  updates: Array<any>;  // 变更详情
}
```

## 框选事件

### `canvas:box-select-start`

开始框选时触发。

```typescript
engine.events.on('canvas:box-select-start', ({ start, additive }) => {
  console.log('开始框选:', start);
  console.log('叠加模式:', additive);
});
```

**Payload:**
```typescript
{
  start: { x: number; y: number };  // 起始点
  additive: boolean;                 // 是否叠加选择（Shift 键）
}
```

### `canvas:box-select-change`

框选范围改变时持续触发。

```typescript
engine.events.on('canvas:box-select-change', ({ start, current, rect, additive }) => {
  console.log('框选范围:', rect);
});
```

**Payload:**
```typescript
{
  start: { x: number; y: number };     // 起始点
  current: { x: number; y: number };   // 当前点
  rect: { x: number; y: number; width: number; height: number };  // 框选矩形
  additive: boolean;
}
```

### `canvas:box-select-end`

结束框选时触发。

```typescript
engine.events.on('canvas:box-select-end', ({ start, end, rect, additive, canceled, selected }) => {
  console.log('结束框选');
  console.log('选中节点:', selected);
  console.log('是否取消:', canceled);
});
```

**Payload:**
```typescript
{
  start: { x: number; y: number };
  end: { x: number; y: number };
  rect: { x: number; y: number; width: number; height: number };
  additive: boolean;
  canceled: boolean;     // 是否是微小拖动（点击）
  selected: string[];    // 选中的节点 ID 列表
}
```

## 自定义事件

### 定义事件类型

```typescript
// 扩展事件类型
declare module '@agilejs/core' {
  interface EngineEvents {
    'custom:event': { data: string };
    'validation:failed': { nodeId: string; errors: string[] };
  }
}

// 触发自定义事件
engine.events.emit('custom:event', { data: 'Hello' });

// 监听自定义事件
engine.events.on('custom:event', ({ data }) => {
  console.log('Custom event:', data);
});
```

### 事件命名规范

建议使用命名空间，如：`namespace:action`。

```typescript
// 功能命名空间
engine.events.emit('selection:changed', { ... });
engine.events.emit('selection:cleared', { ... });

// 插件命名空间
engine.events.emit('plugin:enabled', { pluginId: 'pan-zoom' });
engine.events.emit('plugin:disabled', { pluginId: 'drag' });

// 业务命名空间
engine.events.emit('workflow:started', { workflowId: '123' });
engine.events.emit('workflow:completed', { workflowId: '123' });
```

## 实战示例

### 1. 数据同步

将图形数据同步到服务器：

```typescript
// 防抖保存
let saveTimer: number | null = null;

engine.events.on('graph:change', () => {
  if (saveTimer) clearTimeout(saveTimer);
  
  saveTimer = setTimeout(() => {
    const data = {
      nodes: engine.graph.getNodes(),
      edges: engine.graph.getEdges()
    };
    
    fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }, 1000);
});
```

### 2. 状态管理集成

与 Redux 集成：

```typescript
import { store } from './store';

// 监听图形变化，更新 Redux
engine.events.on('graph:change', ({ reason }) => {
  store.dispatch({
    type: 'GRAPH_CHANGED',
    payload: {
      nodes: engine.graph.getNodes(),
      edges: engine.graph.getEdges(),
      reason
    }
  });
});

// 监听选择变化
engine.events.on('graph:selection-change', ({ nodes, edges }) => {
  store.dispatch({
    type: 'SELECTION_CHANGED',
    payload: { nodes, edges }
  });
});
```

### 3. 撤销/重做 UI

使用 CommandHistory 的 onChange 更新按钮状态：

```typescript
function updateUndoRedoButtons() {
  const canUndo = engine.history.canUndo();
  const canRedo = engine.history.canRedo();
  
  undoButton.disabled = !canUndo;
  redoButton.disabled = !canRedo;
}

// 监听历史变化
const unsubscribe = engine.history.onChange(updateUndoRedoButtons);

// 初始化
updateUndoRedoButtons();

// 清理
// unsubscribe();
```

### 4. 性能监控

监控渲染性能：

```typescript
let frameCount = 0;
let lastTime = performance.now();

engine.events.on('engine:tick', ({ time }) => {
  frameCount++;
  
  const elapsed = time - lastTime;
  
  if (elapsed >= 1000) {
    const fps = (frameCount * 1000) / elapsed;
    console.log(`FPS: ${fps.toFixed(1)}`);
    
    if (fps < 30) {
      console.warn('Low FPS detected!');
    }
    
    frameCount = 0;
    lastTime = time;
  }
});
```

### 5. 拖拽交互监听

监听拖拽过程：

```typescript
let dragStartTime = 0;

engine.events.on('node:drag-start', ({ nodeId, selectedNodeIds }) => {
  dragStartTime = Date.now();
  console.log(`开始拖拽 ${selectedNodeIds.length} 个节点`);
});

engine.events.on('node:drag-move', ({ nodeIds, delta }) => {
  // 可以在这里实现自定义的拖拽效果
  console.log(`拖拽位移: (${delta.x}, ${delta.y})`);
});

engine.events.on('node:drag-end', ({ nodeIds, hasMoved }) => {
  const dragDuration = Date.now() - dragStartTime;
  console.log(`拖拽耗时: ${dragDuration}ms`);
  
  if (!hasMoved) {
    console.log('这是一次点击，没有实际移动');
  }
});
```

### 6. 框选监听

实时显示框选范围：

```typescript
const selectionOverlay = document.getElementById('selection-overlay');

engine.events.on('canvas:box-select-start', () => {
  selectionOverlay.style.display = 'block';
});

engine.events.on('canvas:box-select-change', ({ rect }) => {
  selectionOverlay.style.left = `${rect.x}px`;
  selectionOverlay.style.top = `${rect.y}px`;
  selectionOverlay.style.width = `${rect.width}px`;
  selectionOverlay.style.height = `${rect.height}px`;
});

engine.events.on('canvas:box-select-end', ({ selected, canceled }) => {
  selectionOverlay.style.display = 'none';
  
  if (!canceled) {
    console.log(`框选了 ${selected.length} 个节点`);
  }
});
```

### 7. 节点大小调整监听

跟踪节点尺寸变化：

```typescript
const sizeMap = new Map<string, { width: number; height: number }>();

engine.events.on('node:resize-start', ({ nodeId, startSize }) => {
  sizeMap.set(nodeId, startSize);
});

engine.events.on('node:resize-end', ({ nodeId, size }) => {
  const startSize = sizeMap.get(nodeId);
  if (startSize) {
    const widthChange = size.width - startSize.width;
    const heightChange = size.height - startSize.height;
    console.log(`节点 ${nodeId} 尺寸变化: 宽 ${widthChange}, 高 ${heightChange}`);
    sizeMap.delete(nodeId);
  }
});
```

## 移动端支持

所有拖拽、调整大小、旋转相关的事件都支持触摸操作：

```typescript
// 相同的事件，鼠标和触摸都会触发
engine.events.on('node:drag-start', ({ nodeId }) => {
  console.log('拖拽开始（鼠标或触摸）');
});

engine.events.on('node:resize-start', ({ nodeId }) => {
  console.log('调整大小开始（鼠标或触摸）');
});

// 可以通过检测事件来源区分鼠标和触摸
// 但通常不需要区分，因为行为是一致的
```

## 事件注意事项

### 1. 性能考虑

频繁触发的事件（如 `engine:tick`、`node:drag-move`、`node:resize-move`）需要注意性能：

```typescript
// ❌ 不好：每帧都执行复杂计算
engine.events.on('engine:tick', () => {
  performExpensiveCalculation();  // 会导致卡顿
});

// ✅ 好：使用节流或只在需要时处理
let lastUpdate = 0;
engine.events.on('engine:tick', ({ time }) => {
  if (time - lastUpdate > 100) {  // 每 100ms 更新一次
    performExpensiveCalculation();
    lastUpdate = time;
  }
});
```

### 2. 内存泄漏

记得取消不再需要的事件监听：

```typescript
// 监听事件时保存取消函数
const unsubscribe = engine.events.on('graph:change', handler);

// 组件卸载时取消监听
onUnmount(() => {
  unsubscribe();
});

// 或使用 off 方法
engine.events.off('graph:change', handler);
```

### 3. 事件顺序

某些操作会按顺序触发多个事件：

```typescript
// 拖拽节点的事件顺序：
// 1. node:drag-start (开始拖拽)
// 2. node:drag-move (移动中，可能触发多次)
// 3. node:drag-end (结束拖拽)
// 4. graph:change (如果有实际移动)

// 框选的事件顺序：
// 1. canvas:box-select-start (开始框选)
// 2. canvas:box-select-change (范围改变，可能触发多次)
// 3. canvas:box-select-end (结束框选)
// 4. graph:selection-change (如果选择发生变化)
// 5. graph:change (reason='box-select')

// 调整节点大小的事件顺序：
// 1. node:resize-start (开始调整)
// 2. node:resize-move (调整中，可能触发多次)
// 3. node:resize-end (结束调整)
```

### 4. 条件触发

某些事件只在特定条件下触发：

```typescript
// node:drag-end 的 hasMoved 属性
engine.events.on('node:drag-end', ({ hasMoved }) => {
  if (hasMoved) {
    // 实际发生了移动，可能需要保存
  } else {
    // 只是点击，没有移动
  }
});

// canvas:box-select-end 的 canceled 属性
engine.events.on('canvas:box-select-end', ({ canceled, selected }) => {
  if (canceled) {
    // 微小拖动被视为点击，不是框选
  } else {
    // 正常框选，selected 包含选中的节点
  }
});
```

## 最佳实践

### 1. 使用类型安全

```typescript
import type { EngineEvents } from '@agilejs/core';

function handleGraphChanged(payload: EngineEvents['graph:change']): void {
  console.log(payload.reason);
}

engine.events.on('graph:change', handleGraphChanged);
```

### 2. 清理事件监听器

```typescript
class MyComponent {
  private unsubscribers: Array<() => void> = [];
  
  mount() {
    // on() 方法返回取消订阅函数
    const unsubscribe = engine.events.on('graph:change', ({ reason }) => {
      console.log(reason);
    });
    
    this.unsubscribers.push(unsubscribe);
  }
  
  unmount() {
    // 取消所有订阅
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
  }
}
```

### 3. 避免内存泄漏

```typescript
// ❌ 不好：匿名函数无法手动取消监听
engine.events.on('graph:change', () => {
  console.log('Changed');
});

// ✅ 好：使用 on() 返回的取消函数
const unsubscribe = engine.events.on('graph:change', () => {
  console.log('Changed');
});

// 组件销毁时
unsubscribe();

// 或者使用命名函数 + off
const handler = () => console.log('Changed');
engine.events.on('graph:change', handler);
// 稍后
engine.events.off('graph:change', handler);
```

### 4. 事件聚合

避免频繁触发导致的性能问题：

```typescript
let pending = false;

engine.events.on('graph:change', () => {
  if (pending) return;
  
  pending = true;
  requestAnimationFrame(() => {
    // 处理变化
    updateUI();
    pending = false;
  });
});
```

### 5. 防抖处理

对于高频事件使用防抖：

```typescript
let debounceTimer: number | null = null;

engine.events.on('node:drag-move', ({ nodeIds, delta }) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  
  debounceTimer = setTimeout(() => {
    // 延迟处理
    console.log('拖拽稳定后处理');
  }, 100);
});
```

## 调试技巧

### 1. 事件日志

监控特定事件的触发：

```typescript
const logEvent = (eventName: string) => {
  return engine.events.on(eventName as any, (payload) => {
    console.log(`[${eventName}]`, payload);
  });
};

// 监控多个事件
const unsubscribers = [
  logEvent('node:drag-start'),
  logEvent('node:drag-move'),
  logEvent('node:drag-end'),
  logEvent('graph:change'),
];

// 停止监控
unsubscribers.forEach(fn => fn());
```

### 2. 事件计数器

统计事件触发次数：

```typescript
const eventCounts = new Map<string, number>();

function trackEvent(eventName: string) {
  return engine.events.on(eventName as any, () => {
    const count = (eventCounts.get(eventName) || 0) + 1;
    eventCounts.set(eventName, count);
    console.log(`${eventName}: ${count} times`);
  });
}

// 追踪多个事件
trackEvent('engine:tick');
trackEvent('graph:change');
trackEvent('node:drag-move');
```

### 3. 性能分析

测量事件处理器执行时间：

```typescript
function measureEventHandler<T>(
  eventName: string,
  handler: (payload: T) => void
) {
  return engine.events.on(eventName as any, (payload: T) => {
    const start = performance.now();
    handler(payload);
    const end = performance.now();
    console.log(`${eventName} handler took ${(end - start).toFixed(2)}ms`);
  });
}

// 使用
measureEventHandler('graph:change', ({ reason }) => {
  // 你的处理逻辑
  console.log('处理 graph:change:', reason);
});
```
