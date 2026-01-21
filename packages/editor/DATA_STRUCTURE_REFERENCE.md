# 编辑器数据结构完整参考

## 📋 目录
1. [核心类型定义](#核心类型定义)
2. [节点数据结构](#节点数据结构)
3. [边数据结构](#边数据结构)
4. [锚点结构](#锚点结构)
5. [自定义数据](#自定义数据)
6. [AI 生成时的数据规范](#ai-生成时的数据规范)
7. [常见形状列表](#常见形状列表)
8. [实际示例](#实际示例)

---

## 核心类型定义

### 基础几何类型

```typescript
// 二维点坐标
interface Point {
  x: number;
  y: number;
}

// 尺寸（宽高）
interface Size {
  width: number;
  height: number;
}

// 唯一标识类型
type NodeId = string;
type EdgeId = string;
```

### 锚点位置枚举

```typescript
type AnchorPosition = 
  | 'top' | 'top-left' | 'top-right'
  | 'right' | 'right-top' | 'right-bottom'
  | 'bottom' | 'bottom-left' | 'bottom-right'
  | 'left' | 'left-top' | 'left-bottom'
  | 'center';
```

---

## 主题

### 浅色主题
```json
{
  "canvas": {
    "background": "#ffffff",
    "theme": "light",
    "grid": {
      "size": 20,
      "color": "#f3f4f6",
      "alpha": 1,
      "type": "line",
      "visible": true
    },
    "minimap": {
      "width": 200,
      "height": 140,
      "position": "bottom-right",
      "margin": 12,
      "padding": 5,
      "background": "rgba(0,0,0,0.04)",
      "borderColor": "#F3F3F3",
      "nodeColor": "#64748b",
      "edgeColor": "#94a3b8",
      "viewportStroke": "#3b82f6",
      "viewportFill": "rgba(59,130,246,0.18)",
      "showNodes": true,
      "showEdges": false,
      "clickToCenter": true,
      "draggableViewport": true,
      "maxEdgeCountForDraw": 1500,
      "focusMode": "auto",
      "focusViewportAreaThreshold": 0.08,
      "focusPadding": 0.25,
      "autoBlendLow": 0.08,
      "autoBlendHigh": 0.16,
      "responsive": true,
      "widthRatio": 0.22,
      "minWidth": 120,
      "maxWidth": 200,
      "syncContentWithZoom": true
    }
  }
}
```

### 深色主题

```json
{
  "canvas": {
    "background": "#0f172a",
    "theme": "dark",
    "grid": {
      "size": 20,
      "color": "#1f2937",
      "alpha": 1,
      "type": "line",
      "visible": true
    },
    "minimap": {
      "width": 200,
      "height": 140,
      "position": "bottom-right",
      "margin": 12,
      "padding": 5,
      "background": "rgba(255,255,255,0.06)",
      "borderColor": "#475569",
      "nodeColor": "#94a3b8",
      "edgeColor": "#94a3b8",
      "viewportStroke": "#38bdf8",
      "viewportFill": "rgba(56,189,248,0.18)",
      "showNodes": true,
      "showEdges": false,
      "clickToCenter": true,
      "draggableViewport": true,
      "maxEdgeCountForDraw": 1500,
      "focusMode": "auto",
      "focusViewportAreaThreshold": 0.08,
      "focusPadding": 0.25,
      "autoBlendLow": 0.08,
      "autoBlendHigh": 0.16,
      "responsive": true,
      "widthRatio": 0.22,
      "minWidth": 120,
      "maxWidth": 200,
      "syncContentWithZoom": true
    }
  }
}
```

## 节点数据结构

### 完整的 NodeData 接口

```typescript
interface NodeData {
  // ===== 必填字段 =====
  id: string;                      // 唯一标识（建议：node-1, node-2 等）
  shape: string;                   // 形状类型（见下方形状列表）
  position: Point;                 // 世界坐标位置 { x, y }
  size: Size;                      // 尺寸 { width, height }
  
  // ===== 可选基础属性 =====
  visible?: boolean;               // 是否可见（默认 true）
  selectable?: boolean;            // 是否可选中（默认 true）
  draggable?: boolean;             // 是否可拖拽（默认 true）
  resizable?: boolean;             // 是否可调节尺寸（默认 true）
  rotatable?: boolean;             // 是否可旋转（默认 true）
  
  // ===== 变换属性 =====
  rotation?: number;               // 旋转角度（弧度，范围 0-2π）
  zIndex?: number;                 // 层级（数字越大越靠前，默认 0）
  selected?: boolean;              // 是否当前被选中（默认 false）
  
  // ===== 组织属性（容器/分组） =====
  parentId?: string;               // 父节点 ID（容器）
  isContainer?: boolean;           // 是否为容器节点（容器可包裹子节点）
  groupId?: string;                // 直接所属组 ID（最内层组，向后兼容）
  groupPath?: string[];            // 完整组路径（从外到内，支持嵌套）
  
  // ===== 锚点（连接点）=====
  ports?: PortData[];              // 锚点列表
  
  // ===== 自定义数据 =====
  data?: NodeCustomData;           // 自定义数据（样式、标签、动画等）
}

// 节点自定义数据接口
interface NodeCustomData extends Record<string, unknown> {
  // ===== 显示 =====
  label?: string;                  // 节点标签文本
  showPorts?: boolean;             // 是否显示锚点（默认 true）

  // ===== 图片 / SVG =====
  image?: {
    src: string;                   // 图片 URL 或 base64
    fit?: 'fill' | 'contain' | 'cover';
  };
  svg?: {
    // svg-path
    path?: string;                 // 单一路径
    paths?: Array<{ d: string; fill?: string; stroke?: string;
    strokeWidth?: number; lineDash?: number[] } | string>;
    // svg-image
    xml?: string;                  // 完整 SVG XML
    viewBox?: { x: number; y: number; width: number; height: number };
    fit?: 'stretch' | 'contain' | 'cover';
  };
  
  // ===== 样式 =====
  style?: {
    fill?: string;                 // 填充色（十六进制如 '#4CAF50'）
    stroke?: string;               // 描边色
    lineWidth?: number;            // 描边宽度（像素）
    radius?: number;               // 圆角半径
    borderRadius?: number;         // 圆角半径（别名/常用字段）
    opacity?: number;              // 透明度（0-1）
    shadowColor?: string;          // 阴影颜色
    shadowBlur?: number;           // 阴影模糊度
    shadowOffset?: {x: number, y: number};  // 阴影偏移
    [key: string]: any;            // 其他形状特定样式
    label: {
      rotateWithNode: boolean;
      position: 'top' | 'right' | 'bottom' | 'left';
      maxWidth: number;
      textOverflow: 'wrap' | 'ellipsis';
      background: string;
      backgroundAlpha: number;
      color: string;
      fontSize: number;
      [key: string]: any;            // 其他形状特定样式
    }
  };
  
  // ===== 文本样式 =====
  textStyle?: {
    fontSize?: number;             // 字体大小
    fontFamily?: string;           // 字体
    fontColor?: string;            // 文字颜色
    textAlign?: 'left' | 'center' | 'right';
    textBaseline?: 'top' | 'middle' | 'bottom';
    [key: string]: any;
  };
  
  // ===== 动画 =====
  blink?: {                        // 闪烁动画
    enabled: boolean;              // 是否启用
    period: number;                // 周期（毫秒）
    min: number;                   // 最小透明度（0-1）
    max: number;                   // 最大透明度（0-1）
  };
  
  // ===== 业务数据 =====
  custom?: Record<string, any>;    // 完全自定义的业务数据
  
  // 可以添加任何其他业务相关字段
  [key: string]: any;
}
```

### 最小化的节点示例（仅必填字段）

```typescript
const minimalNode: NodeData = {
  id: 'node-1',
  shape: 'rect',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 80 }
};
```

### 完整的节点示例（包含所有常用字段）

```typescript
const fullNode: NodeData = {
  id: 'node-1',
  shape: 'rect',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 80 },
  
  // 基础属性
  visible: true,
  selectable: true,
  draggable: true,
  resizable: true,
  rotatable: true,
  
  // 变换
  rotation: 0,
  zIndex: 1,
  selected: false,
  
  // 组织
  groupId: undefined,
  groupPath: undefined,
  
  // 自定义数据
  data: {
    label: '开始节点',
    showPorts: true,
    style: {
      fill: '#4CAF50',
      stroke: '#2E7D32',
      lineWidth: 2,
      radius: 4,
      opacity: 1,
      label: {
        rotateWithNode: false,
        position: "right",
        maxWidth: 160,
        textOverflow: "wrap",
        background: "#eef2ff",
        backgroundAlpha: 1,
        color: "#1f2937",
        fontSize: 12
      }
    },
    textStyle: {
      fontSize: 14,
      fontFamily: 'Arial',
      fontColor: '#fff',
      textAlign: 'center',
      textBaseline: 'middle'
    },
    blink: {
      enabled: false,
      period: 1000,
      min: 0.5,
      max: 1
    },
    custom: {
      category: 'process',
      priority: 'high'
    }
  }
};

---

## 扩展节点类型（image / svg-path / svg-image）

示例参考：packages/editor/src/mock/examples/default.json

这些类型是“内容驱动”的容器型节点，核心数据位于 `data.image` 或 `data.svg`：

### image（位图）

```typescript
const imageNode: NodeData = {
  id: 'img-1',
  shape: 'image',
  position: { x: 120, y: 120 },
  size: { width: 240, height: 160 },
  data: {
    image: {
      src: 'https://example.com/image.png', // URL 或 base64
      fit: 'contain' // fill | contain | cover
    },
    style: {
      borderRadius: 8,
      lineWidth: 1,
      stroke: '#e5e7eb'
    },
    label: '图片节点'
  }
};
```

### svg-path（SVG Path 矢量）

```typescript
const svgPathNode: NodeData = {
  id: 'svg-path-1',
  shape: 'svg-path',
  position: { x: 120, y: 320 },
  size: { width: 160, height: 160 },
  data: {
    svg: {
      path: 'M10 10 H 90 V 90 H 10 Z',
      // 或 paths: [{ d, fill, stroke, strokeWidth, lineDash, fillRule, lineCap, lineJoin, miterLimit, fillAlpha, strokeAlpha }]
      viewBox: { x: 0, y: 0, width: 100, height: 100 },
      fit: 'contain' // stretch | contain | cover
    },
    style: {
      fill: '#22c55e',
      stroke: '#16a34a',
      lineWidth: 1.5
    },
    label: 'SVG Path'
  }
};
```

### svg-image（完整 SVG XML）

```typescript
const svgImageNode: NodeData = {
  id: 'svg-image-1',
  shape: 'svg-image',
  position: { x: 320, y: 320 },
  size: { width: 160, height: 160 },
  data: {
    svg: {
      xml: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#60a5fa"/></svg>',
      viewBox: { x: 0, y: 0, width: 100, height: 100 },
      fit: 'contain' // stretch | contain | cover
    },
    style: {
      alpha: 1
    },
    label: 'SVG XML'
  }
};
```

---

## 容器与分组节点（isContainer / parentId / groupPath）

容器节点用于包裹子节点，`parentId` 表示容器归属；分组节点使用 `groupId`/`groupPath` 表示层级关系。

```typescript
const containerNode: NodeData = {
  id: 'container-1',
  shape: 'rect',
  position: { x: 80, y: 80 },
  size: { width: 420, height: 240 },
  isContainer: true,
  data: {
    label: '容器节点',
    style: {
      fill: 'rgba(255,255,255,0.6)',
      stroke: '#94a3b8',
      lineWidth: 1,
      borderRadius: 8
    }
  }
};

const childNode: NodeData = {
  id: 'child-1',
  shape: 'rect',
  position: { x: 120, y: 140 },
  size: { width: 140, height: 80 },
  parentId: 'container-1',
  groupPath: ['group-A', 'group-A-1'],
  data: { label: '容器内子节点' }
};
```
```

---

## 边数据结构

### 完整的 EdgeData 接口

```typescript
interface EdgeData {
  // ===== 必填字段 =====
  id: string;                      // 唯一标识（建议：edge-1, edge-2 等）
  shape: string;                   // 边形状（见下方边形状列表）
  source: string;                  // 源节点 ID
  target: string;                  // 目标节点 ID
  
  // ===== 连接点 =====
  sourcePortId?: string;           // 源锚点 ID（不指定则连接到节点中心）
  targetPortId?: string;           // 目标锚点 ID
  points?: Point[];                // 控制点（用于 polyline 等）
  
  // ===== 可选基础属性 =====
  visible?: boolean;               // 是否可见（默认 true）
  selectable?: boolean;            // 是否可选中（默认 true）
  selected?: boolean;              // 是否当前被选中（默认 false）
  zIndex?: number;                 // 层级（默认 0）
  
  // ===== 自定义数据 =====
  data?: EdgeCustomData;           // 自定义数据（样式、标签、动画等）
}

// 边自定义数据接口
interface EdgeCustomData extends Record<string, unknown> {
  // ===== 显示 =====
  label?: string;                  // 边标签文本
  
  // ===== 样式 =====
  style?: {
    stroke?: string;               // 边颜色（十六进制）
    lineWidth?: number;            // 线宽（像素）
    dashArray?: number[];          // 虚线数组 [实线长, 虚线长]
    opacity?: number;              // 透明度（0-1）
    lineCap?: 'butt' | 'round' | 'square';  // 线端样式
    lineJoin?: 'miter' | 'bevel' | 'round'; // 线连接样式
    shadowColor?: string;          // 阴影颜色
    shadowBlur?: number;           // 阴影模糊度
    [key: string]: any;
  };
  
  // ===== 管道样式（特殊用途） =====
  pipeline?: {
    outerWidth?: number;           // 外层宽度
    innerWidth?: number;           // 内层宽度
    gap?: number;                  // 内外层间隙
    cornerRadius?: number;         // 拐角圆角半径
    stub?: number;                 // 起始或结束延伸长度
  };
  
  // ===== 流动动画 =====
  flow?: {
    enabled?: boolean;             // 是否启用流动动画
    speed?: number;                // 流动速度（像素/秒）
    color?: string;                // 流动色
    direction?: 'forward' | 'reverse';  // 流动方向
  };
  
  // ===== 业务数据 =====
  custom?: Record<string, any>;    // 完全自定义的业务数据
  
  // 可以添加任何其他业务相关字段
  [key: string]: any;
}
```

### 最小化的边示例（仅必填字段）

```typescript
const minimalEdge: EdgeData = {
  id: 'edge-1',
  shape: 'edge-straight',
  source: 'node-1',
  target: 'node-2'
};
```

### 完整的边示例（包含所有常用字段）

```typescript
const fullEdge: EdgeData = {
  id: 'edge-1',
  shape: 'edge-straight',
  source: 'node-1',
  target: 'node-2',
  
  // 连接点
  sourcePortId: undefined,
  targetPortId: undefined,
  points: undefined,
  
  // 基础属性
  visible: true,
  selectable: true,
  selected: false,
  zIndex: 0,
  
  // 自定义数据
  data: {
    label: '流转',
    style: {
      stroke: '#2196F3',
      lineWidth: 2,
      dashArray: undefined,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    },
    flow: {
      enabled: false,
      speed: 10,
      color: '#2196F3',
      direction: 'forward'
    },
    custom: {
      type: 'process_flow',
      condition: 'approved'
    }
  }
};
```

---

## 锚点结构

### PortData 接口

```typescript
interface PortData {
  id: string;                      // 锚点唯一标识
  anchorMode?: 'relative' | 'absolute';  // 锚点模式
  anchorPosition?: AnchorPosition;  // 相对锚点位置
  offset: Point;                   // 偏移量 { x, y }
  radius?: number;                 // 可视半径（像素）
  label?: string;                  // 显示名称
}
```

### 锚点示例

```typescript
const portsExample: PortData[] = [
  {
    id: 'port-top',
    anchorPosition: 'top',
    offset: { x: 0, y: 0 },
    radius: 5,
    label: 'Input'
  },
  {
    id: 'port-right',
    anchorPosition: 'right',
    offset: { x: 0, y: 0 },
    radius: 5,
    label: 'Output'
  },
  {
    id: 'port-bottom',
    anchorPosition: 'bottom',
    offset: { x: 0, y: 0 },
    radius: 5,
    label: 'Feedback'
  }
];
```

---

## 自定义数据

### data 字段的灵活性

`data` 字段是 `Record<string, unknown>` 类型，可以存储任何自定义数据。这为 AI 生成和扩展提供了极大的灵活性：

```typescript
// 示例 1：业务流程数据
const businessNode: NodeData = {
  id: 'node-order',
  shape: 'rect',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 80 },
  data: {
    label: '订单处理',
    style: { fill: '#2196F3' }
  }
};

// 示例 2：组织结构数据
const orgNode: NodeData = {
  id: 'node-dept',
  shape: 'rect',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 80 },
  data: {
    label: '技术部',
    style: { fill: '#4CAF50' }
  }
};

// 示例 3：机器学习模型
const mlNode: NodeData = {
  id: 'node-model',
  shape: 'rect',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 80 },
  data: {
    label: 'Model V2',
    style: { fill: '#FF9800' }
  }
};
```

---

## AI 生成时的数据规范

### AI 输出的 JSON 格式（推荐，可直接应用）

```json
{
  "type": "agilejs-scene",
  "mode": "append",
  "data": {
    "canvas": {
      "background": "#ffffff",
      "theme": "light"
    },
    "nodes": [
    {
      "id": "node-1",
      "shape": "rect",
      "position": { "x": 100, "y": 100 },
      "size": { "width": 120, "height": 80 },
      "data": {
        "label": "开始",
        "style": {
          "fill": "#4CAF50",
          "stroke": "#2E7D32",
          "lineWidth": 2
        }
      }
    },
    {
      "id": "node-2",
      "shape": "rect",
      "position": { "x": 100, "y": 250 },
      "size": { "width": 120, "height": 80 },
      "data": {
        "label": "处理",
        "style": {
          "fill": "#2196F3",
          "stroke": "#1565C0",
          "lineWidth": 2
        }
      }
    },
    {
      "id": "node-3",
      "shape": "rect",
      "position": { "x": 100, "y": 400 },
      "size": { "width": 120, "height": 80 },
      "data": {
        "label": "结束",
        "style": {
          "fill": "#F44336",
          "stroke": "#C62828",
          "lineWidth": 2
        }
      }
    }
    ],
    "edges": [
    {
      "id": "edge-1",
      "shape": "edge-straight",
      "source": "node-1",
      "target": "node-2",
      "data": {
        "label": "流转",
        "style": {
          "stroke": "#666",
          "lineWidth": 2
        }
      }
    },
    {
      "id": "edge-2",
      "shape": "edge-straight",
      "source": "node-2",
      "target": "node-3",
      "data": {
        "label": "完成",
        "style": {
          "stroke": "#666",
          "lineWidth": 2
        }
      }
    }
    ]
  }
}
```

**字段说明**
- `type`: 固定为 `agilejs-scene`（用于识别可应用的内容）
- `mode`: `append` | `replace`
  - `append`：追加到当前画布（保留原有节点/边）
  - `replace`：替换整个画布（等价于 fromScene）
- `data.canvas`: 可选，画布配置（背景、主题、viewport、grid、guides、minimap 等）
- `data.nodes` / `data.edges`: 图数据

### AI 生成的验证规则

AI 生成的节点必须满足以下规则：

```typescript
// 验证函数
function validateNodeData(node: any): boolean {
  // 必填字段检查
  if (!node.id || typeof node.id !== 'string') return false;
  if (!node.shape || typeof node.shape !== 'string') return false;
  if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') return false;
  if (!node.size || typeof node.size.width !== 'number' || typeof node.size.height !== 'number') return false;
  
  // 尺寸合理性检查
  if (node.size.width <= 0 || node.size.height <= 0) return false;
  
  // 位置合理性检查（可选）
  if (node.position.x < -5000 || node.position.x > 10000) return false;
  if (node.position.y < -5000 || node.position.y > 10000) return false;
  
  // 样式检查（可选）
  if (node.data?.style?.lineWidth !== undefined && node.data.style.lineWidth < 0) return false;
  
  return true;
}

function validateEdgeData(edge: any): boolean {
  // 必填字段检查
  if (!edge.id || typeof edge.id !== 'string') return false;
  if (!edge.shape || typeof edge.shape !== 'string') return false;
  if (!edge.source || typeof edge.source !== 'string') return false;
  if (!edge.target || typeof edge.target !== 'string') return false;
  
  return true;
}
```

---

## 编辑器与画布引擎 API 集成（应用到画布）

### 0) 画布状态（canvas）字段范围（与引擎一致）

`canvas` 支持以下字段（未提供则保持当前值）：

- `background`: 背景色
- `theme`: `light` | `dark`
- `viewport`: 视口
  - `scale`: 缩放比例
  - `translation`: 平移 `{ x, y }`
- `edgeSnapshotMode`: `auto` | `off` | `always`
- `interactionConfig`: 交互配置（由引擎读取）
- `dprDegradation`: DPR 降级配置（由引擎读取）
- `grid`: 网格配置 `{ size, color, alpha, type, visible }`
- `guides`: 参考线配置 `{ threshold, color, visible }`
- `minimap`: 迷你地图配置（透传到 MinimapPlugin）

### 1) 替换场景（mode = replace）

```typescript
import { fromScene } from '@fnt-agilejs/core'

fromScene(engine, {
  canvas: { background: '#ffffff', theme: 'light' },
  nodes,
  edges
})
```

说明：`fromScene` 会清空当前图数据并重新加载（不会写入历史栈）。

### 2) 追加节点/边（mode = append）

```typescript
import { AddNodeCommand, AddEdgeCommand } from '@fnt-agilejs/core'

engine.history.beginTransaction('AI Apply')
nodes.forEach((n) => engine.history.execute(new AddNodeCommand(engine.graph, n)))
edges.forEach((e) => engine.history.execute(new AddEdgeCommand(engine.graph, e)))
engine.history.commitTransaction()
```

说明：追加时先添加节点、再添加边，确保 `source`/`target` 已存在。

### 3) 容器/分组场景落地要点

- 先创建容器节点（`isContainer: true`）
- 再创建子节点并设置 `parentId` 指向容器
- 分组使用 `groupPath`（从外到内）或 `groupId`


---

## 常见形状列表

### 节点形状

| 形状名称 | 形状值 | 描述 | 适用场景 |
|---------|-------|------|---------|
| 矩形 | `rect` | 标准矩形，可调节圆角 | 流程图、组织结构 |
| 圆形 | `circle` | 完美圆形 | 流程图、数据模型 |
| 菱形 | `diamond` | 菱形（决策节点） | 流程图决策点 |
| 星形 | `star` | 五角星 | 重点标记 |
| 三角形 | `triangle` | 等腰三角形 | 流程方向指示 |
| 六边形 | `hexagon` | 六边形 | 流程图、工作流 |
| 圆柱 | `cylinder` | 圆柱形 | 数据库、存储 |
| 十字 | `cross` | 十字形 | 连接点、中心 |
| 平行四边形 | `parallelogram` | 平行四边形 | 流程图输入/输出 |
| 椭圆 | `ellipse` | 椭圆形 | 流程开始/结束 |
| 半圆 | `semicircle` | 半圆 | 特殊用途 |
| 梯形 | `trapezoid` | 梯形 | 流程分流 |
| 五边形 | `pentagon` | 五边形 | 组织结构 |
| 八边形 | `octagon` | 八边形 | 安全、警告 |
| 扇形 | `sector` | 扇形 | 统计图表 |
| 直角三角形 | `right-triangle` | 直角三角形 | 方向指示 |
| 圆角 | `corner` | 圆角形 | 视觉美化 |
| 云形 | `cloud` | 云形 | 云计算相关 |
| 图片 | `image` | 位图图片（URL/base64） | 图片/素材 |
| SVG 路径 | `svg-path` | SVG path 矢量 | 图标/矢量 |
| SVG 图像 | `svg-image` | 完整 SVG XML（有时简称 svg） | 图标/矢量 |

### 边形状

| 边形状 | 形状值 | 描述 | 适用场景 |
|--------|-------|------|---------|
| 直线 | `edge-straight` | 直线连接 | 标准连接 |
| 贝塞尔曲线 | `edge-bezier` | 光滑曲线 | 美观布局 |
| 正交线 | `edge-orthogonal` | 水平竖直的折线 | 工程制图 |
| 折线 | `edge-polyline` | 任意控制点的折线 | 自定义路由 |

---

## 实际示例

### 示例 1：简单流程图

```typescript
const flowchartData = {
  nodes: [
    {
      id: 'start',
      shape: 'ellipse',
      position: { x: 200, y: 50 },
      size: { width: 100, height: 60 },
      data: {
        label: '开始',
        style: { fill: '#4CAF50', stroke: '#2E7D32' }
      }
    },
    {
      id: 'process',
      shape: 'rect',
      position: { x: 200, y: 200 },
      size: { width: 120, height: 80 },
      data: {
        label: '处理数据',
        style: { fill: '#2196F3', stroke: '#1565C0' }
      }
    },
    {
      id: 'decision',
      shape: 'diamond',
      position: { x: 200, y: 400 },
      size: { width: 100, height: 100 },
      data: {
        label: '是否成功？',
        style: { fill: '#FF9800', stroke: '#F57C00' }
      }
    },
    {
      id: 'success',
      shape: 'rect',
      position: { x: 50, y: 600 },
      size: { width: 100, height: 60 },
      data: {
        label: '成功',
        style: { fill: '#4CAF50', stroke: '#2E7D32' }
      }
    },
    {
      id: 'fail',
      shape: 'rect',
      position: { x: 350, y: 600 },
      size: { width: 100, height: 60 },
      data: {
        label: '失败',
        style: { fill: '#F44336', stroke: '#C62828' }
      }
    }
  ],
  edges: [
    {
      id: 'e1',
      shape: 'edge-straight',
      source: 'start',
      target: 'process',
      data: { style: { stroke: '#666', lineWidth: 2 } }
    },
    {
      id: 'e2',
      shape: 'edge-straight',
      source: 'process',
      target: 'decision',
      data: { style: { stroke: '#666', lineWidth: 2 } }
    },
    {
      id: 'e3',
      shape: 'edge-straight',
      source: 'decision',
      target: 'success',
      data: { label: '是', style: { stroke: '#666', lineWidth: 2 } }
    },
    {
      id: 'e4',
      shape: 'edge-straight',
      source: 'decision',
      target: 'fail',
      data: { label: '否', style: { stroke: '#666', lineWidth: 2 } }
    }
  ]
};
```

### 示例 2：组织结构图

```typescript
const orgchartData = {
  nodes: [
    {
      id: 'ceo',
      shape: 'rect',
      position: { x: 200, y: 20 },
      size: { width: 100, height: 60 },
      data: {
        label: 'CEO',
        style: { fill: '#E91E63', stroke: '#880E4F' },
        org: { title: 'CEO', department: 'Executive' }
      }
    },
    {
      id: 'cto',
      shape: 'rect',
      position: { x: 50, y: 150 },
      size: { width: 100, height: 60 },
      data: {
        label: 'CTO',
        style: { fill: '#2196F3', stroke: '#1565C0' },
        org: { title: 'CTO', department: 'Technology' }
      }
    },
    {
      id: 'cfo',
      shape: 'rect',
      position: { x: 200, y: 150 },
      size: { width: 100, height: 60 },
      data: {
        label: 'CFO',
        style: { fill: '#2196F3', stroke: '#1565C0' },
        org: { title: 'CFO', department: 'Finance' }
      }
    },
    {
      id: 'coo',
      shape: 'rect',
      position: { x: 350, y: 150 },
      size: { width: 100, height: 60 },
      data: {
        label: 'COO',
        style: { fill: '#2196F3', stroke: '#1565C0' },
        org: { title: 'COO', department: 'Operations' }
      }
    }
  ],
  edges: [
    {
      id: 'e1',
      shape: 'edge-straight',
      source: 'ceo',
      target: 'cto',
      data: { style: { stroke: '#666', lineWidth: 2 } }
    },
    {
      id: 'e2',
      shape: 'edge-straight',
      source: 'ceo',
      target: 'cfo',
      data: { style: { stroke: '#666', lineWidth: 2 } }
    },
    {
      id: 'e3',
      shape: 'edge-straight',
      source: 'ceo',
      target: 'coo',
      data: { style: { stroke: '#666', lineWidth: 2 } }
    }
  ]
};
```

### 示例 3：数据流图

```typescript
const dataflowData = {
  nodes: [
    {
      id: 'source',
      shape: 'rect',
      position: { x: 50, y: 100 },
      size: { width: 100, height: 60 },
      data: {
        label: '数据源',
        style: { fill: '#4CAF50' },
        dataflow: { type: 'source', format: 'JSON' }
      }
    },
    {
      id: 'process1',
      shape: 'rect',
      position: { x: 200, y: 100 },
      size: { width: 100, height: 60 },
      data: {
        label: '转换',
        style: { fill: '#2196F3' },
        dataflow: { type: 'transform', operation: 'map' }
      }
    },
    {
      id: 'process2',
      shape: 'rect',
      position: { x: 350, y: 100 },
      size: { width: 100, height: 60 },
      data: {
        label: '聚合',
        style: { fill: '#2196F3' },
        dataflow: { type: 'aggregate', operation: 'reduce' }
      }
    },
    {
      id: 'sink',
      shape: 'rect',
      position: { x: 500, y: 100 },
      size: { width: 100, height: 60 },
      data: {
        label: '输出',
        style: { fill: '#F44336' },
        dataflow: { type: 'sink', format: 'CSV' }
      }
    }
  ],
  edges: [
    {
      id: 'e1',
      shape: 'edge-straight',
      source: 'source',
      target: 'process1',
      data: {
        style: { stroke: '#666', lineWidth: 2 },
        flow: { enabled: true, speed: 5, color: '#2196F3' }
      }
    },
    {
      id: 'e2',
      shape: 'edge-straight',
      source: 'process1',
      target: 'process2',
      data: {
        style: { stroke: '#666', lineWidth: 2 },
        flow: { enabled: true, speed: 5, color: '#2196F3' }
      }
    },
    {
      id: 'e3',
      shape: 'edge-straight',
      source: 'process2',
      target: 'sink',
      data: {
        style: { stroke: '#666', lineWidth: 2 },
        flow: { enabled: true, speed: 5, color: '#2196F3' }
      }
    }
  ]
};
```

---

## AI 生成时的检查清单

### ✅ 节点数据检查

- [ ] 所有节点都有唯一的 `id`
- [ ] 所有节点都指定了有效的 `shape`
- [ ] 所有节点都有 `position` 和 `size`
- [ ] 尺寸大于 0（width > 0, height > 0）
- [ ] 位置在合理范围内（-5000 到 10000）
- [ ] 颜色值格式正确（十六进制 #RRGGBB）
- [ ] `data.label` 不超过 20 个字符（可选，用于布局合理性）
- [ ] 没有引用不存在的 groupId 或 parentId

### ✅ 边数据检查

- [ ] 所有边都有唯一的 `id`
- [ ] 所有边都指定了有效的 `shape`
- [ ] 所有边的 `source` 和 `target` 都指向存在的节点
- [ ] `sourcePortId` 和 `targetPortId`（如果指定）指向有效的端口
- [ ] 没有重复的边（同一对节点的多条边应有不同目的）
- [ ] 颜色值格式正确

### ✅ 布局检查

- [ ] 节点没有过度重叠
- [ ] 连接关系清晰，边没有过长
- [ ] 整体布局在 5000x5000 像素以内

---

## 性能考虑

### 大规模数据处理

```typescript
// 处理大量节点时的建议
interface PerformanceOptimizations {
  // 1. 批量操作使用事务
  batchOperations: () => {
    engine.history.beginTransaction('Batch Add Nodes');
    // 添加多个节点
    engine.history.commitTransaction();
  },
  
  // 2. 延迟渲染
  deferredRendering: () => {
    engine.stop();
    // 添加所有节点和边
    engine.start();
  },
  
  // 3. 分页加载
  paginate: (nodes: NodeData[], pageSize: number = 100) => {
    let page = 0;
    const loadNextPage = () => {
      const start = page * pageSize;
      const end = start + pageSize;
      // 添加这一页的节点
      page++;
    };
  },
  
  // 4. 空间索引
  useSpatialIndex: () => {
    // 编辑器已内置空间索引优化
  }
}
```

---

**参考资源**：
- 核心文档：`packages/core/src/model/Graph.ts`
- API 文档：`packages/docs/docs/canvas/api/graph.md`
- 节点文档：`packages/docs/docs/canvas/nodes.md`
- 边文档：`packages/docs/docs/canvas/edges.md`

**其他**
- 美化与重新排版时，不要新增节点和边
- 颜色仅支持16进制、rgb、rgba，不支持渐变色
- 边的label只能字符串（不同于节点中的label）
- 节点内部涉及文本的优先text属性，节点附带的label通常在其周围
- 整体回答精炼、简洁，直接输出核心内容