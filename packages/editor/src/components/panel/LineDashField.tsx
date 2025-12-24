/*
 * @Description: 虚线样式字段组件 - 提供预设选择和自定义输入
 * @Author: qingzi.wang
 * @Date: 2025-11-18
 */
import React, { useState, useEffect } from 'react'

export interface LineDashFieldProps {
  value?: number[]
  onChange: (value: number[] | undefined) => void
  disabled?: boolean
  className?: string
}

// 预设虚线样式
const LINE_DASH_PRESETS: Record<string, number[] | undefined> = {
  solid: [0, 0],
  dashed: [6, 3],
  dotted: [1, 3],
  dashdot: [6, 3, 1, 3],
  longdash: [12, 6],
  dense: [3, 3]
}

const PRESET_OPTIONS = [
  { value: 'solid', label: '实线' },
  { value: 'dashed', label: '虚线(6/3)' },
  { value: 'dotted', label: '点线(1/3)' },
  { value: 'dashdot', label: '点划线(6/3/1/3)' },
  { value: 'longdash', label: '长虚线(12/6)' },
  { value: 'dense', label: '密虚线(3/3)' },
  { value: 'custom', label: '自定义' }
]

/**
 * 虚线样式字段组件
 *
 * 功能：
 * 1. 预设下拉选择（实线、虚线、点线等）
 * 2. 自定义 A/B 数值输入
 * 3. 自动匹配当前值对应的预设
 * 4. 输入校验与错误提示
 * 5. 清除按钮
 */
const LineDashField: React.FC<LineDashFieldProps> = ({ value, onChange, disabled, className = '' }) => {
  // 本地输入状态
  const [dashA, setDashA] = useState<string>('')
  const [dashB, setDashB] = useState<string>('')
  const [error, setError] = useState<string>('')

  // 当外部值变化时同步本地输入
  useEffect(() => {
    const arr = Array.isArray(value) ? value : []
    setDashA(arr[0] != null ? String(arr[0]) : '')
    setDashB(arr[1] != null ? String(arr[1]) : '')
    setError('')
  }, [value])

  // 标准化数组：去除无效值（全0视为实线）
  const normalizeArray = (arr?: number[]): number[] | undefined => {
    if (!arr) return undefined
    return arr.some((n) => (n || 0) > 0) ? arr : undefined
  }

  // 获取当前值对应的预设 key
  const getCurrentPresetKey = (): string => {
    const aNum = dashA === '' ? undefined : Number(dashA)
    const bNum = dashB === '' ? undefined : Number(dashB)

    if (aNum === undefined && bNum === undefined) return 'solid'

    const a = Number.isFinite(aNum as number) ? (aNum as number) : 0
    const b = Number.isFinite(bNum as number) ? (bNum as number) : 0

    // 默认使用输入框的值构造数组
    let currentArr = [a, b]

    // 修复：如果输入框的值与 props.value 的前两位一致，则优先使用 props.value (完整数组)
    // 这样可以正确匹配超过2位的预设（如 dashdot: [6,3,1,3]），避免被误判为 dashed [6,3]
    if (Array.isArray(value) && value.length >= 2) {
      const valA = value[0] ?? 0
      const valB = value[1] ?? 0
      if (valA === a && valB === b) {
        currentArr = value
      }
    }

    const matchKey = Object.keys(LINE_DASH_PRESETS).find((key) => {
      const preset = LINE_DASH_PRESETS[key]
      const normalizedPreset = normalizeArray(preset)
      const normalizedCurrent = normalizeArray(currentArr)

      if (!normalizedPreset && !normalizedCurrent) return true
      if (!normalizedPreset || !normalizedCurrent) return false
      return JSON.stringify(normalizedPreset) === JSON.stringify(normalizedCurrent)
    })

    return matchKey || 'custom'
  }

  // 处理预设选择
  const handlePresetChange = (key: string) => {
    const preset = LINE_DASH_PRESETS[key]

    if (!preset) {
      // 自定义模式：清空输入
      setDashA('')
      setDashB('')
      setError('')
      onChange(undefined)
    } else {
      // 应用预设
      setDashA(String(preset[0] ?? ''))
      setDashB(String(preset[1] ?? ''))
      setError('')
      onChange(preset)
    }
  }

  // 处理 A 输入变化
  const handleAChange = (raw: string) => {
    setDashA(raw)

    const aNum = raw === '' ? undefined : Number(raw)
    const bNum = dashB === '' ? undefined : Number(dashB)

    // 校验
    if ((aNum !== undefined && Number.isNaN(aNum)) || (bNum !== undefined && Number.isNaN(bNum))) {
      setError('必须为数字')
      return
    }

    setError('')

    // 提交值
    if (aNum === undefined && bNum === undefined) {
      onChange(undefined)
    } else {
      onChange([aNum || 0, bNum || 0])
    }
  }

  // 处理 B 输入变化
  const handleBChange = (raw: string) => {
    setDashB(raw)

    const aNum = dashA === '' ? undefined : Number(dashA)
    const bNum = raw === '' ? undefined : Number(raw)

    // 校验
    if ((aNum !== undefined && Number.isNaN(aNum)) || (bNum !== undefined && Number.isNaN(bNum))) {
      setError('必须为数字')
      return
    }

    setError('')

    // 提交值
    if (aNum === undefined && bNum === undefined) {
      onChange(undefined)
    } else {
      onChange([aNum || 0, bNum || 0])
    }
  }

  // 清除输入
  const handleClear = () => {
    setDashA('')
    setDashB('')
    setError('')
    onChange(undefined)
  }

  const currentPreset = getCurrentPresetKey()
  const showClear = (dashA || dashB) && !disabled

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <label className="w-20 text-right text-xs text-gray-600 dark:text-gray-400 shrink-0">虚线样式</label>
      <div className="flex-1 flex items-center gap-1 min-w-0">
        {/* 预设下拉 */}
        <select
          className="px-1 py-0.5 border rounded text-xs border-gray-300 dark:bg-gray-700 dark:border-gray-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          value={currentPreset}
          onChange={(e) => handlePresetChange(e.target.value)}
          disabled={disabled}
        >
          {PRESET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* A 输入 */}
        <input
          className={`w-11 px-1 py-0.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 ${
            error ? 'border-red-400' : 'border-gray-300'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          type="number"
          placeholder="A"
          value={dashA}
          onChange={(e) => handleAChange(e.target.value)}
          disabled={disabled}
        />
        <span className="text-xs text-gray-500">/</span>
        {/* B 输入 */}
        <input
          className={`w-11 px-1 py-0.5 border rounded text-xs dark:bg-gray-700 dark:border-gray-600 ${
            error ? 'border-red-400' : 'border-gray-300'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          type="number"
          placeholder="B"
          value={dashB}
          onChange={(e) => handleBChange(e.target.value)}
          disabled={disabled}
        />
        {/* 清除按钮 */}
        {showClear && (
          <button
            type="button"
            className="px-1 py-0.5 text-[10px] border rounded text-gray-500 hover:text-gray-700"
            onClick={handleClear}
            title="清除"
          >
            ×
          </button>
        )}
        {/* 错误提示 */}
        {error && <span className="text-[10px] text-red-500 ml-1">{error}</span>}
      </div>
    </div>
  )
}

export default LineDashField
