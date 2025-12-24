/*
 * @Description: 画布设置面板
 * @Author: qingzi.wang
 * @Date: 2025-10-12 00:12:55
 * @LastEditTime: 2025-12-09 09:24:46
 */
import React, { useEffect } from 'react'
import Field from './Field'
import { canvasFieldSchemas, groupSchemas } from './schema'
import { useUIStore, useCanvasStore } from '@/store'

export interface CanvasSettingsDraft {
  background?: string
  gridSize?: number
  gridColor?: string
  gridAlpha?: number
  gridType?: 'line' | 'dot'
  gridVisible?: boolean
  guidesThreshold?: number
  // 交互控制
  enablePan?: boolean
  enableZoom?: boolean
  enableSelection?: boolean
  enableDrag?: boolean
  enableResize?: boolean
  enableRotate?: boolean
}
export interface CanvasSettingsSectionProps {
  draft: CanvasSettingsDraft
  onCommit: (field: string, value: any) => void
  onSync?: () => void
  onFocusTextLike?: () => void
  onBlurTextLike?: () => void
}

const CanvasSettingsSection: React.FC<CanvasSettingsSectionProps> = ({
  draft,
  onCommit,
  onSync,
  onFocusTextLike,
  onBlurTextLike
}) => {
  const { theme, setTheme } = useUIStore()
  const engine = useCanvasStore((state) => state.engine)

  useEffect(() => {
    // 初始化时同步主题，并监听引擎主题变化（如加载数据导致的变化）
    if (engine) {
      const currentTheme = engine.getTheme()
      if (currentTheme !== theme) {
        setTheme(currentTheme)
      }
      const onThemeChanged = ({ theme: newTheme }: { theme: string }) => {
        setTheme(newTheme as 'light' | 'dark')
        // 触发同步，并延迟以等待可能的后续属性更新（如 fromScene 中的 background 赋值）
        setTimeout(() => {
          if (onSync) onSync()
        }, 100)
      }
      engine.events.on('engine:theme-change', onThemeChanged)
      return () => {
        engine.events.off('engine:theme-change', onThemeChanged)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, setTheme])

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    // 主题切换后，触发同步回调以更新草稿值
    // 延迟执行，等待 CanvasEditor 响应 theme 变化并更新 engine
    setTimeout(() => {
      if (onSync) onSync()
    }, 100)
  }
  const field = (schemaKey: string, opts?: { compact?: boolean; disabled?: boolean }) => {
    const schema = canvasFieldSchemas.find((s) => s.key === schemaKey)!
    const k = schema.key
    const val = (draft as any)[k]
    const error = schema.validate?.(val)
    const isTextLike = schema.type === 'text' || schema.type === 'textarea' || schema.type === 'json'
    return (
      <Field
        key={k}
        label={schema.name || schema.label || k}
        desc={schema.desc}
        type={schema.type as any}
        value={val}
        options={schema.options as any}
        min={schema.min}
        max={schema.max}
        step={schema.step}
        placeholder={schema.placeholder}
        error={error}
        compact={opts?.compact}
        disabled={opts?.disabled}
        onChange={(v) => {
          // select 类型需要允许提交 ''（表示使用默认样式）
          if (schema.type === 'select') {
            onCommit(k, v)
            return
          }
          if (v === '') {
            if (schema.clearable) onCommit(k, '')
            return
          }
          if (schema.type === 'number' && typeof v === 'number') {
            const err = schema.validate?.(v)
            if (err) return
          }
          onCommit(k, v)
        }}
        onClear={schema.clearable ? () => onCommit(k, '') : undefined}
        onFocus={isTextLike ? onFocusTextLike : undefined}
        onBlur={isTextLike ? onBlurTextLike : undefined}
      />
    )
  }
  return (
    <div className="space-y-1 pb-4">
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700">基础</div>
      <div className="grid grid-cols-1 gap-2">
        {groupSchemas(canvasFieldSchemas, 'canvas-base').map((s) => (
          <div key={s.key}>{field(s.key, { compact: true })}</div>
        ))}
      </div>
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700">交互控制</div>
      <div className="grid grid-cols-2 gap-2">
        {groupSchemas(canvasFieldSchemas, 'canvas-interaction').map((s) => (
          <div key={s.key}>{field(s.key, { compact: false })}</div>
        ))}
      </div>
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700">快捷</div>
      <div className="mt-1 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={handleToggleTheme}
          className="px-3 py-1.5 text-[12px] leading-none rounded border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-700/70 dark:hover:bg-gray-700 transition-colors cursor-pointer hover:bg-blue-500 hover:text-white"
        >
          {theme === 'dark' ? '浅色' : '深色'}主题
        </button>
      </div>
    </div>
  )
}

export default CanvasSettingsSection
