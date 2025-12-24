---
sidebar_position: 10
---

# 工具函数与最佳实践

## 工具函数

:::info

引擎内置了一些常用工具函数，位于 `@agilejs/core/src/utils` 目录下。

:::

### 坐标转换

#### toWorld()
将屏幕坐标转换为世界坐标。

```typescript
const worldPos = engine.toWorld({ x: clientX, y: clientY });
console.log(worldPos);  // { x: number, y: number }
```

**使用场景：**
- 处理鼠标/触摸事件
- 在屏幕位置创建节点

**示例：**
```typescript
canvas.addEventListener('click', (e) => {
  const worldPos = engine.toWorld({ x: e.clientX, y: e.clientY });
  
  engine.graph.addNode({
    id: `node-${Date.now()}`,
    shape: 'rect',
    position: worldPos,
    size: { width: 100, height: 60 }
  });
});
```

#### toScreen()
将世界坐标转换为屏幕坐标。

```typescript
const screenPos = engine.toScreen({ x: node.position.x, y: node.position.y });
console.log(screenPos);  // { x: number, y: number }
```

**使用场景：**
- 在屏幕上定位 DOM 元素
- 自定义 overlay 显示

**示例：**
```typescript
function showTooltip(node: NodeData) {
  const screenPos = engine.toScreen({
    x: node.position.x + node.size.width / 2,
    y: node.position.y
  });
  
  tooltip.style.left = `${screenPos.x}px`;
  tooltip.style.top = `${screenPos.y - 40}px`;
  tooltip.textContent = node.data.label;
}
```

### 几何计算

:::info

引擎内置了 `pointInRect` 和 `hitTestNode` 等碰撞检测工具（位于 `@agilejs/core/src/utils/hittest`），其他方法为扩展示例。

:::

#### pointInRect()
检查点是否在矩形内。

```typescript
import { pointInRect } from '@agilejs/core/src/utils/hittest';

const isInside = pointInRect(
  { x: 150, y: 150 },
  100, 100, 100, 100  // x, y, width, height
);
```

#### hitTestNode()
检测点是否命中节点（支持旋转、line 节点等复杂情况）。

```typescript
import { hitTestNode } from '@agilejs/core/src/utils/hittest';

const worldPoint = engine.toWorld({ x: e.clientX, y: e.clientY });
const node = engine.graph.getNodes().find(n => 
  hitTestNode(worldPoint, n, { 
    scale: engine.getScale(),
    pixelThresholdPx: 10 
  })
);
```

#### ⚠️ getBounds() - <span style={{ color: 'red' }}>需自行扩展</span>
计算节点集合的边界框。

```typescript
function getBounds(nodes: NodeData[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  nodes.forEach(node => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + node.size.width);
    maxY = Math.max(maxY, node.position.y + node.size.height);
  });
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// 使用
const nodes = engine.graph.getNodes();
const bounds = getBounds(nodes);
console.log(`Width: ${bounds.width}, Height: ${bounds.height}`);
```

#### ⚠️ rectsIntersect() - <span style={{ color: 'red' }}>需自行扩展</span>
检查两个矩形是否相交。

```typescript
function rectsIntersect(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

// 使用：框选检测
const selectedNodes = engine.graph.getNodes().filter(node =>
  rectsIntersect(
    { x: node.position.x, y: node.position.y, ...node.size },
    selectionBox
  )
);
```

#### ⚠️ distance() - <span style={{ color: 'red' }}>需自行扩展</span>
计算两点距离。

```typescript
function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// 使用：吸附检测
const dist = distance(dragPos, targetPos);
if (dist < SNAP_THRESHOLD) {
  // 吸附到目标位置
  return targetPos;
}
```

### 空间索引

:::info

引擎内置了 `Quadtree` 类（位于 `@agilejs/core/src/utils/quadtree`），用于大规模节点的空间查询优化。

:::

#### Quadtree
四叉树空间索引，用于高效的空间查询。

```typescript
import { Quadtree, buildQuadtreeFromNodes } from '@agilejs/core/src/utils/quadtree';

// 从节点构建四叉树
const qt = buildQuadtreeFromNodes(engine.graph.getNodes(), {
  maxItems: 16,    // 每个节点最多存储项数
  maxDepth: 8,     // 最大深度
  padding: 32      // 边界填充
});

// 查询区域内的节点
const results = qt.query({
  x: 100, y: 100,
  width: 200, height: 200
});

console.log(`找到 ${results.length} 个节点`);
```

**使用场景：**
- 大规模图形（>1000 节点）的框选
- 视口裁剪渲染
- 碰撞检测优化

### 端口与连线

:::info

引擎内置了端口和连线相关工具（位于 `@agilejs/core/src/utils/ports`、`orthogonal`、`edgeLabel`）。

:::

#### getPortWorldPosition()
获取端口的世界坐标（含旋转）。

```typescript
import { getPortWorldPosition } from '@agilejs/core/src/utils/ports';

const node = engine.graph.getNode('node-1');
const portPos = getPortWorldPosition(node, 'port-right');

if (portPos) {
  console.log(`端口世界坐标: (${portPos.x}, ${portPos.y})`);
}
```

#### buildOrthogonalPathPoints()
构建正交边的折点序列。

```typescript
import { buildOrthogonalPathPoints } from '@agilejs/core/src/utils/orthogonal';

const edge = engine.graph.getEdge('edge-1');
const points = buildOrthogonalPathPoints(edge, engine.graph);

// points 包含所有折点，用于渲染正交边
```

#### edgeLabelPosition*()
计算边标签的位置。

```typescript
import { 
  edgeLabelPositionStraight,
  edgeLabelPositionOrthogonal,
  edgeLabelPositionBezier 
} from '@agilejs/core/src/utils/edgeLabel';

const edge = engine.graph.getEdge('edge-1');
const labelPos = edgeLabelPositionOrthogonal(edge, engine.graph);

if (labelPos) {
  // 在 labelPos 位置渲染标签
}
```

### 边渲染

:::info

引擎内置了边渲染相关的通用工具（位于 `@agilejs/core/src/utils/edgeDraw`），用于处理复杂的连线样式（如管道、流动效果、箭头等）。

:::

#### getEdgeStyle()
归一化边样式配置，解析 Pipeline、Flow 等高级样式。

```typescript
import { getEdgeStyle } from '@agilejs/core/src/utils/edgeDraw';

const style = getEdgeStyle(edge, engine.graph);
// style 包含归一化后的 stroke, lineWidth, pipeline, flow 等配置
```

#### drawEdgePath()
绘制路径，支持普通、Pipeline、Flow 模式。

```typescript
import { drawEdgePath } from '@agilejs/core/src/utils/edgeDraw';

// 在 canvas 上绘制
drawEdgePath(ctx, path2D, style);
```

#### drawArrow()
绘制箭头（实心/空心）。

```typescript
import { drawArrow } from '@agilejs/core/src/utils/edgeDraw';

drawArrow(ctx, tipPoint, angle, 'solid', 8, '#333', 2);
```

#### buildRoundedPath()
构建带圆角的路径。

```typescript
import { buildRoundedPath } from '@agilejs/core/src/utils/edgeDraw';

const path = buildRoundedPath(points, 5); // 半径为 5 的圆角
```

#### 辅助计算

```typescript
import { getNodeStrokeGap, getGapPoints } from '@agilejs/core/src/utils/edgeDraw';

// 计算节点描边带来的间隙（用于端点缩进）
const gap = getNodeStrokeGap(engine.graph, 'node-1');

// 计算修正后的端点
const newPoint = getGapPoints(p1, p2, gap);
```

### 事件处理

:::info

引擎内置了 `PointerEventAdapter`（位于 `@agilejs/core/src/utils/pointer`），用于统一处理鼠标和触摸事件。

:::

#### PointerEventAdapter
统一的指针事件适配器，支持鼠标和触摸。

```typescript
import { PointerEventAdapter } from '@agilejs/core/src/utils/pointer';

canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('touchstart', handlePointerDown);

function handlePointerDown(e: MouseEvent | TouchEvent) {
  const pointer = PointerEventAdapter.normalize(e);
  if (!pointer) return;
  
  const worldPos = engine.toWorld({
    x: pointer.clientX,
    y: pointer.clientY
  });
  
  // 统一处理鼠标和触摸事件
  console.log('Pointer at:', worldPos);
}
```

### 数据处理

:::info

引擎提供了选择相关的工具函数（`selectOnly`, `selectAdd`, `selectNone`），位于 `@agilejs/core/src/utils/selection`。图算法相关的方法为扩展示例。

:::

#### selectOnly() / selectAdd() / selectNone()
选择相关工具函数。

```typescript
import { selectOnly, selectAdd, selectNone } from '@agilejs/core/src/utils/selection';

// 仅选中指定节点（清除其他选择）
selectOnly(engine.graph, ['node-1', 'node-2']);

// 添加选择（保留已有选择）
selectAdd(engine.graph, ['node-3']);

// 清除所有选择
selectNone(engine.graph);
```

#### ⚠️ findPath() - <span style={{ color: 'red' }}>需自行扩展</span>
查找两节点间的路径（BFS）。

```typescript
function findPath(
  graph: Graph,
  startId: string,
  endId: string
): string[] | null {
  const visited = new Set<string>();
  const queue: Array<{ id: string; path: string[] }> = [
    { id: startId, path: [startId] }
  ];
  
  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    
    if (id === endId) {
      return path;
    }
    
    if (visited.has(id)) continue;
    visited.add(id);
    
    const edges = graph.connectedEdges(id);
    edges.forEach(edge => {
      if (edge.source === id) {
        queue.push({
          id: edge.target,
          path: [...path, edge.target]
        });
      }
    });
  }
  
  return null;
}

// 使用
const path = findPath(engine.graph, 'node-1', 'node-5');
if (path) {
  console.log('Path found:', path.join(' -> '));
}
```

#### hasCycle()
检测图中是否有环。

```typescript
function hasCycle(graph: Graph): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  
  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);
    
    const edges = graph.connectedEdges(nodeId);
    for (const edge of edges) {
      if (edge.source !== nodeId) continue;
      
      const target = edge.target;
      if (!visited.has(target)) {
        if (dfs(target)) return true;
      } else if (recStack.has(target)) {
        return true;
      }
    }
    
    recStack.delete(nodeId);
    return false;
  }
  
  for (const node of graph.getNodes()) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }
  
  return false;
}

// 使用
if (hasCycle(engine.graph)) {
  console.warn('Cycle detected in graph!');
}
```

#### ⚠️ topologicalSort() - <span style={{ color: 'red' }}>需自行扩展</span>
拓扑排序。

```typescript
function topologicalSort(graph: Graph): string[] | null {
  const inDegree = new Map<string, number>();
  const nodes = graph.getNodes();
  
  // 计算入度
  nodes.forEach(node => inDegree.set(node.id, 0));
  
  graph.getEdges().forEach(edge => {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });
  
  // 找出所有入度为 0 的节点
  const queue = nodes
    .filter(node => inDegree.get(node.id) === 0)
    .map(node => node.id);
  
  const result: string[] = [];
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);
    
    const edges = graph.connectedEdges(nodeId);
    edges.forEach(edge => {
      if (edge.source !== nodeId) return;
      
      const target = edge.target;
      inDegree.set(target, inDegree.get(target)! - 1);
      
      if (inDegree.get(target) === 0) {
        queue.push(target);
      }
    });
  }
  
  // 如果有环，无法完成拓扑排序
  if (result.length !== nodes.length) {
    return null;
  }
  
  return result;
}

// 使用
const sorted = topologicalSort(engine.graph);
if (sorted) {
  console.log('Topological order:', sorted);
} else {
  console.log('Cannot sort: graph has cycles');
}
```

### 序列化

#### toScene() / fromScene()
引擎提供了内置的序列化方法。

```typescript
import { toScene, fromScene } from '@agilejs/core';

// 序列化：将图形数据转换为 JSON
const sceneData = toScene(engine.graph);
const json = JSON.stringify(sceneData);
localStorage.setItem('graph-data', json);

// 反序列化：从 JSON 加载图形数据
const json = localStorage.getItem('graph-data');
if (json) {
  const sceneData = JSON.parse(json);
  fromScene(engine.graph, sceneData);
}
```

**SceneData 接口：**
```typescript
interface SceneData {
  nodes: NodeData[];
  edges: EdgeData[];
}
```

#### 自定义序列化

如需包含版本号、时间戳等元数据，可以自定义序列化逻辑：

```typescript
function serializeWithMetadata(graph: Graph) {
  return {
    version: '1.0.0',
    timestamp: Date.now(),
    data: toScene(graph)
  };
}

function deserializeWithMetadata(json: any, graph: Graph) {
  if (json.version !== '1.0.0') {
    throw new Error('Unsupported version');
  }
  fromScene(graph, json.data);
}
```

## 最佳实践

### 1. 性能优化

#### 使用虚拟化

对于大量节点，只渲染可见区域：

```typescript
function getVisibleNodes(graph: Graph, viewport: Viewport): NodeData[] {
  const { scale, translateX, translateY } = viewport;
  const canvasWidth = engine.canvas.width;
  const canvasHeight = engine.canvas.height;
  
  const viewportBounds = {
    minX: -translateX / scale,
    minY: -translateY / scale,
    maxX: (canvasWidth - translateX) / scale,
    maxY: (canvasHeight - translateY) / scale
  };
  
  return graph.getNodes().filter(node => {
    return !(
      node.position.x + node.size.width < viewportBounds.minX ||
      node.position.x > viewportBounds.maxX ||
      node.position.y + node.size.height < viewportBounds.minY ||
      node.position.y > viewportBounds.maxY
    );
  });
}
```

#### 批量更新

使用事务（transactions）减少重绘：

```typescript
// ❌ 不好：多次单独更新
nodes.forEach(node => {
  engine.graph.updateNode(node.id, { position: newPos });
});

// ✅ 好：使用事务批量更新
engine.history.beginTransaction();
nodes.forEach(node => {
  engine.graph.updateNode(node.id, { position: newPos });
});
engine.history.endTransaction();

// 或使用 MoveNodeCommand
import { MoveNodeCommand } from '@agilejs/core';

engine.history.beginTransaction();
nodes.forEach(node => {
  engine.history.do(
    new MoveNodeCommand(engine.graph, node.id, newPos)
  );
});
engine.history.endTransaction();
```

#### 节流和防抖

```typescript
import { throttle, debounce } from 'lodash-es';

// 节流：限制执行频率
const throttledSave = throttle(() => {
  saveToServer();
}, 1000);

engine.events.on('graph:change', throttledSave);

// 防抖：等待操作完成后执行
const debouncedValidate = debounce(() => {
  validateGraph();
}, 500);

engine.events.on('nodeUpdated', debouncedValidate);
```

### 2. 错误处理

#### 数据验证

```typescript
function validateNode(node: Partial<NodeData>): node is NodeData {
  if (!node.id || typeof node.id !== 'string') {
    console.error('Invalid node id:', node);
    return false;
  }
  
  if (!node.shape || typeof node.shape !== 'string') {
    console.error('Invalid node shape:', node);
    return false;
  }
  
  if (!node.position || typeof node.position.x !== 'number') {
    console.error('Invalid node position:', node);
    return false;
  }
  
  if (!node.size || typeof node.size.width !== 'number') {
    console.error('Invalid node size:', node);
    return false;
  }
  
  return true;
}

// 使用
function addNode(node: Partial<NodeData>) {
  if (!validateNode(node)) {
    throw new Error('Invalid node data');
  }
  
  engine.graph.addNode(node);
}
```

#### 异常捕获

```typescript
try {
  engine.graph.addNode(node);
} catch (error) {
  console.error('Failed to add node:', error);
  
  // 显示错误提示
  showNotification('Failed to add node', 'error');
  
  // 记录错误日志
  logError(error);
}
```

### 3. 内存管理

#### 清理资源

```typescript
class EngineManager {
  private engine: CanvasEngine | null = null;
  
  init(container: HTMLElement) {
    this.engine = new CanvasEngine({ container });
    this.engine.start();
  }
  
  destroy() {
    if (this.engine) {
      // 清理事件监听器
      this.engine.events.off('graph:change', this.handleGraphChanged);
      
      // 销毁引擎
      this.engine.destroy();
      this.engine = null;
    }
  }
  
  private handleGraphChanged = () => {
    // ...
  };
}
```

#### 避免内存泄漏

```typescript
// ❌ 不好：闭包引用导致内存泄漏
engine.events.on('engine:tick', () => {
  const largeData = fetchLargeData();
  console.log(largeData);
});

// ✅ 好：及时清理
const handler = () => {
  const largeData = fetchLargeData();
  console.log(largeData);
};

engine.events.on('engine:tick', handler);

// 组件销毁时
engine.events.off('engine:tick', handler);
```

### 4. 代码组织

#### 使用插件扩展功能

```typescript
class CustomPlugin implements Plugin {
  id = 'custom-plugin';
  
  onAttach(engine: CanvasEngine): void {
    // 初始化插件
  }
  
  onDetach(): void {
    // 清理资源
  }
}

// 使用
engine.plugins.use(new CustomPlugin());
```

#### 封装通用操作

```typescript
import { MoveNodeCommand } from '@agilejs/core';

class GraphOperations {
  constructor(private engine: CanvasEngine) {}
  
  alignLeft(nodeIds: string[]): void {
    const nodes = nodeIds
      .map(id => this.engine.graph.getNode(id))
      .filter(Boolean) as NodeData[];
    
    if (nodes.length === 0) return;
    
    const minX = Math.min(...nodes.map(n => n.position.x));
    
    this.engine.history.beginTransaction();
    nodes.forEach(node => {
      this.engine.history.do(
        new MoveNodeCommand(
          this.engine.graph,
          node.id,
          { x: minX, y: node.position.y }
        )
      );
    });
    this.engine.history.endTransaction();
  }
  
  distributeHorizontally(nodeIds: string[]): void {
    // 实现水平分布逻辑
  }
}

// 使用
const ops = new GraphOperations(engine);
ops.alignLeft(['node-1', 'node-2', 'node-3']);
```

### 5. 测试

#### 单元测试

```typescript
import { describe, it, expect } from 'vitest';

describe('Graph', () => {
  it('should add node', () => {
    const graph = new Graph();
    const node: NodeData = {
      id: 'node-1',
      shape: 'rect',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 60 }
    };
    
    graph.addNode(node);
    
    expect(graph.getNode('node-1')).toEqual(node);
  });
  
  it('should remove node and connected edges', () => {
    const graph = new Graph();
    
    graph.addNode({ id: 'node-1', /* ... */ });
    graph.addNode({ id: 'node-2', /* ... */ });
    graph.addEdge({
      id: 'edge-1',
      shape: 'line',
      source: 'node-1',
      target: 'node-2'
    });
    
    graph.removeNode('node-1');
    
    expect(graph.getNode('node-1')).toBeUndefined();
    expect(graph.getEdge('edge-1')).toBeUndefined();
  });
});
```

### 6. TypeScript 最佳实践

#### 使用类型保护

```typescript
function isNodeData(data: any): data is NodeData {
  return (
    data &&
    typeof data.id === 'string' &&
    typeof data.shape === 'string' &&
    data.position &&
    typeof data.position.x === 'number' &&
    typeof data.position.y === 'number'
  );
}

// 使用
if (isNodeData(data)) {
  engine.graph.addNode(data);
}
```

#### 使用泛型

```typescript
function filterByData<T extends keyof NodeData['data']>(
  nodes: NodeData[],
  key: T,
  value: any
): NodeData[] {
  return nodes.filter(node => node.data?.[key] === value);
}

// 使用
const redNodes = filterByData(nodes, 'color', 'red');
```

## 调试技巧

### 1. 可视化调试

```typescript
// 绘制节点 ID
function drawDebugInfo(ctx: CanvasRenderingContext2D, node: NodeData) {
  ctx.save();
  
  ctx.font = '10px monospace';
  ctx.fillStyle = 'red';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  ctx.fillText(
    node.id,
    node.position.x + node.size.width / 2,
    node.position.y - 15
  );
  
  ctx.restore();
}
```

### 2. 性能分析

```typescript
console.time('render');
engine.render();
console.timeEnd('render');

// 或使用 Performance API
const start = performance.now();
engine.render();
const end = performance.now();
console.log(`Render time: ${end - start}ms`);
```

### 3. 状态快照

```typescript
function captureState() {
  const translation = engine.getTranslation();
  return {
    nodes: engine.graph.getNodes().map(n => ({ ...n })),
    edges: engine.graph.getEdges().map(e => ({ ...e })),
    scale: engine.getScale(),
    translation,
    theme: engine.getTheme()
  };
}

// 使用
const snapshot1 = captureState();
// 执行操作
const snapshot2 = captureState();

// 比较差异
console.log('Diff:', diffSnapshots(snapshot1, snapshot2));
```

## 常见问题

### Q: 如何提高大规模图形性能？

A: 
1. 启用性能降级模式
2. 使用空间索引（quadtree）
3. 只渲染可见区域
4. 使用 LOD (Level of Detail)

### Q: 如何实现撤销/重做？

A: 使用命令模式，所有操作通过 `CommandHistory` 执行。

### Q: 如何自定义节点样式？

A: 创建自定义渲染器，实现 `ShapeRenderer` 接口。

### Q: 如何实现数据持久化？

A: 监听 `graph:change` 事件，将数据保存到 localStorage 或服务器。

### Q: 如何集成到 React？

A: 使用 `useEffect` 初始化引擎，在 cleanup 函数中销毁。详见 [React 集成](#react-集成)。

## React 集成

```typescript
import { useEffect, useRef } from 'react';
import { CanvasEngine } from '@agilejs/core';

function GraphEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // 初始化引擎
    const engine = new CanvasEngine({
      container: containerRef.current
    });
    
    engine.start();
    engineRef.current = engine;
    
    // 清理函数
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);
  
  return <div ref={containerRef} style={{ width: '100%', height: '600px' }} />;
}
```

## Vue 集成

```vue
<template>
  <div ref="containerRef" style="width: 100%; height: 600px"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { CanvasEngine } from '@agilejs/core';

const containerRef = ref<HTMLElement | null>(null);
let engine: CanvasEngine | null = null;

onMounted(() => {
  if (!containerRef.value) return;
  
  engine = new CanvasEngine({
    container: containerRef.value
  });
  
  engine.start();
});

onUnmounted(() => {
  engine?.destroy();
  engine = null;
});
</script>
```
