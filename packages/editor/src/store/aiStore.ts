/*
 * @Description: AI 助手状态管理（模型配置、对话历史等）
 * @Author: qingzi.wang
 * @Date: 2026-01-15 10:00:00
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// 支持的AI模型提供商
export type AIProvider = 'deepseek' | 'openai' | 'anthropic' | 'qianwen' | 'custom'

// AI模型配置
export interface AIModelConfig {
  provider: AIProvider
  apiKey: string
  apiEndpoint?: string // 自定义端点
  model: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string // 系统提示词
}

// 对话消息
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  loading?: boolean
  error?: string
  // 流式输出相关状态
  status?: 'pending' | 'thinking' | 'streaming' | 'done' | 'interrupted' | 'error'
  thinkingContent?: string // 思考过程内容（如DeepSeek的reasoning_content）
}

// 会话记录
export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

// 预设模型配置
export const MODEL_PRESETS: Record<AIProvider, { name: string; models: string[]; defaultEndpoint: string }> = {
  deepseek: {
    name: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
    defaultEndpoint: 'https://api.deepseek.com/v1'
  },
  qianwen: {
    name: 'Qianwen',
    models: ['qwen-plus', 'qwen-long', 'qwen-long-latest', 'qwq-plus', 'qwen-turbo', 'qwen-flash'],
    defaultEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-5', 'gpt-5.2'],
    defaultEndpoint: 'https://api.openai.com/v1'
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    defaultEndpoint: 'https://api.anthropic.com/v1'
  },
  custom: {
    name: '自定义',
    models: [],
    defaultEndpoint: ''
  }
}

// 默认系统提示词
export const DEFAULT_SYSTEM_PROMPT = `你是一个专业的图形编辑助手，帮助用户进行图形排版、美化和设计。
你可以：
1. 帮助用户优化图形布局和排版（涉及颜色时仅支持rgb、rgba、十六进制颜色值，不支持linear-gradient）
2. 提供设计建议和最佳实践
3. 解答关于图形编辑的问题
4. 生成可直接应用到画布的图数据

当用户要求“生成/创建/应用到画布/直接绘制”时，必须输出一个可应用的 JSON 代码块（仅一个），格式如下：
{
  "type": "agilejs-scene",
  "mode": "append" | "replace",
  "data": { "canvas"?: {...}, "nodes": [...], "edges": [...] }
}

当用户要求“修改/更新/调整/仅更新部分元素”时，可以输出增量更新：
{
  "type": "agilejs-scene",
  "mode": "update",
  "data": {
    "node"?: { "id"?: "..." | "@selection", "ids"?: ["..."], "position"?: {...}, "size"?: {...}, "data"?: {...} },
    "edge"?: { "id"?: "..." | "@selection", "ids"?: ["..."], "data"?: {...}, "points"?: [...] },
    "batch"?: {
      "moveNodes"?: { "ids": ["..."] | "@selection", "dx": number, "dy": number },
      "updateNodes"?: [ { "id"?: "..." | "@selection", "ids"?: ["..."], ... } ],
      "updateEdges"?: [ { "id"?: "..." | "@selection", "ids"?: ["..."], ... } ]
    }
  }
}

当用户要求“删除/移除元素”时，可以输出增量删除：
{
  "type": "agilejs-scene",
  "mode": "delete",
  "data": {
    "delete": { "nodes": ["node-1"], "edges": ["edge-1"] }
  }
}

节点与边的关键字段：
- NodeData 必填：id, shape, position{x,y}, size{width,height}
- EdgeData 必填：id, shape, source, target

扩展节点类型：
- image：data.image.src（URL/base64）, data.image.fit (fill|contain|cover)
- svg-path：data.svg.path 或 data.svg.paths, data.svg.viewBox, data.svg.fit (stretch|contain|cover)
- svg-image：data.svg.xml, data.svg.viewBox, data.svg.fit (stretch|contain|cover)

容器与分组：isContainer, parentId, groupPath/groupId。

输出要求：
- JSON 放在 \`\`\`json 代码块中；不要额外的 JSON 以外内容嵌套在代码块里
- 默认使用 mode=append，除非用户明确要求替换
- ID 唯一且可读（node-1, edge-1 等）

系统会在消息中附带当前画布的序列化 JSON 和选中信息，请优先使用这些真实数据推理与生成。

请用简洁清晰的语言回答用户问题。`

interface AIState {
  // 模型配置
  config: AIModelConfig
  // 当前会话消息
  messages: ChatMessage[]
  // 当前会话ID
  currentSessionId: string | null
  // 历史会话列表
  sessions: ChatSession[]
  // 当前活动标签页: 'chat' | 'config' | 'canvas'
  activeTab: 'chat' | 'config' | 'canvas'
  // 是否正在生成回复
  isGenerating: boolean

  // Actions
  setConfig: (config: Partial<AIModelConfig>) => void
  setProvider: (provider: AIProvider) => void
  setApiKey: (apiKey: string) => void
  setModel: (model: string) => void
  setSystemPrompt: (prompt: string) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  clearMessages: () => void
  setActiveTab: (tab: 'chat' | 'config' | 'canvas') => void
  setIsGenerating: (generating: boolean) => void
  // 会话管理
  newSession: () => void
  saveCurrentSession: () => void
  loadSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
}

const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      config: {
        provider: 'deepseek',
        apiKey: '',
        model: 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: DEFAULT_SYSTEM_PROMPT
      },
      messages: [],
      currentSessionId: null,
      sessions: [],
      activeTab: 'chat',
      isGenerating: false,

      setConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig }
        })),

      setProvider: (provider) =>
        set((state) => {
          const preset = MODEL_PRESETS[provider]
          return {
            config: {
              ...state.config,
              provider,
              model: preset.models[0] || state.config.model,
              apiEndpoint: preset.defaultEndpoint || state.config.apiEndpoint
            }
          }
        }),

      setApiKey: (apiKey) =>
        set((state) => ({
          config: { ...state.config, apiKey }
        })),

      setModel: (model) =>
        set((state) => ({
          config: { ...state.config, model }
        })),

      setSystemPrompt: (systemPrompt) =>
        set((state) => ({
          config: { ...state.config, systemPrompt }
        })),

      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
              timestamp: Date.now()
            }
          ]
        })),

      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
        })),

      clearMessages: () => set({ messages: [], currentSessionId: null }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      setIsGenerating: (generating) => set({ isGenerating: generating }),

      // 新建会话
      newSession: () => {
        const state = get()
        // 先保存当前会话
        if (state.messages.length > 0) {
          state.saveCurrentSession()
        }
        set({ messages: [], currentSessionId: null })
      },

      // 保存当前会话
      saveCurrentSession: () => {
        const state = get()
        if (state.messages.length === 0) return

        const now = Date.now()
        // 生成会话标题（取第一条用户消息的前20个字符）
        const firstUserMsg = state.messages.find(m => m.role === 'user')
        const title = firstUserMsg?.content.slice(0, 20) || '新会话'

        if (state.currentSessionId) {
          // 更新现有会话
          set((s) => ({
            sessions: s.sessions.map(session =>
              session.id === state.currentSessionId
                ? { ...session, messages: state.messages, updatedAt: now, title }
                : session
            )
          }))
        } else {
          // 创建新会话
          const newSessionId = `session_${now}_${Math.random().toString(36).slice(2, 11)}`
          set((s) => ({
            currentSessionId: newSessionId,
            sessions: [
              {
                id: newSessionId,
                title,
                messages: state.messages,
                createdAt: now,
                updatedAt: now
              },
              ...s.sessions
            ].slice(0, 20) // 最多保存20个会话
          }))
        }
      },

      // 加载历史会话
      loadSession: (sessionId) => {
        const state = get()
        // 先保存当前会话
        if (state.messages.length > 0 && state.currentSessionId !== sessionId) {
          state.saveCurrentSession()
        }
        const session = state.sessions.find(s => s.id === sessionId)
        if (session) {
          set({ messages: session.messages, currentSessionId: sessionId })
        }
      },

      // 删除会话
      deleteSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter(s => s.id !== sessionId),
          // 如果删除的是当前会话，清空当前消息
          ...(state.currentSessionId === sessionId ? { messages: [], currentSessionId: null } : {})
        }))
      }
    }),
    {
      name: 'agile-editor-ai-storage',
      storage: createJSONStorage(() => localStorage),
      // 持久化配置和历史会话
      partialize: (state) => ({
        config: {
          ...state.config,
          apiKey: state.config.apiKey
        },
        activeTab: state.activeTab,
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        messages: state.messages
      })
    }
  )
)

export default useAIStore
