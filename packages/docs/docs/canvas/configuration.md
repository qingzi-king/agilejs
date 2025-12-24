---
sidebar_position: 1
---

# 配置

## 概述

CanvasEngine 提供了丰富的配置选项，用于控制引擎的行为、性能和交互方式。

## 基础配置

### 必需配置

```typescript
import { CanvasEngine } from '@agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas')!, // 容器元素（必需）
});
```

### 完整配置示例

:::tip

Agilejs Graph 是一个无边界画布，若不设置画布尺寸将自适应父级容器尺寸。

:::

```typescript
const engine = new CanvasEngine({
  // 必需：挂载容器
  container: document.getElementById('canvas')!,
  
  // 画布尺寸（可选，默认自适应容器）
  width: 1920,
  height: 1080,
  
  // 背景颜色（可选）
  background: '#ffffff',
  
  // 运行模式（可选，默认 'edit'）
  mode: 'edit', // 'edit' | 'view' | 'none'
  
  // 交互控制配置
  interactionConfig: {
    enableZoom: true,       // 是否允许缩放
    enablePan: true,        // 是否允许平移
    enableSelection: true,  // 是否允许节点选中
    enableDrag: true,       // 是否允许节点拖拽
    enableResize: true,     // 是否允许节点缩放
    enableRotate: true,     // 是否允许节点旋转
  },
  
  // 边快照模式
  edgeSnapshot: 'auto', // 'auto' | 'off' | 'always'
  
  // 性能优化配置
  dragEdgeRenderThreshold: {
    nodes: 400,  // 拖拽时节点数阈值
    edges: 800   // 拖拽时边数阈值
  },
  
  labelRenderThreshold: {
    nodes: 1500,  // 标签渲染节点数阈值
    edges: 3000   // 标签渲染边数阈值
  },
  
  aggressiveDegradation: {
    totalNodes: 5000,   // 激进降质节点总数阈值
    totalEdges: 10000   // 激进降质边总数阈值
  },
  
  // 空间索引配置
  spatialIndex: {
    enabled: true,              // 是否启用四叉树
    maxItems: 16,              // 每个节点最大项目数
    maxDepth: 8,               // 最大深度
    disableDuringDrag: true,   // 拖拽时禁用
    padding: 32                // 边界填充
  }
});
```

## 配置项详解

### container

**类型**: `HTMLElement`  
**必需**: 是

引擎挂载的 DOM 容器元素。Canvas 元素将被创建并添加到此容器中。

```typescript
const container = document.getElementById('my-canvas');
const engine = new CanvasEngine({ container });
```

### width / height

**类型**: `number`  
**可选**: 是  
**默认值**: 容器的 `clientWidth` 和 `clientHeight`

画布的初始宽度和高度（像素）。如果不指定，将自动使用容器尺寸，并在容器尺寸变化时自动调整。

```typescript
const engine = new CanvasEngine({
  container,
  width: 1920,
  height: 1080
});
```

### background

**类型**: `string`  
**可选**: 是  
**默认值**: 透明

画布背景颜色，支持任何有效的 CSS 颜色值。

```typescript
const engine = new CanvasEngine({
  container,
  background: '#f0f0f0'  // 浅灰色背景
});

// 也可以使用 rgba
const engine2 = new CanvasEngine({
  container,
  background: 'rgba(240, 240, 240, 0.5)'  // 半透明背景
});
```

### mode

**类型**: `'edit' | 'view' | 'none'`  
**可选**: 是  
**默认值**: `'edit'`

引擎的运行模式，影响交互插件的启用状态：

- **`'edit'`**: 编辑模式，所有交互功能启用
- **`'view'`**: 查看模式，适合只读展示场景
- **`'none'`**: 无交互模式，完全静态展示

```typescript
// 编辑器模式
const editor = new CanvasEngine({
  container,
  mode: 'edit'
});

// 查看器模式（如报表展示）
const viewer = new CanvasEngine({
  container,
  mode: 'view',
  interactionConfig: {
    enableZoom: true,
    enablePan: true,
    enableSelection: false,
    enableDrag: false
  }
});

// 静态展示模式（如截图、导出）
const static = new CanvasEngine({
  container,
  mode: 'none',
  interactionConfig: {
    enableZoom: false,
    enablePan: false,
    enableSelection: false,
    enableDrag: false
  }
});
```

### interactionConfig

**类型**: `InteractionConfig`  
**可选**: 是

全局交互控制配置，用于精细控制用户交互行为。详见 [交互配置文档](./interaction/config.md)。

```typescript
interface InteractionConfig {
  enableZoom?: boolean;      // 是否允许缩放（默认 true）
  enablePan?: boolean;       // 是否允许平移（默认 true）
  enableSelection?: boolean; // 是否允许节点选中（默认 true）
  enableDrag?: boolean;      // 是否允许节点拖拽（默认 true）
  enableResize?: boolean;    // 是否允许节点缩放（默认 true）
  enableRotate?: boolean;    // 是否允许节点旋转（默认 true）
}
```

### edgeSnapshot

**类型**: `'auto' | 'off' | 'always'`  
**可选**: 是  
**默认值**: `'auto'`

边渲染快照模式，影响边的渲染性能：

- **`'auto'`** (推荐): 智能模式
  - 无动画时使用快照缓存
  - 有流动动画时每帧重绘
  
- **`'off'`**: 关闭快照
  - 每帧在世界空间直接绘制边
  - 适合边经常变化的场景
  
- **`'always'`**: 始终使用快照
  - 即使有动画也使用快照（动画会被"冻结"）
  - 适合静态场景或不需要动画的场景

```typescript
// 推荐：自动模式
const engine = new CanvasEngine({
  container,
  edgeSnapshot: 'auto'
});

// 边经常变化的场景
const dynamicEngine = new CanvasEngine({
  container,
  edgeSnapshot: 'off'
});
```

### spatialIndex

**类型**: `SpatialIndexConfig`  
**可选**: 是

四叉树空间索引配置，用于优化可视裁剪和碰撞检测。

```typescript
interface SpatialIndexConfig {
  enabled?: boolean;           // 是否启用（默认 true）
  maxItems?: number;          // 每个节点最大项目数（默认 16）
  maxDepth?: number;          // 最大深度（默认 8）
  disableDuringDrag?: boolean;// 拖拽时禁用（默认 true）
  padding?: number;           // 边界填充（默认 32）
}
```

示例：

```typescript
const engine = new CanvasEngine({
  container,
  spatialIndex: {
    enabled: true,
    maxItems: 32,              // 增加容量
    maxDepth: 10,              // 增加深度
    disableDuringDrag: true,   // 拖拽时禁用避免频繁重建
    padding: 64                // 增加填充范围
  }
});
```

### 性能优化配置

#### dragEdgeRenderThreshold

**类型**: `{ nodes?: number; edges?: number }`  
**默认值**: `{ nodes: 400, edges: 800 }`

拖拽时的边渲染阈值。当可视区域内的节点或边数量超过阈值时，拖拽过程中不渲染边以保持流畅性。

```typescript
const engine = new CanvasEngine({
  container,
  dragEdgeRenderThreshold: {
    nodes: 200,   // 更激进的降质策略
    edges: 400
  }
});
```

#### labelRenderThreshold

**类型**: `{ nodes?: number; edges?: number }`  
**默认值**: `{ nodes: 1500, edges: 3000 }`

标签渲染阈值。在重负载场景中，当节点或边数量超过阈值时跳过标签绘制以保持性能。

```typescript
const engine = new CanvasEngine({
  container,
  labelRenderThreshold: {
    nodes: 1000,  // 降低阈值，更早跳过标签
    edges: 2000
  }
});
```

#### aggressiveDegradation

**类型**: `{ totalNodes?: number; totalEdges?: number }`  
**默认值**: `{ totalNodes: 5000, totalEdges: 10000 }`

大规模场景激进降质阈值。基于图形总数量（而非可视数量）判断，超过阈值时自动采用激进降质策略（即识别为isHugeScene超大规模场景）。

```typescript
const engine = new CanvasEngine({
  container,
  aggressiveDegradation: {
    totalNodes: 3000,   // 更早触发降质
    totalEdges: 6000
  }
});
```

## 动态配置

某些配置可以在运行时动态修改：

### 交互配置

```typescript
// 动态修改交互配置
engine.setInteractionConfig({
  enableZoom: false,
  enablePan: false
});

// 获取当前交互配置
const config = engine.getInteractionConfig();
console.log(config.enableDrag); // true/false
```

### 主题

```typescript
// 切换主题
engine.setTheme('dark');  // 'light' | 'dark'

// 获取当前主题
const theme = engine.getTheme(); // 'light' | 'dark'
```

### 视口

```typescript
// 设置缩放
engine.setScale(1.5);

// 获取当前缩放
const scale = engine.getScale();

// 设置平移
engine.setTranslation(100, 50);

// 获取当前平移
const translation = engine.getTranslation();
console.log(translation.x, translation.y);

// 在指定屏幕坐标处缩放
engine.zoomAt(1.2, screenX, screenY);

// 适配视口（自动缩放和居中）
// 默认适配全部节点，相当于"居中到内容"
engine.fitView();

// 仅适配选中节点
engine.fitView({ selectionOnly: true });

// 自定义边距和缩放限制
engine.fitView({
  padding: 60,      // 边距（像素，默认 40）
  minScale: 0.5,    // 最小缩放（默认 0.1）
  maxScale: 5       // 最大缩放（默认 10）
});
```

### 数据导入导出

引擎提供了完整的数据序列化功能，支持图数据和场景数据的导入导出。

#### 图数据序列化（仅节点和边）

```typescript
import { toJSON, fromJSON } from '@agilejs/core';

// 导出图数据（仅包含节点和边）
const graphData = toJSON(engine.graph);
console.log(graphData);
// {
//   nodes: [...],
//   edges: [...]
// }

// 保存到本地存储
localStorage.setItem('graph', JSON.stringify(graphData));

// 从 JSON 加载图数据
const savedData = JSON.parse(localStorage.getItem('graph')!);
fromJSON(engine.graph, savedData);
```

#### 场景序列化（完整画布状态）

场景序列化包含更多信息：图数据 + 画布状态（视口、主题、背景、插件配置等）。

```typescript
import { toScene, fromScene } from '@agilejs/core';

// 导出完整场景（包含画布状态和图数据）
const sceneData = toScene(engine);
console.log(sceneData);
// {
//   canvas: {
//     background: '#ffffff',
//     theme: 'light',
//     viewport: { scale: 1, translation: { x: 0, y: 0 } },
//     edgeSnapshotMode: 'auto',
//     grid: { size: 20, color: '#e0e0e0', alpha: 0.3, type: 'dot', visible: true },
//     guides: { threshold: 5, color: '#ff0000' },
//     minimap: { ... }
//   },
//   nodes: [...],
//   edges: [...]
// }

// 保存场景
const sceneJson = JSON.stringify(sceneData);
localStorage.setItem('scene', sceneJson);

// 加载场景（自动恢复画布状态和图数据）
const savedScene = JSON.parse(localStorage.getItem('scene')!);
fromScene(engine, savedScene);
```

#### 场景数据结构

**GraphJSON** (图数据)：
```typescript
interface GraphJSON {
  nodes: NodeData[];  // 节点数组
  edges: EdgeData[];  // 边数组
}
```

**SceneJSON** (场景数据)：
```typescript
interface SceneJSON extends GraphJSON {
  canvas?: {
    background?: string;                    // 背景色
    theme?: 'light' | 'dark';              // 主题
    viewport?: {                           // 视口状态
      scale?: number;
      translation?: { x: number; y: number };
    };
    edgeSnapshotMode?: 'auto' | 'off' | 'always';  // 边快照模式
    grid?: {                               // 网格插件配置
      size?: number;
      color?: string;
      alpha?: number;
      type?: 'line' | 'dot';
      visible?: boolean;
    };
    guides?: {                             // 导轨插件配置
      threshold?: number;
      color?: string;
    };
    minimap?: Record<string, any>;         // 迷你地图插件配置
  };
}
```

#### 实际应用示例

**文件保存/加载**：

```typescript
// 保存到文件
function saveToFile() {
  const scene = toScene(engine);
  const blob = new Blob([JSON.stringify(scene, null, 2)], { 
    type: 'application/json' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-diagram.json';
  a.click();
  URL.revokeObjectURL(url);
}

// 从文件加载
function loadFromFile(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const scene = JSON.parse(e.target!.result as string);
    fromScene(engine, scene);
  };
  reader.readAsText(file);
}
```

**自动保存**：

```typescript
// 监听图变化，自动保存
engine.graph.events.on('changed', () => {
  const scene = toScene(engine);
  localStorage.setItem('autosave', JSON.stringify(scene));
});

// 启动时恢复
function restoreAutosave() {
  const saved = localStorage.getItem('autosave');
  if (saved) {
    try {
      const scene = JSON.parse(saved);
      fromScene(engine, scene);
    } catch (e) {
      console.error('Failed to restore autosave:', e);
    }
  }
}
```

**服务端同步**：

```typescript
// 保存到服务器
async function saveToServer() {
  const scene = toScene(engine);
  const response = await fetch('/api/diagrams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scene)
  });
  const { id } = await response.json();
  return id;
}

// 从服务器加载
async function loadFromServer(id: string) {
  const response = await fetch(`/api/diagrams/${id}`);
  const scene = await response.json();
  fromScene(engine, scene);
}
```

#### 注意事项

1. **数据安全性**：序列化会自动过滤掉不可 JSON 化的对象（如 DOM 元素、Image 对象等）
2. **增量更新**：`fromScene` 会先清空现有图数据，再加载新数据
3. **插件依赖**：加载场景时，相关插件必须已经注册，否则对应配置会被忽略
4. **向后兼容**：建议在 `node.data` 中保存版本号，便于数据格式升级

```typescript
// 推荐：在数据中包含版本信息
const scene = toScene(engine);
const dataWithVersion = {
  version: '1.0.0',
  ...scene
};

// 加载时检查版本
function loadScene(data: any) {
  if (data.version !== '1.0.0') {
    // 执行数据迁移
    data = migrateData(data);
  }
  fromScene(engine, data);
}
```

## 最佳实践

### 1. 根据场景选择模式

```typescript
// 编辑器场景
const editor = new CanvasEngine({
  container,
  mode: 'edit',
  interactionConfig: {
    enableZoom: true,
    enablePan: true,
    enableSelection: true,
    enableDrag: true
  }
});

// 数据可视化场景
const dashboard = new CanvasEngine({
  container,
  mode: 'view',
  interactionConfig: {
    enableZoom: true,
    enablePan: true,
    enableSelection: false,
    enableDrag: false
  }
});
```

### 2. 大规模场景优化

:::tip

对于非编辑场景可以不加载可视化编辑插件（如：API控制图形场景）。

:::

```typescript
const largeScale = new CanvasEngine({
  container,
  // 启用激进降质
  aggressiveDegradation: {
    totalNodes: 3000,
    totalEdges: 6000
  },
  // 降低拖拽阈值
  dragEdgeRenderThreshold: {
    nodes: 200,
    edges: 400
  },
  // 优化空间索引
  spatialIndex: {
    enabled: true,
    maxItems: 32,
    maxDepth: 10
  }
});
```

### 3. 移动端适配

```typescript
const mobile = new CanvasEngine({
  container,
  // 移动端推荐更激进的性能配置
  dragEdgeRenderThreshold: {
    nodes: 150,
    edges: 300
  },
  labelRenderThreshold: {
    nodes: 800,
    edges: 1600
  }
});
```

## 常见问题

### Q: 如何禁用所有交互？

```typescript
const engine = new CanvasEngine({
  container,
  mode: 'none',
  interactionConfig: {
    enableZoom: false,
    enablePan: false,
    enableSelection: false,
    enableDrag: false
  }
});
```

### Q: 如何实现只读查看器？

```typescript
const viewer = new CanvasEngine({
  container,
  mode: 'view',
  interactionConfig: {
    enableZoom: true,      // 允许缩放查看细节
    enablePan: true,       // 允许平移浏览
    enableSelection: false,// 禁止选中
    enableDrag: false      // 禁止拖拽
  }
});
```

### Q: 性能不佳怎么办？

主要措施：
1. 降低渲染阈值
2. 启用激进降质
3. 优化空间索引配置
4. 使用 `edgeSnapshot: 'always'` 固定边快照
