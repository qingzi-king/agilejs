---
sidebar_position: 3
---

# Graph API

`Graph` 类负责管理图形数据模型，包括节点和边的增删改查、版本追踪和缓存优化。

## 类型定义

### NodeData

```typescript
interface NodeData {
  id: string;                    // 唯一标识符
  shape: string;                 // 形状类型（如 'rect', 'circle'）
  position: Point;               // 世界坐标位置
  size: Size;                    // 尺寸
  visible?: boolean;             // 是否可见（默认 true）
  selectable?: boolean;          // 是否可选中（默认 true）
  draggable?: boolean;           // 是否可拖拽（默认 true）
  rotation?: number;             // 旋转角度（弧度）
  zIndex?: number;               // 层级（数字越大越靠前）
  selected?: boolean;            // 是否选中
  groupId?: string;              // 直接所属组ID（最内层）
  groupPath?: string[];          // 完整组路径（从外到内）
  ports?: PortData[];            // 锚点列表
  data?: Record<string, unknown> & {
    showPorts?: boolean;         // 是否显示锚点（默认 true）
  };
}
```

### EdgeData

```typescript
interface EdgeData {
  id: string;                    // 唯一标识符
  shape: string;                 // 边类型（如 'edge-straight', 'edge-bezier'）
  source: string;                // 源节点ID
  target: string;                // 目标节点ID
  sourcePortId?: string;         // 源锚点ID
  targetPortId?: string;         // 目标锚点ID
  points?: Point[];              // 控制点（用于折线、贝塞尔曲线等）
  selected?: boolean;            // 是否选中
  data?: Record<string, unknown>; // 自定义数据
}
```

### PortData

```typescript
interface PortData {
  id: string;                    // 锚点唯一标识
  anchorMode?: 'relative' | 'absolute';  // 锚点模式
  anchorPosition?: AnchorPosition;       // 相对锚点位置
  offset: Point;                 // 偏移量
  radius?: number;               // 可视半径
  label?: string;                // 显示名称
}

type AnchorPosition = 
  | 'top' | 'top-left' | 'top-right'
  | 'right' | 'right-top' | 'right-bottom'
  | 'bottom' | 'bottom-left' | 'bottom-right'
  | 'left' | 'left-top' | 'left-bottom'
  | 'center';
```

### Point & Size

```typescript
interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}
```

## 节点操作

### addNode()

```typescript
addNode(node: NodeData): void
```

添加节点。会使节点缓存失效并触发版本自增。

```typescript
engine.graph.addNode({
  id: 'node-1',
  shape: 'rect',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 80 },
  data: {
    style: {
      fill: '#4CAF50',
      stroke: '#2E7D32'
    }
  }
});
```

### getNode()

```typescript
getNode(id: string): NodeData | undefined
```

根据 ID 获取节点。返回节点数据或 `undefined`。

```typescript
const node = engine.graph.getNode('node-1');
if (node) {
  console.log(node.position);
}
```

### getNodes()

```typescript
getNodes(): NodeData[]
```

获取所有节点（按 zIndex 排序，zIndex 相同时按 ID 排序）。结果会被缓存，直到图形变更。

```typescript
const nodes = engine.graph.getNodes();
console.log(`Total nodes: ${nodes.length}`);
```

### removeNode()

```typescript
removeNode(id: string): void
```

删除节点及其相关的所有边。会使节点和边缓存失效并触发版本自增。

```typescript
engine.graph.removeNode('node-1');
```

### setNodePosition()

```typescript
setNodePosition(id: string, x: number, y: number): void
```

设置节点位置。会使节点缓存失效并触发版本自增。

```typescript
engine.graph.setNodePosition('node-1', 200, 150);
```

### setNodeSize()

```typescript
setNodeSize(id: string, width: number, height: number): void
```

设置节点尺寸。会使节点缓存失效并触发版本自增。

```typescript
engine.graph.setNodeSize('node-1', 150, 100);
```

### setNodeZIndex()

```typescript
setNodeZIndex(id: string, zIndex: number): void
```

设置节点层级。会使节点缓存失效并触发版本自增。

```typescript
// 将节点置顶
const nodes = engine.graph.getNodes();
const maxZ = Math.max(...nodes.map(n => n.zIndex ?? 0));
engine.graph.setNodeZIndex('node-1', maxZ + 1);
```

## 边操作

### addEdge()

```typescript
addEdge(edge: EdgeData): void
```

添加边。会使边缓存失效并触发版本自增。

```typescript
engine.graph.addEdge({
  id: 'edge-1',
  shape: 'edge-straight',
  source: 'node-1',
  target: 'node-2',
  data: {
    style: {
      stroke: '#2196F3',
      lineWidth: 2
    }
  }
});
```

### getEdge()

```typescript
getEdge(id: string): EdgeData | undefined
```

根据 ID 获取边。返回边数据或 `undefined`。

```typescript
const edge = engine.graph.getEdge('edge-1');
if (edge) {
  console.log(`Edge from ${edge.source} to ${edge.target}`);
}
```

### getEdges()

```typescript
getEdges(): EdgeData[]
```

获取所有边。结果会被缓存，直到图形变更。

```typescript
const edges = engine.graph.getEdges();
console.log(`Total edges: ${edges.length}`);
```

### removeEdge()

```typescript
removeEdge(id: string): void
```

删除边。会使边缓存失效并触发版本自增。

```typescript
engine.graph.removeEdge('edge-1');
```

### connectedEdges()

```typescript
connectedEdges(nodeId: string): EdgeData[]
```

获取连接到指定节点的所有边（包括源边和目标边）。

```typescript
const edges = engine.graph.connectedEdges('node-1');
console.log(`Node has ${edges.length} connected edges`);

// 删除节点的所有相关边
edges.forEach(edge => engine.graph.removeEdge(edge.id));
```

## 版本与缓存

### getVersion()

```typescript
getVersion(): number
```

获取图形版本号。任何结构或几何变更都会使版本号自增，用于判断缓存是否失效。

```typescript
const version = engine.graph.getVersion();
console.log(`Graph version: ${version}`);

// 缓存失效判断
if (cachedVersion !== engine.graph.getVersion()) {
  // 重新计算
}
```

### markDirty()

```typescript
markDirty(type?: 'structure' | 'style' = 'structure'): void

graph.markDirty('structure');  // 位置、尺寸、增删 → 影响边快照、空间索引
graph.markDirty('style');      // 透明度、颜色等 → 仅触发重绘
```

手动标记图形为脏状态，触发版本自增。通常在直接修改节点/边属性后调用。

```typescript
const node = engine.graph.getNode('node-1');
if (node) {
  // 直接修改属性
  node.position.x += 10;
  node.position.y += 10;
  
  // 标记脏状态
  engine.graph.markDirty();
}
```

### clear()

```typescript
clear(): void
```

清空所有节点和边，重置缓存和版本号。

```typescript
engine.graph.clear();
```

## 更新操作

### updateNode()

```typescript
updateNode(id: string, updates: Partial<NodeData>): void
```

更新节点属性（部分更新）。会使节点缓存失效并触发版本自增。

```typescript
engine.graph.updateNode('node-1', {
  position: { x: 200, y: 150 },
  size: { width: 150, height: 100 }
});
```

### updateEdge()

```typescript
updateEdge(id: string, updates: Partial<EdgeData>): void
```

更新边属性（部分更新）。会使边缓存失效并触发版本自增。

```typescript
engine.graph.updateEdge('edge-1', {
  data: {
    style: {
      stroke: '#f44336',
      lineWidth: 3
    }
  }
});
```

## 使用示例

### 创建带锚点的节点

```typescript
engine.graph.addNode({
  id: 'node-1',
  shape: 'rect',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 80 },
  ports: [
    {
      id: 'port-top',
      anchorMode: 'relative',
      anchorPosition: 'top',
      offset: { x: 0, y: 0 },
      radius: 4
    },
    {
      id: 'port-bottom',
      anchorMode: 'relative',
      anchorPosition: 'bottom',
      offset: { x: 0, y: 0 },
      radius: 4
    }
  ],
  data: {
    showPorts: true
  }
});
```

### 连接两个节点的锚点

```typescript
engine.graph.addEdge({
  id: 'edge-1',
  shape: 'edge-bezier',
  source: 'node-1',
  target: 'node-2',
  sourcePortId: 'port-bottom',
  targetPortId: 'port-top',
  data: {
    style: {
      stroke: '#2196F3',
      lineWidth: 2,
      strokeDasharray: '5,5'
    }
  }
});
```

### 批量操作

```typescript
// 批量添加节点
const nodes = [
  { id: 'n1', shape: 'rect', position: { x: 100, y: 100 }, size: { width: 80, height: 60 } },
  { id: 'n2', shape: 'circle', position: { x: 250, y: 100 }, size: { width: 80, height: 80 } },
  { id: 'n3', shape: 'diamond', position: { x: 175, y: 200 }, size: { width: 100, height: 80 } }
];

nodes.forEach(node => engine.graph.addNode(node));

// 批量连接
const edges = [
  { id: 'e1', shape: 'edge-straight', source: 'n1', target: 'n2' },
  { id: 'e2', shape: 'edge-straight', source: 'n2', target: 'n3' },
  { id: 'e3', shape: 'edge-straight', source: 'n3', target: 'n1' }
];

edges.forEach(edge => engine.graph.addEdge(edge));
```

### 查找和过滤

```typescript
// 查找所有选中的节点
const selectedNodes = engine.graph.getNodes().filter(n => n.selected);

// 查找特定形状的节点
const rectNodes = engine.graph.getNodes().filter(n => n.shape === 'rect');

// 查找孤立节点（无连接边的节点）
const isolatedNodes = engine.graph.getNodes().filter(node => {
  const edges = engine.graph.connectedEdges(node.id);
  return edges.length === 0;
});

// 统计入度和出度
const node = engine.graph.getNode('node-1');
if (node) {
  const connectedEdges = engine.graph.connectedEdges(node.id);
  const inDegree = connectedEdges.filter(e => e.target === node.id).length;
  const outDegree = connectedEdges.filter(e => e.source === node.id).length;
  console.log(`In: ${inDegree}, Out: ${outDegree}`);
}
```

### 图形遍历

```typescript
// 深度优先遍历
function dfs(nodeId: string, visited = new Set<string>()) {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);
  
  const node = engine.graph.getNode(nodeId);
  console.log('Visit:', node);
  
  const edges = engine.graph.connectedEdges(nodeId);
  const outEdges = edges.filter(e => e.source === nodeId);
  
  outEdges.forEach(edge => {
    dfs(edge.target, visited);
  });
}

// 广度优先遍历
function bfs(startNodeId: string) {
  const visited = new Set<string>();
  const queue = [startNodeId];
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    
    const node = engine.graph.getNode(nodeId);
    console.log('Visit:', node);
    
    const edges = engine.graph.connectedEdges(nodeId);
    const outEdges = edges.filter(e => e.source === nodeId);
    
    outEdges.forEach(edge => {
      if (!visited.has(edge.target)) {
        queue.push(edge.target);
      }
    });
  }
}
```

### 性能优化技巧

```typescript
// 1. 使用缓存避免重复获取
const nodes = engine.graph.getNodes();  // 缓存结果
const edges = engine.graph.getEdges();  // 缓存结果

// 不要在循环中重复调用
// ❌ 错误示例
for (let i = 0; i < 1000; i++) {
  const nodes = engine.graph.getNodes();  // 每次都重新获取
}

// ✅ 正确示例
const nodes = engine.graph.getNodes();  // 只获取一次
for (let i = 0; i < 1000; i++) {
  // 使用缓存的 nodes
}

// 2. 批量操作后统一触发更新
const nodesToAdd = [...];  // 大量节点

// 临时禁用自动渲染
engine.stop();

nodesToAdd.forEach(node => engine.graph.addNode(node));

// 恢复渲染
engine.start();

// 3. 直接修改属性时记得调用 markDirty
const node = engine.graph.getNode('node-1');
if (node) {
  node.position.x += 10;
  node.position.y += 10;
  engine.graph.markDirty();  // 重要！
}

// 4. 使用版本号判断缓存失效
let cachedData: any = null;
let cachedVersion = -1;

function getProcessedData() {
  const currentVersion = engine.graph.getVersion();
  if (cachedVersion !== currentVersion) {
    cachedData = processNodes(engine.graph.getNodes());
    cachedVersion = currentVersion;
  }
  return cachedData;
}
```

## 注意事项

1. **直接修改节点/边属性后需要调用 `markDirty()`**，否则渲染可能不会更新
2. **`getNodes()` 和 `getEdges()` 的结果是缓存的**，修改返回的数组不会影响图形
3. **节点的 zIndex 默认为 0**，相同 zIndex 时按 ID 排序
4. **删除节点会自动删除相关的边**
5. **锚点的 `anchorMode` 影响连接点的计算方式**：
   - `'relative'`: 使用相对位置（不受节点缩放影响）
   - `'absolute'`: 使用绝对像素偏移（会随节点缩放）
