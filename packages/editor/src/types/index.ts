/*
 * @Description: 类型定义
 * @Author: qingzi.wang
 * @Date: 2025-09-16 19:34:46
 * @LastEditTime: 2025-10-12 00:33:19
 */

// 图形面板的类型
export type PaletteItem = {
  key: string
  label: string
  // 允许边类型进入面板（以 edge- 开头），例如 'edge-polyline'
  shape:
    | 'rect'
    | 'rounded-rect'
    | 'circle'
    | 'diamond'
    | 'text'
    | 'svg'
    | 'star'
    | 'triangle'
    | 'hexagon'
    | 'cylinder'
    | 'parallelogram'
    | 'ellipse'
    | 'semicircle'
    | 'trapezoid'
    | 'right-arrow'
    | 'double-arrow'
    | 'cloud'
    | 'sector'
    | 'pentagon'
    | 'octagon'
    | 'right-triangle'
    | 'cross'
    | 'corner'
    | 'edge-polyline'
    | 'line'
    | 'image'
  preview?: React.ReactNode
  disabled?: boolean
  payload?: Record<string, any>
}

// 图形面板分组类型
export type PaletteGroup = {
  key: string
  title: string
  items: PaletteItem[]
}
