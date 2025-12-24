/*
 * @Description: 撤销重做
 * @Author: qingzi.wang
 * @Date: 2025-10-17 15:56:57
 * @LastEditTime: 2025-12-02 17:20:55
 */
import React from 'react'
import Tooltip from '@/components/common/Tooltip'
import undoSvg from '@/assets/images/undo.svg'
import redoSvg from '@/assets/images/redo.svg'

import type { CanvasEngine } from '@agilejs/core'

interface UndoRedoActionProps {
  engine: CanvasEngine | null
}

const UndoRedoAction: React.FC<UndoRedoActionProps> = ({ engine }) => {
  const [canUndo, setCanUndo] = React.useState(false)
  const [canRedo, setCanRedo] = React.useState(false)

  React.useEffect(() => {
    if (!engine) {
      setCanUndo(false)
      setCanRedo(false)
      return
    }
    setCanUndo(engine.history.canUndo())
    setCanRedo(engine.history.canRedo())
    const off = engine.history.onChange(() => {
      setCanUndo(engine.history.canUndo())
      setCanRedo(engine.history.canRedo())
    })
    return () => {
      off?.()
    }
  }, [engine])

  const handleUndo = () => {
    engine?.history.undo()
  }
  const handleRedo = () => {
    engine?.history.redo()
  }

  return (
    <div className="flex items-center gap-2">
      <Tooltip content="撤消 (Cmd/Ctrl+Z)">
        <button
          className={`w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-gray-700 cursor-pointer transition ${!canUndo ? 'opacity-50 disabled:cursor-not-allowed' : ''}`}
          onClick={canUndo ? handleUndo : undefined}
          disabled={!canUndo}
        >
          <img src={undoSvg} alt="撤消" className="w-5 h-5 dark:invert" />
        </button>
      </Tooltip>
      <Tooltip content="重做 (Shift+Cmd/Ctrl+Z)">
        <button
          className={`w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-gray-700 cursor-pointer transition ${!canRedo ? 'opacity-50 disabled:cursor-not-allowed' : ''}`}
          onClick={canRedo ? handleRedo : undefined}
          disabled={!canRedo}
        >
          <img src={redoSvg} alt="重做" className="w-5 h-5 dark:invert" />
        </button>
      </Tooltip>
    </div>
  )
}

export default UndoRedoAction
