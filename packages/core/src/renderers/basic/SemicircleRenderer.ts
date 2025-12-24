/*
 * @Description: 半圆渲染器
 * @Author: qingzi.wang
 * @Date: 2025-10-09 12:00:00
 * @LastEditTime: 2025-10-09 20:45:00
 */
import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

export class SemicircleRenderer implements ShapeRenderer {
  readonly shape = "semicircle";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;

    if (width <= 0 || height <= 0) return;

    ctx.save();
    ctx.beginPath();

    // 根据容器宽高绘制半圆
    // 半圆的直径总是等于宽度，高度用于控制椭圆的垂直压缩/拉伸
    const radiusX = width / 2;
    const radiusY = height;
    const centerX = x + width / 2;
    const centerY = y + height; // 中心点在容器底部

    // 绘制上半圆，从左端点逆时针到右端点
    ctx.ellipse(
      centerX,
      centerY, // 中心点在底部
      radiusX,
      radiusY, // 横轴半径、纵轴半径
      0, // 旋转角度
      Math.PI,
      0, // 起始角度π（左端点），结束角度0（右端点）
      false, // 逆时针方向
    );

    // 直线封闭路径
    ctx.lineTo(x + width, y + height); // 右下角
    ctx.lineTo(x, y + height); // 左下角
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
