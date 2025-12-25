/*
 * @Description: 图层排列
 * @Author: qingzi.wang
 * @Date: 2025-10-17 15:57:21
 * @LastEditTime: 2025-11-22 11:38:35
 */
import React from 'react'
import type { CanvasEngine } from '@fnt-agilejs/core'
import {
  bringNodesToFront,
  sendNodesToBack,
  moveNodesUp,
  moveNodesDown
} from '@fnt-agilejs/core/src/commands/GraphCommands'
import Tooltip from '@/components/common/Tooltip'
import Dropdown from '@/components/common/Dropdown'
import layerArrangeSvg from '@/assets/images/layer-arrange.svg'

interface LayerArrangeActionProps {
  engine: CanvasEngine | null
  selectedNodeCount: number
}

const LayerArrangeAction: React.FC<LayerArrangeActionProps> = ({ engine, selectedNodeCount }) => {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])
  const getSelectedIds = () =>
    engine
      ? engine.graph
          .getNodes()
          .filter((n) => n.selected)
          .map((n) => n.id)
      : []

  const handleBringToFront = () => {
    if (!engine) return
    const ids = getSelectedIds()
    if (!ids.length) return
    bringNodesToFront(engine.graph, ids, (engine as any).history)
  }
  const handleSendToBack = () => {
    if (!engine) return
    const ids = getSelectedIds()
    if (!ids.length) return
    sendNodesToBack(engine.graph, ids, (engine as any).history)
  }
  const handleBringForward = () => {
    if (!engine) return
    const ids = getSelectedIds()
    if (!ids.length) return
    moveNodesUp(engine.graph, ids, (engine as any).history)
  }
  const handleSendBackward = () => {
    if (!engine) return
    const ids = getSelectedIds()
    if (!ids.length) return
    moveNodesDown(engine.graph, ids, (engine as any).history)
  }

  return (
    <Dropdown
      trigger={
        <Tooltip content="图层排列">
          <div
            className="w-10 h-8 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-gray-600 dark:text-gray-400 transition cursor-pointer select-none"
            tabIndex={0}
            title="图层排列"
          >
            <img src={layerArrangeSvg} alt="图层排列" className="w-5 h-5 inline-block align-middle dark:invert" />
            <svg
              className="inline-block align-middle ml-1"
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
            >
              <polygon points="2,4 8,4 5,8" />
            </svg>
          </div>
        </Tooltip>
      }
    >
      <button
        className={`block w-full text-left px-4 py-1 text-sm hover:bg-slate-100 dark:hover:bg-gray-600 dark:text-gray-200 cursor-pointer${selectedNodeCount === 0 ? ' opacity-50 cursor-not-allowed' : ''}`}
        disabled={selectedNodeCount === 0}
        onClick={selectedNodeCount > 0 ? handleBringToFront : undefined}
      >
        置于顶层
      </button>
      <button
        className={`block w-full text-left px-4 py-1 text-sm hover:bg-slate-100 dark:hover:bg-gray-600 dark:text-gray-200 cursor-pointer${selectedNodeCount === 0 ? ' opacity-50 cursor-not-allowed' : ''}`}
        disabled={selectedNodeCount === 0}
        onClick={selectedNodeCount > 0 ? handleSendToBack : undefined}
      >
        置于底层
      </button>
      <button
        className={`block w-full text-left px-4 py-1 text-sm hover:bg-slate-100 dark:hover:bg-gray-600 dark:text-gray-200 cursor-pointer${selectedNodeCount === 0 ? ' opacity-50 cursor-not-allowed' : ''}`}
        disabled={selectedNodeCount === 0}
        onClick={selectedNodeCount > 0 ? handleBringForward : undefined}
      >
        上移一层
      </button>
      <button
        className={`block w-full text-left px-4 py-1 text-sm hover:bg-slate-100 dark:hover:bg-gray-600 dark:text-gray-200 cursor-pointer${selectedNodeCount === 0 ? ' opacity-50 cursor-not-allowed' : ''}`}
        disabled={selectedNodeCount === 0}
        onClick={selectedNodeCount > 0 ? handleSendBackward : undefined}
      >
        下移一层
      </button>
    </Dropdown>
  )
}

export default LayerArrangeAction
