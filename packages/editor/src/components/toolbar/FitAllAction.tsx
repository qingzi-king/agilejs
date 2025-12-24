/*
 * @Description: 适配全图
 * @Author: qingzi.wang
 * @Date: 2025-10-17 15:57:28
 * @LastEditTime: 2025-11-19 13:44:46
 */
import React from 'react'
import Tooltip from '@/components/common/Tooltip'
import fitAllSvg from '@/assets/images/fitall.svg'

import type { CanvasEngine } from '@agilejs/core'

interface FitAllActionProps {
  engine: CanvasEngine | null
}

const FitAllAction: React.FC<FitAllActionProps> = ({ engine }) => {
  const handleFitAll = () => {
    engine?.fitView({ padding: 20 })
  }
  return (
    <Tooltip content="适配全图">
      <div
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-gray-700 cursor-pointer transition"
        onClick={handleFitAll}
      >
        <img src={fitAllSvg} alt="适配全图" className="w-5 h-5 dark:invert" />
      </div>
    </Tooltip>
  )
}

export default FitAllAction
