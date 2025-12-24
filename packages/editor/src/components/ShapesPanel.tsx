/*
 * @Description: 图形面板
 * @Author: qingzi.wang
 * @Date: 2025-09-28 14:44:32
 * @LastEditTime: 2025-11-29 21:55:55
 */
import React, { useMemo, useState } from 'react'
import Tooltip from './common/Tooltip'
import { paletteGroups } from './dragShape'
import SvgXmlPreview from './common/SvgXmlPreview'
import { useUIStore } from '@/store'
import type { PaletteItem } from '@/types'

const DRAG_MIME = 'application/agile-shape'

function DraggableItem({ item }: { item: PaletteItem }) {
  return (
    <div
      draggable={!item.disabled}
      onDragStart={(e) => {
        const data = JSON.stringify({ shape: item.shape, key: item.key, payload: item.payload })
        try {
          e.dataTransfer.setData(DRAG_MIME, data)
        } catch {
          /* noop for unsupported mime */
        }
        try {
          e.dataTransfer.setData('text/plain', data)
        } catch {
          /* noop for restricted environments */
        }
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className={`w-10 h-10 flex items-center justify-center rounded cursor-${item.disabled ? 'not-allowed' : 'grab'} select-none border border-transparent hover:border-gray-300 dark:hover:border-gray-600 ${item.disabled ? 'opacity-50' : ''}`}
      title={item.disabled ? `${item.label}（即将支持）` : `${item.label}（拖拽到画布以创建）`}
    >
      <div className="w-8 h-8 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:cursor-move">
        {item.preview ||
          // 若为 svg 类且带 xml，自动用 xml 生成预览；否则使用字母后备
          (item.shape === 'svg' && (item as any).payload?.xml ? (
            <SvgXmlPreview xml={(item as any).payload.xml} viewBox={(item as any).payload.viewBox} />
          ) : (
            <div className="w-6 h-4 bg-white border border-black text-[12px] flex items-center justify-center text-black rounded">
              {item.label.charAt(0)}
            </div>
          ))}
      </div>
    </div>
  )
}

const ShapesPanel: React.FC = () => {
  const open = useUIStore((state) => state.shapesPanelOpen)
  const [search, setSearch] = useState<string>('')

  const panelWidth = 220 // w-48
  const handleWidth = 0 // 句柄独立于面板宽度
  const collapsedOffset = useMemo(() => panelWidth - handleWidth, [panelWidth, handleWidth])
  const wrapperStyle: React.CSSProperties = {
    width: panelWidth,
    // open=true 表示展开（可见），open=false 表示收起（隐藏到左侧）
    transform: open ? 'translateX(0)' : `translateX(-${collapsedOffset}px)`,
    transition: 'transform 240ms ease'
  }

  return (
    <div className="absolute top-0 left-0 h-full z-10 flex" style={{ pointerEvents: 'none' }}>
      <div className="relative h-full flex" style={wrapperStyle}>
        {/* 折叠句柄：在左侧面板的右边缘，不镜像 */}
        {/* 面板主体（flex 布局：头部固定，内容滚动） */}
        <div
          className="h-full w-68 bg-gray-100/90 dark:bg-gray-800/90 backdrop-blur-sm border-r border-gray-100 dark:border-gray-700 shadow-lg flex flex-col"
          style={{ pointerEvents: 'auto' }}
        >
          {/* 头部：搜索框（固定不随滚动） */}
          <div className="px-2 py-2 flex-none">
            <div className="mb-2">
              <input
                type="text"
                placeholder="请输入搜索内容"
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700/60 px-2 py-1 text-[12px] text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          {/* 内容：分组列表（独立滚动区域） */}
          <div className="px-2 pb-2 flex-1 overflow-auto">
            {paletteGroups.map((group) => {
              const items = group.items.filter((it) => it.label.toLowerCase().includes(search.trim().toLowerCase()))
              if (items.length === 0) return null
              return (
                <div key={group.key} className="mb-3">
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-500 mb-1">{group.title}</div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((it) => (
                      <div key={it.key} className="flex flex-col items-center">
                        <Tooltip
                          content={
                            <div className="w-full h-full p-2.5 box-border flex flex-col items-center justify-center overflow-hidden">
                              <div className="w-[120px] h-[70px] flex items-center justify-center overflow-hidden [&_svg]:w-full [&_svg]:h-full **:max-w-full **:max-h-full">
                                {/* 固定尺寸预览容器，内部 SVG 自适应，不再放大 */}
                                {it.preview ||
                                  (it.shape === 'svg' && (it as any).payload?.xml ? (
                                    <SvgXmlPreview
                                      xml={(it as any).payload.xml}
                                      viewBox={(it as any).payload.viewBox}
                                    />
                                  ) : (
                                    <div className="w-6 h-4 bg-white border border-black text-[12px] flex items-center justify-center text-black rounded">
                                      {it.label.charAt(0)}
                                    </div>
                                  ))}
                              </div>
                              <div className="mt-2 w-full text-center text-[12px] text-gray-800 truncate max-w-full">
                                {it.label}
                              </div>
                            </div>
                          }
                        >
                          <DraggableItem item={it} />
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShapesPanel
