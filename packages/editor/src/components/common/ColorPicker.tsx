/*
 * @Description: 颜色选择器组件（基于 react-color ChromePicker）
 * @Author: qingzi.wang
 * @Date: 2025-11-14
 */
import React, { useState, useRef, useEffect } from 'react'
import { ChromePicker, ColorResult } from 'react-color'

export interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
  className?: string
}

/**
 * 颜色选择器组件
 * - 点击色块显示/隐藏 ChromePicker 面板
 * - 点击外部自动关闭面板
 * - 支持 #rrggbb 格式
 */
const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, disabled, className = '' }) => {
  const [showPicker, setShowPicker] = useState(false)
  const [pickerPosition, setPickerPosition] = useState({ top: '100%', left: 0, right: 'auto', bottom: 'auto' })
  const pickerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // 计算选择器位置
  const calculatePosition = () => {
    if (!buttonRef.current) return { top: '100%', left: 0, right: 'auto', bottom: 'auto' }

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // ChromePicker 的大致尺寸
    const pickerWidth = 240
    const pickerHeight = 250
    const position: any = {}

    // 水平方向：检查右侧是否有足够空间
    if (buttonRect.left + pickerWidth > viewportWidth) {
      // 右侧空间不足，尝试右对齐
      position.right = 0
      position.left = 'auto'
    } else {
      // 默认左对齐
      position.left = 0
      position.right = 'auto'
    }

    // 垂直方向：检查下方是否有足够空间
    if (buttonRect.bottom + pickerHeight > viewportHeight) {
      // 下方空间不足，显示在上方
      position.bottom = '100%'
      position.top = 'auto'
    } else {
      // 默认显示在下方
      position.top = '100%'
      position.bottom = 'auto'
    }

    return position
  }

  // 处理打开选择器
  const handleTogglePicker = () => {
    if (disabled) return
    if (!showPicker) {
      // 打开前先计算位置
      const position = calculatePosition()
      setPickerPosition(position)
    }
    setShowPicker(!showPicker)
  }

  // 点击外部关闭面板
  useEffect(() => {
    if (!showPicker) return

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPicker])

  const handleChange = (color: ColorResult) => {
    const { r, g, b, a } = color.rgb
    onChange(`rgba(${r}, ${g}, ${b}, ${a ?? 1})`) // 支持 Alpha 值
  }

  // 确保颜色值合法，否则使用默认值
  const safeColor =
    /^#[0-9a-fA-F]{6}$/.test(value) ||
    /^rgb\(\d+, \d+, \d+\)$/.test(value) ||
    /^rgba\(\d+, \d+, \d+, (0|1|0?\.\d+)\)$/.test(value)
      ? value
      : '#FFFFFF'

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        className="w-full h-6 px-2 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-600"
        style={{ backgroundColor: safeColor }}
        onClick={handleTogglePicker}
        disabled={disabled}
        title={safeColor}
      />
      {showPicker && !disabled && (
        <div
          ref={pickerRef}
          className="absolute z-50"
          style={{
            top: pickerPosition.top,
            bottom: pickerPosition.bottom,
            left: pickerPosition.left,
            right: pickerPosition.right,
            marginTop: pickerPosition.top === '100%' ? '4px' : undefined,
            marginBottom: pickerPosition.bottom === '100%' ? '4px' : undefined
          }}
        >
          <ChromePicker color={safeColor} onChange={handleChange} />
        </div>
      )}
    </div>
  )
}

export default ColorPicker
