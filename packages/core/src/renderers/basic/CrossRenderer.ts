/*
 * @Description: 十字形渲染器（加号）
 * @Author: qingzi.wang
 * @Date: 2025-10-11 13:21:30
 * @LastEditTime: 2025-10-11 13:24:47
 */

import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

export class CrossRenderer implements ShapeRenderer {
  readonly shape = "cross";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width: w, height: h } = node.size;
    if (w <= 0 || h <= 0) return;

    const t = Math.max(2, Math.min(w, h) * 0.3); // 臂宽
    const cx = x + w / 2;
    const cy = y + h / 2;

    // 组合成十字形的外轮廓路径
    const x0 = cx - t / 2,
      x1 = cx + t / 2;
    const y0 = cy - t / 2,
      y1 = cy + t / 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.lineTo(x1, y0);
    ctx.lineTo(x + w, y0);
    ctx.lineTo(x + w, y1);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1, y + h);
    ctx.lineTo(x0, y + h);
    ctx.lineTo(x0, y1);
    ctx.lineTo(x, y1);
    ctx.lineTo(x, y0);
    ctx.lineTo(x0, y0);
    ctx.closePath();

    const style = (node.data?.style as any) || {};
    const baseAlpha = style.alpha != null ? Number(style.alpha) : 1;

    // 填充
    {
      const hasFill = !!style.fill && String(style.fill).toLowerCase() !== "transparent";
      if (hasFill) {
        const prevAlpha = ctx.globalAlpha;
        const fillAlpha = style.fillAlpha != null ? Number(style.fillAlpha) : 1;
        ctx.globalAlpha = baseAlpha * fillAlpha;
        ctx.fillStyle = style.fill;
        ctx.fill();
        ctx.globalAlpha = prevAlpha;
      }
    }

    // 描边
    const strokeWidth = style.lineWidth != null ? Number(style.lineWidth) : 2;
    const hasStroke = !!style.stroke && strokeWidth > 0;
    if (hasStroke) {
      const prevAlpha = ctx.globalAlpha;
      const strokeAlpha = style.strokeAlpha != null ? Number(style.strokeAlpha) : 1;
      ctx.globalAlpha = baseAlpha * strokeAlpha;
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = strokeWidth;
      if (Array.isArray(style.lineDash)) ctx.setLineDash(style.lineDash);
      if (style.lineCap) ctx.lineCap = style.lineCap;
      if (style.lineJoin) ctx.lineJoin = style.lineJoin;
      if (style.miterLimit != null) ctx.miterLimit = style.miterLimit;
      ctx.stroke();
      ctx.globalAlpha = prevAlpha;
    }

    ctx.restore();
  }

  renderEdge(_ctx: CanvasRenderingContext2D, _edge: EdgeData, _graph: Graph): void {}
}
