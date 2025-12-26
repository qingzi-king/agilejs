/* eslint-disable @typescript-eslint/no-unused-expressions */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Toolbar from '@/components/toolbar'
import { createNodeByShape } from '@/config/nodeTemplates'
import PropertyPanel from '@/components/PropertyPanel'
import ShapesPanel from '@/components/ShapesPanel'
import message from '@/components/common/Message'
import { useCanvasStore, useUIStore, useSelectionStore } from '@/store'
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
  DragPlugin,
  BoxSelectPlugin,
  PanZoomPlugin,
  SelectionOverlayPlugin,
  ConnectPlugin,
  PortOverlayPlugin,
  KeyboardPlugin,
  LabelOverlayPlugin,
  ClipboardPlugin,
  SnapToGridPlugin,
  GuidesPlugin,
  DataDrivenMotionPlugin,
  ResizeRotatePlugin,
  EdgeEditPlugin,
  FlowDashPlugin,
  MinimapPlugin,
  GroupResizeRotatePlugin,
  GroupPlugin,
  NodeFlowDashPlugin,
  // fromJSON,
  fromScene,
  // toScene,
  BlinkPlugin,
  HoverCursorPlugin,
  LineRenderer,
  PolylineNodeEditPlugin,
  DataTooltipPlugin,
  AddEdgeCommand,
  AddNodeCommand,
  ImageRenderer
} from '@fnt-agilejs/core'
// SvgPathRenderer 已通过 @fnt-agilejs/core 暴露
// 引擎内置闪烁插件替代 web 侧 utils/blink
import { useFormatPainter } from '@/hooks/useFormatPainter'

const CanvasEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const engineRef = useRef<CanvasEngine | null>(null)
  // 用于拖拽到画布创建节点时，记住上次生成的自增计数
  const idSeqRef = useRef<number>(1)
  const groupPluginRef = useRef<GroupPlugin | null>(null)

  // Store Actions
  const setEngine = useCanvasStore((state) => state.setEngine)
  const { theme } = useUIStore()
  const updateSelection = useSelectionStore((state) => state.updateSelection)

  // 启用格式刷功能
  useFormatPainter()

  const historyOffRef = useRef<null | (() => void)>(null)
  const [exampleKey, setExampleKey] = useState<string>('default')
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
  // 粘贴图片处理中的轻量 loading 状态（不遮罩）
  const [pastingLoading, setPastingLoading] = useState(false)

  // 闪烁：改为使用引擎内置的 BlinkPlugin
  const blinkRef = useRef<BlinkPlugin | null>(null)
  // 事件日志
  const offs: Array<() => void> = []

  // 主题切换（浅/深）
  // const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') || 'light');
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    // 主题变化时仅调用引擎的 setTheme（引擎内部处理背景与相关插件颜色）
    const engine = engineRef.current
    if (!engine) return
    engine.setTheme(theme as 'light' | 'dark')
    // localStorage.setItem('theme', theme); // Store 已处理持久化
  }, [theme])

  useEffect(() => {
    if (!containerRef.current) return

    // 初始化 engine
    const engine = new CanvasEngine({
      container: containerRef.current,
      background: '#ffffff',
      mode: 'edit',
      // 拖拽期间按规模智能降质：视口内节点/边超过阈值时不渲染边
      dragEdgeRenderThreshold: { nodes: 400, edges: 800 },
      // 可选：保留默认 auto 快照策略（也可改 'off' | 'always'）
      edgeSnapshot: 'auto',
      interactionConfig: {
        enableZoom: true, // 启用缩放
        enablePan: true, // 启用平移
        enableSelection: true, // 允许选中
        enableDrag: true, // 允许拖拽
        minScale: 0.1, // 最小缩放比例
        maxScale: 10 // 最大缩放比例
      },
      dprDegradation: {
        enabled: false // 非Retina屏可关闭DPR降质，否则拖动节点或平移画布时可能出现模糊
      }
    })
    engineRef.current = engine
    setEngine(engine) // 更新 Store

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
    // 图像渲染器
    engine.renderers.register(new ImageRenderer())
    // 边渲染器
    engine.renderers.register(new StraightEdgeRenderer())
    engine.renderers.register(new BezierEdgeRenderer())
    engine.renderers.register(new OrthogonalEdgeRenderer())
    engine.renderers.register(new PolylineEdgeRenderer())
    // SVG 渲染器
    engine.renderers.register(new SvgPathRenderer())
    engine.renderers.register(new SvgImageRenderer())

    // 插件
    engine.plugins.use(new GridPlugin({ size: 20, color: '#f3f4f6' }))
    engine.plugins.use(
      new SelectionOverlayPlugin({
        strokeColor: '#2563eb', // 蓝色
        lineWidth: 2,
        lineDash: [6, 4],
        padding: 2,
        clearSelectionOnCanvasClick: true, // 在空白处点击时清除选择
        handleGuardMarginPx: 40 // 句柄保护外扩像素（可根据触摸设备调大或缩小）
      })
    )
    // 折线节点编辑（line）优先注册，确保在捕获阶段先于标签/拖拽拦截事件（避免击穿），touchHitThreshold 自动适配触摸设备（大屏手机/平板可调高）
    engine.plugins.use(new PolylineNodeEditPlugin({ handleSize: 8, hitThreshold: 8, touchHitThreshold: 'auto' }))
    engine.plugins.use(new DragPlugin())
    engine.plugins.use(new BoxSelectPlugin())
    engine.plugins.use(new PanZoomPlugin())
    engine.plugins.use(new ConnectPlugin())
    engine.plugins.use(new KeyboardPlugin())
    // 先注册文本覆盖层，再注册端口覆盖层，确保端口（锚点）绘制在文本之上
    engine.plugins.use(new LabelOverlayPlugin())
    engine.plugins.use(new PortOverlayPlugin())
    // 剪贴板插件：支持节点复制粘贴和图片粘贴，可配置图片质量和尺寸限制
    engine.plugins.use(
      new ClipboardPlugin({
        maxWidth: 800, // 图片最大宽度（像素）
        maxHeight: 800, // 图片最大高度（像素）
        maxSize: 512000, // 图片最大文件大小（字节，默认1MB）
        quality: 0.5, // 初始压缩质量（0-1）
        strictMaxSize: true, // 开启严格大小限制，超出 maxSize 则拒绝粘贴
        preferWebP: true, // 优先尝试 WebP，不支持时回退 JPEG
        minQuality: 0.5, // 最低质量
        qualityStep: 0.1 // 质量递减步长
      })
    )
    engine.plugins.use(new SnapToGridPlugin(20))
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
    engine.plugins.use(new MinimapPlugin({ width: 200, height: 140, padding: 5 }))
    engine.plugins.use(
      new ResizeRotatePlugin({
        handleColor: '#2563eb', // 蓝色
        rotateHandleColor: '#ef4444', // 红色
        handleHoverColor: '#3b82f6' // 浅蓝色
      })
    )
    // 边路径编辑（适配移动端）
    engine.plugins.use(
      new EdgeEditPlugin({
        handleSize: 8,
        hitThreshold: 8,
        // 减小移动端命中范围：端点稍大，顶点中等，线段更小，降低误触
        touchEndpointHitThreshold: 22,
        touchVertexHitThreshold: 18,
        touchSegmentHitThreshold: 14,
        // 可进一步全局缩放：touchHitThreshold 作为兜底（保留 'auto'）
        touchHitThreshold: 'auto'
      })
    )

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
    const groupPlugin = new GroupPlugin()
    engine.plugins.use(groupPlugin)
    groupPluginRef.current = groupPlugin

    // 悬停光标：节点上显示 move，移出恢复（最后注册，确保不被其他插件覆盖）
    engine.plugins.use(new HoverCursorPlugin())
    // 数据悬停提示：仅在编辑模式下工作
    engine.plugins.use(new DataTooltipPlugin({ delayMs: 300 }))

    // 从外部 JSON 装载默认示例（拆分后的 default.json）
    const data = exampleMap['default']
    if (data) {
      fromScene(engine, data)
    }

    engine.start()

    // 自动捕获 engine.events 支持的所有事件并打印（注：实际按需捕获）
    handleEvent()

    // 绑定粘贴 loading 事件
    const onPasteStart = () => setPastingLoading(true)
    const onPasteEnd = () => setPastingLoading(false)
    engine.events.on('clipboard:image-processing-start', onPasteStart)
    engine.events.on('clipboard:image-processing-end', onPasteEnd)

    // 监听选中变化，同步到 Store
    const onSelectionChanged = (payload: any) => {
      const nodes = payload?.nodes || []
      const edges = payload?.edges || []
      // 确保提取 ID（payload 中的 nodes/edges 可能是对象数组）
      const nodeIds = nodes.map((n: any) => (typeof n === 'string' ? n : n.id))
      const edgeIds = edges.map((e: any) => (typeof e === 'string' ? e : e.id))
      updateSelection(nodeIds, edgeIds)
    }
    engine.events.on('graph:selection-change', onSelectionChanged)

    // 允许左侧面板拖拽创建节点
    const containerEl = containerRef.current!
    const onDragOver = (e: DragEvent) => {
      // 仅当有我们定义的拖拽类型时才阻止默认，否则不影响页面其它拖拽
      const types = Array.from(e.dataTransfer?.types || [])
      if (types.includes('application/agile-shape') || types.includes('text/plain')) {
        e.preventDefault()
        e.dataTransfer!.dropEffect = 'copy'
      }
    }
    const onDrop = (e: DragEvent) => {
      const dt = e.dataTransfer
      if (!dt) return
      let raw = dt.getData('application/agile-shape')
      if (!raw) raw = dt.getData('text/plain')
      if (!raw) return
      e.preventDefault()
      try {
        const payload = JSON.parse(raw)
        const rect = containerEl.getBoundingClientRect()
        const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        const world = engine.toWorld(screen)
        const graph = engine.graph as any
        const history = engine.history as any
        const nextId = () => `n${Date.now().toString(36)}${(idSeqRef.current++).toString(36)}`
        const base = { id: nextId(), position: { x: world.x, y: world.y } } as any

        // 当拖拽的是边类型（以 edge- 开头），创建一条边并生成两个隐形端点节点
        const shape = (payload.shape as string) || ''
        if (shape.startsWith('edge-')) {
          const idA = nextId()
          const idB = nextId()
          const ghostStyle = { fill: 'rgba(0,0,0,0)', stroke: 'rgba(0,0,0,0)' }
          const ghostSize = { width: 8, height: 8 }
          const a = {
            id: idA,
            position: { x: world.x - 20, y: world.y - 10 },
            shape: 'rect',
            data: { style: ghostStyle },
            size: ghostSize
          }
          const b = {
            id: idB,
            position: { x: world.x + 20, y: world.y + 10 },
            shape: 'rect',
            data: { style: ghostStyle },
            size: ghostSize
          }
          const edgeId = `e${Date.now().toString(36)}${(idSeqRef.current++).toString(36)}`
          const style = { lineWidth: 2, stroke: '#000000', cornerRadius: 0 }
          const edge = { id: edgeId, shape, source: idA, target: idB, data: { style } }
          // 历史事务：一次拖拽入图作为一个可撤销操作
          if (history && typeof history.beginTransaction === 'function') {
            history.beginTransaction('Drop')
            try {
              history.execute(new AddNodeCommand(engine.graph, a))
              history.execute(new AddNodeCommand(engine.graph, b))
              history.execute(new AddEdgeCommand(engine.graph, edge))
              history.commitTransaction()
            } catch {
              try {
                history.rollbackTransaction()
              } catch {
                console.warn('rollbackTransaction failed')
              }
              // 兜底：直接入图，避免丢失
              graph.addNode(a)
              graph.addNode(b)
              graph.addEdge(edge)
              engine.graph.markDirty()
            }
          } else {
            // 无历史对象时直接添加
            graph.addNode(a)
            graph.addNode(b)
            graph.addEdge(edge)
            engine.graph.markDirty()
          }
        } else {
          // 使用配置/工厂创建节点
          const tpl = createNodeByShape(shape, payload.payload)
          if (tpl) {
            // 置顶：新节点 zIndex = 当前最大 zIndex + 1
            const nodes = engine.graph.getNodes()
            let maxZ = 0
            for (const n of nodes) maxZ = Math.max(maxZ, n.zIndex ?? 0)
            const zIndex = maxZ + 1
            const node = { ...base, ...tpl, zIndex } as any
            if (history && typeof history.execute === 'function') {
              // 将“拖入新建节点”纳入历史
              try {
                history.beginTransaction('Drop')
                history.execute(new AddNodeCommand(engine.graph, node))
                history.commitTransaction()
              } catch {
                try {
                  history.rollbackTransaction()
                } catch {
                  console.warn('rollbackTransaction failed')
                }
                graph.addNode(node)
                engine.graph.markDirty()
              }
            } else {
              graph.addNode(node)
              engine.graph.markDirty()
            }
          }
        }
      } catch (err) {
        console.warn('Invalid drop payload', err)
      }
    }
    containerEl.addEventListener('dragover', onDragOver)
    containerEl.addEventListener('drop', onDrop)

    /**
     * 键盘快捷键处理（组合/解组）
     * - Cmd/Ctrl+G: 组合选中节点
     * - Shift+Cmd/Ctrl+G: 逐层解组（移除最内层组）
     * - Alt+Cmd/Ctrl+G: 完全展平（移除所有层级组）
     * 这里简单监听 window 的键盘事件，实际项目中可用 KeyboardPlugin 提供的事件总线注册
     * 注意避免与浏览器或系统快捷键冲突
     * @param ev KeyboardEvent
     */
    const onKey = (ev: KeyboardEvent) => {
      const isCmd = ev.metaKey || ev.ctrlKey
      if (!isCmd) return
      if (ev.key.toLowerCase() === 'g') {
        ev.preventDefault()
        if (ev.altKey) {
          // Alt+Cmd+G: 完全展平所有层级
          groupPluginRef.current?.ungroupAllLevels()
        } else if (ev.shiftKey) {
          // Shift+Cmd+G: 逐层解组（默认行为）
          groupPluginRef.current?.ungroupSelected()
        } else {
          // Cmd+G: 组合
          groupPluginRef.current?.groupSelected()
        }
      }
    }
    window.addEventListener('keydown', onKey)

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
      containerEl.removeEventListener('dragover', onDragOver)
      containerEl.removeEventListener('drop', onDrop)
      engine.destroy()
      engineRef.current = null
      setEngine(null)
      window.removeEventListener('keydown', onKey)
      // 解绑 loading 事件
      engine.events?.on && engine.events.on('noop', () => {}) // 保持空操作
      engine.events &&
        (engine.events as any)._events &&
        delete (engine.events as any)._events?.['clipboard:image-processing-start']
      engine.events &&
        (engine.events as any)._events &&
        delete (engine.events as any)._events?.['clipboard:image-processing-end']
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exampleMap])

  // 自动捕获 engine.events 支持的所有事件并打印
  const handleEvent = () => {
    const engine = engineRef.current;
    if (!engine) return;

    // engine.enablePerformanceMonitor(true);
    // setInterval(() => {
    //   // 获取性能数据
    //   const stats = engine.getPerformanceStats();
    //   console.log('monitor:', stats);
    // }, 500);

    // 尝试获取所有可监听事件名（engine.events._events 结构为 Map/Record）
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
    // ['boxSelectChange'].forEach((evt: string) => {
    //   const off = (engine.events.on as any)(evt, (payload: any) => {
    //     // 统一打印事件名和 payload
    //     console.log(`[event] ${evt}`, payload);
    //   });
    //   offs.push(off);
    // });
    engine.events.on('clipboard:image-rejected', (payload: any) => {
      message.warning('粘贴的图片被拒绝：' + (payload?.reason || '不符合大小或格式要求'))
      console.log(`[event] clipboard:image-rejected`, payload)
    })
  }

  const loadExample = (key: string) => {
    const engine = engineRef.current
    if (!engine) return
    // 停止所有闪烁，避免悬挂 tween 或引用旧节点
    blinkRef.current?.stopAll()
    const data = exampleMap[key]
    if (!data) return // 清空现有图（使用公开 API，避免缓存不同步导致上次 edges 残留）
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
  }

  // 切换示例
  const handleChangeExample = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const k = e.target.value
    setExampleKey(k)
    loadExample(k)
  }

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-gray-900 transition-colors">
      {/* 工具栏组件 */}
      <Toolbar />
      {/* 主体区域：上下flex分布，画布和侧边栏/面板等填满剩余空间 */}
      <div className="flex-1 min-h-0 w-full relative flex flex-row">
        <ShapesPanel />
        <div ref={containerRef} className="h-full w-full relative" />
        <PropertyPanel />
        {/* 右上角操作说明和示例切换 */}
        <div className="absolute top-2.5 right-2.5 z-1 bg-gray-100 dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 p-2 rounded text-sm max-h-full max-w-[360px] overflow-auto text-gray-900 dark:text-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 dark:text-gray-400">切换示例：</span>
            <select
              className="px-2 py-1 rounded border bg-white cursor-pointer dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
              value={exampleKey}
              onChange={handleChangeExample}
            >
              {exampleKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          {/* 轻量粘贴中指示器（不遮罩）：一个小圆点和文字 */}
          {pastingLoading && (
            <div
              className="mt-2 flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300"
              title="图片粘贴处理中"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>粘贴处理中</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CanvasEditor
