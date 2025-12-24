import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { NodeData, PortData, AnchorPosition } from '@agilejs/core'

interface PortsEditorProps {
  node: NodeData | null
}

export interface PortsEditorRef {
  getPorts: () => PortData[]
  getShowPorts: () => boolean
}

const ANCHOR_POSITIONS: { value: AnchorPosition; label: string }[] = [
  { value: 'top', label: 'Top - 上边中心' },
  { value: 'right', label: 'Right - 右边中心' },
  { value: 'bottom', label: 'Bottom - 下边中心' },
  { value: 'left', label: 'Left - 左边中心' },
  { value: 'top-left', label: 'TL - 左上角' },
  { value: 'top-right', label: 'TR - 右上角' },
  { value: 'bottom-right', label: 'BR - 右下角' },
  { value: 'bottom-left', label: 'BL - 左下角' },
  { value: 'right-top', label: 'RT - 右边上侧(1/4)' },
  { value: 'right-bottom', label: 'RB - 右边下侧(3/4)' },
  { value: 'left-bottom', label: 'LB - 左边下侧(3/4)' },
  { value: 'left-top', label: 'LT - 左边上侧(1/4)' },
  { value: 'center', label: 'Center - 中心点（缺省值）' }
]

const PortsEditor = forwardRef<PortsEditorRef, PortsEditorProps>(({ node }, ref) => {
  const [ports, setPorts] = useState<any[]>([])
  const [showPorts, setShowPorts] = useState(true)
  const defaultAnchorPosition = 'top' // 默认锚点位置

  useImperativeHandle(ref, () => ({
    getPorts: () =>
      ports.map(
        (p) =>
          ({
            id: p.id,
            offset: {
              x: Number(p.offset?.x || 0),
              y: Number(p.offset?.y || 0)
            },
            anchorMode: p.anchorMode ?? 'absolute',
            anchorPosition: p.anchorMode === 'relative' ? (p.anchorPosition ?? 'top') : p.anchorPosition,
            radius: p.radius,
            label: p.label
          }) as PortData
      ),
    getShowPorts: () => showPorts
  }))

  useEffect(() => {
    if (node) {
      setPorts(node.ports ? [...node.ports] : [])
      setShowPorts(node.data?.showPorts !== false)
    }
  }, [node])

  const addPort = () => {
    const newId = `p-${Date.now()}`
    const newPort: PortData = {
      id: newId,
      anchorMode: 'relative',
      anchorPosition: defaultAnchorPosition,
      offset: { x: 0, y: 0 }
    }
    setPorts([...ports, newPort])
  }

  const removePort = (index: number) => {
    const updated = ports.filter((_, i) => i !== index)
    setPorts(updated)
  }

  const updatePort = (index: number, updates: any) => {
    const updated = [...ports]
    const current = updated[index]
    if (current) {
      const next = { ...current, ...updates }
      // 如果用户将模式切换为 relative，但未指定 anchorPosition，则设置默认值
      if (updates.anchorMode === 'relative' && (next.anchorPosition === undefined || next.anchorPosition === null)) {
        next.anchorPosition = defaultAnchorPosition
      }
      // 保证 offset 存在（当切换到 absolute 时）
      if (updates.anchorMode === 'absolute' && !next.offset) {
        next.offset = { x: 0, y: 0 }
      }
      updated[index] = next
    }
    setPorts(updated)
  }

  if (!node) return null

  return (
    <div className="space-y-3">
      {/* 显示开关 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={showPorts}
          onChange={(e) => setShowPorts(e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
        />
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">是否显示锚点</label>
      </div>
      {/* 锚点列表 */}
      <div className="space-y-2">
        {ports.map((port, index) => {
          const anchorMode = port.anchorMode || 'absolute' // 默认值
          return (
            <div key={port.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">锚点 {index + 1}</span>
                <button
                  onClick={() => removePort(index)}
                  className="w-5 h-5 text-xs text-red-600 hover:text-red-700 hover:bg-gray-100 dark:text-red-400 rounded-full cursor-pointer"
                >
                  &times;
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* ID */}
                <div className="flex items-center gap-1">
                  <label className="w-15 text-right text-xs text-gray-600 dark:text-gray-400 shrink-0">ID</label>
                  <input
                    type="text"
                    value={port.id}
                    onChange={(e) => updatePort(index, { id: e.target.value })}
                    className="flex-1 min-w-0 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                {/* 锚点模式 */}
                <div className="flex items-center gap-1">
                  <label className="w-15 text-right text-xs text-gray-600 dark:text-gray-400 shrink-0">锚点模式</label>
                  <select
                    value={anchorMode}
                    onChange={(e) => updatePort(index, { anchorMode: e.target.value as 'relative' | 'absolute' })}
                    className="flex-1 min-w-0 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer"
                  >
                    <option value="relative">相对位置</option>
                    <option value="absolute">绝对偏移</option>
                  </select>
                </div>
                {/* 相对位置选择 */}
                {anchorMode === 'relative' && (
                  <div className="flex items-center gap-1">
                    <label className="w-15 text-right text-xs text-gray-600 dark:text-gray-400 shrink-0">
                      锚点位置
                    </label>
                    <select
                      value={port.anchorPosition || defaultAnchorPosition}
                      onChange={(e) => updatePort(index, { anchorPosition: e.target.value as AnchorPosition })}
                      className="flex-1 min-w-0 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer"
                    >
                      {ANCHOR_POSITIONS.map((pos) => (
                        <option key={pos.value} value={pos.value}>
                          {pos.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {/* 绝对偏移（仅当模式为 absolute 时显示）- 两列横向布局 */}
                {anchorMode === 'absolute' && (
                  <>
                    <div className="flex items-center gap-1">
                      <label className="w-15 text-right text-xs text-gray-600 dark:text-gray-400 shrink-0">
                        水平偏移
                      </label>
                      <input
                        type="number"
                        value={port.offset.x}
                        onChange={(e) => updatePort(index, { offset: { ...port.offset, x: e.target.value } })}
                        className="flex-1 min-w-0 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="w-15 text-right text-xs text-gray-600 dark:text-gray-400 shrink-0">
                        垂直偏移
                      </label>
                      <input
                        type="number"
                        value={port.offset.y}
                        onChange={(e) => updatePort(index, { offset: { ...port.offset, y: e.target.value } })}
                        className="flex-1 min-w-0 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {/* 添加按钮 */}
      <button
        onClick={addPort}
        className="w-full py-1 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
      >
        + 添加锚点
      </button>
    </div>
  )
})

PortsEditor.displayName = 'PortsEditor'

export default PortsEditor
