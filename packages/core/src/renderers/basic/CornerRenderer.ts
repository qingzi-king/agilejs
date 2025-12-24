/*
 * @Description: 拐角渲染器（极简 L 形：两个直角；内侧更短；端部用直线连接形成斜切）
 * @Author: qingzi.wang
 * @Date: 2025-10-11 13:54:28
 * @LastEditTime: 2025-10-11 14:43:35
 */

import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

/**
 * 形状：极简 L 形拐角，只有两个直角。内侧两条臂比外侧更短，
 * 在水平右端与垂直下端使用直线连接外/内边，形成斜切端面。
 * 参数（随 size 自适应）：
 *  - 臂厚 t = min(W, H) * 0.30（>=4）
 *  - 内缩 s = min(t * 0.8, W - t - 2, H - t - 2, >=0)
 */
export class CornerRenderer implements ShapeRenderer {
  readonly shape = "corner";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;
    if (width <= 0 || height <= 0) return;

    const W = width;
    const H = height;
    // 与 SVG 预览一致：臂厚约占最小边的 15%，端部斜切量等于臂厚（45°）
    const t = Math.max(4, Math.min(W, H) * 0.15);
    const s = Math.max(0, Math.min(t, W - t - 2, H - t - 2));

    const ox = x,
      oy = y; // 左上角（外角）

    // 轮廓：单个多边形路径（顺时针），外边 -> 斜切 -> 内边 -> 斜切 -> 外边
    const P0x = ox,
      P0y = oy; // 外 顶-左
    const P1x = ox + W,
      P1y = oy; // 外 顶-右
    const P2x = ox + (W - s),
      P2y = oy + t; // 顶部斜切（缩短量 = 臂厚）
    const P3x = ox + t,
      P3y = oy + t; // 内 顶-左（靠角）
    const P4x = ox + t,
      P4y = oy + (H - s); // 侧部斜切（缩短量 = 臂厚）
    const P5x = ox,
      P5y = oy + H; // 外 左-下

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(P0x, P0y);
    ctx.lineTo(P1x, P1y);
    ctx.lineTo(P2x, P2y); // 顶部斜切（外顶右 -> 内顶右）
    ctx.lineTo(P3x, P3y);
    ctx.lineTo(P4x, P4y);
    ctx.lineTo(P5x, P5y); // 底部斜切（内右下 -> 外左下）
    ctx.closePath();

    const style = (node.data?.style as any) || {};
    const baseAlpha = style.alpha != null ? Number(style.alpha) : 1;

    // 填充（默认白底）
    {
      const fill = style.fill ?? "#ffffff";
      const hasFill = String(fill).toLowerCase() !== "transparent";
      if (hasFill) {
        const prevAlpha = ctx.globalAlpha;
        const fillAlpha = style.fillAlpha != null ? Number(style.fillAlpha) : 1;
        ctx.globalAlpha = baseAlpha * fillAlpha;
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.globalAlpha = prevAlpha;
      }
    }

    // 描边
    const strokeWidth = style.lineWidth != null ? Number(style.lineWidth) : 1.5;
    const stroke = style.stroke ?? "#000000";
    const hasStroke = strokeWidth > 0 && String(stroke).toLowerCase() !== "transparent";
    if (hasStroke) {
      const prevAlpha = ctx.globalAlpha;
      const strokeAlpha = style.strokeAlpha != null ? Number(style.strokeAlpha) : 1;
      ctx.globalAlpha = baseAlpha * strokeAlpha;
      ctx.strokeStyle = stroke;
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
