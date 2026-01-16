/*
 * @Description:
 * @Author: qingzi.wang
 * @Date: 2025-10-17 13:50:40
 * @LastEditTime: 2026-01-16 09:45:01
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
  const { shapesPanelOpen, propertyPanelOpen, aiPanelOpen, toggleShapesPanel, togglePropertyPanel, toggleAIPanel } = useUIStore()
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
          <Tooltip content={`${aiPanelOpen ? '隐藏' : '显示'} AI 助手`} placement="bottom-end">
            <button
              className={`h-8 w-8 inline-flex items-center justify-center rounded border transition-colors cursor-pointer ${aiPanelOpen ? 'bg-linear-to-r from-purple-600 to-blue-600 text-white border-purple-600' : 'bg-white/70 dark:bg-gray-700/70 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              onClick={toggleAIPanel}
              aria-label="切换 AI 助手面板"
              type="button"
            >
              <svg viewBox="0 0 1056 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M321.728 363.936l0.192 2.048c2.336 25.28 38.688 26.752 43.072 1.76a63.04 63.04 0 0 1 56.256-51.872l2.016-0.192c25.28-2.368 26.752-38.72 1.76-43.072A63.04 63.04 0 0 1 373.12 216.32l-0.192-2.048c-2.368-25.28-38.72-26.72-43.072-1.728a63.04 63.04 0 0 1-56.256 51.84l-2.048 0.224c-25.28 2.336-26.72 38.688-1.728 43.04a63.04 63.04 0 0 1 51.872 56.256z m27.648-111.136c-9.536 15.2-23.168 27.488-39.36 35.392 0.032 0 0 0 0 0a96.384 96.384 0 0 0 39.36-35.392z m-22.176 49.12l0 0z m57.568-9.792z m-56.224-2.976c7.36-5.088 14.016-11.104 19.84-17.856 5.12 7.36 11.136 14.016 17.888 19.84-7.36 5.12-14.016 11.104-19.84 17.888a106.752 106.752 0 0 0-17.888-19.84zM649.664 571.04v170.176a24.864 24.864 0 1 0 49.728 0V341.984c0-27.2-22.048-49.28-49.248-49.28h-51.264a122.4 122.4 0 0 0-106.112 61.344L277.12 728.8a24.864 24.864 0 1 0 43.136 24.8l105.088-182.56h224.352z m-113.76-192.16a72.64 72.64 0 0 1 62.976-36.416h50.784v178.816h-195.744l81.984-142.4zM823.36 326.72a24.864 24.864 0 0 0-49.728 0v414.496a24.864 24.864 0 1 0 49.728 0V326.72z"></path></svg>
            </button>
          </Tooltip>
        </div>
      </div>
    </>
  )
}

export default GlobalToolbar
