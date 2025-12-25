/*
 * @Description: 面板基础图形
 * @Author: qingzi.wang
 * @Date: 2025-10-12 00:12:55
 * @LastEditTime: 2025-12-09 09:30:14
 */
import React, { useEffect, useRef, useState } from 'react'
import CanvasSettingsSection from './panel/CanvasSettingsSection'
import NodeProperties from './panel/NodeProperties'
import EdgeProperties from './panel/EdgeProperties'
import {
  UpdateNodeDataCommand,
  UpdateEdgeDataCommand,
  UpdateNodePropsCommand,
  SetEdgeShapeCommand,
  ResizeNodeWithPortsCommand,
  SetNodeRotationCommand,
  SetZIndexCommand,
  MoveNodeCommand,
  SetCanvasBackgroundCommand,
  SetGridOptionsCommand,
  SetGuidesOptionsCommand,
  UpdateNodePortsCommand
} from '@fnt-agilejs/core'
import { useCanvasStore, useUIStore, useSelectionStore } from '@/store'
import CustomDataEditor from './panel/CustomDataEditor'
import PortsEditor, { PortsEditorRef } from './panel/PortsEditor'
import Modal from '@/components/common/Modal'

interface NodeLite {
  id: string
  shape: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  rotation?: number
  zIndex?: number
  data?: any
  groupId?: string
  isContainer?: boolean
  ports?: Array<{ offset: { x: number; y: number } }>
  selected?: boolean
}

interface EdgeLite {
  id: string
  shape: string
  target: string
  source?: string
  points?: any[]
  data?: any
  selected?: boolean
}

interface PropertyPanelProps {
  className?: string
}
interface CanvasDraft {
  background?: string
  gridSize?: number
  gridColor?: string
  gridAlpha?: number
  gridType?: 'line' | 'dot'
  gridVisible?: boolean
  guidesThreshold?: number
  guidesVisible?: boolean
  // 交互控制
  enablePan?: boolean
  enableZoom?: boolean
  enableSelection?: boolean
  enableDrag?: boolean
  enableResize?: boolean
  enableRotate?: boolean
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ className = '' }) => {
  const engine = useCanvasStore((state) => state.engine)
  const visible = useUIStore((state) => state.propertyPanelOpen)
  const { selectionKind, selectedNodeIds, selectedEdgeIds } = useSelectionStore()

  // 临时缓存：当关闭 pipeline 时存储最近一次的 pipeline 配置，重新开启恢复
  const pipelineCacheRef = useRef<Record<string, any>>({})
  const [canvasDraft, setCanvasDraft] = useState<CanvasDraft>({})
  // 文本类输入聚焦时暂缓同步（仅 text/textarea/json），选择与数字步进不受影响
  const inputLockRef = useRef(false)

  const [nodeDraft, setNodeDraft] = useState<any>({})
  const [edgeDraft, setEdgeDraft] = useState<any>({})
  // 画布设置合并事务：连续修改在短时间窗口内合并为一条历史
  const canvasTxnRef = useRef<{ active: boolean; timer: any }>({
    active: false,
    timer: null
  })
  const beginCanvasTxn = () => {
    if (!engine) return
    if (!canvasTxnRef.current.active) {
      engine.history.beginTransaction('Canvas Settings')
      canvasTxnRef.current.active = true
    }
  }
  const scheduleCommitCanvasTxn = (delay = 800) => {
    if (!engine) return
    if (!canvasTxnRef.current.active) return
    if (canvasTxnRef.current.timer) {
      clearTimeout(canvasTxnRef.current.timer)
    }
    canvasTxnRef.current.timer = setTimeout(() => {
      try {
        engine.history.commitTransaction()
      } finally {
        canvasTxnRef.current.active = false
        canvasTxnRef.current.timer = null
      }
    }, delay)
  }
  // 自定义数据弹窗
  const [dataModal, setDataModal] = useState<{
    type: 'node' | 'edge' | null
    open: boolean
  }>({ type: null, open: false })
  // 锚点配置弹窗
  const [portsModal, setPortsModal] = useState<boolean>(false)
  const portsEditorRef = useRef<PortsEditorRef>(null)
  const dataEditorRef = useRef<any>(null)
  const visibleRef = useRef(false)
  // 暴露给 onBlurTextLike：在解锁后立刻补一次同步
  const scheduleSyncRef = useRef<(() => void) | null>(null)
  // 节点/边属性合并事务
  const nodeTxnRef = useRef<{ active: boolean; timer: any }>({
    active: false,
    timer: null
  })
  const edgeTxnRef = useRef<{ active: boolean; timer: any }>({
    active: false,
    timer: null
  })
  const beginNodeTxn = () => {
    if (!engine) return
    if (!nodeTxnRef.current.active) {
      engine.history.beginTransaction('Node Properties')
      nodeTxnRef.current.active = true
    }
  }
  const beginEdgeTxn = () => {
    if (!engine) return
    if (!edgeTxnRef.current.active) {
      engine.history.beginTransaction('Edge Properties')
      edgeTxnRef.current.active = true
    }
  }
  const scheduleCommitNodeTxn = (delay = 800) => {
    if (!engine) return
    if (!nodeTxnRef.current.active) return
    if (nodeTxnRef.current.timer) clearTimeout(nodeTxnRef.current.timer)
    nodeTxnRef.current.timer = setTimeout(() => {
      try {
        engine.history.commitTransaction()
      } finally {
        nodeTxnRef.current.active = false
        nodeTxnRef.current.timer = null
      }
    }, delay)
  }
  const scheduleCommitEdgeTxn = (delay = 800) => {
    if (!engine) return
    if (!edgeTxnRef.current.active) return
    if (edgeTxnRef.current.timer) clearTimeout(edgeTxnRef.current.timer)
    edgeTxnRef.current.timer = setTimeout(() => {
      try {
        engine.history.commitTransaction()
      } finally {
        edgeTxnRef.current.active = false
        edgeTxnRef.current.timer = null
      }
    }, delay)
  }

  useEffect(() => {
    visibleRef.current = visible
  }, [visible])

  // Ref 追踪选中状态和交互状态
  const storeRef = useRef({ nodeIds: selectedNodeIds, edgeIds: selectedEdgeIds })
  const syncingRef = useRef(false)
  const interactingRef = useRef(false)

  // 同步画布草稿
  const syncCanvasDraft = React.useCallback(() => {
    if (!engine) return
    const background = (engine as any).background || '#ffffff'
    const grid = (engine.plugins as any).plugins?.get?.('grid')
    const gridSize = grid ? ((grid as any).size ?? (grid as any).opts?.size) : 20
    const gridColor = grid ? ((grid as any).color ?? (grid as any).opts?.color) : '#e5e7eb'
    const gridAlpha = grid ? ((grid as any).alpha ?? (grid as any).opts?.alpha) : 1
    const gridType = grid ? ((grid as any).type ?? (grid as any).opts?.type) : 'line'
    const gridVisible = grid ? ((grid as any).visible ?? (grid as any).opts?.visible) : true
    const guides = (engine.plugins as any).plugins?.get?.('guides')
    const guidesThreshold = guides ? ((guides as any).threshold ?? (guides as any).opts?.threshold) : 6
    const guidesVisible = guides ? ((guides as any).visible ?? (guides as any).opts?.visible ?? true) : true
    // 读取交互控制配置
    const interactionConfig = engine.getInteractionConfig()
    const enablePan = interactionConfig.enablePan ?? true
    const enableZoom = interactionConfig.enableZoom ?? true
    const enableSelection = interactionConfig.enableSelection ?? true
    const enableDrag = interactionConfig.enableDrag ?? true
    const enableResize = interactionConfig.enableResize ?? true
    const enableRotate = interactionConfig.enableRotate ?? true

    setCanvasDraft({
      background,
      gridSize,
      gridColor,
      gridAlpha,
      gridType,
      gridVisible,
      guidesThreshold,
      guidesVisible,
      enablePan,
      enableZoom,
      enableSelection,
      enableDrag,
      enableResize,
      enableRotate
    })
  }, [engine])

  // 同步逻辑（依赖 engine，内部读取 Ref 获取最新选中 ID）
  const sync = React.useCallback(() => {
    if (!engine || inputLockRef.current) {
      syncingRef.current = false
      return
    }
    const nodes = engine.graph.getNodes()
    const edges = engine.graph.getEdges()
    const { nodeIds, edgeIds } = storeRef.current

    // 根据选中状态刷新草稿
    if (nodeIds.length === 1 && edgeIds.length === 0) {
      const n = nodes.find((n) => n.id === nodeIds[0])
      if (n) setNodeDraft(extractNodeDraft(n as any))
    } else if (edgeIds.length === 1 && nodeIds.length === 0) {
      const e = edges.find((e) => e.id === edgeIds[0])
      if (e) setEdgeDraft(extractEdgeDraft(e as any))
    } else if (nodeIds.length > 1 && edgeIds.length === 0) {
      setNodeDraft(extractNodeMultiDraft(nodes.filter((n) => nodeIds.includes(n.id)) as any))
    } else if (edgeIds.length > 1 && nodeIds.length === 0) {
      setEdgeDraft(extractEdgeMultiDraft(edges.filter((e) => edgeIds.includes(e.id)) as any))
    }

    syncCanvasDraft()
    syncingRef.current = false
  }, [engine, syncCanvasDraft])

  // RAF 调度同步
  const scheduleSync = React.useCallback(() => {
    if (syncingRef.current) return
    syncingRef.current = true
    requestAnimationFrame(sync)
  }, [sync])

  // 暴露给外部（用于输入框失焦后同步）
  useEffect(() => {
    scheduleSyncRef.current = scheduleSync
    return () => {
      scheduleSyncRef.current = null
    }
  }, [scheduleSync])

  // 监听 Store 变化：更新 Ref 并立即同步（解决滞后问题）
  useEffect(() => {
    // 切换选择前，若存在未提交事务则立即提交
    if (nodeTxnRef.current.active) {
      try {
        engine?.history.commitTransaction()
      } catch {
        /* ignore */
      }
      nodeTxnRef.current.active = false
      nodeTxnRef.current.timer = null
    }
    if (edgeTxnRef.current.active) {
      try {
        engine?.history.commitTransaction()
      } catch {
        /* ignore */
      }
      edgeTxnRef.current.active = false
      edgeTxnRef.current.timer = null
    }

    // 更新 Ref
    storeRef.current = { nodeIds: selectedNodeIds, edgeIds: selectedEdgeIds }

    // 立即同步（响应点击）
    sync()
  }, [selectedNodeIds, selectedEdgeIds, engine, sync])

  // 监听 Engine 事件（只依赖 engine，不依赖选中状态，避免频繁重置监听器）
  useEffect(() => {
    if (!engine) return

    const canvasTxn = canvasTxnRef.current
    const nodeTxn = nodeTxnRef.current
    const edgeTxn = edgeTxnRef.current

    // 初次同步
    sync()

    const onGraphChanged = () => {
      if (!interactingRef.current) scheduleSync()
    }
    const offGraph = engine.events.on('graph:change', onGraphChanged)

    // 监听历史变化
    const offHistory = engine.history.onChange(() => {
      engine.graph.markDirty('style')
      scheduleSync()
    })

    const onInteractionStart = () => {
      interactingRef.current = true
    }
    const onInteractionEnd = () => {
      interactingRef.current = false
      scheduleSync()
    }

    const offDragEnd = engine.events.on('node:drag-end', onInteractionEnd)
    const offResizeEnd = engine.events.on('group:resize-end', onInteractionEnd)
    const offRotateEnd = engine.events.on('group:rotate-end', onInteractionEnd)

    const containerEl: HTMLElement | undefined = (engine as any).container
    if (containerEl) {
      const onPointerDown = () => onInteractionStart()
      const onPointerUp = () => onInteractionEnd()
      const onMouseUp = () => onInteractionEnd()
      containerEl.addEventListener('pointerdown', onPointerDown, true)
      containerEl.addEventListener('pointerup', onPointerUp, true)
      containerEl.addEventListener('mouseup', onMouseUp, true)

      return () => {
        offGraph()
        offHistory()
        offDragEnd()
        offResizeEnd()
        offRotateEnd()
        containerEl.removeEventListener('pointerdown', onPointerDown, true)
        containerEl.removeEventListener('pointerup', onPointerUp, true)
        containerEl.removeEventListener('mouseup', onMouseUp, true)

        // 卸载时提交所有事务
        if (canvasTxn.active) {
          try {
            engine.history.commitTransaction()
          } catch {
            /* ignore */
          }
          canvasTxn.active = false
        }
        if (nodeTxn.active) {
          try {
            engine.history.commitTransaction()
          } catch {
            /* ignore */
          }
          nodeTxn.active = false
        }
        if (edgeTxn.active) {
          try {
            engine.history.commitTransaction()
          } catch {
            /* ignore */
          }
          edgeTxn.active = false
        }
      }
    }
    return () => {
      offGraph()
      offHistory()
      offDragEnd()
      offResizeEnd()
      offRotateEnd()
    }
  }, [engine, sync, scheduleSync])

  // 提取单节点草稿
  const extractNodeDraft = (n?: NodeLite) => {
    if (!n) return {}
    const style = n.data?.style || {}
    const flow: any = (style as any).flow || {}
    const line: any = (n.data as any)?.line || {}
    const progress: any = line.progress || {}
    const labelStyle: any = (style as any).label || {}
    const textStyle: any = (style as any).text || {}
    return {
      id: n.id,
      shape: n.shape,
      // 展示层取整：消除旋转缩放后面板显示的小数坐标
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
      width: n.size.width,
      height: n.size.height,
      rotation: n.rotation ?? 0,
      zIndex: n.zIndex ?? 0,
      selectable: (n as any).selectable !== false,
      draggable: (n as any).draggable !== false,
      resizable: (n as any).resizable !== false,
      rotatable: (n as any).rotatable !== false,
      isContainer: !!(n as any).isContainer,
      fill: style.fill || '',
      stroke: style.stroke || '',
      lineWidth: style.lineWidth ?? 1.5,
      borderRadius: style.borderRadius ?? style.radius ?? 0,
      // 线型
      lineDash: Array.isArray(style.lineDash) ? style.lineDash : undefined,
      lineCap: style.lineCap,
      lineJoin: style.lineJoin,
      miterLimit: style.miterLimit,
      fillAlpha: style.fillAlpha,
      strokeAlpha: style.strokeAlpha,
      alpha: style.alpha,
      label: n.data?.label ?? '',
      text: n.data?.text ?? '',
      groupId: n.groupId || '',
      // 正文文本样式（独立命名空间 style.text.*）
      fontSize: textStyle.fontSize,
      fontWeight: textStyle.fontWeight,
      strokeWidth: textStyle.strokeWidth,
      textAlign: textStyle.textAlign,
      textBaseline: textStyle.textBaseline,
      color: textStyle.color,
      // UI 只显示一个 padding，读取时以 X/Y 中的已定义值优先（保持不丢信息）
      padding:
        textStyle.padding != null
          ? textStyle.padding
          : textStyle.paddingX != null
            ? textStyle.paddingX
            : textStyle.paddingY != null
              ? textStyle.paddingY
              : undefined,
      // image 图片节点
      src: (n.data as any)?.image?.src || '',
      // label style controls (for non-text nodes label overlay)
      labelPosition: labelStyle.position,
      labelOffsetX: labelStyle.offsetX,
      labelOffsetY: labelStyle.offsetY,
      labelPaddingX: labelStyle.paddingX,
      labelPaddingY: labelStyle.paddingY,
      labelColor: labelStyle.color,
      labelAlpha: labelStyle.alpha,
      labelBackground: labelStyle.background,
      labelBackgroundAlpha: labelStyle.backgroundAlpha,
      labelFontSize: labelStyle.fontSize,
      labelFontWeight: labelStyle.fontWeight,
      labelFontFamily: labelStyle.fontFamily,
      labelFontStyle: labelStyle.fontStyle,
      labelRotateWithNode: labelStyle.rotateWithNode,
      labelTextOverflow: labelStyle.textOverflow,
      labelBackgroundStroke: labelStyle.backgroundStroke,
      labelBackgroundStrokeWidth: labelStyle.backgroundStrokeWidth,
      labelMaxWidth: labelStyle.maxWidth ?? labelStyle.width,
      labelLineHeight: labelStyle.lineHeight,
      labelLineHeightPx: labelStyle.lineHeightPx,
      // 节点边框流动
      nodeFlowEnabled: !!flow.enabled,
      nodeFlowSpeed: flow.speed ?? 160,
      nodeFlowDirection: flow.direction || 'cw',
      // 线条进度（仅对 shape='line' 有效，UI 层判断）
      lineProgressEnabled: !!progress.enabled,
      lineProgressRatio: progress.ratio ?? 0,
      lineProgressStartRatio: progress.startRatio != null ? progress.startRatio : undefined,
      lineProgressEndRatio: progress.endRatio != null ? progress.endRatio : undefined,
      lineProgressReverse: !!progress.reverse,
      lineProgressColor: progress.color || '',
      lineProgressBaseColor: progress.baseColor || '',
      lineProgressBaseAlphaScale: progress.baseAlphaScale ?? 0.8,
      // 闪烁效果
      blinkEnabled: !!(n.data as any)?.blink?.enabled,
      blinkPeriod: (n.data as any)?.blink?.period ?? 800,
      blinkMin: (n.data as any)?.blink?.min ?? 0.25,
      blinkMax: (n.data as any)?.blink?.max ?? 1,
      // 自定义数据
      custom: n.data?.custom ? { ...(n.data as any).custom } : undefined
    }
  }
  // 提取多节点草稿（仅公共属性）
  const extractNodeMultiDraft = (nodes: NodeLite[]) => {
    if (!nodes.length) return {}
    const fills = new Set(nodes.map((n) => (n.data?.style as any)?.fill).filter(Boolean))
    const strokes = new Set(nodes.map((n) => (n.data?.style as any)?.stroke).filter(Boolean))
    return {
      multi: nodes.length,
      fill: fills.size === 1 ? Array.from(fills)[0] : '',
      stroke: strokes.size === 1 ? Array.from(strokes)[0] : '',
      lineWidth: undefined,
      alpha: undefined
    }
  }
  // 提取边草稿
  const extractEdgeDraft = (e?: EdgeLite) => {
    if (!e) return {}
    const style = e.data?.style || {}
    const pipeline = (style as any).pipeline
    const flow = (style as any).flow || pipeline?.flow
    const edgeLabel: any = (style as any).label || {}
    return {
      id: e.id,
      shape: e.shape,
      stroke: style.stroke || '',
      // 优先使用 flow.width 展示，保持与渲染一致
      lineWidth: flow && typeof (flow as any).width === 'number' ? (flow as any).width : (style.lineWidth ?? 2),
      lineDash: Array.isArray((style as any).lineDash) ? (style as any).lineDash : undefined,
      lineCap: (style as any).lineCap,
      lineJoin: (style as any).lineJoin,
      miterLimit: (style as any).miterLimit,
      alpha: style.alpha ?? 1,
      arrowSize: style.arrowSize ?? 8,
      sourceArrowType: (style as any).sourceArrowType ?? 'none',
      targetArrowType: (style as any).targetArrowType ?? 'solid',
      label: (e.data as any)?.label || '',
      labelFontSize: edgeLabel.fontSize,
      labelColor: edgeLabel.color,
      labelBackground: edgeLabel.background,
      labelBackgroundAlpha: edgeLabel.backgroundAlpha,
      pipelineEnabled: !!pipeline,
      outerColor: pipeline?.outerColor || '',
      innerColor: pipeline?.innerColor || '',
      outerWidth: pipeline?.outerWidth ?? 6,
      innerWidth: pipeline?.innerWidth ?? '',
      gap: pipeline?.gap ?? '',
      stub: (pipeline as any)?.stub ?? '',
      cornerRadius: pipeline?.cornerRadius ?? 0,
      flowEnabled: !!flow?.enabled,
      flowColor: flow?.color || '',
      flowSpeed: flow?.speed ?? 160,
      flowDirection: flow?.direction || 'forward',
      // 自定义数据
      custom: (e.data as any)?.custom ? { ...(e.data as any).custom } : undefined
    }
  }
  // 提取多边草稿（仅公共属性）
  const extractEdgeMultiDraft = (edges: EdgeLite[]) => ({
    multi: edges.length
  })

  // 初次挂载：仅同步，不自动显示，等待用户点击
  useEffect(() => {
    if (engine) {
      syncCanvasDraft()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine])

  // 提交画布属性修改
  const commitCanvasField = (field: string, value: any) => {
    if (!engine) return
    // 确保本轮修改进入同一事务
    beginCanvasTxn()
    if (field === 'background') {
      const color = value || '#ffffff'
      engine.history.execute(new SetCanvasBackgroundCommand(engine as any, color))
    } else if (field === 'gridSize') {
      const size = Math.max(2, Number(value) || 20)
      engine.history.execute(new SetGridOptionsCommand(engine as any, { size }))
    } else if (field === 'gridColor') {
      const color = value || '#e5e7eb'
      engine.history.execute(new SetGridOptionsCommand(engine as any, { color }))
    } else if (field === 'gridAlpha') {
      const num = Number(value)
      const alpha = Math.min(1, Math.max(0, isFinite(num) ? num : 1))
      engine.history.execute(new SetGridOptionsCommand(engine as any, { alpha }))
    } else if (field === 'gridType') {
      const type = value === 'dot' ? 'dot' : 'line'
      engine.history.execute(new SetGridOptionsCommand(engine as any, { type }))
    } else if (field === 'gridVisible') {
      const visible = !!value
      engine.history.execute(new SetGridOptionsCommand(engine as any, { visible }))
    } else if (field === 'guidesThreshold') {
      const threshold = Math.max(1, Number(value) || 6)
      engine.history.execute(new SetGuidesOptionsCommand(engine as any, { threshold }))
    } else if (field === 'guidesVisible') {
      const visible = !!value
      engine.history.execute(new SetGuidesOptionsCommand(engine as any, { visible }))
    } else if (
      ['enablePan', 'enableZoom', 'enableSelection', 'enableDrag', 'enableResize', 'enableRotate'].includes(field)
    ) {
      // 交互控制配置：不需要历史记录，直接设置
      const config: any = {}
      if (field === 'enablePan') config.enablePan = !!value
      else if (field === 'enableZoom') config.enableZoom = !!value
      else if (field === 'enableSelection') config.enableSelection = !!value
      else if (field === 'enableDrag') config.enableDrag = !!value
      else if (field === 'enableResize') config.enableResize = !!value
      else if (field === 'enableRotate') config.enableRotate = !!value
      engine.setInteractionConfig(config)
    }
    setCanvasDraft((d) => ({ ...d, [field]: value }))
    // 在空闲窗口后自动将这批修改合并为一条历史
    scheduleCommitCanvasTxn(800)
  }

  // 提交节点属性修改
  const commitNodeField = (field: string, value: any) => {
    if (!engine || selectionKind !== 'node-single') return
    const id = nodeDraft.id
    const n = engine.graph.getNode(id)
    if (!n) return
    beginNodeTxn()
    if (['x', 'y', 'width', 'height', 'rotation', 'zIndex'].includes(field)) {
      if (field === 'x' || field === 'y') {
        const num = Math.round(Number(value) || 0)
        const nextX = field === 'x' ? num : n.position.x
        const nextY = field === 'y' ? num : n.position.y
        engine.history.execute(new MoveNodeCommand(engine.graph, id, nextX, nextY))
      } else if (field === 'width' || field === 'height') {
        const w = field === 'width' ? Math.max(1, Math.round(Number(value) || 1)) : n.size.width
        const h = field === 'height' ? Math.max(1, Math.round(Number(value) || 1)) : n.size.height
        engine.history.execute(new ResizeNodeWithPortsCommand(engine.graph, id, w, h))
      } else if (field === 'rotation') {
        const rot = Math.round(Number(value) || 0)
        engine.history.execute(new SetNodeRotationCommand(engine.graph, id, rot))
      } else if (field === 'zIndex') {
        const z = Math.round(Number(value) || 0)
        engine.history.execute(new SetZIndexCommand(engine.graph, id, z))
      }
    } else if (['selectable', 'draggable', 'resizable', 'rotatable', 'isContainer'].includes(field)) {
      const patch: any = { [field]: !!value }
      engine.history.execute(new UpdateNodePropsCommand(engine.graph, id, patch))
    } else if (['custom'].includes(field)) {
      const next = { ...(n.data || {}) } as any
      next.custom = value && typeof value === 'object' ? { ...value } : undefined
      engine.history.execute(new UpdateNodeDataCommand(engine.graph, id, next))
    } else if (field === 'src') {
      // image 图片节点的 src 属性
      const nextData: any = { ...(n.data || {}) }
      const image: any = { ...(nextData.image || {}) }
      image.src = value || ''
      nextData.image = image
      engine.history.execute(new UpdateNodeDataCommand(engine.graph, id, nextData))
    } else if (
      [
        'fill',
        'stroke',
        'lineWidth',
        'borderRadius',
        'lineDash',
        'lineCap',
        'lineJoin',
        'miterLimit',
        'fillAlpha',
        'strokeAlpha',
        'alpha',
        'label',
        'text',
        'groupId',
        'fontSize',
        'fontWeight',
        'strokeWidth',
        'textAlign',
        'textBaseline',
        'color',
        'padding'
      ].includes(field)
    ) {
      n.data = { ...(n.data || {}) }
      const style = { ...((n.data as any).style || {}) }
      if (field === 'fill') {
        style.fill = value
      } else if (field === 'stroke') {
        style.stroke = value
      } else if (field === 'lineWidth') {
        if (value === '' || value === undefined || value === null) {
          delete (style as any).lineWidth
        } else {
          const num = Number(value)
          ;(style as any).lineWidth = Math.max(0, Number.isFinite(num) ? num : 0)
        }
      } else if (field === 'borderRadius') {
        style.borderRadius = Number(value) || 0
      } else if (field === 'lineDash') {
        const toArr = (v: any): number[] | undefined => {
          if (v === '' || v === undefined || v === null) return undefined
          const arr = Array.isArray(v)
            ? v
            : typeof v === 'string'
              ? (() => {
                  try {
                    return JSON.parse(v)
                  } catch {
                    return undefined
                  }
                })()
              : undefined
          if (!Array.isArray(arr)) return undefined
          // 归一化：[0,0] 或所有非正数都视为“实线”
          const hasPositive = arr.some((n: any) => typeof n === 'number' && n > 0)
          return hasPositive ? arr : undefined
        }
        ;(style as any).lineDash = toArr(value)
      } else if (field === 'lineCap') {
        ;(style as any).lineCap = value || undefined
      } else if (field === 'lineJoin') {
        ;(style as any).lineJoin = value || undefined
      } else if (field === 'miterLimit') {
        ;(style as any).miterLimit = value === '' ? undefined : Number(value)
      } else if (field === 'fillAlpha') {
        if (value === '' || value === undefined || value === null) (style as any).fillAlpha = undefined
        else {
          const num = Number(value)
          const clamped = Math.min(1, Math.max(0, num))
          ;(style as any).fillAlpha = Math.round(clamped * 100) / 100
        }
      } else if (field === 'strokeAlpha') {
        if (value === '' || value === undefined || value === null) (style as any).strokeAlpha = undefined
        else {
          const num = Number(value)
          const clamped = Math.min(1, Math.max(0, num))
          ;(style as any).strokeAlpha = Math.round(clamped * 100) / 100
        }
      } else if (field === 'alpha') {
        if (value === '' || value === undefined || value === null) {
          ;(style as any).alpha = undefined
        } else {
          const num = Number(value)
          const clamped = Math.min(1, Math.max(0, Number.isFinite(num) ? num : 0))
          ;(style as any).alpha = Math.round(clamped * 100) / 100
        }
      } else if (
        ['fontSize', 'fontWeight', 'strokeWidth', 'textAlign', 'textBaseline', 'color', 'padding'].includes(field)
      ) {
        const t: any = { ...(style as any).text }
        if (field === 'fontSize') t.fontSize = value === '' ? undefined : Number(value) || 14
        else if (field === 'fontWeight') t.fontWeight = value || 'normal'
        else if (field === 'strokeWidth') t.strokeWidth = value === '' ? undefined : Number(value) || 1
        else if (field === 'textAlign') t.textAlign = value || 'center'
        else if (field === 'textBaseline') t.textBaseline = value || 'middle'
        else if (field === 'color') t.color = value || undefined
        else if (field === 'padding') {
          const num = value === '' ? undefined : Math.max(0, Number(value))
          t.padding = num
          t.paddingX = num
          t.paddingY = num
        }
        ;(style as any).text = t
      }
      const nextData: any = { ...(n.data || {}) }
      nextData.style = style
      if (field === 'label') nextData.label = value
      if (field === 'text') nextData.text = value
      if (field === 'groupId') {
        // groupId 作为属性通过命令写入，避免和 data 混用
        engine.history.execute(
          new UpdateNodePropsCommand(engine.graph, id, {
            groupId: value || undefined
          })
        )
      } else {
        engine.history.execute(new UpdateNodeDataCommand(engine.graph, id, nextData))
      }
    } else if (['nodeFlowEnabled', 'nodeFlowSpeed', 'nodeFlowDirection'].includes(field)) {
      // 节点边框流动（沿用 style.flow 命名空间）
      const style: any = { ...(n.data?.style || {}) }
      const flow: any = { ...(style.flow || {}) }
      if (field === 'nodeFlowEnabled') flow.enabled = value === true || value === 'true'
      else if (field === 'nodeFlowSpeed') flow.speed = Number(value) || 160
      else if (field === 'nodeFlowDirection') flow.direction = value === 'ccw' ? 'ccw' : 'cw'
      style.flow = flow
      const nextData: any = { ...(n.data || {}), style }
      engine.history.execute(new UpdateNodeDataCommand(engine.graph, id, nextData))
      setNodeDraft((d: any) => ({ ...d, [field]: value }))
      scheduleCommitNodeTxn(800)
      return
    } else if (['blinkEnabled', 'blinkPeriod', 'blinkMin', 'blinkMax'].includes(field)) {
      // 闪烁效果控制：写入 data.blink 并同步插件（参考 nodeFlowEnabled 的简洁模式）
      const nextData: any = { ...(n.data || {}) }
      const blink: any = { ...(nextData.blink || {}) }
      // 更新对应字段
      if (field === 'blinkEnabled') {
        blink.enabled = value === true || value === 'true'
      } else if (field === 'blinkPeriod') {
        blink.period = Number(value) || 800
      } else if (field === 'blinkMin') {
        blink.min = Math.max(0, Math.min(1, Number(value) || 0.25))
      } else if (field === 'blinkMax') {
        blink.max = Math.max(0, Math.min(1, Number(value) || 1))
      }
      nextData.blink = blink
      // 统一同步插件状态（仅在参数完整时）
      const plugin = (engine.plugins as any).get?.('blink')
      if (plugin) {
        plugin.stop([id])
        if (blink.enabled) {
          plugin.start([id], {
            period: blink.period ?? 800,
            min: blink.min ?? 0.25,
            max: blink.max ?? 1
          })
        }
      }
      engine.history.execute(new UpdateNodeDataCommand(engine.graph, id, nextData))
      setNodeDraft((d: any) => ({ ...d, [field]: value }))
      scheduleCommitNodeTxn(800)
      return
    } else if (
      [
        'lineProgressEnabled',
        'lineProgressRatio',
        'lineProgressStartRatio',
        'lineProgressEndRatio',
        'lineProgressReverse',
        'lineProgressColor',
        'lineProgressBaseColor',
        'lineProgressBaseAlphaScale'
      ].includes(field)
    ) {
      // 线条进度控制：写入 data.line.progress
      const nextData: any = { ...(n.data || {}) }
      const line: any = { ...(nextData.line || {}) }
      const progress: any = { ...(line.progress || {}) }
      if (field === 'lineProgressEnabled') {
        progress.enabled = value === true || value === 'true'
      } else if (field === 'lineProgressRatio') {
        progress.ratio = Math.max(0, Math.min(1, Number(value) || 0))
      } else if (field === 'lineProgressStartRatio') {
        if (value === '' || value === undefined || value === null) progress.startRatio = undefined
        else progress.startRatio = Math.max(0, Math.min(1, Number(value) || 0))
      } else if (field === 'lineProgressEndRatio') {
        if (value === '' || value === undefined || value === null) progress.endRatio = undefined
        else progress.endRatio = Math.max(0, Math.min(1, Number(value) || 0))
      } else if (field === 'lineProgressReverse') {
        progress.reverse = value === true || value === 'true'
      } else if (field === 'lineProgressColor') {
        progress.color = value || undefined
      } else if (field === 'lineProgressBaseColor') {
        progress.baseColor = value || undefined
      } else if (field === 'lineProgressBaseAlphaScale') {
        progress.baseAlphaScale = Math.max(0, Math.min(1, Number(value) || 0.8))
      }
      line.progress = progress
      nextData.line = line
      engine.history.execute(new UpdateNodeDataCommand(engine.graph, id, nextData))
      setNodeDraft((d: any) => ({ ...d, [field]: value }))
      scheduleCommitNodeTxn(800)
      return
    } else if (
      [
        'labelPosition',
        'labelOffsetX',
        'labelOffsetY',
        'labelPaddingX',
        'labelPaddingY',
        'labelColor',
        'labelAlpha',
        'labelBackground',
        'labelBackgroundAlpha',
        'labelFontSize',
        'labelFontWeight',
        'labelFontFamily',
        'labelFontStyle',
        'labelRotateWithNode',
        'labelTextOverflow',
        'labelBackgroundStroke',
        'labelBackgroundStrokeWidth',
        'labelMaxWidth',
        'labelLineHeight',
        'labelLineHeightPx'
      ].includes(field)
    ) {
      n.data = { ...(n.data || {}) }
      const style: any = { ...((n.data as any).style || {}) }
      const label: any = { ...(style.label || {}) }
      if (field === 'labelPosition') {
        label.position = value || undefined
      } else if (field === 'labelOffsetX') {
        label.offsetX = value === '' ? undefined : Number(value)
      } else if (field === 'labelOffsetY') {
        label.offsetY = value === '' ? undefined : Number(value)
      } else if (field === 'labelPaddingX') {
        label.paddingX = value === '' ? undefined : Math.max(0, Number(value))
      } else if (field === 'labelPaddingY') {
        label.paddingY = value === '' ? undefined : Math.max(0, Number(value))
      } else if (field === 'labelColor') {
        label.color = value || undefined
      } else if (field === 'labelAlpha') {
        if (value === '' || value === undefined || value === null) {
          label.alpha = undefined
        } else {
          const num = Number(value)
          const clamped = Math.min(1, Math.max(0, num))
          label.alpha = Math.round(clamped * 100) / 100
        }
      } else if (field === 'labelBackground') {
        label.background = value || undefined
      } else if (field === 'labelBackgroundAlpha') {
        if (value === '' || value === undefined || value === null) {
          label.backgroundAlpha = undefined
        } else {
          const num = Number(value)
          const clamped = Math.min(1, Math.max(0, num))
          label.backgroundAlpha = Math.round(clamped * 100) / 100
        }
      } else if (field === 'labelFontSize') {
        label.fontSize = value === '' ? undefined : Number(value)
      } else if (field === 'labelFontWeight') {
        label.fontWeight = value || undefined
      } else if (field === 'labelFontFamily') {
        label.fontFamily = value || undefined
      } else if (field === 'labelFontStyle') {
        label.fontStyle = value || undefined
      } else if (field === 'labelRotateWithNode') {
        label.rotateWithNode = value === 'true' || value === true
      } else if (field === 'labelTextOverflow') {
        label.textOverflow = value || undefined
      } else if (field === 'labelBackgroundStroke') {
        label.backgroundStroke = value || undefined
      } else if (field === 'labelBackgroundStrokeWidth') {
        label.backgroundStrokeWidth = value === '' ? undefined : Math.max(0, Number(value))
      } else if (field === 'labelMaxWidth') {
        const num = value === '' ? undefined : Number(value)
        label.maxWidth = num
        label.width = num
      } else if (field === 'labelLineHeight') {
        label.lineHeight = value === '' ? undefined : Number(value)
      } else if (field === 'labelLineHeightPx') {
        label.lineHeightPx = value === '' ? undefined : Number(value)
      }
      style.label = label
      const nextData: any = { ...(n.data || {}) }
      nextData.style = style
      engine.history.execute(new UpdateNodeDataCommand(engine.graph, id, nextData))
    }
    setNodeDraft((d: any) => ({ ...d, [field]: value }))
    scheduleCommitNodeTxn(800)
  }

  // 提交边属性修改
  const commitEdgeField = (field: string, value: any) => {
    if (!engine || selectionKind !== 'edge-single') return
    const id = edgeDraft.id
    const e = engine.graph.getEdge(id)
    if (!e) return
    beginEdgeTxn()
    // 修复：确保 style 是新对象，且修改子属性时也进行拷贝，防止原地修改 e.data 导致 Command 捕获的 prev 已经是修改后的值
    const style: any = { ...(e.data?.style || {}) }

    if (field === 'shape') {
      engine.history.execute(new SetEdgeShapeCommand(engine.graph, id, value))
    } else if (field === 'custom') {
      const next = { ...(e.data || {}) } as any
      next.custom = value && typeof value === 'object' ? { ...value } : undefined
      engine.history.execute(new UpdateEdgeDataCommand(engine.graph, id, next))
    } else if (
      [
        'stroke',
        'lineWidth',
        'alpha',
        'arrowSize',
        'lineDash',
        'lineCap',
        'lineJoin',
        'miterLimit',
        'sourceArrowType',
        'targetArrowType'
      ].includes(field)
    ) {
      if (field === 'stroke') {
        style.stroke = value
      } else if (field === 'lineWidth') {
        const num = Number(value) || 2
        // 拷贝 flow
        const f: any = { ...(style.flow || style.pipeline?.flow || {}) }
        f.width = num
        if (f.linkedWidth && style.pipeline) {
          // 拷贝 pipeline
          const pipeline = { ...style.pipeline }
          const outerPrev = pipeline.outerWidth ?? 6
          const innerPrev =
            typeof pipeline.innerWidth === 'number'
              ? pipeline.innerWidth
              : typeof pipeline.gap === 'number'
                ? Math.max(1, outerPrev - 2 * Math.max(0, pipeline.gap))
                : Math.max(1, outerPrev - 4)
          const borderPrev = Math.max(0, outerPrev - innerPrev)
          pipeline.innerWidth = num
          pipeline.outerWidth = Math.max(1, num + borderPrev)
          style.pipeline = pipeline
        }
        style.flow = f
        style.lineWidth = num
      } else if (field === 'alpha') {
        style.alpha = Number(value) || 1
      } else if (field === 'arrowSize') {
        style.arrowSize = Number(value) || 8
      } else if (field === 'sourceArrowType') {
        ;(style as any).sourceArrowType = value || undefined
      } else if (field === 'targetArrowType') {
        ;(style as any).targetArrowType = value || 'solid'
      } else if (field === 'lineDash') {
        const toArr = (v: any): number[] | undefined => {
          if (v === '' || v === undefined || v === null) return undefined
          const arr = Array.isArray(v)
            ? v
            : typeof v === 'string'
              ? (() => {
                  try {
                    return JSON.parse(v)
                  } catch {
                    return undefined
                  }
                })()
              : undefined
          if (!Array.isArray(arr)) return undefined
          const hasPositive = arr.some((n: any) => typeof n === 'number' && n > 0)
          return hasPositive ? arr : undefined
        }
        const arr = toArr(value)
        if (!arr) {
          delete style.lineDash
          // 显式删除旧的 dash 属性，防止干扰
          delete (style as any).dash
        } else {
          style.lineDash = arr
          // 显式删除旧的 dash 属性，防止干扰
          delete (style as any).dash
        }
      } else if (field === 'lineCap') {
        style.lineCap = value || undefined
      } else if (field === 'lineJoin') {
        style.lineJoin = value || undefined
      } else if (field === 'miterLimit') {
        style.miterLimit = value === '' ? undefined : Number(value)
      }
    } else if (field === 'pipelineEnabled') {
      if (value) {
        if (!style.pipeline) {
          const cached = pipelineCacheRef.current[e.id]
          style.pipeline = cached
            ? { ...cached }
            : {
                outerWidth: 14,
                innerWidth: 9,
                outerColor: style.stroke || '#64748b',
                innerColor: '#ffffff',
                gap: 0,
                cornerRadius: 3,
                stub: 20
              }
        }
      } else if (style.pipeline) {
        pipelineCacheRef.current[e.id] = { ...style.pipeline }
        delete style.pipeline
      }
    } else if (
      [
        'outerColor',
        'innerColor',
        'outerWidth',
        'innerWidth',
        'gap',
        'outerGap',
        'innerGap',
        'cornerRadius',
        'stub'
      ].includes(field)
    ) {
      const pipeline = { ...(style.pipeline || {}) }
      if (field === 'outerColor') {
        pipeline.outerColor = value
      } else if (field === 'innerColor') {
        pipeline.innerColor = value
      } else if (field === 'outerWidth') {
        pipeline.outerWidth = Number(value) || 6
      } else if (field === 'innerWidth') {
        pipeline.innerWidth = value === '' ? undefined : Number(value) || 1
      } else if (field === 'gap') {
        const g = value === '' ? undefined : Number(value) || 0
        pipeline.gap = g as any
      } else if (field === 'outerGap') {
        pipeline.outerGap = value === '' ? undefined : Number(value) || 0
        pipeline.gap = value === '' ? undefined : Number(value) || 0
      } else if (field === 'innerGap') {
        pipeline.innerGap = value === '' ? undefined : Number(value) || 0
        pipeline.gap = value === '' ? undefined : Number(value) || 0
      } else if (field === 'cornerRadius') {
        pipeline.cornerRadius = Number(value) || 0
      } else if (field === 'stub') {
        pipeline.stub = Number(value) || 0
      }
      style.pipeline = pipeline
    } else if (['flowEnabled', 'flowColor', 'flowSpeed', 'flowDirection'].includes(field)) {
      const flow = { ...(style.flow || style.pipeline?.flow || {}) }
      if (field === 'flowEnabled') {
        flow.enabled = value === 'true' || value === true
      } else if (field === 'flowColor') {
        flow.color = value || undefined
      } else if (field === 'flowSpeed') {
        flow.speed = Number(value) || 160
      } else if (field === 'flowDirection') {
        flow.direction = value || 'forward'
      }
      style.flow = flow
    } else if (field === 'label') {
      const nextData = { ...(e.data || {}), label: value || '' } as any
      engine.history.execute(new UpdateEdgeDataCommand(engine.graph, id, nextData))
      setEdgeDraft((d: any) => ({ ...d, [field]: value }))
      scheduleCommitEdgeTxn(800)
      return
    } else if (['labelFontSize', 'labelColor', 'labelBackground', 'labelBackgroundAlpha'].includes(field)) {
      const label = { ...(style.label || {}) }
      if (field === 'labelFontSize') {
        label.fontSize = value === '' ? undefined : Number(value)
      } else if (field === 'labelColor') {
        label.color = value || undefined
      } else if (field === 'labelBackground') {
        label.background = value || undefined
      } else if (field === 'labelBackgroundAlpha') {
        label.backgroundAlpha = value === '' ? undefined : Math.min(1, Math.max(0, Number(value)))
      }
      style.label = label
    }

    const nextData: any = { ...(e.data || {}), style }
    engine.history.execute(new UpdateEdgeDataCommand(engine.graph, id, nextData))
    if (field === 'pipelineEnabled') {
      setEdgeDraft(extractEdgeDraft(e as any))
    } else {
      setEdgeDraft((d: any) => ({ ...d, [field]: value }))
    }
    scheduleCommitEdgeTxn(800)
  }
  // 锚点配置保存
  const handleSavePorts = () => {
    if (!engine || !portsEditorRef.current) return
    const nodeId = selectedNodeIds[0]
    if (!nodeId) return
    // 从 ref 获取数据
    const ports = portsEditorRef.current.getPorts()
    const showPorts = portsEditorRef.current.getShowPorts()
    // 使用命令保存，纳入历史记录
    engine.history.execute(new UpdateNodePortsCommand(engine.graph, nodeId, ports, showPorts))
    setPortsModal(false)
  }
  const handleStopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // 仅对文本类字段，子组件会把 onFocus/onBlur 透传到 Field
  const handleOnFocusTextLike = () => {
    inputLockRef.current = true
  }
  const handleOnBlurTextLike = () => {
    inputLockRef.current = false
    scheduleSyncRef.current?.()
  }

  const renderNone = (kind: string) => (
    <div className="text-xs text-gray-500">
      {kind === 'mixed' ? `多类型混合选择，无法显示统一属性` : `未选择任何元素`}
    </div>
  )

  // 子组件接管渲染
  const panelWidth = 360 // w-80
  const handleWidth = 0 // 使用自定义 SVG 句柄宽度 (与 viewBox 宽度一致)
  const collapsedOffset = panelWidth - handleWidth // 折叠时向右平移，保留句柄露出
  const wrapperStyle: React.CSSProperties = {
    width: panelWidth,
    transform: visible ? 'translateX(0)' : `translateX(${collapsedOffset}px)`,
    transition: 'transform 240ms ease'
  }

  return (
    <>
      <div className={`absolute top-0 right-0 h-full z-10 flex ${className}`} style={{ pointerEvents: 'none' }}>
        <div className="relative h-full flex" style={wrapperStyle}>
          <div
            className="relative w-100 h-full flex flex-col bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-900 dark:text-gray-100 text-xs shadow-lg overflow-hidden"
            style={{ pointerEvents: 'auto' }}
            onPointerDown={handleStopPropagation}
            onPointerUp={handleStopPropagation}
            onClick={handleStopPropagation}
          >
            <div className="h-10 font-semibold px-2 pt-2 pb-2 shrink-0 flex items-center justify-between gap-2">
              <span className="text-[18px] dark:text-blue-400">属性面板</span>
              <div className="flex items-center gap-1">
                {selectionKind === 'node-single' && (
                  <>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-[12px] leading-none rounded border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-700/70 dark:hover:bg-gray-700 transition-colors cursor-pointer hover:bg-blue-500 hover:text-white"
                      onClick={() => setDataModal({ type: 'node', open: true })}
                    >
                      编辑数据
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-[12px] leading-none rounded border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-700/70 dark:hover:bg-gray-700 transition-colors cursor-pointer hover:bg-blue-500 hover:text-white"
                      onClick={() => setPortsModal(true)}
                    >
                      锚点配置
                    </button>
                  </>
                )}
                {selectionKind === 'edge-single' && (
                  <button
                    type="button"
                    className="px-3 py-1.5 text-[12px] leading-none rounded border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-700/70 dark:hover:bg-gray-700 transition-colors cursor-pointer hover:bg-blue-500 hover:text-white"
                    onClick={() => setDataModal({ type: 'edge', open: true })}
                  >
                    编辑数据
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto px-2 pb-2">
              {selectionKind.startsWith('node') ? (
                <NodeProperties
                  draft={nodeDraft}
                  mode={selectionKind === 'node-single' ? 'single' : 'multi'}
                  onCommit={commitNodeField}
                  engine={engine}
                  onFocusTextLike={handleOnFocusTextLike}
                  onBlurTextLike={handleOnBlurTextLike}
                />
              ) : selectionKind.startsWith('edge') ? (
                <EdgeProperties
                  draft={edgeDraft}
                  mode={selectionKind === 'edge-single' ? 'single' : 'multi'}
                  onCommit={commitEdgeField}
                  onFocusTextLike={handleOnFocusTextLike}
                  onBlurTextLike={handleOnBlurTextLike}
                />
              ) : selectionKind === 'none' ? (
                <CanvasSettingsSection
                  draft={canvasDraft}
                  onCommit={commitCanvasField}
                  onSync={syncCanvasDraft}
                  onFocusTextLike={handleOnFocusTextLike}
                  onBlurTextLike={handleOnBlurTextLike}
                />
              ) : (
                renderNone(selectionKind)
              )}
            </div>
          </div>
        </div>
      </div>
      {/* 自定义数据弹窗 */}
      <Modal
        visible={dataModal.open}
        title={dataModal.type === 'node' ? '编辑节点自定义数据' : dataModal.type === 'edge' ? '编辑边自定义数据' : ''}
        onClose={() => {
          try {
            dataEditorRef.current?.save?.()
          } catch {
            /*无*/
          }
          setDataModal({ type: null, open: false })
        }}
        width={640}
      >
        {dataModal.type === 'node' && (
          <CustomDataEditor
            ref={dataEditorRef}
            value={(nodeDraft as any)?.custom}
            onChange={(next) => {
              commitNodeField('custom', next)
            }}
          />
        )}
        {dataModal.type === 'edge' && (
          <CustomDataEditor
            ref={dataEditorRef}
            value={(edgeDraft as any)?.custom}
            onChange={(next) => {
              commitEdgeField('custom', next)
            }}
          />
        )}
      </Modal>
      {/* 锚点配置弹窗 */}
      <Modal
        visible={portsModal && selectionKind === 'node-single'}
        title="锚点配置"
        onClose={() => setPortsModal(false)}
        width={600}
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setPortsModal(false)}
              className="px-4 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleSavePorts}
              className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
            >
              保存
            </button>
          </div>
        }
      >
        {engine && selectedNodeIds[0] && (
          <PortsEditor ref={portsEditorRef} node={engine.graph.getNode(selectedNodeIds[0]) || null} />
        )}
      </Modal>
    </>
  )
}

export default PropertyPanel
