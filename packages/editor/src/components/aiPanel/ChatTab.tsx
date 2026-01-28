import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useAIStore, useCanvasStore, useSelectionStore } from '@/store'
import {
  AddEdgeCommand,
  AddNodeCommand,
  RemoveNodeCommand,
  RemoveEdgeCommand,
  MoveNodeCommand,
  MoveNodesCommand,
  ResizeNodeCommand,
  SetZIndexCommand,
  SetNodeRotationCommand,
  UpdateNodeDataCommand,
  UpdateEdgeDataCommand,
  UpdateNodePropsCommand,
  UpdateNodePortsCommand,
  SetEdgeShapeCommand,
  SetEdgePointsCommand,
  ReconnectEdgeCommand,
  fromScene,
  toScene
} from '@fnt-agilejs/core'
import { callAIServiceStream } from './AIStream'
import { MessageBubble } from './MessageBubble'

export const ChatTab: React.FC = () => {
  const { 
    config, messages, isGenerating, sessions, currentSessionId,
    addMessage, updateMessage, setIsGenerating,
    newSession, saveCurrentSession, loadSession, deleteSession
  } = useAIStore()
  const engine = useCanvasStore((state) => state.engine)
  const { selectedNodeIds, selectedEdgeIds, selectionKind } = useSelectionStore()
  const [input, setInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const latestAssistantContentRef = useRef<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)
  const activeAssistantMsgIdRef = useRef<string | null>(null)
  // 用于避免“终止后仍继续写入 UI/应用 JSON”或“旧请求回调覆盖新状态”
  const requestSeqRef = useRef(0)
  const activeRequestIdRef = useRef<number | null>(null)
  const abortedRequestIdRef = useRef<number | null>(null)

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

    // 获取可视区域内的节点和边
    let visibleInfo = ''
    try {
      const visibleNodes = (engine as any).getVisibleNodes?.() || []
      const visibleEdges = (engine as any).getVisibleEdges?.() || []
      const visibleNodeIds = visibleNodes.map((n: any) => n.id)
      const visibleEdgeIds = visibleEdges.map((e: any) => e.id)
      visibleInfo = `\n当前可视区域内：节点 ${visibleNodeIds.length} 个 [${visibleNodeIds.join(', ')}]，边 ${visibleEdgeIds.length} 条 [${visibleEdgeIds.join(', ')}]`
    } catch {
      visibleInfo = ''
    }

    // 获取已选中的节点和边ID
    const selectedInfo = selectedNodeIds.length > 0 || selectedEdgeIds.length > 0
      ? `\n已选中元素：节点 [${selectedNodeIds.join(', ')}]，边 [${selectedEdgeIds.join(', ')}]`
      : ''

    const selectionSummary = `当前选中：${selectionKind}（节点 ${selectedNodeIds.length}，边 ${selectedEdgeIds.length}）`
    let sceneJson = ''
    try {
      const scene = toScene(engine)
      const raw = JSON.stringify(scene)
      const maxLen = 6000
      sceneJson = raw.length > maxLen ? `${raw.slice(0, maxLen)}...<truncated>` : raw
    } catch {
      sceneJson = ''
    }

    const serialized = sceneJson ? `\n当前画布序列化(JSON)：${sceneJson}` : ''
    return `当前画布包含 ${nodes.length} 个节点和 ${edges.length} 条边。${selectionSummary}${selectedInfo}${visibleInfo}${serialized}`
  }, [engine, selectedNodeIds, selectedEdgeIds, selectionKind])

  // 终止 AI 生成
  const handleAbort = useCallback(() => {
    // 标记当前请求已终止：屏蔽后续增量写入，但仍允许 onError 将消息置为 interrupted
    abortedRequestIdRef.current = activeRequestIdRef.current

    // UI 立即响应：将当前 assistant 消息标记为 interrupted（不等待网络回调）
    const msgId = activeAssistantMsgIdRef.current
    if (msgId) {
      updateMessage(msgId, { status: 'interrupted', loading: false })
    }

    if (abortControllerRef.current) {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
    }
    setIsGenerating(false)
  }, [setIsGenerating, updateMessage])

  const applyCanvasState = useCallback((canvas: any) => {
    if (!engine || !canvas) return
    const theme = canvas.theme as 'light' | 'dark' | undefined
    if (theme && (engine as any).setTheme) (engine as any).setTheme(theme)
    if (canvas.background != null) (engine as any).background = canvas.background
    if (canvas.viewport) {
      const { scale, translation } = canvas.viewport
      if (typeof scale === 'number') (engine as any).setScale?.(scale)
      if (translation && typeof translation.x === 'number' && typeof translation.y === 'number') {
        ;(engine as any).setTranslation?.(translation.x, translation.y)
      }
    }
    if (canvas.edgeSnapshotMode && (engine as any).setEdgeSnapshotMode) {
      ;(engine as any).setEdgeSnapshotMode(canvas.edgeSnapshotMode)
    }
    if (canvas.interactionConfig && (engine as any).setInteractionConfig) {
      ;(engine as any).setInteractionConfig(canvas.interactionConfig)
    }
    if (canvas.dprDegradation && (engine as any).setDprDegradation) {
      ;(engine as any).setDprDegradation(canvas.dprDegradation)
    }
    const pm: any = (engine.plugins as any).plugins
    const grid = pm?.get?.('grid')
    if (grid && canvas.grid) {
      if (canvas.grid.size != null) grid.size = canvas.grid.size
      if (canvas.grid.color != null) grid.color = canvas.grid.color
      if (canvas.grid.alpha != null) grid.alpha = canvas.grid.alpha
      if (canvas.grid.type != null) grid.type = canvas.grid.type
      if (canvas.grid.visible != null) grid.visible = canvas.grid.visible
    }
    const guides = pm?.get?.('guides')
    if (guides && canvas.guides) {
      if (canvas.guides.threshold != null) guides.threshold = canvas.guides.threshold
      if (canvas.guides.color != null) guides.color = canvas.guides.color
      if (canvas.guides.visible != null) guides.visible = canvas.guides.visible
    }
    const minimap = pm?.get?.('minimap')
    if (minimap && canvas.minimap) {
      const mo: any = (minimap as any).opts || {}
      const src = canvas.minimap || {}
      Object.keys(src).forEach((k) => {
        const v = (src as any)[k]
        if (v !== undefined) mo[k] = v
      })
    }
  }, [engine])

  const applyScenePayload = useCallback((payload: any) => {
    if (!engine || !payload) return { applied: false, reason: 'no-engine' }
    if (payload?.type && payload?.type !== 'agilejs-scene') return { applied: false, reason: 'unsupported-type' }
    const data = payload?.data ?? payload?.scene ?? payload
    const mode = payload?.mode === 'replace' ? 'replace' : payload?.mode === 'delete' ? 'delete' : payload?.mode === 'update' ? 'update' : 'append'
    const nodes = Array.isArray(data?.nodes) ? data.nodes : data?.node ? [data.node] : []
    const edges = Array.isArray(data?.edges) ? data.edges : data?.edge ? [data.edge] : []
    const normalizeIds = (list: any) =>
      (Array.isArray(list) ? list : list ? [list] : [])
        .map((it: any) => (typeof it === 'string' ? it : it?.id))
        .filter((v: any) => typeof v === 'string' && v.length > 0)
    const deleteNodeIds = normalizeIds(
      data?.delete?.nodes ?? data?.deleteNodes ?? data?.remove?.nodes ?? data?.removeNodes
    )
    const deleteEdgeIds = normalizeIds(
      data?.delete?.edges ?? data?.deleteEdges ?? data?.remove?.edges ?? data?.removeEdges
    )

    if (mode === 'replace') {
      fromScene(engine, data)
      return { applied: true, mode, nodes: nodes.length, edges: edges.length }
    }

    if (mode === 'update' || mode === 'delete' || payload?.update === true) {
      const graph = engine.graph as any
      const history = engine.history as any
      const runCmd = (cmd: any) => (history?.execute ? history.execute(cmd) : cmd.do?.())

      const normalizeIds = (value: any, fallback: string[]) => {
        if (value === '@selection') return fallback
        if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : v?.id)).filter(Boolean)
        if (typeof value === 'string') return [value]
        if (value && typeof value === 'object' && value.id) return [value.id]
        return []
      }

      const applyNodePatchToId = (id: string, patch: any) => {
        if (!id) return
        const node = graph.getNode?.(id)
        if (!node) return

        if (patch.position && typeof patch.position.x === 'number' && typeof patch.position.y === 'number') {
          runCmd(new MoveNodeCommand(engine.graph, id, patch.position.x, patch.position.y))
        }
        if (patch.size && typeof patch.size.width === 'number' && typeof patch.size.height === 'number') {
          runCmd(new ResizeNodeCommand(engine.graph, id, patch.size.width, patch.size.height))
        }
        if (typeof patch.rotation === 'number') {
          runCmd(new SetNodeRotationCommand(engine.graph, id, patch.rotation))
        }
        if (typeof patch.zIndex === 'number') {
          runCmd(new SetZIndexCommand(engine.graph, id, patch.zIndex))
        }
        if (patch.data && typeof patch.data === 'object') {
          runCmd(new UpdateNodeDataCommand(engine.graph, id, patch.data))
        }
        const propsPatch: any = {}
        ;['selectable', 'draggable', 'resizable', 'rotatable', 'groupId', 'parentId', 'isContainer'].forEach((k) => {
          if (k in patch) propsPatch[k] = patch[k]
        })
        if (Object.keys(propsPatch).length > 0) {
          runCmd(new UpdateNodePropsCommand(engine.graph, id, propsPatch))
        }
        if (Array.isArray(patch.ports)) {
          runCmd(new UpdateNodePortsCommand(engine.graph, id, patch.ports))
        }
      }

      const applyEdgePatchToId = (id: string, patch: any) => {
        if (!id) return
        const edge = graph.getEdge?.(id)
        if (!edge) return

        if (patch.data && typeof patch.data === 'object') {
          runCmd(new UpdateEdgeDataCommand(engine.graph, id, patch.data))
        }
        if (typeof patch.shape === 'string') {
          runCmd(new SetEdgeShapeCommand(engine.graph, id, patch.shape))
        }
        if (Array.isArray(patch.points)) {
          runCmd(new SetEdgePointsCommand(engine.graph, id, edge.points, patch.points))
        }
        if (
          patch.source ||
          patch.target ||
          patch.sourcePortId !== undefined ||
          patch.targetPortId !== undefined
        ) {
          runCmd(
            new ReconnectEdgeCommand(
              engine.graph,
              id,
              {
                source: edge.source,
                target: edge.target,
                sourcePortId: edge.sourcePortId,
                targetPortId: edge.targetPortId
              },
              {
                source: patch.source ?? edge.source,
                target: patch.target ?? edge.target,
                sourcePortId: patch.sourcePortId ?? edge.sourcePortId,
                targetPortId: patch.targetPortId ?? edge.targetPortId
              }
            )
          )
        }
      }

      const applyNodePatch = (patch: any) => {
        if (!patch) return
        const ids = normalizeIds(patch.ids ?? patch.id, selectedNodeIds)
        ids.forEach((id) => applyNodePatchToId(id, patch))
      }

      const applyEdgePatch = (patch: any) => {
        if (!patch) return
        const ids = normalizeIds(patch.ids ?? patch.id, selectedEdgeIds)
        ids.forEach((id) => applyEdgePatchToId(id, patch))
      }

      const applyDeletes = () => {
        deleteEdgeIds.forEach((id: string) => runCmd(new RemoveEdgeCommand(engine.graph, id)))
        deleteNodeIds.forEach((id: string) => runCmd(new RemoveNodeCommand(engine.graph, id)))
      }

      const applyBatch = () => {
        const batch = data?.batch
        if (!batch) return
        const move = batch.moveNodes
        if (move && (move.ids || move.ids === '@selection') && typeof move.dx === 'number' && typeof move.dy === 'number') {
          const ids = normalizeIds(move.ids, selectedNodeIds)
          if (ids.length > 0) runCmd(new MoveNodesCommand(engine.graph, ids, move.dx, move.dy))
        }
        const updates: any[] = Array.isArray(batch.updateNodes) ? batch.updateNodes : []
        updates.forEach(applyNodePatch)
        const eUpdates: any[] = Array.isArray(batch.updateEdges) ? batch.updateEdges : []
        eUpdates.forEach(applyEdgePatch)
      }

      if (history?.beginTransaction) {
        history.beginTransaction('AI Update')
        try {
          nodes.forEach(applyNodePatch)
          edges.forEach(applyEdgePatch)
          applyBatch()
          applyDeletes()
          history.commitTransaction()
        } catch {
          try {
            history.rollbackTransaction()
          } catch {
            // ignore
          }
          nodes.forEach(applyNodePatch)
          edges.forEach(applyEdgePatch)
          applyBatch()
          applyDeletes()
        }
      } else {
        nodes.forEach(applyNodePatch)
        edges.forEach(applyEdgePatch)
        applyBatch()
        applyDeletes()
        engine.graph.markDirty()
      }

      return {
        applied: true,
        mode: mode === 'delete' ? 'delete' : 'update',
        nodes: nodes.length,
        edges: edges.length,
        deletedNodes: deleteNodeIds.length,
        deletedEdges: deleteEdgeIds.length
      }
    }

    if (data?.canvas) applyCanvasState(data.canvas)

    const graph = engine.graph as any
    const history = engine.history as any
    const existingIds = new Set((engine.graph.getNodes() || []).map((n: any) => n.id))
    const incomingIds = new Set(nodes.map((n: any) => n.id))
    const validNodeIds = new Set([...existingIds, ...incomingIds])
    const safeEdges = edges.filter((e: any) => validNodeIds.has(e.source) && validNodeIds.has(e.target))

    const addNodes = () => {
      nodes.forEach((n: any) => {
        if (graph.getNode?.(n.id)) return
        if (history?.execute) history.execute(new AddNodeCommand(engine.graph, n))
        else graph.addNode(n)
      })
    }
    const addEdges = () => {
      safeEdges.forEach((e: any) => {
        if (graph.getEdge?.(e.id)) return
        if (history?.execute) history.execute(new AddEdgeCommand(engine.graph, e))
        else graph.addEdge(e)
      })
    }

    if (history?.beginTransaction) {
      history.beginTransaction('AI Apply')
      try {
        addNodes()
        addEdges()
        history.commitTransaction()
      } catch {
        try {
          history.rollbackTransaction()
        } catch {
          // ignore
        }
        addNodes()
        addEdges()
      }
    } else {
      addNodes()
      addEdges()
      engine.graph.markDirty()
    }

    return { applied: true, mode, nodes: nodes.length, edges: safeEdges.length }
  }, [engine, applyCanvasState, selectedNodeIds, selectedEdgeIds])

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

    // 创建新的 AbortController
    const requestId = ++requestSeqRef.current
    activeRequestIdRef.current = requestId
    abortedRequestIdRef.current = null
    latestAssistantContentRef.current = ''
    abortControllerRef.current = new AbortController()
    const localController = abortControllerRef.current

    // 获取刚添加的助手消息ID
    const assistantMessages = useAIStore.getState().messages
    const assistantMsgId = assistantMessages[assistantMessages.length - 1]?.id
    activeAssistantMsgIdRef.current = assistantMsgId || null

    try {
      // 构建消息历史（使用配置的系统提示词）
      const systemMessage = {
        role: 'system',
        content: `${config.systemPrompt || '你是一个专业的图形编辑助手。'}\n\n${getCanvasContext()}`
      }

      // 使用之前保存的历史，加上当前用户消息
      const allMessages = [systemMessage, ...chatHistory, { role: 'user', content: userMessage }]

      // 用于追踪已应用的JSON片段（避免重复应用）
      const appliedBlocks = new Set<string>()

      await callAIServiceStream(config, allMessages, {
        signal: localController?.signal,
        onStart: () => {
          if (activeRequestIdRef.current !== requestId) return
          if (abortedRequestIdRef.current === requestId || localController?.signal?.aborted) return
          updateMessage(assistantMsgId, { status: 'thinking', content: '' })
        },
        onThinking: (thinkingContent) => {
          if (activeRequestIdRef.current !== requestId) return
          if (abortedRequestIdRef.current === requestId || localController?.signal?.aborted) return
          updateMessage(assistantMsgId, { 
            status: 'thinking', 
            thinkingContent,
            content: ''
          })
        },
        onContent: (content) => {
          if (activeRequestIdRef.current !== requestId) return
          if (abortedRequestIdRef.current === requestId || localController?.signal?.aborted) return
          latestAssistantContentRef.current = content
          updateMessage(assistantMsgId, { 
            status: 'streaming', 
            content,
            loading: false
          })
          
          // 实时检测并应用完整的JSON片段
          const jsonBlock = /```json\s*([\s\S]*?)```/g
          let match: RegExpExecArray | null
          while ((match = jsonBlock.exec(content)) !== null) {
            const blockContent = match[1]
            const blockHash = blockContent.trim().slice(0, 100) // 使用前100字符作为唯一标识
            
            // 跳过已应用的片段
            if (appliedBlocks.has(blockHash)) continue
            
            try {
              const parsed = JSON.parse(blockContent)
              if (parsed?.type && parsed?.type !== 'agilejs-scene') continue
              const isValidType = parsed?.type === 'agilejs-scene'
              const hasData = parsed?.data?.nodes || parsed?.data?.edges || parsed?.data?.canvas
              
              if (isValidType || hasData) {
                // 终止或失效后不再应用任何画布变更
                if (activeRequestIdRef.current !== requestId) continue
                if (abortedRequestIdRef.current === requestId || localController?.signal?.aborted) continue
                const result = applyScenePayload(parsed)
                if (result.applied) {
                  appliedBlocks.add(blockHash)
                  console.log(`✅ 实时应用 ${parsed?.type || 'scene'} - 节点:${result.nodes}, 边:${result.edges}`)
                }
              }
            } catch {
              // JSON未完整，等待下次内容更新
            }
          }
        },
        onDone: () => {
          if (activeRequestIdRef.current !== requestId) return
          abortControllerRef.current = null
          activeRequestIdRef.current = null
          abortedRequestIdRef.current = null
          activeAssistantMsgIdRef.current = null
          updateMessage(assistantMsgId, { status: 'done', loading: false })
          // 自动保存会话
          setTimeout(() => saveCurrentSession(), 100)
        },
        onError: (error) => {
          if (activeRequestIdRef.current !== requestId) return
          // 注意：这里要先标记请求结束，避免 onError 后仍被后续回调写入
          activeRequestIdRef.current = null
          abortedRequestIdRef.current = null
          activeAssistantMsgIdRef.current = null
          // 终止请求时不显示错误
          if ((error as any)?.name === 'AbortError') {
            updateMessage(assistantMsgId, { status: 'interrupted', loading: false })
          } else {
            updateMessage(assistantMsgId, { 
              status: 'error', 
              error: typeof error === 'string' ? error : (error as any)?.message,
              loading: false
            })
          }
        }
      })
    } catch (error: any) {
      // Abort 已在 onError 内部处理，这里避免再次覆盖状态
      if (error?.name === 'AbortError') return

      // 网络中断时保留已输出的内容，只更新状态和错误信息
      const currentMsg = useAIStore.getState().messages.find((m: any) => m.id === assistantMsgId)
      updateMessage(assistantMsgId, {
        status: 'error',
        error: error?.message || '网络中断，请重试',
        loading: false,
        // 保留已有的内容，不清空
        content: currentMsg?.content || ''
      })
    } finally {
      // 仅当仍是当前请求时才清理，避免未来扩展（并发/队列）时互相覆盖
      if (activeRequestIdRef.current === requestId) {
        activeRequestIdRef.current = null
        abortedRequestIdRef.current = null
        activeAssistantMsgIdRef.current = null
      }
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }, [input, isGenerating, addMessage, setIsGenerating, config, getCanvasContext, updateMessage, applyScenePayload, saveCurrentSession])

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
          <div className="flex items-center justify-between px-4 py-1 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-800 dark:text-gray-100">历史会话</span>
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
      <div className="border-gray-200 dark:border-gray-700 p-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-3 pr-12 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto resize-none"
            style={{ minHeight: '30px', maxHeight: '120px' }}
            placeholder="输入消息，Shift + Enter 换行"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
          />
          {isGenerating ? (
            <button
              className="absolute right-1.5 bottom-3 h-8 w-8 flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-colors"
              onClick={handleAbort}
              title="终止"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              className={`absolute right-1.5 bottom-3 h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${
                !input.trim()
                  ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              }`}
              onClick={handleSend}
              disabled={!input.trim()}
              title="发送"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
