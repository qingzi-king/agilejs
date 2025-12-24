/*
 * @Description: 表单字段组件
 * @Author: qingzi.wang
 * @Date: 2025-09-24 15:31:25
 * @LastEditTime: 2025-12-09 09:30:39
 */
import React from 'react'
import Tooltip from '../common/Tooltip'
import ColorPicker from '../common/ColorPicker'

export interface FieldProps {
  label: string
  value: any
  type?: 'text' | 'number' | 'color' | 'checkbox' | 'json' | 'textarea' | 'select'
  placeholder?: string
  min?: number
  max?: number
  step?: number
  error?: string
  onChange: (next: any) => void
  onClear?: () => void
  className?: string
  disabled?: boolean
  // 紧凑模式：用于两列布局时缩小 label 宽度等
  compact?: boolean
  // 当 type=json 时，rawValue 可保留用户未通过解析的输入
  rawValue?: string
  // 当 type=select 时的选项
  options?: Array<{ value: string; label?: string }>
  // 可选的焦点事件，便于上层在文本输入时加锁
  onFocus?: () => void
  onBlur?: () => void
  // 字段描述：在问号上悬浮显示
  desc?: string
}

// 统一的 Field 组件：
// - label 固定宽度
// - 错误时红色边框，并提供 title tooltip
// - 可清除按钮（颜色 / 文本 / JSON）
// - 数字上下键步进
// - JSON 模式下：解析（数组）失败不调用 onChange，只显示错误

// 校验 6 位十六进制颜色（#rrggbb）
const isValidHexColor = (v: any) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)

const Field: React.FC<FieldProps> = ({
  label,
  value,
  type = 'text',
  placeholder,
  min,
  max,
  step,
  error,
  onChange,
  onClear,
  className = '',
  disabled,
  rawValue,
  options,
  onFocus,
  onBlur,
  desc,
  compact = true
}) => {
  const isNumber = type === 'number'
  const isColor = type === 'color'
  const isCheckbox = type === 'checkbox'
  const isJson = type === 'json'
  const isTextarea = type === 'textarea'
  const isSelect = type === 'select'
  const showClear = !!onClear && !isCheckbox && value !== undefined && value !== '' && !disabled
  // 紧凑模式下给更合理的宽度，并禁止收缩，避免与输入重叠
  const labelWidthClass = compact ? 'w-20' : 'w-24'
  // 本地未提交值（延迟提交：Enter 或失焦触发 onChange）
  const [local, setLocal] = React.useState<any>(() => {
    if (isJson) return rawValue ?? JSON.stringify(value ?? [])
    return value ?? ''
  })
  React.useEffect(() => {
    // 外部值变化时同步本地显示（避免选择切换/撤销后不同步）
    if (isJson) setLocal(rawValue ?? JSON.stringify(value ?? []))
    else setLocal(value ?? '')
  }, [value, rawValue, isJson])

  const displayValue = isJson ? String(local ?? '') : String(local ?? '')
  // 为 color 输入提供安全值，避免传入 '' 触发浏览器警告
  const colorSafeValue = isColor ? (isValidHexColor(local) ? String(local) : '#000000') : undefined

  const commitIfNeeded = React.useCallback(() => {
    if (disabled) return
    // 空字符串：视为清除
    if (displayValue === '') {
      onChange('')
      return
    }
    if (isNumber) {
      const num = Number(local)
      if (Number.isNaN(num)) return // 非法数字，忽略提交
      let next = num
      if (min !== undefined) next = Math.max(min, next)
      if (max !== undefined) next = Math.min(max, next)
      onChange(Number(next))
      return
    }
    if (isJson) {
      // JSON 字段仅传递原始字符串，由上层解析与校验
      onChange(String(local))
      return
    }
    // 其他类型直接提交本地值
    onChange(local)
  }, [disabled, displayValue, isNumber, isJson, local, min, max, onChange])

  return (
    <div className={`flex items-center gap-1 group ${className}`}>
      <div
        className={`${labelWidthClass} flex items-center justify-end gap-1 text-right text-xs text-gray-600 dark:text-gray-400 select-none shrink-0`}
      >
        <label className="truncate" title={label}>
          {label}
        </label>
        {desc ? (
          <Tooltip content={desc}>
            <span
              className="inline-flex items-center justify-center w-4 h-4 text-[10px] leading-none text-gray-500 border border-gray-300 rounded-full cursor-help hover:bg-gray-50"
              aria-label="字段说明"
            >
              ?
            </span>
          </Tooltip>
        ) : null}
      </div>
      {isCheckbox ? (
        // 复选框：即时提交
        <input
          type="checkbox"
          placeholder={placeholder}
          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          checked={!!value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      ) : isColor ? (
        // 颜色选择器：使用 ChromePicker
        <ColorPicker value={value} onChange={onChange} disabled={disabled} className="flex-1 min-w-0" />
      ) : isSelect ? (
        <select
          className={`flex-1 min-w-0 px-1 py-0.5 rounded text-xs border dark:bg-gray-700 dark:border-gray-600 ${error ? 'border-red-400' : 'border-gray-300'} focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
          value={String(value ?? '')}
          disabled={disabled}
          title={error || ''}
          // 下拉：即时提交
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
        >
          {(options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label ?? opt.value}
            </option>
          ))}
        </select>
      ) : isTextarea ? (
        <textarea
          className={`flex-1 min-w-0 px-1 py-0.5 rounded text-xs border dark:bg-gray-700 dark:border-gray-600 ${error ? 'border-red-400' : 'border-gray-300'} focus:outline-none focus:ring-1 focus:ring-blue-400 min-h-[60px] resize-y disabled:cursor-not-allowed disabled:opacity-50`}
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          title={error || ''}
          onChange={(e) => {
            setLocal(e.target.value)
          }}
          onFocus={onFocus}
          onBlur={() => {
            onBlur?.()
            commitIfNeeded()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || e.shiftKey)) {
              /* allow newline with modifiers */ return
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              commitIfNeeded()
              ;(e.currentTarget as HTMLTextAreaElement).blur()
            }
          }}
        />
      ) : (
        <input
          className={`flex-1 min-w-0 px-1 py-0.5 rounded text-xs border dark:bg-gray-700 dark:border-gray-600 ${error ? 'border-red-400' : 'border-gray-300'} focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50`}
          type={isColor ? 'color' : isNumber ? 'number' : 'text'}
          value={isColor ? (colorSafeValue as string) : displayValue}
          placeholder={placeholder}
          min={isNumber ? min : undefined}
          max={isNumber ? max : undefined}
          step={isNumber ? (step ?? 1) : undefined}
          disabled={disabled}
          title={error || ''}
          onChange={(e) => {
            const raw = e.target.value
            setLocal(isColor ? raw : isNumber ? raw : raw)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitIfNeeded()
              ;(e.currentTarget as HTMLInputElement).blur()
              return
            }
            if (isNumber && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
              e.preventDefault()
              const cur = ((): number => {
                const parsed = Number(local)
                if (!Number.isNaN(parsed)) return parsed
                return typeof value === 'number' ? value : 0
              })()
              const delta = (step ?? 1) * (e.key === 'ArrowUp' ? 1 : -1)
              let next = cur + delta
              if (min !== undefined) next = Math.max(min, next)
              if (max !== undefined) next = Math.min(max, next)
              setLocal(Number(next.toFixed(6)))
            }
          }}
          onFocus={onFocus}
          onBlur={() => {
            onBlur?.()
            commitIfNeeded()
          }}
        />
      )}
      {showClear && (
        <button
          type="button"
          title="清除"
          onClick={onClear}
          disabled={disabled}
          className="opacity-60 hover:opacity-100 px-1 py-0.5 text-[10px] border rounded disabled:cursor-not-allowed disabled:opacity-50"
        >
          ×
        </button>
      )}
      {error && <span className="text-[10px] text-red-500 hidden group-hover:inline">&#9888;</span>}
    </div>
  )
}

export default Field
