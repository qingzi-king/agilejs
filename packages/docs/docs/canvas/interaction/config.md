---
sidebar_position: 1
---

# 交互控制配置

:::tip

交互控制配置只对编辑器场景中的图形操作有效。通过 API 直接控制的运行时场景不受此配置参数影响，其图形控制和表现将完全由程序代码决定。

:::

## 概述

CanvasEngine 支持全局配置来禁用或启用特定的交互功能，包括缩放、平移、选中和拖拽操作。

## 配置选项

### InteractionConfig 接口

```typescript
interface InteractionConfig {
  /** 是否允许缩放操作（鼠标滚轮缩放）。默认 true */
  enableZoom?: boolean;
  /** 是否允许平移操作（拖动画布）。默认 true */
  enablePan?: boolean;
  /** 是否允许选中节点。默认 true */
  enableSelection?: boolean;
  /** 是否允许拖拽节点。默认 true */
  enableDrag?: boolean;
  /** 是否允许节点缩放（默认 true） */
  enableResize?: boolean;
  /** 是否允许节点旋转（默认 true） */
  enableRotate?: boolean;
  /** 最小缩放比例。默认 0.1 */
  minScale?: number;
  /** 最大缩放比例。默认 10 */
  maxScale?: number;
}
```

### 参数详解与影响范围

| 参数 | 作用描述 | 影响范围 | 依赖与优先级 |
| :--- | :--- | :--- | :--- |
| **enableZoom** | 控制画布缩放能力 | 鼠标滚轮缩放、触控板缩放手势。 | 独立控制。 |
| **enablePan** | 控制画布平移能力 | 鼠标拖拽画布（通常配合空格键或中键）、触控板平移手势。 | 独立控制。 |
| **enableSelection** | 控制元素选中能力 | **节点与边**。设为 `false` 时，点击或框选均无法选中任何元素。 | **最高优先级**。若关闭，基于选中的操作（拖拽、缩放、旋转）均无法触发。 |
| **enableDrag** | 控制位置移动能力 | **节点**：整体位置拖动。<br/>**边/折线**：端点或拐点的拖动编辑。 | 需 `enableSelection: true`。<br/>对于边/折线形状编辑，需同时满足 `enableResize: true`。 |
| **enableResize** | 控制尺寸/形状调整能力 | **节点**：通过句柄调整宽高。<br/>**边/折线**：拖动端点/拐点、增删拐点。 | 需 `enableSelection: true`。<br/>受个体属性 `data.resizable` 限制（即 `全局开启 && 个体未禁用`）。 |
| **enableRotate** | 控制旋转能力 | **节点**：通过旋转句柄调整角度。 | 需 `enableSelection: true`。<br/>受个体属性 `data.rotatable` 限制。 |

## 使用方法

### 1. 初始化时配置

在创建引擎时通过 `interactionConfig` 选项配置：

```typescript
const engine = new CanvasEngine({
  container: containerRef.current,
  background: "#ffffff",
  mode: 'edit',
  // 交互控制配置（注：根据实际情况调整默认值）
  interactionConfig: {
    enableZoom: false,      // 禁用画布缩放
    enablePan: false,       // 禁用画布平移
    enableSelection: true,  // 允许节点选中
    enableDrag: true,       // 允许节点拖拽
    minScale: 0.1,          // 最小缩放比例
    maxScale: 10            // 最大缩放比例
  }
});
```

### 2. 运行时动态修改

使用 `setInteractionConfig` 方法动态修改配置：

```typescript
// 禁用所有交互
engine.setInteractionConfig({
  enableZoom: false,
  enablePan: false,
  enableSelection: false,
  enableDrag: false,
  enableResize: false,
  enableRotate: false
});

// 只启用查看（缩放和平移）
engine.setInteractionConfig({
  enableZoom: true,
  enablePan: true,
  enableSelection: false,
  enableDrag: false
});

// 启用编辑模式
engine.setInteractionConfig({
  enableZoom: true,
  enablePan: true,
  enableSelection: true,
  enableDrag: true
});
```

### 3. 读取当前配置

使用 `getInteractionConfig` 方法获取当前配置：

```typescript
const config = engine.getInteractionConfig();
console.log('当前是否允许缩放:', config.enableZoom);
console.log('当前是否允许平移:', config.enablePan);
console.log('当前是否允许选中:', config.enableSelection);
console.log('当前是否允许拖拽:', config.enableDrag);
```

## 应用场景

### 只读模式（View-Only）

适用于展示场景，用户只能查看不能编辑：

```typescript
const engine = new CanvasEngine({
  container: containerRef.current,
  mode: 'view',
  interactionConfig: {
    enableZoom: true,       // 允许缩放查看细节
    enablePan: true,        // 允许平移浏览
    enableSelection: false, // 不允许选中
    enableDrag: false       // 不允许拖拽
  }
});
```

### 演示模式（Presentation）

适用于演示场景，完全锁定交互：

```typescript
const engine = new CanvasEngine({
  container: containerRef.current,
  mode: 'none',
  interactionConfig: {
    enableZoom: false,
    enablePan: false,
    enableSelection: false,
    enableDrag: false
  }
});
```

### 受限编辑模式（Limited Edit）

允许选择但不允许移动：

```typescript
const engine = new CanvasEngine({
  container: containerRef.current,
  mode: 'edit',
  interactionConfig: {
    enableZoom: true,
    enablePan: true,
    enableSelection: true,  // 允许选中进行其他操作（删除、修改属性等）
    enableDrag: false       // 不允许拖拽移动
  }
});
```

## 受影响的插件

该配置会影响以下插件的行为：

- **PanZoomPlugin**: 
  - `enablePan` 控制平移功能
  - `enableZoom` 控制缩放功能
  
- **DragPlugin**: 
  - `enableDrag` 控制节点拖拽功能
  
- **SelectionOverlayPlugin**: 
  - `enableSelection` 控制选中高亮和取消选中功能
  
- **BoxSelectPlugin**: 
  - `enableSelection` 控制框选功能

## 其他

### 扩展示例

根据用户权限控制交互。

```typescript
function setupCanvas(container: HTMLElement, userRole: 'admin' | 'editor' | 'viewer') {
  const engine = new CanvasEngine({
    container,
    mode: userRole === 'viewer' ? 'view' : 'edit',
    interactionConfig: {
      enableZoom: true,  // 所有角色都可以缩放
      enablePan: true,   // 所有角色都可以平移
      enableSelection: userRole !== 'viewer',  // 只有编辑角色可以选中
      enableDrag: userRole === 'admin'         // 只有管理员可以拖拽
    }
  });
  
  return engine;
}
```

### 注意事项

1. **局部控制优先**：如果节点设置了 `draggable: false` 或 `selectable: false`，这些局部设置会优先于全局配置。

2. **模式配合**：建议配合 `mode` 选项使用：
   - `mode: 'edit'` + 全量交互配置 = 完整编辑功能
   - `mode: 'view'` + 只读交互配置 = 查看模式
   - `mode: 'none'` + 禁用所有交互 = 静态展示

3. **动态切换**：可以根据用户权限或应用状态动态切换交互配置，实现灵活的权限控制。
