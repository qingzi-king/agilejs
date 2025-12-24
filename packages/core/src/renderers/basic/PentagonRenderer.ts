/*
 * @Description: 五边形渲染器（各顶点贴合容器边缘）
 * @Author: qingzi.wang
 * @Date: 2025-10-09 21:35:00
 * @LastEditTime: 2025-10-10 20:35:00
 */
import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

export class PentagonRenderer implements ShapeRenderer {
  readonly shape = "pentagon";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;
    if (width <= 0 || height <= 0) return;

    ctx.save();
    ctx.beginPath();

    const style = (node.data?.style as any) || {};
    const baseAlpha = style.alpha != null ? Number(style.alpha) : 1;
    const strokeWidth = style.lineWidth != null ? Number(style.lineWidth) : 1.5;
    const hasStroke = !!style.stroke && strokeWidth > 0;

    // 内缩，避免描边越界
    const inset = hasStroke ? strokeWidth / 2 : 0;
    const leftX = x + inset;
    const rightX = x + width - inset;
    const topY = y + inset;
    const bottomY = y + height - inset;

    // 可配置参数：左右边顶点的垂直比例 & 底边两顶点的水平内缩比例
    // sideRatio: 顶点在左右边上的相对高度 [0,1]，默认约 0.38（视觉接近正五边形比例）
    // bottomRatio: 底边左右顶点的水平内缩比例 [0,0.5)，默认 0.18
    let sideRatio = Number(style.sideRatio ?? 0.38);
    let bottomRatio = Number(style.bottomRatio ?? 0.18);
    if (!isFinite(sideRatio)) sideRatio = 0.38;
    if (!isFinite(bottomRatio)) bottomRatio = 0.18;

    // 夹紧，避免顶点跑到角或交叉
    sideRatio = Math.min(0.95, Math.max(0.05, sideRatio));
    bottomRatio = Math.min(0.45, Math.max(0.05, bottomRatio));

    const sideY = y + height * sideRatio;
    const top = { x: x + width / 2, y: topY }; // 顶部中点（贴合上边）
    const right = { x: rightX, y: Math.min(bottomY, Math.max(topY, sideY)) }; // 右边顶点（贴合右边）
    const bottomRight = { x: x + width * (1 - bottomRatio), y: bottomY }; // 底边右顶点（贴合下边）
    const bottomLeft = { x: x + width * bottomRatio, y: bottomY }; // 底边左顶点（贴合下边）
    const left = { x: leftX, y: Math.min(bottomY, Math.max(topY, sideY)) }; // 左边顶点（贴合左边）

    // 路径：顶 -> 右 -> 下右 -> 下左 -> 左 -> 闭合
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();

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
