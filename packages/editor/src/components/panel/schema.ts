/*
 * @Description: 属性面板字段定义
 * @Author: qingzi.wang
 * @Date: 2025-09-24 15:46:39
 * @LastEditTime: 2025-12-09 09:26:44
 */
export type FieldType = 'text' | 'number' | 'color' | 'checkbox' | 'json' | 'textarea' | 'select'

export interface FieldSchema {
  key: string
  name?: string // 用于表单展示的名称（优先级高于 label；未设置则回退到 label，再回退到 key）
  label?: string
  type: FieldType
  group?: string // 分组：node-base / edge-base / edge-pipeline / edge-flow / canvas 等
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  placeholder?: string
  // 布局类等紧凑展示的短标签（如 width -> W）
  shortLabel?: string
  // 单位（仅展示用途，不参与校验与提交）
  unit?: string // 如 'px' | '%'
  // 当 type=select 时：提供选项
  options?: Array<{ value: string; label?: string }>
  // 校验：返回错误消息；无错误返回 undefined
  validate?: (value: any) => string | undefined
  // 预提交转换：原始输入 -> 提交值（成功才提交）
  transform?: (value: any) => any
  // 是否允许清除（空字符串）
  clearable?: boolean
  // 新增：字段描述/提示，将在面板中展示
  desc?: string
}

// 统一验证帮助器
const num = (min?: number, max?: number) => (v: any) => {
  if (v === '' || v === undefined || v === null) return undefined
  if (typeof v !== 'number' || Number.isNaN(v)) return '必须是数字'
  if (min !== undefined && v < min) return `不得小于${min}`
  if (max !== undefined && v > max) return `不得大于${max}`
  return undefined
}

// 透明度统一变换：clamp 到 [0,1] 并保留两位小数
const alphaTransform = (v: any) => {
  if (v === '' || v === undefined || v === null) return undefined
  const num = Number(v)
  const clamped = Math.min(1, Math.max(0, Number.isFinite(num) ? num : 0))
  return Math.round(clamped * 100) / 100
}

export const nodeFieldSchemas: FieldSchema[] = [
  { key: 'id', name: 'ID', type: 'text', group: 'node-base', disabled: true },
  { key: 'shape', name: '形状', type: 'text', group: 'node-base', disabled: true },
  {
    key: 'groupId',
    name: '分组号',
    type: 'text',
    group: 'node-base',
    clearable: true,
    placeholder: '所属分组ID，可选'
  },
  { key: 'x', name: 'X 轴', type: 'number', group: 'node-base', step: 1, validate: num() },
  { key: 'y', name: 'Y 轴', type: 'number', group: 'node-base', step: 1, validate: num() },
  { key: 'width', name: '宽度', type: 'number', group: 'node-base', step: 1, min: 0, validate: num(0) },
  { key: 'height', name: '高度', type: 'number', group: 'node-base', step: 1, min: 0, validate: num(0) },
  { key: 'rotation', name: '旋转角度', type: 'number', group: 'node-base', step: 1, validate: num() },
  { key: 'zIndex', name: '层级', type: 'number', group: 'node-base', step: 1, validate: num() },
  {
    key: 'selectable',
    name: '允许选中',
    type: 'checkbox',
    group: 'node-base',
    desc: '关闭后点击与框选都不会选中该节点'
  },
  { key: 'draggable', name: '允许拖拽', type: 'checkbox', group: 'node-base', desc: '关闭后节点无法拖动' },
  { key: 'resizable', name: '允许缩放', type: 'checkbox', group: 'node-base', desc: '关闭后节点无法调整大小' },
  { key: 'rotatable', name: '允许旋转', type: 'checkbox', group: 'node-base', desc: '关闭后节点无法旋转' },
  { key: 'isContainer', name: '允许容器', type: 'checkbox', group: 'node-base', desc: '开启后作为容器' },
  { key: 'fill', name: '填充颜色', type: 'color', group: 'node-style', clearable: true },
  { key: 'stroke', name: '轮廓颜色', type: 'color', group: 'node-style', clearable: true },
  { key: 'lineWidth', name: '边框宽度', type: 'number', group: 'node-style', min: 0, step: 1, validate: num(0, 999) },
  { key: 'borderRadius', name: '边框圆角', type: 'number', group: 'node-style', min: 0, step: 1, validate: num(0) },
  // { key: 'fillAlpha', name: '填充透明度', type: 'number', group: 'node-style', min: 0, max: 1, step: 0.05, validate: num(0,1), transform: alphaTransform },
  // { key: 'strokeAlpha', name: '描边透明度', type: 'number', group: 'node-style', min: 0, max: 1, step: 0.05, validate: num(0,1), transform: alphaTransform },
  {
    key: 'lineDash',
    name: '虚线样式',
    type: 'json',
    group: 'node-style',
    clearable: true,
    validate: (raw: any) => {
      if (raw === '' || raw === undefined) return undefined
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!Array.isArray(parsed)) return '必须为数组'
        if (!parsed.every((n) => typeof n === 'number')) return '数组元素需为数字'
        return undefined
      } catch (e: any) {
        return e.message || 'JSON 解析失败'
      }
    }
  },
  {
    key: 'lineCap',
    name: '端点样式',
    type: 'select',
    group: 'node-style',
    placeholder: 'butt',
    options: [{ value: '', label: '默认' }, { value: 'butt' }, { value: 'round' }, { value: 'square' }]
  },
  {
    key: 'lineJoin',
    name: '拐角样式',
    type: 'select',
    group: 'node-style',
    placeholder: 'miter',
    options: [{ value: '', label: '默认' }, { value: 'miter' }, { value: 'round' }, { value: 'bevel' }]
  },
  {
    key: 'miterLimit',
    name: '斜接限制',
    type: 'number',
    group: 'node-style',
    placeholder: '0',
    min: 0,
    step: 0.5,
    validate: num(0)
  },
  {
    key: 'alpha',
    name: '透明度',
    type: 'number',
    group: 'node-style',
    placeholder: '1',
    min: 0,
    max: 1,
    step: 0.05,
    validate: num(0, 1),
    transform: alphaTransform
  },
  // 线条进度（仅 line 节点使用；在面板中按条件渲染）
  {
    key: 'lineProgressRatio',
    name: '单向比例',
    type: 'number',
    group: 'node-line-progress',
    placeholder: '0~1',
    min: 0,
    max: 1,
    step: 0.01,
    validate: num(0, 1)
  },
  {
    key: 'lineProgressReverse',
    name: '反向',
    type: 'checkbox',
    group: 'node-line-progress',
    desc: '勾选后进度从终点开始，区间无效'
  },
  {
    key: 'lineProgressStartRatio',
    name: '区间起点',
    type: 'number',
    group: 'node-line-progress',
    placeholder: '0~1',
    min: 0,
    max: 1,
    step: 0.01,
    validate: num(0, 1)
  },
  {
    key: 'lineProgressEndRatio',
    name: '区间终点',
    type: 'number',
    group: 'node-line-progress',
    placeholder: '0~1',
    min: 0,
    max: 1,
    step: 0.01,
    validate: num(0, 1)
  },
  {
    key: 'lineProgressBaseColor',
    name: '底色',
    type: 'color',
    group: 'node-line-progress',
    placeholder: '可选',
    clearable: true
  },
  {
    key: 'lineProgressBaseAlphaScale',
    name: '底色α',
    type: 'number',
    group: 'node-line-progress',
    placeholder: '',
    min: 0,
    max: 1,
    step: 0.05,
    validate: num(0, 1)
  },
  {
    key: 'lineProgressColor',
    name: '进度色',
    type: 'color',
    group: 'node-line-progress',
    placeholder: '可选',
    clearable: true
  },
  // text 节点相关（UI 条件渲染，不在通用循环里）
  { key: 'text', name: '内容', type: 'textarea', group: 'node-text', placeholder: '输入文本内容', clearable: true },
  {
    key: 'fontSize',
    name: '字号',
    type: 'number',
    group: 'node-text',
    placeholder: '14',
    min: 1,
    max: 200,
    step: 1,
    validate: num(1, 200)
  },
  { key: 'color', name: '颜色', type: 'color', group: 'node-text', clearable: true },
  {
    key: 'fontWeight',
    name: '文本粗细',
    type: 'select',
    group: 'node-text',
    placeholder: 'normal',
    options: [
      { value: '', label: '默认' },
      { value: 'normal' },
      { value: '100' },
      { value: '200' },
      { value: '300' },
      { value: '400' },
      { value: '500' },
      { value: '600' },
      { value: '700' }
    ]
  },
  {
    key: 'strokeWidth',
    name: '轮廓宽度',
    type: 'number',
    group: 'node-text',
    placeholder: '0',
    min: 0,
    max: 50,
    step: 1,
    validate: num(0, 50)
  },
  {
    key: 'textAlign',
    name: '水平对齐',
    type: 'select',
    group: 'node-text',
    placeholder: 'center',
    options: [
      { value: '', label: '默认' },
      { value: 'left' },
      { value: 'center' },
      { value: 'right' },
      { value: 'start' },
      { value: 'end' }
    ]
  },
  {
    key: 'textBaseline',
    name: '垂直对齐',
    type: 'select',
    group: 'node-text',
    placeholder: 'middle',
    options: [
      { value: '', label: '默认' },
      { value: 'top' },
      { value: 'middle' },
      { value: 'bottom' },
      { value: 'hanging' },
      { value: 'ideographic' },
      { value: 'alphabetic' }
    ]
  },
  {
    key: 'padding',
    name: '内边距',
    type: 'number',
    group: 'node-text',
    placeholder: '0',
    min: 0,
    step: 1,
    validate: num(0)
  },
  // image 图片节点
  {
    key: 'src',
    name: '图片源',
    type: 'textarea',
    group: 'node-image',
    placeholder: 'URL 或 base64',
    clearable: true,
    desc: '支持图片 URL 或 base64 格式'
  },
  // 标签（通用节点标签样式与布局）
  {
    key: 'label',
    name: '标签名',
    type: 'textarea',
    group: 'node-label',
    placeholder: '输入标签文本内容',
    clearable: true
  },
  {
    key: 'labelFontSize',
    name: '字号',
    type: 'number',
    group: 'node-label',
    placeholder: '12',
    min: 1,
    max: 200,
    step: 1,
    validate: num(1, 200)
  },
  {
    key: 'labelPosition',
    name: '标签位置',
    type: 'select',
    group: 'node-label',
    placeholder: 'center',
    options: [
      { value: '', label: '默认' },
      { value: 'center' },
      { value: 'top' },
      { value: 'bottom' },
      { value: 'left' },
      { value: 'right' }
    ]
  },
  {
    key: 'labelOffsetX',
    name: '水平偏移',
    type: 'number',
    group: 'node-label',
    placeholder: '0',
    step: 1,
    validate: num()
  },
  {
    key: 'labelOffsetY',
    name: '垂直偏移',
    type: 'number',
    group: 'node-label',
    placeholder: '0',
    step: 1,
    validate: num()
  },
  {
    key: 'labelPaddingX',
    name: '水平内边距',
    type: 'number',
    group: 'node-label',
    placeholder: '0',
    min: 0,
    step: 1,
    validate: num(0)
  },
  {
    key: 'labelPaddingY',
    name: '垂直内边距',
    type: 'number',
    group: 'node-label',
    placeholder: '0',
    min: 0,
    step: 1,
    validate: num(0)
  },
  { key: 'labelColor', name: '文本颜色', type: 'color', group: 'node-label', clearable: true },
  // { key: 'labelAlpha', name: '标签透明度', type: 'number', group: 'node-label', min: 0, max: 1, step: 0.05, validate: num(0,1), transform: alphaTransform },
  { key: 'labelBackground', name: '填充颜色', type: 'color', group: 'node-label', clearable: true },
  // { key: 'labelBackgroundAlpha', name: '背景透明度', type: 'number', group: 'node-label', min: 0, max: 1, step: 0.05, validate: num(0,1), transform: alphaTransform },
  {
    key: 'labelFontWeight',
    name: '字重',
    type: 'select',
    group: 'node-label',
    placeholder: 'normal',
    options: [
      { value: '', label: '默认' },
      { value: 'normal' },
      { value: '100' },
      { value: '200' },
      { value: '300' },
      { value: '400' },
      { value: '500' },
      { value: '600' },
      { value: '700' }
    ]
  },
  // { key: 'labelFontFamily', name: '字体', type: 'text', group: 'node-label' },
  {
    key: 'labelFontStyle',
    name: '字体样式',
    type: 'select',
    group: 'node-label',
    placeholder: 'normal',
    options: [{ value: '', label: '默认' }, { value: 'normal' }, { value: 'italic' }, { value: 'oblique' }]
  },
  {
    key: 'labelTextOverflow',
    name: '溢出策略',
    type: 'select',
    group: 'node-label',
    placeholder: 'wrap',
    options: [
      { value: '', label: '默认' },
      { value: 'wrap', label: '自动换行' },
      { value: 'ellipsis', label: '省略号' }
    ]
  },
  {
    key: 'labelMaxWidth',
    name: '最大宽度',
    type: 'number',
    group: 'node-label',
    placeholder: '可选',
    min: 1,
    step: 1,
    validate: num(1)
  },
  {
    key: 'labelBackgroundStrokeWidth',
    name: '背景边框宽度',
    type: 'number',
    group: 'node-label',
    placeholder: '0',
    min: 0,
    max: 50,
    step: 1,
    validate: num(0, 50)
  },
  { key: 'labelBackgroundStroke', name: '背景边框颜色', type: 'color', group: 'node-label', clearable: true },
  {
    key: 'labelLineHeight',
    name: '行高(相对)',
    type: 'number',
    group: 'node-label',
    placeholder: '1.2',
    min: 0.8,
    max: 3,
    step: 0.1,
    validate: num(0.8, 3)
  },
  {
    key: 'labelLineHeightPx',
    name: '行高(像素)',
    type: 'number',
    group: 'node-label',
    placeholder: '可选',
    min: 1,
    max: 400,
    step: 1,
    validate: num(1, 400)
  },
  {
    key: 'labelRotateWithNode',
    name: '跟随旋转',
    type: 'checkbox',
    group: 'node-label',
    desc: '勾选后标签会跟随节点一起旋转'
  },
  // 边框流动
  {
    key: 'nodeFlowSpeed',
    name: '速度(px/s)',
    type: 'number',
    group: 'node-borderFlow',
    min: 1,
    step: 1,
    validate: num(1)
  },
  {
    key: 'nodeFlowDirection',
    name: '流动方向',
    type: 'select',
    group: 'node-borderFlow',
    placeholder: '顺时针',
    options: [
      { value: '', label: '默认' },
      { value: 'cw', label: '顺时针' },
      { value: 'ccw', label: '逆时针' }
    ]
  },
  // 闪烁效果
  {
    key: 'blinkMin',
    name: 'min α',
    type: 'number',
    group: 'node-blink',
    placeholder: '0.25',
    min: 0,
    max: 1,
    step: 0.05,
    validate: num(0, 1),
    transform: alphaTransform
  },
  {
    key: 'blinkMax',
    name: 'max α',
    type: 'number',
    group: 'node-blink',
    placeholder: '1',
    min: 0,
    max: 1,
    step: 0.05,
    validate: num(0, 1),
    transform: alphaTransform
  },
  {
    key: 'blinkPeriod',
    name: '周期(ms)',
    type: 'number',
    group: 'node-blink',
    placeholder: '800',
    min: 1,
    max: 4000,
    step: 100,
    validate: num(1, 4000)
  }
]

export const edgeFieldSchemas: FieldSchema[] = [
  { key: 'id', name: 'ID', type: 'text', group: 'edge-base', disabled: true },
  {
    key: 'shape',
    name: '形状',
    type: 'select',
    group: 'edge-base',
    options: [
      { value: 'edge-straight', label: '直线' },
      { value: 'edge-bezier', label: '贝塞尔曲线' },
      { value: 'edge-orthogonal', label: '正交直线' },
      { value: 'edge-polyline', label: '折线' }
    ]
  },
  { key: 'lineWidth', name: '线宽', type: 'number', group: 'edge-base', min: 0, step: 1, validate: num(0, 999) },
  { key: 'stroke', name: '轮廓颜色', type: 'color', group: 'edge-base', clearable: true },
  // 线型（与节点保持一致的命名与校验）
  {
    key: 'lineDash',
    name: '虚线样式',
    type: 'json',
    group: 'edge-base',
    clearable: true,
    validate: (raw: any) => {
      if (raw === '' || raw === undefined) return undefined
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!Array.isArray(parsed)) return '必须为数组'
        if (!parsed.every((n: any) => typeof n === 'number')) return '数组元素需为数字'
        return undefined
      } catch (e: any) {
        return e.message || 'JSON 解析失败'
      }
    }
  },
  {
    key: 'lineCap',
    name: '端点样式',
    type: 'select',
    group: 'edge-base',
    placeholder: 'butt',
    options: [{ value: '', label: '默认' }, { value: 'butt' }, { value: 'round' }, { value: 'square' }]
  },
  {
    key: 'lineJoin',
    name: '拐角样式',
    type: 'select',
    group: 'edge-base',
    placeholder: 'miter',
    options: [{ value: '', label: '默认' }, { value: 'miter' }, { value: 'round' }, { value: 'bevel' }]
  },
  {
    key: 'sourceArrowType',
    name: '起点箭头',
    type: 'select',
    group: 'edge-base',
    options: [
      { value: 'solid', label: '实心三角' },
      { value: 'hollow', label: '空心三角' },
      { value: 'none', label: '无' }
    ]
  },
  {
    key: 'targetArrowType',
    name: '终点箭头',
    type: 'select',
    group: 'edge-base',
    options: [
      { value: 'solid', label: '实心三角' },
      { value: 'hollow', label: '空心三角' },
      { value: 'none', label: '无' }
    ]
  },
  {
    key: 'arrowSize',
    name: '箭头大小',
    type: 'number',
    group: 'edge-base',
    placeholder: '0',
    min: 0,
    step: 1,
    validate: num(0)
  },
  {
    key: 'miterLimit',
    name: '斜接限制',
    type: 'number',
    group: 'edge-base',
    placeholder: '0',
    min: 0,
    step: 0.5,
    validate: num(0)
  },
  {
    key: 'label',
    name: '标签名',
    type: 'textarea',
    group: 'edge-label',
    placeholder: '请输入标签文本内容',
    clearable: true
  },
  // 边标签样式（精简版）
  {
    key: 'labelFontSize',
    name: '字号',
    type: 'number',
    group: 'edge-label',
    placeholder: '12',
    min: 1,
    max: 200,
    step: 1,
    validate: num(1, 200)
  },
  { key: 'labelColor', name: '文本颜色', type: 'color', group: 'edge-label', clearable: true },
  { key: 'labelBackground', name: '填充颜色', type: 'color', group: 'edge-label', clearable: true },
  // { key: 'labelBackgroundAlpha', name: '标签背景透明度', type: 'number', group: 'edge-label', min: 0, max: 1, step: 0.05, validate: num(0,1), transform: alphaTransform },
  { key: 'outerColor', name: '外框颜色', type: 'color', group: 'edge-pipeline', clearable: true },
  { key: 'innerColor', name: '内框颜色', type: 'color', group: 'edge-pipeline', clearable: true },
  {
    key: 'outerWidth',
    name: '外框宽度',
    type: 'number',
    group: 'edge-pipeline',
    placeholder: '14',
    min: 1,
    step: 1,
    validate: num(1)
  },
  {
    key: 'innerWidth',
    name: '内框宽度',
    type: 'number',
    group: 'edge-pipeline',
    placeholder: '9',
    min: 0,
    step: 1,
    validate: num(0)
  },
  {
    key: 'gap',
    name: '内外间隔',
    type: 'number',
    group: 'edge-pipeline',
    placeholder: '0',
    min: 0,
    step: 1,
    validate: num(0),
    desc: '仅在未提供 innerWidth 时生效：innerWidth = outerWidth - 2×gap（最小 1px）'
  },
  {
    key: 'stub',
    name: '端点冗距',
    type: 'number',
    group: 'edge-pipeline',
    placeholder: '20',
    min: 0,
    step: 1,
    validate: num(0)
  },
  {
    key: 'cornerRadius',
    name: '拐点圆角',
    type: 'number',
    group: 'edge-pipeline',
    placeholder: '3',
    min: 0,
    step: 1,
    validate: num(0)
  },
  // { key: 'flowEnabled', name: '是否启动流动', type: 'checkbox', group: 'edge-flow' },
  { key: 'flowColor', name: '流动颜色', type: 'color', group: 'edge-flow', clearable: true },
  {
    key: 'flowDirection',
    name: '流动方向',
    type: 'select',
    group: 'edge-flow',
    options: [
      { value: 'forward', label: '正向 →' },
      { value: 'reverse', label: '反向 ←' },
      { value: 'both', label: '双向 ↔' }
    ]
  },
  // flowDash 原始 JSON 字段移除，改为 EdgeProperties 中的 A/B 输入体验
  { key: 'flowSpeed', name: '速度(px/s)', type: 'number', group: 'edge-flow', min: 0, step: 1, validate: num(0) }
]

export const canvasFieldSchemas: FieldSchema[] = [
  { key: 'background', name: '背景颜色', type: 'color', group: 'canvas-base', clearable: true },
  { key: 'gridVisible', name: '显示网格', type: 'checkbox', group: 'canvas-base' },
  {
    key: 'gridType',
    name: '网格类型',
    type: 'select',
    group: 'canvas-base',
    options: [
      { value: 'line', label: '线条' },
      { value: 'dot', label: '点状' }
    ]
  },
  {
    key: 'gridSize',
    name: '网格大小',
    type: 'number',
    group: 'canvas-base',
    min: 0,
    step: 1,
    validate: num(0),
    desc: '设置为 0 则不显示网格'
  },
  { key: 'gridColor', name: '网格颜色', type: 'color', group: 'canvas-base', clearable: true },
  {
    key: 'gridAlpha',
    name: '网格透明度',
    type: 'number',
    group: 'canvas-base',
    min: 0,
    max: 1,
    step: 0.05,
    validate: num(0, 1)
  },
  { key: 'guidesVisible', name: '显示对齐线', type: 'checkbox', group: 'canvas-base' },
  {
    key: 'guidesThreshold',
    name: '对齐阈值',
    type: 'number',
    group: 'canvas-base',
    min: 0,
    max: 10,
    step: 1,
    validate: num(0, 10)
  },
  // 全局交互控制
  { key: 'enablePan', name: '允许平移', type: 'checkbox', group: 'canvas-interaction', desc: '关闭后画布无法拖动平移' },
  {
    key: 'enableZoom',
    name: '允许缩放',
    type: 'checkbox',
    group: 'canvas-interaction',
    desc: '关闭后画布无法缩放（鼠标滚轮/触控板）'
  },
  {
    key: 'enableSelection',
    name: '允许节点选中',
    type: 'checkbox',
    group: 'canvas-interaction',
    desc: '关闭后所有图形都无法被选中'
  },
  {
    key: 'enableDrag',
    name: '允许节点拖拽',
    type: 'checkbox',
    group: 'canvas-interaction',
    desc: '关闭后所有图形都无法被拖动'
  },
  {
    key: 'enableResize',
    name: '允许节点缩放',
    type: 'checkbox',
    group: 'canvas-interaction',
    desc: '关闭后所有节点无法调整大小'
  },
  {
    key: 'enableRotate',
    name: '允许节点旋转',
    type: 'checkbox',
    group: 'canvas-interaction',
    desc: '关闭后所有节点无法旋转'
  }
]

export function groupSchemas<T extends FieldSchema>(schemas: T[], group: string): T[] {
  return schemas.filter((s) => s.group === group)
}
