/*
 * @Description: 星形渲染器
 * @Author: qingzi.wang
 * @Date: 2025-10-09 12:00:00
 * @LastEditTime: 2025-10-09 12:00:00
 */
import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

export class StarRenderer implements ShapeRenderer {
  readonly shape = "star";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;
    if (width <= 0 || height <= 0) return;

    const style = (node.data?.style as any) || {};
    const baseAlpha = style.alpha != null ? Number(style.alpha) : 1;

    // 参数：尖数与内半径比例
    const spikes = Math.max(3, Math.floor(Number(style.spikes ?? 5)));
    let innerRatio = Number(style.innerRatio ?? 0.4);
    if (!isFinite(innerRatio)) innerRatio = 0.4;
    innerRatio = Math.min(0.95, Math.max(0.05, innerRatio));

    // 生成归一化星形（外半径=1，中心在(0,0)，顶部朝上）
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const radius = i % 2 === 0 ? 1 : innerRatio;
      pts.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }

    // 归一化包围盒
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const bw = maxX - minX,
      bh = maxY - minY;
    if (bw <= 1e-6 || bh <= 1e-6) return;

    // 构建映射到容器矩形（可指定内缩用于描边）
    const buildPathFit = (inset: number) => {
      const sx0 = x + inset,
        sy0 = y + inset;
      const sx1 = x + width - inset,
        sy1 = y + height - inset;
      const scaleX = (sx1 - sx0) / bw;
      const scaleY = (sy1 - sy0) / bh;

      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const px = sx0 + (pts[i].x - minX) * scaleX;
        const py = sy0 + (pts[i].y - minY) * scaleY;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    ctx.save();

    // 填充（满贴容器）
    {
      const hasFill = !!style.fill && String(style.fill).toLowerCase() !== "transparent";
      if (hasFill) {
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = baseAlpha * (style.fillAlpha != null ? Number(style.fillAlpha) : 1);
        ctx.fillStyle = style.fill;
        buildPathFit(0);
        ctx.fill();
        ctx.globalAlpha = prevAlpha;
      }
    }

    // 描边（内缩 strokeWidth/2，描边完全在容器内）
    const strokeWidth = style.lineWidth != null ? Number(style.lineWidth) : 1.5;
    const hasStroke = !!style.stroke && strokeWidth > 0;
    if (hasStroke) {
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = baseAlpha * (style.strokeAlpha != null ? Number(style.strokeAlpha) : 1);
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = strokeWidth;
      if (Array.isArray(style.lineDash)) ctx.setLineDash(style.lineDash);
      if (style.lineCap) ctx.lineCap = style.lineCap;
      if (style.lineJoin) ctx.lineJoin = style.lineJoin;
      if (style.miterLimit != null) ctx.miterLimit = style.miterLimit;

      buildPathFit(strokeWidth / 2);
      ctx.stroke();
      ctx.globalAlpha = prevAlpha;
    }

    ctx.restore();
  }

  renderEdge(_ctx: CanvasRenderingContext2D, _edge: EdgeData, _graph: Graph): void {}
}
