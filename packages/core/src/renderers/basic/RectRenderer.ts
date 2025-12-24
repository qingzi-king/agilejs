/*
 * @Description: 矩形渲染器
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-25 20:24:24
 */
import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

export class RectRenderer implements ShapeRenderer {
  readonly shape = "rect";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;
    const style = (node.data?.style as any) || {};

    // 解析圆角（支持 number 或每角对象 { tl, tr, br, bl }），并进行夹取
    const uniformR = style.borderRadius ?? style.radius ?? 0;
    const radii =
      typeof uniformR === "number"
        ? { tl: uniformR, tr: uniformR, br: uniformR, bl: uniformR }
        : {
            tl: Number(uniformR?.tl ?? 0),
            tr: Number(uniformR?.tr ?? 0),
            br: Number(uniformR?.br ?? 0),
            bl: Number(uniformR?.bl ?? 0),
          };
    const maxR = Math.min(width, height) / 2;
    radii.tl = Math.max(0, Math.min(radii.tl, maxR));
    radii.tr = Math.max(0, Math.min(radii.tr, maxR));
    radii.br = Math.max(0, Math.min(radii.br, maxR));
    radii.bl = Math.max(0, Math.min(radii.bl, maxR));

    // 绘制
    ctx.save();
    const baseAlpha = style.alpha != null ? Number(style.alpha) : 1;
    // 线型（独立于填充）
    const strokeWidth = style.lineWidth != null ? Number(style.lineWidth) : 1.5;
    const hasStroke = !!style.stroke && strokeWidth > 0;
    if (hasStroke) {
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = strokeWidth;
      if (Array.isArray(style.lineDash)) ctx.setLineDash(style.lineDash);
      if (style.lineCap) ctx.lineCap = style.lineCap;
      if (style.lineJoin) ctx.lineJoin = style.lineJoin;
      if (style.miterLimit != null) ctx.miterLimit = style.miterLimit;
    }

    // 直接以左上角绘制，旋转统一在 ResizeRotatePlugin 的包装中处理，避免双重旋转
    drawRoundedRectPath(ctx, x, y, width, height, radii);

    // 填充：仅当提供了 fill 时进行；支持 fillAlpha 仅作用于填充阶段
    const hasFill = !!style.fill && String(style.fill).toLowerCase() !== "transparent";
    if (hasFill) {
      const prevAlpha = ctx.globalAlpha;
      const fillAlpha = style.fillAlpha != null ? Number(style.fillAlpha) : 1;
      ctx.globalAlpha = baseAlpha * fillAlpha;
      ctx.fillStyle = style.fill;
      ctx.fill();
      ctx.globalAlpha = prevAlpha;
    }
    // 描边：支持独立的 strokeAlpha（若未提供则与 baseAlpha 一致）
    if (hasStroke) {
      const prevAlpha = ctx.globalAlpha;
      const strokeAlpha = style.strokeAlpha != null ? Number(style.strokeAlpha) : 1;
      ctx.globalAlpha = baseAlpha * strokeAlpha;
      ctx.stroke();
      ctx.globalAlpha = prevAlpha;
    }
    ctx.restore();
  }

  renderEdge(ctx: CanvasRenderingContext2D, _edge: EdgeData, _graph: Graph): void {
    // Rect has no specific edge rendering
  }
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  r: { tl: number; tr: number; br: number; bl: number },
) {
  const rtl = r.tl || 0;
  const rtr = r.tr || 0;
  const rbr = r.br || 0;
  const rbl = r.bl || 0;
  ctx.beginPath();
  ctx.moveTo(x + rtl, y);
  ctx.lineTo(x + width - rtr, y);
  if (rtr) ctx.quadraticCurveTo(x + width, y, x + width, y + rtr);
  else ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height - rbr);
  if (rbr) ctx.quadraticCurveTo(x + width, y + height, x + width - rbr, y + height);
  else ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + rbl, y + height);
  if (rbl) ctx.quadraticCurveTo(x, y + height, x, y + height - rbl);
  else ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + rtl);
  if (rtl) ctx.quadraticCurveTo(x, y, x + rtl, y);
  else ctx.lineTo(x, y);
  ctx.closePath();
}
