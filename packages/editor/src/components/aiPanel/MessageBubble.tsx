import React, { useState } from 'react'
import { type ChatMessage } from '@/store/aiStore'
import { MarkdownRenderer } from './MarkdownRenderer'

export const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user'
  const [showThinking, setShowThinking] = useState(false)

  const getDisplayContent = (content: string) => {
    if (!content || isUser) return content
    const codeBlock = /```json\s*([\s\S]*?)```/gi
    let replaced = content
    const blocks: Array<{ raw: string; body: string }> = []
    let match: RegExpExecArray | null
    while ((match = codeBlock.exec(content)) !== null) {
      blocks.push({ raw: match[0], body: match[1] })
    }
    blocks.forEach((b) => {
      const body = b.body
      if (body.includes('"type"') && body.includes('agilejs-scene')) {
        replaced = replaced.replace(b.raw, '（已生成画布数据，已自动应用）')
        return
      }
      if (body.includes('"nodes"') && body.includes('"edges"')) {
        replaced = replaced.replace(b.raw, '（已生成画布数据，已自动应用）')
      }
    })
    return replaced
  }
  
  // 等待中状态
  if (message.status === 'pending') {
    return (
      <div className="flex justify-start">
        <div className="w-full rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            <span>准备中...</span>
          </div>
        </div>
      </div>
    )
  }

  // 思考中状态（DeepSeek reasoning）
  if (message.status === 'thinking') {
    return (
      <div className="flex justify-start">
        <div className="w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
          {/* 思考状态头部 */}
          <div className="px-3 py-2 bg-linear-to-r from-purple-500/10 to-blue-500/10 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-medium">思考中...</span>
            </div>
          </div>
          {/* 思考内容 */}
          {message.thinkingContent && (
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 max-h-32 overflow-y-auto whitespace-pre-wrap">
              {message.thinkingContent}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 流式输出中
  if (message.status === 'streaming') {
    return (
      <div className="flex flex-col gap-1">
        {/* 如果有思考内容，可折叠显示 */}
        {message.thinkingContent && (
          <div className="flex justify-start">
            <button 
              className="text-xs text-purple-500 dark:text-purple-400 hover:underline flex items-center gap-1"
              onClick={() => setShowThinking(!showThinking)}
            >
              <svg className={`w-3 h-3 transition-transform ${showThinking ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              {showThinking ? '收起思考过程' : '查看思考过程'}
            </button>
          </div>
        )}
        {showThinking && message.thinkingContent && (
          <div className="flex justify-start">
            <div className="w-full rounded-lg px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-xs text-gray-500 dark:text-gray-400 max-h-32 overflow-y-auto whitespace-pre-wrap">
              {message.thinkingContent}
            </div>
          </div>
        )}
        {/* 正文内容 - 流式输出时显示原始文本+光标 */}
        <div className="flex justify-start">
          <div className="w-full rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm">
            <MarkdownRenderer content={getDisplayContent(message.content)} />
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-blue-500 animate-pulse align-middle"></span>
          </div>
        </div>
      </div>
    )
  }

  // 旧版 loading 状态兼容
  if (message.loading) {
    return (
      <div className="flex justify-start">
        <div className="w-full rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100">
          <div className="flex items-center gap-1">
            <span className="animate-bounce">●</span>
            <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
            <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
          </div>
        </div>
      </div>
    )
  }

  // 错误状态 - 保留已输出的内容
  if (message.error || message.status === 'error') {
    return (
      <div className="flex flex-col gap-1">
        {/* 如果有已输出的内容，先显示内容 */}
        {message.content && (
          <div className="flex justify-start">
            <div className="w-full rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm">
              <MarkdownRenderer content={getDisplayContent(message.content)} />
            </div>
          </div>
        )}
        {/* 错误提示 */}
        <div className="flex justify-start">
          <div className="w-full rounded-lg px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <div>
                <div className="font-medium">{message.content ? '输出中断' : '请求失败'}</div>
                <div className="text-xs mt-0.5 opacity-80">{message.error || '未知错误'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 完成状态或普通消息
  return (
    <div className="flex flex-col gap-1">
      {/* 如果有思考内容，可折叠显示 */}
      {!isUser && message.thinkingContent && (
        <>
          <div className="flex justify-start">
            <button 
              className="text-xs text-purple-500 dark:text-purple-400 hover:underline flex items-center gap-1"
              onClick={() => setShowThinking(!showThinking)}
            >
              <svg className={`w-3 h-3 transition-transform ${showThinking ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              {showThinking ? '收起思考过程' : '查看思考过程'}
            </button>
          </div>
          {showThinking && (
            <div className="flex justify-start">
              <div className="w-full rounded-lg px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-xs text-gray-500 dark:text-gray-400 max-h-32 overflow-y-auto whitespace-pre-wrap">
                {message.thinkingContent}
              </div>
            </div>
          )}
        </>
      )}
      {/* 正文内容 */}
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[95%] rounded-lg px-3 py-2 text-sm ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
          }`}
        >
          {isUser ? (
            message.content
          ) : (
            <MarkdownRenderer content={getDisplayContent(message.content || (message.status === 'done' ? '（无内容）' : ''))} />
          )}
        </div>
      </div>
    </div>
  )
}
