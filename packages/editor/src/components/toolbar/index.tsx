/*
 * @Description:
 * @Author: qingzi.wang
 * @Date: 2025-10-17 13:50:40
 * @LastEditTime: 2025-12-02 17:19:08
 */
import React from 'react'
import Tooltip from '@/components/common/Tooltip'
import UndoRedoAction from './UndoRedoAction'
import FitAllAction from './FitAllAction'
import NodeControlAction from './NodeControlAction'
import LayerArrangeAction from './LayerArrangeAction'
import HelpAction from './HelpAction'
import EditJsonAction from './EditJsonAction'
import DebugAction from './DebugAction'
import FormatPainterAction from './FormatPainterAction'
import ZoomAction from './ZoomAction'
import { useCanvasStore, useUIStore, useSelectionStore } from '@/store'

const GlobalToolbar: React.FC = () => {
  const engine = useCanvasStore((state) => state.engine)
  const { shapesPanelOpen, propertyPanelOpen, toggleShapesPanel, togglePropertyPanel } = useUIStore()
  const selectedNodeCount = useSelectionStore((state) => state.selectedNodeCount)

  return (
    <>
      <div className="w-full h-10 flex items-center overflow-x-auto overflow-y-hidden d-hide-scrollbar px-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 z-20">
        <span className="font-semibold text-base text-gray-800 dark:text-gray-100 mr-4 truncate max-w-[220px]">
          AgileJS Graph Editor
        </span>
        <div className="flex items-center gap-2">
          <UndoRedoAction engine={engine} />
          <FormatPainterAction />
          <FitAllAction engine={engine} />
          <NodeControlAction engine={engine} selectedNodeCount={selectedNodeCount} />
          <LayerArrangeAction engine={engine} selectedNodeCount={selectedNodeCount} />
          <EditJsonAction engine={engine} />
          <DebugAction engine={engine} />
          <HelpAction />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ZoomAction engine={engine} />
          <Tooltip content={`${shapesPanelOpen ? '隐藏' : '显示'}图形面板`} placement="bottom-end">
            <button
              className={`h-8 w-8 inline-flex items-center justify-center rounded border transition-colors cursor-pointer ${shapesPanelOpen ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 dark:bg-gray-700/70 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              onClick={toggleShapesPanel}
              aria-label="切换图形面板"
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <rect x="3" y="4" width="6" height="16" rx="2" fill="currentColor" opacity="0.2" />
                <line x1="9.8" y1="4" x2="9.8" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.7" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip content={`${propertyPanelOpen ? '隐藏' : '显示'}属性面板`} placement="bottom-end">
            <button
              className={`h-8 w-8 inline-flex items-center justify-center rounded border transition-colors cursor-pointer ${propertyPanelOpen ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 dark:bg-gray-700/70 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              onClick={togglePropertyPanel}
              aria-label="切换属性面板"
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <rect x="15" y="4" width="6" height="16" rx="2" fill="currentColor" opacity="0.2" />
                <line x1="14.2" y1="4" x2="14.2" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.7" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>
    </>
  )
}

export default GlobalToolbar
