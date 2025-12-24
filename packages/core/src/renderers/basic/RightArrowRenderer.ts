/*
 * @Description: 右箭头渲染器（原 ArrowRenderer 重命名）
 */
import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

export class RightArrowRenderer implements ShapeRenderer {
  readonly shape = "right-arrow";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;
    if (width <= 0 || height <= 0) return;

    const arrowHeadWidth = width * 0.3;
    const bodyHeight = height * 0.5;
    const bodyY = y + (height - bodyHeight) / 2;

    ctx.save();
    ctx.beginPath();
    // 箭头主体
    ctx.moveTo(x, bodyY);
    ctx.lineTo(x + width - arrowHeadWidth, bodyY);
    // 箭头头部
    ctx.lineTo(x + width - arrowHeadWidth, y);
    ctx.lineTo(x + width, y + height / 2);
    ctx.lineTo(x + width - arrowHeadWidth, y + height);
    ctx.lineTo(x + width - arrowHeadWidth, bodyY + bodyHeight);
    ctx.lineTo(x, bodyY + bodyHeight);
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
