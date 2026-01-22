/*
 * @Description: 调试工具
 * @Author: qingzi.wang
 * @Date: 2025-10-17 15:57:28
 * @LastEditTime: 2026-01-22 12:19:49
 */
import React from 'react'
import Tooltip from '@/components/common/Tooltip'
import Modal from '@/components/common/Modal'
import message from '@/components/common/Message'
import mod from 'stats.js'
import debugSvg from '@/assets/images/debug.svg'
import { toScene, fromScene } from '@fnt-agilejs/core'
import type { CanvasEngine } from '@fnt-agilejs/core'

interface IProps {
  engine: CanvasEngine | null
}

const DebugAction: React.FC<IProps> = ({ engine }) => {
  const [modalVisible, setModalVisible] = React.useState(false)
  const [fpsEnabled, setFpsEnabled] = React.useState(false)

  const statsRef = React.useRef<null | {
    dom: HTMLElement
    showPanel: (panel: number) => void
    update: () => void
  }>(null)
  const rafIdRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    let disposed = false

    const cleanup = () => {
      if (rafIdRef.current != null) {
        window.cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      const stats = statsRef.current
      if (stats?.dom?.parentNode) {
        stats.dom.parentNode.removeChild(stats.dom)
      }
      statsRef.current = null
    }

    const start = async () => {
      cleanup()
      if (disposed) return

      const StatsCtor = (mod as any).default ?? (mod as any)
      const stats = new StatsCtor()
      stats.showPanel(0)

      const dom = stats.dom as HTMLElement
      dom.style.position = 'fixed'
      dom.style.left = '5px'
      dom.style.top = '45px'
      dom.style.zIndex = '9999'
      dom.style.pointerEvents = 'none'
      document.body.appendChild(dom)

      statsRef.current = stats

      const tick = () => {
        if (disposed || !statsRef.current) return
        statsRef.current.update()
        rafIdRef.current = window.requestAnimationFrame(tick)
      }
      rafIdRef.current = window.requestAnimationFrame(tick)
    }

    if (fpsEnabled) start()
    else cleanup()

    return () => {
      disposed = true
      cleanup()
    }
  }, [fpsEnabled])

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
  // 获取可见边数据
  const handleGetVisibleEdges = () => {
    if (!engine) return
    const data = engine.getVisibleEdges();
    console.log('可视范围边数据:', data);
    message.success(`已打印到控制台，共涉及 ${data.length} 条边`)
  }
  // 获取可见节点数据
  const handleGetVisibleNodes = () => {
    if (!engine) return
    const data = engine.getVisibleNodes();
    console.log('可视范围节点数据:', data);
    message.success(`已打印到控制台，共涉及 ${data.length} 条节点`)
  }
  // 获取可视范围数据
  const handleGetViewRectWorld = () => {
    if (!engine) return
    const data = engine.getViewRectWorld();
    console.log('可视范围数据:', data);
    message.success(`已打印到控制台`)
  }
  // 获取性能数据
  const handleGetPerformanceStats = () => {
    if (!engine) return
    const data = engine.getPerformanceStats();
    console.log('性能数据:', data);
    message.success(`已打印到控制台`)
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
      <Modal visible={modalVisible} title={'辅助调试'} onClose={() => setModalVisible(false)} width={680}>
        <div className="space-y-4">
          {/* 性能监控 */}
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">性能监控</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFpsEnabled((v) => !v)}
                className={`px-3 py-1.5 text-sm rounded hover:cursor-pointer transition-colors ${
                  fpsEnabled
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-slate-700 text-white hover:bg-slate-800'
                }`}
              >
                FPS显示：{fpsEnabled ? '开' : '关'}
              </button>
              <button
                onClick={handleGetPerformanceStats}
                className="px-3 py-1.5 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600 hover:cursor-pointer transition-colors"
              >
                获取性能数据
              </button>
            </div>
          </div>

          {/* 可视范围查询 */}
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">可视范围查询</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleGetVisibleNodes}
                className="px-3 py-1.5 text-sm bg-cyan-500 text-white rounded hover:bg-cyan-600 hover:cursor-pointer transition-colors"
              >
                获取可视节点
              </button>
              <button
                onClick={handleGetVisibleEdges}
                className="px-3 py-1.5 text-sm bg-teal-500 text-white rounded hover:bg-teal-600 hover:cursor-pointer transition-colors"
              >
                获取可视边
              </button>
              <button
                onClick={handleGetViewRectWorld}
                className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 hover:cursor-pointer transition-colors"
              >
                获取视口范围
              </button>
            </div>
          </div>

          {/* 数据管理 */}
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">数据管理</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 hover:cursor-pointer transition-colors"
              >
                保存JSON
              </button>
              <button
                onClick={handleLoad}
                className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 hover:cursor-pointer transition-colors"
              >
                加载JSON
              </button>
            </div>
          </div>

          {/* 调试与测试 */}
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">调试与测试</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePrintHistory}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 hover:cursor-pointer transition-colors"
              >
                打印历史栈
              </button>
              <button
                onClick={handleNodeAnim}
                className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 hover:cursor-pointer transition-colors"
              >
                N1节点动画
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default DebugAction
