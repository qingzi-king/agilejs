/*
 * @Description: 画布选中元素状态管理
 * @Author: qingzi.wang
 * @Date: 2025-11-29 10:10:00
 */
import { create } from 'zustand'

export type SelectionKind = 'none' | 'node-single' | 'node-multi' | 'edge-single' | 'edge-multi' | 'mixed' // 混合选择（节点+边）

interface SelectionState {
  // 选中的节点 ID 列表
  selectedNodeIds: string[]
  // 选中的边 ID 列表
  selectedEdgeIds: string[]
  // 选中类型（派生状态，方便 UI 判断）
  selectionKind: SelectionKind
  // 选中数量统计
  selectedNodeCount: number
  selectedEdgeCount: number

  // Actions
  // 更新选中状态
  updateSelection: (nodeIds: string[], edgeIds: string[]) => void
  // 清空选中
  clearSelection: () => void
}

// 辅助函数：计算选中类型
const deriveSelectionKind = (nodeCount: number, edgeCount: number): SelectionKind => {
  if (nodeCount === 0 && edgeCount === 0) return 'none'
  if (nodeCount > 0 && edgeCount > 0) return 'mixed'

  if (nodeCount > 0) {
    return nodeCount === 1 ? 'node-single' : 'node-multi'
  } else if (edgeCount > 0) {
    return edgeCount === 1 ? 'edge-single' : 'edge-multi'
  }

  return 'none'
}

const useSelectionStore = create<SelectionState>((set) => ({
  selectedNodeIds: [],
  selectedEdgeIds: [],
  selectionKind: 'none',
  selectedNodeCount: 0,
  selectedEdgeCount: 0,

  updateSelection: (nodeIds, edgeIds) => {
    const nodeCount = nodeIds.length
    const edgeCount = edgeIds.length
    const kind = deriveSelectionKind(nodeCount, edgeCount)

    set({
      selectedNodeIds: nodeIds,
      selectedEdgeIds: edgeIds,
      selectedNodeCount: nodeCount,
      selectedEdgeCount: edgeCount,
      selectionKind: kind
    })
  },

  clearSelection: () => {
    set({
      selectedNodeIds: [],
      selectedEdgeIds: [],
      selectedNodeCount: 0,
      selectedEdgeCount: 0,
      selectionKind: 'none'
    })
  }
}))

export default useSelectionStore
