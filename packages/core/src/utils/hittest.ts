/*
 * @Description: 碰撞检测工具
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-25 09:56:21
 */
import { NodeData, Point } from "../model/Graph";

// 距离工具
function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const l2 = dist2(a, b);
  if (l2 === 0) return Math.sqrt(dist2(p, a));
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  return Math.hypot(p.x - proj.x, p.y - proj.y);
}

// 将 line 节点的归一化折点转换为世界坐标（包含旋转）
function getLineWorldPoints(node: NodeData): Point[] {
  const cfg = (node.data as any)?.line || {};
  const ptsN: Array<{ u: number; v: number }> =
    Array.isArray(cfg.pointsNormalized) && cfg.pointsNormalized.length >= 2
      ? cfg.pointsNormalized
      : [
          { u: 0.1, v: 0.9 },
          { u: 0.9, v: 0.1 },
        ];
  const { x, y } = node.position;
  const { width: w, height: h } = node.size;
  const cx = x + w / 2,
    cy = y + h / 2;
  const rad = ((node.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad),
    sin = Math.sin(rad);
  const toWorld = (px: number, py: number) => {
    const dx = px - cx,
      dy = py - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  };
  return ptsN.map((p) => toWorld(x + p.u * w, y + p.v * h));
}

export function pointInRect(point: Point, x: number, y: number, w: number, h: number): boolean {
  return point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h;
}

// 兼容旧签名：不传 opts 则使用默认值（scale=1, pixelThreshold=10）
export function hitTestNode(pointWorld: Point, node: NodeData): boolean;
export function hitTestNode(
  pointWorld: Point,
  node: NodeData,
  opts?: { scale?: number; pixelThresholdPx?: number },
): boolean;
export function hitTestNode(
  pointWorld: Point,
  node: NodeData,
  opts?: { scale?: number; pixelThresholdPx?: number },
): boolean {
  // line 节点采用“靠近折线”命中（屏幕像素阈值换算为世界单位）
  if (node.shape === "line") {
    const scale = Math.max(0.0001, opts?.scale ?? 1);
    const px = opts?.pixelThresholdPx ?? 10;
    const thWorld = px / scale;
    const pts = getLineWorldPoints(node);
    for (let i = 0; i < pts.length - 1; i++) {
      if (distancePointToSegment(pointWorld, pts[i], pts[i + 1]) <= thWorld) return true;
    }
    // 端点也可点中：半径与阈值一致
    for (let i = 0; i < pts.length; i++) {
      if (Math.hypot(pointWorld.x - pts[i].x, pointWorld.y - pts[i].y) <= thWorld) return true;
    }
    return false;
  }
  const { x, y } = node.position;
  const { width, height } = node.size;
  const rotation = node.rotation ?? 0;
  if (!rotation) {
    return pointInRect(pointWorld, x, y, width, height);
  }

  // 将测试点以节点中心为原点做逆向旋转，转回到未旋转的局部空间，再做 AABB 命中
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rad = (-rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = pointWorld.x - cx;
  const dy = pointWorld.y - cy;
  const lx = dx * cos - dy * sin + cx; // 逆旋转后的世界坐标（等价于未旋转局部坐标）
  const ly = dx * sin + dy * cos + cy;
  return pointInRect({ x: lx, y: ly }, x, y, width, height);
}

export function hitTestNodes(pointWorld: Point, nodes: NodeData[]): NodeData | undefined;
export function hitTestNodes(
  pointWorld: Point,
  nodes: NodeData[],
  opts?: { scale?: number; pixelThresholdPx?: number },
): NodeData | undefined;
export function hitTestNodes(
  pointWorld: Point,
  nodes: NodeData[],
  opts?: { scale?: number; pixelThresholdPx?: number },
): NodeData | undefined {
  // 按zIndex升序排列节点，然后按id排序；从末尾开始迭代，以确定最高zIndex的优先级
  const sorted = [...nodes]
    // 过滤不可见节点
    .filter((n) => n.visible !== false)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0) || a.id.localeCompare(b.id));
  for (let i = sorted.length - 1; i >= 0; i--) {
    const n = sorted[i];
    // 不可选的节点不参与命中
    if ((n as any).selectable === false) continue;
    if (hitTestNode(pointWorld, n, opts)) return n;
  }
  return undefined;
}

export function rectIntersectsNode(
  selection: { x: number; y: number; width: number; height: number },
  node: NodeData,
): boolean {
  const nx = node.position.x;
  const ny = node.position.y;
  const nw = node.size.width;
  const nh = node.size.height;
  return !(
    selection.x + selection.width < nx ||
    selection.x > nx + nw ||
    selection.y + selection.height < ny ||
    selection.y > ny + nh
  );
}
