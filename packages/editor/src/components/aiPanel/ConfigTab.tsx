import React, { useState } from 'react'
import useAIStore, { MODEL_PRESETS, type AIProvider } from '@/store/aiStore'

export const ConfigTab: React.FC = () => {
  const { config, setProvider, setApiKey, setModel, setConfig, setSystemPrompt } = useAIStore()
  const [showApiKey, setShowApiKey] = useState(false)
  const [showSystemPrompt, setShowSystemPrompt] = useState(false)

  const currentPreset = MODEL_PRESETS[config.provider]

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* 提供商选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          AI 提供商
        </label>
        <select
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={config.provider}
          onChange={(e) => setProvider(e.target.value as AIProvider)}
        >
          {Object.entries(MODEL_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          API Key
        </label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 pr-10 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入 API Key"
            value={config.apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => setShowApiKey(!showApiKey)}
          >
            {showApiKey ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 自定义端点 */}
      {config.provider === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            API 端点
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://api.example.com/v1"
            value={config.apiEndpoint || ''}
            onChange={(e) => setConfig({ apiEndpoint: e.target.value })}
          />
        </div>
      )}

      {/* 模型选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          模型
        </label>
        {config.provider === 'custom' ? (
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入模型名称"
            value={config.model}
            onChange={(e) => setModel(e.target.value)}
          />
        ) : (
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.model}
            onChange={(e) => setModel(e.target.value)}
          >
            {currentPreset.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 系统提示词 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            系统提示词
          </label>
          <button
            type="button"
            className="text-xs text-blue-500 hover:text-blue-600"
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          >
            {showSystemPrompt ? '收起' : '展开编辑'}
          </button>
        </div>
        {showSystemPrompt ? (
          <textarea
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="输入系统提示词，定义 AI 的角色和行为..."
            rows={6}
            value={config.systemPrompt || ''}
            onChange={(e) => setSystemPrompt(e.target.value)}
          />
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 line-clamp-2">
            {config.systemPrompt ? config.systemPrompt.slice(0, 100) + (config.systemPrompt.length > 100 ? '...' : '') : '默认系统提示词'}
          </div>
        )}
        <p className="mt-1 text-xs text-gray-400">设置 AI 助手的角色和行为规范</p>
      </div>

      {/* 高级设置 */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">高级设置</h4>
        
        {/* Temperature */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm text-gray-600 dark:text-gray-400">创造性 (Temperature)</label>
            <span className="text-sm text-gray-500">{config.temperature}</span>
          </div>
          <input
            type="range"
            className="w-full"
            min="0"
            max="2"
            step="0.1"
            value={config.temperature}
            onChange={(e) => setConfig({ temperature: parseFloat(e.target.value) })}
          />
        </div>

        {/* Max Tokens */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm text-gray-600 dark:text-gray-400">最大 Token 数</label>
            <span className="text-sm text-gray-500">{config.maxTokens}</span>
          </div>
          <input
            type="range"
            className="w-full"
            min="256"
            max="8192"
            step="256"
            value={config.maxTokens}
            onChange={(e) => setConfig({ maxTokens: parseInt(e.target.value) })}
          />
        </div>
      </div>
    </div>
  )
}
