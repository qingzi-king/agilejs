---
sidebar_position: 2
---

# 交互控制优化

## 问题描述

虽然在引擎层面禁用了选中和拖拽功能，但点击节点的标签（label）仍然可以进行选中和拖拽操作，导致交互控制不一致。

## 解决方案

为所有涉及用户交互的插件添加全局交互配置检查，确保它们都遵守 `InteractionConfig` 的设置。

## 修改的插件列表

### 1. **LabelOverlayPlugin** ✅
- **文件**: `packages/canvas/src/plugins/LabelOverlayPlugin.ts`
- **修改点**:
  - `onMouseDownCapture`: 检查 `enableSelection` 和 `enableDrag`
  - `onMouseMove`: 检查 `enableDrag`，禁用时清理拖拽状态
- **影响**: 标签的选中和拖拽现在受全局配置控制

### 2. **DragPlugin** ✅
- **文件**: `packages/canvas/src/plugins/DragPlugin.ts`
- **修改点**: `onMouseDown` 方法开头检查 `enableDrag`
- **影响**: 节点拖拽受全局配置控制

### 3. **PanZoomPlugin** ✅
- **文件**: `packages/canvas/src/plugins/PanZoomPlugin.ts`
- **修改点**:
  - `onMouseDown`: 检查 `enablePan`
  - `onWheel`: 检查 `enableZoom`
- **影响**: 画布平移和缩放受全局配置控制

### 4. **SelectionOverlayPlugin** ✅
- **文件**: `packages/canvas/src/plugins/SelectionOverlayPlugin.ts`
- **修改点**: `handleCanvasClick` 方法检查 `enableSelection`
- **影响**: 空白区域点击清除选择受全局配置控制

### 5. **BoxSelectPlugin** ✅
- **文件**: `packages/canvas/src/plugins/BoxSelectPlugin.ts`
- **修改点**: `onMouseDown` 方法检查 `enableSelection`
- **影响**: 框选功能受全局配置控制

### 6. **ResizeRotatePlugin** ✅
- **文件**: `packages/canvas/src/plugins/ResizeRotatePlugin.ts`
- **修改点**: `onMouseDown` 方法检查 `enableDrag`
- **影响**: 单个节点的调整大小和旋转受全局配置控制

### 7. **GroupResizeRotatePlugin** ✅
- **文件**: `packages/canvas/src/plugins/GroupResizeRotatePlugin.ts`
- **修改点**: `onMouseDown` 方法检查 `enableDrag`
- **影响**: 多选节点的调整大小和旋转受全局配置控制

### 8. **EdgeEditPlugin** ✅
- **文件**: `packages/canvas/src/plugins/EdgeEditPlugin.ts`
- **修改点**: `onMouseDown` 方法检查 `enableSelection` 和 `enableDrag`
- **影响**: 边的选中和控制点拖拽受全局配置控制

### 9. **PolylineNodeEditPlugin** ✅
- **文件**: `packages/canvas/src/plugins/PolylineNodeEditPlugin.ts`
- **修改点**: `onMouseDown` 方法检查 `enableDrag`
- **影响**: 折线节点的顶点编辑受全局配置控制

### 10. **ConnectPlugin** ✅
- **文件**: `packages/canvas/src/plugins/ConnectPlugin.ts`
- **修改点**: `onMouseDown` 方法检查 `enableDrag`
- **影响**: 连接节点创建边的操作受全局配置控制

### 11. **InlineTextEditPlugin** ✅
- **文件**: `packages/canvas/src/plugins/InlineTextEditPlugin.ts`
- **修改点**: `onDblClick` 方法检查 `enableDrag`
- **影响**: 双击编辑文本受全局配置控制

## 交互配置映射关系

| 配置项 | 影响的插件 | 控制的操作 |
|--------|-----------|-----------|
| `enableZoom` | PanZoomPlugin | 鼠标滚轮缩放 |
| `enablePan` | PanZoomPlugin | 拖动画布平移 |
| `enableSelection` | SelectionOverlayPlugin<br />BoxSelectPlugin<br />EdgeEditPlugin<br />LabelOverlayPlugin | 点击选中节点/边<br />框选<br />清除选择<br />标签点击选中 |
| `enableDrag` | DragPlugin<br />LabelOverlayPlugin<br />ResizeRotatePlugin<br />GroupResizeRotatePlugin<br />EdgeEditPlugin<br />PolylineNodeEditPlugin<br />ConnectPlugin<br />InlineTextEditPlugin | 拖动节点<br />标签拖动<br />调整大小/旋转<br />组调整大小/旋转<br />边控制点拖动<br />折线顶点编辑<br />连接节点<br />文本编辑 |

## 验证方法

```typescript
// 创建只读视图（仅允许浏览，禁止编辑）
const engine = new CanvasEngine({
  container: containerRef.current,
  background: "#ffffff",
  interactionConfig: {
    enableZoom: true,      // 允许缩放查看
    enablePan: true,       // 允许平移浏览
    enableSelection: false,// 禁止选中
    enableDrag: false      // 禁止任何拖拽操作
  }
});
```

在此配置下：
- ✅ 可以通过滚轮缩放
- ✅ 可以拖动画布平移
- ❌ 无法点击选中节点
- ❌ 无法点击标签选中节点
- ❌ 无法拖动节点
- ❌ 无法从标签拖动节点
- ❌ 无法调整节点大小或旋转
- ❌ 无法编辑边的路径
- ❌ 无法编辑折线节点的顶点
- ❌ 无法连接节点创建新边
- ❌ 无法双击编辑文本
- ❌ 无法框选

## 使用示例

```typescript
// 动态切换到只读模式
function switchToReadOnlyMode(engine: CanvasEngine) {
  engine.setInteractionConfig({
    enableSelection: false,
    enableDrag: false
  });
}

// 恢复编辑模式
function switchToEditMode(engine: CanvasEngine) {
  engine.setInteractionConfig({
    enableSelection: true,
    enableDrag: true
  });
}

// 检查当前是否为只读
function isReadOnly(engine: CanvasEngine): boolean {
  const config = engine.getInteractionConfig();
  return !config.enableSelection && !config.enableDrag;
}
```
