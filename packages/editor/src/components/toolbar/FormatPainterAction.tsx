/*
 * @Description: 格式刷按钮
 * @Author: qingzi.wang
 * @Date: 2025-12-02 10:15:00
 */
import React from 'react'
import Tooltip from '@/components/common/Tooltip'
import { useCanvasStore, useSelectionStore, useFormatPainterStore } from '@/store'

const FormatPainterAction: React.FC = () => {
  const engine = useCanvasStore((state) => state.engine)
  const { selectedNodeIds, selectedEdgeIds } = useSelectionStore()
  const { isActive, toggle } = useFormatPainterStore()

  const handleClick = () => {
    if (!engine) return

    // 如果已经激活，点击则取消
    if (isActive) {
      toggle(null)
      return
    }

    // 如果未激活，尝试从选中项获取源样式
    let source: { type: 'node' | 'edge'; style: any } | null = null

    if (selectedNodeIds.length === 1 && selectedEdgeIds.length === 0) {
      const node = engine.graph.getNode(selectedNodeIds[0])
      if (node && node.data?.style) {
        source = { type: 'node', style: { ...node.data.style } }
      }
    } else if (selectedEdgeIds.length === 1 && selectedNodeIds.length === 0) {
      const edge = engine.graph.getEdge(selectedEdgeIds[0])
      if (edge && edge.data?.style) {
        source = { type: 'edge', style: { ...edge.data.style } }
      }
    }

    if (source) {
      toggle(source)
    }
  }

  // 按钮禁用状态：未激活且未选中单一元素时禁用
  const disabled =
    !isActive &&
    !(
      (selectedNodeIds.length === 1 && selectedEdgeIds.length === 0) ||
      (selectedEdgeIds.length === 1 && selectedNodeIds.length === 0)
    )

  return (
    <Tooltip content="格式刷 (选中元素后点击开启，再次点击关闭)" placement="bottom">
      <button
        className={`h-8 w-8 inline-flex items-center justify-center rounded transition-colors cursor-pointer 
          ${
            isActive
              ? 'bg-blue-600 text-white border-blue-600'
              : disabled
                ? 'opacity-50 border-gray-200 disabled:cursor-not-allowed dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 hover:bg-slate-200 dark:hover:bg-gray-700'
                : 'dark:text-gray-100 border-gray-300 dark:border-gray-600'
          }`}
        onClick={handleClick}
        disabled={disabled}
        aria-label="格式刷"
        type="button"
      >
        <svg className="w-5 h-5" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="currentColor"
            d="M960 262.4H642.56V110.08a36.266667 36.266667 0 0 0-36.266667-36.266667h-188.586666a36.266667 36.266667 0 0 0-36.266667 36.266667v152.32H64A36.48 36.48 0 0 0 27.733333 298.666667v188.586666A36.266667 36.266667 0 0 0 64 523.733333h34.56v390.186667a36.266667 36.266667 0 0 0 36.266667 36.266667h754.346666a36.266667 36.266667 0 0 0 36.266667-36.266667V523.733333H960a36.266667 36.266667 0 0 0 36.266667-36.266666V298.666667a36.48 36.48 0 0 0-36.266667-36.266667z m-106.666667 615.253333h-116.48v-106.666666a36.266667 36.266667 0 1 0-72.533333 0v106.666666H548.266667v-106.666666a36.266667 36.266667 0 1 0-72.533334 0v106.666666h-116.053333v-106.666666a36.266667 36.266667 0 1 0-72.533333 0v106.666666H170.666667v-352h682.666666zM100.266667 335.146667h317.44a36.266667 36.266667 0 0 0 36.266666-36.266667V146.346667h116.053334V298.666667a36.266667 36.266667 0 0 0 36.266666 36.266666H923.733333v116.053334H100.266667z"
          />
        </svg>
      </button>
    </Tooltip>
  )
}

export default FormatPainterAction
