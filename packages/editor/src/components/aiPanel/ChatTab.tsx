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
    addMessage, updateMessage, clearMessages, setIsGenerating,
    newSession, saveCurrentSession, loadSession, deleteSession
  } = useAIStore()
  const engine = useCanvasStore((state) => state.engine)
  const { selectedNodeIds, selectedEdgeIds, selectionKind } = useSelectionStore()
  const [input, setInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const latestAssistantContentRef = useRef<string>('')

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
    return `当前画布包含 ${nodes.length} 个节点和 ${edges.length} 条边。${selectionSummary}${serialized}`
  }, [engine, selectedNodeIds.length, selectedEdgeIds.length, selectionKind])

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

  const parseSceneFromDescription = useCallback((text: string) => {
    if (!text) return null
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
    const nodes: any[] = []
    const edges: any[] = []

    const shapeMap: Record<string, string> = {
      圆角矩形: 'rect',
      矩形: 'rect',
      圆形: 'circle',
      菱形: 'diamond',
      椭圆: 'ellipse',
      六边形: 'hexagon',
      五边形: 'pentagon',
      八边形: 'octagon',
      星形: 'star',
      三角形: 'triangle'
    }

    const edgeShapeMap: Record<string, string> = {
      贝塞尔: 'edge-bezier',
      贝塞尔曲线: 'edge-bezier',
      直线: 'edge-straight',
      正交: 'edge-orthogonal',
      正交线: 'edge-orthogonal',
      折线: 'edge-polyline'
    }

    const nodeRegex = /(.+?)\s*\(ID:\s*([^)]+)\)\s*-\s*位置\s*\(([-\d.]+)\s*,\s*([-\d.]+)\)\s*[，,]?\s*(?:尺寸\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)|直径\s*(\d+(?:\.\d+)?))(?:\s*[，,]\s*圆角半径\s*(\d+(?:\.\d+)?))?/i
    const edgeRegex = /边\s*\d+\s*\(ID:\s*([^)]+)\)\s*-\s*从(.+?)\s*\(([^)]+)\)\s*到(.+?)\s*\(([^)]+)\)\s*的\s*([\u4e00-\u9fa5A-Za-z-]+)?/i

    const hasBlueEdge = /蓝色|蓝色边|蓝色曲线|blue/i.test(text)
    const defaultNodeStyle = { fill: '#e5e7eb', stroke: '#374151', lineWidth: 1 }
    const defaultEdgeStyle = { stroke: hasBlueEdge ? '#3b82f6' : '#6b7280', lineWidth: 2 }

    for (const line of lines) {
      const nm = line.match(nodeRegex)
      if (nm) {
        const rawShape = nm[1].trim()
        const id = String(nm[2]).trim()
        const x = Number(nm[3])
        const y = Number(nm[4])
        const w = nm[5] ? Number(nm[5]) : Number(nm[7])
        const h = nm[6] ? Number(nm[6]) : Number(nm[7])
        const radius = nm[8] ? Number(nm[8]) : undefined
        const shape = shapeMap[rawShape] || 'rect'
        const style: any = { ...defaultNodeStyle }
        if (rawShape.includes('圆角')) style.borderRadius = radius ?? 8
        nodes.push({
          id,
          shape,
          position: { x, y },
          size: { width: w, height: h },
          data: { label: rawShape, style }
        })
        continue
      }
      const em = line.match(edgeRegex)
      if (em) {
        const id = String(em[1]).trim()
        const sourceId = String(em[3]).trim()
        const targetId = String(em[5]).trim()
        const kind = em[6]?.trim() || ''
        const shape = edgeShapeMap[kind] || 'edge-bezier'
        edges.push({ id, shape, source: sourceId, target: targetId, data: { style: defaultEdgeStyle } })
      }
    }

    if (nodes.length === 0 && edges.length === 0) return null
    return { type: 'agilejs-scene', mode: 'append', data: { nodes, edges } }
  }, [])

  const extractScenePayload = useCallback((text: string) => {
    if (!text) return null
    const blocks: string[] = []
    const jsonBlock = /```json\s*([\s\S]*?)```/gi
    const anyBlock = /```\s*([\s\S]*?)```/g
    let m: RegExpExecArray | null
    while ((m = jsonBlock.exec(text)) !== null) blocks.push(m[1])
    if (blocks.length === 0) {
      while ((m = anyBlock.exec(text)) !== null) blocks.push(m[1])
    }
    if (blocks.length === 0 && text.trim().startsWith('{') && text.trim().endsWith('}')) {
      blocks.push(text.trim())
    }
    for (const raw of blocks) {
      try {
        const parsed = JSON.parse(raw)
        const data = parsed?.data ?? parsed?.scene ?? parsed
        const hasData = data?.nodes || data?.edges || data?.canvas || data?.node || data?.edge
        const isTypeMatch = parsed?.type === 'agilejs-scene' || parsed?.type === 'agilejs-delta'
        const isUpdateMode = parsed?.mode === 'update' || parsed?.update === true
        if (isTypeMatch || isUpdateMode || hasData) {
          return parsed
        }
      } catch {
        // ignore parse errors
      }
    }
    return parseSceneFromDescription(text)
  }, [parseSceneFromDescription])

  const applyScenePayload = useCallback((payload: any) => {
    if (!engine || !payload) return { applied: false, reason: 'no-engine' }
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

    if (mode === 'update' || mode === 'delete' || payload?.type === 'agilejs-delta' || payload?.update === true) {
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
          latestAssistantContentRef.current = content
          updateMessage(assistantMsgId, { 
            status: 'streaming', 
            content,
            loading: false
          })
        },
        onDone: () => {
          updateMessage(assistantMsgId, { status: 'done', loading: false })
          const currentMsg = useAIStore.getState().messages.find((m: any) => m.id === assistantMsgId)
          const finalContent = latestAssistantContentRef.current || currentMsg?.content || ''
          const payload = extractScenePayload(finalContent)
          if (payload) {
            const result = applyScenePayload(payload)
            if (result.applied) {
              updateMessage(assistantMsgId, {
                content: `${finalContent}\n\n✅ 已应用到画布（${result.mode}）\n- 节点：${result.nodes}\n- 边：${result.edges}`
              })
            }
          }
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
  }, [input, isGenerating, addMessage, setIsGenerating, config, getCanvasContext, updateMessage, extractScenePayload, applyScenePayload, saveCurrentSession])

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
