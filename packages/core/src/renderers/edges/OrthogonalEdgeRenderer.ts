/*
 * @Description: 正交边渲染器
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-12-03
 */
import { Graph, EdgeData, Point } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";
import { buildOrthogonalPathPoints } from "../../utils/orthogonal";
import {
  getEdgeStyle,
  getNodeStrokeGap,
  getGapPoints,
  drawEdgePath,
  drawArrow,
  buildRoundedPath,
} from "../../utils/edgeDraw";

export class OrthogonalEdgeRenderer implements ShapeRenderer {
  readonly shape = "edge-orthogonal";
  renderNode(): void {}

  renderEdge(ctx: CanvasRenderingContext2D, edge: EdgeData, graph: Graph): void {
    const ptsBase = buildOrthogonalPathPoints(edge, graph);
    if (ptsBase.length < 2) return;

    // 1. 解析样式
    const style = getEdgeStyle(edge, graph);

    // 2. 计算端点间隙
    const gapA = style.endpointGap ?? getNodeStrokeGap(graph, edge.source);
    const gapB = style.endpointGap ?? getNodeStrokeGap(graph, edge.target);

    // 3. 修正端点
    let pts = ptsBase.slice();
    if (pts.length >= 2) {
      // target 端
      const p1 = pts[pts.length - 2];
      const p2 = pts[pts.length - 1];
      pts[pts.length - 1] = getGapPoints(p2, p1, gapB);

      // source 端
      const s1 = pts[0];
      const s2 = pts[1];
      pts[0] = getGapPoints(s1, s2, gapA);
    }

    // 4. Path2D 缓存
    const cornerRadius = style.pipeline?.cornerRadius ?? 0;
    const cache = getOrthoCache(edge);
    let path: Path2D;
    if (cache && eqPts(cache.pts, pts) && (cache.cornerRadius ?? 0) === (cornerRadius || 0)) {
      path = cache.path;
    } else {
      path = buildRoundedPath(pts, Math.max(0, cornerRadius));
      setOrthoCache(edge, { path, pts, cornerRadius: Math.max(0, cornerRadius) });
    }

    // 5. 绘制路径
    drawEdgePath(ctx, path, style);

    // 6. 绘制箭头 (Pipeline 模式下通常不画箭头，但如果 style 指定了箭头且非 pipeline 模式，则画)
    // 原逻辑：if (!pipeline && pts.length >= 2)
    if (!style.pipeline && pts.length >= 2) {
      // 终点箭头
      if (style.targetArrowType !== "none") {
        const p1 = pts[pts.length - 2];
        const p2 = pts[pts.length - 1];
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        drawArrow(ctx, p2, angle, style.targetArrowType, style.arrowSize, style.arrowColor, style.lineWidth);
      }
      // 起点箭头
      if (style.sourceArrowType !== "none") {
        const s1 = pts[1];
        const s2 = pts[0];
        const angle0 = Math.atan2(s2.y - s1.y, s2.x - s1.x);
        drawArrow(ctx, s2, angle0, style.sourceArrowType, style.arrowSize, style.arrowColor, style.lineWidth);
      }
    }
  }
}

function eqPts(a: Point[], b: Point[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false;
  return true;
}
function getOrthoCache(e: EdgeData): OrthoPathCacheExt | undefined {
  return ORTHO_CACHE_EXT.get(e);
}
function setOrthoCache(e: EdgeData, c: OrthoPathCacheExt): void {
  ORTHO_CACHE_EXT.set(e, c);
}

// 扩展缓存，包含 cornerRadius
type OrthoPathCacheExt = { path: Path2D; pts: Point[]; cornerRadius?: number };
const ORTHO_CACHE_EXT = new WeakMap<EdgeData, OrthoPathCacheExt>();
