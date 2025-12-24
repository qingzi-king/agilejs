import React from 'react'

export interface CustomDataEditorHandle {
  save: () => void
  reset: () => void
  isDirty: () => boolean
}

export interface CustomDataEditorProps {
  value?: Record<string, any>
  onChange: (next: Record<string, any>) => void
}

type Row = { key: string; raw: string }

function toRows(record?: Record<string, any>): Row[] {
  if (!record) return []
  return Object.entries(record).map(([k, v]) => ({
    key: k,
    raw: v == null ? '' : typeof v === 'string' ? v : String(v)
  }))
}

function rowsToRecord(rows: Row[]): Record<string, any> {
  const out: Record<string, any> = {}
  for (const r of rows) {
    const k = (r.key || '').trim()
    if (!k) continue
    out[k] = r.raw
  }
  return out
}

const CustomDataEditor = React.forwardRef<CustomDataEditorHandle, CustomDataEditorProps>(({ value, onChange }, ref) => {
  const [rows, setRows] = React.useState<Row[]>(() => toRows(value))
  const rowsRef = React.useRef<Row[]>(rows)
  const setRowsSafe = (next: Row[]) => {
    rowsRef.current = next
    setRows(next)
  }
  // 脏标记：本地编辑未保存
  const [dirty, setDirty] = React.useState<boolean>(false)
  // 基线：最近一次接受的外部值（用于重置与比较）
  const baseRowsRef = React.useRef<Row[]>(toRows(value))

  React.useEffect(() => {
    // 外部值变化：若当前未处于本地编辑（非脏），则接受并重建；否则忽略
    const incomingRows = toRows(value)
    if (!dirty) {
      setRowsSafe(incomingRows)
      baseRowsRef.current = incomingRows
    }
  }, [value, dirty])

  // 向上提交当前本地 rows（过滤空 key）
  const emit = React.useCallback(() => {
    onChange(rowsToRecord(rowsRef.current))
    setDirty(false)
    baseRowsRef.current = rowsRef.current
  }, [onChange])

  const addRow = () => {
    setRowsSafe([...(rowsRef.current || []), { key: '', raw: '' }])
    setDirty(true)
  }

  const removeRow = (idx: number) => {
    const next = rowsRef.current.slice()
    next.splice(idx, 1)
    setRowsSafe(next)
    setDirty(true)
  }

  const updateRow = (idx: number, patch: Partial<Row>) => {
    const next = rowsRef.current.slice()
    const cur = { ...next[idx], ...patch } as Row
    next[idx] = cur
    setRowsSafe(next)
    setDirty(true)
  }

  React.useImperativeHandle(
    ref,
    () => ({
      save: emit,
      reset: () => {
        setRowsSafe(baseRowsRef.current)
        setDirty(false)
      },
      isDirty: () => dirty
    }),
    [emit, dirty]
  )

  return (
    <div className="space-y-1">
      <div className="mt-1 font-medium text-[11px] text-gray-700">自定义数据</div>
      <div className="text-[10px] text-gray-500">以 key-value 形式存储到 data.custom；值以纯文本保存。</div>
      <div className="flex flex-col gap-1">
        {rows.map((r, idx) => (
          <div key={idx} className="flex items-start gap-1">
            <input
              className="w-32 px-1 py-0.5 border rounded text-[11px] border-gray-300 dark:bg-gray-700 dark:border-gray-600"
              placeholder="key"
              value={r.key}
              onChange={(e) => updateRow(idx, { key: e.target.value })}
            />
            <textarea
              rows={1}
              className={
                'flex-1 px-1 py-0.5 border rounded text-[11px] h-6 border-gray-300 resize-y dark:bg-gray-700 dark:border-gray-600'
              }
              placeholder="值"
              value={r.raw}
              onChange={(e) => updateRow(idx, { raw: e.target.value })}
            />
            <button
              type="button"
              className="px-1 py-0.5 text-[10px] border rounded text-gray-500 hover:text-gray-700 cursor-pointer"
              onClick={() => removeRow(idx)}
            >
              ×
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 text-[11px] border rounded bg-green-500 border-green-500 text-white hover:bg-green-600 cursor-pointer"
            onClick={addRow}
          >
            新增条目
          </button>
          <button
            type="button"
            className="px-2 py-1 text-[11px] border border-blue-600 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={emit}
            disabled={!dirty}
          >
            保存数据
          </button>
          <button
            type="button"
            className="px-2 py-1 text-[11px] border rounded text-gray-500 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              setRowsSafe(baseRowsRef.current)
              setDirty(false)
            }}
            disabled={!dirty}
          >
            重置更改
          </button>
        </div>
      </div>
    </div>
  )
})

export default CustomDataEditor
