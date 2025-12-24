/*
 * @Description: 基于 SVG path 的节点渲染器（shape = 'svg-path'）
 * @Author: qingzi.wang
 * @Date: 2025-09-28 14:55:48
 * @LastEditTime: 2025-09-30 10:00:42
 */
import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

type FitMode = "stretch" | "contain" | "cover";

function parsePath(d: string): Path2D | null {
  try {
    return new Path2D(d);
  } catch {
    return null;
  }
}

function computeFit(nodeW: number, nodeH: number, viewW: number, viewH: number, fit: FitMode) {
  // 计算从 viewBox 映射到节点矩形的缩放与平移
  const sx = nodeW / viewW;
  const sy = nodeH / viewH;
  if (fit === "stretch") {
    return { sx, sy, tx: 0, ty: 0 };
  }
  const s = fit === "contain" ? Math.min(sx, sy) : Math.max(sx, sy);
  const dw = nodeW - viewW * s;
  const dh = nodeH - viewH * s;
  return { sx: s, sy: s, tx: dw / 2, ty: dh / 2 };
}

export class SvgPathRenderer implements ShapeRenderer {
  readonly shape = "svg-path";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;
    const style: any = node.data?.style || {};
    const svg: any = (node.data as any)?.svg || {};
    const d: string | undefined = svg.path;
    const paths: any[] | undefined = Array.isArray(svg.paths) ? svg.paths : undefined;
    if (!d && (!paths || paths.length === 0)) return;
    const viewBox = svg.viewBox || { x: 0, y: 0, width: 100, height: 100 };
    const fit: FitMode = svg.fit || "contain";

    ctx.save();
    // 通用样式（作为 path 层的默认）
    const strokeWidthDefault = style.lineWidth != null ? Number(style.lineWidth) : 1.5;
    const baseAlpha = style.alpha != null ? Number(style.alpha) : 1;
    // 变换：把 viewBox 映射到节点矩形
    ctx.translate(x, y);
    const { sx, sy, tx, ty } = computeFit(width, height, viewBox.width, viewBox.height, fit);
    ctx.translate(tx, ty);
    ctx.scale(sx, sy);
    // 将 path 原点移到 viewBox.x/y
    ctx.translate(-viewBox.x, -viewBox.y);

    const applyStrokeProps = (p: any) => {
      const lw = (p.strokeWidth != null ? Number(p.strokeWidth) : strokeWidthDefault) / Math.max(sx, sy);
      ctx.lineWidth = lw;
      if (Array.isArray(p.lineDash)) ctx.setLineDash(p.lineDash.map((v: number) => v / Math.max(sx, sy)));
      if (p.lineCap) ctx.lineCap = p.lineCap;
      if (p.lineJoin) ctx.lineJoin = p.lineJoin;
      if (p.miterLimit != null) ctx.miterLimit = p.miterLimit;
    };

    const renderSingle = (part: any) => {
      const dStr = typeof part === "string" ? part : part.d;
      if (!dStr) return;
      const p2 = parsePath(dStr);
      if (!p2) return;
      const pFill = typeof part === "object" && part.fill !== undefined ? part.fill : style.fill;
      const pStroke = typeof part === "object" && part.stroke !== undefined ? part.stroke : style.stroke;
      const fillAlpha =
        typeof part === "object" && part.fillAlpha != null
          ? Number(part.fillAlpha)
          : style.fillAlpha != null
            ? Number(style.fillAlpha)
            : 1;
      const strokeAlpha =
        typeof part === "object" && part.strokeAlpha != null
          ? Number(part.strokeAlpha)
          : style.strokeAlpha != null
            ? Number(style.strokeAlpha)
            : 1;
      const hasFill =
        !!pFill && String(pFill).toLowerCase() !== "none" && String(pFill).toLowerCase() !== "transparent";
      const hasStroke =
        !!pStroke &&
        (part.strokeWidth != null ? Number(part.strokeWidth) : strokeWidthDefault) > 0 &&
        String(pStroke).toLowerCase() !== "none" &&
        String(pStroke).toLowerCase() !== "transparent";

      // 填充
      if (hasFill) {
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = baseAlpha * fillAlpha;
        ctx.fillStyle = pFill;
        if (typeof part === "object" && part.fillRule) {
          try {
            ctx.fill(p2, part.fillRule);
          } catch {
            ctx.fill(p2);
          }
        } else {
          ctx.fill(p2);
        }
        ctx.globalAlpha = prev;
      }
      // 描边
      if (hasStroke) {
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = baseAlpha * strokeAlpha;
        ctx.strokeStyle = pStroke;
        applyStrokeProps(part);
        ctx.stroke(p2);
        ctx.globalAlpha = prev;
      }
    };

    if (paths && paths.length > 0) {
      for (const part of paths) renderSingle(part);
    } else if (d) {
      renderSingle({ d });
    }
    ctx.restore();
  }

  renderEdge(_ctx: CanvasRenderingContext2D, _edge: EdgeData, _graph: Graph): void {
    /* no-op */
  }
}
