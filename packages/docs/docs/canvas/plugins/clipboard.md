# ClipboardPlugin

剪贴板插件，提供复制粘贴功能，支持复制选中的节点和边并粘贴到画布，同时支持从系统剪贴板粘贴图片。

## 基本使用

```typescript
import { CanvasEngine, ClipboardPlugin } from '@fnt-agilejs/core';

const engine = new CanvasEngine({
  container: document.getElementById('canvas-container')!,
});

// 使用默认配置
engine.plugins.use(new ClipboardPlugin());

// 或自定义图片粘贴配置
engine.plugins.use(new ClipboardPlugin({
  maxWidth: 1024,              // 图片最大宽度（像素）
  maxHeight: 1024,             // 图片最大高度（像素）
  maxSize: 2 * 1024 * 1024,    // 图片最大文件大小（字节）
  quality: 0.9,                // 压缩质量（0-1）
  defaultSize: { width: 300, height: 200 }  // 默认节点尺寸
}));

engine.start();
```

## 配置与交互

### 配置选项

```typescript
interface ImagePasteConfig {
  maxWidth?: number;        // 图片最大宽度（像素），默认 800
  maxHeight?: number;       // 图片最大高度（像素），默认 800
  maxSize?: number;         // 图片最大文件大小（字节），默认 1MB
  quality?: number;         // 压缩质量 (0-1)，默认 0.85
  defaultSize?: {           // 默认节点尺寸
    width: number;
    height: number;
  };
}
```

#### 配置说明

| 属性 | 类型 | 默认值 | 描述 |
|-----|------|--------|------|
| maxWidth | number | 800 | 图片压缩后的最大宽度（像素） |
| maxHeight | number | 800 | 图片压缩后的最大高度（像素） |
| maxSize | number | 1048576 | 图片文件最大大小（字节），超过会压缩 |
| quality | number | 0.85 | JPEG 压缩质量（0-1），1 为最高质量 |
| defaultSize | object | `{ width: 200, height: 150 }` | 图片节点的默认尺寸，实际由调用者赋值 |

### 快捷键列表

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + C` | 复制选中节点和边 |
| `Cmd/Ctrl + V` | 粘贴节点或图片 |

### 功能特性

- **节点复制粘贴**：自动生成新 ID，保持连接关系和组关系
- **图片粘贴**：支持截图、复制图片，自动压缩为 base64
- **智能定位**：内容可见时偏移 +20px，不可见时放到视口中心

### 自定义质量配置

```typescript
// 高质量图片
engine.plugins.use(new ClipboardPlugin({
  maxWidth: 1920,
  maxHeight: 1080,
  maxSize: 5 * 1024 * 1024,  // 5MB
  quality: 0.95
}));

// 低质量图片（节省空间）
engine.plugins.use(new ClipboardPlugin({
  maxWidth: 400,
  maxHeight: 300,
  maxSize: 512 * 1024,  // 512KB
  quality: 0.7
}));
```

## API 与事件

### 插件 ID

```typescript
readonly id = "clipboard"
```

### 生命周期方法

#### setup

```typescript
setup(engine: CanvasEngine): void
```

设置插件，注册快捷键和粘贴监听。

#### dispose

```typescript
dispose(): void
```

销毁插件，移除监听器。

## 常见问题

### Q: 粘贴图片后文件太大？

A: 降低压缩配置：

```typescript
engine.plugins.use(new ClipboardPlugin({
  maxWidth: 400,
  maxHeight: 300,
  quality: 0.6,
  maxSize: 256 * 1024  // 256KB
}));
```

### Q: 图片粘贴后不清晰？

A: 提高压缩质量：

```typescript
engine.plugins.use(new ClipboardPlugin({
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.95
}));
```

### Q: 在输入框中也触发了复制粘贴？

A: 插件已自动检测画布激活状态，仅在画布获得焦点时响应。

### Q: 支持哪些图片格式？

A: 支持 PNG、JPEG、GIF、WebP（部分浏览器）、BMP（部分浏览器）。

## 相关内容

- [ImageRenderer](../custom-renderers.md) - 图片节点渲染器
- [KeyboardPlugin](./keyboard.md) - 快捷键处理
- [节点数据结构](../nodes.md) - 节点配置详解
