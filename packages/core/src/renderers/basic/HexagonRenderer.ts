/*
 * @Description: 六边形渲染器
 * @Author: qingzi.wang
 * @Date: 2025-10-09 12:00:00
 * @LastEditTime: 2025-10-09 19:55:00
 */
import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

export class HexagonRenderer implements ShapeRenderer {
  readonly shape = "hexagon";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;

    if (width <= 0 || height <= 0) return;

    ctx.save();
    ctx.beginPath();

    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // 绘制"侧躺"的六边形，上下是边而不是顶点
    const points = [
      { x: x + width / 4, y: y }, // 上边左顶点
      { x: x + (width * 3) / 4, y: y }, // 上边右顶点
      { x: x + width, y: centerY }, // 右侧顶点
      { x: x + (width * 3) / 4, y: y + height }, // 下边右顶点
      { x: x + width / 4, y: y + height }, // 下边左顶点
      { x: x, y: centerY }, // 左侧顶点
    ];

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    const style = (node.data?.style as any) || {};
    const baseAlpha = style.alpha != null ? Number(style.alpha) : 1;

    // 填充（仅当提供了 fill 且不为 transparent）
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

    // 描边（lineWidth<=0 时不描边）
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
