/*
 * @Description: 消息提示组件-一次性挂载 + 提供全局 API + 兜底队列
 * @Author: qingzi.wang
 * @Date: 2025-10-28 15:44:17
 * @LastEditTime: 2025-10-28 15:56:07
 */
/*
 * 全局 Message 组件（Toast）
 * 用法：
 *   import message from '@/components/common/Message'
 *   message.success('保存成功')
 *   message.open({ type: 'info', content: 'hello', duration: 2000 })
 */
import React from 'react'
import { createRoot, Root } from 'react-dom/client'
import MessageHost, { type InternalMessage, type MessageHostApi } from './MessageHost'

export type MessageType = 'info' | 'success' | 'warning' | 'error' | 'loading'

export interface MessageOptions {
  content: React.ReactNode
  type?: MessageType
  duration?: number // ms, 默认 2000；loading 默认 0（不自动关闭）
  onClose?: () => void
}

let root: Root | null = null
let hostEl: HTMLDivElement | null = null
let addMessage: ((msg: InternalMessage) => void) | null = null
let removeMessage: ((id: number) => void) | null = null
let idSeed = 0
// 首次调用时宿主可能尚未 ready，先放入待发送队列，onReady 时统一刷新
const pendingQueue: InternalMessage[] = []
const pendingMap = new Map<number, InternalMessage>()

function ensureMounted() {
  if (root && hostEl) return
  hostEl = document.createElement('div')
  document.body.appendChild(hostEl)
  root = createRoot(hostEl)
  root.render(
    <MessageHost
      onReady={(api: MessageHostApi) => {
        addMessage = api.add
        removeMessage = api.remove
        // flush pending
        if (addMessage && pendingQueue.length) {
          pendingQueue.forEach((m) => addMessage!(m))
          pendingQueue.length = 0
          pendingMap.clear()
        }
      }}
    />
  )
}
function open(options: MessageOptions) {
  if (typeof window === 'undefined') return { close: () => {} }
  ensureMounted()
  const id = ++idSeed
  const type: MessageType = options.type || 'info'
  const duration = options.duration ?? (type === 'loading' ? 0 : 2000)
  const payload: InternalMessage = {
    id,
    type,
    content: options.content,
    duration,
    onClose: options.onClose || (() => {})
  }
  if (addMessage) {
    addMessage(payload)
  } else {
    // 宿主未就绪，先缓存
    pendingQueue.push(payload)
    pendingMap.set(id, payload)
  }
  return {
    close: () => {
      if (removeMessage) {
        removeMessage(id)
      } else if (pendingMap.has(id)) {
        // 尚未展示前被关闭
        const m = pendingMap.get(id)!
        const idx = pendingQueue.findIndex((i) => i.id === id)
        if (idx >= 0) pendingQueue.splice(idx, 1)
        pendingMap.delete(id)
        m.onClose?.()
      }
    }
  }
}

function factory(type: MessageType) {
  return (content: React.ReactNode, duration?: number, onClose?: () => void) =>
    open({ type, content, duration, onClose })
}

const api = {
  open,
  info: factory('info'),
  success: factory('success'),
  warning: factory('warning'),
  error: factory('error'),
  loading: factory('loading')
}

export default api
