import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useAIStore, useCanvasStore } from '@/store'
import { callAIServiceStream } from './AIStream'
import { MessageBubble } from './MessageBubble'

export const ChatTab: React.FC = () => {
  const { 
    config, messages, isGenerating, sessions, currentSessionId,
    addMessage, updateMessage, clearMessages, setIsGenerating,
    newSession, saveCurrentSession, loadSession, deleteSession
  } = useAIStore()
  const engine = useCanvasStore((state) => state.engine)
  const [input, setInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // 自适应 textarea 高度（最多3行）
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const lineHeight = 20 // 约等于 text-sm 的行高
      const maxHeight = lineHeight * 3 + 16 // 3行 + padding
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
    }
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  // 获取画布上下文
  const getCanvasContext = useCallback(() => {
    if (!engine) return ''
    
    const nodes = engine.graph.getNodes()
    const edges = engine.graph.getEdges()
    
    return `当前画布包含 ${nodes.length} 个节点和 ${edges.length} 条边。`
  }, [engine])

  // 发送消息（流式）
  const handleSend = useCallback(async () => {
    if (!input.trim() || isGenerating) return

    const userMessage = input.trim()
    setInput('')
    
    // 先获取当前消息历史（不包含即将添加的消息）
    const currentMessages = useAIStore.getState().messages
    const chatHistory = currentMessages
      .filter((m: any) => !m.loading && !m.error && m.status !== 'pending' && m.status !== 'error')
      .map((m: any) => ({ role: m.role, content: m.content }))
    
    // 添加用户消息
    addMessage({ role: 'user', content: userMessage })
    
    // 添加助手消息（初始状态：等待中）
    addMessage({ role: 'assistant', content: '', status: 'pending' })
    setIsGenerating(true)

    // 获取刚添加的助手消息ID
    const assistantMessages = useAIStore.getState().messages
    const assistantMsgId = assistantMessages[assistantMessages.length - 1]?.id

    try {
      // 构建消息历史（使用配置的系统提示词）
      const systemMessage = {
        role: 'system',
        content: `${config.systemPrompt || '你是一个专业的图形编辑助手。'}\n\n${getCanvasContext()}`
      }
      
      // 使用之前保存的历史，加上当前用户消息
      const allMessages = [systemMessage, ...chatHistory, { role: 'user', content: userMessage }]
      
      await callAIServiceStream(config, allMessages, {
        onStart: () => {
          updateMessage(assistantMsgId, { status: 'thinking', content: '' })
        },
        onThinking: (thinkingContent) => {
          updateMessage(assistantMsgId, { 
            status: 'thinking', 
            thinkingContent,
            content: ''
          })
        },
        onContent: (content) => {
          updateMessage(assistantMsgId, { 
            status: 'streaming', 
            content,
            loading: false
          })
        },
        onDone: () => {
          updateMessage(assistantMsgId, { status: 'done', loading: false })
          // 自动保存会话
          setTimeout(() => saveCurrentSession(), 100)
        },
        onError: (error) => {
          updateMessage(assistantMsgId, { 
            status: 'error', 
            error,
            loading: false
          })
        }
      })
    } catch (error: any) {
      // 网络中断时保留已输出的内容，只更新状态和错误信息
      const currentMsg = useAIStore.getState().messages.find((m: any) => m.id === assistantMsgId)
      updateMessage(assistantMsgId, { 
        status: 'error',
        error: error.message || '网络中断，请重试',
        loading: false,
        // 保留已有的内容，不清空
        content: currentMsg?.content || ''
      })
    } finally {
      setIsGenerating(false)
    }
  }, [input, isGenerating, config, addMessage, updateMessage, setIsGenerating, getCanvasContext, saveCurrentSession])

  // 回车发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - timestamp
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (date.toDateString() === now.toDateString()) return '今天'
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* 历史会话面板 */}
      {showHistory && (
        <div className="absolute inset-0 z-20 bg-white dark:bg-gray-800 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <span className="font-medium text-gray-800 dark:text-gray-100">历史会话</span>
            <button
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              onClick={() => setShowHistory(false)}
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
                暂无历史会话
              </div>
            ) : (
              sessions.map((session: any) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                    session.id === currentSessionId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => {
                    loadSession(session.id)
                    setShowHistory(false)
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {session.title}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {session.messages.length} 条消息 · {formatTime(session.updatedAt)}
                    </div>
                  </div>
                  <button
                    className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSession(session.id)
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
        <button
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors cursor-pointer"
          onClick={() => setShowHistory(true)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          历史会话 {sessions.length > 0 && `(${sessions.length})`}
        </button>
        <button
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors cursor-pointer"
          onClick={newSession}
          disabled={messages.length === 0}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新会话
        </button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
            <div className="text-3xl mb-2">🤖</div>
            <p>你好！我是 AI 助手</p>
            <p className="text-xs mt-1">我可以帮助你进行图形设计和排版</p>
          </div>
        ) : (
          messages.map((msg: any) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto"
            style={{ minHeight: '36px', maxHeight: '76px' }}
            placeholder="输入消息..."
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-400">Shift + Enter 换行</span>
          <span className="flex gap-2">
            <button
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              onClick={clearMessages}
              disabled={isGenerating || messages.length === 0}
            >
              清空对话
            </button>
            <button
              className={`h-9 px-4 rounded-lg text-sm font-medium transition-colors ${
                isGenerating || !input.trim()
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              }`}
              onClick={handleSend}
              disabled={isGenerating || !input.trim()}
            >
              发送
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
