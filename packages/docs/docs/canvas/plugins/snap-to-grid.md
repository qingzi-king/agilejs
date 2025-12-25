# SnapToGridPlugin

网格吸附插件, 拖拽节点结束时自动将节点位置吸附到最近的网格点, 实现精确对齐。

## 基本使用

```typescript
import { CanvasEngine, SnapToGridPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

// 使用简化配置
engine.plugins.use(new SnapToGridPlugin(20));

// 或使用完整配置
engine.plugins.use(new SnapToGridPlugin({
  size: 20,
  requireModifier: 'cmdOrCtrl'
}));

engine.start();
```

## 配置与交互

### 配置选项

```typescript
interface SnapToGridOptions {
  size?: number;                    // 网格大小, 默认 20
  requireModifier?: Modifier;       // 修饰键要求, 默认 'cmdOrCtrl'
}

type Modifier = 
  | 'none'       // 总是吸附
  | 'shift'      // 需要按住 Shift
  | 'alt'        // 需要按住 Alt
  | 'meta'       // 需要按住 Meta (Mac Cmd)
  | 'ctrl'       // 需要按住 Ctrl
  | 'cmdOrCtrl'; // 需要按住 Cmd 或 Ctrl (默认)

// 示例
engine.plugins.use(new SnapToGridPlugin({
  size: 20,
  requireModifier: 'none'  // 总是吸附
}));
```

### 功能特性

**拖拽结束吸附:**
- 只在鼠标释放时执行吸附
- 不影响拖拽过程中的流畅性

**修饰键控制:**
- `none`: 总是吸附
- `shift`: 按住 Shift 时吸附
- `cmdOrCtrl`: 按住 Cmd/Ctrl 时吸附(默认)

**吸附算法:**
```typescript
const snappedX = Math.round(x / size) * size;
const snappedY = Math.round(y / size) * size;
```

## API与事件

### 插件ID

```typescript
readonly id = "snap-to-grid"
```

### 构造函数

```typescript
// 简化形式
constructor(size: number)

// 完整形式
constructor(options: SnapToGridOptions)
```

### 生命周期方法

#### setup(engine: CanvasEngine): void
设置插件, 监听鼠标事件。

#### dispose(): void
清理插件, 移除事件监听。

## 常见问题

### Q: 为何有时不吸附?

A: 检查:
1. 是否按住了所需的修饰键
2. 是否在拖拽结束时(不是拖拽过程中)
3. DragPlugin 是否正确安装

### Q: 如何禁用吸附?

A: 移除插件:

```typescript
engine.plugins.eject('snap-to-grid');
```

### Q: 如何与 GridPlugin 配合使用?

A: 确保两个插件的 `size` 配置相同:

```typescript
engine.plugins.use(new GridPlugin({ size: 20 }));
engine.plugins.use(new SnapToGridPlugin(20));
```

## 相关内容

- [GridPlugin](./grid.md) - 网格显示
- [GuidesPlugin](./guides.md) - 对齐参考线
