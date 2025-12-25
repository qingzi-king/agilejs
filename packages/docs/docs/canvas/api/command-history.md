---
sidebar_position: 4
---

# CommandHistory API

`CommandHistory` 类提供完整的命令历史管理，支持撤销/重做、事务、命令合并和历史调试。

## 命令接口

### ICommand

所有命令都必须实现此接口：

```typescript
interface ICommand {
  // 执行命令
  do(): void;
  
  // 撤销命令
  undo(): void;
  
  // 可选：命令标签（用于显示）
  label?: string;
  
  // 可选：提供调试信息
  debugInfo?(): CommandDebugInfo | undefined;
}
```

### CommandDebugInfo

命令调试信息结构：

```typescript
interface CommandDebugInfo {
  nodes?: string[];              // 受影响的节点ID
  edges?: string[];              // 受影响的边ID
  groups?: string[];             // 受影响的组ID
  canvas?: boolean;              // 是否影响画布
  plugins?: string[];            // 受影响的插件
  changes?: ChangeItem[];        // 详细变更记录
  extra?: Record<string, unknown>; // 其他元信息
}

interface ChangeItem {
  entity: 'node' | 'edge' | 'group' | 'canvas' | 'plugin' | 'misc';
  id?: string;                   // 实体ID
  path: string;                  // 属性路径（如 'position.x'）
  prev: unknown;                 // 变更前的值
  next: unknown;                 // 变更后的值
  note?: string;                 // 可选备注
}
```

## 构造函数

```typescript
constructor(max?: number)
```

创建命令历史实例。

**参数：**
- `max`: 最大历史记录数（默认 200）

```typescript
const history = new CommandHistory(100);
```

## 基本操作

### execute()

```typescript
execute(command: ICommand, options?: ExecuteOptions): void
```

执行命令并加入历史栈。会自动清空重做栈。

**参数：**
- `command`: 要执行的命令
- `options`: 执行选项
  - `merge`: 是否尝试合并到上一个命令
  - `mergeKey`: 合并键（用于识别可合并的命令）
  - `mergeWindowMs`: 合并时间窗口（毫秒，默认 500）
  - `label`: 命令标签

```typescript
import { AddNodeCommand } from '@fnt-agilejs/core';

// 基本执行
engine.history.execute(
  new AddNodeCommand(engine.graph, node)
);

// 带合并选项
engine.history.execute(
  new MoveNodeCommand(engine.graph, nodeId, x, y),
  { 
    merge: true, 
    mergeKey: 'move-node',
    mergeWindowMs: 500 
  }
);
```

### undo()

```typescript
undo(): void
```

撤销最近的命令。

```typescript
if (engine.history.canUndo()) {
  engine.history.undo();
}
```

### redo()

```typescript
redo(): void
```

重做下一个命令。

```typescript
if (engine.history.canRedo()) {
  engine.history.redo();
}
```

### canUndo()

```typescript
canUndo(): boolean
```

检查是否可以撤销。

```typescript
const undoButton = document.getElementById('undo');
undoButton.disabled = !engine.history.canUndo();
```

### canRedo()

```typescript
canRedo(): boolean
```

检查是否可以重做。

```typescript
const redoButton = document.getElementById('redo');
redoButton.disabled = !engine.history.canRedo();
```

### clear()

```typescript
clear(): void
```

清空所有历史记录（包括撤销和重做栈）。

```typescript
engine.history.clear();
```

## 事务支持

事务允许将多个命令作为一个整体执行和撤销。

### beginTransaction()

```typescript
beginTransaction(label?: string, key?: string): void
```

开始一个事务。

**参数：**
- `label`: 事务标签
- `key`: 事务键（用于合并）

```typescript
engine.history.beginTransaction('Batch Update');
```

### commitTransaction()

```typescript
commitTransaction(): void
```

提交事务。将事务中的所有命令作为一个复合命令加入历史。

```typescript
engine.history.beginTransaction('Add Nodes');

try {
  engine.history.execute(new AddNodeCommand(engine.graph, node1));
  engine.history.execute(new AddNodeCommand(engine.graph, node2));
  engine.history.execute(new AddNodeCommand(engine.graph, node3));
  
  engine.history.commitTransaction();
} catch (error) {
  engine.history.rollbackTransaction();
}
```

### rollbackTransaction()

```typescript
rollbackTransaction(): void
```

回滚事务。撤销事务中已执行的所有命令。

```typescript
engine.history.beginTransaction('Complex Operation');

try {
  // 一系列操作
  engine.history.execute(cmd1);
  engine.history.execute(cmd2);
  
  if (someCondition) {
    throw new Error('Operation failed');
  }
  
  engine.history.commitTransaction();
} catch (error) {
  console.error('Transaction failed:', error);
  engine.history.rollbackTransaction();
}
```

## 变更监听

### onChange()

```typescript
onChange(listener: () => void): () => void
```

监听历史变化。返回取消监听的函数。

```typescript
const unsubscribe = engine.history.onChange(() => {
  // 更新UI状态
  updateUndoRedoButtons();
});

// 取消监听
unsubscribe();
```

## 历史调试

### debugData()

```typescript
debugData(format?: 'object' | 'array'): any
```

获取历史调试数据。

**参数：**
- `format`: 数据格式
  - `'object'`（默认）：返回结构化对象
  - `'array'`：返回扁平数组

```typescript
// 获取对象格式
const history = engine.history.debugData('object');
console.log(history);
/*
{
  meta: {
    doneCount: 5,
    undoneCount: 2,
    canUndo: true,
    canRedo: true
  },
  done: [...],
  undone: [...]
}
*/

// 获取数组格式
const history = engine.history.debugData('array');
console.log(history);
/*
{
  meta: { ... },
  items: [
    { index: 0, state: 'done', label: 'Add Node', ... },
    { index: 1, state: 'done', label: 'Move Node', ... },
    ...
  ]
}
*/
```

### debugSnapshot()

```typescript
debugSnapshot(): void
```

打印历史快照到控制台（用于开发调试）。

```typescript
engine.history.debugSnapshot();
```

## 使用示例

在编辑器中已实现，可参考编辑器源码。

### 基本撤销/重做

```typescript
import { AddNodeCommand, MoveNodeCommand } from '@fnt-agilejs/core';

// 添加节点
engine.history.execute(
  new AddNodeCommand(engine.graph, {
    id: 'node-1',
    shape: 'rect',
    position: { x: 100, y: 100 },
    size: { width: 120, height: 80 }
  })
);

// 移动节点
engine.history.execute(
  new MoveNodeCommand(engine.graph, 'node-1', 200, 150)
);

// 撤销移动
engine.history.undo();  // 节点回到 (100, 100)

// 重做移动
engine.history.redo();  // 节点移动到 (200, 150)
```

### 命令合并

连续的相似操作可以合并为一个历史记录：

```typescript
// 拖动节点时，连续的移动命令会被合并
function onDrag(nodeId: string, x: number, y: number) {
  engine.history.execute(
    new MoveNodeCommand(engine.graph, nodeId, x, y),
    {
      merge: true,
      mergeKey: `move-${nodeId}`,
      mergeWindowMs: 500  // 500ms内的移动会被合并
    }
  );
}

// 用户拖动节点产生的多次移动，只会在历史中占用一条记录
```

### 事务操作

```typescript
// 批量删除选中的节点和边
function deleteSelection() {
  const selectedNodes = engine.graph.getNodes().filter(n => n.selected);
  const selectedEdges = engine.graph.getEdges().filter(e => e.selected);
  
  if (selectedNodes.length === 0 && selectedEdges.length === 0) {
    return;
  }
  
  engine.history.beginTransaction('Delete Selection');
  
  try {
    // 先删除边
    selectedEdges.forEach(edge => {
      engine.history.execute(
        new RemoveEdgeCommand(engine.graph, edge.id)
      );
    });
    
    // 再删除节点
    selectedNodes.forEach(node => {
      engine.history.execute(
        new RemoveNodeCommand(engine.graph, node.id)
      );
    });
    
    engine.history.commitTransaction();
  } catch (error) {
    console.error('Delete failed:', error);
    engine.history.rollbackTransaction();
  }
}

// 撤销时，所有删除操作会一起撤销
```

### 自定义命令

:::tip

实现自定义命令可参考既有命令，如：`AddNodeCommand`。

:::

```typescript
import { ICommand, CommandDebugInfo } from '@fnt-agilejs/core';

class ToggleNodeVisibilityCommand implements ICommand {
  label = 'Toggle Visibility';
  private prevVisible: boolean | undefined;
  
  constructor(
    private graph: Graph,
    private nodeId: string
  ) {}
  
  do(): void {
    const node = this.graph.getNode(this.nodeId);
    if (!node) return;
    
    this.prevVisible = node.visible ?? true;
    node.visible = !this.prevVisible;
    this.graph.markDirty();
  }
  
  undo(): void {
    const node = this.graph.getNode(this.nodeId);
    if (!node || this.prevVisible === undefined) return;
    
    node.visible = this.prevVisible;
    this.graph.markDirty();
  }
  
  debugInfo(): CommandDebugInfo {
    return {
      nodes: [this.nodeId],
      changes: [{
        entity: 'node',
        id: this.nodeId,
        path: 'visible',
        prev: this.prevVisible,
        next: !this.prevVisible
      }]
    };
  }
}

// 使用自定义命令
engine.history.execute(
  new ToggleNodeVisibilityCommand(engine.graph, 'node-1')
);
```

### UI 集成

```typescript
class HistoryUI {
  private undoButton: HTMLButtonElement;
  private redoButton: HTMLButtonElement;
  private unsubscribe: () => void;
  
  constructor(private history: CommandHistory) {
    this.undoButton = document.getElementById('undo') as HTMLButtonElement;
    this.redoButton = document.getElementById('redo') as HTMLButtonElement;
    
    // 绑定事件
    this.undoButton.onclick = () => this.undo();
    this.redoButton.onclick = () => this.redo();
    
    // 监听历史变化
    this.unsubscribe = this.history.onChange(() => {
      this.updateButtons();
    });
    
    // 初始化按钮状态
    this.updateButtons();
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
      }
    });
  }
  
  private updateButtons() {
    this.undoButton.disabled = !this.history.canUndo();
    this.redoButton.disabled = !this.history.canRedo();
  }
  
  private undo() {
    if (this.history.canUndo()) {
      this.history.undo();
    }
  }
  
  private redo() {
    if (this.history.canRedo()) {
      this.history.redo();
    }
  }
  
  destroy() {
    this.unsubscribe();
  }
}

// 使用
const historyUI = new HistoryUI(engine.history);
```

### 历史面板

```typescript
function renderHistoryPanel() {
  const data = engine.history.debugData('array');
  const container = document.getElementById('history-panel');
  
  if (!container) return;
  
  container.innerHTML = `
    <div class="history-meta">
      <span>Can Undo: ${data.meta.canUndo}</span>
      <span>Can Redo: ${data.meta.canRedo}</span>
    </div>
    <ul class="history-list">
      ${data.items.map(item => `
        <li class="history-item ${item.state}">
          <span class="index">${item.index}</span>
          <span class="label">${item.label || 'Unknown'}</span>
          <span class="state">${item.state}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

// 监听历史变化，自动更新面板
engine.history.onChange(() => {
  renderHistoryPanel();
});
```

## 最佳实践

### 1. 始终使用命令模式

:::tip

编辑器条件下建议使用命令模式，如果是程序集成可直接更新。

:::

```typescript
// 方式1：直接修改
const node = engine.graph.getNode('node-1');
node.position.x = 200;
engine.graph.markDirty();

// 方式2：使用命令
engine.history.execute(
  new MoveNodeCommand(engine.graph, 'node-1', 200, node.position.y)
);
```

### 2. 合并频繁操作

```typescript
// 拖动、缩放等频繁操作应该启用合并
engine.history.execute(cmd, {
  merge: true,
  mergeKey: 'operation-type-id',
  mergeWindowMs: 500
});
```

### 3. 使用事务包裹批量操作

```typescript
// 复杂操作应该使用事务
engine.history.beginTransaction('Complex Operation');
try {
  // 多个命令
  engine.history.commitTransaction();
} catch (error) {
  engine.history.rollbackTransaction();
}
```

### 4. 提供有意义的标签

```typescript
// 标签会显示在历史面板中
new AddNodeCommand(engine.graph, node).label = 'Add Rectangle';
```

### 5. 实现 debugInfo 方法

```typescript
// 便于调试和历史追踪
debugInfo(): CommandDebugInfo {
  return {
    nodes: [this.nodeId],
    changes: [{
      entity: 'node',
      id: this.nodeId,
      path: 'position',
      prev: this.prevPosition,
      next: this.nextPosition
    }]
  };
}
```

## 性能考虑

1. **限制历史大小**：设置合理的 `max` 值避免内存占用过大
2. **合并相似操作**：减少历史记录数量
3. **使用事务**：批量操作合并为一条记录
4. **避免在命令中存储大对象**：只存储必要的恢复信息
5. **定期清理**：在适当时机调用 `clear()` 清空历史
