---
sidebar_position: 5
---

# Commands API

AgileJS 提供了丰富的内置命令类，涵盖节点、边、分组等各类操作。所有命令都实现 `ICommand` 接口，支持撤销/重做。

## 节点命令

### AddNodeCommand

添加节点。

```typescript
class AddNodeCommand implements ICommand {
  constructor(graph: Graph, node: NodeData)
}
```

**示例：**
```typescript
engine.history.execute(
  new AddNodeCommand(engine.graph, {
    id: 'node-1',
    shape: 'rect',
    position: { x: 100, y: 100 },
    size: { width: 120, height: 80 }
  })
);
```

### RemoveNodeCommand

删除节点及其相关边。

```typescript
class RemoveNodeCommand implements ICommand {
  constructor(graph: Graph, nodeId: string)
}
```

**示例：**
```typescript
engine.history.execute(
  new RemoveNodeCommand(engine.graph, 'node-1')
);
```

### MoveNodeCommand

移动单个节点到指定位置。

:::tip

移动节点场景历史记录管理时，因为移动过程状态不需要关心，建议采用合并方式提高性能。

:::

```typescript
class MoveNodeCommand implements ICommand {
  constructor(
    graph: Graph,
    nodeId: string,
    nextX: number,
    nextY: number
  )
}
```

**示例：**
```typescript
// 支持命令合并（拖动时使用）
engine.history.execute(
  new MoveNodeCommand(engine.graph, 'node-1', 200, 150),
  { merge: true, mergeKey: 'move-node-1' }
);
```

### MoveNodesCommand

批量移动多个节点（相对偏移）。

```typescript
class MoveNodesCommand implements ICommand {
  constructor(
    graph: Graph,
    nodeIds: string[],
    dx: number,
    dy: number
  )
}
```

**示例：**
```typescript
const selectedNodes = engine.graph.getNodes()
  .filter(n => n.selected)
  .map(n => n.id);

engine.history.execute(
  new MoveNodesCommand(engine.graph, selectedNodes, 50, 30)
);
```

### ResizeNodeCommand

调整节点尺寸。

```typescript
class ResizeNodeCommand implements ICommand {
  constructor(
    graph: Graph,
    nodeId: string,
    width: number,
    height: number
  )
}
```

**示例：**
```typescript
engine.history.execute(
  new ResizeNodeCommand(engine.graph, 'node-1', 150, 100)
);
```

### ResizeNodeWithPortsCommand

调整节点尺寸，同时等比缩放锚点偏移。

```typescript
class ResizeNodeWithPortsCommand implements ICommand {
  constructor(
    graph: Graph,
    nodeId: string,
    width: number,
    height: number
  )
}
```

**示例：**
```typescript
// 适用于有锚点的节点
engine.history.execute(
  new ResizeNodeWithPortsCommand(engine.graph, 'node-1', 200, 120)
);
```

### SetNodeRotationCommand

设置节点旋转角度。

```typescript
class SetNodeRotationCommand implements ICommand {
  constructor(
    graph: Graph,
    nodeId: string,
    rotation: number  // 弧度
  )
}
```

**示例：**
```typescript
engine.history.execute(
  new SetNodeRotationCommand(engine.graph, 'node-1', Math.PI / 4)
);
```

### SetZIndexCommand

设置节点层级。

```typescript
class SetZIndexCommand implements ICommand {
  constructor(
    graph: Graph,
    nodeId: string,
    zIndex: number
  )
}
```

**示例：**
```typescript
// 置顶节点
const maxZ = Math.max(
  ...engine.graph.getNodes().map(n => n.zIndex ?? 0)
);
engine.history.execute(
  new SetZIndexCommand(engine.graph, 'node-1', maxZ + 1)
);
```

### UpdateNodeDataCommand

更新节点的 `data` 属性（部分更新）。

```typescript
class UpdateNodeDataCommand implements ICommand {
  constructor(
    graph: Graph,
    nodeId: string,
    data: Record<string, unknown>
  )
}
```

**示例：**
```typescript
engine.history.execute(
  new UpdateNodeDataCommand(engine.graph, 'node-1', {
    style: {
      fill: '#4CAF50',
      stroke: '#2E7D32'
    }
  })
);
```

### UpdateNodePropsCommand

更新节点的基础属性（`selectable`、`draggable`、`groupId`）。

```typescript
class UpdateNodePropsCommand implements ICommand {
  constructor(
    graph: Graph,
    nodeId: string,
    props: {
      selectable?: boolean;
      draggable?: boolean;
      groupId?: string;
    }
  )
}
```

**示例：**
```typescript
engine.history.execute(
  new UpdateNodePropsCommand(engine.graph, 'node-1', {
    selectable: false,
    draggable: false
  })
);
```

## 边命令

### AddEdgeCommand

添加边。

```typescript
class AddEdgeCommand implements ICommand {
  constructor(graph: Graph, edge: EdgeData)
}
```

**示例：**
```typescript
engine.history.execute(
  new AddEdgeCommand(engine.graph, {
    id: 'edge-1',
    shape: 'edge-straight',
    source: 'node-1',
    target: 'node-2'
  })
);
```

### RemoveEdgeCommand

删除边。

```typescript
class RemoveEdgeCommand implements ICommand {
  constructor(graph: Graph, edgeId: string)
}
```

**示例：**
```typescript
engine.history.execute(
  new RemoveEdgeCommand(engine.graph, 'edge-1')
);
```

### UpdateEdgeDataCommand

更新边的 `data` 属性。

```typescript
class UpdateEdgeDataCommand implements ICommand {
  constructor(
    graph: Graph,
    edgeId: string,
    data: Record<string, unknown>
  )
}
```

**示例：**
```typescript
engine.history.execute(
  new UpdateEdgeDataCommand(engine.graph, 'edge-1', {
    style: {
      stroke: '#f44336',
      lineWidth: 3
    }
  })
);
```

### SetEdgeShapeCommand

切换边的形状类型。

```typescript
class SetEdgeShapeCommand implements ICommand {
  constructor(
    graph: Graph,
    edgeId: string,
    shape: string
  )
}
```

**示例：**
```typescript
// 切换为贝塞尔曲线
engine.history.execute(
  new SetEdgeShapeCommand(engine.graph, 'edge-1', 'edge-bezier')
);
```

### SetEdgePointsCommand

设置边的控制点（用于折线等）。

```typescript
class SetEdgePointsCommand implements ICommand {
  constructor(
    graph: Graph,
    edgeId: string,
    prevPoints: Point[] | undefined,
    nextPoints: Point[] | undefined
  )
}
```

**示例：**
```typescript
const edge = engine.graph.getEdge('edge-1');
const prevPoints = edge?.points;
const nextPoints = [
  { x: 100, y: 100 },
  { x: 150, y: 150 },
  { x: 200, y: 100 }
];

engine.history.execute(
  new SetEdgePointsCommand(engine.graph, 'edge-1', prevPoints, nextPoints)
);
```

### ReconnectEdgeCommand

重新连接边（更改源/目标节点或锚点）。

```typescript
class ReconnectEdgeCommand implements ICommand {
  constructor(
    graph: Graph,
    edgeId: string,
    prev: {
      source: string;
      target: string;
      sourcePortId?: string;
      targetPortId?: string;
    },
    next: {
      source: string;
      target: string;
      sourcePortId?: string;
      targetPortId?: string;
    }
  )
}
```

**示例：**
```typescript
const edge = engine.graph.getEdge('edge-1')!;
const prev = {
  source: edge.source,
  target: edge.target,
  sourcePortId: edge.sourcePortId,
  targetPortId: edge.targetPortId
};
const next = {
  source: 'node-3',
  target: 'node-2',
  sourcePortId: 'port-1',
  targetPortId: 'port-2'
};

engine.history.execute(
  new ReconnectEdgeCommand(engine.graph, 'edge-1', prev, next)
);
```

## 层级命令

### ReorderZIndexCommand

批量重排所有节点的 zIndex。

```typescript
class ReorderZIndexCommand implements ICommand {
  constructor(graph: Graph, nextOrder: string[])
}
```

**示例：**
```typescript
const newOrder = ['node-3', 'node-1', 'node-2'];
engine.history.execute(
  new ReorderZIndexCommand(engine.graph, newOrder)
);
```

### 层级辅助函数

:::tip

提供常用的置顶 `bringNodesToFront` 、置底 `sendNodesToBack` 、上移一层 `moveNodesUp` 、下移一层 `moveNodesDown` 操作，通常用于编辑器场景。

:::

以下函数提供便捷的层级操作，内部使用 `ReorderZIndexCommand`：

#### bringNodesToFront()

将节点置顶。

```typescript
function bringNodesToFront(
  graph: Graph,
  nodeIds: string[],
  history?: CommandHistory
): void
```

**示例：**
```typescript
const selectedIds = engine.graph.getNodes()
  .filter(n => n.selected)
  .map(n => n.id);

bringNodesToFront(engine.graph, selectedIds, engine.history);
```

#### sendNodesToBack()

将节点置底。

```typescript
function sendNodesToBack(
  graph: Graph,
  nodeIds: string[],
  history?: CommandHistory
): void
```

#### moveNodesUp()

将节点上移一层。

```typescript
function moveNodesUp(
  graph: Graph,
  nodeIds: string[],
  history?: CommandHistory
): void
```

#### moveNodesDown()

将节点下移一层。

```typescript
function moveNodesDown(
  graph: Graph,
  nodeIds: string[],
  history?: CommandHistory
): void
```

## 分组命令

### GroupNodesCommand

创建分组（支持嵌套）。

```typescript
class GroupNodesCommand implements ICommand {
  constructor(
    graph: Graph,
    nodeIds: string[],
    groupId: string
  )
}
```

**示例：**
```typescript
const selectedIds = engine.graph.getNodes()
  .filter(n => n.selected)
  .map(n => n.id);

engine.history.execute(
  new GroupNodesCommand(engine.graph, selectedIds, 'group-1')
);
```

### UngroupNodesCommand

解散分组（逐层解组或完全展平）。

```typescript
class UngroupNodesCommand implements ICommand {
  constructor(
    graph: Graph,
    nodeIds: string[],
    options?: { flattenAll?: boolean }
  )
}
```

**示例：**
```typescript
// 解散最内层组
engine.history.execute(
  new UngroupNodesCommand(engine.graph, groupedNodeIds)
);

// 完全展平所有层级
engine.history.execute(
  new UngroupNodesCommand(engine.graph, groupedNodeIds, { flattenAll: true })
);
```

## 变换命令

### GroupTransformCommand

批量变换节点（位置、尺寸、旋转、锚点）。

```typescript
class GroupTransformCommand implements ICommand {
  constructor(
    graph: Graph,
    updates: Array<{
      id: string;
      prev: {
        position: Point;
        size: Size;
        rotation: number;
        ports?: Record<string, Point>;
      };
      next: {
        position: Point;
        size: Size;
        rotation: number;
        ports?: Record<string, Point>;
      };
    }>
  )
}
```

**示例：**
```typescript
const updates = selectedNodes.map(node => ({
  id: node.id,
  prev: {
    position: { ...node.position },
    size: { ...node.size },
    rotation: node.rotation ?? 0
  },
  next: {
    position: { x: node.position.x + 10, y: node.position.y + 10 },
    size: { width: node.size.width * 1.1, height: node.size.height * 1.1 },
    rotation: (node.rotation ?? 0) + 0.1
  }
}));

engine.history.execute(
  new GroupTransformCommand(engine.graph, updates)
);
```

## 画布命令

### SetCanvasBackgroundCommand

设置画布背景色。

```typescript
class SetCanvasBackgroundCommand implements ICommand {
  constructor(
    engine: CanvasEngine,
    nextBackground: string
  )
}
```

**示例：**
```typescript
engine.history.execute(
  new SetCanvasBackgroundCommand(engine, '#f5f5f5')
);
```

### SetGridOptionsCommand

设置网格插件选项。

```typescript
class SetGridOptionsCommand implements ICommand {
  constructor(
    engine: CanvasEngine,
    nextOptions: { size?: number; color?: string; alpha?: number }
  )
}
```

**示例：**
```typescript
engine.history.execute(
  new SetGridOptionsCommand(engine, {
    size: 25,
    color: '#e0e0e0',
    alpha: 0.3
  })
);
```

### SetGuidesOptionsCommand

设置参考线插件选项。

```typescript
class SetGuidesOptionsCommand implements ICommand {
  constructor(
    engine: CanvasEngine,
    nextOptions: {
      threshold?: number;
      color?: string;
      lineWidth?: number;
      lineDash?: number[];
    }
  )
}
```

### UpdateNodePortsCommand

更新节点的锚点列表。

```typescript
class UpdateNodePortsCommand implements ICommand {
  constructor(
    graph: Graph,
    nodeId: string,
    nextPorts: PortData[]
  )
}
```

## 使用技巧

### 1. 命令合并

频繁操作应启用合并：

```typescript
function onNodeDrag(nodeId: string, x: number, y: number) {
  engine.history.execute(
    new MoveNodeCommand(engine.graph, nodeId, x, y),
    {
      merge: true,
      mergeKey: `move-${nodeId}`,
      mergeWindowMs: 500
    }
  );
}
```

### 2. 批量操作使用事务

```typescript
engine.history.beginTransaction('Delete Selection');

try {
  selectedEdges.forEach(edge => {
    engine.history.execute(new RemoveEdgeCommand(engine.graph, edge.id));
  });
  selectedNodes.forEach(node => {
    engine.history.execute(new RemoveNodeCommand(engine.graph, node.id));
  });
  
  engine.history.commitTransaction();
} catch (error) {
  engine.history.rollbackTransaction();
}
```

### 3. 自定义命令

```typescript
class MyCustomCommand implements ICommand {
  label = 'My Custom Operation';
  
  constructor(private graph: Graph, private data: any) {}
  
  do(): void {
    // 执行逻辑
    this.graph.markDirty();
  }
  
  undo(): void {
    // 撤销逻辑
    this.graph.markDirty();
  }
  
  debugInfo(): CommandDebugInfo {
    return {
      nodes: ['node-1'],
      changes: [{
        entity: 'node',
        id: 'node-1',
        path: 'custom',
        prev: 'old',
        next: 'new'
      }]
    };
  }
}
```

## 命令列表总览

| 命令 | 用途 | 支持合并 |
|------|------|---------|
| AddNodeCommand | 添加节点 | ❌ |
| RemoveNodeCommand | 删除节点 | ❌ |
| MoveNodeCommand | 移动节点 | ✅ |
| MoveNodesCommand | 批量移动 | ✅ |
| ResizeNodeCommand | 调整尺寸 | ✅ |
| ResizeNodeWithPortsCommand | 调整尺寸（含锚点） | ✅ |
| SetNodeRotationCommand | 旋转节点 | ✅ |
| SetZIndexCommand | 设置层级 | ❌ |
| UpdateNodeDataCommand | 更新数据 | ❌ |
| UpdateNodePropsCommand | 更新属性 | ❌ |
| AddEdgeCommand | 添加边 | ❌ |
| RemoveEdgeCommand | 删除边 | ❌ |
| UpdateEdgeDataCommand | 更新边数据 | ❌ |
| SetEdgeShapeCommand | 切换边类型 | ❌ |
| SetEdgePointsCommand | 设置控制点 | ✅ |
| ReconnectEdgeCommand | 重连边 | ❌ |
| ReorderZIndexCommand | 重排层级 | ❌ |
| GroupNodesCommand | 创建分组 | ❌ |
| UngroupNodesCommand | 解散分组 | ❌ |
| GroupTransformCommand | 批量变换 | ✅ |
| SetCanvasBackgroundCommand | 设置背景 | ❌ |
| SetGridOptionsCommand | 设置网格 | ❌ |
| SetGuidesOptionsCommand | 设置参考线 | ❌ |
| UpdateNodePortsCommand | 更新锚点 | ❌ |
