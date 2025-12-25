---
sidebar_position: 8
---

# 自定义渲染器

通过实现 `ShapeRenderer` 接口，可以创建自定义的节点和边渲染器。

## 核心接口

### ShapeRenderer

```typescript
interface ShapeRenderer {
  shape: string;
  render(ctx: CanvasRenderingContext2D, data: NodeData | EdgeData): void;
  hitTest?(ctx: CanvasRenderingContext2D, data: NodeData | EdgeData, point: Point): boolean;
}
```

**属性：**
- `shape`: 渲染器标识，对应 `NodeData.shape` 或 `EdgeData.shape`
- `render`: 渲染方法
- `hitTest`: 可选的点击检测方法

## 节点渲染器

:::tip

可参考 `@fnt-agilejs/core/src/renderers/basic/RectRender.ts` 实现自定义图形渲染器。

:::

### 基础示例

创建自定义矩形渲染器：

```typescript
class CustomRectRenderer implements ShapeRenderer {
  shape = 'custom-rect';
  
  render(ctx: CanvasRenderingContext2D, node: NodeData): void {
    const { position, size, data = {} } = node;
    const { fill = '#ffffff', stroke = '#000000', strokeWidth = 1 } = data;
    
    ctx.save();
    
    // 绘制矩形
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    
    ctx.beginPath();
    ctx.rect(position.x, position.y, size.width, size.height);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }
  
  hitTest(ctx: CanvasRenderingContext2D, node: NodeData, point: Point): boolean {
    const { position, size } = node;
    return (
      point.x >= position.x &&
      point.x <= position.x + size.width &&
      point.y >= position.y &&
      point.y <= position.y + size.height
    );
  }
}

// 注册
engine.renderers.register(new CustomRectRenderer());

// 使用
engine.graph.addNode({
  id: 'node-1',
  shape: 'custom-rect',
  position: { x: 100, y: 100 },
  size: { width: 120, height: 80 },
  data: {
    fill: '#4CAF50',
    stroke: '#2E7D32',
    strokeWidth: 2
  }
});
```

### 圆角矩形

```typescript
class RoundedRectRenderer implements ShapeRenderer {
  shape = 'rounded-rect';
  
  render(ctx: CanvasRenderingContext2D, node: NodeData): void {
    const { position, size, data = {} } = node;
    const { 
      fill = '#ffffff',
      stroke = '#000000',
      strokeWidth = 1,
      radius = 8
    } = data;
    
    ctx.save();
    
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    
    // 绘制圆角矩形
    const x = position.x;
    const y = position.y;
    const w = size.width;
    const h = size.height;
    const r = Math.min(radius, w / 2, h / 2);
    
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }
}
```

### 文本节点

```typescript
class TextNodeRenderer implements ShapeRenderer {
  shape = 'text-node';
  
  render(ctx: CanvasRenderingContext2D, node: NodeData): void {
    const { position, size, data = {} } = node;
    const {
      text = 'Text',
      fontSize = 14,
      fontFamily = 'Arial',
      color = '#000000',
      align = 'center',
      baseline = 'middle'
    } = data;
    
    ctx.save();
    
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    
    // 计算文本位置
    let x = position.x;
    if (align === 'center') {
      x += size.width / 2;
    } else if (align === 'right') {
      x += size.width;
    }
    
    let y = position.y;
    if (baseline === 'middle') {
      y += size.height / 2;
    } else if (baseline === 'bottom') {
      y += size.height;
    }
    
    ctx.fillText(text, x, y);
    
    ctx.restore();
  }
}
```

### 图像节点

```typescript
class ImageNodeRenderer implements ShapeRenderer {
  shape = 'image-node';
  private imageCache = new Map<string, HTMLImageElement>();
  
  render(ctx: CanvasRenderingContext2D, node: NodeData): void {
    const { position, size, data = {} } = node;
    const { imageUrl } = data;
    
    if (!imageUrl) return;
    
    let img = this.imageCache.get(imageUrl);
    
    if (!img) {
      img = new Image();
      img.src = imageUrl;
      this.imageCache.set(imageUrl, img);
      
      img.onload = () => {
        // 图像加载完成后触发重绘
        engine.render();
      };
    }
    
    if (img.complete) {
      ctx.save();
      ctx.drawImage(img, position.x, position.y, size.width, size.height);
      ctx.restore();
    }
  }
}
```

### 复杂节点示例

带图标和文本的节点：

```typescript
class IconTextNodeRenderer implements ShapeRenderer {
  shape = 'icon-text-node';
  
  render(ctx: CanvasRenderingContext2D, node: NodeData): void {
    const { position, size, data = {} } = node;
    const {
      icon = '📦',
      text = 'Node',
      backgroundColor = '#ffffff',
      borderColor = '#cccccc',
      borderWidth = 1
    } = data;
    
    ctx.save();
    
    // 绘制背景
    ctx.fillStyle = backgroundColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    
    ctx.beginPath();
    ctx.rect(position.x, position.y, size.width, size.height);
    ctx.fill();
    ctx.stroke();
    
    // 绘制图标
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, position.x + size.width / 2, position.y + 20);
    
    // 绘制文本
    ctx.font = '14px Arial';
    ctx.fillStyle = '#333333';
    ctx.fillText(text, position.x + size.width / 2, position.y + 50);
    
    ctx.restore();
  }
}
```

## 边渲染器

:::tip

可参考 `@fnt-agilejs/core/src/renderers/edges/BezierEdgeRenderer.ts` 实现自定义边渲染器。

:::

### 基础示例

创建自定义直线边：

```typescript
class CustomLineEdgeRenderer implements ShapeRenderer {
  shape = 'custom-line';
  
  render(ctx: CanvasRenderingContext2D, edge: EdgeData): void {
    const { source, target, data = {} } = edge;
    const { stroke = '#000000', strokeWidth = 1 } = data;
    
    const sourceNode = engine.graph.getNode(source);
    const targetNode = engine.graph.getNode(target);
    
    if (!sourceNode || !targetNode) return;
    
    // 计算起点和终点
    const startX = sourceNode.position.x + sourceNode.size.width / 2;
    const startY = sourceNode.position.y + sourceNode.size.height / 2;
    const endX = targetNode.position.x + targetNode.size.width / 2;
    const endY = targetNode.position.y + targetNode.size.height / 2;
    
    ctx.save();
    
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    ctx.restore();
  }
}
```

### 带箭头的边

```typescript
class ArrowEdgeRenderer implements ShapeRenderer {
  shape = 'arrow-edge';
  
  render(ctx: CanvasRenderingContext2D, edge: EdgeData): void {
    const { source, target, data = {} } = edge;
    const { stroke = '#000000', strokeWidth = 2, arrowSize = 10 } = data;
    
    const sourceNode = engine.graph.getNode(source);
    const targetNode = engine.graph.getNode(target);
    
    if (!sourceNode || !targetNode) return;
    
    const startX = sourceNode.position.x + sourceNode.size.width / 2;
    const startY = sourceNode.position.y + sourceNode.size.height / 2;
    const endX = targetNode.position.x + targetNode.size.width / 2;
    const endY = targetNode.position.y + targetNode.size.height / 2;
    
    ctx.save();
    
    ctx.strokeStyle = stroke;
    ctx.fillStyle = stroke;
    ctx.lineWidth = strokeWidth;
    
    // 绘制线条
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // 计算箭头角度
    const angle = Math.atan2(endY - startY, endX - startX);
    
    // 绘制箭头
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle - Math.PI / 6),
      endY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle + Math.PI / 6),
      endY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
}
```

### 虚线边

```typescript
class DashedEdgeRenderer implements ShapeRenderer {
  shape = 'dashed-edge';
  
  render(ctx: CanvasRenderingContext2D, edge: EdgeData): void {
    const { source, target, data = {} } = edge;
    const {
      stroke = '#000000',
      strokeWidth = 1,
      dashPattern = [5, 5]
    } = data;
    
    const sourceNode = engine.graph.getNode(source);
    const targetNode = engine.graph.getNode(target);
    
    if (!sourceNode || !targetNode) return;
    
    const startX = sourceNode.position.x + sourceNode.size.width / 2;
    const startY = sourceNode.position.y + sourceNode.size.height / 2;
    const endX = targetNode.position.x + targetNode.size.width / 2;
    const endY = targetNode.position.y + targetNode.size.height / 2;
    
    ctx.save();
    
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.setLineDash(dashPattern);
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    ctx.restore();
  }
}
```

### 带标签的边

```typescript
class LabeledEdgeRenderer implements ShapeRenderer {
  shape = 'labeled-edge';
  
  render(ctx: CanvasRenderingContext2D, edge: EdgeData): void {
    const { source, target, data = {} } = edge;
    const {
      stroke = '#000000',
      strokeWidth = 1,
      label = '',
      labelBackgroundColor = '#ffffff',
      labelColor = '#000000'
    } = data;
    
    const sourceNode = engine.graph.getNode(source);
    const targetNode = engine.graph.getNode(target);
    
    if (!sourceNode || !targetNode) return;
    
    const startX = sourceNode.position.x + sourceNode.size.width / 2;
    const startY = sourceNode.position.y + sourceNode.size.height / 2;
    const endX = targetNode.position.x + targetNode.size.width / 2;
    const endY = targetNode.position.y + targetNode.size.height / 2;
    
    ctx.save();
    
    // 绘制线条
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    if (label) {
      // 计算标签位置（边的中点）
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      
      // 测量文本尺寸
      ctx.font = '12px Arial';
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = 16;
      
      // 绘制标签背景
      ctx.fillStyle = labelBackgroundColor;
      ctx.fillRect(
        midX - textWidth / 2 - 4,
        midY - textHeight / 2 - 2,
        textWidth + 8,
        textHeight + 4
      );
      
      // 绘制标签文本
      ctx.fillStyle = labelColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, midX, midY);
    }
    
    ctx.restore();
  }
}
```

## 渲染优化

### 1. 视口裁剪

只渲染可见区域内的元素：

```typescript
class OptimizedRenderer implements ShapeRenderer {
  shape = 'optimized-rect';
  
  render(ctx: CanvasRenderingContext2D, node: NodeData): void {
    const viewport = engine.getViewport();
    const canvasWidth = engine.canvas.width;
    const canvasHeight = engine.canvas.height;
    
    // 计算可见区域
    const viewportBounds = {
      minX: -viewport.translateX / viewport.scale,
      minY: -viewport.translateY / viewport.scale,
      maxX: (canvasWidth - viewport.translateX) / viewport.scale,
      maxY: (canvasHeight - viewport.translateY) / viewport.scale
    };
    
    // 检查节点是否在可见区域内
    if (
      node.position.x + node.size.width < viewportBounds.minX ||
      node.position.x > viewportBounds.maxX ||
      node.position.y + node.size.height < viewportBounds.minY ||
      node.position.y > viewportBounds.maxY
    ) {
      return;  // 不在可见区域，跳过渲染
    }
    
    // 渲染节点
    // ...
  }
}
```

### 2. LOD (Level of Detail)

根据缩放级别调整渲染细节：

```typescript
class LODRenderer implements ShapeRenderer {
  shape = 'lod-node';
  
  render(ctx: CanvasRenderingContext2D, node: NodeData): void {
    const scale = engine.getScale();
    
    ctx.save();
    
    if (scale < 0.5) {
      // 低细节：仅绘制简单矩形
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(
        node.position.x,
        node.position.y,
        node.size.width,
        node.size.height
      );
    } else if (scale < 1.5) {
      // 中等细节：绘制带边框的矩形
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.fillRect(
        node.position.x,
        node.position.y,
        node.size.width,
        node.size.height
      );
      ctx.strokeRect(
        node.position.x,
        node.position.y,
        node.size.width,
        node.size.height
      );
    } else {
      // 高细节：绘制完整内容（图标、文本等）
      this.renderDetailed(ctx, node);
    }
    
    ctx.restore();
  }
  
  private renderDetailed(ctx: CanvasRenderingContext2D, node: NodeData): void {
    // 详细渲染逻辑
    // ...
  }
}
```

### 3. 缓存渲染结果

```typescript
class CachedRenderer implements ShapeRenderer {
  shape = 'cached-node';
  private cache = new Map<string, HTMLCanvasElement>();
  
  render(ctx: CanvasRenderingContext2D, node: NodeData): void {
    let cached = this.cache.get(node.id);
    
    if (!cached || this.needsUpdate(node)) {
      // 创建离屏 canvas
      cached = document.createElement('canvas');
      cached.width = node.size.width;
      cached.height = node.size.height;
      
      const cacheCtx = cached.getContext('2d')!;
      this.renderToCache(cacheCtx, node);
      
      this.cache.set(node.id, cached);
    }
    
    // 绘制缓存内容
    ctx.drawImage(cached, node.position.x, node.position.y);
  }
  
  private needsUpdate(node: NodeData): boolean {
    // 检查节点是否需要更新
    return node.selected || false;
  }
  
  private renderToCache(ctx: CanvasRenderingContext2D, node: NodeData): void {
    // 渲染到缓存 canvas
    // ...
  }
}
```

## 注册和使用

### 注册渲染器

```typescript
// 单个注册
engine.renderers.register(new CustomRectRenderer());

// 批量注册
const renderers = [
  new CustomRectRenderer(),
  new RoundedRectRenderer(),
  new TextNodeRenderer(),
  new ImageNodeRenderer()
];

renderers.forEach(renderer => {
  engine.renderers.register(renderer);
});
```

### 替换默认渲染器

```typescript
// 注销默认渲染器
engine.renderers.unregister('rect');

// 注册自定义渲染器
engine.renderers.register(new CustomRectRenderer());
```

### 动态切换渲染器

```typescript
// 更改节点的 shape 属性
engine.graph.updateNode('node-1', {
  shape: 'rounded-rect'
});
```

## 最佳实践

### 1. 使用 ctx.save() 和 ctx.restore()

```typescript
render(ctx: CanvasRenderingContext2D, node: NodeData): void {
  ctx.save();  // 保存当前状态
  
  // 渲染逻辑
  
  ctx.restore();  // 恢复状态
}
```

### 2. 避免重复计算

```typescript
class EfficientRenderer implements ShapeRenderer {
  shape = 'efficient-node';
  
  render(ctx: CanvasRenderingContext2D, node: NodeData): void {
    // 预先计算常用值
    const { x, y } = node.position;
    const { width, height } = node.size;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // 使用预计算的值
    // ...
  }
}
```

### 3. 支持选中状态

```typescript
render(ctx: CanvasRenderingContext2D, node: NodeData): void {
  const isSelected = node.selected || false;
  
  ctx.save();
  
  // 选中时显示高亮
  if (isSelected) {
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#2196F3';
  } else {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
  }
  
  // 渲染节点
  // ...
  
  ctx.restore();
}
```

### 4. 实现 hitTest

```typescript
hitTest(ctx: CanvasRenderingContext2D, node: NodeData, point: Point): boolean {
  // 精确的点击检测
  const { position, size } = node;
  
  // 简单矩形检测
  return (
    point.x >= position.x &&
    point.x <= position.x + size.width &&
    point.y >= position.y &&
    point.y <= position.y + size.height
  );
}
```

## 调试技巧

### 1. 调试辅助线

虽然引擎目前没有内置的 `debug` 配置选项，但可以通过以下方式实现调试模式：

**方式一：使用全局变量**

```typescript
// 在应用入口定义全局调试开关
window.__DEBUG__ = import.meta.env.DEV;

class DebugRenderer implements ShapeRenderer {
  shape = 'debug-node';
  
  render(ctx: CanvasRenderingContext2D, node: NodeData): void {
    // 正常渲染
    this.renderNode(ctx, node);
    
    // 开启调试时绘制边界框
    if (window.__DEBUG__) {
      ctx.save();
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        node.position.x,
        node.position.y,
        node.size.width,
        node.size.height
      );
      
      // 绘制中心点
      const centerX = node.position.x + node.size.width / 2;
      const centerY = node.position.y + node.size.height / 2;
      ctx.fillStyle = 'red';
      ctx.fillRect(centerX - 2, centerY - 2, 4, 4);
      
      // 显示节点 ID
      ctx.fillStyle = 'red';
      ctx.font = '10px monospace';
      ctx.fillText(node.id, node.position.x + 4, node.position.y + 12);
      
      ctx.restore();
    }
  }
  
  private renderNode(ctx: CanvasRenderingContext2D, node: NodeData): void {
    // 实际渲染逻辑
    // ...
  }
}

// 使用
engine.renderers.register(new DebugRenderer());
```

**方式二：通过构造函数传入**

```typescript
class ConfigurableRenderer implements ShapeRenderer {
  shape = 'my-node';
  
  constructor(private showDebug = false) {}
  
  render(ctx: CanvasRenderingContext2D, node: NodeData): void {
    this.renderNode(ctx, node);
    
    if (this.showDebug) {
      this.renderDebugInfo(ctx, node);
    }
  }
  
  private renderDebugInfo(ctx: CanvasRenderingContext2D, node: NodeData): void {
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      node.position.x,
      node.position.y,
      node.size.width,
      node.size.height
    );
    ctx.restore();
  }
  
  private renderNode(ctx: CanvasRenderingContext2D, node: NodeData): void {
    // 实际渲染逻辑
    // ...
  }
}

// 根据环境变量决定是否开启调试
const isDebug = import.meta.env.DEV;
engine.renderers.register(new ConfigurableRenderer(isDebug));
```

**方式三：扩展引擎（推荐用于项目级封装）**

```typescript
// 创建带调试功能的引擎包装类
class DebugCanvasEngine extends CanvasEngine {
  private _debug = false;
  
  constructor(options: EngineOptions & { debug?: boolean }) {
    super(options);
    this._debug = options.debug ?? false;
  }
  
  isDebug(): boolean {
    return this._debug;
  }
  
  setDebug(enabled: boolean): void {
    this._debug = enabled;
    this.render(); // 触发重绘
  }
}

// 自定义渲染器可以访问调试状态
class SmartRenderer implements ShapeRenderer {
  shape = 'smart-node';
  
  constructor(private engine: DebugCanvasEngine) {}
  
  render(ctx: CanvasRenderingContext2D, node: NodeData): void {
    this.renderNode(ctx, node);
    
    if (this.engine.isDebug()) {
      this.renderDebugInfo(ctx, node);
    }
  }
  
  private renderDebugInfo(ctx: CanvasRenderingContext2D, node: NodeData): void {
    // 调试信息渲染
  }
  
  private renderNode(ctx: CanvasRenderingContext2D, node: NodeData): void {
    // 正常渲染
  }
}

// 使用
const engine = new DebugCanvasEngine({
  container,
  debug: import.meta.env.DEV
});

engine.renderers.register(new SmartRenderer(engine));

// 运行时切换调试模式
engine.setDebug(true);
```

### 2. 性能监控

```typescript
render(ctx: CanvasRenderingContext2D, node: NodeData): void {
  const startTime = performance.now();
  
  // 渲染逻辑
  
  const endTime = performance.now();
  if (endTime - startTime > 5) {
    console.warn(`Slow render for node ${node.id}: ${endTime - startTime}ms`);
  }
}
```
