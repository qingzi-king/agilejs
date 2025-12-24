/*
 * @Description: 云朵渲染器
 * @Author: qingzi.wang
 * @Date: 2025-10-09 12:00:00
 * @LastEditTime: 2025-10-09 19:57:30
 */
import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

export class CloudRenderer implements ShapeRenderer {
  readonly shape = "cloud";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;

    if (width <= 0 || height <= 0) return;

    ctx.save();

    // 根据宽高按比例绘制云朵形状
    const scaleX = width / 80;
    const scaleY = height / 46;

    // 平移到节点位置，然后缩放
    ctx.translate(x, y);
    ctx.scale(scaleX, scaleY);

    ctx.beginPath();
    // 修正云朵路径，确保左边界从 x=0 开始
    ctx.moveTo(15, 42);
    ctx.bezierCurveTo(5, 42, -5, 32, 5, 24);
    ctx.bezierCurveTo(7, 14, 17, 10, 25, 14);
    ctx.bezierCurveTo(28, 2, 43, -5, 51, 8);
    ctx.bezierCurveTo(57, 6, 65, 10, 67, 18);
    ctx.bezierCurveTo(75, 18, 80, 24, 79, 32);
    ctx.bezierCurveTo(79, 40, 71, 46, 63, 46);
    ctx.lineTo(19, 46);
    ctx.bezierCurveTo(17, 46, 16, 44, 15, 42);
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
      ctx.lineWidth = strokeWidth / Math.min(scaleX, scaleY); // 调整线宽以适应缩放
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
