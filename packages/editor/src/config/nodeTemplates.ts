/*
 * @Description: 集中管理各形状的默认尺寸、样式与端口生成
 * @Author: qingzi.wang
 * @Date: 2025-10-12 00:12:55
 * @LastEditTime: 2025-11-22 23:33:17
 */
export interface NodeBasePartial {
  shape: string
  size: { width: number; height: number }
  data?: any // 保持宽松，兼容引擎的数据结构（style 等）
  ports?: Array<{ id: string; offset: { x: number; y: number } }>
}

export type ShapePayload = Record<string, any> | undefined

type NodeTemplateFactory = (payload?: ShapePayload) => NodeBasePartial

// 简易深拷贝，确保从静态模板创建的新节点互不共享引用
function deepClone<T>(obj: T): T {
  return obj == null ? obj : JSON.parse(JSON.stringify(obj))
}

const solidStyle = { fill: '#ffffff', stroke: '#000000', lineWidth: 2 } as const

// 基础模板（纯数据）
const staticTemplates: Record<string, NodeBasePartial> = {
  image: {
    shape: 'image',
    size: { width: 120, height: 72 },
    data: {
      image: { src: '', fit: 'fill' },
      style: { stroke: '#e5e7eb', lineWidth: 2, borderRadius: 4 }
    },
    ports: [
      { id: 't', offset: { x: 60, y: 0 } },
      { id: 'r', offset: { x: 120, y: 36 } },
      { id: 'b', offset: { x: 60, y: 72 } },
      { id: 'l', offset: { x: 0, y: 36 } }
    ]
  },
  line: {
    shape: 'line',
    size: { width: 120, height: 60 },
    data: {
      style: { stroke: '#000000', lineWidth: 2, lineCap: 'round' },
      line: {
        pointsNormalized: [
          { u: 0.05, v: 0.95 },
          { u: 0.95, v: 0.05 }
        ]
      }
    }
    // ports: [
    //   { id: 'r', offset: { x: 120, y: 0 } },
    //   { id: 'l', offset: { x: 0, y: 60 } },
    // ],
  },
  rect: {
    shape: 'rect',
    size: { width: 120, height: 72 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 60, y: 0 } },
      { id: 'r', offset: { x: 120, y: 36 } },
      { id: 'b', offset: { x: 60, y: 72 } },
      { id: 'l', offset: { x: 0, y: 36 } }
    ]
  },
  circle: {
    shape: 'circle',
    size: { width: 100, height: 100 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 50, y: 0 } },
      { id: 'r', offset: { x: 100, y: 50 } },
      { id: 'b', offset: { x: 50, y: 100 } },
      { id: 'l', offset: { x: 0, y: 50 } }
    ]
  },
  diamond: {
    shape: 'diamond',
    size: { width: 120, height: 80 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 60, y: 0 } },
      { id: 'r', offset: { x: 120, y: 40 } },
      { id: 'b', offset: { x: 60, y: 80 } },
      { id: 'l', offset: { x: 0, y: 40 } }
    ]
  },
  star: {
    shape: 'star',
    size: { width: 100, height: 100 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 50, y: 0 } },
      { id: 'r', offset: { x: 100, y: 40 } },
      { id: 'b', offset: { x: 50, y: 75 } },
      { id: 'l', offset: { x: 0, y: 40 } }
    ]
  },
  triangle: {
    shape: 'triangle',
    size: { width: 100, height: 80 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 50, y: 0 } },
      { id: 'r', offset: { x: 100, y: 80 } },
      { id: 'l', offset: { x: 0, y: 80 } }
    ]
  },
  hexagon: {
    shape: 'hexagon',
    size: { width: 100, height: 90 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 50, y: 0 } },
      { id: 'r', offset: { x: 100, y: 45 } },
      { id: 'b', offset: { x: 50, y: 90 } },
      { id: 'l', offset: { x: 0, y: 45 } }
    ]
  },
  cylinder: {
    shape: 'cylinder',
    size: { width: 80, height: 100 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 40, y: 0 } },
      { id: 'r', offset: { x: 80, y: 50 } },
      { id: 'b', offset: { x: 40, y: 100 } },
      { id: 'l', offset: { x: 0, y: 50 } }
    ]
  },
  parallelogram: {
    shape: 'parallelogram',
    size: { width: 120, height: 72 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 60, y: 0 } },
      { id: 'r', offset: { x: 120, y: 36 } },
      { id: 'b', offset: { x: 60, y: 72 } },
      { id: 'l', offset: { x: 0, y: 36 } }
    ]
  },
  ellipse: {
    shape: 'ellipse',
    size: { width: 120, height: 80 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 60, y: 0 } },
      { id: 'r', offset: { x: 120, y: 40 } },
      { id: 'b', offset: { x: 60, y: 80 } },
      { id: 'l', offset: { x: 0, y: 40 } }
    ]
  },
  semicircle: {
    shape: 'semicircle',
    size: { width: 100, height: 50 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 'l', offset: { x: 0, y: 50 } },
      { id: 'r', offset: { x: 100, y: 50 } },
      { id: 't', offset: { x: 50, y: 0 } }
    ]
  },
  trapezoid: {
    shape: 'trapezoid',
    size: { width: 120, height: 80 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 60, y: 0 } },
      { id: 'r', offset: { x: 120, y: 80 } },
      { id: 'b', offset: { x: 60, y: 80 } },
      { id: 'l', offset: { x: 0, y: 80 } }
    ]
  },
  'right-arrow': {
    shape: 'right-arrow',
    size: { width: 120, height: 60 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 'l', offset: { x: 0, y: 30 } },
      { id: 'r', offset: { x: 120, y: 30 } },
      { id: 't', offset: { x: 60, y: 0 } },
      { id: 'b', offset: { x: 60, y: 60 } }
    ]
  },
  'double-arrow': {
    shape: 'double-arrow',
    size: { width: 140, height: 60 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 'l', offset: { x: 0, y: 30 } },
      { id: 'r', offset: { x: 140, y: 30 } },
      { id: 't', offset: { x: 70, y: 0 } },
      { id: 'b', offset: { x: 70, y: 60 } }
    ]
  },
  cloud: {
    shape: 'cloud',
    size: { width: 120, height: 80 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 60, y: 0 } },
      { id: 'r', offset: { x: 120, y: 40 } },
      { id: 'b', offset: { x: 60, y: 80 } },
      { id: 'l', offset: { x: 0, y: 40 } }
    ]
  },
  octagon: {
    shape: 'octagon',
    size: { width: 100, height: 100 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 50, y: 0 } },
      { id: 'r', offset: { x: 100, y: 50 } },
      { id: 'b', offset: { x: 50, y: 100 } },
      { id: 'l', offset: { x: 0, y: 50 } }
    ]
  },
  sector: {
    shape: 'sector',
    size: { width: 100, height: 100 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 50, y: 0 } },
      { id: 'l', offset: { x: 0, y: 15 } },
      { id: 'r', offset: { x: 100, y: 15 } },
      { id: 'b', offset: { x: 50, y: 100 } }
    ]
  },
  cross: {
    shape: 'cross',
    size: { width: 100, height: 100 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 50, y: 0 } },
      { id: 'r', offset: { x: 100, y: 50 } },
      { id: 'b', offset: { x: 50, y: 100 } },
      { id: 'l', offset: { x: 0, y: 50 } }
    ]
  },
  corner: {
    shape: 'corner',
    size: { width: 100, height: 100 },
    data: { style: { ...solidStyle } },
    ports: [
      { id: 't', offset: { x: 50, y: 0 } },
      { id: 'l', offset: { x: 0, y: 50 } }
    ]
  }
}

// 动态模板（函数）
const factories: Record<string, NodeTemplateFactory> = {
  'rounded-rect': () => ({
    shape: 'rect',
    size: { width: 120, height: 72 },
    data: { style: { ...solidStyle, borderRadius: 8 } },
    ports: staticTemplates.rect.ports
  }),
  pentagon: () => {
    const style = { ...solidStyle, sideRatio: 0.38, bottomRatio: 0.18 } as any
    const size = { width: 100, height: 100 }
    return {
      shape: 'pentagon',
      size,
      data: { style },
      ports: [
        { id: 't', offset: { x: 50, y: 0 } },
        { id: 'r', offset: { x: 100, y: Math.round(100 * (style.sideRatio as number)) } },
        { id: 'l', offset: { x: 0, y: Math.round(100 * (style.sideRatio as number)) } },
        { id: 'b', offset: { x: 50, y: 100 } }
      ]
    }
  },
  'right-triangle': (payload) => {
    const size = { width: 100, height: 100 }
    const w = size.width,
      h = size.height
    const orientation = (payload?.orientation as 'bl' | 'br' | 'tl' | 'tr') ?? 'bl'
    const style = { ...solidStyle, orientation } as any
    let ports: Array<{ id: string; offset: { x: number; y: number } }> = []
    if (orientation === 'bl') {
      ports = [
        { id: 't', offset: { x: 0, y: 0 } },
        { id: 'r', offset: { x: w, y: h } },
        { id: 'l', offset: { x: 0, y: h } }
      ]
    } else if (orientation === 'br') {
      ports = [
        { id: 't', offset: { x: w, y: 0 } },
        { id: 'r', offset: { x: w, y: h } },
        { id: 'l', offset: { x: 0, y: h } }
      ]
    } else if (orientation === 'tl') {
      ports = [
        { id: 't', offset: { x: 0, y: 0 } },
        { id: 'r', offset: { x: w, y: 0 } },
        { id: 'l', offset: { x: 0, y: h } }
      ]
    } else {
      // 'tr'
      ports = [
        { id: 't', offset: { x: w, y: 0 } },
        { id: 'r', offset: { x: w, y: h } },
        { id: 'l', offset: { x: 0, y: 0 } }
      ]
    }
    return { shape: 'right-triangle', size, data: { style }, ports }
  },
  text: () => ({
    shape: 'rect',
    size: { width: 160, height: 36 },
    data: { text: '文本Text', style: { text: { fontSize: 14 } } }
  }),
  svg: (payload) => {
    const path = payload?.svgPath || 'M10 10 H 90 V 90 H 10 Z'
    const paths = Array.isArray(payload?.paths) ? payload?.paths : undefined
    const viewBox = payload?.viewBox || { x: 0, y: 0, width: 100, height: 100 }
    const fit = payload?.fit || 'stretch'
    const style = payload?.style || { ...solidStyle }
    const xml: string | undefined = payload?.xml
    const vw = Math.max(1, Number(viewBox.width || 100))
    const vh = Math.max(1, Number(viewBox.height || 100))
    const aspect = vw / vh
    const baseMax = 96
    const size =
      aspect >= 1
        ? { width: baseMax, height: Math.round(baseMax / aspect) }
        : { width: Math.round(baseMax * aspect), height: baseMax }
    if (xml) {
      return {
        shape: 'svg-image',
        size,
        data: { svg: { xml, viewBox, fit }, style: {} },
        ports: [
          { id: 't', offset: { x: Math.round(size.width / 2), y: 0 } },
          { id: 'r', offset: { x: size.width, y: Math.round(size.height / 2) } },
          { id: 'b', offset: { x: Math.round(size.width / 2), y: size.height } },
          { id: 'l', offset: { x: 0, y: Math.round(size.height / 2) } }
        ]
      }
    }
    return {
      shape: 'svg-path',
      size,
      data: { svg: paths ? { paths, viewBox, fit } : { path, viewBox, fit }, style },
      ports: [
        { id: 't', offset: { x: Math.round(size.width / 2), y: 0 } },
        { id: 'r', offset: { x: size.width, y: Math.round(size.height / 2) } },
        { id: 'b', offset: { x: Math.round(size.width / 2), y: size.height } },
        { id: 'l', offset: { x: 0, y: Math.round(size.height / 2) } }
      ]
    }
  }
}

// 主接口：根据 shape 返回节点配置（支持部分动态）
export function createNodeByShape(shape: string, payload?: ShapePayload): NodeBasePartial | undefined {
  if (factories[shape]) return factories[shape](payload)
  if (staticTemplates[shape]) return deepClone(staticTemplates[shape])
  return undefined
}
