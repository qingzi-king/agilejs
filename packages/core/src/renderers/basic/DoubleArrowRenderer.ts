/*
 * @Description: 左右双箭头渲染器
 * @Author: qingzi.wang
 * @Date: 2025-10-11 13:21:39
 * @LastEditTime: 2025-10-11 13:24:57
 */

import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

export class DoubleArrowRenderer implements ShapeRenderer {
  readonly shape = "double-arrow";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width: w, height: h } = node.size;
    if (w <= 0 || h <= 0) return;

    const headW = w * 0.2; // 两端箭头宽
    const bodyH = h * 0.5;
    const bodyY = y + (h - bodyH) / 2;

    ctx.save();
    ctx.beginPath();
    // 左箭头
    ctx.moveTo(x + headW, y);
    ctx.lineTo(x, y + h / 2);
    ctx.lineTo(x + headW, y + h);
    // 连到中段上边
    ctx.lineTo(x + headW, bodyY + bodyH);
    // 右箭头
    ctx.lineTo(x + w - headW, bodyY + bodyH);
    ctx.lineTo(x + w - headW, y + h);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(x + w - headW, y);
    ctx.lineTo(x + w - headW, bodyY);
    // 回到左箭头上边
    ctx.lineTo(x + headW, bodyY);
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
    const strokeWidth = style.lineWidth != null ? Number(style.lineWidth) : 1.5;
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
