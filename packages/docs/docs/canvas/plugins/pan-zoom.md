# PanZoomPlugin

平移和缩放插件，支持鼠标和触摸操作。

## 基本使用

```typescript
import { CanvasEngine, PanZoomPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

engine.plugins.use(new PanZoomPlugin());
engine.start();
```

## 配置与交互

### 配置选项

通过引擎的交互配置控制：

```typescript
engine.setInteractionConfig({
  enablePan: true,   // 启用平移，默认 true
  enableZoom: true   // 启用缩放，默认 true
});
```

### 交互操作

| 操作 | 鼠标 | 触摸 |
|------|------|------|
| 平移画布 | 左键拖拽空白区域（不按 Cmd/Ctrl） | 单指拖拽 |
| 缩放画布 | 鼠标滚轮 | 双指捏合/展开 |
| 缩放中心 | 鼠标位置 | 双指中心点 |

### 触发条件

**平移：**
1. 鼠标左键或单指触摸
2. 不按住 Cmd/Ctrl 键
3. 点击位置不在节点上
4. `enablePan` 为 `true`

**缩放：**
1. 鼠标滚轮或双指缩放
2. `enableZoom` 为 `true`

## API 与事件

### 插件 ID

```typescript
readonly id = "pan-zoom"
```

### 引擎 API

```typescript
// 获取状态
const scale = engine.getScale();
const translation = engine.getTranslation();

// 设置状态
engine.setScale(1.5);
engine.setTranslation({ x: 100, y: 50 });

// 平滑缩放到指定位置
engine.zoomTo(2.0, { x: 200, y: 100 }, 300);
```

### 生命周期方法

#### setup

```typescript
setup(engine: CanvasEngine): void
```

设置插件，注册事件监听。

#### destroy

```typescript
destroy(): void
```

销毁插件，移除监听器。

## 常见问题

### Q: 如何禁用平移但保留缩放？

A: 设置交互配置：

```typescript
engine.setInteractionConfig({
  enablePan: false,
  enableZoom: true
});
```

### Q: 如何限制缩放范围？

A: 通过引擎配置：

```typescript
const engine = new CanvasEngine({
  interactionConfig: {
    minScale: 0.1,
    maxScale: 5
  }
});
```

### Q: 如何自定义缩放速度？

A: 当前由引擎内部控制，暂不支持自定义。

## 相关内容

- [MinimapPlugin](./minimap.md) - 迷你地图
