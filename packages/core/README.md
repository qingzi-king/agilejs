# Agilejs Core

一个轻量级、零依赖的 Canvas 可视化引擎，支持插件化与自定义渲染器。

## 开发

1. 安装依赖

```bash
npm i
```

2. 构建（监视）

```bash
npm run dev
```

3. 打开示例

详见[操作手册](https://agilejs.funenc.com/)。

## 使用概览

```ts
import {
  CanvasEngine,
  GridPlugin,
  SelectionOverlayPlugin,
  DragPlugin,
  BoxSelectPlugin,
  PanZoomPlugin,
  RectRenderer,
  CircleRenderer,
  DiamondRenderer,
  StraightEdgeRenderer,
  StraightEdgeRenderer,
  BezierEdgeRenderer,
  OrthogonalEdgeRenderer,
  ConnectPlugin,
  PortOverlayPlugin,
  KeyboardPlugin,
  toJSON,
  fromJSON,
} from "@fnt-agilejs/core";

const engine = new CanvasEngine({ container: document.getElementById("app")!, background: "#fff" });
engine.renderers.register(new RectRenderer());
engine.renderers.register(new CircleRenderer());
engine.renderers.register(new DiamondRenderer());
engine.renderers.register(new StraightEdgeRenderer());
engine.renderers.register(new BezierEdgeRenderer());
engine.renderers.register(new OrthogonalEdgeRenderer());

engine.plugins.use(new GridPlugin({ size: 20 }));
engine.plugins.use(new SelectionOverlayPlugin());
engine.plugins.use(new DragPlugin());
engine.plugins.use(new BoxSelectPlugin());
engine.plugins.use(new PanZoomPlugin());
engine.plugins.use(new ConnectPlugin());
engine.plugins.use(new PortOverlayPlugin());
engine.plugins.use(new KeyboardPlugin());

engine.graph.addNode({ id: "n1", shape: "rect", position: { x: 100, y: 100 }, size: { width: 120, height: 80 } });
engine.graph.addNode({ id: "n2", shape: "circle", position: { x: 350, y: 100 }, size: { width: 100, height: 100 } });
engine.graph.addEdge({ id: "e1", shape: "edge-straight", source: "n1", target: "n2" });
engine.start();
```

## 目录结构

```
.
├── README.md
├── dist                    # 构建产物
├── docs                    # 文档资源
├── package.json
├── pnpm-lock.yaml
├── src                     # 源码主目录
│   ├── commands            # 命令模式实现（操作封装）
│   ├── core                # 核心引擎（事件、循环、历史记录）
│   ├── index.ts            # 统一导出入口
│   ├── model               # 数据模型（图、节点、边、序列化）
│   ├── plugins             # 插件集合（交互、工具、增强功能）
│   ├── renderer            # 渲染器基类与注册机制
│   ├── renderers           # 内置渲染器（形状、连线）
│   ├── utils               # 通用工具库
│   └── workers             # 独立线程 Worker
├── tsconfig.build.json
└── tsconfig.json
```
