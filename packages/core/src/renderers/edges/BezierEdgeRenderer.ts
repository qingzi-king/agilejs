/*
 * @Description: 贝塞尔曲线边渲染器
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-12-03
 */
import { Graph, NodeData, EdgeData, Point } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";
import { getPortWorldPosition } from "../../utils/ports";
import { getEdgeStyle, getNodeStrokeGap, drawEdgePath, drawArrow } from "../../utils/edgeDraw";

function nodeCenter(node: NodeData): Point {
  return { x: node.position.x + node.size.width / 2, y: node.position.y + node.size.height / 2 };
}

export class BezierEdgeRenderer implements ShapeRenderer {
  readonly shape = "edge-bezier";

  renderNode(): void {}

  renderEdge(ctx: CanvasRenderingContext2D, edge: EdgeData, graph: Graph): void {
    const src = graph.getNode(edge.source);
    const tgt = graph.getNode(edge.target);
    if (!src || !tgt) return;

    const a = edge.sourcePortId ? getPortWorldPosition(src, edge.sourcePortId) : nodeCenter(src);
    const b = edge.targetPortId ? getPortWorldPosition(tgt, edge.targetPortId) : nodeCenter(tgt);
    if (!a || !b) return;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const k = Math.max(40, Math.hypot(dx, dy) * 0.3);
    const c1: Point = { x: a.x + k, y: a.y };
    const c2: Point = { x: b.x - k, y: b.y };

    // 1. 解析样式
    const style = getEdgeStyle(edge, graph);

    // 2. 计算端点间隙
    const gapA = style.endpointGap ?? getNodeStrokeGap(graph, edge.source);
    const gapB = style.endpointGap ?? getNodeStrokeGap(graph, edge.target);

    // 3. 计算修正后的端点 (贝塞尔曲线沿切线方向缩进)
    // 切向（起点朝向 c1，终点朝向 c2 反向）
    const vA = { x: c1.x - a.x, y: c1.y - a.y };
    const lenA = Math.hypot(vA.x, vA.y) || 1;
    const uA = { x: vA.x / lenA, y: vA.y / lenA };

    const vB = { x: b.x - c2.x, y: b.y - c2.y };
    const lenB = Math.hypot(vB.x, vB.y) || 1;
    const uB = { x: vB.x / lenB, y: vB.y / lenB };

    const a2 = { x: a.x + uA.x * gapA, y: a.y + uA.y * gapA };
    const b2 = { x: b.x - uB.x * gapB, y: b.y - uB.y * gapB };

    // 防止端点交错
    const okLen = Math.hypot(b2.x - a2.x, b2.y - a2.y) >= 1;
    const A = okLen ? a2 : a;
    const B = okLen ? b2 : b;

    // 4. Path2D 缓存
    const cache = getBezierCache(edge);
    let path: Path2D;
    if (cache && eq(cache, A, B, c1, c2)) {
      path = cache.path;
    } else {
      path = new Path2D();
      path.moveTo(A.x, A.y);
      path.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, B.x, B.y);
      setBezierCache(edge, { path, a: A, b: B, c1, c2 });
    }

    // 5. 绘制路径
    drawEdgePath(ctx, path, style);

    // 6. 绘制箭头
    // 终点箭头
    if (style.targetArrowType !== "none") {
      const tx = b.x - c2.x;
      const ty = b.y - c2.y;
      const angle = Math.atan2(ty, tx);
      drawArrow(ctx, B, angle, style.targetArrowType, style.arrowSize, style.arrowColor, style.lineWidth);
    }
    // 起点箭头
    if (style.sourceArrowType !== "none") {
      const tx0 = a.x - c1.x;
      const ty0 = a.y - c1.y;
      const angle0 = Math.atan2(ty0, tx0);
      drawArrow(ctx, A, angle0, style.sourceArrowType, style.arrowSize, style.arrowColor, style.lineWidth);
    }
  }
}

type BezierPathCache = { path: Path2D; a: Point; b: Point; c1: Point; c2: Point };
const BEZIER_CACHE = new WeakMap<EdgeData, BezierPathCache>();
function eq(c: BezierPathCache, a: Point, b: Point, c1: Point, c2: Point) {
  return (
    c.a.x === a.x &&
    c.a.y === a.y &&
    c.b.x === b.x &&
    c.b.y === b.y &&
    c.c1.x === c1.x &&
    c.c1.y === c1.y &&
    c.c2.x === c2.x &&
    c.c2.y === c2.y
  );
}
function getBezierCache(e: EdgeData): BezierPathCache | undefined {
  return BEZIER_CACHE.get(e);
}
function setBezierCache(e: EdgeData, c: BezierPathCache): void {
  BEZIER_CACHE.set(e, c);
}
