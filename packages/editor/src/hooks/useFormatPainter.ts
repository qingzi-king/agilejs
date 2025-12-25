/*
 * @Description: 格式刷逻辑 Hook
 * @Author: qingzi.wang
 * @Date: 2025-12-02 10:10:00
 */
import { useEffect, useRef } from 'react'
import { useCanvasStore, useFormatPainterStore } from '@/store'
import { hitTestNodes, hitTestEdges } from '@/utils/hittest'
import { UpdateNodeDataCommand, UpdateEdgeDataCommand } from '@fnt-agilejs/core'

export const useFormatPainter = () => {
  const engine = useCanvasStore((state) => state.engine)
  const { isActive, source, deactivate } = useFormatPainterStore()
  const isProcessingRef = useRef(false)

  useEffect(() => {
    if (!engine || !isActive || !source) return

    const canvas = engine.canvas

    // 设置光标
    const originalCursor = canvas.style.cursor
    canvas.style.cursor = 'copy' // 或者 'crosshair'

    // 统一处理绘制逻辑
    const handlePaint = (clientPoint: { x: number; y: number }, event: Event, isTouch: boolean) => {
      if (isProcessingRef.current) return

      const rect = canvas.getBoundingClientRect()
      const screen = { x: clientPoint.x - rect.left, y: clientPoint.y - rect.top }
      const world = engine.toWorld(screen)
      const scale = engine.getScale()

      // 触控模式下使用更大的命中阈值
      const nodeThreshold = isTouch ? 12 : 5
      const edgeThreshold = isTouch ? 18 : 8

      // 优先检测节点
      const hitNode = hitTestNodes(world, engine.graph.getNodes(), { scale, pixelThresholdPx: nodeThreshold })

      if (hitNode) {
        if (source.type === 'node') {
          // 应用样式到节点
          event.preventDefault()
          event.stopPropagation()

          isProcessingRef.current = true

          // 构造新数据：保留原有 data，合并 style
          const newData = {
            style: {
              ...((hitNode.data?.style as object) || {}),
              ...source.style
            }
          }

          engine.history.execute(new UpdateNodeDataCommand(engine.graph, hitNode.id, newData))

          setTimeout(() => {
            isProcessingRef.current = false
          }, 100)
          return
        }
      }

      // 如果没命中节点，检测边
      if (!hitNode && source.type === 'edge') {
        const hitEdge = hitTestEdges(world, engine, { scale, pixelThresholdPx: edgeThreshold })
        if (hitEdge) {
          event.preventDefault()
          event.stopPropagation()

          isProcessingRef.current = true

          const newData = {
            style: {
              ...((hitEdge.data?.style as object) || {}),
              ...source.style
            }
          }

          engine.history.execute(new UpdateEdgeDataCommand(engine.graph, hitEdge.id, newData))

          setTimeout(() => {
            isProcessingRef.current = false
          }, 100)
          return
        }
      }

      // 点击空白处，取消格式刷
      // deactivate();
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return // 只处理左键
      handlePaint({ x: e.clientX, y: e.clientY }, e, false)
    }

    // 移动端：使用 touchstart 提前拦截，防止其他插件（如选择/拖拽）响应
    const handleTouchStart = (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return
      handlePaint({ x: e.touches[0].clientX, y: e.touches[0].clientY }, e, true)
    }

    // 使用捕获阶段监听，以便拦截事件
    canvas.addEventListener('mousedown', handleMouseDown, true)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true } as any)

    return () => {
      canvas.style.cursor = originalCursor
      canvas.removeEventListener('mousedown', handleMouseDown, true)
      canvas.removeEventListener('touchstart', handleTouchStart as any, { capture: true } as any)
    }
  }, [engine, isActive, source, deactivate])
}
