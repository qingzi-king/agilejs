---
sidebar_position: 7
---

# 命令

命令系统提供可撤销/重做的操作历史管理，使用命令模式实现。

## 核心概念

### ICommand 接口

所有命令必须实现 `ICommand` 接口：

```typescript
interface ICommand {
  do(): void;                                    // 执行命令
  undo(): void;                                  // 撤销命令
  label?: string;                                // 可选：命令标签
  debugInfo?: () => CommandDebugInfo | undefined; // 可选：调试信息
}
```

### CommandHistory

命令历史管理器，维护撤销/重做栈：

```typescript
class CommandHistory {
  execute(command: ICommand, options?: ExecuteOptions): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  
  // 事务支持
  beginTransaction(label?: string, key?: string): void;
  commitTransaction(): void;
  rollbackTransaction(): void;
  
  // 监听变化
  onChange(listener: () => void): () => void;
  
  // 调试工具
  debugSnapshot(): DebugSnapshot;
  debugData(format?: 'object' | 'array'): any;
}

type ExecuteOptions = {
  merge?: boolean;       // 是否尝试合并
  mergeKey?: string;     // 合并键
  mergeWindowMs?: number; // 合并时间窗口，默认 400ms
  label?: string;        // 命令标签
};
```

## 内置命令

### AddNodeCommand

添加节点命令。

```typescript
import { AddNodeCommand } from '@fnt-agilejs/core';

const node: NodeData = {
  id: 'node-1',
  shape: 'rect',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 80 }
};

engine.history.execute(
  new AddNodeCommand(engine.graph, node)
);
```

**撤销：** 删除该节点。

### RemoveNodeCommand

删除节点命令。

```typescript
import { RemoveNodeCommand } from '@fnt-agilejs/core';

engine.history.execute(
  new RemoveNodeCommand(engine.graph, 'node-1')
);
```

**撤销：** 恢复该节点及其连接的边。

### MoveNodeCommand

移动节点命令。

```typescript
import { MoveNodeCommand } from '@fnt-agilejs/core';

engine.history.execute(
  new MoveNodeCommand(
    engine.graph,
    'node-1',
    200,  // x
    200   // y
  )
);
```

**撤销：** 恢复到原位置。

### MoveNodesCommand

批量移动节点命令。

```typescript
import { MoveNodesCommand } from '@fnt-agilejs/core';

// 将多个节点向右移动 50px，向下移动 30px
engine.history.execute(
  new MoveNodesCommand(
    engine.graph,
    ['node-1', 'node-2', 'node-3'],
    50,  // dx
    30   // dy
  )
);
```

**撤销：** 恢复所有节点到原位置。

### ResizeNodeCommand

调整节点大小命令。

```typescript
import { ResizeNodeCommand } from '@fnt-agilejs/core';

engine.history.execute(
  new ResizeNodeCommand(
    engine.graph,
    'node-1',
    200,  // width
    150   // height
  )
);
```

**撤销：** 恢复原尺寸。

### UpdateNodeDataCommand

更新节点数据命令（用于自定义数据）。

```typescript
import { UpdateNodeDataCommand } from '@fnt-agilejs/core';

engine.history.execute(
  new UpdateNodeDataCommand(
    engine.graph,
    'node-1',
    { style: { fill: '#ff0000' }, customField: 'value' }
  )
);
```

**撤销：** 恢复旧数据。

### AddEdgeCommand

添加边命令。

```typescript
import { AddEdgeCommand } from '@fnt-agilejs/core';

const edge: EdgeData = {
  id: 'edge-1',
  shape: 'line',
  source: 'node-1',
  target: 'node-2'
};

engine.history.execute(
  new AddEdgeCommand(engine.graph, edge)
);
```

**撤销：** 删除该边。

### RemoveEdgeCommand

删除边命令。

```typescript
import { RemoveEdgeCommand } from '@fnt-agilejs/core';

engine.history.execute(
  new RemoveEdgeCommand(engine.graph, 'edge-1')
);
```

**撤销：** 恢复该边。

### UpdateEdgeDataCommand

更新边数据命令。

```typescript
import { UpdateEdgeDataCommand } from '@fnt-agilejs/core';

engine.history.execute(
  new UpdateEdgeDataCommand(
    engine.graph,
    'edge-1',
    { style: { stroke: '#ff0000' }, customField: 'value' }
  )
);
```

**撤销：** 恢复旧数据。

### SetEdgeShapeCommand

切换边形状命令。

```typescript
import { SetEdgeShapeCommand } from '@fnt-agilejs/core';

engine.history.execute(
  new SetEdgeShapeCommand(
    engine.graph,
    'edge-1',
    'edge-bezier'  // 或 'edge-straight', 'edge-orthogonal', 'edge-polyline'
  )
);
```

**撤销：** 恢复原形状。

### ReconnectEdgeCommand

重新连接边命令。

```typescript
import { ReconnectEdgeCommand } from '@fnt-agilejs/core';

engine.history.execute(
  new ReconnectEdgeCommand(
    engine.graph,
    'edge-1',
    { source: 'node-1', target: 'node-2' },  // 旧连接
    { source: 'node-1', target: 'node-3' }   // 新连接
  )
);
```

**撤销：** 恢复原连接。

### 事务（Transaction）

将多个命令作为一个原子操作执行。

```typescript
import { AddNodeCommand, AddEdgeCommand } from '@fnt-agilejs/core';

// 开始事务
engine.history.beginTransaction('Add Nodes and Edge');

// 执行多个命令
engine.history.execute(new AddNodeCommand(engine.graph, node1));
engine.history.execute(new AddNodeCommand(engine.graph, node2));
engine.history.execute(new AddEdgeCommand(engine.graph, edge));

// 提交事务（作为一个整体加入历史）
engine.history.commitTransaction();

// 或回滚事务（撤销所有已执行的命令）
// engine.history.rollbackTransaction();
```

**撤销：** 一次撤销整个事务中的所有命令。

## 使用示例

### 基本用法

```typescript
// 执行命令
engine.history.execute(
  new AddNodeCommand(engine.graph, node)
);

// 撤销
if (engine.history.canUndo()) {
  engine.history.undo();
}

// 重做
if (engine.history.canRedo()) {
  engine.history.redo();
}
```

### 批量操作（使用事务）

```typescript
const nodes = [node1, node2, node3];

// 使用事务将多个命令组合为一个原子操作
engine.history.beginTransaction('Add Multiple Nodes');

nodes.forEach(node => {
  engine.history.execute(new AddNodeCommand(engine.graph, node));
});

engine.history.commitTransaction();
```

### 键盘快捷键

```typescript
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) {
      // Ctrl+Z / Cmd+Z
      e.preventDefault();
      engine.history.undo();
    } else if (
      (e.key === 'z' && e.shiftKey) ||
      e.key === 'y'
    ) {
      // Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y
      e.preventDefault();
      engine.history.redo();
    }
  }
});
```

### 监听历史变化

```typescript
// 订阅历史变化事件
const unsubscribe = engine.history.onChange(() => {
  console.log('History changed');
  console.log('Can undo:', engine.history.canUndo());
  console.log('Can redo:', engine.history.canRedo());
});

// 取消订阅
unsubscribe();
```

## 自定义命令

### 创建自定义命令

```typescript
class CustomCommand implements ICommand {
  label = 'Custom Command';
  private oldValue: any;
  private newValue: any;
  
  constructor(
    private target: any,
    newValue: any
  ) {
    this.newValue = newValue;
  }
  
  do(): void {
    this.oldValue = this.target.value;
    this.target.value = this.newValue;
  }
  
  undo(): void {
    this.target.value = this.oldValue;
  }
  
  debugInfo(): CommandDebugInfo | undefined {
    return {
      changes: [{
        entity: 'misc' as const,
        path: 'value',
        prev: this.oldValue,
        next: this.newValue
      }]
    };
  }
}

// 使用
engine.history.execute(
  new CustomCommand(target, newValue)
);
```

### 复杂命令示例

#### GroupNodesCommand

将多个节点编组（实际代码中已有此命令）。

```typescript
import { GroupNodesCommand } from '@fnt-agilejs/core';

// 使用内置命令
engine.history.execute(
  new GroupNodesCommand(
    engine.graph,
    ['node-1', 'node-2', 'node-3'],
    'group-1'
  )
);

// 自定义简化版本
class SimpleGroupCommand implements ICommand {
  label = 'Group Nodes';
  private nodeIds: string[];
  private groupId: string;
  private prevGroupIds: Map<string, string | undefined> = new Map();
  
  constructor(
    private graph: Graph,
    nodeIds: string[],
    groupId: string
  ) {
    this.nodeIds = nodeIds;
    this.groupId = groupId;
  }
  
  do(): void {
    this.nodeIds.forEach(id => {
      const node = this.graph.getNode(id);
      if (node) {
        this.prevGroupIds.set(id, node.groupId);
        node.groupId = this.groupId;
      }
    });
    this.graph.markDirty();
  }
  
  undo(): void {
    this.nodeIds.forEach(id => {
      const node = this.graph.getNode(id);
      if (node) {
        const prevGroupId = this.prevGroupIds.get(id);
        if (prevGroupId) {
          node.groupId = prevGroupId;
        } else {
          delete node.groupId;
        }
      }
    });
    this.graph.markDirty();
  }
}
```

#### AlignNodesCommand

对齐多个节点。

```typescript
class AlignNodesCommand implements ICommand {
  label = 'Align Nodes';
  private nodeIds: string[];
  private oldPositions: Map<string, Point> = new Map();
  private alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
  
  constructor(
    private graph: Graph,
    nodeIds: string[],
    alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
  ) {
    this.nodeIds = nodeIds;
    this.alignment = alignment;
  }
  
  do(): void {
    const nodes = this.nodeIds
      .map(id => this.graph.getNode(id))
      .filter(Boolean) as NodeData[];
    
    if (nodes.length === 0) return;
    
    // 保存旧位置
    nodes.forEach(node => {
      this.oldPositions.set(node.id, { ...node.position });
    });
    
    // 计算对齐位置
    const bounds = this.calculateBounds(nodes);
    
    nodes.forEach(node => {
      switch (this.alignment) {
        case 'left':
          node.position.x = bounds.minX;
          break;
        case 'center':
          node.position.x = (bounds.minX + bounds.maxX) / 2 - node.size.width / 2;
          break;
        case 'right':
          node.position.x = bounds.maxX - node.size.width;
          break;
        case 'top':
          node.position.y = bounds.minY;
          break;
        case 'middle':
          node.position.y = (bounds.minY + bounds.maxY) / 2 - node.size.height / 2;
          break;
        case 'bottom':
          node.position.y = bounds.maxY - node.size.height;
          break;
      }
    });
    
    this.graph.markDirty();
  }
  
  undo(): void {
    this.oldPositions.forEach((position, id) => {
      const node = this.graph.getNode(id);
      if (node) {
        node.position = { ...position };
      }
    });
    this.graph.markDirty();
  }
  
  private calculateBounds(nodes: NodeData[]) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + node.size.width);
      maxY = Math.max(maxY, node.position.y + node.size.height);
    });
    
    return { minX, minY, maxX, maxY };
  }
}
```

## 命令合并

对于连续的相似操作（如拖拽），可以使用命令合并以减少历史记录。

### 使用内置合并机制

```typescript
// 拖拽时使用合并选项
onMouseMove((e) => {
  const position = engine.screenToWorld(e.clientX, e.clientY);
  
  engine.history.execute(
    new MoveNodeCommand(engine.graph, dragNodeId, position.x, position.y),
    {
      merge: true,
      mergeKey: `move-${dragNodeId}`,
      mergeWindowMs: 400  // 400ms内的相同key命令会被合并
    }
  );
});

// 合并后，400ms内的多次移动只会在历史中产生一条记录
```

### 工作原理

- **mergeKey**: 相同key的命令才能合并
- **mergeWindowMs**: 时间窗口，默认400ms
- 合并的命令会被包装成一个复合命令（CompositeCommand）
- 撤销时一次撤销整个合并后的命令序列

## 历史变化监听

### 使用 onChange 监听器

```typescript
// 订阅历史变化
const unsubscribe = engine.history.onChange(() => {
  updateUndoRedoButtons();
  console.log('History changed');
});

function updateUndoRedoButtons() {
  undoButton.disabled = !engine.history.canUndo();
  redoButton.disabled = !engine.history.canRedo();
}

// 取消订阅
unsubscribe();
```

## 插件集成

内置插件会自动使用命令系统：

### DragPlugin

```typescript
// 拖拽结束时自动创建 MoveNodeCommand 或 MoveNodesCommand
engine.plugins.use(new DragPlugin());
```

### GroupResizeRotatePlugin

```typescript
// 调整大小/旋转时自动创建 GroupTransformCommand
engine.plugins.use(new GroupResizeRotatePlugin());
```

### GroupPlugin

```typescript
// 编组/解组操作自动创建 GroupNodesCommand/UngroupNodesCommand
engine.plugins.use(new GroupPlugin());
```

### EdgeEditPlugin

```typescript
// 边编辑（折点、重连）自动创建相应命令
engine.plugins.use(new EdgeEditPlugin());
```

## 最佳实践

### 1. 使用事务处理原子操作

每组相关的命令应该作为一个事务执行：

```typescript
// ❌ 不好：分散的操作，可以单独撤销
engine.history.execute(new MoveNodeCommand(graph, 'node-1', 100, 100));
engine.history.execute(new MoveNodeCommand(graph, 'node-2', 200, 200));

// ✅ 好：使用事务作为原子操作
engine.history.beginTransaction('Move Multiple Nodes');
engine.history.execute(new MoveNodeCommand(graph, 'node-1', 100, 100));
engine.history.execute(new MoveNodeCommand(graph, 'node-2', 200, 200));
engine.history.commitTransaction();
```

### 2. 使用命令合并减少历史记录

对于连续的相似操作（如拖拽），使用合并机制：

```typescript
// ✅ 好：拖拽时使用合并
onMouseMove((e) => {
  const pos = engine.screenToWorld(e.clientX, e.clientY);
  engine.history.execute(
    new MoveNodeCommand(graph, nodeId, pos.x, pos.y),
    { merge: true, mergeKey: `drag-${nodeId}` }
  );
});

// 400ms内的多次移动只会产生一条历史记录
```

### 3. 直接操作 + markDirty vs 命令系统

区分需要撤销和不需要撤销的操作：

```typescript
// 临时状态（如hover高亮）：直接修改，不记录历史
node.data = { ...node.data, highlighted: true };
engine.graph.markDirty('style');

// 用户操作（如移动节点）：使用命令系统
engine.history.execute(
  new MoveNodeCommand(graph, nodeId, newX, newY)
);
```

### 4. 命名规范

使用清晰的命令名称和label：

```typescript
// ✅ 使用清晰的类名和label
class CreateRectNodeCommand implements ICommand {
  label = 'Create Rectangle Node';
  // ...
}

class AlignNodesLeftCommand implements ICommand {
  label = 'Align Left';
  // ...
}
```

### 5. 状态一致性

在do()方法中保存旧值，确保undo()能正确恢复：

```typescript
class UpdateNodeStyleCommand implements ICommand {
  label = 'Update Node Style';
  private oldStyle: any;
  
  constructor(
    private graph: Graph,
    private nodeId: string,
    private newStyle: any
  ) {}
  
  do(): void {
    const node = this.graph.getNode(this.nodeId);
    if (!node) return;
    
    // 在do()中保存旧值
    this.oldStyle = { ...node.data?.style };
    
    node.data = {
      ...node.data,
      style: { ...node.data?.style, ...this.newStyle }
    };
    this.graph.markDirty('style');
  }
  
  undo(): void {
    const node = this.graph.getNode(this.nodeId);
    if (!node) return;
    
    node.data = {
      ...node.data,
      style: this.oldStyle
    };
    this.graph.markDirty('style');
  }
}
```

### 6. 内存管理

CommandHistory构造函数支持maxSize参数：

```typescript
// 创建限制大小的历史管理器
const history = new CommandHistory(100);  // 最多保留100条历史

// 引擎中使用
const engine = new CanvasEngine({
  container,
  // ... 其他配置
});
// engine.history 默认max为200
```

## 调试技巧

### 1. 使用 debugSnapshot()

```typescript
// 获取历史快照用于调试
const snapshot = engine.history.debugSnapshot();

console.log('Done commands:', snapshot.done.length);
console.log('Undone commands:', snapshot.undone.length);
console.log('Can undo:', snapshot.canUndo);
console.log('Can redo:', snapshot.canRedo);

// 查看每个命令的详细信息
snapshot.done.forEach((cmd, index) => {
  console.log(`${index}: ${cmd.label} (${cmd.className})`);
  console.log('  Targets:', cmd.targets);
  console.log('  Changes:', cmd.changes);
  
  // 如果是复合命令，查看子命令
  if (cmd.type === 'composite' && cmd.children) {
    cmd.children.forEach((child, i) => {
      console.log(`  ${i}: ${child.label}`);
    });
  }
});
```

### 2. 使用 debugData()

```typescript
// 获取数组格式的调试数据
const data = engine.history.debugData('array');

console.log('Meta:', data.meta);
data.items.forEach(item => {
  console.log(`[${item.stack}] ${item.index}: ${item.label}`);
});

// 或获取对象格式（与debugSnapshot相同）
const objData = engine.history.debugData('object');
```

### 3. 命令标签

为自定义命令添加有意义的标签：

```typescript
class MyCommand implements ICommand {
  label = 'My Custom Operation';  // 在调试信息中显示
  
  do(): void { /* ... */ }
  undo(): void { /* ... */ }
  
  debugInfo(): CommandDebugInfo {
    return {
      nodes: ['affected-node-id'],
      changes: [{
        entity: 'node',
        id: 'affected-node-id',
        path: 'position',
        prev: { x: 0, y: 0 },
        next: { x: 100, y: 100 }
      }]
    };
  }
}
```

## 常见问题

### Q: 重做栈如何被清空？

A: CommandHistory 会在执行新命令时自动清空重做栈。这是标准的撤销/重做行为。

```typescript
// 内部实现（已在 CommandHistory 中）
execute(command: ICommand): void {
  command.do();
  this.done.push(command);
  this.undone = [];  // 自动清空重做栈
}
```

### Q: 如何为命令添加标签？

A: 使用 `label` 属性：

```typescript
class MyCommand implements ICommand {
  label = '我的操作';  // 会在debugSnapshot中显示
  
  do(): void { /* ... */ }
  undo(): void { /* ... */ }
}
```

### Q: 如何处理需要异步操作的命令？

A: 当前命令系统是同步的。对于异步操作，建议：

```typescript
// 方案1: 在do()之前完成异步操作
async function addNodeAsync(data: any) {
  const processedData = await processAsync(data);
  engine.history.execute(
    new AddNodeCommand(engine.graph, processedData)
  );
}

// 方案2: 使用占位符 + 后续更新
engine.history.beginTransaction('Async Operation');
engine.history.execute(new AddNodeCommand(engine.graph, placeholderNode));

await fetchData().then(data => {
  engine.history.execute(
    new UpdateNodeDataCommand(engine.graph, placeholderNode.id, data)
  );
});

engine.history.commitTransaction();
```

### Q: 如何限制历史记录的数量？

A: 在创建 CommandHistory 时指定 max 参数：

```typescript
const history = new CommandHistory(100);  // 最多保留100条
```

### Q: 事务中的命令如何被撤销？

A: 事务中的所有命令会被包装成一个 CompositeCommand，撤销时一次性撤销整个事务。

```typescript
engine.history.beginTransaction('My Transaction');
engine.history.execute(cmd1);
engine.history.execute(cmd2);
engine.history.commitTransaction();

// 一次undo会撤销cmd1和cmd2
engine.history.undo();
```

### Q: 如何查看当前有哪些可撤销的命令？

A: 使用 `debugSnapshot()` 方法：

```typescript
const snapshot = engine.history.debugSnapshot();
console.log('可撤销的命令：');
snapshot.done.forEach((cmd, i) => {
  console.log(`${i + 1}. ${cmd.label || cmd.className}`);
});
```

## 更多命令

实际代码中还有更多内置命令：

- **SetNodeRotationCommand**: 设置节点旋转角度
- **SetZIndexCommand**: 设置节点层级
- **ReorderZIndexCommand**: 批量重排节点层级
- **UpdateNodePropsCommand**: 更新节点属性（selectable、draggable等）
- **SetEdgePointsCommand**: 设置边的折点
- **UpdateLineNodePointsCommand**: 更新折线节点的点
- **UpdateNodePortsCommand**: 更新节点端口
- **SetCanvasBackgroundCommand**: 设置画布背景
- **SetGridOptionsCommand**: 设置网格选项
- **SetGuidesOptionsCommand**: 设置辅助线选项

以及辅助函数：

- **bringNodesToFront()**: 将节点置于最前
- **sendNodesToBack()**: 将节点置于最后
- **moveNodesUp()**: 节点上移一层
- **moveNodesDown()**: 节点下移一层

查看 `packages/core/src/commands/GraphCommands.ts` 了解完整的命令列表。
