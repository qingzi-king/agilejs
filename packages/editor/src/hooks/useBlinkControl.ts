/*
 * @Description: 闪烁控制 Hook - 管理节点闪烁效果的状态和同步
 * @Author: qingzi.wang
 * @Date: 2025-11-18
 */
import { useState, useEffect, useCallback } from 'react'
import type { CanvasEngine } from '@fnt-agilejs/core'
import { BlinkPlugin } from '@fnt-agilejs/core'

export interface BlinkState {
  enabled: boolean
  period: number
  min: number
  max: number
}

export interface UseBlinkControlOptions {
  engine: CanvasEngine | null
  nodeId?: string
  initialPeriod?: number
  initialMin?: number
  initialMax?: number
}

export interface UseBlinkControlReturn {
  blinkOn: boolean
  blinkPeriod: number
  blinkMin: number
  blinkMax: number
  setBlinkOn: (enabled: boolean) => void
  updateBlinkPeriod: (value: number) => void
  updateBlinkMin: (value: number) => void
  updateBlinkMax: (value: number) => void
  toggleBlink: (enabled: boolean) => void
}

/**
 * 闪烁控制 Hook
 *
 * 职责：
 * 1. 管理闪烁状态（启用/禁用、周期、透明度范围）
 * 2. 同步引擎节点数据（node.data.blink）
 * 3. 控制 BlinkPlugin 插件的启停
 * 4. 订阅插件状态变更并更新 UI
 */
export function useBlinkControl({
  engine,
  nodeId,
  initialPeriod = 800,
  initialMin = 0.25,
  initialMax = 1
}: UseBlinkControlOptions): UseBlinkControlReturn {
  // 本地状态
  const [blinkOn, setBlinkOn] = useState<boolean>(() => {
    if (!engine || !nodeId) return false
    const plugin = engine.plugins.get<BlinkPlugin>('blink')
    return !!plugin?.isBlinking(nodeId)
  })

  const [blinkPeriod, setBlinkPeriod] = useState<number>(initialPeriod)
  const [blinkMin, setBlinkMin] = useState<number>(initialMin)
  const [blinkMax, setBlinkMax] = useState<number>(initialMax)

  // 同步引擎数据的辅助函数
  const syncToEngine = useCallback(
    (state: Partial<BlinkState>) => {
      if (!engine || !nodeId) return

      const node = engine.graph.getNode(nodeId)
      if (!node) return

      const data: any = { ...(node.data || {}) }
      data.blink = {
        ...(data.blink || {}),
        enabled: state.enabled ?? blinkOn,
        period: state.period ?? blinkPeriod,
        min: state.min ?? blinkMin,
        max: state.max ?? blinkMax
      }
      node.data = data
      engine.graph.markDirty()
    },
    [engine, nodeId, blinkOn, blinkPeriod, blinkMin, blinkMax]
  )

  // 控制插件启停
  const controlPlugin = useCallback(
    (enabled: boolean, period: number, min: number, max: number) => {
      if (!engine || !nodeId) return

      const plugin = engine.plugins.get<BlinkPlugin>('blink')
      if (!plugin) return

      plugin.stop([nodeId])
      if (enabled) {
        plugin.start([nodeId], { period, min, max })
      }
    },
    [engine, nodeId]
  )

  // 当节点或初始值变化时，从引擎数据或 props 中同步状态
  useEffect(() => {
    setBlinkPeriod(initialPeriod)
    setBlinkMin(initialMin)
    setBlinkMax(initialMax)

    if (!engine || !nodeId) {
      setBlinkOn(false)
      return
    }

    // 从节点数据读取闪烁状态
    const node = engine.graph.getNode(nodeId)
    const blink: any = (node?.data as any)?.blink

    if (blink) {
      // 优先使用数据中的值
      if (typeof blink.enabled === 'boolean') {
        setBlinkOn(blink.enabled)
      } else {
        const plugin = engine.plugins.get<BlinkPlugin>('blink')
        setBlinkOn(!!plugin?.isBlinking(nodeId))
      }

      if (typeof blink.period === 'number') {
        setBlinkPeriod(Math.max(1, Math.min(4000, blink.period)))
      }
      if (typeof blink.min === 'number') {
        setBlinkMin(Math.max(0, Math.min(1, blink.min)))
      }
      if (typeof blink.max === 'number') {
        setBlinkMax(Math.max(0, Math.min(1, blink.max)))
      }
    }
  }, [engine, nodeId, initialPeriod, initialMin, initialMax])

  // 订阅插件状态变更
  useEffect(() => {
    if (!engine) return

    const plugin = engine.plugins.get<BlinkPlugin>('blink')
    if (!plugin) return

    const unsubscribe = plugin.onChange(({ id, running }) => {
      if (id === nodeId) {
        setBlinkOn(!!running)
      }
    })

    return () => unsubscribe?.()
  }, [engine, nodeId])

  // 切换闪烁启用状态
  const toggleBlink = useCallback(
    (enabled: boolean) => {
      setBlinkOn(enabled)
      syncToEngine({ enabled })
      controlPlugin(enabled, blinkPeriod, blinkMin, blinkMax)
    },
    [syncToEngine, controlPlugin, blinkPeriod, blinkMin, blinkMax]
  )

  // 更新周期
  const updateBlinkPeriod = useCallback(
    (value: number) => {
      setBlinkPeriod(value)
      syncToEngine({ period: value })
      if (blinkOn) {
        controlPlugin(true, value, blinkMin, blinkMax)
      }
    },
    [syncToEngine, controlPlugin, blinkOn, blinkMin, blinkMax]
  )

  // 更新最小透明度
  const updateBlinkMin = useCallback(
    (value: number) => {
      setBlinkMin(value)
      syncToEngine({ min: value })
      if (blinkOn) {
        controlPlugin(true, blinkPeriod, value, blinkMax)
      }
    },
    [syncToEngine, controlPlugin, blinkOn, blinkPeriod, blinkMax]
  )

  // 更新最大透明度
  const updateBlinkMax = useCallback(
    (value: number) => {
      setBlinkMax(value)
      syncToEngine({ max: value })
      if (blinkOn) {
        controlPlugin(true, blinkPeriod, blinkMin, value)
      }
    },
    [syncToEngine, controlPlugin, blinkOn, blinkPeriod, blinkMin]
  )

  return {
    blinkOn,
    blinkPeriod,
    blinkMin,
    blinkMax,
    setBlinkOn,
    updateBlinkPeriod,
    updateBlinkMin,
    updateBlinkMax,
    toggleBlink
  }
}
