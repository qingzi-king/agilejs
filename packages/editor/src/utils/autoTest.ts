/**
 * @Description: 自动化测试工具 - 步骤化调整图形样式
 * @Author: qingzi.wang
 * @Date: 2025-11-10
 */

import type { CanvasEngine } from '@agilejs/core'
import type { NodeData } from '@agilejs/core'
import { toScene, fromScene } from '@agilejs/core'

/**
 * 节点匹配器 - 支持多种匹配方式
 */
export interface NodeMatcher {
  /** 匹配方式：id | shape | custom */
  type: 'id' | 'shape' | 'custom'
  /** 匹配值（根据 type 不同有不同含义） */
  value: string | string[]
  /** 自定义数据路径（type='custom' 时使用，如 'data.custom.code'） */
  path?: string
}

/**
 * 多目标配置 - 允许单个步骤控制多个节点组
 */
export interface TargetGroup {
  /** 目标节点匹配器 */
  matcher: NodeMatcher
  /** 样式变更 */
  styleChanges?: Record<string, any>
  /** 位置变更 */
  positionChanges?: { x?: number; y?: number; dx?: number; dy?: number }
  /** 尺寸变更 */
  sizeChanges?: { width?: number; height?: number; dw?: number; dh?: number }
  /** 通用属性变更（支持所有节点属性：rotation, zIndex, visible, selectable, draggable, groupId 等） */
  propertyChanges?: Record<string, any>
  /** 深层数据变更（支持 data.label, data.text, data.custom.* 等任意路径） */
  dataChanges?: Record<string, any>
  /** 自定义执行函数（针对此目标组的特殊逻辑，如进度动画） */
  customAction?: (engine: CanvasEngine, nodes: NodeData[]) => void | Promise<void>
}

/**
 * 测试步骤定义
 */
export interface TestStep {
  /** 步骤描述 */
  description: string

  // ===== 单目标模式（向后兼容） =====
  /** 目标节点 ID（支持 '*' 表示所有节点，或使用 targetMatcher 进行更复杂的匹配） */
  targetId?: string | string[]
  /** 高级节点匹配器（优先于 targetId） */
  targetMatcher?: NodeMatcher
  /** 样式变更 */
  styleChanges?: Record<string, any>
  /** 位置变更 */
  positionChanges?: { x?: number; y?: number; dx?: number; dy?: number }
  /** 尺寸变更 */
  sizeChanges?: { width?: number; height?: number; dw?: number; dh?: number }
  /** 通用属性变更（支持所有节点属性：rotation, zIndex, visible, selectable, draggable, groupId 等） */
  propertyChanges?: Record<string, any>
  /** 深层数据变更（支持 data.label, data.text, data.custom.* 等任意路径） */
  dataChanges?: Record<string, any>

  // ===== 多目标模式 =====
  /** 多目标配置（优先级最高，如果指定则忽略 targetId/targetMatcher/styleChanges 等） */
  targets?: TargetGroup[]
  /** 延迟时间（毫秒） */
  delay?: number
  /** 是否需要动画过渡 */
  animated?: boolean
  /** 动画持续时间（毫秒） */
  duration?: number
  /** 自定义执行函数 */
  customAction?: (engine: CanvasEngine, step: TestStep) => void | Promise<void>

  // ===== 步骤控制 =====
  /** 提前启动下一步骤的时间（毫秒），允许步骤重叠执行。例如：当前步骤还有 1000ms 时就启动下一步骤 */
  startNextAfter?: number
}

/**
 * 测试场景定义
 */
export interface TestScenario {
  /** 场景名称 */
  name: string
  /** 场景描述 */
  description: string
  /** 测试步骤列表 */
  steps: TestStep[]
  /** 是否循环执行 */
  loop?: boolean
  /** 每轮循环间隔（毫秒） */
  loopDelay?: number
}

/**
 * 自动测试管理器
 */
export class AutoTestManager {
  private engine: CanvasEngine
  private currentScenario: TestScenario | null = null
  private currentStepIndex: number = 0
  private isRunning: boolean = false
  private isPaused: boolean = false
  private timeoutId: number | null = null
  private originalNodeData: Map<string, NodeData> = new Map()
  private originalSceneData: string | null = null // 保存原始场景 JSON 字符串

  /** 事件回调 */
  public onStepStart?: (step: TestStep, index: number, total: number) => void
  public onStepComplete?: (step: TestStep, index: number, total: number) => void
  public onScenarioComplete?: (scenario: TestScenario) => void
  public onScenarioStop?: () => void

  constructor(engine: CanvasEngine) {
    this.engine = engine
  }

  /**
   * 静态方法：创建 line 进度动画的 customAction（用于 TargetGroup）
   *
   * 该方法用于创建流畅的线条进度动画效果，可直接放在 TargetGroup.customAction 中。
   *
   * @param startRatio 起始进度比例（0-1），例如 0 表示 0%
   * @param endRatio 结束进度比例（0-1），例如 1 表示 100%
   * @param duration 动画持续时间（毫秒），默认 2000ms
   * @returns 返回一个异步函数，可直接用于 TargetGroup.customAction
   * @example
   * // 配合其他目标组使用
   * {
   *   description: '多目标动画',
   *   targets: [
   *     {
   *       matcher: { type: 'custom', value: ['2G'], path: 'data.custom.code' },
   *       dataChanges: { 'style.fill': '#ef4444' }
   *     },
   *     {
   *       matcher: { type: 'custom', value: ['g2'], path: 'data.custom.code' },
   *       customAction: AutoTestManager.createLineProgressAction(0, 1, 2000)
   *     }
   *   ]
   * }
   */
  static createLineProgressAction(
    startRatio: number,
    endRatio: number,
    duration: number = 2000
  ): (engine: CanvasEngine, nodes: NodeData[]) => Promise<void> {
    return async (engine: CanvasEngine, nodes: NodeData[]) => {
      const frameCount = Math.ceil(duration / 16) // 60fps
      const frameDelay = duration / frameCount

      for (let frame = 0; frame <= frameCount; frame++) {
        const progress = frame / frameCount
        // 匀速插值
        const currentEndRatio = startRatio + (endRatio - startRatio) * progress

        nodes.forEach((node) => {
          node.data = node.data || {}
          const nodeData = node.data as any
          nodeData.line = nodeData.line || {}
          nodeData.line.progress = {
            enabled: true,
            startRatio: 0,
            endRatio: currentEndRatio
          }
        })

        engine.graph.markDirty()
        await new Promise((resolve) => setTimeout(resolve, frameDelay))
      }
    }
  }

  /**
   * 实例方法：创建 line 进度动画的 customAction（旧方法，保持向后兼容）
   *
   * 该方法用于创建流畅的线条进度动画效果，适用于 MDIAS 进路、数据传输、加载指示等场景。
   *
   * @param matcher 节点匹配器，用于定位需要动画的 line 节点
   * @param startRatio 起始进度比例（0-1），例如 0 表示 0%
   * @param endRatio 结束进度比例（0-1），例如 1 表示 100%
   * @param duration 动画持续时间（毫秒），默认 2000ms
   * @returns 返回一个异步函数，可直接用于 TestStep.customAction
   * @example
   * // 示例1：MDIAS 进路激活动画（完整进度）
   * {
   *   description: '激活G2进路',
   *   customAction: testManager.createLineProgressAction(
   *     { type: 'custom', value: ['g2'], path: 'data.custom.code' },
   *     0,    // 起始 0%
   *     1,    // 结束 100%
   *     3000  // 持续 3 秒
   *   ),
   *   delay: 1000
   * }
   * @remarks
   * - 动画使用 easeInOutCubic 缓动函数，开始和结束时速度较慢，中间快
   * - 支持任意起止进度值，不限于 0-1 范围
   * - 帧率固定为 60fps（每帧约 16ms）
   * - 进度数据存储在 node.data.line.progress 对象中
   * - 可配合 dataChanges 同时修改样式（如颜色、线宽）
   */
  public createLineProgressAction(
    matcher: NodeMatcher,
    startRatio: number,
    endRatio: number,
    duration: number = 2000
  ): () => Promise<void> {
    return async () => {
      const nodes = this.matchNodesByMatcher(matcher)
      if (nodes.length > 0) {
        await this.animateLineProgress(nodes, 'line.progress', startRatio, endRatio, duration)
      }
    }
  }

  /**
   * 启动测试场景
   */
  async start(scenario: TestScenario): Promise<void> {
    if (this.isRunning && !this.isPaused) {
      console.warn('测试已在运行中')
      return
    }

    this.currentScenario = scenario
    this.currentStepIndex = 0
    this.isRunning = true
    this.isPaused = false

    // 备份原始数据
    this.backupNodeData()

    console.log(`🚀 开始测试场景: ${scenario.name}`)
    await this.executeScenario()
  }

  /**
   * 暂停测试
   */
  pause(): void {
    if (!this.isRunning) return
    this.isPaused = true
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    console.log('⏸️ 测试已暂停')
  }

  /**
   * 恢复测试
   */
  resume(): void {
    if (!this.isRunning || !this.isPaused) return
    this.isPaused = false
    console.log('▶️ 测试已恢复')
    this.executeScenario()
  }

  /**
   * 停止测试
   */
  stop(): void {
    this.isRunning = false
    this.isPaused = false
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    this.currentScenario = null
    this.currentStepIndex = 0
    console.log('⏹️ 测试已停止')
    this.onScenarioStop?.()
  }

  /**
   * 恢复原始状态（自动重新加载场景数据）
   */
  restore(): void {
    // 优先使用完整场景恢复（自动重新加载）
    if (this.originalSceneData) {
      try {
        const sceneData = JSON.parse(this.originalSceneData)
        fromScene(this.engine, sceneData)
        console.log('🔄 已自动重新加载原始场景数据')
        return
      } catch (error) {
        console.warn('⚠️ 场景恢复失败，使用节点级恢复', error)
      }
    }

    // 降级方案：节点级恢复（手动逐个恢复）
    this.originalNodeData.forEach((data, id) => {
      const node = this.engine.graph.getNode(id)
      if (node) {
        // 恢复样式
        if (data.data?.style) {
          node.data = node.data || {}
          node.data.style = { ...data.data.style }
        }
        // 恢复位置
        node.position = { ...data.position }
        // 恢复尺寸
        node.size = { ...data.size }
      }
    })

    this.engine.graph.markDirty()
    console.log('🔄 已恢复原始状态（节点级）')
  }

  /**
   * 单步执行
   */
  async stepNext(): Promise<void> {
    if (!this.currentScenario) return

    if (this.currentStepIndex >= this.currentScenario.steps.length) {
      console.log('已到达最后一步')
      return
    }

    const step = this.currentScenario.steps[this.currentStepIndex]
    await this.executeStep(step, this.currentStepIndex)
    this.currentStepIndex++
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentScenario: this.currentScenario?.name,
      currentStep: this.currentStepIndex,
      totalSteps: this.currentScenario?.steps.length || 0
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 备份节点数据和完整场景
   */
  private backupNodeData(): void {
    // 方式1：备份节点数据（向后兼容）
    this.originalNodeData.clear()
    const nodes = this.engine.graph.getNodes()
    nodes.forEach((node) => {
      this.originalNodeData.set(node.id, {
        ...node,
        position: { ...node.position },
        size: { ...node.size },
        data: node.data ? JSON.parse(JSON.stringify(node.data)) : undefined
      })
    })

    // 方式2：备份完整场景（用于重新加载）
    try {
      const sceneData = toScene(this.engine)
      this.originalSceneData = JSON.stringify(sceneData)
      console.log('✅ 已备份完整场景数据')
    } catch (error) {
      console.warn('⚠️ 场景备份失败，将使用节点级恢复', error)
      this.originalSceneData = null
    }
  }

  /**
   * 执行场景
   */
  private async executeScenario(): Promise<void> {
    if (!this.currentScenario || !this.isRunning) return

    const { steps, loop, loopDelay = 1000 } = this.currentScenario

    while (this.currentStepIndex < steps.length && this.isRunning && !this.isPaused) {
      const step = steps[this.currentStepIndex]
      const nextStep = steps[this.currentStepIndex + 1]

      // 如果当前步骤设置了提前启动下一步骤
      if (step.startNextAfter !== undefined && step.startNextAfter >= 0 && nextStep) {
        // 启动当前步骤
        const currentStepPromise = this.executeStep(step, this.currentStepIndex)

        // 等待指定时间后启动下一步骤
        const nextStepPromise = (async () => {
          await this.delay(step.startNextAfter!)
          if (this.isRunning && !this.isPaused) {
            console.log(`⏩ 提前启动下一步骤（在当前步骤 ${step.startNextAfter}ms 后）`)
            this.currentStepIndex++
            await this.executeStep(nextStep, this.currentStepIndex)
          }
        })()

        // 等待两个步骤都完成
        await Promise.all([currentStepPromise, nextStepPromise])

        // 跳过下一步骤（因为已经执行过了）
        this.currentStepIndex++
      } else {
        // 正常执行当前步骤
        await this.executeStep(step, this.currentStepIndex)
        this.currentStepIndex++
      }

      // 检查是否需要暂停
      if (this.isPaused) {
        return
      }
    }

    // 场景完成
    if (this.currentStepIndex >= steps.length && this.isRunning) {
      console.log(`✅ 测试场景完成: ${this.currentScenario.name}`)
      this.onScenarioComplete?.(this.currentScenario)

      // 检查是否循环
      if (loop && this.isRunning) {
        console.log(`🔁 等待 ${loopDelay}ms 后开始下一轮...`)
        await this.delay(loopDelay)
        this.currentStepIndex = 0
        await this.executeScenario()
      } else {
        this.stop()
      }
    }
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(step: TestStep, index: number): Promise<void> {
    const total = this.currentScenario?.steps.length || 0

    console.log(`📍 步骤 ${index + 1}/${total}: ${step.description}`)
    this.onStepStart?.(step, index, total)

    // 执行自定义动作
    if (step.customAction) {
      await step.customAction(this.engine, step)
    }
    // 多目标模式
    else if (step.targets && step.targets.length > 0) {
      await this.executeMultiTargetStep(step)
    }
    // 单目标模式（向后兼容）
    else {
      const targetNodes = this.getTargetNodes(step)

      if (targetNodes.length === 0) {
        console.warn(`未找到目标节点`, step.targetId || step.targetMatcher)
        return
      }

      // 应用变更
      if (step.animated && step.duration) {
        await this.applyChangesAnimated(targetNodes, step)
      } else {
        this.applyChangesImmediate(targetNodes, step)
      }
    }

    this.onStepComplete?.(step, index, total)

    // 延迟
    if (step.delay) {
      await this.delay(step.delay)
    }
  }

  /**
   * 执行多目标步骤
   */
  private async executeMultiTargetStep(step: TestStep): Promise<void> {
    if (!step.targets) return

    console.log(`🎯 多目标模式: ${step.targets.length} 个目标组`)

    // 并行处理所有目标组
    const tasks = step.targets.map(async (targetGroup, idx) => {
      const nodes = this.matchNodesByMatcher(targetGroup.matcher)

      if (nodes.length === 0) {
        console.warn(`目标组 ${idx + 1} 未找到匹配节点`, targetGroup.matcher)
        return
      }

      console.log(`  ✓ 目标组 ${idx + 1}: 匹配到 ${nodes.length} 个节点`)

      // 先应用数据变更（立即生效）
      if (
        targetGroup.dataChanges ||
        targetGroup.styleChanges ||
        targetGroup.propertyChanges ||
        targetGroup.positionChanges ||
        targetGroup.sizeChanges
      ) {
        const tempStep: TestStep = {
          description: `${step.description} - 目标组${idx + 1}`,
          styleChanges: targetGroup.styleChanges,
          positionChanges: targetGroup.positionChanges,
          sizeChanges: targetGroup.sizeChanges,
          propertyChanges: targetGroup.propertyChanges,
          dataChanges: targetGroup.dataChanges,
          animated: step.animated,
          duration: step.duration
        }

        // 应用变更
        if (step.animated && step.duration) {
          await this.applyChangesAnimated(nodes, tempStep)
        } else {
          this.applyChangesImmediate(nodes, tempStep)
        }
      }

      // 然后执行自定义动作（如果有）
      if (targetGroup.customAction) {
        await targetGroup.customAction(this.engine, nodes)
      }
    })

    // 等待所有目标组完成（并行执行动画）
    await Promise.all(tasks)
  }

  /**
   * 获取目标节点（支持多种匹配方式）
   */
  private getTargetNodes(step: TestStep): NodeData[] {
    // 优先使用 targetMatcher
    if (step.targetMatcher) {
      return this.matchNodesByMatcher(step.targetMatcher)
    }

    // 兼容旧的 targetId 方式
    if (step.targetId) {
      return this.matchNodesById(step.targetId)
    }

    return []
  }

  /**
   * 通过 ID 匹配节点（旧方式，向后兼容）
   */
  private matchNodesById(targetId: string | string[]): NodeData[] {
    if (targetId === '*') {
      return this.engine.graph.getNodes()
    }

    const ids = Array.isArray(targetId) ? targetId : [targetId]
    const nodes: NodeData[] = []

    ids.forEach((id) => {
      const node = this.engine.graph.getNode(id)
      if (node) {
        nodes.push(node)
      }
    })

    return nodes
  }

  /**
   * 通过匹配器匹配节点
   */
  private matchNodesByMatcher(matcher: NodeMatcher): NodeData[] {
    const allNodes = this.engine.graph.getNodes()

    switch (matcher.type) {
      case 'id':
        return this.matchNodesById(matcher.value)

      case 'shape': {
        const shapes = Array.isArray(matcher.value) ? matcher.value : [matcher.value]
        return allNodes.filter((node) => shapes.includes(node.shape))
      }

      case 'custom': {
        if (!matcher.path) {
          console.warn('自定义匹配需要提供 path 参数')
          return []
        }

        const values = Array.isArray(matcher.value) ? matcher.value : [matcher.value]
        const matchedNodes = allNodes.filter((node) => {
          const nodeValue = this.getValueByPath(node, matcher.path!)
          // 支持多种值类型的匹配
          if (nodeValue === undefined || nodeValue === null) {
            return false
          }
          // 转换为字符串进行比较（不区分大小写）
          const nodeValueStr = String(nodeValue).toLowerCase()
          return values.some((v: string) => String(v).toLowerCase() === nodeValueStr)
        })

        // 调试日志
        console.log(
          `🔍 自定义匹配: path="${matcher.path}", values=[${values.join(', ')}], 匹配到 ${matchedNodes.length} 个节点`,
          matchedNodes.map((n) => `${n.id}(${this.getValueByPath(n, matcher.path!)})`)
        )

        return matchedNodes
      }

      default:
        console.warn(`未知的匹配类型: ${matcher.type}`)
        return []
    }
  }

  /**
   * 通过路径获取对象深层属性值
   * @example getValueByPath(node, 'data.custom.code') => node.data.custom.code
   */
  private getValueByPath(obj: any, path: string): any {
    const keys = path.split('.')
    let current = obj

    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return undefined
      }
      current = current[key]
    }

    return current
  }

  /**
   * 通过路径设置对象深层属性值（支持深度合并）
   * @example setValueByPath(node.data, 'custom.code', 'g1') => node.data.custom.code = 'g1'
   * @example setValueByPath(node.data, 'label', 'test') => node.data.label = 'test'
   * @example setValueByPath(node.data, 'style.label', {color: '#fff'}) => 深度合并到 node.data.style.label
   */
  private setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    let current = obj

    // 遍历到倒数第二级
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]

      // 如果路径不存在，创建空对象
      if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
        current[key] = {}
      }

      current = current[key]
    }

    // 设置最后一级的值（如果是对象，则深度合并）
    const lastKey = keys[keys.length - 1]
    const existingValue = current[lastKey]

    // 如果新值和旧值都是对象（非数组），进行深度合并
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existingValue &&
      typeof existingValue === 'object' &&
      !Array.isArray(existingValue)
    ) {
      current[lastKey] = { ...existingValue, ...value }
    } else {
      current[lastKey] = value
    }
  }

  /**
   * 立即应用变更
   */
  private applyChangesImmediate(nodes: NodeData[], step: TestStep): void {
    nodes.forEach((node) => {
      // 位置变更
      if (step.positionChanges) {
        const { x, y, dx, dy } = step.positionChanges
        if (x !== undefined) node.position.x = x
        if (y !== undefined) node.position.y = y
        if (dx !== undefined) node.position.x += dx
        if (dy !== undefined) node.position.y += dy
      }

      // 尺寸变更
      if (step.sizeChanges) {
        const { width, height, dw, dh } = step.sizeChanges
        if (width !== undefined) node.size.width = width
        if (height !== undefined) node.size.height = height
        if (dw !== undefined) node.size.width += dw
        if (dh !== undefined) node.size.height += dh
      }

      // 通用属性变更（支持所有节点顶层属性）
      if (step.propertyChanges) {
        Object.keys(step.propertyChanges).forEach((key) => {
          ;(node as any)[key] = step.propertyChanges![key]
        })
      }

      // 样式变更（向后兼容，已废弃，建议使用 dataChanges）
      if (step.styleChanges) {
        node.data = node.data || {}
        Object.keys(step.styleChanges).forEach((key) => {
          this.setValueByPath(node.data!, `style.${key}`, step.styleChanges![key])
        })
      }

      // 数据变更（推荐方式：直接操作 node.data，支持深度合并）
      if (step.dataChanges) {
        node.data = node.data || {}
        Object.keys(step.dataChanges).forEach((key) => {
          this.setValueByPath(node.data!, key, step.dataChanges![key])
        })
      }
    })

    this.engine.graph.markDirty()
  }

  /**
   * 动画应用变更（简化版：动画仅支持位置和尺寸，样式/数据直接应用）
   */
  private async applyChangesAnimated(nodes: NodeData[], step: TestStep): Promise<void> {
    const duration = step.duration || 500
    const frameCount = Math.ceil(duration / 16) // 60fps
    const frameDelay = duration / frameCount

    // 记录初始位置和尺寸
    const initialStates = nodes.map((node) => ({
      node,
      position: { ...node.position },
      size: { ...node.size }
    }))

    // 计算目标位置和尺寸
    const targetStates = initialStates.map(({ node }) => {
      const target: any = {}

      if (step.positionChanges) {
        const { x, y, dx, dy } = step.positionChanges
        target.x = x ?? (dx !== undefined ? node.position.x + dx : node.position.x)
        target.y = y ?? (dy !== undefined ? node.position.y + dy : node.position.y)
      }

      if (step.sizeChanges) {
        const { width, height, dw, dh } = step.sizeChanges
        target.width = width ?? (dw !== undefined ? node.size.width + dw : node.size.width)
        target.height = height ?? (dh !== undefined ? node.size.height + dh : node.size.height)
      }

      return target
    })

    // 第一帧：立即应用样式和数据变更
    nodes.forEach((node) => {
      // 通用属性变更
      if (step.propertyChanges) {
        Object.keys(step.propertyChanges).forEach((key) => {
          ;(node as any)[key] = step.propertyChanges![key]
        })
      }

      // 样式变更（向后兼容）
      if (step.styleChanges) {
        node.data = node.data || {}
        Object.keys(step.styleChanges).forEach((key) => {
          this.setValueByPath(node.data!, `style.${key}`, step.styleChanges![key])
        })
      }

      // 数据变更
      if (step.dataChanges) {
        node.data = node.data || {}
        Object.keys(step.dataChanges).forEach((key) => {
          this.setValueByPath(node.data!, key, step.dataChanges![key])
        })
      }
    })

    // 逐帧动画：仅插值位置和尺寸
    for (let frame = 0; frame <= frameCount; frame++) {
      const progress = frame / frameCount
      const eased = this.easeInOutCubic(progress)

      initialStates.forEach(({ node, position, size }, index) => {
        const target = targetStates[index]

        // 插值位置
        if (target.x !== undefined) {
          node.position.x = this.lerp(position.x, target.x, eased)
        }
        if (target.y !== undefined) {
          node.position.y = this.lerp(position.y, target.y, eased)
        }

        // 插值尺寸
        if (target.width !== undefined) {
          node.size.width = this.lerp(size.width, target.width, eased)
        }
        if (target.height !== undefined) {
          node.size.height = this.lerp(size.height, target.height, eased)
        }
      })

      this.engine.graph.markDirty()
      await this.delay(frameDelay)
    }
  }

  /**
   * 线性插值
   */
  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t
  }

  /**
   * 缓动函数
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.timeoutId = window.setTimeout(() => {
        this.timeoutId = null
        resolve()
      }, ms)
    })
  }

  /**
   * 为 line 节点创建流畅的进度动画
   *
   * 该方法通过逐帧插值实现平滑的进度条动画效果，使用缓动函数使动画更自然。
   *
   * @param nodes 目标节点数组
   * @param progressPath 进度数据路径（如 'line.progress'）
   * @param startRatio 起始进度比例（0-1）
   * @param endRatio 结束进度比例（0-1）
   * @param duration 动画持续时间（毫秒），默认 2000ms
   *
   * @example
   * // 直接调用（内部使用）
   * await this.animateLineProgress(nodes, 'line.progress', 0, 1, 3000);
   *
   * @example
   * // 配合 customAction 使用
   * {
   *   description: '进度动画',
   *   customAction: async (engine) => {
   *     const nodes = engine.graph.getNodes().filter(n => n.id === 'track1');
   *     await testManager.animateLineProgress(nodes, 'line.progress', 0, 1, 2000);
   *   }
   * }
   */
  private async animateLineProgress(
    nodes: NodeData[],
    progressPath: string,
    startRatio: number,
    endRatio: number,
    duration: number = 2000
  ): Promise<void> {
    const frameCount = Math.ceil(duration / 16) // 60fps
    const frameDelay = duration / frameCount

    // 逐帧更新进度
    for (let frame = 0; frame <= frameCount; frame++) {
      const progress = frame / frameCount
      const eased = this.easeInOutCubic(progress)

      // 计算当前进度值
      const currentEndRatio = this.lerp(startRatio, endRatio, eased)

      // 更新所有节点的进度
      nodes.forEach((node) => {
        node.data = node.data || {}

        // 根据路径设置进度值
        if (progressPath.startsWith('data.')) {
          // 如果路径包含 'data.' 前缀，去掉它
          const actualPath = progressPath.substring(5)
          this.setValueByPath(node.data, actualPath, {
            enabled: true,
            startRatio: 0,
            endRatio: currentEndRatio
          })
        } else {
          // 直接使用路径
          this.setValueByPath(node.data, progressPath, {
            enabled: true,
            startRatio: 0,
            endRatio: currentEndRatio
          })
        }
      })

      this.engine.graph.markDirty()
      await this.delay(frameDelay)
    }
  }
}

// ==================== 预定义测试场景 ====================

/**
 * 基础样式变化测试
 */
export const basicStyleTest: TestScenario = {
  name: '基础样式测试',
  description: '测试填充色、描边色、线宽等基础样式的变化',
  steps: [
    {
      description: '初始状态 - 白色填充，黑色描边',
      targetId: '*',
      styleChanges: { fill: '#ffffff', stroke: '#000000', lineWidth: 2 },
      delay: 1000
    },
    {
      description: '变更填充色为蓝色',
      targetId: '*',
      styleChanges: { fill: '#3b82f6' },
      animated: true,
      duration: 500,
      delay: 1000
    },
    {
      description: '变更描边色为红色',
      targetId: '*',
      styleChanges: { stroke: '#ef4444' },
      delay: 1000
    },
    {
      description: '增加描边宽度',
      targetId: '*',
      styleChanges: { lineWidth: 4 },
      animated: true,
      duration: 500,
      delay: 1000
    },
    {
      description: '添加虚线效果',
      targetId: '*',
      styleChanges: { lineDash: [8, 4] },
      delay: 1000
    },
    {
      description: '变更填充色为绿色',
      targetId: '*',
      styleChanges: { fill: '#22c55e' },
      delay: 1000
    },
    {
      description: '设置半透明',
      targetId: '*',
      styleChanges: { alpha: 0.5 },
      animated: true,
      duration: 500,
      delay: 1000
    },
    {
      description: '恢复不透明',
      targetId: '*',
      styleChanges: { alpha: 1 },
      animated: true,
      duration: 500,
      delay: 1000
    }
  ],
  loop: true,
  loopDelay: 2000
}

/**
 * 尺寸和位置变化测试
 */
export const transformTest: TestScenario = {
  name: '变换测试',
  description: '测试节点的位置、尺寸变化',
  steps: [
    {
      description: '所有节点向右移动 50px',
      targetId: '*',
      positionChanges: { dx: 50 },
      animated: true,
      duration: 600,
      delay: 800
    },
    {
      description: '所有节点向下移动 50px',
      targetId: '*',
      positionChanges: { dy: 50 },
      animated: true,
      duration: 600,
      delay: 800
    },
    {
      description: '所有节点放大 1.5 倍',
      targetId: '*',
      sizeChanges: { dw: 30, dh: 20 },
      animated: true,
      duration: 600,
      delay: 800
    },
    {
      description: '所有节点恢复原位',
      targetId: '*',
      positionChanges: { dx: -50, dy: -50 },
      sizeChanges: { dw: -30, dh: -20 },
      animated: true,
      duration: 600,
      delay: 800
    }
  ],
  loop: true,
  loopDelay: 1500
}

/**
 * 彩虹色渐变测试
 */
export const rainbowTest: TestScenario = {
  name: '彩虹渐变测试',
  description: '循环显示彩虹色',
  steps: [
    { description: '红色', targetId: '*', styleChanges: { fill: '#ef4444' }, delay: 500 },
    { description: '橙色', targetId: '*', styleChanges: { fill: '#f97316' }, delay: 500 },
    { description: '黄色', targetId: '*', styleChanges: { fill: '#eab308' }, delay: 500 },
    { description: '绿色', targetId: '*', styleChanges: { fill: '#22c55e' }, delay: 500 },
    { description: '青色', targetId: '*', styleChanges: { fill: '#06b6d4' }, delay: 500 },
    { description: '蓝色', targetId: '*', styleChanges: { fill: '#3b82f6' }, delay: 500 },
    { description: '紫色', targetId: '*', styleChanges: { fill: '#a855f7' }, delay: 500 }
  ],
  loop: true,
  loopDelay: 500
}

/**
 * 混合效果测试
 */
export const complexTest: TestScenario = {
  name: '综合效果测试',
  description: '同时测试多种样式变化',
  steps: [
    {
      description: '初始化',
      targetId: '*',
      styleChanges: { fill: '#ffffff', stroke: '#000000', lineWidth: 2, alpha: 1 },
      delay: 500
    },
    {
      description: '蓝色主题 + 放大',
      targetId: '*',
      styleChanges: { fill: '#3b82f6', stroke: '#1e40af', lineWidth: 3 },
      sizeChanges: { dw: 20, dh: 15 },
      animated: true,
      duration: 800,
      delay: 1000
    },
    {
      description: '绿色主题 + 虚线 + 移动',
      targetId: '*',
      styleChanges: { fill: '#22c55e', stroke: '#16a34a', lineDash: [6, 3] },
      positionChanges: { dx: 30, dy: -20 },
      animated: true,
      duration: 800,
      delay: 1000
    },
    {
      description: '红色主题 + 半透明 + 缩小',
      targetId: '*',
      styleChanges: { fill: '#ef4444', stroke: '#dc2626', alpha: 0.6, lineDash: undefined },
      sizeChanges: { dw: -30, dh: -20 },
      animated: true,
      duration: 800,
      delay: 1000
    },
    {
      description: '恢复原状',
      targetId: '*',
      styleChanges: { fill: '#ffffff', stroke: '#000000', lineWidth: 2, alpha: 1 },
      positionChanges: { dx: -30, dy: 20 },
      sizeChanges: { dw: 10, dh: 5 },
      animated: true,
      duration: 800,
      delay: 1000
    }
  ],
  loop: true,
  loopDelay: 2000
}

/**
 * 高级匹配测试 - 演示新的节点匹配功能
 */
export const advancedMatchTest: TestScenario = {
  name: '自定义匹配测试（MDIAS）',
  description: '通过自定义数据路径进行匹配',
  steps: [
    {
      description: '初始化',
      targets: [
        {
          matcher: { type: 'custom', value: ['b1'], path: 'data.custom.code' },
          dataChanges: { 'style.fill': '#eb2f96' }
        },
        {
          matcher: { type: 'custom', value: ['b2'], path: 'data.custom.code' },
          dataChanges: { 'style.fill': '#ff4d4f' }
        },
        {
          // 按钮置绿
          matcher: {
            type: 'custom',
            value: [
              'b3',
              'b4',
              'b5',
              'S-0',
              'Xz-0',
              'Z1-LZA',
              '3BG',
              '4BG',
              '5BG',
              '6BG',
              '7BG',
              '8BG',
              '9BG',
              '10BG',
              '11BG',
              '12BG',
              '13BG',
              '14BG',
              '15BG',
              '16BG',
              '17BG',
              '18BG',
              'S1-0',
              'S3-0',
              'S4-0',
              'S5-0',
              'S6-0',
              'S7-0',
              'S8-0',
              'S9-0',
              'S10-0',
              'S11-0',
              'S12-0',
              'S13-0',
              'S14-0',
              'S15-0',
              'S16-0',
              'S17-0',
              'S18-0',
              'S19-0',
              'S20-0',
              'S21-0',
              '24G',
              'S24-0',
              'S25-0',
              'S26-0',
              'S27-0',
              'S28-0',
              'S29-0',
              'S30-0',
              'S31-0',
              'Szr-0',
              'Szc-0',
              'Szr1-0',
              'Szc1-0',
              'Xr-0',
              'Xc-0',
              'Z2-LZA',
              'Z3-LZA'
            ],
            path: 'data.custom.code'
          },
          dataChanges: { 'style.fill': '#52c41a' }
        },
        {
          // 按钮置红
          matcher: {
            type: 'custom',
            value: [
              'D3A',
              'D3B',
              'D4A',
              'D4B',
              'D5A',
              'D5B',
              'D6A',
              'D6B',
              'D7A',
              'D7B',
              'D8A',
              'D8B',
              'D9A',
              'D9B',
              'D10A',
              'D10B',
              'D11A',
              'D11B',
              'D12A',
              'D12B',
              'D13A',
              'D13B',
              'D14A',
              'D14B',
              'D15A',
              'D15B',
              'D16A',
              'D16B',
              'D17A',
              'D17B',
              'D18A',
              'D18B',
              'D22',
              'D24',
              'D26',
              'D28',
              '19G',
              '20G',
              '21G',
              '26G',
              '27G',
              '28G',
              '29G',
              '30G',
              '31G',
              '27G-1',
              '28G-1',
              '29G-1',
              '30G-1',
              '31G-1',
              'D12',
              'D30',
              'D32',
              'D36',
              'D38',
              'D44G',
              'D48',
              'D56-5',
              'D2-9',
              'Z1',
              'Xc-1',
              'Szr-1',
              'Szr1-1',
              'Szc1-1',
              'Szc1-1',
              'Xr-1',
              'S2802',
              'S2804',
              'S1-1',
              'S3-1',
              'S4-1',
              'S5-1',
              'S6-1',
              'S7-1',
              'S8-1',
              'S9-1',
              'S10-1',
              'S11-1',
              'S12-1',
              'S13-1',
              'S14-1',
              'S15-1',
              'S16-1',
              'S17-1',
              'S18-1',
              'S19-1',
              'S20-1',
              'S21-1',
              'S24-1',
              'S25-1',
              'S26-1'
            ],
            path: 'data.custom.code'
          },
          dataChanges: { 'style.fill': '#ED000B' }
        },
        {
          // 按钮置蓝色
          matcher: {
            type: 'custom',
            value: ['D2', 'D6', 'D8', 'D10', 'D14', 'D16', 'D34', 'D40', 'D42', 'D44', 'D46'],
            path: 'data.custom.code'
          },
          dataChanges: { 'style.fill': '#1677ff' }
        },
        {
          matcher: { type: 'custom', value: ['b6'], path: 'data.custom.code' },
          dataChanges: { 'style.fill': '#7DE340' }
        },
        {
          matcher: {
            type: 'custom',
            value: ['2G', 'D20', 'D18', 'D4', 'S-1', 'Xz-1', 'X2601'],
            path: 'data.custom.code'
          },
          dataChanges: { 'style.fill': '#ffffff' }
        },
        {
          matcher: { type: 'custom', value: ['l6', 'l9', 'l12'], path: 'data.custom.code' },
          dataChanges: { 'style.fill': '#ef4444' }
        },
        {
          matcher: {
            type: 'custom',
            value: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12', 'g13'],
            path: 'data.custom.code'
          },
          dataChanges: { 'style.stroke': '#47FF37' }
        },
        {
          matcher: { type: 'custom', value: ['d1-1', 'd2-1', 'd3-2', 'd4-1', 'd5-1'], path: 'data.custom.code' },
          dataChanges: { 'style.fill': '#47FF37' }
        },
        {
          matcher: { type: 'custom', value: ['1CG', '2G'], path: 'data.custom.code' },
          dataChanges: { 'style.fill': '#47FF37' }
        },
        {
          matcher: { type: 'custom', value: ['d1-2', 'd2-2', 'd3-1', 'd4-2', 'd5-2'], path: 'data.custom.code' },
          dataChanges: { 'style.fillAlpha': 0 }
        }
      ],
      animated: true,
      duration: 500,
      delay: 1000
    },
    {
      description: '进入G1进路',
      targetMatcher: { type: 'custom', value: ['g1'], path: 'data.custom.code' },
      dataChanges: {
        'style.stroke': '#ef4444',
        'style.label': {
          maxWidth: 60,
          color: '#fafafa',
          background: '#2EA603',
          backgroundStrokeWidth: 1,
          backgroundStroke: '#100f0f',
          position: 'top',
          fontSize: 18,
          fontWeight: 700
        },
        label: '8004'
      },
      animated: true,
      duration: 1000,
      delay: 0
    },
    {
      description: '进入G2进路（含进度动画）',
      targets: [
        {
          matcher: { type: 'custom', value: ['2G'], path: 'data.custom.code' },
          dataChanges: { 'style.fill': '#ef4444' }
        },
        {
          matcher: { type: 'custom', value: ['g1'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#2B7BFE',
            'style.label': {},
            label: ''
          }
        },
        {
          matcher: { type: 'custom', value: ['g2'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#ef4444',
            'style.label': {
              maxWidth: 60,
              color: '#fafafa',
              background: '#2EA603',
              backgroundStrokeWidth: 1,
              backgroundStroke: '#100f0f',
              position: 'top',
              fontSize: 18,
              fontWeight: 700
            },
            label: '8004',
            line: {
              progress: {
                enabled: true,
                startRatio: 0
              }
            }
          },
          customAction: AutoTestManager.createLineProgressAction(0, 1, 8000)
        }
      ],
      animated: true,
      duration: 0,
      delay: 0
      // startNextAfter: 3000  // 3秒后提前启动下一步骤（G3进路），实现重叠效果
    },
    {
      description: '进入G3进路',
      targets: [
        {
          matcher: { type: 'custom', value: ['2G'], path: 'data.custom.code' },
          dataChanges: { 'style.fill': '#1677ff' }
        },
        {
          matcher: { type: 'custom', value: ['D20'], path: 'data.custom.code' },
          dataChanges: { 'style.fill': '#ef4444' }
        },
        {
          matcher: { type: 'custom', value: ['g2'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#2B7BFE',
            'style.label': {},
            label: ''
          }
        },
        {
          matcher: { type: 'custom', value: ['g3'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#ef4444',
            'style.label': {
              maxWidth: 60,
              color: '#fafafa',
              background: '#2EA603',
              backgroundStrokeWidth: 1,
              backgroundStroke: '#100f0f',
              position: 'top',
              fontSize: 18,
              fontWeight: 700
            },
            label: '8004',
            line: {
              progress: {
                enabled: true,
                startRatio: 0
              }
            }
          },
          customAction: AutoTestManager.createLineProgressAction(0, 1, 2000)
        },
        {
          matcher: { type: 'custom', value: ['d1-1'], path: 'data.custom.code' },
          dataChanges: {
            'style.fill': '#7DE340'
          }
        }
      ],
      animated: true,
      duration: 0,
      delay: 0
    },
    {
      description: '进入G4进路',
      targets: [
        {
          matcher: { type: 'custom', value: ['g3'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#2B7BFE',
            'style.label': {},
            label: ''
          }
        },
        {
          matcher: { type: 'custom', value: ['g4'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#ef4444',
            'style.label': {
              maxWidth: 60,
              color: '#fafafa',
              background: '#2EA603',
              backgroundStrokeWidth: 1,
              backgroundStroke: '#100f0f',
              position: 'top',
              fontSize: 18,
              fontWeight: 700
            },
            label: '8004'
          }
        },
        {
          matcher: { type: 'custom', value: ['d1-1'], path: 'data.custom.code' },
          dataChanges: {
            'style.fill': '#ec0909'
          }
        },
        {
          matcher: { type: 'custom', value: ['d2-1'], path: 'data.custom.code' },
          dataChanges: {
            'style.fill': '#7DE340'
          }
        }
      ],
      animated: true,
      duration: 1000,
      delay: 500
    },
    {
      description: '进入G5进路',
      targets: [
        {
          matcher: { type: 'custom', value: ['D20'], path: 'data.custom.code' },
          dataChanges: { 'style.fill': '#1677ff' }
        },
        {
          matcher: { type: 'custom', value: ['g4'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#2B7BFE',
            'style.label': {},
            label: ''
          }
        },
        {
          matcher: { type: 'custom', value: ['g5'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#ef4444',
            'style.label': {
              maxWidth: 60,
              color: '#fafafa',
              background: '#2EA603',
              backgroundStrokeWidth: 1,
              backgroundStroke: '#100f0f',
              position: 'top',
              fontSize: 18,
              fontWeight: 700
            },
            label: '8004',
            line: {
              progress: {
                enabled: true,
                ratio: 0.3
              }
            }
          },
          customAction: AutoTestManager.createLineProgressAction(0, 1, 4000)
        },
        {
          matcher: { type: 'custom', value: ['d2-1'], path: 'data.custom.code' },
          dataChanges: {
            'style.fill': '#ec0909'
          }
        },
        {
          matcher: { type: 'custom', value: ['d3-2'], path: 'data.custom.code' },
          dataChanges: {
            'style.fill': '#7DE340'
          }
        }
      ],
      animated: true,
      duration: 0,
      delay: 500
    },
    {
      description: '进入G6进路',
      targets: [
        {
          matcher: { type: 'custom', value: ['g5'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#2B7BFE',
            'style.label': {},
            label: ''
          }
        },
        {
          matcher: { type: 'custom', value: ['g6'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#ef4444',
            'style.label': {
              maxWidth: 60,
              color: '#fafafa',
              background: '#2EA603',
              backgroundStrokeWidth: 1,
              backgroundStroke: '#100f0f',
              position: 'top',
              fontSize: 18,
              fontWeight: 700
            },
            label: '8004',
            line: {
              progress: {
                enabled: true,
                ratio: 0.3
              }
            }
          },
          customAction: AutoTestManager.createLineProgressAction(0, 1, 6000)
        },
        {
          matcher: { type: 'custom', value: ['d3-2'], path: 'data.custom.code' },
          dataChanges: {
            'style.fill': '#ec0909'
          }
        },
        {
          matcher: { type: 'custom', value: ['d4-1'], path: 'data.custom.code' },
          dataChanges: {
            'style.fill': '#7DE340'
          }
        }
      ],
      animated: true,
      duration: 0,
      delay: 500
    },
    {
      description: '进入G7进路',
      targets: [
        {
          matcher: { type: 'custom', value: ['g6'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#2B7BFE',
            'style.label': {},
            label: ''
          }
        },
        {
          matcher: { type: 'custom', value: ['g7'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#ef4444',
            'style.label': {
              maxWidth: 60,
              color: '#fafafa',
              background: '#2EA603',
              backgroundStrokeWidth: 1,
              backgroundStroke: '#100f0f',
              position: 'top',
              fontSize: 18,
              fontWeight: 700
            },
            label: '8004',
            line: {
              progress: {
                enabled: true,
                ratio: 0.3
              }
            }
          },
          customAction: AutoTestManager.createLineProgressAction(0, 1, 2000)
        },
        {
          matcher: { type: 'custom', value: ['d4-1'], path: 'data.custom.code' },
          dataChanges: {
            'style.fill': '#ec0909'
          }
        }
      ],
      animated: true,
      duration: 0,
      delay: 0
    },
    {
      description: '进入G8进路',
      targets: [
        {
          matcher: { type: 'custom', value: ['D18'], path: 'data.custom.code' },
          dataChanges: { 'style.fill': '#ef4444' }
        },
        {
          matcher: { type: 'custom', value: ['g7'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#2B7BFE',
            'style.label': {},
            label: ''
          }
        },
        {
          matcher: { type: 'custom', value: ['g8'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#ef4444',
            'style.label': {
              maxWidth: 60,
              color: '#fafafa',
              background: '#2EA603',
              backgroundStrokeWidth: 1,
              backgroundStroke: '#100f0f',
              position: 'top',
              fontSize: 18,
              fontWeight: 700
            },
            label: '8004',
            line: {
              progress: {
                enabled: true,
                ratio: 0.3
              }
            }
          },
          customAction: AutoTestManager.createLineProgressAction(0, 1, 6000)
        }
      ],
      animated: true,
      duration: 0,
      delay: 0
    },
    {
      description: '进入G9进路',
      targets: [
        {
          matcher: { type: 'custom', value: ['D18'], path: 'data.custom.code' },
          dataChanges: { 'style.fill': '#1677ff' }
        },
        {
          matcher: { type: 'custom', value: ['D4'], path: 'data.custom.code' },
          dataChanges: { 'style.fill': '#ef4444' }
        },
        {
          matcher: { type: 'custom', value: ['g8'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#2B7BFE',
            'style.label': {},
            label: ''
          }
        },
        {
          matcher: { type: 'custom', value: ['g9'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#ef4444',
            'style.label': {
              maxWidth: 60,
              color: '#fafafa',
              background: '#2EA603',
              backgroundStrokeWidth: 1,
              backgroundStroke: '#100f0f',
              position: 'top',
              fontSize: 18,
              fontWeight: 700
            },
            label: '8004',
            line: {
              progress: {
                enabled: true,
                ratio: 0.3
              }
            }
          },
          customAction: AutoTestManager.createLineProgressAction(0, 1, 2000)
        },
        {
          matcher: { type: 'custom', value: ['d5-1'], path: 'data.custom.code' },
          dataChanges: {
            'style.fill': '#7DE340'
          }
        }
      ],
      animated: true,
      duration: 0,
      delay: 0
    },
    {
      description: '进入G10进路',
      targets: [
        {
          matcher: { type: 'custom', value: ['D4'], path: 'data.custom.code' },
          dataChanges: { 'style.fill': '#1677ff' }
        },
        {
          matcher: { type: 'custom', value: ['g9'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#2B7BFE',
            'style.label': {},
            label: ''
          }
        },
        {
          matcher: { type: 'custom', value: ['g10'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#ef4444',
            'style.label': {
              maxWidth: 60,
              color: '#fafafa',
              background: '#2EA603',
              backgroundStrokeWidth: 1,
              backgroundStroke: '#100f0f',
              position: 'top',
              fontSize: 18,
              fontWeight: 700
            },
            label: '8004',
            line: {
              progress: {
                enabled: true,
                ratio: 0.3
              }
            }
          },
          customAction: AutoTestManager.createLineProgressAction(0, 1, 2000)
        },
        {
          matcher: { type: 'custom', value: ['d5-1'], path: 'data.custom.code' },
          dataChanges: {
            'style.fill': '#ec0909'
          }
        }
      ],
      animated: true,
      duration: 0,
      delay: 0
    },
    {
      description: '进入G11进路',
      targets: [
        {
          matcher: { type: 'custom', value: ['g10'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#2B7BFE',
            'style.label': {},
            label: ''
          }
        },
        {
          matcher: { type: 'custom', value: ['g11'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#ef4444',
            'style.label': {
              maxWidth: 60,
              color: '#fafafa',
              background: '#2EA603',
              backgroundStrokeWidth: 1,
              backgroundStroke: '#100f0f',
              position: 'top',
              fontSize: 18,
              fontWeight: 700
            },
            label: '8004',
            line: {
              progress: {
                enabled: true,
                ratio: 0.3
              }
            }
          },
          customAction: AutoTestManager.createLineProgressAction(0, 1, 2000)
        }
      ],
      animated: true,
      duration: 0,
      delay: 0
    },
    {
      description: '进入G12进路',
      targets: [
        {
          matcher: { type: 'custom', value: ['g11'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#2B7BFE',
            'style.label': {},
            label: ''
          }
        },
        {
          matcher: { type: 'custom', value: ['g12'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#ef4444',
            'style.label': {
              maxWidth: 60,
              color: '#fafafa',
              background: '#2EA603',
              backgroundStrokeWidth: 1,
              backgroundStroke: '#100f0f',
              position: 'top',
              fontSize: 18,
              fontWeight: 700
            },
            label: '8004',
            line: {
              progress: {
                enabled: true,
                ratio: 0.3
              }
            }
          },
          customAction: AutoTestManager.createLineProgressAction(0, 1, 2000)
        }
      ],
      animated: true,
      duration: 0,
      delay: 0
    },
    {
      description: '进入G13进路',
      targets: [
        {
          matcher: { type: 'custom', value: ['g12'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#2B7BFE',
            'style.label': {},
            label: ''
          }
        },
        {
          matcher: { type: 'custom', value: ['g13'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#ef4444',
            'style.label': {
              maxWidth: 60,
              color: '#fafafa',
              background: '#2EA603',
              backgroundStrokeWidth: 1,
              backgroundStroke: '#100f0f',
              position: 'top',
              fontSize: 18,
              fontWeight: 700
            },
            label: '8004',
            line: {
              progress: {
                enabled: true,
                ratio: 0.3
              }
            }
          },
          customAction: AutoTestManager.createLineProgressAction(0, 1, 2000)
        }
      ],
      animated: true,
      duration: 0,
      delay: 0
    },
    {
      description: '场段运行结束，已出场段',
      targets: [
        {
          matcher: { type: 'custom', value: ['g13'], path: 'data.custom.code' },
          dataChanges: {
            'style.stroke': '#2B7BFE',
            'style.label': {},
            label: ''
          }
        }
      ],
      animated: true,
      duration: 500,
      delay: 0
    }
  ],
  loop: true,
  loopDelay: 2000
}

/**
 * 预定义场景列表
 */
export const predefinedScenarios: TestScenario[] = [
  basicStyleTest,
  transformTest,
  rainbowTest,
  complexTest,
  advancedMatchTest
]
