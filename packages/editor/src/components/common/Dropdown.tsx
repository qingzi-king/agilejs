/*
 * @Description:
 * @Author: qingzi.wang
 * @Date: 2025-10-17 21:26:15
 * @LastEditTime: 2025-11-22 11:00:00
 */
import React from 'react'
import { createPortal } from 'react-dom'

const Dropdown: React.FC<{ trigger: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  trigger,
  children,
  className
}) => {
  const [open, setOpen] = React.useState(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const [ready, setReady] = React.useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // 计算弹出层位置
  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPosition({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2
    })
    setReady(true)
  }, [])

  // 打开时立即计算位置
  React.useEffect(() => {
    if (open) {
      setReady(false)
      updatePosition()
    }
  }, [open, updatePosition])

  // 监听滚动和窗口大小变化
  React.useEffect(() => {
    if (!open) return
    const handleUpdate = () => updatePosition()
    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)
    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [open, updatePosition])

  // 点击外部关闭
  React.useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [open])

  return (
    <div ref={triggerRef} className={className || ''}>
      <div onClick={() => setOpen((o) => !o)} className="cursor-pointer select-none">
        {trigger}
      </div>
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed min-w-[120px] bg-white dark:bg-gray-800 shadow-lg rounded py-1 z-1060 transition-opacity duration-150"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: 'translateX(-50%)',
              opacity: ready ? 1 : 0,
              pointerEvents: ready ? 'auto' : 'none'
            }}
          >
            {children}
          </div>,
          document.body
        )}
    </div>
  )
}

export default Dropdown
