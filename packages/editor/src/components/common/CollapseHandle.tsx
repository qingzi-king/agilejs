/*
 * @Description: 通用折叠手柄组件
 * @Author: qingzi.wang
 * @Date: 2025-10-12 00:12:55
 * @LastEditTime: 2025-10-12 00:36:22
 */
import React from 'react'

interface CollapseHandleProps {
  open: boolean
  onToggle: () => void
  className?: string
  // 水平翻转（例如位于右侧时保持方向）；默认 true 保持与现实现状一致
  mirrored?: boolean
  // 持久化 id（用于生成稳定 gradient id）；不传则使用 React.useId()
  idSeed?: string
  // 基础颜色（不区分亮/暗模式），默认 #CCC
  color?: string
  // 顶部主形状不透明度（0-1）
  topOpacity?: number
  // “对折”镜像部分不透明度（0-1）
  bottomOpacity?: number
  // 是否显示高光渐变覆盖
  highlight?: boolean
  // 高光渐变各段不透明度
  highlightTopOpacity?: number
  highlightMidOpacity?: number
  highlightBottomOpacity?: number
}

const ChevronIcon: React.FC<{ open: boolean; className?: string }> = ({ open, className }) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: `rotate(${open ? 0 : 180}deg)`, transition: 'transform 240ms ease' }}
    aria-hidden="true"
    focusable="false"
  >
    <polyline points="8 4 16 12 8 20" />
  </svg>
)

export const CollapseHandle: React.FC<CollapseHandleProps> = ({
  open,
  onToggle,
  className = '',
  mirrored = true,
  idSeed,
  color = '#CCC',
  topOpacity = 1,
  bottomOpacity = 0.7,
  highlight = true,
  highlightTopOpacity = 0.5,
  highlightMidOpacity = 0.15,
  highlightBottomOpacity = 0
}) => {
  const reactId = React.useId()
  const baseId = idSeed || reactId
  const gradLight = `${baseId}-hl`
  const groupTransform = mirrored ? 'translate(16,0) scale(-1,1)' : undefined
  return (
    <button
      aria-label={open ? '折叠属性面板' : '展开属性面板'}
      onClick={onToggle}
      className={`relative w-4 h-[66px] flex items-center justify-center p-0 m-0 cursor-pointer select-none transition-transform duration-200 hover:scale-105 active:scale-100 ${className}`}
      style={{ pointerEvents: 'auto', position: 'absolute' }}
      type="button"
    >
      <svg aria-hidden="true" width="16" height="66" viewBox="0 0 16 66" className="absolute inset-0 drop-shadow-sm">
        {highlight && (
          <defs>
            <linearGradient id={gradLight} x1="0" y1="0" x2="0" y2="66">
              <stop offset="0%" stopColor={color} stopOpacity={highlightTopOpacity} />
              <stop offset="55%" stopColor={color} stopOpacity={highlightMidOpacity} />
              <stop offset="100%" stopColor={color} stopOpacity={highlightBottomOpacity} />
            </linearGradient>
          </defs>
        )}
        <g {...(groupTransform ? { transform: groupTransform } : {})}>
          <path
            d="M0,0 L14.1199958,8.82499735 C15.2895212,9.55595076 16,10.8378304 16,12.2169906 L16,53.7830094 C16,55.1621696 15.2895212,56.4440492 14.1199958,57.1750026 L0,66 L0,0 Z"
            fill={color}
            fillOpacity={topOpacity}
          />
          <path
            d="M0,0 L14.1199958,8.82499735 C15.2895212,9.55595076 16,10.8378304 16,12.2169906 L16,53.7830094 C16,55.1621696 15.2895212,56.4440492 14.1199958,57.1750026 L0,66 L0,0 Z"
            transform="translate(0,66) scale(1,-1)"
            fill={color}
            fillOpacity={bottomOpacity}
          />
          {highlight && (
            <path
              d="M0,0 L14.1199958,8.82499735 C15.2895212,9.55595076 16,10.8378304 16,12.2169906 L16,53.7830094 C16,55.1621696 15.2895212,56.4440492 14.1199958,57.1750026 L0,66 L0,0 Z"
              fill={`url(#${gradLight})`}
              className="pointer-events-none"
            />
          )}
          <path d="M0.6,4 L0.6,62" stroke={color} strokeOpacity={0.35} strokeWidth={1} strokeLinecap="round" />
        </g>
      </svg>
      <ChevronIcon open={open} className="relative z-10 text-gray-600 dark:text-gray-300" />
    </button>
  )
}

export default CollapseHandle
