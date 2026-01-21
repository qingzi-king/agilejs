import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  CanvasEngine,
  GridPlugin,
  RectRenderer,
  CircleRenderer,
  DiamondRenderer,
  StarRenderer,
  TriangleRenderer,
  HexagonRenderer,
  CylinderRenderer,
  CrossRenderer,
  ParallelogramRenderer,
  EllipseRenderer,
  SemicircleRenderer,
  TrapezoidRenderer,
  RightArrowRenderer,
  DoubleArrowRenderer,
  CloudRenderer,
  PentagonRenderer,
  OctagonRenderer,
  SectorRenderer,
  RightTriangleRenderer,
  CornerRenderer,
  StraightEdgeRenderer,
  BezierEdgeRenderer,
  OrthogonalEdgeRenderer,
  PolylineEdgeRenderer,
  SvgPathRenderer,
  SvgImageRenderer,
  // DragPlugin,
  BoxSelectPlugin,
  PanZoomPlugin,
  SelectionOverlayPlugin,
  // ConnectPlugin,
  // PortOverlayPlugin,
  // KeyboardPlugin,
  LabelOverlayPlugin,
  // ClipboardPlugin,
  // SnapToGridPlugin,
  GuidesPlugin,
  DataDrivenMotionPlugin,
  ResizeRotatePlugin,
  // EdgeEditPlugin,
  FlowDashPlugin,
  // MinimapPlugin,
  GroupResizeRotatePlugin,
  // GroupPlugin,
  NodeFlowDashPlugin,
  // fromJSON,
  fromScene,
  // toScene,
  BlinkPlugin,
  // HoverCursorPlugin,
  LineRenderer,
  PolylineNodeEditPlugin,
  ImageRenderer
} from '@fnt-agilejs/core'
// SvgPathRenderer 已通过 @fnt-agilejs/core 暴露
// 引擎内置闪烁插件替代 web 侧 utils/blink
import { AutoTestPanel } from '@/components/AutoTestPanel'

const CanvasPreview: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const engineRef = useRef<CanvasEngine | null>(null)
  // 用于拖拽到画布创建节点时，记住上次生成的自增计数
  // const groupPluginRef = useRef<GroupPlugin | null>(null);
  const historyOffRef = useRef<null | (() => void)>(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [exampleKey, setExampleKey] = useState<string>(() => {
    return searchParams.get('demoType') || 'default'
  })
  // 使用 Vite 动态导入拆分后的 json 文件
  const exampleModules = useMemo(() => {
    return import.meta.glob('@/mock/examples/*.json', { eager: true, import: 'default' }) as Record<string, any>
  }, [])
  const exampleMap = useMemo(() => {
    const map: Record<string, any> = {}
    Object.entries(exampleModules).forEach(([path, mod]) => {
      // 提取文件名作为 key，例如 /.../examples/default.json -> default
      const match = path.match(/examples\/([^/]+)\.json$/)
      const key = match ? match[1] : path
      map[key] = mod
    })
    return map
  }, [exampleModules])
  const exampleKeys = useMemo(() => Object.keys(exampleMap).sort(), [exampleMap])

  // 闪烁：改为使用引擎内置的 BlinkPlugin
  const blinkRef = useRef<BlinkPlugin | null>(null)
  // 事件日志
  const offs: Array<() => void> = []

  useEffect(() => {
    if (!containerRef.current) return

    // 初始化 engine
    const engine = new CanvasEngine({
      container: containerRef.current,
      background: '#ffffff',
      // 拖拽期间按规模智能降质：视口内节点/边超过阈值时不渲染边
      dragEdgeRenderThreshold: { nodes: 400, edges: 800 },
      // 可选：保留默认 auto 快照策略（也可改 'off' | 'always'）
      edgeSnapshot: 'auto',
      interactionConfig: {
        enableZoom: true, // 禁用缩放
        enablePan: true, // 禁用平移
        enableSelection: false, // 允许选中
        enableDrag: false // 允许拖拽
      }
    })
    engineRef.current = engine

    // 注册渲染器
    engine.renderers.register(new RectRenderer())
    engine.renderers.register(new CircleRenderer())
    engine.renderers.register(new DiamondRenderer())
    // 注册新增的基础图形渲染器
    engine.renderers.register(new StarRenderer())
    engine.renderers.register(new TriangleRenderer())
    engine.renderers.register(new HexagonRenderer())
    engine.renderers.register(new CylinderRenderer())
    engine.renderers.register(new ParallelogramRenderer())
    engine.renderers.register(new EllipseRenderer())
    engine.renderers.register(new SemicircleRenderer())
    engine.renderers.register(new TrapezoidRenderer())
    engine.renderers.register(new RightArrowRenderer())
    engine.renderers.register(new DoubleArrowRenderer())
    engine.renderers.register(new CrossRenderer())
    engine.renderers.register(new CornerRenderer())
    engine.renderers.register(new CloudRenderer())
    engine.renderers.register(new PentagonRenderer())
    engine.renderers.register(new OctagonRenderer())
    engine.renderers.register(new SectorRenderer())
    engine.renderers.register(new RightTriangleRenderer())
    engine.renderers.register(new LineRenderer())
    // 边渲染器
    engine.renderers.register(new StraightEdgeRenderer())
    engine.renderers.register(new BezierEdgeRenderer())
    engine.renderers.register(new OrthogonalEdgeRenderer())
    engine.renderers.register(new PolylineEdgeRenderer())
    // SVG 渲染器
    engine.renderers.register(new SvgPathRenderer())
    engine.renderers.register(new SvgImageRenderer())
    engine.renderers.register(new ImageRenderer())

    // 插件
    engine.plugins.use(new GridPlugin({ size: 20, color: '#f3f4f6' }))
    engine.plugins.use(
      new SelectionOverlayPlugin({
        strokeColor: '#2563eb', // 蓝色
        lineWidth: 2,
        lineDash: [6, 4],
        padding: 2,
        clearSelectionOnCanvasClick: true // 在空白处点击时清除选择
      })
    )
    // 折线节点编辑（line）优先注册，确保在捕获阶段先于标签/拖拽拦截事件（避免击穿）
    engine.plugins.use(new PolylineNodeEditPlugin({ handleSize: 8 }))
    // engine.plugins.use(new DragPlugin());
    engine.plugins.use(new BoxSelectPlugin())
    engine.plugins.use(new PanZoomPlugin())
    // engine.plugins.use(new ConnectPlugin());
    // engine.plugins.use(new KeyboardPlugin());
    // 先注册文本覆盖层，再注册端口覆盖层，确保端口（锚点）绘制在文本之上
    engine.plugins.use(new LabelOverlayPlugin())
    // engine.plugins.use(new PortOverlayPlugin());
    // engine.plugins.use(new ClipboardPlugin());
    // engine.plugins.use(new SnapToGridPlugin(20));
    engine.plugins.use(new GuidesPlugin({ threshold: 6, color: '#ef4444', lineWidth: 1, lineDash: [4, 3] }))
    engine.plugins.use(new DataDrivenMotionPlugin())
    // 闪烁插件（内置）
    const blink = new BlinkPlugin()
    engine.plugins.use(blink)
    blinkRef.current = blink
    engine.plugins.use(new FlowDashPlugin({ defaultSpeed: 160 }))
    // 节点描边虚线流动
    engine.plugins.use(new NodeFlowDashPlugin({ defaultSpeed: 160 }))
    // 迷你地图：右下角
    // engine.plugins.use(new MinimapPlugin({ width: 200, height: 140, padding: 5 }));
    engine.plugins.use(
      new ResizeRotatePlugin({
        handleColor: '#2563eb', // 蓝色
        rotateHandleColor: '#ef4444', // 红色
        handleHoverColor: '#3b82f6' // 浅蓝色
      })
    )
    // 边路径编辑
    // engine.plugins.use(new EdgeEditPlugin({ handleSize: 8 }));

    // 组统一控制点（多选时出现）
    engine.plugins.use(
      new GroupResizeRotatePlugin({
        handleSize: 8,
        handleColor: '#16a34a', // 绿色
        handleHoverColor: '#22c55e',
        rotateHandleColor: '#0ea5e9',
        rotateHandleOffset: 40
      })
    )

    // 分组插件（组合/解组、点击组内节点选中整组）
    // const groupPlugin = new GroupPlugin();
    // engine.plugins.use(groupPlugin);
    // groupPluginRef.current = groupPlugin;

    // 悬停光标：节点上显示 move，移出恢复（最后注册，确保不被其他插件覆盖）
    // engine.plugins.use(new HoverCursorPlugin());

    engine.start()

    // 自动捕获 engine.events 支持的所有事件并打印（注：实际按需捕获）
    handleEvent()

    return () => {
      // 停止所有闪烁，避免残留动画
      blinkRef.current?.stopAll()
      // 解绑通过 bind() 注册的所有事件
      if (offs.length) {
        for (const off of offs) {
          try {
            off()
          } catch {
            /* ignore */
          }
        }
      }
      historyOffRef.current?.()
      historyOffRef.current = null
      engine.destroy()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exampleMap])

  // 初始化或 exampleKey 变化时加载示例
  useEffect(() => {
    if (engineRef.current && exampleMap[exampleKey]) {
      loadExample(exampleKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exampleKey, exampleMap])

  // 自动捕获 engine.events 支持的所有事件并打印
  const handleEvent = () => {
    // const engine = engineRef.current;
    // if (!engine) return;
    // // 尝试获取所有可监听事件名（engine.events._events 结构为 Map/Record）
    // const eventNames = Array.isArray((engine.events as any)._events)
    //   ? (engine.events as any)._events.map((e: any) => e.name)
    //   : (engine.events && typeof (engine.events as any)._events === 'object')
    //     ? Object.keys((engine.events as any)._events)
    //     : [];
    // // 若无法自动获取，则可手动补充常见事件名
    // const fallbackEvents = [
    //   'started', 'stopped', 'selectionChanged', 'graphChanged',
    //   'boxSelectStart', 'boxSelectChange', 'boxSelectEnd',
    //   'dragStart', 'dragMove', 'dragEnd',
    //   'resizeStart', 'resizeMove', 'resizeEnd',
    //   'rotateStart', 'rotateMove', 'rotateEnd',
    //   'groupResizeStart', 'groupResizeMove', 'groupResizeEnd',
    //   'groupRotateStart', 'groupRotateMove', 'groupRotateEnd',
    //   // 其他可能事件...
    // ];
    // const allEvents = eventNames.length ? eventNames : fallbackEvents;
    // allEvents.forEach((evt: string) => {
    //   const off = (engine.events.on as any)(evt, (payload: any) => {
    //     // 统一打印事件名和 payload
    //     console.log(`[event] ${evt}`, payload);
    //   });
    //   offs.push(off);
    // });
  }
  // 适应视图
  const handleFitAll = () => {
    const engine = engineRef.current
    engine?.fitView({ padding: 20 })
  }
  // 加载示例
  const loadExample = (key: string) => {
    const engine = engineRef.current
    if (!engine) return
    // 停止所有闪烁，避免悬挂 tween 或引用旧节点
    blinkRef.current?.stopAll()
    const data = exampleMap[key]
    if (!data) return // 清空现有图
    engine.graph.clear()
    // 生成型示例：根据 meta 规则动态造数
    if ((data as any).meta?.type === 'generated') {
      const meta = (data as any).meta
      const rows = meta.grid?.rows ?? 25
      const cols = meta.grid?.cols ?? 40
      const startX = meta.grid?.startX ?? 60
      const startY = meta.grid?.startY ?? 60
      const stepX = meta.grid?.stepX ?? 80
      const stepY = meta.grid?.stepY ?? 60
      const nodeSize = meta.node?.size ?? { width: 60, height: 36 }
      const edgeMode = meta.edges?.mode ?? 'chain-ring' // 这里的 options 是 UI 侧常量，可能需要转换为 graph 节点结构
      const total = rows * cols // 1000 = 25*40
      const nodes: any[] = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c + 1
          nodes.push({
            id: `n${i}`,
            // TODO: 文本预设兼容：options.textStyle -> style.text
            position: { x: startX + c * stepX, y: startY + r * stepY },
            shape: meta.node?.shape ?? 'rect',
            data: {
              style: {
                fill: '#236EFE'
              }
            },
            size: nodeSize
          })
        }
      }
      const edges: any[] = []
      if (edgeMode === 'grid-right-down') {
        // 为每个网格节点连接右邻、下邻
        let eid = 1
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c + 1 // 当前节点编号
            // 向右连接
            if (c + 1 < cols) {
              const j = r * cols + (c + 1) + 1
              edges.push({ id: `e${eid++}`, shape: 'edge-straight', source: `n${i}`, target: `n${j}` })
            }
            // 向下连接
            if (r + 1 < rows) {
              const j = (r + 1) * cols + c + 1
              edges.push({ id: `e${eid++}`, shape: 'edge-straight', source: `n${i}`, target: `n${j}` })
            }
          }
        }
      } else {
        // 默认 chain-ring: n1->n2->...->n(total)->n1
        for (let i = 1; i <= total; i++) {
          const j = i === total ? 1 : i + 1
          edges.push({ id: `e${i}`, shape: 'edge-straight', source: `n${i}`, target: `n${j}` })
        }
      }
      fromScene(engine, { nodes, edges })
      return
    } else {
      // 静态示例：直接装载；BlinkPlugin 会在 beforeRender 自动读取 data.blink 并对齐
      fromScene(engine, data)
    }
    handleFitAll() // 装载后适应视图
  }
  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-gray-900 transition-colors">
      {/* 主体区域：上下flex分布，画布和侧边栏/面板等填满剩余空间 */}
      <div className="flex-1 min-h-0 w-full relative flex flex-row">
        <div ref={containerRef} className="h-full w-full relative" />
        {/* 右上角操作说明和示例切换 */}
        <div className="absolute top-2.5 right-2.5 z-1 bg-gray-100 dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 p-2 rounded text-sm max-h-full max-w-[360px] overflow-auto text-gray-900 dark:text-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 dark:text-gray-400">切换示例：</span>
            <select
              className="px-2 py-1 rounded border bg-white cursor-pointer dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              value={exampleKey}
              onChange={(e) => {
                const k = e.target.value
                // 使用 React Router 更新 URL 参数
                navigate(`?demoType=${k}`, { replace: true })
                setExampleKey(k)
                loadExample(k)
              }}
            >
              {exampleKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {/* 自动测试面板 */}
      <AutoTestPanel engine={engineRef.current} />
    </div>
  )
}

export default CanvasPreview
