/*
 * @Description: Canvas 编辑器核心状态管理
 * @Author: qingzi.wang
 * @Date: 2025-04-27 13:40:11
 * @LastEditTime: 2025-11-29 10:00:00
 */
import { create } from 'zustand'
import type { CanvasEngine } from '@agilejs/core'

// 定义 Canvas 状态接口
interface CanvasState {
  // Canvas 引擎实例
  engine: CanvasEngine | null
  // 引擎是否已就绪
  isReady: boolean
  // 当前画布是否处于编辑状态（可扩展用于区分预览/编辑模式）
  isEditing: boolean

  // Actions
  setEngine: (engine: CanvasEngine | null) => void
  setIsEditing: (isEditing: boolean) => void
}

const useCanvasStore = create<CanvasState>((set) => ({
  // 初始状态
  engine: null,
  isReady: false,
  isEditing: true, // 默认为编辑模式

  // 状态更新函数
  setEngine: (engine) => set({ engine, isReady: !!engine }),
  setIsEditing: (isEditing) => set({ isEditing })
}))

export default useCanvasStore
