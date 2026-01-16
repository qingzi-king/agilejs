/*
 * @Description: UI 界面状态管理（主题、面板显隐等）
 * @Author: qingzi.wang
 * @Date: 2025-11-29 10:05:00
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UIState {
  // 主题设置
  theme: 'light' | 'dark'
  // 面板显隐状态
  shapesPanelOpen: boolean
  propertyPanelOpen: boolean
  aiPanelOpen: boolean

  // Actions
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleShapesPanel: () => void
  setShapesPanelOpen: (open: boolean) => void
  togglePropertyPanel: () => void
  setPropertyPanelOpen: (open: boolean) => void
  toggleAIPanel: () => void
  setAIPanelOpen: (open: boolean) => void
}

const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      shapesPanelOpen: false,
      propertyPanelOpen: false,
      aiPanelOpen: false,

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light'
        })),
      setTheme: (theme) => set({ theme }),

      toggleShapesPanel: () =>
        set((state) => ({
          shapesPanelOpen: !state.shapesPanelOpen
        })),
      setShapesPanelOpen: (open) => set({ shapesPanelOpen: open }),

      togglePropertyPanel: () =>
        set((state) => ({
          propertyPanelOpen: !state.propertyPanelOpen
        })),
      setPropertyPanelOpen: (open) => set({ propertyPanelOpen: open }),

      toggleAIPanel: () =>
        set((state) => ({
          aiPanelOpen: !state.aiPanelOpen
        })),
      setAIPanelOpen: (open) => set({ aiPanelOpen: open })
    }),
    {
      name: 'agile-editor-ui-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // 只持久化主题设置，面板状态不持久化（避免刷新后自动展开）
      partialize: (state) => ({ theme: state.theme })
    }
  )
)

export default useUIStore
