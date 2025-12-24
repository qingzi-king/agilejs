/*
 * @Description: 折线边渲染器
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-12-03 10:44:50
 */
import { Graph, NodeData, EdgeData, Point } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";
import { getPortWorldPosition } from "../../utils/ports";
import {
  getEdgeStyle,
  getNodeStrokeGap,
  getGapPoints,
  drawEdgePath,
  drawArrow,
  buildRoundedPath,
} from "../../utils/edgeDraw";

function nodeCenter(node: NodeData): Point {
  return { x: node.position.x + node.size.width / 2, y: node.position.y + node.size.height / 2 };
}

export class PolylineEdgeRenderer implements ShapeRenderer {
  readonly shape = "edge-polyline";

  renderNode(): void {}

  renderEdge(ctx: CanvasRenderingContext2D, edge: EdgeData, graph: Graph): void {
    const src = graph.getNode(edge.source);
    const tgt = graph.getNode(edge.target);
    if (!src || !tgt) return;

    const a = edge.sourcePortId ? getPortWorldPosition(src, edge.sourcePortId) : nodeCenter(src);
    const b = edge.targetPortId ? getPortWorldPosition(tgt, edge.targetPortId) : nodeCenter(tgt);
    if (!a || !b) return;

    const points: Point[] = [a, ...(edge.points ?? []), b];
    if (points.length < 2) return;

    // 1. 解析样式
    const style = getEdgeStyle(edge, graph);

    // 2. 计算端点间隙
    const gapA = style.endpointGap ?? getNodeStrokeGap(graph, edge.source);
    const gapB = style.endpointGap ?? getNodeStrokeGap(graph, edge.target);

    // 3. 修正端点 (仅在非 pipeline 模式下修正？原逻辑是 !pipeline && points.length >= 2)
    // 但实际上 pipeline 模式下也应该避让节点描边，只是 pipeline 模式下通常没有箭头，所以可能不需要缩进？
    // 原逻辑：if (!pipeline && points.length >= 2) { ... }
    // 这里我们统一处理，如果 style.pipeline 存在，是否需要缩进？
    // 假设 pipeline 模式不需要缩进（因为通常连接到端口中心，且管道较粗，缩进可能导致断开）
    // 但如果用户显式设置了 endpointGap，应该生效。
    // 让我们保持原逻辑：只有非 pipeline 模式才自动缩进。

    if (!style.pipeline && points.length >= 2) {
      // target 端
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];
      points[points.length - 1] = getGapPoints(p2, p1, gapB);

      // source 端
      const s1 = points[0];
      const s2 = points[1];
      points[0] = getGapPoints(s1, s2, gapA);
    }

    // 4. Path2D 缓存
    const cornerRadius = style.pipeline?.cornerRadius ?? 0;
    const cache = getPolyCache(edge);
    let path: Path2D;
    if (cache && eqPts(cache.pts, points) && (cache.cornerRadius ?? 0) === (cornerRadius || 0)) {
      path = cache.path;
    } else {
      path = buildRoundedPath(points, Math.max(0, cornerRadius));
      setPolyCache(edge, {
        path,
        pts: points.map((p) => ({ x: p.x, y: p.y })),
        cornerRadius: Math.max(0, cornerRadius),
      });
    }

    // 5. 绘制路径
    drawEdgePath(ctx, path, style);

    // 6. 绘制箭头
    if (!style.pipeline && points.length >= 2) {
      // 终点箭头
      if (style.targetArrowType !== "none") {
        const pA = points[points.length - 2];
        const pB = points[points.length - 1];
        const angle = Math.atan2(pB.y - pA.y, pB.x - pA.x);
        drawArrow(ctx, pB, angle, style.targetArrowType, style.arrowSize, style.arrowColor, style.lineWidth);
      }
      // 起点箭头
      if (style.sourceArrowType !== "none") {
        const sA = points[1];
        const sB = points[0];
        const angle0 = Math.atan2(sB.y - sA.y, sB.x - sA.x);
        drawArrow(ctx, sB, angle0, style.sourceArrowType, style.arrowSize, style.arrowColor, style.lineWidth);
      }
    }
  }
}

// 折线 Path2D 缓存（包含 cornerRadius）
type PolyPathCache = { path: Path2D; pts: Point[]; cornerRadius?: number };
const POLY_CACHE = new WeakMap<EdgeData, PolyPathCache>();
function getPolyCache(e: EdgeData): PolyPathCache | undefined {
  return POLY_CACHE.get(e);
}
function setPolyCache(e: EdgeData, c: PolyPathCache): void {
  POLY_CACHE.set(e, c);
}
function eqPts(a: Point[], b: Point[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false;
  return true;
}
