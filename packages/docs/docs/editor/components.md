---
sidebar_position: 3
---

# 组件系统

Web 编辑器采用组件化设计，所有功能模块化封装。

## 组件分类

### 1. 页面组件 (Pages)
- **Editor**: 主编辑器页面
- **Viewer**: 只读查看器页面
- **Home**: 首页

### 2. 布局组件
- **Toolbar**: 顶部工具栏
- **ShapesPanel**: 左侧图形面板
- **PropertyPanel**: 右侧属性面板

### 3. 功能组件
- **工具栏操作**: 撤销/重做、缩放、节点控制等
- **面板组件**: 节点属性、边属性、画布设置等
- **通用组件**: Modal、Tooltip、ColorPicker 等

## 主要组件

### Editor (编辑器)

主编辑器页面，集成所有功能模块。

```typescript
import { CanvasEngine } from '@agilejs/core';
import Toolbar from '@/components/toolbar';
import PropertyPanel from '@/components/PropertyPanel';
import ShapesPanel from '@/components/ShapesPanel';

const Editor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const [engine, setEngine] = useState<CanvasEngine | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // 创建引擎
    const engine = new CanvasEngine({
      container: containerRef.current,
      background: '#ffffff',
      mode: 'edit'
    });
    
    // 注册渲染器
    registerRenderers(engine);
    
    // 注册插件
    registerPlugins(engine);
    
    // 启动引擎
    engine.start();
    
    engineRef.current = engine;
    setEngine(engine);
    
    return () => {
      engine.dispose();
    };
  }, []);
  
  return (
    <div className="h-screen flex flex-col">
      <Toolbar engine={engine} />
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />
        <ShapesPanel />
        <PropertyPanel engine={engine} />
      </div>
    </div>
  );
};

export default Editor;
```

**功能：**
- 引擎初始化
- 渲染器注册
- 插件注册
- 布局管理

### Toolbar (工具栏)

顶部工具栏，提供全局操作。

```typescript
interface ToolbarProps {
  engine: CanvasEngine | null;
  shapesOpen?: boolean;
  propertyOpen?: boolean;
  onToggleShapes?: () => void;
  onToggleProperty?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  engine,
  shapesOpen,
  propertyOpen,
  onToggleShapes,
  onToggleProperty
}) => {
  return (
    <div className="toolbar">
      {/* 品牌标识 */}
      <span>AgileJS Graph Editor</span>
      
      {/* 操作按钮 */}
      <UndoRedoAction engine={engine} />
      <FitAllAction engine={engine} />
      <NodeControlAction engine={engine} />
      <LayerArrangeAction engine={engine} />
      <EditJsonAction engine={engine} />
      <DebugAction engine={engine} />
      <HelpAction />
      
      {/* 右侧控制 */}
      <div className="ml-auto">
        <ZoomAction engine={engine} />
        <button onClick={onToggleShapes}>
          {shapesOpen ? '隐藏' : '显示'}图形面板
        </button>
        <button onClick={onToggleProperty}>
          {propertyOpen ? '隐藏' : '显示'}属性面板
        </button>
      </div>
    </div>
  );
};
```

**功能：**
- 撤销/重做
- 视图控制（适配、缩放）
- 节点控制（复制、删除、对齐）
- 图层控制（置顶、置底）
- 面板切换

### ShapesPanel (图形面板)

左侧图形面板，提供可拖拽的图形库。

```typescript
const ShapesPanel: React.FC<{ open?: boolean }> = ({ open }) => {
  const [search, setSearch] = useState('');
  
  return (
    <div className={`shapes-panel ${open ? 'open' : 'closed'}`}>
      {/* 搜索框 */}
      <input
        type="text"
        placeholder="搜索图形"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      {/* 分组列表 */}
      {paletteGroups.map(group => (
        <div key={group.key}>
          <h3>{group.label}</h3>
          <div className="grid grid-cols-4 gap-2">
            {group.items
              .filter(item => 
                item.label.toLowerCase().includes(search.toLowerCase())
              )
              .map(item => (
                <DraggableItem key={item.key} item={item} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

**功能：**
- 图形分组展示
- 搜索过滤
- 拖拽创建节点
- 折叠/展开

**图形分组：**
- 基础图形（矩形、圆形、菱形等）
- 流程图（开始/结束、判断、过程等）
- 箭头（右箭头、双向箭头等）
- 特殊图形（云朵、五角星等）

### DraggableItem (可拖拽项)

图形面板中的单个图形项。

```typescript
interface DraggableItemProps {
  item: PaletteItem;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ item }) => {
  const handleDragStart = (e: React.DragEvent) => {
    const data = JSON.stringify({
      shape: item.shape,
      key: item.key,
      payload: item.payload
    });
    
    e.dataTransfer.setData('application/agile-shape', data);
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  return (
    <div
      draggable={!item.disabled}
      onDragStart={handleDragStart}
      className="draggable-item"
      title={item.label}
    >
      {item.preview}
    </div>
  );
};
```

### PropertyPanel (属性面板)

右侧属性面板，编辑选中元素的属性。

```typescript
interface PropertyPanelProps {
  engine: CanvasEngine | null;
  visible?: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  engine,
  visible,
  theme,
  onToggleTheme
}) => {
  const [selectionKind, setSelectionKind] = useState<SelectionKind>('none');
  const [nodeDraft, setNodeDraft] = useState<any>({});
  const [edgeDraft, setEdgeDraft] = useState<any>({});
  
  // 监听选择变化
  useEffect(() => {
    if (!engine) return;
    
    const updateSelection = () => {
      const selectedNodes = engine.graph.getNodes().filter(n => n.selected);
      const selectedEdges = engine.graph.getEdges().filter(e => e.selected);
      
      if (selectedNodes.length === 1) {
        setSelectionKind('node-single');
        setNodeDraft(selectedNodes[0]);
      } else if (selectedNodes.length > 1) {
        setSelectionKind('node-multi');
      } else if (selectedEdges.length === 1) {
        setSelectionKind('edge-single');
        setEdgeDraft(selectedEdges[0]);
      } else if (selectedEdges.length > 1) {
        setSelectionKind('edge-multi');
      } else {
        setSelectionKind('none');
      }
    };
    
    engine.events.on('graph:selection-change', updateSelection);
    engine.events.on('graph:change', updateSelection);
    
    return () => {
      engine.events.off('graph:selection-change', updateSelection);
      engine.events.off('graph:change', updateSelection);
    };
  }, [engine]);
  
  return (
    <div className={`property-panel ${visible ? 'open' : 'closed'}`}>
      {/* 主题切换 */}
      <button onClick={onToggleTheme}>
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      
      {/* 根据选择显示不同面板 */}
      {selectionKind === 'none' && (
        <CanvasSettingsSection engine={engine} />
      )}
      
      {selectionKind === 'node-single' && (
        <NodeProperties engine={engine} node={nodeDraft} />
      )}
      
      {selectionKind === 'edge-single' && (
        <EdgeProperties engine={engine} edge={edgeDraft} />
      )}
      
      {(selectionKind === 'node-multi' || selectionKind === 'edge-multi') && (
        <div>已选择多个元素</div>
      )}
    </div>
  );
};
```

**功能：**
- 画布设置（背景、网格、参考线）
- 节点属性编辑（位置、大小、样式）
- 边属性编辑（类型、样式）
- 端口编辑
- 自定义数据编辑

### NodeProperties (节点属性)

节点属性编辑器。

```typescript
interface NodePropertiesProps {
  engine: CanvasEngine;
  node: NodeData;
}

const NodeProperties: React.FC<NodePropertiesProps> = ({ engine, node }) => {
  const handlePositionChange = (x: number, y: number) => {
    engine.history.execute(
      new MoveNodeCommand(engine.graph, node.id, { x, y })
    );
  };
  
  const handleSizeChange = (width: number, height: number) => {
    engine.history.execute(
      new ResizeNodeCommand(engine.graph, node.id, { width, height })
    );
  };
  
  const handleRotationChange = (rotation: number) => {
    engine.history.execute(
      new SetNodeRotationCommand(engine.graph, node.id, rotation)
    );
  };
  
  return (
    <div className="node-properties">
      <h3>节点属性</h3>
      
      {/* 位置 */}
      <div>
        <label>位置 X</label>
        <input
          type="number"
          value={node.position.x}
          onChange={(e) => 
            handlePositionChange(Number(e.target.value), node.position.y)
          }
        />
        
        <label>位置 Y</label>
        <input
          type="number"
          value={node.position.y}
          onChange={(e) => 
            handlePositionChange(node.position.x, Number(e.target.value))
          }
        />
      </div>
      
      {/* 尺寸 */}
      <div>
        <label>宽度</label>
        <input
          type="number"
          value={node.size.width}
          onChange={(e) => 
            handleSizeChange(Number(e.target.value), node.size.height)
          }
        />
        
        <label>高度</label>
        <input
          type="number"
          value={node.size.height}
          onChange={(e) => 
            handleSizeChange(node.size.width, Number(e.target.value))
          }
        />
      </div>
      
      {/* 旋转 */}
      <div>
        <label>旋转角度</label>
        <input
          type="number"
          value={node.rotation || 0}
          onChange={(e) => handleRotationChange(Number(e.target.value))}
        />
      </div>
      
      {/* 样式 */}
      <div>
        <label>填充颜色</label>
        <ColorPicker
          color={node.data?.fill || '#ffffff'}
          onChange={(color) => 
            engine.history.execute(
              new UpdateNodeDataCommand(
                engine.graph, 
                node.id, 
                { fill: color }
              )
            )
          }
        />
        
        <label>边框颜色</label>
        <ColorPicker
          color={node.data?.stroke || '#000000'}
          onChange={(color) => 
            engine.history.execute(
              new UpdateNodeDataCommand(
                engine.graph, 
                node.id, 
                { stroke: color }
              )
            )
          }
        />
      </div>
    </div>
  );
};
```

### EdgeProperties (边属性)

边属性编辑器。

```typescript
interface EdgePropertiesProps {
  engine: CanvasEngine;
  edge: EdgeData;
}

const EdgeProperties: React.FC<EdgePropertiesProps> = ({ engine, edge }) => {
  const handleShapeChange = (shape: string) => {
    engine.history.execute(
      new SetEdgeShapeCommand(engine.graph, edge.id, shape)
    );
  };
  
  const handleStyleChange = (key: string, value: any) => {
    engine.history.execute(
      new UpdateEdgeDataCommand(engine.graph, edge.id, { [key]: value })
    );
  };
  
  return (
    <div className="edge-properties">
      <h3>边属性</h3>
      
      {/* 类型 */}
      <div>
        <label>边类型</label>
        <select 
          value={edge.shape} 
          onChange={(e) => handleShapeChange(e.target.value)}
        >
          <option value="straight">直线</option>
          <option value="bezier">贝塞尔曲线</option>
          <option value="orthogonal">正交线</option>
          <option value="polyline">折线</option>
        </select>
      </div>
      
      {/* 样式 */}
      <div>
        <label>线条颜色</label>
        <ColorPicker
          color={edge.data?.stroke || '#000000'}
          onChange={(color) => handleStyleChange('stroke', color)}
        />
        
        <label>线条宽度</label>
        <input
          type="number"
          value={edge.data?.strokeWidth || 1}
          onChange={(e) => 
            handleStyleChange('strokeWidth', Number(e.target.value))
          }
        />
      </div>
      
      {/* 箭头 */}
      <div>
        <label>起点箭头</label>
        <select
          value={edge.data?.sourceArrow || 'none'}
          onChange={(e) => handleStyleChange('sourceArrow', e.target.value)}
        >
          <option value="none">无</option>
          <option value="arrow">箭头</option>
          <option value="diamond">菱形</option>
        </select>
        
        <label>终点箭头</label>
        <select
          value={edge.data?.targetArrow || 'arrow'}
          onChange={(e) => handleStyleChange('targetArrow', e.target.value)}
        >
          <option value="none">无</option>
          <option value="arrow">箭头</option>
          <option value="diamond">菱形</option>
        </select>
      </div>
    </div>
  );
};
```

## 工具栏组件

### UndoRedoAction (撤销/重做)

```typescript
interface UndoRedoActionProps {
  engine: CanvasEngine | null;
}

const UndoRedoAction: React.FC<UndoRedoActionProps> = ({ engine }) => {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  useEffect(() => {
    if (!engine) return;
    
    const update = () => {
      setCanUndo(engine.history.canUndo());
      setCanRedo(engine.history.canRedo());
    };
    
    update();
    
    engine.events.on('command:executed', update);
    engine.events.on('command:undone', update);
    engine.events.on('command:redone', update);
    
    return () => {
      engine.events.off('command:executed', update);
      engine.events.off('command:undone', update);
      engine.events.off('command:redone', update);
    };
  }, [engine]);
  
  const handleUndo = () => {
    engine?.history.undo();
  };
  
  const handleRedo = () => {
    engine?.history.redo();
  };
  
  return (
    <>
      <Tooltip content="撤销 (Ctrl+Z)">
        <button onClick={handleUndo} disabled={!canUndo}>
          ↶
        </button>
      </Tooltip>
      
      <Tooltip content="重做 (Ctrl+Shift+Z)">
        <button onClick={handleRedo} disabled={!canRedo}>
          ↷
        </button>
      </Tooltip>
    </>
  );
};
```

### ZoomAction (缩放控制)

```typescript
const ZoomAction: React.FC<{ engine: CanvasEngine | null }> = ({ engine }) => {
  const [scale, setScale] = useState(1);
  
  useEffect(() => {
    if (!engine) return;
    
    const update = () => {
      setScale(engine.getScale());
    };
    
    update();
    engine.events.on('viewportChanged', update);
    
    return () => engine.events.off('viewportChanged', update);
  }, [engine]);
  
  const handleZoomIn = () => {
    const newScale = Math.min(scale * 1.2, 5);
    engine?.setScale(newScale);
  };
  
  const handleZoomOut = () => {
    const newScale = Math.max(scale / 1.2, 0.1);
    engine?.setScale(newScale);
  };
  
  const handleResetZoom = () => {
    engine?.setScale(1);
  };
  
  return (
    <div className="zoom-action">
      <button onClick={handleZoomOut}>-</button>
      <span onClick={handleResetZoom}>
        {Math.round(scale * 100)}%
      </span>
      <button onClick={handleZoomIn}>+</button>
    </div>
  );
};
```

### NodeControlAction (节点控制)

```typescript
const NodeControlAction: React.FC<NodeControlActionProps> = ({ 
  engine, 
  selectedNodeCount 
}) => {
  const handleCopy = () => {
    // 使用 ClipboardPlugin
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'c', ctrlKey: true })
    );
  };
  
  const handleDelete = () => {
    if (!engine) return;
    
    const selected = engine.graph.getNodes().filter(n => n.selected);
    const commands = selected.map(node =>
      new RemoveNodeCommand(engine.graph, node.id)
    );
    
    engine.history.execute(new BatchCommand(commands));
  };
  
  const handleAlign = (direction: 'left' | 'center' | 'right') => {
    if (!engine) return;
    
    const selected = engine.graph.getNodes().filter(n => n.selected);
    // 实现对齐逻辑
  };
  
  return (
    <div className="node-control">
      <button onClick={handleCopy} disabled={selectedNodeCount === 0}>
        复制
      </button>
      <button onClick={handleDelete} disabled={selectedNodeCount === 0}>
        删除
      </button>
      <button onClick={() => handleAlign('left')} disabled={selectedNodeCount < 2}>
        左对齐
      </button>
    </div>
  );
};
```

## 通用组件

### Modal (模态框)

```typescript
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && <h2>{title}</h2>}
        {children}
        <button onClick={onClose}>关闭</button>
      </div>
    </div>
  );
};
```

### Tooltip (提示框)

```typescript
interface TooltipProps {
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
}

const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  placement = 'top', 
  children 
}) => {
  const [visible, setVisible] = useState(false);
  
  return (
    <div
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={`tooltip tooltip-${placement}`}>
          {content}
        </div>
      )}
    </div>
  );
};
```

### ColorPicker (颜色选择器)

```typescript
import { ChromePicker } from 'react-color';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const [displayPicker, setDisplayPicker] = useState(false);
  
  return (
    <div>
      <div
        className="color-swatch"
        style={{ backgroundColor: color }}
        onClick={() => setDisplayPicker(!displayPicker)}
      />
      
      {displayPicker && (
        <div className="color-picker-popover">
          <div 
            className="color-picker-cover" 
            onClick={() => setDisplayPicker(false)}
          />
          <ChromePicker
            color={color}
            onChange={(c) => onChange(c.hex)}
          />
        </div>
      )}
    </div>
  );
};
```

## 组件通信

### 1. Props 传递

```typescript
// 父组件
<PropertyPanel 
  engine={engine}
  visible={propertyOpen}
  onToggleTheme={handleToggleTheme}
/>

// 子组件
const PropertyPanel: React.FC<PropertyPanelProps> = ({
  engine,
  visible,
  onToggleTheme
}) => {
  // 使用 props
};
```

### 2. Context

```typescript
// 创建 Context
const EngineContext = React.createContext<CanvasEngine | null>(null);

// Provider
<EngineContext.Provider value={engine}>
  <Toolbar />
  <PropertyPanel />
</EngineContext.Provider>

// Consumer
const Toolbar = () => {
  const engine = useContext(EngineContext);
  // 使用 engine
};
```

### 3. Zustand Store ❗️

```typescript
// 定义 Store
const useCanvasStore = create<CanvasState>((set) => ({
  engine: null,
  setEngine: (engine) => set({ engine })
}));

// 使用
const Toolbar = () => {
  const { engine } = useCanvasStore();
  // 使用 engine
};
```

### 4. 事件总线

```typescript
// 订阅事件
engine.events.on('graph:selection-change', ({ nodes }) => {
  updateUI(nodes);
});

// 发布事件
engine.events.emit('graph:selection-change', { nodes: selected, edges: [], reason: 'manual' });
```

## 最佳实践

### 1. 组件拆分

保持组件职责单一，复杂组件拆分为子组件。

```typescript
// ❌ 不好：单个组件过大
const PropertyPanel = () => {
  // 1000+ 行代码
};

// ✅ 好：拆分子组件
const PropertyPanel = () => (
  <div>
    <NodeProperties />
    <EdgeProperties />
    <CanvasSettings />
  </div>
);
```

### 2. Hooks 封装

复用逻辑封装为自定义 Hook。

```typescript
// 封装选择状态
function useSelection(engine: CanvasEngine | null) {
  const [selected, setSelected] = useState<string[]>([]);
  
  useEffect(() => {
    if (!engine) return;
    
    const update = () => {
      const nodes = engine.graph.getNodes().filter(n => n.selected);
      setSelected(nodes.map(n => n.id));
    };
    
    engine.events.on('graph:selection-change', update);
    return () => engine.events.off('graph:selection-change', update);
  }, [engine]);
  
  return selected;
}

// 使用
const selected = useSelection(engine);
```

### 3. Memo 优化

避免不必要的重渲染。

```typescript
const ExpensiveComponent = React.memo<Props>(
  ({ data }) => {
    // 复杂渲染逻辑
  },
  (prev, next) => prev.data === next.data
);
```

### 4. 错误边界

捕获组件错误。

```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error) {
    console.error('Component error:', error);
  }
  
  render() {
    if (this.state.hasError) {
      return <div>出错了</div>;
    }
    return this.props.children;
  }
}
```
