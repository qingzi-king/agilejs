/*
 * @Description: 圆柱形渲染器
 * @Author: qingzi.wang
 * @Date: 2025-10-09 12:00:00
 * @LastEditTime: 2025-10-09 20:25:00
 */
import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

export class CylinderRenderer implements ShapeRenderer {
  readonly shape = "cylinder";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;

    if (width <= 0 || height <= 0) return;

    const ellipseHeight = height * 0.15; // 椭圆高度比例
    const rx = width / 2;
    const ry = ellipseHeight;
    const centerX = x + rx;

    ctx.save();

    const style = (node.data?.style as any) || {};
    const baseAlpha = style.alpha != null ? Number(style.alpha) : 1;

    // 先绘制顶部椭圆（完整椭圆）
    ctx.beginPath();
    ctx.ellipse(centerX, y + ry, rx, ry, 0, 0, Math.PI * 2);
    // 不要闭合或填充，保持路径开放

    // 绘制圆柱体侧面
    // 右侧线 - 从椭圆右侧点向下
    ctx.moveTo(x + width, y + ry);
    ctx.lineTo(x + width, y + height - ry);

    // 底部椭圆 - 只绘制下半部分（可见部分）
    ctx.ellipse(centerX, y + height - ry, rx, ry, 0, 0, Math.PI);

    // 左侧线 - 从底部椭圆左侧点向上
    ctx.lineTo(x, y + ry);

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

      // 描边整个圆柱体
      ctx.stroke();

      // 移除底部椭圆的上半部分（隐藏线）

      ctx.globalAlpha = prevAlpha;
    }
    ctx.restore();
  }

  renderEdge(_ctx: CanvasRenderingContext2D, _edge: EdgeData, _graph: Graph): void {}
}
