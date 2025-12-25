---
sidebar_position: 4
---

# 移动端支持

<video controls autoplay muted loop playsinline width="100%">
  <source src="https://docs.cq-tct.com/funenc/agilejs/04.mp4" type="video/mp4" />
  您的浏览器不支持视频播放。
</video>

## 概述

Canvas 引擎现已支持移动端触摸交互，通过统一的指针事件抽象层，核心插件同时支持鼠标和触摸操作。

## 支持的功能

### 1. **画布平移与缩放 (PanZoomPlugin)**

#### 桌面端
- 🖱️ **平移**: 左键在空白处拖动
- 🖱️ **缩放**: 鼠标滚轮

#### 移动端
- 👆 **平移**: 单指在空白处滑动
- 🤏 **缩放**: 双指捏合（Pinch Zoom）
  - 支持动态缩放中心跟随
  - 平滑的缩放体验

### 2. **小地图交互 (MinimapPlugin)**

#### 桌面端
- 🖱️ **拖动可视区域**: 鼠标拖拽视口矩形
- 🖱️ **点击居中**: 点击小地图任意位置

#### 移动端
- 👆 **拖动可视区域**: 单指拖拽视口矩形
- 👆 **触摸居中**: 触摸小地图任意位置

### 3. **节点拖拽 (DragPlugin)**

#### 桌面端
- 🖱️ **拖拽节点**: 鼠标拖动节点
- 🖱️ **多选拖拽**: 支持同时拖动多个选中节点
- 🖱️ **网格对齐**: 拖拽时自动对齐网格

#### 移动端
- 👆 **拖拽节点**: 单指触摸拖动节点
- 👆 **多选拖拽**: 支持同时拖动多个选中节点
- 👆 **网格对齐**: 拖拽时自动对齐网格
- 👆 **组选择**: 触摸组内节点自动选中整组

## 技术实现

### 指针事件适配器 (PointerEventAdapter)

位置: `src/utils/pointer.ts`

提供统一的指针事件抽象，自动处理鼠标和触摸事件的差异：

```typescript
import { PointerEventAdapter } from '@fnt-agilejs/core';

// 归一化事件
const pointer = PointerEventAdapter.normalize(event);

// 检测双指捏合
const distance = PointerEventAdapter.getPinchDistance(touchEvent);
const center = PointerEventAdapter.getPinchCenter(touchEvent);

// 判断是否为触摸设备
const isMobile = PointerEventAdapter.isTouchDevice();
```

### 核心特性

1. **事件归一化**: 统一鼠标和触摸事件接口
2. **手势识别**: 支持单指平移、双指缩放等常见手势
3. **防止默认行为**: 自动阻止移动端页面滚动/缩放
4. **性能优化**: 
   - 使用 `passive: false` 精确控制事件传播
   - 节流处理高频触摸事件
   - 批量更新减少重绘

## 插件改造清单

| 插件 | 移动端支持 | 改造内容 |
|------|----------|---------|
| ✅ PanZoomPlugin | 完整支持 | 单指平移 + 双指缩放 |
| ✅ MinimapPlugin | 完整支持 | 触摸拖动 + 触摸居中 |
| ✅ DragPlugin | 完整支持 | 触摸拖拽节点 |
| ⏳ BoxSelectPlugin | 待支持 | 长按触发框选 |
| ⏳ ResizeRotatePlugin | 待支持 | 双指旋转/缩放节点 |
| ⏳ EdgeEditPlugin | 待支持 | 触摸编辑边路径 |
| ⏳ ConnectPlugin | 待支持 | 触摸连线 |

## 使用指南

### 基础配置

引擎初始化时无需特殊配置，移动端支持已内置：

```typescript
import { CanvasEngine, PanZoomPlugin, DragPlugin, MinimapPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas'),
  background: '#ffffff',
  mode: 'edit',
});

// 注册插件（自动支持移动端）
engine.plugins.use(new PanZoomPlugin());
engine.plugins.use(new DragPlugin());
engine.plugins.use(new MinimapPlugin({ width: 200, height: 140 }));

engine.start();
```

### 响应式适配

建议为移动端设备添加视口配置：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

### CSS 优化

防止移动端默认行为干扰：

```css
#canvas {
  touch-action: none; /* 禁用浏览器默认触摸手势 */
  -webkit-user-select: none; /* 防止文本选择 */
  user-select: none;
}
```

## 注意事项

### 1. **手势冲突**

- **单指平移 vs 节点拖拽**: 通过命中测试自动判断，点击节点时触发拖拽，空白处触发平移
- **双指缩放 vs 单指平移**: 双指优先，检测到第二个触摸点时自动切换为缩放模式
- **小地图 vs 画布交互**: 小地图使用 `capture: true` 优先捕获事件，避免穿透

### 2. **性能考虑**

- 触摸事件频率高于鼠标移动，已使用 `requestAnimationFrame` 节流
- 大规模图（>1000 节点）拖拽时自动降质渲染
- 双指缩放时禁用不必要的动画效果

### 3. **浏览器兼容性**

- **iOS Safari**: 完整支持（iOS 13+）
- **Android Chrome**: 完整支持（Chrome 80+）
- **其他浏览器**: 支持标准 Touch Events API 的现代浏览器

### 4. **事件处理顺序**

插件注册顺序影响触摸事件捕获优先级：

```typescript
// 推荐顺序
engine.plugins.use(new MinimapPlugin());      // 优先捕获（使用 capture: true）
engine.plugins.use(new PanZoomPlugin());       // 画布级别交互
engine.plugins.use(new DragPlugin());          // 节点级别交互
```

## 调试技巧

### 模拟移动设备

Chrome DevTools:
1. `F12` 打开开发者工具
2. `Ctrl+Shift+M` 切换设备模拟
3. 选择移动设备型号
4. 使用鼠标模拟触摸操作

### 真实设备测试

使用本地网络访问：
1. 确保电脑和移动设备在同一局域网
2. 启动开发服务器: `pnpm dev`
3. 移动设备访问: `http://<电脑IP>:5173`

### 事件日志

开启触摸事件日志（仅开发环境）：

```typescript
// 临时调试代码
canvas.addEventListener('touchstart', (e) => {
  console.log('Touch Start:', e.touches.length, 'fingers');
});
canvas.addEventListener('touchmove', (e) => {
  console.log('Touch Move:', e.touches[0].clientX, e.touches[0].clientY);
});
```

## 后续优化方向

:::caution

当前重点场景为PC端，移动端主要适配基础重点场景。

:::

- [ ] BoxSelectPlugin 长按触发框选等符合操作场景
- [ ] 优化触摸点击延迟（Fast Click）
- [ ] 添加触摸震动反馈（Haptic Feedback）
- [ ] ResizeRotatePlugin 双指旋转/缩放
- [ ] EdgeEditPlugin 触摸编辑边路径
- [ ] 移动端专属手势（三指还原视图等）
- [ ] Apple Pencil 精确绘图支持
- [ ] 压感识别（绘制线条粗细）
- [ ] 多点触控高级手势
