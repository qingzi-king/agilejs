/*
 * @Description: 直角三角形渲染器（支持四种直角方位）
 * @Author: qingzi.wang
 * @Date: 2025-10-10 22:00:00
 */
import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

type Orientation = "bl" | "br" | "tl" | "tr"; // 直角位于：左下/右下/左上/右上

export class RightTriangleRenderer implements ShapeRenderer {
  readonly shape = "right-triangle";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;
    if (width <= 0 || height <= 0) return;

    const style = (node.data?.style as any) || {};
    const baseAlpha = style.alpha != null ? Number(style.alpha) : 1;
    const strokeWidth = style.lineWidth != null ? Number(style.lineWidth) : 1.5;
    const hasStroke = !!style.stroke && strokeWidth > 0;
    const orientation = (style.orientation as Orientation) ?? "bl";

    const buildPath = (inset: number) => {
      const x0 = x + inset,
        y0 = y + inset;
      const x1 = x + width - inset,
        y1 = y + height - inset;

      let p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number };
      switch (orientation) {
        case "bl": // 直角：左下
          p0 = { x: x0, y: y1 }; // 左下
          p1 = { x: x0, y: y0 }; // 左上
          p2 = { x: x1, y: y1 }; // 右下（斜边：左上->右下）
          break;
        case "br": // 直角：右下
          p0 = { x: x1, y: y1 }; // 右下
          p1 = { x: x0, y: y1 }; // 左下
          p2 = { x: x1, y: y0 }; // 右上（斜边：左下->右上）
          break;
        case "tl": // 直角：左上
          p0 = { x: x0, y: y0 }; // 左上
          p1 = { x: x0, y: y1 }; // 左下
          p2 = { x: x1, y: y0 }; // 右上（斜边：左下->右上）
          break;
        case "tr": // 直角：右上
        default:
          p0 = { x: x1, y: y0 }; // 右上
          p1 = { x: x1, y: y1 }; // 右下
          p2 = { x: x0, y: y0 }; // 左上（斜边：右下->左上）
          break;
      }

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();
    };

    ctx.save();

    // 填充：满贴容器
    {
      const hasFill = !!style.fill && String(style.fill).toLowerCase() !== "transparent";
      if (hasFill) {
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = baseAlpha * (style.fillAlpha != null ? Number(style.fillAlpha) : 1);
        ctx.fillStyle = style.fill;
        buildPath(0);
        ctx.fill();
        ctx.globalAlpha = prevAlpha;
      }
    }

    // 描边：内缩 strokeWidth/2，描边完全在容器内
    if (hasStroke) {
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = baseAlpha * (style.strokeAlpha != null ? Number(style.strokeAlpha) : 1);
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = strokeWidth;
      if (Array.isArray(style.lineDash)) ctx.setLineDash(style.lineDash);
      if (style.lineCap) ctx.lineCap = style.lineCap;
      if (style.lineJoin) ctx.lineJoin = style.lineJoin;
      if (style.miterLimit != null) ctx.miterLimit = style.miterLimit;
      buildPath(strokeWidth / 2);
      ctx.stroke();
      ctx.globalAlpha = prevAlpha;
    }

    ctx.restore();
  }

  renderEdge(_ctx: CanvasRenderingContext2D, _edge: EdgeData, _graph: Graph): void {}
}
