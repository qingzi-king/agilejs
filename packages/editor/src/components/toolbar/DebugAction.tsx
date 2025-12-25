/*
 * @Description: 调试工具
 * @Author: qingzi.wang
 * @Date: 2025-10-17 15:57:28
 * @LastEditTime: 2025-11-22 11:24:21
 */
import React from 'react'
import Tooltip from '@/components/common/Tooltip'
import Modal from '@/components/common/Modal'
import message from '@/components/common/Message'
import debugSvg from '@/assets/images/debug.svg'
import { toScene, fromScene } from '@fnt-agilejs/core'
import type { CanvasEngine } from '@fnt-agilejs/core'

interface IProps {
  engine: CanvasEngine | null
}

const DebugAction: React.FC<IProps> = ({ engine }) => {
  const [modalVisible, setModalVisible] = React.useState(false)
  // 撤消 / 重做
  const handlePrintHistory = () => {
    if (!engine) return
    // 打印历史堆栈（包含合并/事务等信息）
    const historyData = engine.getHistoryData()
    console.log('History Records：', historyData)
    message.info('历史记录已打印到控制台')
  }
  // 节点动画示例
  const handleNodeAnim = () => {
    if (!engine) return
    const n1 = engine.graph.getNode('n1')
    if (n1) {
      n1.data = {
        ...(n1.data || {}),
        motion: [
          {
            type: 'move',
            to: { x: n1.position.x + 160, y: n1.position.y - 40 },
            duration: 600,
            easing: 'easeInOutQuad'
          },
          {
            type: 'resize',
            to: { width: n1.size.width + 40, height: n1.size.height + 20 },
            duration: 600
          },
          { type: 'z', to: 1000 }
        ]
      } as any
      ;(n1 as any).data.style = { ...((n1 as any).data.style || {}), fill: '#ef4444' }
    }
    message.success('已触发 N1 节点动画')
  }
  // 保存当前图数据为 JSON（打印到控制台 & 存 localStorage）
  const handleSave = () => {
    if (!engine) return
    const data = toScene(engine)
    // const data = toJSON(engine.graph);
    localStorage.setItem('graphData', JSON.stringify(data, null, 2))
    console.log('Graph JSON', data)
    message.success('已保存到本地（localStorage）')
  }
  // 加载示例数据（从 localStorage）
  const handleLoad = () => {
    if (!engine) return
    try {
      const data = localStorage.getItem('graphData')
      const parsed = JSON.parse(data || '{}')
      fromScene(engine, parsed)
      message.success('已从本地加载 JSON')
    } catch (error) {
      console.error('JSON 解析失败', error)
      message.error('JSON 解析失败，请检查数据')
    }
  }
  return (
    <>
      <Tooltip content="辅助调试">
        <div
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-gray-700 cursor-pointer transition"
          onClick={() => setModalVisible(true)}
        >
          <img src={debugSvg} alt="辅助" className="w-5 h-5 dark:invert" />
        </div>
      </Tooltip>
      <Modal visible={modalVisible} title={'辅助调试'} onClose={() => setModalVisible(false)} width={640}>
        <div className="bottom-2.5 left-2.5 z-5 flex flex-wrap gap-2">
          <button
            onClick={handlePrintHistory}
            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 hover:cursor-pointer transition-colors"
          >
            打印历史
          </button>
          <button
            onClick={handleNodeAnim}
            className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 hover:cursor-pointer transition-colors"
          >
            N1节点动画(移动+缩放+层级)
          </button>
          <button
            onClick={handleLoad}
            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 hover:cursor-pointer transition-colors"
          >
            加载JSON(示例重置)
          </button>
          <button
            onClick={handleSave}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 hover:cursor-pointer transition-colors"
          >
            保存JSON
          </button>
        </div>
      </Modal>
    </>
  )
}

export default DebugAction
