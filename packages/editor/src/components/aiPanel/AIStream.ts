import { AIProvider } from '@/store/aiStore'
import { MODEL_PRESETS } from '@/store/aiStore'

export interface StreamCallbacks {
  onStart?: () => void
  onThinking?: (content: string) => void
  onContent?: (content: string) => void
  onDone?: () => void
  onError?: (error: string) => void
}

export async function callAIServiceStream(
  config: { provider: AIProvider; apiKey: string; apiEndpoint?: string; model: string; temperature?: number; maxTokens?: number },
  messages: Array<{ role: string; content: string }>,
  callbacks: StreamCallbacks
): Promise<void> {
  const { provider, apiKey, apiEndpoint, model, temperature = 0.7, maxTokens = 4096 } = config
  
  if (!apiKey) {
    throw new Error('请先配置 API Key')
  }

  const endpoint = apiEndpoint || MODEL_PRESETS[provider].defaultEndpoint
  callbacks.onStart?.()

  if (provider === 'anthropic') {
    // Anthropic 流式 API
    const response = await fetch(`${endpoint}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: true,
        messages: messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role,
          content: m.content
        })),
        system: messages.find(m => m.role === 'system')?.content
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `API 请求失败: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    if (!reader) throw new Error('无法读取响应流')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim())

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullContent += parsed.delta.text
              callbacks.onContent?.(fullContent)
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
    callbacks.onDone?.()
  } else {
    // OpenAI 兼容格式 (OpenAI, DeepSeek, 自定义) 流式
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `API 请求失败: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''
    let thinkingContent = ''
    let isThinking = false

    if (!reader) throw new Error('无法读取响应流')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim())

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta
            
            if (delta) {
              // DeepSeek 思考内容
              if (delta.reasoning_content) {
                if (!isThinking) {
                  isThinking = true
                }
                thinkingContent += delta.reasoning_content
                callbacks.onThinking?.(thinkingContent)
              }
              
              // 正常内容
              if (delta.content) {
                if (isThinking) {
                  isThinking = false
                }
                fullContent += delta.content
                callbacks.onContent?.(fullContent)
              }
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
    callbacks.onDone?.()
  }
}
