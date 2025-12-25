---
sidebar_position: 4
---

# 边

## 边数据结构

### 基础接口

```typescript
interface EdgeData {
  id: string;                    // 唯一标识
  shape: string;                 // 形状类型（line、bezier、orthogonal、polyline）
  source: string;                // 源节点ID
  target: string;                // 目标节点ID
  sourcePortId?: string;         // 源锚点ID（可选）
  targetPortId?: string;         // 目标锚点ID（可选）
  points?: Point[];              // 控制点（用于 polyline）
  selected?: boolean;            // 是否选中（默认 false）
  visible?: boolean;             // 是否可见（默认 true）
  selectable?: boolean;          // 是否可选中（默认 true）
  zIndex?: number;               // 层级（默认 0）
  data?: EdgeCustomData;         // 自定义数据
}

interface EdgeCustomData {
  label?: string;                // 边标签文本
  style?: {                      // 样式配置
    stroke?: string;             // 描边色
    lineWidth?: number;          // 线宽
    lineDash?: number[];         // 虚线样式（用于基础边线，如 [5, 5]）
    alpha?: number;              // 整体透明度
    sourceArrowType?: 'solid' | 'hollow' | 'none';  // 源端箭头类型
    targetArrowType?: 'solid' | 'hollow' | 'none';  // 目标端箭头类型
    arrowSize?: number;          // 箭头大小
    label?: {                    // 标签样式
      color?: string;            // 文字颜色
      fontSize?: number;         // 字体大小
      background?: string;       // 背景色
      padding?: number;          // 内边距
      position?: number;         // 位置（0-1）
    };
    pipeline?: {
      outerWidth?: number;       // 外层宽度
      innerWidth?: number;       // 内层宽度
      gap?: number;              // 内外层之间的间隙
      cornerRadius?: number;     // 拐角圆角半径
      stub?: number;             // 起始或结束的延伸长度
    };
    flow?: {                     // 流动动画
      enabled?: boolean;         // 是否启用
      speed?: number;            // 流动速度
      color?: string;
      direction?: 'forward' | 'reverse';  // 流动方向
    };
    [key: string]: any;          // 其他形状特定样式
  };
  custom?: Record<string, any>;  // 完全自定义的业务数据
  [key: string]: any;            // 其他扩展字段
}

interface Point {
  x: number;
  y: number;
}
```

### 属性说明

#### EdgeData 核心属性

| 属性名 | 类型 | 默认值 | 必选 | 描述 |
|--------|------|--------|------|------|
| id | string | - | ✓ | 边唯一标识 |
| shape | string | - | ✓ | 形状类型（line、bezier、orthogonal、polyline） |
| source | string | - | ✓ | 源节点ID |
| target | string | - | ✓ | 目标节点ID |
| sourcePortId | string | - | - | 源锚点ID，不指定则连接到节点中心 |
| targetPortId | string | - | - | 目标锚点ID，不指定则连接到节点中心 |
| points | Point[] | - | - | 控制点列表（用于 polyline） |
| selected | boolean | false | - | 是否选中 |
| visible | boolean | true | - | 是否可见 |
| selectable | boolean | true | - | 是否可选中 |
| zIndex | number | 0 | - | 层级，数值越大越靠前 |
| data | EdgeCustomData | - | - | 自定义数据（样式、标签等） |

#### EdgeCustomData 扩展属性

| 属性名 | 类型 | 默认值 | 必选 | 描述 |
|--------|------|--------|------|------|
| label | string | - | - | 边标签文本 |
| style | object | - | - | 样式配置对象 |
| custom | object | - | - | 完全自定义的业务数据 |

#### style 样式属性（常用）

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| stroke | string | '#64748b' | 描边色 |
| lineWidth | number | 2 | 线宽（像素） |
| lineDash | number[] | - | 虚线样式（用于基础边线及流动动画，其中边流动和管道同时启动默认为[12, 10]） |
| alpha | number | 1 | 整体透明度（0-1） |
| sourceArrowType | string | 'none' | 源端箭头类型（solid/hollow/none） |
| targetArrowType | string | 'solid' | 目标端箭头类型（solid/hollow/none） |
| arrowSize | number | 10 | 箭头大小（像素） |
| label | LabelStyle | - | 标签样式配置（见下表） |
| flow | FlowStyle | - | 流动动画配置（见下表） |

#### label 标签样式属性

| 属性名 | 类型 | 默认值 | 必选 | 描述 |
|--------|------|--------|------|------|
| color | string | '#000000' | - | 文字颜色 |
| fontSize | number | 12 | - | 字体大小（像素） |
| background | string | '#ffffff' | - | 背景色 |
| padding | number | 4 | - | 内边距（像素） |
| position | number | 0.5 | - | 标签位置（0-1，0.5为中点） |

#### flow 流动动画配置

| 属性名 | 类型 | 默认值 | 必选 | 描述 |
|--------|------|--------|------|------|
| enabled | boolean | false | - | 是否启用流动效果 |
| speed | number | 160 | - | 流动速度px/s |
| color | string | '#3B82F6' | - | 颜色 |

## 创建边

### 基础边

```typescript
const edge = {
  "id": "edge-1",
  "shape": "line",
  "source": "node-1",
  "target": "node-2"
};

engine.graph.addEdge(edge);
```

### 带锚点的边

```typescript
const edge = {
  "id": "edge-2",
  "shape": "line",
  "source": "node-1",
  "target": "node-2",
  "sourcePortId": "port-right",
  "targetPortId": "port-left"
};

engine.graph.addEdge(edge);
```

### 带控制点的边

当前仅对折线 `polyline` 支持拐点控制。

```typescript
const edge = {
  "id": "edge-3",
  "shape": "polyline",
  "source": "node-1",
  "target": "node-2",
  "points": [
    { "x": 150, "y": 150 },
    { "x": 200, "y": 200 },
    { "x": 250, "y": 150 }
  ]
};

engine.graph.addEdge(edge);
```

## 内置边类型

Canvas 引擎内置了多种边类型，通过设置边的 `shape` 属性来指定边类型。

| 边类型 | shape 值 | 描述 | 适用场景 |
|--------|---------|------|----------|
| 直线 | line | 两点间直线连接 | 简单关系图 |
| 贝塞尔曲线 | bezier | 平滑曲线连接 | 关系图、脑图 |
| 正交线 | orthogonal | 直角折线连接 | 流程图、UML图 |
| 折线 | polyline | 多点折线连接 | 自定义路径 |

### line - 直线

最基础的边类型，源节点和目标节点之间的直线连接：

```typescript
{
  "id": "edge-1",
  "shape": "line",
  "source": "node-1",
  "target": "node-2",
  "data": {
    "style": {
      "stroke": "#64748b",
      "lineWidth": 2,
      "targetArrowType": "solid"  // 目标端箭头: 'solid' | 'hollow' | 'none'
    }
  }
}
```

### polyline - 折线

带控制点的折线连接：

```typescript
{
  "id": "edge-2",
  "shape": "polyline",
  "source": "node-1",
  "target": "node-2",
  "points": [
    { "x": 200, "y": 150 },
    { "x": 250, "y": 200 },
    { "x": 300, "y": 150 }
  ],
  "data": {
    "style": {
      "stroke": "#3b82f6",
      "lineWidth": 2,
      "targetArrowType": "solid"
    }
  }
}
```

### bezier - 贝塞尔曲线

平滑的贝塞尔曲线连接：

```typescript
{
  "id": "edge-3",
  "shape": "bezier",
  "source": "node-1",
  "target": "node-2",
  "data": {
    "style": {
      "stroke": "#10b981",
      "lineWidth": 2,
      "targetArrowType": "solid"
    }
  }
}
```

### orthogonal - 正交线

直角折线连接（常用于流程图）：

```typescript
{
  "id": "edge-4",
  "shape": "orthogonal",
  "source": "node-1",
  "target": "node-2",
  "sourcePortId": "port-right",
  "targetPortId": "port-left",
  "data": {
    "style": {
      "stroke": "#f59e0b",
      "lineWidth": 2,
      "targetArrowType": "solid"
    }
  }
}
```

## 边样式

### 基础样式

```typescript
{
  "id": "edge-1",
  "shape": "line",
  "source": "node-1",
  "target": "node-2",
  "data": {
    "style": {
      "stroke": "#3b82f6",      // 颜色
      "lineWidth": 2,           // 宽度
      "lineDash": [5, 5],       // 虚线 [实线长度, 间隙长度]
      "alpha": 0.8              // 透明度
    }
  }
}
```

### 箭头

```typescript
// 目标端实心箭头
{
  "id": "edge-1",
  "shape": "line",
  "source": "node-1",
  "target": "node-2",
  "data": {
    "style": {
      "targetArrowType": "solid",  // 目标端箭头类型
      "arrowSize": 10              // 箭头大小
    }
  }
}

// 双向箭头
{
  "data": {
    "style": {
      "sourceArrowType": "solid",  // 源端箭头
      "targetArrowType": "solid"   // 目标端箭头
    }
  }
}

// 空心箭头
{
  "data": {
    "style": {
      "targetArrowType": "hollow"  // 空心箭头
    }
  }
}

// 无箭头
{
  "data": {
    "style": {
      "sourceArrowType": "none",
      "targetArrowType": "none"
    }
  }
}
```

### 标签

```typescript
{
  "id": "edge-1",
  "shape": "line",
  "source": "node-1",
  "target": "node-2",
  "data": {
    "label": "连接",
    "style": {
      "label": {
        "position": 0.5,           // 标签位置 (0-1, 0.5为中点)
        "fontSize": 12,
        "color": "#64748b",
        "background": "#ffffff",
        "padding": 4
      }
    }
  }
}
```

### 流动效果

```typescript
{
  "id": "edge-1",
  "shape": "line",
  "source": "node-1",
  "target": "node-2",
  "data": {
    "style": {
      "flow": {
        "enabled": true,        // 启用流动效果
        "speed": 160            // 流动速度px/s
      },
      "lineDash": [5, 5]        // 需配合虚线使用，流动动画将沿此虚线样式进行
    }
  }
}
```

### 虚线样式说明

**lineDash** 用于设置虚线样式，同时适用于基础边线和流动动画：

```typescript
{
  "data": {
    "style": {
      "lineDash": [5, 5],      // 基础边线和流动动画均使用此虚线样式
      "flow": {
        "enabled": true,
        "speed": 160
      }
    }
  }
}
```

## 边操作

:::caution

目前引擎层面仅提供最基础的方法，其他便捷方式适时评估必要性扩展（如：updateEdge、removeEdges、selectEdge、deselectEdge、toggleEdgeSelection）。

:::

### 添加边

```typescript
// 单个添加
engine.graph.addEdge(edge);

// 批量添加
[edge1, edge2, edge3].forEach(edge => engine.graph.addEdge(edge));
```

### 获取边

```typescript
// 通过ID获取
const edge = engine.graph.getEdge('edge-1');

// 获取所有边
const edges = engine.graph.getEdges();

// 获取选中的边
const selected = engine.graph.getEdges().filter(e => e.selected);

// 获取连接到指定节点的边
const connectedEdges = engine.graph.connectedEdges('node-1');

// 获取从指定节点出发的边
const outgoingEdges = engine.graph.getEdges().filter(e => e.source === 'node-1');

// 获取指向指定节点的边
const incomingEdges = engine.graph.getEdges().filter(e => e.target === 'node-1');
```

### 更新边

```typescript
// 更新样式
const edge = engine.graph.getEdge('edge-1');
if (edge) {
  edge.data = {
    ...edge.data,
    style: {
      ...edge.data?.style,
      stroke: '#10b981',
      lineWidth: 3
    }
  };
  engine.graph.markDirty('style');
}

// 更新控制点
const edge = engine.graph.getEdge('edge-1');
if (edge) {
  edge.points = [
    { x: 200, y: 200 },
    { x: 300, y: 250 }
  ];
  engine.graph.markDirty('structure');
}

// 更新连接（通过命令）
import { ReconnectEdgeCommand } from '@fnt-agilejs/core';
const edge = engine.graph.getEdge('edge-1');
if (edge) {
  engine.history.execute(
    new ReconnectEdgeCommand(
      engine.graph,
      'edge-1',
      { source: edge.source, target: edge.target },
      { source: 'node-3', target: 'node-4' }
    )
  );
}
```

### 删除边

```typescript
// 删除单条边
engine.graph.removeEdge('edge-1');

// 删除多条边
['edge-1', 'edge-2'].forEach(id => engine.graph.removeEdge(id));

// 删除节点时自动删除相关边
engine.graph.removeNode('node-1');  // 自动删除连接到 node-1 的所有边
```

### 选中边

:::tip

默认情况下边选中的轮廓为红色 `#dc2626`，如果有单独设置轮廓颜色或流动颜色其将会被覆盖。

:::

```typescript
// 选中边
const edge = engine.graph.getEdge('edge-1');
if (edge) {
  edge.selected = true;
  engine.graph.markDirty('style');
}

// 取消选中
const edge = engine.graph.getEdge('edge-1');
if (edge) {
  edge.selected = false;
  engine.graph.markDirty('style');
}

// 切换选中状态
const edge = engine.graph.getEdge('edge-1');
if (edge) {
  edge.selected = !edge.selected;
  engine.graph.markDirty('style');
}

// 清除所有边的选中
engine.graph.getEdges().forEach(e => e.selected = false);
engine.graph.markDirty('style');
```

## 边路由

### 自动路由

对于 orthogonal（正交线）边，引擎会自动计算路径：

```typescript
{
  id: 'edge-1',
  shape: 'orthogonal',
  source: 'node-1',
  target: 'node-2',
  sourcePortId: 'port-right',
  targetPortId: 'port-left',
  // 路径自动计算
}
```

### 手动路由

对于 polyline 边，可以手动指定路径点：

```typescript
{
  id: 'edge-1',
  shape: 'polyline',
  source: 'node-1',
  target: 'node-2',
  points: [
    { x: 200, y: 150 },
    { x: 250, y: 200 },
    { x: 300, y: 150 }
  ]
}
```

### 动态更新路径

```typescript
// 添加控制点
const edge = engine.graph.getEdge('edge-1');
if (edge) {
  const newPoints = [
    ...(edge.points || []),
    { x: 350, y: 200 }
  ];
  edge.points = newPoints;
  engine.graph.markDirty('structure');
}

// 移除控制点
const edge = engine.graph.getEdge('edge-1');
if (edge && edge.points) {
  const updatedPoints = edge.points.filter((_, index) => index !== 1);
  edge.points = updatedPoints;
  engine.graph.markDirty('structure');
}

// 清除所有控制点
const edge = engine.graph.getEdge('edge-1');
if (edge) {
  edge.points = [];
  engine.graph.markDirty('structure');
}
```

## 高级功能

:::caution

以下功能主要基于画布引擎基础接口实现，并非完全由引擎内置。

:::

### 边的碰撞检测

```typescript
function isPointOnEdge(
  point: Point,
  edge: EdgeData,
  threshold: number = 5
): boolean {
  const source = engine.graph.getNode(edge.source);
  const target = engine.graph.getNode(edge.target);
  
  if (!source || !target) return false;
  
  // 简化：直线距离检测
  const dist = distanceToLine(
    point,
    source.position,
    target.position
  );
  
  return dist <= threshold;
}

function distanceToLine(
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) {
    return Math.sqrt(
      (point.x - lineStart.x) ** 2 + 
      (point.y - lineStart.y) ** 2
    );
  }
  
  const t = Math.max(0, Math.min(1, 
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length)
  ));
  
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  
  return Math.sqrt(
    (point.x - projX) ** 2 + 
    (point.y - projY) ** 2
  );
}
```

### 查找两节点间的边

```typescript
function findEdgesBetween(
  sourceId: string,
  targetId: string
): EdgeData[] {
  return engine.graph.getEdges().filter(edge =>
    (edge.source === sourceId && edge.target === targetId) ||
    (edge.source === targetId && edge.target === sourceId)
  );
}

// 使用
const edges = findEdgesBetween('node-1', 'node-2');
console.log(`Found ${edges.length} edges`);
```

### 获取节点的度数

```typescript
function getNodeDegree(nodeId: string): {
  in: number;
  out: number;
  total: number;
} {
  const edges = engine.graph.getEdges();
  
  let inDegree = 0;
  let outDegree = 0;
  
  edges.forEach(edge => {
    if (edge.target === nodeId) inDegree++;
    if (edge.source === nodeId) outDegree++;
  });
  
  return {
    in: inDegree,
    out: outDegree,
    total: inDegree + outDegree
  };
}

// 使用
const degree = getNodeDegree('node-1');
console.log(`入度: ${degree.in}, 出度: ${degree.out}`);
```

### 检测环路

```typescript
function hasCycle(): boolean {
  const edges = engine.graph.getEdges();
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const outgoing = edges.filter(e => e.source === nodeId);
    
    for (const edge of outgoing) {
      if (!visited.has(edge.target)) {
        if (dfs(edge.target)) return true;
      } else if (recursionStack.has(edge.target)) {
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  const nodes = engine.graph.getNodes();
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }
  
  return false;
}

// 使用
if (hasCycle()) {
  console.warn('图中存在环路');
}
```

### 拓扑排序

```typescript
function topologicalSort(): string[] | null {
  const edges = engine.graph.getEdges();
  const nodes = engine.graph.getNodes();
  const inDegree = new Map<string, number>();
  const result: string[] = [];
  const queue: string[] = [];
  
  // 初始化入度
  nodes.forEach(node => {
    inDegree.set(node.id, 0);
  });
  
  edges.forEach(edge => {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });
  
  // 找到所有入度为0的节点
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });
  
  // BFS
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);
    
    edges.filter(e => e.source === nodeId).forEach(edge => {
      const targetDegree = inDegree.get(edge.target)! - 1;
      inDegree.set(edge.target, targetDegree);
      
      if (targetDegree === 0) {
        queue.push(edge.target);
      }
    });
  }
  
  // 如果结果数量不等于节点数量，说明有环
  return result.length === nodes.length ? result : null;
}

// 使用
const sorted = topologicalSort();
if (sorted) {
  console.log('拓扑排序结果:', sorted);
} else {
  console.log('图中存在环，无法进行拓扑排序');
}
```

## 性能优化

### 边缓存

对于大量边的场景，使用边快照模式：

```typescript
const engine = new CanvasEngine({
  container,
  edgeSnapshot: 'always'  // 始终使用快照
});
```

### 视口裁剪

边会自动参与视口裁剪，只渲染可见的边：

```typescript
// 自动优化，无需手动处理
// 引擎会根据视口范围和节点位置判断边是否可见
```

### 降质渲染

在拖拽或大规模场景中，边会自动降质：

```typescript
const engine = new CanvasEngine({
  container,
  dragEdgeRenderThreshold: {
    nodes: 400,
    edges: 800
  }
});
```

## 最佳实践

### 1. 使用锚点连接

```typescript
// ✅ 推荐：使用锚点连接
{
  id: 'edge-1',
  shape: 'line',
  source: 'node-1',
  target: 'node-2',
  sourcePortId: 'port-right',
  targetPortId: 'port-left'
}

// ❌ 避免：不指定锚点（连接到节点中心）
{
  id: 'edge-1',
  shape: 'line',
  source: 'node-1',
  target: 'node-2'
}
```

### 2. 选择合适的边类型

```typescript
// 流程图：使用正交线
{
  shape: 'orthogonal'
}

// 关系图：使用曲线
{
  shape: 'curve'
}

// 简单连接：使用直线
{
  shape: 'line'
}
```

### 3. 避免创建重复边

```typescript
// ✅ 检查边是否已存在
function addEdgeIfNotExists(edge: EdgeData): void {
  const existing = engine.graph.getEdges().find(e =>
    e.source === edge.source &&
    e.target === edge.target &&
    e.sourcePortId === edge.sourcePortId &&
    e.targetPortId === edge.targetPortId
  );
  
  if (!existing) {
    engine.graph.addEdge(edge);
  }
}
```

### 4. 清理孤立边

```typescript
// ✅ 定期清理孤立边
function cleanOrphanEdges(): void {
  const nodes = new Set(engine.graph.getNodes().map(n => n.id));
  const orphanEdges = engine.graph.getEdges().filter(edge =>
    !nodes.has(edge.source) || !nodes.has(edge.target)
  );
  
  orphanEdges.forEach(edge => {
    engine.graph.removeEdge(edge.id);
  });
}
```

### 5. 批量操作

```typescript
// ✅ 批量添加边
engine.graph.beginUpdate();
edges.forEach(edge => engine.graph.addEdge(edge));
engine.graph.endUpdate();

// ❌ 避免：逐个添加导致多次重绘
edges.forEach(edge => engine.graph.addEdge(edge));
```

## 常见问题

### Q: 如何让边始终在节点下方？

边总是在节点下方渲染，这是引擎的默认行为。

### Q: 如何实现自定义箭头？

需要创建自定义边渲染器，参考 [自定义渲染器](./custom-renderers.md) 文档。

### Q: 边的标签如何自动避让节点？

使用 `labelOffset` 微调标签位置，或使用自定义标签渲染逻辑。

### Q: 如何实现动画边？

使用 FlowDashPlugin 或在自定义渲染器中实现动画效果。
