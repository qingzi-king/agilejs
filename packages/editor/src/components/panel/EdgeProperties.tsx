/*
 * @Description: 面板基础图形
 * @Author: qingzi.wang
 * @Date: 2025-10-12 00:12:55
 * @LastEditTime: 2025-12-03 10:37:25
 */
import React from 'react'
import Field from './Field'
import LineDashField from './LineDashField'
import { edgeFieldSchemas, groupSchemas } from './schema'

export interface EdgeDraftSingle {
  id: string
  shape: string
  stroke?: string
  lineWidth?: number
  lineDash?: number[]
  lineCap?: 'butt' | 'round' | 'square' | ''
  lineJoin?: 'miter' | 'round' | 'bevel' | ''
  miterLimit?: number
  alpha?: number
  arrowSize?: number
  pipelineEnabled?: boolean
  outerColor?: string
  innerColor?: string
  outerWidth?: number
  innerWidth?: number | ''
  gap?: number | ''
  // legacy single gap
  outerGap?: number | ''
  innerGap?: number | ''
  // new separated gaps
  cornerRadius?: number
  flowEnabled?: boolean
  flowColor?: string
  flowSpeed?: number
  flowDirection?: 'forward' | 'reverse' | 'both'
  sourceArrowType?: 'solid' | 'hollow' | 'none'
  targetArrowType?: 'solid' | 'hollow' | 'none'
}
export interface EdgePropertiesProps {
  draft: EdgeDraftSingle
  mode: 'single' | 'multi'
  onCommit: (field: string, value: any) => void
  onFocusTextLike?: () => void
  onBlurTextLike?: () => void
}

const EdgeProperties: React.FC<EdgePropertiesProps> = ({ draft, mode, onCommit, onFocusTextLike, onBlurTextLike }) => {
  // 多选模式：在 hooks 之后再返回，避免 hooks 条件调用
  if (mode === 'multi')
    return (
      <div className="space-y-1">
        <div className="font-semibold text-xs text-gray-700 mb-1">多边</div>
        <div className="text-xs text-gray-600">批量编辑后续实现</div>
      </div>
    )

  const field = (schemaKey: string, opts?: { compact?: boolean; disabled?: boolean }) => {
    const schema = edgeFieldSchemas.find((s) => s.key === schemaKey)!
    const k = schema.key
    const val = (draft as any)[k]
    const error = schema.validate?.(val)
    const isTextLike = schema.type === 'text' || schema.type === 'textarea' || schema.type === 'json'
    const handleFieldChange = (v: any) => {
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
    }
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
        onChange={handleFieldChange}
        onClear={schema.clearable ? () => onCommit(k, '') : undefined}
        onFocus={isTextLike ? onFocusTextLike : undefined}
        onBlur={isTextLike ? onBlurTextLike : undefined}
      />
    )
  }

  return (
    <div className="space-y-1 pb-4">
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700">基础</div>
      <div className="grid grid-cols-2 gap-2">
        {groupSchemas(edgeFieldSchemas, 'edge-base').map((s) => {
          if (['id', 'shape'].includes(s.key)) {
            return (
              <div key={s.key} className="col-span-2">
                {field(s.key, { compact: true, disabled: s.disabled })}
              </div>
            )
          } else if (s.key === 'lineDash') {
            return null
          } else {
            return <div key={s.key}>{field(s.key, { compact: true, disabled: s.disabled })}</div>
          }
        })}
      </div>
      {/* 虚线样式：使用 LineDashField */}
      <LineDashField value={draft.lineDash} onChange={(value) => onCommit('lineDash', value)} />
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700">标签</div>
      <div className="grid grid-cols-2 gap-2">
        {groupSchemas(edgeFieldSchemas, 'edge-label').map((s) =>
          s.key === 'label' ? (
            <div key={s.key} className="col-span-2">
              {field(s.key, { compact: true })}
            </div>
          ) : (
            <div key={s.key}>{field(s.key, { compact: true })}</div>
          )
        )}
      </div>
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700 flex items-center">
        <span className="flex-1">管道</span>
        <label className="flex items-center gap-1 text-[10px] text-gray-600">
          <input
            type="checkbox"
            checked={!!draft.pipelineEnabled}
            onChange={(e) => onCommit('pipelineEnabled', e.target.checked)}
          />{' '}
          启用
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {groupSchemas(edgeFieldSchemas, 'edge-pipeline').map((s) => (
          <div key={s.key}>{field(s.key, { compact: true, disabled: !draft.pipelineEnabled })}</div>
        ))}
      </div>
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700 flex items-center">
        <span className="flex-1">流动</span>
        <label className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={!!draft.flowEnabled}
            onChange={(e) => onCommit('flowEnabled', e.target.checked)}
          />{' '}
          启用
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {groupSchemas(edgeFieldSchemas, 'edge-flow')
          .filter((s) => s.key !== 'flowDash')
          .map((s) => (
            <div key={s.key}>{field(s.key, { compact: true, disabled: !draft.flowEnabled })}</div>
          ))}
      </div>
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700">快捷</div>
      <div className="mt-1 flex flex-wrap gap-1">
        <button
          type="button"
          className="px-2.5 py-1 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          onClick={() => {
            onCommit('flowEnabled', false)
          }}
        >
          管道静止
        </button>
        <button
          type="button"
          className="px-2.5 py-1 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          onClick={() => {
            onCommit('lineDash', [20, 10])
            onCommit('flowSpeed', 160)
            onCommit('flowEnabled', true)
          }}
        >
          常规流
        </button>
      </div>
    </div>
  )
}

export default EdgeProperties
