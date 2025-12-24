/*
 * @Description: 通用提示组件（Tooltip）
 * @Author: qingzi.wang
 * @Date: 2025-10-12 00:12:55
 * @LastEditTime: 2025-12-02 15:46:00
 */
import React from 'react'
import { createPortal } from 'react-dom'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
  placement?: 'top' | 'bottom' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
  offset?: number
  maxWidth?: number
}

// 使用 Portal 渲染到 body，避免被父级 overflow 裁剪
const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  className,
  placement = 'bottom',
  offset = 8,
  maxWidth = 280
}) => {
  const [visible, setVisible] = React.useState(false)
  const wrapperRef = React.useRef<HTMLSpanElement | null>(null)
  const tipRef = React.useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = React.useState<{ left: number; top: number } | null>(null)

  const updatePosition = React.useCallback(() => {
    if (!wrapperRef.current || !tipRef.current) return
    const vw = window.innerWidth || 0
    const vh = window.innerHeight || 0
    const rect = wrapperRef.current.getBoundingClientRect()
    const tw = Math.min(tipRef.current.offsetWidth || 0, maxWidth)
    const th = tipRef.current.offsetHeight || 0

    let left = rect.left
    let top = rect.top
    switch (placement) {
      case 'top':
        left = rect.left + rect.width / 2 - tw / 2
        top = rect.top - th - offset
        break
      case 'top-start':
        left = rect.left
        top = rect.top - th - offset
        break
      case 'top-end':
        left = rect.right - tw
        top = rect.top - th - offset
        break
      case 'bottom-start':
        left = rect.left
        top = rect.bottom + offset
        break
      case 'bottom-end':
        left = rect.right - tw
        top = rect.bottom + offset
        break
      case 'bottom':
      default:
        left = rect.left + rect.width / 2 - tw / 2
        top = rect.bottom + offset
        break
    }
    // 视窗裁剪
    left = Math.max(8, Math.min(left, vw - tw - 8))
    top = Math.max(8, Math.min(top, vh - th - 8))
    setPos({ left, top })
  }, [placement, offset, maxWidth])

  React.useEffect(() => {
    if (!visible) return
    // 初次显示后，等待 tip 渲染完成再计算尺寸
    const id = requestAnimationFrame(updatePosition)
    const onResize = () => updatePosition()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', onResize)
    }
  }, [visible, updatePosition])

  return (
    <span
      ref={wrapperRef}
      className="inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onMouseDown={() => setVisible(false)}
      onDragStart={() => setVisible(false)}
    >
      {children}
      {visible &&
        createPortal(
          <div
            ref={tipRef}
            className={`fixed z-9999 pointer-events-none max-w-[18rem] px-2 py-1 text-[11px] leading-snug text-gray-700 bg-white border border-gray-200 rounded shadow-lg dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 ${className || ''}`}
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
            role="tooltip"
          >
            {content}
          </div>,
          document.body
        )}
    </span>
  )
}

export default Tooltip
