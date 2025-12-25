---
sidebar_position: 2
---

# 架构设计

AgileJS Web 编辑器基于 React 19 + TypeScript 构建，采用模块化架构设计。

## 技术栈

### 核心框架
- **React 19.2.0**: UI 框架
- **TypeScript**: 类型安全
- **Vite 7.x**: 构建工具
- **React Router 7.5**: 路由管理

### 状态管理
- **Zustand 5.0**: 轻量级状态管理
- 简洁的 API，无需 Provider
- 支持 React 并发特性

### UI 库
- **TailwindCSS 4.1**: 原子化 CSS
- 支持深色模式
- 响应式设计

### Canvas 引擎
- **@fnt-agilejs/core**: 自研图形引擎
- 插件化架构
- 高性能渲染

## 目录结构

```
packages/editor/
├── src/
│   ├── app.tsx              # 应用根组件
│   ├── main.tsx             # 应用入口
│   ├── components/          # UI 组件
│   │   ├── toolbar/         # 工具栏组件
│   │   ├── panel/           # 面板组件
│   │   ├── common/          # 通用组件
│   │   ├── dragShape/       # 拖拽图形
│   │   ├── PropertyPanel.tsx # 属性面板
│   │   └── ShapesPanel.tsx   # 图形面板
│   ├── pages/               # 页面组件
│   │   ├── editor/          # 编辑器页面
│   │   ├── viewer/          # 查看器页面
│   │   └── home.tsx         # 首页
│   ├── hooks/               # 自定义 Hooks
│   ├── store/               # 状态管理
│   │   ├── canvasStore.ts   # Canvas 状态
│   │   └── index.ts         # Store 导出
│   ├── config/              # 配置文件
│   │   └── nodeTemplates.ts # 节点模板
│   ├── routes/              # 路由配置
│   ├── types/               # TypeScript 类型
│   ├── utils/               # 工具函数
│   ├── mock/                # Mock 数据
│   │   └── examples/        # 示例文件
│   ├── service/             # API 服务
│   └── assets/              # 静态资源
├── index.html               # HTML 模板
├── vite.config.ts           # Vite 配置
├── tailwind.config.js       # Tailwind 配置
└── package.json             # 依赖配置
```

## 核心架构

### 1. 分层架构

```
┌─────────────────────────────────────┐
│         UI Components Layer         │  React 组件
│  (Toolbar, Panel, PropertyPanel)   │
├─────────────────────────────────────┤
│      State Management Layer         │  Zustand Store
│        (canvasStore)                │
├─────────────────────────────────────┤
│       Business Logic Layer          │  Hooks, Utils
│    (useBlinkControl, utils)         │
├─────────────────────────────────────┤
│      Canvas Engine Layer            │  @fnt-agilejs/core
│    (CanvasEngine, Plugins)          │
└─────────────────────────────────────┘
```

### 2. 数据流

```typescript
// 单向数据流
User Action
    ↓
Component Event Handler
    ↓
Canvas Engine API / Zustand Action
    ↓
Engine Event Emission
    ↓
Component State Update
    ↓
UI Re-render
```

**示例：添加节点**

```typescript
// 1. 用户拖拽图形到画布
onDrop(e) {
  const worldPos = engine.screenToWorld(e.clientX, e.clientY);
  
  // 2. 创建节点
  const node = createNodeByShape(shape, worldPos);
  
  // 3. 执行命令
  engine.history.execute(
    new AddNodeCommand(engine.graph, node)
  );
  
  // 4. 引擎触发事件
  // engine.events.emit('graph:change', { reason: 'node-added' })
  
  // 5. 组件监听事件，更新 UI
}
```

### 3. 组件通信

#### 父子组件通信
```typescript
// 通过 props 传递
<PropertyPanel 
  engine={engine} 
  visible={propertyOpen}
  onToggleTheme={handleToggleTheme}
/>
```

#### 跨组件通信 ⚠️
```typescript
// 通过 Zustand Store（实际未应用于业务，当前情况下使用Zustand样板代码也不少）
import useCanvasStore from '@/store/canvasStore';

function Component() {
  const { engine, setEngine } = useCanvasStore();
  
  // 使用 engine
}
```

#### 引擎事件通信
```typescript
// 通过 EventBus
engine.events.on('graph:selection-change', ({ nodes }) => {
  // 更新选中状态
  updateSelection(nodes);
});
```

## 核心模块

### 1. 编辑器页面 (pages/editor)

主编辑器页面，集成所有功能。

```typescript
const Editor: React.FC = () => {
  const engineRef = useRef<CanvasEngine | null>(null);
  
  // 初始化引擎
  useEffect(() => {
    const engine = new CanvasEngine({ 
      container: containerRef.current 
    });
    
    // 注册渲染器
    registerRenderers(engine);
    
    // 注册插件
    registerPlugins(engine);
    
    // 启动引擎
    engine.start();
    
    engineRef.current = engine;
    
    return () => engine.dispose();
  }, []);
  
  return (
    <div>
      <Toolbar engine={engine} />
      <div ref={containerRef} />
      <ShapesPanel />
      <PropertyPanel engine={engine} />
    </div>
  );
};
```

### 2. 状态管理 (store/canvasStore)

全局状态管理。

```typescript
interface CanvasState {
  engine: CanvasEngine | null;
  isEditing: boolean;
  setEngine: (engine: CanvasEngine | null) => void;
  setIsEditing: (isEditing: boolean) => void;
}

const useCanvasStore = create<CanvasState>((set) => ({
  engine: null,
  isEditing: false,
  setEngine: (engine) => set({ engine }),
  setIsEditing: (isEditing) => set({ isEditing }),
}));
```

### 3. 工具栏 (components/toolbar)

顶部工具栏，提供常用操作。

```typescript
const Toolbar: React.FC<ToolbarProps> = ({ engine }) => {
  return (
    <div className="toolbar">
      <UndoRedoAction engine={engine} />
      <FitAllAction engine={engine} />
      <NodeControlAction engine={engine} />
      <LayerArrangeAction engine={engine} />
      <ZoomAction engine={engine} />
    </div>
  );
};
```

### 4. 属性面板 (PropertyPanel)

右侧属性面板，编辑节点/边属性。

```typescript
const PropertyPanel: React.FC<PropertyPanelProps> = ({ engine }) => {
  const [selectionKind, setSelectionKind] = useState<'none' | 'node' | 'edge'>('none');
  
  // 监听选择变化
  useEffect(() => {
    if (!engine) return;
    
    const handler = () => {
      const selected = engine.graph.getNodes().filter(n => n.selected);
      setSelectionKind(selected.length > 0 ? 'node' : 'none');
    };
    
    engine.events.on('graph:selection-change', handler);
    return () => engine.events.off('graph:selection-change', handler);
  }, [engine]);
  
  return (
    <div className="property-panel">
      {selectionKind === 'node' && <NodeProperties engine={engine} />}
      {selectionKind === 'edge' && <EdgeProperties engine={engine} />}
    </div>
  );
};
```

### 5. 图形面板 (ShapesPanel)

左侧图形面板，提供可拖拽的图形。

```typescript
const ShapesPanel: React.FC = () => {
  return (
    <div className="shapes-panel">
      {paletteGroups.map(group => (
        <div key={group.key}>
          <h3>{group.label}</h3>
          {group.items.map(item => (
            <DraggableItem key={item.key} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
};
```

## 设计模式

### 1. 命令模式

所有编辑操作通过命令模式实现撤销/重做。

```typescript
// 自定义命令
class SetCanvasBackgroundCommand implements ICommand {
  constructor(
    private engine: CanvasEngine,
    private newBackground: string
  ) {
    this.oldBackground = engine.background;
  }
  
  execute(): void {
    this.engine.background = this.newBackground;
  }
  
  undo(): void {
    this.engine.background = this.oldBackground;
  }
}

// 使用
engine.history.execute(
  new SetCanvasBackgroundCommand(engine, '#ffffff')
);
```

### 2. 发布/订阅模式

通过事件系统实现组件解耦。

```typescript
// 发布
engine.events.emit('graph:selection-change', { nodes: selected, edges: [], reason: 'manual' });

// 订阅
engine.events.on('graph:selection-change', ({ nodes }) => {
  // 处理选择变化
});
```

### 3. 工厂模式

节点创建使用工厂模式。

```typescript
function createNodeByShape(
  shape: string, 
  position: Point
): NodeData {
  const template = nodeTemplates[shape];
  
  return {
    id: generateId(),
    shape,
    position,
    size: template.size,
    data: template.data
  };
}
```

### 4. 组合模式

组件采用组合模式构建复杂 UI。

```typescript
<Editor>
  <Toolbar>
    <UndoRedoAction />
    <ZoomAction />
  </Toolbar>
  <Canvas />
  <PropertyPanel>
    <NodeProperties />
    <EdgeProperties />
  </PropertyPanel>
</Editor>
```

## 性能优化

### 1. 懒加载

```typescript
// 路由懒加载
const Editor = lazy(() => import('@/pages/editor'));

// 示例数据懒加载
const exampleModules = import.meta.glob(
  '@/mock/examples/*.json', 
  { eager: false }
);
```

### 2. 虚拟化

```typescript
// 大量图形时只渲染可见区域
function getVisibleShapes(shapes: Shape[], viewport: Viewport) {
  return shapes.filter(shape => 
    isInViewport(shape, viewport)
  );
}
```

### 3. 防抖/节流

```typescript
// 防抖：等待输入完成后执行
const debouncedSave = debounce(() => {
  saveToServer();
}, 500);

// 节流：限制执行频率
const throttledRender = throttle(() => {
  engine.render();
}, 16); // ~60fps
```

### 4. Memo 优化

```typescript
// 避免不必要的重渲染
const ToolbarAction = React.memo<ToolbarActionProps>(
  ({ engine, label }) => {
    return <button>{label}</button>;
  },
  (prev, next) => prev.engine === next.engine
);
```

## 扩展性设计

### 1. 插件化

引擎功能通过插件扩展。

```typescript
// 自定义插件
class CustomPlugin implements Plugin {
  id = 'custom-plugin';
  
  onAttach(engine: CanvasEngine): void {
    // 初始化
  }
  
  onDetach(): void {
    // 清理
  }
}

// 注册
engine.plugins.use(new CustomPlugin());
```

### 2. 主题化

支持浅色/深色主题。

```typescript
// 主题切换
function toggleTheme() {
  const newTheme = theme === 'light' ? 'dark' : 'light';
  
  // 更新 DOM
  document.documentElement.classList.toggle('dark');
  
  // 更新引擎
  engine.setTheme(newTheme);
  
  // 持久化
  localStorage.setItem('theme', newTheme);
}
```

### 3. 配置化

通过配置文件定制编辑器。

```typescript
// 节点模板配置
export const nodeTemplates = {
  rect: {
    size: { width: 120, height: 80 },
    data: {
      label: '矩形',
      fill: '#ffffff',
      stroke: '#000000'
    }
  },
  // ...
};
```

## 最佳实践

### 1. TypeScript 类型安全

```typescript
// 定义清晰的类型
interface NodeData {
  id: string;
  shape: string;
  position: Point;
  size: Size;
  data?: Record<string, any>;
}

// 使用类型守卫
function isNodeData(data: any): data is NodeData {
  return data && typeof data.id === 'string';
}
```

### 2. 错误边界

```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error) {
    console.error('Error:', error);
    // 上报错误
  }
  
  render() {
    return this.props.children;
  }
}
```

### 3. 资源清理

```typescript
useEffect(() => {
  const engine = new CanvasEngine({ container });
  
  // 清理函数
  return () => {
    engine.dispose();
  };
}, []);
```

### 4. 代码分割

```typescript
// 按路由分割
const routes = [
  {
    path: '/editor',
    element: <Editor />,
    // Vite 自动分割
  }
];
```
