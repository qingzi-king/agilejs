/*
 * @Description: 扇形渲染器
 * @Author: qingzi.wang
 * @Date: 2025-10-09 21:35:00
 * @LastEditTime: 2025-10-10 14:09:14
 */
import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

export class SectorRenderer implements ShapeRenderer {
  readonly shape = "sector";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;
    if (width <= 0 || height <= 0) return;

    ctx.save();
    ctx.beginPath();

    // 样式提前，便于半径扣除描边防止越界
    const style = (node.data?.style as any) || {};
    const baseAlpha = style.alpha != null ? Number(style.alpha) : 1;
    const strokeWidth = style.lineWidth != null ? Number(style.lineWidth) : 1.5;
    const hasStroke = !!style.stroke && strokeWidth > 0;

    // 圆心：底部中点（只是“顶点”B，用来闭合，不作为圆弧圆心）
    const centerX = x + width / 2;
    const centerY = y + height;

    // 三点定义圆弧：
    // - L、R 为左右弧端，位于固定垂直比例的 yArc（随尺寸等比例，不改变形状）
    // - T 为顶部内边缘点（与容器顶部贴合，弧外侧贴边）
    const inset = hasStroke ? strokeWidth / 2 : 0;
    const topY = y + inset;

    // 调低默认比例为 0.15（越小半径越大，弧更扁；保持可通过样式覆盖）
    let arcYRatio = Number(style.arcYRatio ?? style.arcRatio ?? 0.15);
    if (!isFinite(arcYRatio)) arcYRatio = 0.15;
    arcYRatio = Math.min(0.98, Math.max(0.05, arcYRatio));

    // 用顶部内边到底部的可用高度来计算，保证描边内缩后一致
    const yArc = Math.max(topY + 1e-3, topY + (height - inset) * arcYRatio);
    const L = { x: x + inset, y: yArc };
    const R = { x: x + width - inset, y: yArc };
    const T = { x: x + width / 2, y: topY };

    // 通过三点(T, L, R)求圆
    function circleFrom3Points(
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      p3: { x: number; y: number },
    ) {
      const A = p1.x - p2.x,
        B = p1.y - p2.y;
      const C = p1.x - p3.x,
        D = p1.y - p3.y;
      const E = (p1.x * p1.x - p2.x * p2.x + p1.y * p1.y - p2.y * p2.y) / 2;
      const F = (p1.x * p1.x - p3.x * p3.x + p1.y * p1.y - p3.y * p3.y) / 2;
      const den = A * D - B * C;
      if (Math.abs(den) < 1e-6) return null;
      const cx = (D * E - B * F) / den;
      const cy = (-C * E + A * F) / den;
      const r = Math.hypot(p1.x - cx, p1.y - cy);
      return { cx, cy, r };
    }

    const circle = circleFrom3Points(T, L, R);

    // 路径：B -> L -> 圆弧(L~R，经 T) -> B
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(L.x, L.y);

    if (circle) {
      const { cx, cy, r } = circle;
      const aL = Math.atan2(L.y - cy, L.x - cx);
      const aR = Math.atan2(R.y - cy, R.x - cx);
      const aT = Math.atan2(T.y - cy, T.x - cx);

      // 判断逆/顺时针，使圆弧经过 T（弧外侧贴顶部）
      function normalize(a: number) {
        const twopi = Math.PI * 2;
        return ((a % twopi) + twopi) % twopi;
      }
      function isBetweenCCW(target: number, start: number, end: number) {
        const t = normalize(target),
          s = normalize(start),
          e = normalize(end);
        if (s <= e) return s <= t && t <= e;
        return t >= s || t <= e;
      }
      const anticlockwise = !isBetweenCCW(aT, aL, aR); // 若 T 不在 L->R 的 CCW 区间，则取逆时针

      ctx.arc(cx, cy, r, aL, aR, anticlockwise);
    } else {
      // 退化处理：用二次贝塞尔近似（仍保持弧外侧贴近顶部）
      ctx.quadraticCurveTo(T.x, T.y, R.x, R.y);
    }

    ctx.lineTo(centerX, centerY);
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
