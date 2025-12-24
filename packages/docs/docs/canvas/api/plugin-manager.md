---
sidebar_position: 6
---

# PluginManager API

`PluginManager` 负责管理插件的注册、卸载和生命周期协调。

## Plugin 接口

所有插件都应实现 `Plugin` 接口：

```typescript
interface Plugin {
  // 唯一标识符
  id: string;
  
  // 可选：安装时调用
  setup?(engine: CanvasEngine): void;
  
  // 可选：卸载时调用
  dispose?(): void;
  
  // 生命周期钩子（可选）
  beforeRender?(ctx: CanvasRenderingContext2D): void;
  afterRender?(ctx: CanvasRenderingContext2D): void;
  renderNodeLabels?(ctx: CanvasRenderingContext2D, node: NodeData): void;
  renderEdgeLabels?(ctx: CanvasRenderingContext2D, edge: EdgeData, graph: Graph): void;
}
```

## 构造函数

```typescript
constructor(engine: CanvasEngine)
```

PluginManager 由 CanvasEngine 自动创建，通常不需要手动实例化。

## 方法

### use()

```typescript
use(...plugins: Plugin[]): void
```

注册一个或多个插件。如果插件已存在（相同 ID），则忽略。

**参数：**
- `plugins`: 要注册的插件（支持多个）

```typescript
import { GridPlugin, DragPlugin, PanZoomPlugin } from '@agilejs/core';

// 注册单个插件
engine.plugins.use(new GridPlugin({ size: 20 }));

// 批量注册
engine.plugins.use(
  new DragPlugin(),
  new PanZoomPlugin(),
  new BoxSelectPlugin()
);
```

### eject()

```typescript
eject(id: string): void
```

卸载插件。会调用插件的 `dispose()` 方法（如果存在）。

**参数：**
- `id`: 插件 ID

```typescript
// 卸载网格插件
engine.plugins.eject('grid');
```

### get()

```typescript
get<T extends Plugin = Plugin>(id: string): T | undefined
```

根据 ID 获取插件实例（带类型推断）。

**参数：**
- `id`: 插件 ID

**返回：**
- 插件实例或 `undefined`

```typescript
const gridPlugin = engine.plugins.get<GridPlugin>('grid');
if (gridPlugin) {
  console.log('Grid size:', gridPlugin.options.size);
}

// 修改插件配置
const dragPlugin = engine.plugins.get<DragPlugin>('drag');
if (dragPlugin) {
  dragPlugin.enabled = false;
}
```

### emitHook()

```typescript
emitHook(hook: keyof Plugin, ...args: any[]): void
```

触发插件生命周期钩子。按注册顺序依次调用所有插件的对应钩子方法。

**参数：**
- `hook`: 钩子名称
- `args`: 传递给钩子的参数

```typescript
// 引擎内部使用示例
engine.plugins.emitHook('beforeRender', ctx);
engine.plugins.emitHook('renderNodeLabels', ctx, node);
engine.plugins.emitHook('afterRender', ctx);
```

## 插件生命周期

### 安装阶段

```typescript
class MyPlugin implements Plugin {
  id = 'my-plugin';
  
  setup(engine: CanvasEngine): void {
    console.log('Plugin installed');
    
    // 注册事件监听器
    engine.events.on('graph:change', this.onGraphChanged);
    
    // 保存引用以便后续使用
    this.engine = engine;
  }
}
```

### 渲染钩子

#### beforeRender()

在主渲染前调用（屏幕空间），可用于绘制背景层。

```typescript
beforeRender(ctx: CanvasRenderingContext2D): void {
  // 绘制网格、背景等
  ctx.save();
  // ... 绘制逻辑
  ctx.restore();
}
```

#### afterRender()

在主渲染后调用（屏幕空间），可用于绘制覆盖层。

```typescript
afterRender(ctx: CanvasRenderingContext2D): void {
  // 绘制选择框、工具提示等
  ctx.save();
  // ... 绘制逻辑
  ctx.restore();
}
```

#### renderNodeLabels()

在每个节点渲染后调用（世界空间），用于绘制节点标签。

```typescript
renderNodeLabels(ctx: CanvasRenderingContext2D, node: NodeData): void {
  if (node.data?.label) {
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.fillText(node.data.label, node.position.x, node.position.y);
    ctx.restore();
  }
}
```

#### renderEdgeLabels()

在边渲染后调用（世界空间），用于绘制边标签。

```typescript
renderEdgeLabels(
  ctx: CanvasRenderingContext2D,
  edge: EdgeData,
  graph: Graph
): void {
  if (edge.data?.label) {
    const source = graph.getNode(edge.source);
    const target = graph.getNode(edge.target);
    if (source && target) {
      const midX = (source.position.x + target.position.x) / 2;
      const midY = (source.position.y + target.position.y) / 2;
      ctx.save();
      ctx.fillStyle = '#666';
      ctx.font = '11px sans-serif';
      ctx.fillText(edge.data.label, midX, midY);
      ctx.restore();
    }
  }
}
```

### 卸载阶段

```typescript
class MyPlugin implements Plugin {
  id = 'my-plugin';
  private engine?: CanvasEngine;
  private listener?: () => void;
  
  setup(engine: CanvasEngine): void {
    this.engine = engine;
    this.listener = () => console.log('Graph changed');
    engine.events.on('graph:change', this.listener);
  }
  
  dispose(): void {
    console.log('Plugin disposed');
    
    // 清理事件监听器
    if (this.engine && this.listener) {
      this.engine.events.off('graph:change', this.listener);
    }
    
    // 清理其他资源
    this.engine = undefined;
    this.listener = undefined;
  }
}
```

## 自定义插件示例

:::tip

可参考既有插件实现，如：`BlinkPlugin`。

:::

### 简单插件

```typescript
import { Plugin, CanvasEngine, NodeData } from '@agilejs/core';

class HelloPlugin implements Plugin {
  id = 'hello';
  
  setup(engine: CanvasEngine): void {
    console.log('Hello Plugin installed');
  }
  
  beforeRender(ctx: CanvasRenderingContext2D): void {
    // 在左上角显示文本
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.font = '14px sans-serif';
    ctx.fillText('Hello from Plugin!', 10, 20);
    ctx.restore();
  }
  
  dispose(): void {
    console.log('Hello Plugin disposed');
  }
}

// 使用
engine.plugins.use(new HelloPlugin());
```

### 带配置的插件

```typescript
interface MyPluginOptions {
  color?: string;
  size?: number;
}

class MyPlugin implements Plugin {
  id = 'my-plugin';
  private options: Required<MyPluginOptions>;
  
  constructor(options: MyPluginOptions = {}) {
    this.options = {
      color: options.color ?? '#000',
      size: options.size ?? 10
    };
  }
  
  afterRender(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = this.options.color;
    ctx.fillRect(0, 0, this.options.size, this.options.size);
    ctx.restore();
  }
  
  // 允许动态修改配置
  setOptions(options: Partial<MyPluginOptions>): void {
    Object.assign(this.options, options);
  }
}

// 使用
const plugin = new MyPlugin({ color: '#ff0000', size: 20 });
engine.plugins.use(plugin);

// 动态修改
plugin.setOptions({ color: '#00ff00' });
```

### 交互插件

```typescript
class ClickPlugin implements Plugin {
  id = 'click';
  private engine?: CanvasEngine;
  
  setup(engine: CanvasEngine): void {
    this.engine = engine;
    engine.canvas.addEventListener('click', this.onClick);
  }
  
  private onClick = (e: MouseEvent): void {
    if (!this.engine) return;
    
    const rect = this.engine.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = this.engine.toWorld({ x: screenX, y: screenY });
    
    console.log('Clicked at world:', world);
    
    // 查找点击的节点
    const nodes = this.engine.graph.getNodes();
    for (const node of nodes) {
      const { x, y } = node.position;
      const { width, height } = node.size;
      
      if (
        world.x >= x && world.x <= x + width &&
        world.y >= y && world.y <= y + height
      ) {
        console.log('Clicked node:', node.id);
        break;
      }
    }
  };
  
  dispose(): void {
    if (this.engine) {
      this.engine.canvas.removeEventListener('click', this.onClick);
    }
  }
}

// 使用
engine.plugins.use(new ClickPlugin());
```

### 状态管理插件

```typescript
class SelectionPlugin implements Plugin {
  id = 'selection';
  private engine?: CanvasEngine;
  private selectedNodes = new Set<string>();
  
  setup(engine: CanvasEngine): void {
    this.engine = engine;
    engine.canvas.addEventListener('click', this.onClick);
  }
  
  private onClick = (e: MouseEvent): void {
    // ... 检测点击的节点
    
    // 清除之前的选中
    this.clearSelection();
    
    // 选中新节点
    this.selectNode(nodeId);
  };
  
  selectNode(nodeId: string): void {
    const node = this.engine?.graph.getNode(nodeId);
    if (node) {
      node.selected = true;
      this.selectedNodes.add(nodeId);
      this.engine?.graph.markDirty();
    }
  }
  
  clearSelection(): void {
    for (const id of this.selectedNodes) {
      const node = this.engine?.graph.getNode(id);
      if (node) node.selected = false;
    }
    this.selectedNodes.clear();
    this.engine?.graph.markDirty();
  }
  
  getSelectedNodes(): string[] {
    return Array.from(this.selectedNodes);
  }
  
  afterRender(ctx: CanvasRenderingContext2D): void {
    if (!this.engine) return;
    
    // 绘制选中框
    ctx.save();
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    
    for (const id of this.selectedNodes) {
      const node = this.engine.graph.getNode(id);
      if (node) {
        const screen = this.engine.toScreen(node.position);
        const width = node.size.width * this.engine.getScale();
        const height = node.size.height * this.engine.getScale();
        
        ctx.strokeRect(screen.x, screen.y, width, height);
      }
    }
    
    ctx.restore();
  }
  
  dispose(): void {
    if (this.engine) {
      this.engine.canvas.removeEventListener('click', this.onClick);
    }
    this.clearSelection();
  }
}
```

## 插件管理最佳实践

### 1. 插件按需加载

```typescript
// 根据模式加载不同插件
if (mode === 'edit') {
  engine.plugins.use(
    new DragPlugin(),
    new SelectionPlugin(),
    new BoxSelectPlugin()
  );
} else {
  engine.plugins.use(
    new PanZoomPlugin()
  );
}
```

### 2. 插件热插拔

```typescript
function toggleGrid(enabled: boolean) {
  if (enabled) {
    engine.plugins.use(new GridPlugin({ size: 20 }));
  } else {
    engine.plugins.eject('grid');
  }
}
```

### 3. 插件通信

```typescript
class PluginA implements Plugin {
  id = 'plugin-a';
  
  setup(engine: CanvasEngine): void {
    // 触发自定义事件
    engine.events.emit('pluginA:ready', { data: 'something' });
  }
}

class PluginB implements Plugin {
  id = 'plugin-b';
  
  setup(engine: CanvasEngine): void {
    // 监听插件A的事件
    engine.events.on('pluginA:ready', (payload) => {
      console.log('Plugin A is ready:', payload);
    });
  }
}
```

### 4. 插件配置持久化

:::tip

根据自身需要实现，通常来说必要性不大。

:::

```typescript
class ConfigurablePlugin implements Plugin {
  id = 'configurable';
  private options: any;
  
  constructor(options: any = {}) {
    // 尝试从本地存储加载
    const saved = localStorage.getItem('plugin-config');
    this.options = saved ? JSON.parse(saved) : options;
  }
  
  setOptions(options: any): void {
    Object.assign(this.options, options);
    // 保存到本地存储
    localStorage.setItem('plugin-config', JSON.stringify(this.options));
  }
  
  dispose(): void {
    // 可选：清理本地存储
    localStorage.removeItem('plugin-config');
  }
}
```

## 内置插件参考

AgileJS 提供了丰富的内置插件：

- **GridPlugin** - 网格背景
- **DragPlugin** - 节点拖拽
- **PanZoomPlugin** - 平移和缩放
- **SelectionOverlayPlugin** - 选择框
- **BoxSelectPlugin** - 框选
- **ConnectPlugin** - 连线
- **PortOverlayPlugin** - 端口显示
- **KeyboardPlugin** - 键盘快捷键
- **LabelOverlayPlugin** - 标签显示
- **ClipboardPlugin** - 复制粘贴
- **SnapToGridPlugin** - 对齐网格
- **GuidesPlugin** - 参考线
- **ResizeRotatePlugin** - 缩放旋转
- **GroupResizeRotatePlugin** - 组缩放旋转
- **GroupPlugin** - 分组
- **EdgeEditPlugin** - 边编辑
- **PolylineNodeEditPlugin** - 折线节点编辑
- **FlowDashPlugin** - 流动动画
- **NodeFlowDashPlugin** - 节点描边流动
- **MinimapPlugin** - 迷你地图
- **BlinkPlugin** - 闪烁效果
- **HoverCursorPlugin** - 悬停光标
- **DataTooltipPlugin** - 数据提示

详见各插件的专门文档。
