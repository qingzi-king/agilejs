/*
 * @Description: 碰撞检测工具 (复用 Core 逻辑并扩展 Edge 检测)
 * @Author: qingzi.wang
 * @Date: 2025-12-02 10:05:00
 */
import { NodeData, EdgeData, Point, CanvasEngine, getPortWorldPosition } from '@fnt-agilejs/core'

// 距离工具
function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}
function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const l2 = dist2(a, b)
  if (l2 === 0) return Math.sqrt(dist2(p, a))
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2
  t = Math.max(0, Math.min(1, t))
  const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
  return Math.hypot(p.x - proj.x, p.y - proj.y)
}

function bezierPoint(a: Point, c1: Point, c2: Point, b: Point, t: number): Point {
  const mt = 1 - t
  const mt2 = mt * mt
  const t2 = t * t
  const x = mt2 * mt * a.x + 3 * mt2 * t * c1.x + 3 * mt * t2 * c2.x + t2 * t * b.x
  const y = mt2 * mt * a.y + 3 * mt2 * t * c1.y + 3 * mt * t2 * c2.y + t2 * t * b.y
  return { x, y }
}

function manhattanPath(a: Point, b: Point): Point[] {
  const dx = Math.abs(b.x - a.x)
  const dy = Math.abs(b.y - a.y)
  if (dx > dy) {
    const mid: Point = { x: (a.x + b.x) / 2, y: a.y }
    const mid2: Point = { x: (a.x + b.x) / 2, y: b.y }
    return [a, mid, mid2, b]
  } else {
    const mid: Point = { x: a.x, y: (a.y + b.y) / 2 }
    const mid2: Point = { x: b.x, y: (a.y + b.y) / 2 }
    return [a, mid, mid2, b]
  }
}

// 推断端口法线方向
function inferPortNormalFor(node: any, portId?: string): Point | null {
  if (!portId) return null
  const port = (node.ports ?? []).find((p: any) => p.id === portId)
  if (!port) return null
  const w = node.size.width
  const h = node.size.height
  const tol = Math.max(1, Math.min(w, h) * 0.001)
  if (Math.abs(port.offset.x - 0) <= tol) return { x: -1, y: 0 }
  if (Math.abs(port.offset.x - w) <= tol) return { x: 1, y: 0 }
  if (Math.abs(port.offset.y - 0) <= tol) return { x: 0, y: -1 }
  if (Math.abs(port.offset.y - h) <= tol) return { x: 0, y: 1 }
  const dxLeft = Math.abs(port.offset.x - 0)
  const dxRight = Math.abs(port.offset.x - w)
  const dyTop = Math.abs(port.offset.y - 0)
  const dyBottom = Math.abs(port.offset.y - h)
  const min = Math.min(dxLeft, dxRight, dyTop, dyBottom)
  if (min === dxLeft) return { x: -1, y: 0 }
  if (min === dxRight) return { x: 1, y: 0 }
  if (min === dyTop) return { x: 0, y: -1 }
  return { x: 0, y: 1 }
}

// 计算正交边在“管道模式”下用于命中检测的折点序列
function getOrthogonalPipelinePointsForHit(edge: EdgeData, engine: CanvasEngine, a: Point, b: Point): Point[] {
  let pts: Point[] = manhattanPath(a, b)
  const style = (edge.data?.style as any) || {}
  const pipeline = style.pipeline as
    | undefined
    | {
        outerWidth?: number
        innerWidth?: number
        gap?: number
        cornerRadius?: number
        stub?: number
        clearance?: number
        avoidSelfMargin?: number
      }
  if (!pipeline || pts.length < 2) return pts

  const src = engine.graph.getNode(edge.source)
  const tgt = engine.graph.getNode(edge.target)
  if (!src || !tgt) return pts

  const outerW = pipeline.outerWidth ?? 6
  const stub =
    typeof (pipeline as any).stub === 'number'
      ? Math.max(1, (pipeline as any).stub)
      : typeof (pipeline as any).clearance === 'number'
        ? Math.max(1, (pipeline as any).clearance)
        : Math.max(3, outerW / 2)

  const nA =
    inferPortNormalFor(src, edge.sourcePortId) ??
    (() => {
      const dx = b.x - a.x,
        dy = b.y - a.y
      return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 }
    })()
  const nB =
    inferPortNormalFor(tgt, edge.targetPortId) ??
    (() => {
      const dx = a.x - b.x,
        dy = a.y - b.y
      return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 }
    })()

  const a1 = { x: a.x + nA.x * stub, y: a.y + nA.y * stub }
  const b1 = { x: b.x + nB.x * stub, y: b.y + nB.y * stub }
  let midPath = manhattanPath(a1, b1)

  if (midPath.length === 4) {
    const m1 = { ...midPath[1] }
    const m2 = { ...midPath[2] }
    const avoid =
      typeof (pipeline as any).avoidSelfMargin === 'number'
        ? Math.max(0, (pipeline as any).avoidSelfMargin)
        : Math.max(stub, outerW)
    const srcLeft = src.position.x,
      srcRight = src.position.x + src.size.width
    const srcTop = src.position.y,
      srcBottom = src.position.y + src.size.height
    const tgtLeft = tgt.position.x,
      tgtRight = tgt.position.x + tgt.size.width
    const tgtTop = tgt.position.y,
      tgtBottom = tgt.position.y + tgt.size.height
    const horizontalFirst = a1.y === m1.y && m1.x === m2.x
    if (horizontalFirst) {
      let sharedX = m1.x
      if (nA.x !== 0) {
        const boundX = nA.x > 0 ? srcRight + avoid : srcLeft - avoid
        sharedX = nA.x > 0 ? Math.max(sharedX, boundX) : Math.min(sharedX, boundX)
      }
      if (nB.x !== 0) {
        const tgtBoundX = nB.x > 0 ? tgtRight + avoid : tgtLeft - avoid
        const cand = nB.x > 0 ? Math.max(sharedX, tgtBoundX) : Math.min(sharedX, tgtBoundX)
        if (Math.abs(cand - m1.x) <= Math.abs(sharedX - m1.x)) sharedX = cand
      }
      m1.x = sharedX
      m2.x = sharedX
    } else {
      let sharedY = m1.y
      if (nA.y !== 0) {
        const boundY = nA.y > 0 ? srcBottom + avoid : srcTop - avoid
        sharedY = nA.y > 0 ? Math.max(sharedY, boundY) : Math.min(sharedY, boundY)
      }
      if (nB.y !== 0) {
        const tgtBoundY = nB.y > 0 ? tgtBottom + avoid : tgtTop - avoid
        const cand = nB.y > 0 ? Math.max(sharedY, tgtBoundY) : Math.min(sharedY, tgtBoundY)
        if (Math.abs(cand - m1.y) <= Math.abs(sharedY - m1.y)) sharedY = cand
      }
      m1.y = sharedY
      m2.y = sharedY
    }
    midPath = [a1, m1, m2, b1]
  }

  if (midPath.length >= 2) {
    pts = [a, a1, ...midPath.slice(1, -1), b1, b]
  }
  return pts
}

function getEdgeEndpoints(edge: EdgeData, engine: CanvasEngine): { start: Point; end: Point } | null {
  const src = engine.graph.getNode(edge.source)
  const tgt = engine.graph.getNode(edge.target)
  if (!src || !tgt) return null
  const start = edge.sourcePortId
    ? getPortWorldPosition(src, edge.sourcePortId)
    : { x: src.position.x + src.size.width / 2, y: src.position.y + src.size.height / 2 }
  const end = edge.targetPortId
    ? getPortWorldPosition(tgt, edge.targetPortId)
    : { x: tgt.position.x + tgt.size.width / 2, y: tgt.position.y + tgt.size.height / 2 }
  if (!start || !end) return null
  return { start, end }
}

function getPolylinePoints(edge: EdgeData, engine: CanvasEngine): Point[] | null {
  if (edge.shape !== 'edge-polyline') return null
  const endpoints = getEdgeEndpoints(edge, engine)
  if (!endpoints) return null
  return [endpoints.start, ...(edge.points ?? []), endpoints.end]
}

// 将 line 节点的归一化折点转换为世界坐标（包含旋转）
function getLineWorldPoints(node: NodeData): Point[] {
  const cfg = (node.data as any)?.line || {}
  const ptsN: Array<{ u: number; v: number }> =
    Array.isArray(cfg.pointsNormalized) && cfg.pointsNormalized.length >= 2
      ? cfg.pointsNormalized
      : [
          { u: 0.1, v: 0.9 },
          { u: 0.9, v: 0.1 }
        ]
  const { x, y } = node.position
  const { width: w, height: h } = node.size
  const cx = x + w / 2,
    cy = y + h / 2
  const rad = ((node.rotation || 0) * Math.PI) / 180
  const cos = Math.cos(rad),
    sin = Math.sin(rad)
  const toWorld = (px: number, py: number) => {
    const dx = px - cx,
      dy = py - cy
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
  }
  return ptsN.map((p) => toWorld(x + p.u * w, y + p.v * h))
}

// ...existing code...
export function pointInRect(point: Point, x: number, y: number, w: number, h: number): boolean {
  return point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h
}

export function hitTestNode(
  pointWorld: Point,
  node: NodeData,
  opts?: { scale?: number; pixelThresholdPx?: number }
): boolean {
  // line 节点采用“靠近折线”命中（屏幕像素阈值换算为世界单位）
  if (node.shape === 'line') {
    const scale = Math.max(0.0001, opts?.scale ?? 1)
    const px = opts?.pixelThresholdPx ?? 10
    const thWorld = px / scale
    const pts = getLineWorldPoints(node)
    for (let i = 0; i < pts.length - 1; i++) {
      if (distancePointToSegment(pointWorld, pts[i], pts[i + 1]) <= thWorld) return true
    }
    // 端点也可点中：半径与阈值一致
    for (let i = 0; i < pts.length; i++) {
      if (Math.hypot(pointWorld.x - pts[i].x, pointWorld.y - pts[i].y) <= thWorld) return true
    }
    return false
  }
  const { x, y } = node.position
  const { width, height } = node.size

  // 基础包围盒命中
  const hitBody = pointInRect(pointWorld, x, y, width, height)
  if (hitBody) return true

  // 简易标签命中：如果有标签，默认向下/向外扩展一定范围（简化处理，不进行精确字体测量）
  // 假设标签通常在底部或周围，给予 30px 的额外命中区
  if (node.data?.label) {
    const padding = 30
    return pointInRect(pointWorld, x - padding, y - padding, width + padding * 2, height + padding * 2)
  }

  return false
}

export function hitTestNodes(
  pointWorld: Point,
  nodes: NodeData[],
  opts?: { scale?: number; pixelThresholdPx?: number }
): NodeData | undefined {
  // 按zIndex升序排列节点，然后按id排序；从末尾开始迭代，以确定最高zIndex的优先级
  const sorted = [...nodes]
    // 过滤不可见节点
    .filter((n) => n.visible !== false)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0) || a.id.localeCompare(b.id))
  for (let i = sorted.length - 1; i >= 0; i--) {
    const n = sorted[i]
    // 不可选的节点不参与命中
    if ((n as any).selectable === false) continue
    if (hitTestNode(pointWorld, n, opts)) return n
  }
  return undefined
}

// 简单的边命中检测（支持直线和折线段）
export function hitTestEdges(
  pointWorld: Point,
  engine: CanvasEngine,
  opts?: { scale?: number; pixelThresholdPx?: number }
): EdgeData | undefined {
  const scale = Math.max(0.0001, opts?.scale ?? 1)
  const px = opts?.pixelThresholdPx ?? 10
  const thWorld = px / scale

  const edges = [...engine.graph.getEdges()].reverse()

  for (const edge of edges) {
    const endpoints = getEdgeEndpoints(edge, engine)
    if (!endpoints) continue

    // 1. Polyline
    const pts = getPolylinePoints(edge, engine)
    if (pts) {
      for (let i = 0; i < pts.length - 1; i++) {
        if (distancePointToSegment(pointWorld, pts[i], pts[i + 1]) <= thWorld) return edge
      }
      continue
    }

    // 2. Straight
    if (edge.shape === 'edge-straight') {
      if (distancePointToSegment(pointWorld, endpoints.start, endpoints.end) <= thWorld) return edge
      continue
    }

    // 3. Orthogonal
    if (edge.shape === 'edge-orthogonal') {
      const ptsOrtho = getOrthogonalPipelinePointsForHit(edge, engine, endpoints.start, endpoints.end)
      for (let i = 0; i < ptsOrtho.length - 1; i++) {
        if (distancePointToSegment(pointWorld, ptsOrtho[i], ptsOrtho[i + 1]) <= thWorld) return edge
      }
      continue
    }

    // 4. Bezier
    if (edge.shape === 'edge-bezier') {
      const a = endpoints.start
      const b = endpoints.end
      const dx = b.x - a.x
      const dy = b.y - a.y
      const k = Math.max(40, Math.hypot(dx, dy) * 0.3)
      const c1: Point = { x: a.x + k, y: a.y }
      const c2: Point = { x: b.x - k, y: b.y }
      const steps = 24
      let prev = a
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const pt = bezierPoint(a, c1, c2, b, t)
        if (distancePointToSegment(pointWorld, prev, pt) <= thWorld) return edge
        prev = pt
      }
      continue
    }

    // 默认回退：直线检测
    if (distancePointToSegment(pointWorld, endpoints.start, endpoints.end) <= thWorld) return edge
  }
  return undefined
}
