/*
 * @Description: 消息提示组件-渲染宿主/队列管理器，显示和生命周期管理
 * @Author: qingzi.wang
 * @Date: 2025-10-28 15:44:17
 * @LastEditTime: 2025-10-28 15:57:48
 */
import React from 'react'

export type MessageType = 'info' | 'success' | 'warning' | 'error' | 'loading'

export interface InternalMessage {
  id: number
  type: MessageType
  content: React.ReactNode
  duration: number
  onClose: () => void
}

export interface MessageHostApi {
  add: (msg: InternalMessage) => void
  remove: (id: number) => void
}

const typeStyles: Record<MessageType, string> = {
  info: 'bg-blue-800/95 text-white',
  success: 'bg-green-600/95 text-white',
  warning: 'bg-amber-500/95 text-white',
  error: 'bg-red-600/95 text-white',
  loading: 'bg-slate-700/95 text-white'
}

const typeIcon: Record<MessageType, React.ReactNode> = {
  info: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  loading: <span className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
}

const MessageHost: React.FC<{ onReady: (api: MessageHostApi) => void }> = ({ onReady }) => {
  const [list, setList] = React.useState<InternalMessage[]>([])
  const timers = React.useRef(new Map<number, number>())

  const remove = React.useCallback(
    (id: number) => {
      const m = list.find((i) => i.id === id)
      setList((prev) => prev.filter((i) => i.id !== id))
      const t = timers.current.get(id)
      if (t) {
        window.clearTimeout(t)
        timers.current.delete(id)
      }
      // 确保 onClose 只调用一次
      if (m) m.onClose?.()
    },
    [list]
  )

  const add = React.useCallback(
    (msg: InternalMessage) => {
      setList((prev) => [...prev, msg])
      if (msg.duration > 0) {
        const t = window.setTimeout(() => remove(msg.id), msg.duration)
        timers.current.set(msg.id, t)
      }
    },
    [remove]
  )

  React.useEffect(() => {
    onReady({ add, remove })
    return () => {
      onReady({ add: () => {}, remove: () => {} })
    }
  }, [onReady, add, remove])

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] space-y-2 pointer-events-none">
      {list.map((m) => (
        <div
          key={m.id}
          className={`px-3 py-2 rounded shadow-md backdrop-blur-sm flex items-center gap-2 min-w-[160px] justify-center pointer-events-auto transition-all ${typeStyles[m.type]}`}
          role="status"
        >
          <span className="shrink-0">{typeIcon[m.type]}</span>
          <div className="text-sm">{m.content}</div>
          <button className="ml-2 text-white/70 hover:text-white" onClick={() => remove(m.id)} aria-label="关闭">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

export default MessageHost
