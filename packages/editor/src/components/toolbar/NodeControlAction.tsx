/*
 * @Description: 节点显隐控制
 * @Author: qingzi.wang
 * @Date: 2025-10-17 15:57:11
 * @LastEditTime: 2025-11-22 11:39:31
 */
import React from 'react'
import Tooltip from '@/components/common/Tooltip'
import Dropdown from '@/components/common/Dropdown'
import nodeControlSvg from '@/assets/images/node-control.svg'

import type { CanvasEngine } from '@agilejs/core'

interface NodeControlActionProps {
  engine: CanvasEngine | null
  selectedNodeCount: number
}

const NodeControlAction: React.FC<NodeControlActionProps> = ({ engine, selectedNodeCount }) => {
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
  const handleHideSelected = () => {
    if (!engine) return
    const nodes = engine.graph.getNodes().filter((n) => n.selected)
    nodes.forEach((n) => {
      n.visible = false
    })
    engine.graph.markDirty()
  }
  const handleShowSelected = () => {
    if (!engine) return
    const nodes = engine.graph.getNodes().filter((n) => n.selected)
    nodes.forEach((n) => {
      n.visible = true
    })
    engine.graph.markDirty()
  }
  const handleShowAll = () => {
    if (!engine) return
    engine.graph.getNodes().forEach((n) => {
      n.visible = true
    })
    engine.graph.markDirty()
  }
  return (
    <Dropdown
      trigger={
        <Tooltip content="节点隐藏与显示控制">
          <div
            onClick={() => setOpen((o) => !o)}
            className="w-10 h-8 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-gray-600 dark:text-gray-400 transition cursor-pointer select-none"
            tabIndex={0}
            title="节点隐藏与显示控制"
          >
            <img src={nodeControlSvg} alt="节点控制" className="w-5 h-5 inline-block align-middle dark:invert" />
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
        className={`block w-full text-left px-4 py-1 text-sm hover:bg-slate-100 dark:hover:bg-gray-600 dark:text-gray-200 cursor-pointer ${selectedNodeCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={selectedNodeCount > 0 ? handleHideSelected : undefined}
      >
        隐藏选中节点
      </button>
      <button
        className={`block w-full text-left px-4 py-1 text-sm hover:bg-slate-100 dark:hover:bg-gray-600 dark:text-gray-200 cursor-pointer ${selectedNodeCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={selectedNodeCount > 0 ? handleShowSelected : undefined}
      >
        显示选中节点
      </button>
      <button
        className="block w-full text-left px-4 py-1 text-sm hover:bg-slate-100 dark:hover:bg-gray-600 dark:text-gray-200 cursor-pointer"
        onClick={handleShowAll}
      >
        显示全部节点
      </button>
    </Dropdown>
  )
}

export default NodeControlAction
