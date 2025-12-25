/*
 * @Description: 缩放控制组件
 * @Author: qingzi.wang
 * @Date: 2025-11-13
 */
import React from 'react'
import Tooltip from '@/components/common/Tooltip'
import type { CanvasEngine } from '@fnt-agilejs/core'

interface ZoomActionProps {
  engine: CanvasEngine | null
}

const ZoomAction: React.FC<ZoomActionProps> = ({ engine }) => {
  const [zoomScale, setZoomScale] = React.useState(100)

  // 监听缩放变化
  React.useEffect(() => {
    if (!engine) {
      setZoomScale(100)
      return
    }

    const updateZoom = () => {
      const scale = engine.getScale()
      setZoomScale(Math.round(scale * 100))
    }

    updateZoom()

    // 监听 tick 事件来更新缩放（每帧都会触发）
    const off = engine.events.on('engine:tick', updateZoom)
    return () => {
      off?.()
    }
  }, [engine])

  // 缩放控制函数
  const handleZoomIn = () => {
    if (!engine) return
    const currentScale = engine.getScale()
    const newScale = Math.min(10, currentScale * 1.05)
    engine.setScale(newScale)
  }

  const handleZoomOut = () => {
    if (!engine) return
    const currentScale = engine.getScale()
    const newScale = Math.max(0.05, currentScale / 1.05)
    engine.setScale(newScale)
  }

  const handleZoomReset = () => {
    if (!engine) return
    engine.setScale(1)
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-white/70 dark:bg-gray-700/70 border border-gray-300 dark:border-gray-600 rounded">
      <Tooltip content="缩小" placement="bottom">
        <button
          className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleZoomOut}
          disabled={!engine || zoomScale <= 10}
          aria-label="缩小"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content="点击重置为 100%" placement="bottom">
        <button
          className="min-w-[50px] h-6 px-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors cursor-pointer"
          onClick={handleZoomReset}
          disabled={!engine}
          type="button"
        >
          {zoomScale}%
        </button>
      </Tooltip>
      <Tooltip content="放大" placement="bottom">
        <button
          className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleZoomIn}
          disabled={!engine || zoomScale >= 1000}
          aria-label="放大"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </Tooltip>
    </div>
  )
}

export default ZoomAction
