/*
 * @Description: 面板基础图形
 * @Author: qingzi.wang
 * @Date: 2025-10-12 00:12:55
 * @LastEditTime: 2025-12-25 16:49:08
 */
import React from 'react'
import Field from './Field'
import LineDashField from './LineDashField'
import { nodeFieldSchemas, groupSchemas } from './schema'
import type { CanvasEngine } from '@fnt-agilejs/core'
import {
  bringNodesToFront,
  sendNodesToBack,
  moveNodesUp,
  moveNodesDown
} from '@fnt-agilejs/core/dist/commands/GraphCommands'

export interface NodeDraftSingle {
  id: string
  shape: string
  mode?: string
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  zIndex?: number
  selectable?: boolean
  draggable?: boolean
  isContainer?: boolean
  fill?: string
  stroke?: string
  lineWidth?: number
  borderRadius?: number
  // 线型
  lineDash?: number[]
  lineCap?: 'butt' | 'round' | 'square' | ''
  lineJoin?: 'miter' | 'round' | 'bevel' | ''
  miterLimit?: number
  fillAlpha?: number
  strokeAlpha?: number
  alpha?: number
  label?: string
  text?: string
  groupId?: string
  fontSize?: number
  fontWeight?: string | number
  strokeWidth?: number
  textAlign?: string
  textBaseline?: string
  color?: string
  // image 图片节点
  src?: string
  // 边框流动
  nodeFlowEnabled?: boolean
  nodeFlowSpeed?: number
  nodeFlowDirection?: 'cw' | 'ccw'
  // 线条进度（仅 line）
  lineProgressEnabled?: boolean
  lineProgressRatio?: number
  lineProgressStartRatio?: number
  lineProgressEndRatio?: number
  lineProgressReverse?: boolean
  lineProgressColor?: string
  lineProgressBaseColor?: string
  lineProgressBaseAlphaScale?: number
  // 闪烁效果
  blinkEnabled?: boolean
  blinkPeriod?: number
  blinkMin?: number
  blinkMax?: number
}
export interface NodePropertiesProps {
  draft: NodeDraftSingle
  mode: 'single' | 'multi'
  onCommit: (field: string, value: any) => void
  engine: CanvasEngine | null
  // 文本类输入聚焦/失焦回调（用于暂停/恢复属性面板自动同步）
  onFocusTextLike?: () => void
  onBlurTextLike?: () => void
}

const NodeProperties: React.FC<NodePropertiesProps> = ({
  draft,
  mode,
  onCommit,
  engine,
  onFocusTextLike,
  onBlurTextLike
}) => {
  // 无锚点本地编辑状态（按需可再次开启）
  const selectedIds = React.useMemo(() => {
    if (!engine) return [] as string[]
    return engine.graph
      .getNodes()
      .filter((n) => n.selected)
      .map((n) => n.id)
  }, [engine])

  if (mode === 'multi') {
    return (
      <div className="space-y-1">
        <div className="font-semibold text-xs text-gray-700 mb-1">多节点</div>
        <div className="text-xs text-gray-600">暂仅支持统一填充/描边（后续扩展）</div>
      </div>
    )
  }

  // 所有标签名都由 schema 的 field() 渲染负责，移除手动 nameOf
  const field = (schemaKey: string, opts?: { compact?: boolean; disabled?: boolean }) => {
    const schema = nodeFieldSchemas.find((s) => s.key === schemaKey)!
    const k = schema.key
    const val = (draft as any)[k]
    const error = schema.validate?.(val)
    const isTextLike = schema.type === 'text' || schema.type === 'textarea' || schema.type === 'json'
    const handleFieldChange = (v: any) => {
      if (v === '') {
        onCommit(k, '')
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
      {/* 基础：使用 Field 两列紧凑展示（groupId 占满两列） */}
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700">基础</div>
      <div className="grid grid-cols-2 gap-2">
        {groupSchemas(nodeFieldSchemas, 'node-base').map((s) =>
          ['id', 'shape', 'groupId'].includes(s.key) ? (
            <div key={s.key} className="col-span-2">
              {field(s.key, { compact: true, disabled: s.disabled })}
            </div>
          ) : (
            <div key={s.key}>{field(s.key, { compact: true, disabled: s.disabled })}</div>
          )
        )}
      </div>
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700">样式</div>
      <div className="grid grid-cols-2 gap-2">
        {groupSchemas(nodeFieldSchemas, 'node-style').map((s) =>
          s.key === 'lineDash' ? null : <div key={s.key}>{field(s.key, { compact: true })}</div>
        )}
      </div>

      {/* 虚线样式：使用独立组件 */}
      <LineDashField value={draft.lineDash} onChange={(value) => onCommit('lineDash', value)} />
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700">文本</div>
      <div className="grid grid-cols-2 gap-2">
        {groupSchemas(nodeFieldSchemas, 'node-text').map((s) =>
          s.key === 'text' ? (
            <div key={s.key} className="col-span-2">
              {field(s.key, { compact: true })}
            </div>
          ) : (
            <div key={s.key}>{field(s.key, { compact: true })}</div>
          )
        )}
      </div>
      {/* 图片配置：仅在 image 节点显示 */}
      {draft.shape === 'image' && (
        <>
          <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700">图片</div>
          <div className="space-y-2">
            {groupSchemas(nodeFieldSchemas, 'node-image').map((s) => (
              <div key={s.key}>{field(s.key, { compact: true })}</div>
            ))}
          </div>
        </>
      )}
      {/* 闪烁控制 */}
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700 flex items-center">
        <span className="flex-1">闪烁</span>
        <label className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!engine || !draft.id}
            checked={!!draft.blinkEnabled}
            onChange={(e) => onCommit('blinkEnabled', e.target.checked)}
          />{' '}
          启用
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {groupSchemas(nodeFieldSchemas, 'node-blink').map((s) => (
          <div key={s.key}>{field(s.key, { compact: true, disabled: !draft.blinkEnabled })}</div>
        ))}
      </div>
      {/* 边框流动 */}
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700 flex items-center">
        <span className="flex-1">边框流动</span>
        <label className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={!!draft.nodeFlowEnabled}
            onChange={(e) => onCommit('nodeFlowEnabled', e.target.checked)}
          />{' '}
          启用
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {groupSchemas(nodeFieldSchemas, 'node-borderFlow').map((s) => (
          <div key={s.key}>{field(s.key, { compact: true, disabled: !draft.nodeFlowEnabled })}</div>
        ))}
      </div>
      {/* 线条进度控制：仅在直线节点显示 */}
      {draft.shape === 'line' && (
        <>
          <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700 flex items-center">
            <span className="flex-1">线条进度</span>
            <label className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                className="cursor-pointer"
                checked={!!draft.lineProgressEnabled}
                onChange={(e) => onCommit('lineProgressEnabled', e.target.checked)}
              />{' '}
              启用
            </label>
          </div>
          {/* 改为 schema 驱动，两列布局；禁用态取决于启用开关 */}
          <div className="grid grid-cols-2 gap-2">
            {groupSchemas(nodeFieldSchemas, 'node-line-progress').map((s) => (
              <div key={s.key}>{field(s.key, { compact: true, disabled: !draft.lineProgressEnabled })}</div>
            ))}
          </div>
        </>
      )}
      {/* 标签样式与布局 */}
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700">标签</div>
      <div className="grid grid-cols-2 gap-2">
        {groupSchemas(nodeFieldSchemas, 'node-label').map((s) =>
          s.key === 'label' ? (
            <div key={s.key} className="col-span-2">
              {field(s.key, { compact: true })}
            </div>
          ) : (
            <div key={s.key}>{field(s.key, { compact: true })}</div>
          )
        )}
      </div>
      <div className="mt-2 mb-2 font-bold dark:text-gray-500 text-xs text-gray-700">快捷</div>
      <div className="mt-1 flex flex-wrap gap-1">
        <button
          type="button"
          className="px-2.5 py-1 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          onClick={() => onCommit('rotation', 0)}
        >
          旋转归零
        </button>
        <button
          type="button"
          title="置顶 (Cmd+])"
          className="px-2.5 py-1 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          disabled={!engine || !selectedIds.length}
          onClick={() => {
            if (!engine) return
            bringNodesToFront(engine.graph, selectedIds, (engine as any).history)
          }}
        >
          置顶
        </button>
        <button
          type="button"
          title="上移一层 (Shift+Cmd+])"
          className="px-2.5 py-1 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          disabled={!engine || !selectedIds.length}
          onClick={() => {
            if (!engine) return
            moveNodesUp(engine.graph, selectedIds, (engine as any).history)
          }}
        >
          上移一层
        </button>
        <button
          type="button"
          title="下移一层 (Shift+Cmd+[)"
          className="px-2.5 py-1 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          disabled={!engine || !selectedIds.length}
          onClick={() => {
            if (!engine) return
            moveNodesDown(engine.graph, selectedIds, (engine as any).history)
          }}
        >
          下移一层
        </button>
        <button
          type="button"
          title="置底 (Cmd+[)"
          className="px-2.5 py-1 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          disabled={!engine || !selectedIds.length}
          onClick={() => {
            if (!engine) return
            sendNodesToBack(engine.graph, selectedIds, (engine as any).history)
          }}
        >
          置底
        </button>
      </div>
    </div>
  )
}

export default NodeProperties
