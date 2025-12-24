# GroupPlugin

组合插件, 提供节点分组功能, 支持组选择、整体移动和解组操作。

## 基本使用

```typescript
import { CanvasEngine, GroupPlugin } from '@agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new GroupPlugin());
engine.start();
```

## 配置与交互

### 配置选项

```typescript
interface GroupPluginOptions {
  idPrefix?: string;  // 组 ID 前缀, 默认 'g'
}

// 示例
engine.plugins.use(new GroupPlugin({
  idPrefix: 'group'  // 生成 ID 如 'group_abc123'
}));
```

### 交互操作

**创建组:**
```typescript
const groupPlugin = engine.plugins.get('group') as GroupPlugin;
const groupId = groupPlugin.groupSelected();  // 'g_abc123' (自动生成)
```

**解组:**
```typescript
groupPlugin.ungroupSelected();  // 移除选中节点的组关系
```

**完全展平:**
```typescript
groupPlugin.ungroupAllLevels();  // 移除所有层级的组
```

**组选择:**
- 点击组内任一节点, 自动选中整个组
- 支持嵌套组的选择

**触发条件:**
- 至少选中2个节点才能创建组
- 选中组内节点才能解组

## API与事件

### 插件ID

```typescript
readonly id = "group"
```

### 方法

#### groupSelected(): string | null
将选中的节点组合为一个组, 返回生成的组ID。

#### ungroupSelected(): void
解散选中节点的组(移除最内层组)。

#### ungroupAllLevels(): void
完全展平, 移除所有层级的组。

#### selectGroupOf(node: NodeData, additive?: boolean): void
选择指定节点所在的组。

### 生命周期方法

#### setup(engine: CanvasEngine): void
设置插件。

#### dispose(): void
清理插件。

### 命令

**GroupNodesCommand** - 创建组

```typescript
engine.history.do(
  new GroupNodesCommand(
    engine.graph,
    ['node-1', 'node-2', 'node-3'],
    'custom-group-id'
  )
);
```

**UngroupNodesCommand** - 解散组

```typescript
engine.history.do(
  new UngroupNodesCommand(
    engine.graph,
    ['node-1', 'node-2']
  )
);
```

### 节点属性

组信息存储在节点的属性中:

```typescript
interface NodeData {
  groupId?: string;      // 所属组的ID
  groupPath?: string[];  // 组层级路径(支持嵌套)
}
```

## 常见问题

### Q: 如何判断节点是否在组中?

A: 检查节点的 `groupId` 属性:

```typescript
const node = engine.graph.getNode('node-1');
if (node?.groupId) {
  console.log('Node is in group:', node.groupId);
}
```

### Q: 如何获取组内所有节点?

A: 遍历节点列表:

```typescript
const groupId = 'g_abc123';
const members = engine.graph.getNodes()
  .filter(n => n.groupId === groupId);
```

### Q: 支持嵌套组吗?

A: 支持。使用 `groupPath` 记录层级关系:

```typescript
// groupPath: ['outer-group', 'inner-group']
// groupId: 'inner-group' (最内层)
```

### Q: 如何一次性删除整个组?

A: 先获取组成员, 再批量删除:

```typescript
const members = engine.graph.getNodes()
  .filter(n => n.groupId === groupId);

members.forEach(node => {
  engine.history.do(
    new RemoveNodeCommand(engine.graph, node.id)
  );
});
```

## 相关内容

- [DragPlugin](./drag.md) - 组的整体拖拽
- [GroupResizeRotatePlugin](./group-resize-rotate.md) - 组的缩放和旋转
- [命令系统](../commands.md) - GroupNodesCommand, UngroupNodesCommand

