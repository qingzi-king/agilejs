/*
 * @Description: 格式刷状态管理
 * @Author: qingzi.wang
 * @Date: 2025-12-02 10:00:00
 */
import { create } from 'zustand'

export interface FormatSource {
  type: 'node' | 'edge'
  style: Record<string, any>
}

interface FormatPainterState {
  isActive: boolean
  source: FormatSource | null

  // Actions
  activate: (source: FormatSource) => void
  deactivate: () => void
  toggle: (source: FormatSource | null) => void
}

const useFormatPainterStore = create<FormatPainterState>((set, get) => ({
  isActive: false,
  source: null,

  activate: (source) => set({ isActive: true, source }),
  deactivate: () => set({ isActive: false, source: null }),
  toggle: (source) => {
    const { isActive } = get()
    if (isActive) {
      set({ isActive: false, source: null })
    } else if (source) {
      set({ isActive: true, source })
    }
  }
}))

export default useFormatPainterStore
