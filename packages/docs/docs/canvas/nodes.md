---
sidebar_position: 3
---

# 节点

## 节点数据结构

### 基础接口

```typescript
interface NodeData {
  id: string;                    // 唯一标识
  shape: string;                 // 形状类型
  position: Point;               // 位置 { x, y }
  size: Size;                    // 尺寸 { width, height }
  visible?: boolean;             // 是否可见（默认 true）
  selectable?: boolean;          // 是否可选中（默认 true），对API操作不限制
  draggable?: boolean;           // 是否可拖拽（默认 true），对API操作不限制
  resizable?: boolean;           // 是否可调节尺寸（默认 true），对API操作不限制
  rotatable?: boolean;           // 是否可旋转（默认 true），对API操作不限制
  rotation?: number;             // 旋转角度（弧度）
  zIndex?: number;               // 层级（默认 0）
  selected?: boolean;            // 是否选中
  groupId?: string;              // 所属组ID
  groupPath?: string[];          // 组路径（支持嵌套）
  ports?: PortData[];            // 锚点列表
  data?: NodeCustomData;         // 自定义数据
}

interface NodeCustomData {
  label?: string;                // 节点标签文本
  showPorts?: boolean;           // 是否显示锚点（默认 true）
  style?: {                      // 样式配置
    fill?: string;               // 填充色
    stroke?: string;             // 描边色
    lineWidth?: number;          // 描边宽度
    radius?: number;             // 圆角半径
    alpha?: number;              // 整体透明度
    label?: {                    // 标签样式
      color?: string;            // 文字颜色
      fontSize?: number;         // 字体大小
      position?: 'top' | 'center' | 'bottom';  // 标签位置
      background?: string;       // 背景色
      backgroundAlpha?: number;  // 背景透明度
    };
    text?: {
      color?: string
      [key: string]: any;        // 其他文本特定样式
    };
    lineDash?: number[];         // 虚线段
    flow?: {
      enabled?: boolean;         // 边框流动是否启用
      speed?: number;            // 流速（线段沿用lineDash属性）
    };
    [key: string]: any;          // 其他形状特定样式
  };
  blink?: {                      // 闪烁动画配置
    enabled: boolean;            // 是否启用
    period: number;              // 周期（毫秒）
    min: number;                 // 最小透明度
    max: number;                 // 最大透明度
  };
  custom?: Record<string, any>;  // 完全自定义的业务数据
  [key: string]: any;            // 其他扩展字段
}

interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}
```

### 属性说明

#### NodeData 核心属性

| 属性名 | 类型 | 默认值 | 必选 | 描述 |
|--------|------|--------|------|------|
| id | string | - | ✓ | 节点唯一标识 |
| shape | string | - | ✓ | 形状类型（rect、circle、diamond 等） |
| position | Point | - | ✓ | 节点位置 `{ x, y }` |
| size | Size | - | ✓ | 节点尺寸 `{ width, height }` |
| visible | boolean | true | - | 是否可见，为 false 时不渲染也不可交互 |
| selectable | boolean | true | - | 是否允许被选中，为 false 时点击/框选不会改变选中态 `对API操作不限制` |
| draggable | boolean | true | - | 是否允许被拖拽，为 false 时不参与拖动 `对API操作不限制` |
| resizable | boolean | true | - | 是否允许被调节尺寸，为 false 时不可调节 `对API操作不限制` |
| rotatable | boolean | true | - | 是否允许被旋转，为 false 时不可旋转 `对API操作不限制` |
| rotation | number | 0 | - | 旋转角度（角度制，非弧度） |
| zIndex | number | 0 | - | 层级，数值越大越靠前 |
| selected | boolean | false | - | 是否选中 |
| groupId | string | - | - | 所属组 ID（最内层组） |
| groupPath | string[] | - | - | 完整组路径（从外到内），支持嵌套分组 |
| ports | PortData[] | - | - | 锚点列表 |
| data | NodeCustomData | - | - | 自定义数据（样式、标签、动画等） |

#### NodeCustomData 扩展属性

| 属性名 | 类型 | 默认值 | 必选 | 描述 |
|--------|------|--------|------|------|
| label | string | - | - | 节点标签文本 |
| showPorts | boolean | true | - | 是否显示锚点（隐藏后仍可连线） |
| style | object | - | - | 样式配置对象 |
| blink | object | - | - | 闪烁动画配置 |
| custom | object | - | - | 完全自定义的业务数据 |

#### style 样式属性（常用）

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| fill | string | - | 填充色（如 '#3b82f6'） |
| stroke | string | - | 描边色 |
| lineWidth | number | 1 | 描边宽度 |
| radius | number | 0 | 圆角半径（仅矩形） |
| alpha | number | 1 | 整体透明度（0-1） |
| lineDash | number[] | - | 虚线样式（如 [5, 5]） |
| label | LabelStyle | - | 标签样式配置（见下表） |
| text | TextStyle | - | 文本样式配置（见下表） |
| flow | FlowStyle | - | 流动动画配置（见下表） |

#### label 标签样式属性

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| color | string | '#000000' | 文字颜色 |
| fontSize | number | 12 | 字体大小（像素） |
| position | 'top \| 'right' \| 'bottom' \| 'left' \| 'center' | 'center' | 标签显示位置 |
| background | string | - | 标签背景色 |
| backgroundAlpha | number | 1 | 背景透明度（0-1） |

#### text 文本样式属性

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| color | string | '#000000' | 文本颜色 |
| fontSize | number | 14 | 字体大小（像素） |
| fontFamily | string | 'sans-serif' | 字体族 |
| fontWeight | string | 'normal' | 字体粗细（normal、bold 等） |
| textAlign | string | 'left' | 水平对齐（left、center、right） |
| textBaseline | string | 'alphabetic' | 垂直对齐（top、middle、bottom 等） |

#### flow 流动动画配置

| 属性名 | 类型 | 默认值 | 必选 | 描述 |
|--------|------|--------|------|------|
| enabled | boolean | false | - | 是否启用边框流动效果 |
| speed | number | 160 | - | 流动速度px/s（线段沿用 lineDash 属性） |

#### blink 闪烁动画配置

| 属性名 | 类型 | 默认值 | 必选 | 描述 |
|--------|------|--------|------|------|
| enabled | boolean | - | ✓ | 是否启用闪烁 |
| period | number | - | ✓ | 闪烁周期（毫秒） |
| min | number | - | ✓ | 最小透明度（0-1） |
| max | number | - | ✓ | 最大透明度（0-1） |

## 创建节点

### 基础节点

```typescript
const node = {
  id: 'node-1',
  shape: 'rect',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 80 }
};

engine.graph.addNode(node);
```

### 完整配置

```typescript
const node = {
  "id": "n1",
  "shape": "rect",
  "position": { "x": 98, "y": 106 },
  "size": { "width": 120, "height": 80 },
  "selectable": true,
  "draggable": true,
  "resizable": true,
  "rotatable": true,
  "selected": false,
  "data": {
    "label": "圆角矩形-中心",
    "style": {
      "label": {
        "color": "#111827",
        "fontSize": 12,
        "position": "center",
        "background": "#ffffff",
        "backgroundAlpha": 1
      },
      "fill": "#ffffff",
      "stroke": "#111827",
      "lineWidth": 2,
      "radius": 8,
      "lineDash": [6, 3]
    },
    "blink": {
      "enabled": false,
      "period": 800,
      "min": 0.3,
      "max": 1
    },
    "custom": {
      "code": "n1",
      "name": "圆角矩形",
      "local": "位于画布左上角"
    }
  },
  "ports": [
    {
      "id": "t",
      "offset": { "x": 60, "y": 0 }
    },
    {
      "id": "r",
      "offset": { "x": 120, "y": 40 }
    },
    {
      "id": "b",
      "offset": { "x": 60, "y": 80 }
    },
    {
      "id": "l",
      "offset": { "x": 0, "y": 40 }
    }
  ]
};

engine.graph.addNode(node);
```

## 内置形状

Canvas 引擎内置了丰富的图形类型，可直接使用。通过设置节点的 `shape` 属性来指定图形类型。

### 图形总览

:::caution

除了基础的图形外，image、svg-path、svg-image为扩展图形，它们更似一类容器，根据传入的不同内容呈现。

:::

| 图形类型 | shape 值 | 描述 | 特殊属性 |
|---------|---------|------|---------|
| 矩形 | rect | 基础矩形，支持圆角 | cornerRadius |
| 圆形 | circle | 标准圆形 | - |
| 椭圆 | ellipse | 椭圆形 | - |
| 菱形 | diamond | 四边相等的菱形 | - |
| 三角形 | triangle | 等腰三角形 | - |
| 直角三角形 | right-triangle | 直角三角形 | - |
| 五边形 | pentagon | 正五边形 | - |
| 六边形 | hexagon | 正六边形 | - |
| 八边形 | octagon | 正八边形 | - |
| 星形 | star | 多角星形 | points（角数） |
| 直线/折线 | line | 支持多点折线 | points, borderRadius |
| 圆柱 | cylinder | 3D 圆柱效果 | - |
| 梯形 | trapezoid | 上窄下宽梯形 | - |
| 平行四边形 | parallelogram | 平行四边形 | - |
| 扇形 | sector | 扇形/圆弧 | startAngle, endAngle |
| 半圆 | semicircle | 半圆形 | - |
| 云朵 | cloud | 云朵形状 | - |
| 右箭头 | right-arrow | 单向右箭头 | - |
| 双向箭头 | double-arrow | 双向箭头 | - |
| 十字 | cross | 十字形 | - |
| 直角 | corner | L形直角 | - |
| 文本 | text | 纯文本节点 | text, fontSize, fontFamily 等 |
| 图片 | image | 位图图片（URL/base64） | src, fit（fill/contain/cover） |
| SVG路径 | svg-path | SVG path 矢量图形 | path/paths, viewBox, fit |
| SVG图像 | svg-image | 完整 SVG XML | xml, viewBox, fit |

### 使用示例

### rect - 矩形

```typescript
{
  "id": "rect-1",
  "shape": "rect",
  "position": { "x": 100, "y": 100 },
  "size": { "width": 120," height": 80 },
  "data": {
    "label": "矩形",
    "fill": "#3b82f6",
    "stroke": "#1e40af",
    "strokeWidth": 2,
    "cornerRadius": 4  // 圆角
  }
}
```

### circle - 圆形

```typescript
{
  "id": "circle-1",
  "shape": "circle",
  "position": { "x": 200, "y": 200 },
  "size": { "width": 80, "height": 80 },  // 使用 width 作为直径
  "data": {
    "label": "圆形",
    "fill": "#10b981",
    "stroke": "#059669"
  }
}
```

### ellipse - 椭圆

```typescript
{
  "id": "ellipse-1",
  "shape": "ellipse",
  "position": { "x": 300, "y": 300 },
  "size": { "width": 120," height": 60 },
  "data": {
    "label": "椭圆",
    "fill": "#f59e0b",
    "stroke": "#d97706"
  }
}
```

### diamond - 菱形

```typescript
{
  "id": "diamond-1",
  "shape": "diamond",
  "position": { "x": 400, "y": 400 },
  "size": { "width": 100," height": 100 },
  "data": {
    "label": "菱形",
    "fill": "#ec4899",
    "stroke": "#db2777"
  }
}
```

### triangle - 三角形

```typescript
{
  "id": "triangle-1",
  "shape": "triangle",
  "position": { "x": 500, "y": 500 },
  "size": { "width": 80, "height": 80 },
  "data": {
    "label": "三角形",
    "fill": "#8b5cf6",
    "stroke": "#7c3aed"
  }
}
```

### hexagon - 六边形

```typescript
{
  "id": "hexagon-1",
  "shape": "hexagon",
  "position": { "x": 600, "y": 600 },
  "size": { "width": 100," height": 100 },
  "data": {
    "label": "六边形",
    "fill": "#06b6d4",
    "stroke": "#0891b2"
  }
}
```

### pentagon - 五边形

```typescript
{
  "id": "pentagon-1",
  "shape": "pentagon",
  "position": { "x": 650, "y": 650 },
  "size": { "width": 100," height": 100 },
  "data": {
    "label": "五边形",
    "fill": "#a855f7",
    "stroke": "#9333ea"
  }
}
```

### octagon - 八边形

```typescript
{
  "id": "octagon-1",
  "shape": "octagon",
  "position": { "x": 750, "y": 750 },
  "size": { "width": 100," height": 100 },
  "data": {
    "label": "八边形",
    "fill": "#ef4444",
    "stroke": "#dc2626"
  }
}
```

### star - 星形

```typescript
{
  "id": "star-1",
  "shape": "star",
  "position": { "x": 700, "y": 700 },
  "size": { "width": 80, "height": 80 },
  "data": {
    "label": "星形",
    "fill": "#eab308",
    "stroke": "#ca8a04",
    "points": 5  // 星形角数
  }
}
```

### line - 直线/折线

```typescript
{
  "id": "line-1",
  "shape": "line",
  "position": { "x": 100, "y": 100 },
  "size": { "width": 200, "height": 100 },
  "data": {
    "line": {
      // 折点坐标（相对于 position）
      "points": [
        { "x": 0, "y": 0 },
        { "x": 100, "y": 50 },
        { "x": 200, "y": 100 }
      ],
      "borderRadius": 10  // 折点圆角半径（可选）
    },
    "style": {
      "stroke": "#3b82f6",
      "lineWidth": 3,
      "lineCap": "round",      // 线端样式：butt | round | square
      "lineJoin": "round",     // 连接样式：miter | round | bevel
      "lineDash": [5, 5]       // 虚线样式
    }
  }
}
```

### cylinder - 圆柱

```typescript
{
  "id": "cylinder-1",
  "shape": "cylinder",
  "position": { "x": 300, "y": 300 },
  "size": { "width": 100, "height": 150 },
  "data": {
    "label": "圆柱",
    "fill": "#10b981",
    "stroke": "#059669"
  }
}
```

### trapezoid - 梯形

```typescript
{
  "id": "trapezoid-1",
  "shape": "trapezoid",
  "position": { "x": 400, "y": 400 },
  "size": { "width": 120, "height": 80 },
  "data": {
    "label": "梯形",
    "fill": "#f59e0b",
    "stroke": "#d97706"
  }
}
```

### sector - 扇形

```typescript
{
  "id": "sector-1",
  "shape": "sector",
  "position": { "x": 500, "y": 500 },
  "size": { "width": 100, "height": 100 },
  "data": {
    "label": "扇形",
    "fill": "#ec4899",
    "stroke": "#db2777",
    "startAngle": 0,      // 起始角度（度数）
    "endAngle": 90        // 结束角度（度数）
  }
}
```

### cloud - 云朵

```typescript
{
  "id": "cloud-1",
  "shape": "cloud",
  "position": { "x": 600, "y": 600 },
  "size": { "width": 120, "height": 80 },
  "data": {
    "label": "云朵",
    "fill": "#dbeafe",
    "stroke": "#3b82f6"
  }
}
```

### parallelogram - 平行四边形

```typescript
{
  "id": "parallelogram-1",
  "shape": "parallelogram",
  "position": { "x": 700, "y": 700 },
  "size": { "width": 120, "height": 80 },
  "data": {
    "label": "平行四边形",
    "fill": "#a78bfa",
    "stroke": "#7c3aed"
  }
}
```

### right-arrow - 右箭头

```typescript
{
  "id": "right-arrow-1",
  "shape": "right-arrow",
  "position": { "x": 100, "y": 200 },
  "size": { "width": 150, "height": 60 },
  "data": {
    "label": "右箭头",
    "fill": "#60a5fa",
    "stroke": "#2563eb"
  }
}
```

### double-arrow - 双向箭头

```typescript
{
  "id": "double-arrow-1",
  "shape": "double-arrow",
  "position": { "x": 300, "y": 200 },
  "size": { "width": 150, "height": 60 },
  "data": {
    "label": "双向箭头",
    "fill": "#34d399",
    "stroke": "#10b981"
  }
}
```

### semicircle - 半圆

```typescript
{
  "id": "semicircle-1",
  "shape": "semicircle",
  "position": { "x": 500, "y": 200 },
  "size": { "width": 100, "height": 50 },
  "data": {
    "label": "半圆",
    "fill": "#fbbf24",
    "stroke": "#f59e0b"
  }
}
```

### right-triangle - 直角三角形

```typescript
{
  "id": "right-triangle-1",
  "shape": "right-triangle",
  "position": { "x": 700, "y": 200 },
  "size": { "width": 80, "height": 80 },
  "data": {
    "label": "直角三角形",
    "fill": "#f87171",
    "stroke": "#ef4444"
  }
}
```


### cross - 十字

```typescript
{
  "id": "cross-1",
  "shape": "cross",
  "position": { "x": 100, "y": 400 },
  "size": { "width": 80, "height": 80 },
  "data": {
    "label": "十字",
    "fill": "#4ade80",
    "stroke": "#22c55e"
  }
}
```

### corner - 直角

```typescript
{
  "id": "corner-1",
  "shape": "corner",
  "position": { "x": 300, "y": 400 },
  "size": { "width": 80, "height": 80 },
  "data": {
    "label": "直角",
    "fill": "#c084fc",
    "stroke": "#a855f7"
  }
}
```

### text - 文本

```typescript
{
  "id": "text-1",
  "shape": "text",
  "position": { "x": 900, "y": 900 },
  "size": { "width": 200, "height": 50 },
  "data": {
    "text": "文本节点",
    "fontSize": 16,
    "fontFamily": "sans-serif",
    "fontWeight": "normal",
    "textAlign": "center",
    "textBaseline": "middle",
    "color": "#000000"
  }
}
```

### image - 图片

支持显示位图图片，可以使用 URL 或 base64 格式，支持多种适配模式。

**基本用法**：

```typescript
{
  "id": "image-1",
  "shape": "image",
  "position": { "x": 800, "y": 800 },
  "size": { "width": 200, "height": 150 },
  "data": {
    "image": {
      "src": "https://example.com/image.png",  // 图片源（URL 或 base64）
      "fit": "fill"  // 适配模式：fill | contain | cover
    },
    "style": {
      "stroke": "#e5e7eb",    // 边框颜色
      "lineWidth": 1,         // 边框宽度
      "borderRadius": 4       // 圆角半径
    }
  }
}
```

**使用 URL**：

```typescript
{
  "id": "image-url",
  "shape": "image",
  "position": { "x": 100, "y": 100 },
  "size": { "width": 200, "height": 150 },
  "data": {
    "image": {
      "src": "https://docs.cq-tct.com/desp/images/logo_002.png",
      "fit": "fill"
    }
  }
}
```

**使用 base64**：

```typescript
{
  "id": "image-base64",
  "shape": "image",
  "position": { "x": 300, "y": 100 },
  "size": { "width": 150, "height": 150 },
  "data": {
    "image": {
      "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...",
      "fit": "cover"
    },
    "style": {
      "stroke": "#3b82f6",
      "lineWidth": 2,
      "borderRadius": 8
    }
  }
}
```

**配置说明**：

| 属性 | 类型 | 默认值 | 描述 |
|-----|------|--------|------|
| src | string | - | 图片源，支持 URL 或 base64 格式 |
| fit | string | 'fill' | 适配模式，见下表 |

**适配模式（fit）**：

| 模式 | 描述 | 效果 |
|-----|------|------|
| fill | 拉伸填充 | 完全填充节点区域，不保持宽高比，可能变形 |
| contain | 完整显示 | 完整显示图片，保持宽高比，可能留白 |
| cover | 覆盖填充 | 覆盖整个节点区域，保持宽高比，可能裁剪 |

**样式配置**：

```typescript
{
  "data": {
    "image": {
      "src": "https://example.com/photo.jpg",
      "fit": "cover"
    },
    "style": {
      "stroke": "#10b981",      // 边框颜色
      "lineWidth": 3,           // 边框宽度
      "borderRadius": 12,       // 圆角半径
      "alpha": 0.9              // 整体透明度
    }
  }
}
```

**从剪贴板粘贴图片**：

使用 ClipboardPlugin 可以直接从系统剪贴板粘贴图片：

```typescript
import { ClipboardPlugin } from '@agilejs/core';

// 配置图片粘贴参数
engine.plugins.use(new ClipboardPlugin({
  maxWidth: 800,              // 图片最大宽度
  maxHeight: 800,             // 图片最大高度
  maxSize: 1024 * 1024,       // 最大文件大小（1MB）
  quality: 0.85,              // 压缩质量
  defaultSize: { width: 200, height: 150 }  // 默认节点尺寸
}));

// 使用方法：
// 1. 从截图工具或网页复制图片
// 2. 点击画布使其获得焦点
// 3. 按 Cmd/Ctrl+V 粘贴
// 自动创建 image 类型的节点，使用 base64 格式存储
```

**图片缓存**：

ImageRenderer 内置图片缓存机制，相同 src 的图片只会加载一次：

```typescript
// 多个节点使用相同图片，只加载一次
const nodes = [
  {
    id: "img1",
    shape: "image",
    data: { image: { src: "https://example.com/logo.png" } }
  },
  {
    id: "img2",
    shape: "image",
    data: { image: { src: "https://example.com/logo.png" } }  // 复用缓存
  }
];
```

**加载状态处理**：

图片加载过程中会显示占位符，加载失败也会显示占位符：

```typescript
// 图片加载中或失败时，会显示灰色占位符和图标
// 无需额外配置，自动处理
```

**最佳实践**：

1. **选择合适的 fit 模式**：
   - 图标、logo 使用 `contain`
   - 背景图、照片使用 `cover`
   - 需要完整显示且不介意变形时使用 `fill`

2. **优化图片大小**：
   - 使用 ClipboardPlugin 粘贴时会自动压缩
   - 手动添加时建议预先压缩图片
   - 避免使用超大尺寸图片

3. **使用 base64 vs URL**：
   - base64：适合小图片、截图，无需额外请求，但会增加 JSON 大小
   - URL：适合大图片、复用图片，需要网络请求，但 JSON 更小

4. **处理跨域图片**：
   ```typescript
   // 确保图片服务器支持 CORS
   // 或使用 base64 格式避免跨域问题
   ```

**注意事项**：

- 图片加载是异步的，大图片可能需要一些时间
- base64 格式会增加 JSON 数据大小，建议压缩后再使用
- URL 图片需要考虑网络延迟和跨域问题
- 图片缓存基于 src 字符串，相同 URL 会复用缓存

### svg-path - SVG 路径

使用 SVG Path 数据绘制矢量图形，支持单个路径或多个路径组合。

**单个路径**：

```typescript
{
  "id": "svg-path-1",
  "shape": "svg-path",
  "position": { "x": 100, "y": 100 },
  "size": { "width": 100, "height": 100 },
  "data": {
    "svg": {
      // SVG path 数据
      "path": "M10,30 A20,20 0,0,1 50,30 A20,20 0,0,1 90,30 Q90,60 50,90 Q10,60 10,30 z",
      // viewBox 定义路径坐标系（默认 0,0,100,100）
      "viewBox": { "x": 0, "y": 0, "width": 100, "height": 100 },
      // 适配模式：stretch | contain(默认) | cover
      "fit": "stretch"
    },
    "style": {
      "fill": "#ef4444",        // 填充色
      "stroke": "#991b1b",      // 描边色
      "lineWidth": 2,           // 描边宽度
      "alpha": 1                // 整体透明度
    }
  }
}
```

**多路径组合**（支持分别设置样式）：

```typescript
{
  "id": "svg-path-2",
  "shape": "svg-path",
  "position": { "x": 200, "y": 200 },
  "size": { "width": 120, "height": 120 },
  "data": {
    "svg": {
      // 多个路径，每个可独立设置样式
      "paths": [
        {
          "d": "M20,20 L80,20 L50,70 Z",  // 路径数据
          "fill": "#3b82f6",                 // 填充色
          "fillAlpha": 1,                    // 填充透明度
          "stroke": "#1e40af",               // 描边色
          "strokeWidth": 2,                  // 描边宽度
          "strokeAlpha": 1,                  // 描边透明度
          "lineCap": "round",                // 线端样式
          "lineJoin": "round",               // 连接样式
          "lineDash": [5, 5]                 // 虚线样式
        },
        {
          "d": "M30,80 Q50,60 70,80",
          "fill": "none",
          "stroke": "#10b981",
          "strokeWidth": 3
        }
      ],
      "viewBox": { "x": 0, "y": 0, "width": 100, "height": 100 },
      "fit": "stretch"
    },
    "style": {
      "alpha": 0.9  // 全局透明度
    }
  }
}
```

**配置说明**：

- `path` / `paths`: SVG path 数据字符串或路径数组
- `viewBox`: 定义 SVG 坐标系统 `{ x, y, width, height }`
- `fit`: 适配模式
  - `"contain"`: 完整显示，保持比例（默认）
  - `"cover"`: 填充节点，保持比例
  - `"stretch"`: 拉伸填充，不保持比例
- 每个路径支持独立样式：`fill`, `stroke`, `strokeWidth`, `fillAlpha`, `strokeAlpha`, `lineCap`, `lineJoin`, `lineDash`, `fillRule`

**常见图形示例**：

```typescript
// 爱心
{
  "shape": "svg-path",
  "position": { "x": 100, "y": 100 },
  "size": { "width": 100, "height": 100 },
  "data": {
    "svg": {
      "path": "M50,30 A20,20 0,0,1 90,30 A20,20 0,0,1 90,70 L50,100 L10,70 A20,20 0,0,1 10,30 A20,20 0,0,1 50,30 z",
      "viewBox": { "x": 0, "y": 0, "width": 100, "height": 100 }
    },
    "style": {
      "fill": "red"
    }
  }
}
```

### svg-image - SVG 图像

使用完整的 SVG XML 渲染复杂矢量图形，通过光栅化转换为位图显示。

**基础用法**：

```typescript
{
  "id": "svg-image-1",
  "shape": "svg-image",
  "position": { "x": 100, "y": 100 },
  "size": { "width": 150, "height": 150 },
  "data": {
    "svg": {
      // 完整的 SVG XML 字符串
      "xml": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="#3b82f6" />
        <path d="M30,50 L45,65 L70,40" stroke="white" stroke-width="4" fill="none" />
      </svg>`,
      // viewBox（可选，用于 XML 片段）
      "viewBox": { "x": 0, "y": 0, "width": 100, "height": 100 },
      // 适配模式
      "fit": "stretch"
    },
    "style": {
      "alpha": 1  // 整体透明度
    }
  }
}
```

**SVG 片段**（自动包装）：

如果 `xml` 不包含 `<svg>` 标签，引擎会自动添加包装：

```typescript
{
  "id": "svg-image-2",
  "shape": "svg-image",
  "position": { "x": 200, "y": 200 },
  "size": { "width": 100, "height": 100 },
  "data": {
    "svg": {
      // 仅提供 SVG 内容，不含根标签
      "xml": `
        <rect x="10" y="10" width="80" height="80" rx="10" fill="#10b981" />
        <circle cx="50" cy="50" r="25" fill="white" opacity="0.5" />
      `,
      "viewBox": { "x": 0, "y": 0, "width": 100, "height": 100 },
      "fit": "stretch"
    }
  }
}
```

**复杂图标示例**：

```typescript
{
  "id": "icon-chart",
  "shape": "svg-image",
  "position": { "x": 300, "y": 300 },
  "size": { "width": 80, "height": 80 },
  "data": {
    "svg": {
      "xml": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <rect x="3" y="12" width="4" height="9" fill="#3b82f6" />
        <rect x="10" y="8" width="4" height="13" fill="#10b981" />
        <rect x="17" y="4" width="4" height="17" fill="#f59e0b" />
      </svg>`,
      "fit": "stretch"
    }
  }
}
```

**配置说明**：

- `xml`: 完整的 SVG XML 字符串或 SVG 内容片段
  - 完整格式：包含 `<svg>` 根标签
  - 片段格式：仅包含 SVG 元素（如 `<rect>`, `<circle>` 等），引擎会自动添加 `<svg>` 包装
- `viewBox`: 当使用片段格式时必需，定义 SVG 坐标系统
- `fit`: 适配模式（同 svg-path）

**性能说明**：

- SVG 会被转换为位图缓存，避免每帧重新光栅化
- 缓存基于 `xml` 内容和 `viewBox` 尺寸
- 图像加载为异步，首次渲染可能延迟一帧

**svg-path vs svg-image 选择**：

| 特性 | svg-path | svg-image |
|------|----------|-----------|
| 适用场景 | 简单路径图形 | 复杂 SVG 图标 |
| 性能 | 高（直接绘制） | 中等（光栅化缓存） |
| 灵活性 | 多路径独立样式 | 完整 SVG 特性 |
| 渐变/滤镜 | ❌ 不支持 | ✅ 支持 |
| 文本 | ❌ 不支持 | ✅ 支持 |
| 路径操作 | ✅ 支持 lineDash 等 | ❌ 由 SVG 内部定义 |
| 推荐用途 | 图标、Logo | 图表、复杂图形 |



## 节点操作

### 添加节点

```typescript
// 单个添加
engine.graph.addNode(node);

// 批量添加
for (const n of [node1, node2, node3]) {
  engine.graph.addNode(n);
}
```

### 获取节点

```typescript
// 通过ID获取
const node = engine.graph.getNode('node-1');

// 获取所有节点
const nodes = engine.graph.getNodes();

// 获取选中的节点
const selected = engine.graph.getNodes().filter(n => n.selected);
```

### 更新节点

```typescript
// 更新位置
const node = engine.graph.getNode('node-1');
if (node) {
  node.position = { x: 200, y: 200 };
  engine.graph.markDirty('structure');
}

// 更新尺寸
const node = engine.graph.getNode('node-1');
if (node) {
  node.size = { width: 150, height: 100 };
  engine.graph.markDirty('structure');
}

// 更新多个属性
const node = engine.graph.getNode('node-1');
if (node) {
  node.position = { x: 200, y: 200 };
  node.size = { width: 150, height: 100 };
  node.rotation = Math.PI / 6;
  node.data = { ...node.data, label: '新标签' };
  engine.graph.markDirty('structure');
}
```

### 删除节点

```typescript
// 删除单个节点
engine.graph.removeNode('node-1');

// 删除多个节点
for (const id of ['node-1', 'node-2']) {
  engine.graph.removeNode(id);
}

// 删除所有节点和边
engine.graph.clear();
```

### 选中节点

```typescript
// 选中单个节点
const node = engine.graph.getNode('node-1');
if (node) {
  node.selected = true;
  engine.graph.markDirty('style');
}

// 多选
for (const id of ['node-1', 'node-2']) {
  const node = engine.graph.getNode(id);
  if (node) node.selected = true;
}
engine.graph.markDirty('style');

// 取消选中
const node = engine.graph.getNode('node-1');
if (node) {
  node.selected = false;
  engine.graph.markDirty('style');
}

// 取消所有选中
for (const node of engine.graph.getNodes()) {
  node.selected = false;
}
engine.graph.markDirty('style');

// 切换选中状态
const node = engine.graph.getNode('node-1');
if (node) {
  node.selected = !node.selected;
  engine.graph.markDirty('style');
}
```

## 节点属性

:::tip

列举部分属性，其他属性见属性说明，变更操作类似。

:::

### visible - 可见性

控制节点是否显示：

```typescript
// 隐藏节点
const node = engine.graph.getNode('node-1');
if (node) {
  node.visible = false;
  engine.graph.markDirty('structure');
}

// 显示节点
const node = engine.graph.getNode('node-1');
if (node) {
  node.visible = true;
  engine.graph.markDirty('structure');
}
```

### selectable - 可选中性

控制节点是否可被选中：

```typescript
// 禁止选中
const node = engine.graph.getNode('node-1');
if (node) {
  node.selectable = false;
  engine.graph.markDirty('style');
}

// 允许选中
const node = engine.graph.getNode('node-1');
if (node) {
  node.selectable = true;
  engine.graph.markDirty('style');
}
```

### draggable - 可拖拽性

控制节点是否可被拖拽：

```typescript
// 禁止拖拽
const node = engine.graph.getNode('node-1');
if (node) {
  node.draggable = false;
  engine.graph.markDirty('style');
}

// 允许拖拽
const node = engine.graph.getNode('node-1');
if (node) {
  node.draggable = true;
  engine.graph.markDirty('style');
}
```

### isContainer - 是否为容器节点

控制节点是否为容器节点，其子节点同时需添加 `parentId` 属性指向容器节点 `ID`：

```typescript
// 开启容器节点
const node = engine.graph.getNode('node-1');
if (node) {
  node.isContainer = true;
  engine.graph.markDirty('style');
}

// 添加容器的子节点
const node = engine.graph.getNode('node-2');
if (node) {
  node.parentId = 'node-1';
  engine.graph.markDirty('style');
}
```

### zIndex - 层级

控制节点的绘制顺序（数值越大越靠前）：

```typescript
// 置于顶层
const node = engine.graph.getNode('node-1');
if (node) {
  node.zIndex = 100;
  engine.graph.markDirty('structure');
}

// 置于底层
const node = engine.graph.getNode('node-1');
if (node) {
  node.zIndex = -100;
  engine.graph.markDirty('structure');
}

// 前移一层
const node = engine.graph.getNode('node-1');
if (node) {
  node.zIndex = (node.zIndex || 0) + 1;
  engine.graph.markDirty('structure');
}
```

### rotation - 旋转

控制节点旋转角度（弧度制）：

```typescript
// 旋转 45 度
const node = engine.graph.getNode('node-1');
if (node) {
  node.rotation = 45;
  engine.graph.markDirty('structure');
}

// 旋转 90 度
const node = engine.graph.getNode('node-1');
if (node) {
  node.rotation = 90;
  engine.graph.markDirty('structure');
}

// 旋转 180 度
const node = engine.graph.getNode('node-1');
if (node) {
  node.rotation = 180;
  engine.graph.markDirty('structure');
}
```

## 锚点系统

可采用相对、绝对定位的方式设置锚点位置，如果锚点不存在且有边连接时，边端点自动连接到节点的几何中心点。

### 锚点配置

```typescript
interface PortData {
  id: string;                      // 锚点ID
  anchorMode?: 'relative' | 'absolute';  // 锚点模式
  anchorPosition?: AnchorPosition; // 相对位置
  offset: Point;                   // 偏移量
  radius?: number;                 // 显示半径
  label?: string;                  // 标签
}

type AnchorPosition = 
  | 'top' | 'top-left' | 'top-right'
  | 'right' | 'right-top' | 'right-bottom'
  | 'bottom' | 'bottom-left' | 'bottom-right'
  | 'left' | 'left-top' | 'left-bottom'
  | 'center';
```

### 相对锚点（推荐）

相对锚点基于节点边界百分比定位，不受节点尺寸变化影响：

```typescript
{
  "id": "node-1",
  "shape": "rect",
  "position": { "x": 100, "y": 100 },
  "size": { "width": 120, "height": 80 },
  "ports": [
    {
      "id": "top",
      "anchorMode": "relative",
      "anchorPosition": "top",
      "offset": { "x": 0, "y": 0 }
    },
    {
      "id": "right",
      "anchorMode": "relative",
      "anchorPosition": "right",
      "offset": { "x": 0, "y": 0 }
    },
    {
      "id": "bottom",
      "anchorMode": "relative",
      "anchorPosition": "bottom",
      "offset": { "x": 0, "y": 0 }
    },
    {
      "id": "left",
      "anchorMode": "relative",
      "anchorPosition": "left",
      "offset": { "x": 0, "y": 0 }
    }
  ]
}
```

### 绝对锚点

绝对锚点基于像素偏移定位：

```typescript
{
  "id": "node-1",
  "shape": "rect",
  "position": { "x": 100, "y": 100 },
  "size": { "width": 120, "height": 80 },
  "ports": [
    {
      "id": "custom-1",
      "anchorMode": "absolute",
      "offset": { "x": 30, "y": 0 }  // 相对左上角偏移
    }
  ]
}
```

### 显示/隐藏锁点

```typescript
// 隐藏锁点（但仍可连线）
const node = engine.graph.getNode('node-1');
if (node) {
  node.data = { ...node.data, showPorts: false };
  engine.graph.markDirty('style');
}

// 显示锁点
const node = engine.graph.getNode('node-1');
if (node) {
  node.data = { ...node.data, showPorts: true };
  engine.graph.markDirty('style');
}
```

## 分组系统

核心是基于节点是否存在相同的groupId区分的，groupPath（是groupId数组）记录了分组的次序，便于解组时按原次序解组。

### 创建分组

```typescript
// 添加节点到分组
const node = engine.graph.getNode('node-1');
if (node) {
  node.groupId = 'group-1';
  engine.graph.markDirty('structure');
}

// 嵌套分组
const node = engine.graph.getNode('node-1');
if (node) {
  node.groupPath = ['group-1', 'sub-group-1', 'sub-sub-group-1'];
  engine.graph.markDirty('structure');
}
```

### 分组操作

```typescript
// 获取组内所有节点
const groupNodes = engine.graph.getNodes().filter(
  node => node.groupId === 'group-1'
);

// 批量移动组内节点
const dx = 50, dy = 50;
groupNodes.forEach(node => {
  node.position.x += dx;
  node.position.y += dy;
});
engine.graph.markDirty('structure');

// 解散分组
groupNodes.forEach(node => {
  node.groupId = undefined;
  node.groupPath = undefined;
});
engine.graph.markDirty('structure');
```

## 自定义数据

### data 字段

`data` 字段可以存储任意自定义数据：

```typescript
{
  "id": "node-1",
  "shape": "rect",
  "position": { "x": 98, "y": 106 },
  "size": { "width": 120, "height": 80 },
  "selected": true,
  "data": {
    // 样式
    "style": {
      "fill": "#ffffff",
      "stroke": "#111827",
      "lineWidth": 2,
      "radius": 8,
      "alpha": 0.31
    },
    // 自定义数据
    "custom": {
      "code": "n1",
      "name": "圆角矩形",
      "local": "位于画布左上角"
    }
  },
}
```

### 访问自定义数据

```typescript
const node = engine.graph.getNode('node-1');
if (node && node.data) {
  console.log(node.data.label);
  console.log(node.data.style);
  console.log(node.data.custom?.code);
}
```

## 批量操作

### 批量更新

这里的批量更新不是批量匹配并更新，而是针对多个更新时，对于历史操作记录标记为1次（内部存在复合命令 `CompositeCommand` 处理），如编辑器中可实现整体的撤销、重做功能。

```typescript
// 使用事务（Transaction）批量执行命令，支持撤销
import { MoveNodesCommand } from '@agilejs/core';

// 开始事务
engine.history.beginTransaction('Batch Move');

// 执行多个命令
for (const id of ['node-1', 'node-2', 'node-3']) {
  const node = engine.graph.getNode(id);
  if (node) {
    engine.history.execute(
      new MoveNodesCommand(engine.graph, [id], 50, 50)
    );
  }
}

// 提交事务（作为一个整体可撤销）
engine.history.commitTransaction();

// 如果需要回滚事务
// engine.history.rollbackTransaction();
```

### 性能优化

**重要说明**：引擎使用 `requestAnimationFrame` 循环渲染，不会因为每次 `addNode` 就立即重绘。批量添加 1000 个节点，无论用 `for` 循环还是 `forEach`，都只会在**下一帧**渲染一次。因此，普通的批量添加已经足够高效。

```typescript
// ✅ 推荐：直接循环添加（性能已足够好）
for (let i = 0; i < 1000; i++) {
  engine.graph.addNode({
    id: `node-${i}`,
    shape: 'rect',
    position: { x: Math.random() * 1000, y: Math.random() * 1000 },
    size: { width: 50, height: 50 }
  });
}
// 虽然每次 addNode 都会 bump('structure')，但渲染是异步的，
// 所有节点添加完成后才会在下一帧统一渲染一次

// ✅ 更优：使用序列化 API 批量导入（减少版本更新次数）
import { fromScene } from '@agilejs/core';

const sceneData = {
  nodes: Array.from({ length: 1000 }, (_, i) => ({
    id: `node-${i}`,
    shape: 'rect',
    position: { x: Math.random() * 1000, y: Math.random() * 1000 },
    size: { width: 50, height: 50 }
  })),
  edges: []
};

fromScene(engine.graph, sceneData);
// fromScene 会清空图并批量添加，只触发 1 次版本更新
```

**真正需要优化的场景**：

```typescript
// ❌ 问题：超大规模数据（> 10000 节点）导致主线程阻塞
for (let i = 0; i < 50000; i++) {
  engine.graph.addNode({...}); // 长时间循环阻塞主线程
}

// ✅ 解决：分批添加 + yield 主线程
const BATCH_SIZE = 1000;
async function addNodesAsync(nodes: NodeData[]) {
  for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
    const batch = nodes.slice(i, i + BATCH_SIZE);
    batch.forEach(node => engine.graph.addNode(node));
    // 让出主线程，保持界面响应
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

// 使用
const nodes = Array.from({ length: 50000 }, (_, i) => ({
  id: `node-${i}`,
  shape: 'rect',
  position: { x: Math.random() * 5000, y: Math.random() * 5000 },
  size: { width: 50, height: 50 }
}));

await addNodesAsync(nodes);
```

**性能对比**：

| 场景 | 节点数量 | 版本更新 | 渲染次数 | 主线程阻塞 | 推荐方案 |
|------|---------|---------|---------|-----------|---------|
| 少量 | < 1000 | N 次 | 1 次 | < 50ms | 直接循环 addNode |
| 中等 | 1000-5000 | N 次 | 1 次 | 50-200ms | 直接循环或 fromScene |
| 大量 | 5000-10000 | N 次 | 1 次 | 200-500ms | fromScene（减少版本更新） |
| 超大 | > 10000 | N 次 | 多次 | > 500ms | 分批 + async（避免卡顿） |

## 高级功能

:::caution

以下功能主要基于画布引擎基础接口实现，并非完全由引擎内置。

:::
### 节点查询

```typescript
// 按条件过滤
const circleNodes = engine.graph.getNodes().filter(
  node => node.shape === 'circle'
);

// 按位置查询
const nodesInArea = engine.graph.getNodes().filter(node => {
  return node.position.x >= 0 && node.position.x <= 500 &&
         node.position.y >= 0 && node.position.y <= 500;
});

// 按数据查询
const importantNodes = engine.graph.getNodes().filter(
  node => node.data?.isImportant === true
);
```

### 碰撞检测

```typescript
function isColliding(node1: NodeData, node2: NodeData): boolean {
  return !(
    node1.position.x + node1.size.width < node2.position.x ||
    node2.position.x + node2.size.width < node1.position.x ||
    node1.position.y + node1.size.height < node2.position.y ||
    node2.position.y + node2.size.height < node1.position.y
  );
}

// 检查节点是否与其他节点碰撞
const node = engine.graph.getNode('node-1');
if (node) {
  const others = engine.graph.getNodes().filter(n => n.id !== 'node-1');
  const collisions = others.filter(other => isColliding(node, other));
}
```

### 节点对齐

```typescript
// 左对齐
function alignLeft(nodeIds: string[]): void {
  const nodes = nodeIds.map(id => engine.graph.getNode(id)).filter(Boolean);
  if (nodes.length === 0) return;
  const minX = Math.min(...nodes.map(n => n!.position.x));
  
  nodes.forEach(node => {
    if (node) node.position.x = minX;
  });
  engine.graph.markDirty('structure');
}

// 顶部对齐
function alignTop(nodeIds: string[]): void {
  const nodes = nodeIds.map(id => engine.graph.getNode(id)).filter(Boolean);
  if (nodes.length === 0) return;
  const minY = Math.min(...nodes.map(n => n!.position.y));
  
  nodes.forEach(node => {
    if (node) node.position.y = minY;
  });
  engine.graph.markDirty('structure');
}

// 水平居中对齐
function alignCenterHorizontal(nodeIds: string[]): void {
  const nodes = nodeIds.map(id => engine.graph.getNode(id)).filter(Boolean);
  if (nodes.length === 0) return;
  const centerX = nodes.reduce((sum, n) => 
    sum + (n!.position.x + n!.size.width / 2), 0
  ) / nodes.length;
  
  nodes.forEach(node => {
    if (node) {
      node.position.x = centerX - node.size.width / 2;
    }
  });
  engine.graph.markDirty('structure');
}
```

## 最佳实践

### 1. 使用唯一ID

```typescript
// ✅ 使用UUID或递增ID
import { v4 as uuidv4 } from 'uuid';

const node = {
  id: uuidv4(),
  // ...
};

// 或使用递增ID
let nodeCounter = 0;
const node = {
  id: `node-${++nodeCounter}`,
  // ...
};
```

### 2. 合理使用 zIndex

```typescript
// ✅ 预留足够的层级空间
const LAYER_BACKGROUND = -1000;
const LAYER_DEFAULT = 0;
const LAYER_IMPORTANT = 1000;
const LAYER_OVERLAY = 2000;

const node = {
  id: 'node-1',
  zIndex: LAYER_IMPORTANT,
  // ...
};
```

### 3. 性能优化

```typescript
// ✅ 批量操作分批进行，减少 markDirty 调用
const nodes = engine.graph.getNodes();
for (const node of nodes) {
  node.position.x += 10;
}
engine.graph.markDirty('structure');  // 只调用一次

// ✅ 缓存查询结果
const nodes = engine.graph.getNodes();  // 缓存
nodes.forEach(node => {
  // 使用缓存的结果
});
```

### 4. 数据验证

```typescript
// ✅ 添加数据验证
function validateNode(node: Partial<NodeData>): boolean {
  return !!(
    node.id &&
    node.shape &&
    node.position &&
    node.size &&
    node.size.width > 0 &&
    node.size.height > 0
  );
}

if (validateNode(node)) {
  engine.graph.addNode(node as NodeData);
}
```
