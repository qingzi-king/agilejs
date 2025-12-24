/*
 * @Description: 直线边渲染器
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-12-03
 */
import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";
import { getPortWorldPosition } from "../../utils/ports";
import { getEdgeStyle, getNodeStrokeGap, getGapPoints, drawEdgePath, drawArrow } from "../../utils/edgeDraw";

function nodeCenter(node: NodeData) {
  return { x: node.position.x + node.size.width / 2, y: node.position.y + node.size.height / 2 };
}

export class StraightEdgeRenderer implements ShapeRenderer {
  readonly shape = "edge-straight";

  renderNode(_ctx: CanvasRenderingContext2D, _node: NodeData, _graph: Graph): void {}

  renderEdge(ctx: CanvasRenderingContext2D, edge: EdgeData, graph: Graph): void {
    const src = graph.getNode(edge.source);
    const tgt = graph.getNode(edge.target);
    if (!src || !tgt) return;

    const a = edge.sourcePortId ? (getPortWorldPosition(src, edge.sourcePortId) ?? nodeCenter(src)) : nodeCenter(src);
    const b = edge.targetPortId ? (getPortWorldPosition(tgt, edge.targetPortId) ?? nodeCenter(tgt)) : nodeCenter(tgt);

    // 1. 解析样式
    const style = getEdgeStyle(edge, graph);

    // 2. 计算端点间隙
    const gapA = style.endpointGap ?? getNodeStrokeGap(graph, edge.source);
    const gapB = style.endpointGap ?? getNodeStrokeGap(graph, edge.target);

    // 3. 计算修正后的端点
    // 直线：直接从 a 向 b 缩进 gapA，从 b 向 a 缩进 gapB
    const A = getGapPoints(a, b, gapA);
    const B = getGapPoints(b, a, gapB);

    // 4. 路径缓存与生成
    const cache = getStraightCache(edge);
    let path: Path2D;
    if (cache && cache.ax === A.x && cache.ay === A.y && cache.bx === B.x && cache.by === B.y) {
      path = cache.path;
    } else {
      path = new Path2D();
      path.moveTo(A.x, A.y);
      path.lineTo(B.x, B.y);
      setStraightCache(edge, { path, ax: A.x, ay: A.y, bx: B.x, by: B.y });
    }

    // 5. 绘制路径 (支持 Pipeline / Flow)
    drawEdgePath(ctx, path, style);

    // 6. 绘制箭头
    // 终点箭头
    if (style.targetArrowType !== "none") {
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      drawArrow(ctx, B, angle, style.targetArrowType, style.arrowSize, style.arrowColor, style.lineWidth);
    }
    // 起点箭头
    if (style.sourceArrowType !== "none") {
      const angle = Math.atan2(a.y - b.y, a.x - b.x);
      drawArrow(ctx, A, angle, style.sourceArrowType, style.arrowSize, style.arrowColor, style.lineWidth);
    }
  }
}

// Edge 路径缓存（本文件作用域）
type StraightPathCache = { path: Path2D; ax: number; ay: number; bx: number; by: number };
const STRAIGHT_CACHE = new WeakMap<EdgeData, StraightPathCache>();
function getStraightCache(e: EdgeData): StraightPathCache | undefined {
  return STRAIGHT_CACHE.get(e);
}
function setStraightCache(e: EdgeData, c: StraightPathCache): void {
  STRAIGHT_CACHE.set(e, c);
}
