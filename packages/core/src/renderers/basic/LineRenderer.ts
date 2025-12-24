/*
 * @Description: 直线/折线节点渲染器（node.shape = 'line'）支持：stroke/lineWidth/lineDash/lineCap/lineJoin/miterLimit；折点圆角使用 node.data.style.borderRadius（数值，像素），内部用 ctx.arcTo 实现。
 * @Author: qingzi.wang
 * @Date: 2025-10-28 17:13:25
 * @LastEditTime: 2025-10-28 18:27:28
 */

import { Graph, NodeData, EdgeData, Point } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

export class LineRenderer implements ShapeRenderer {
  readonly shape = "line";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;
    const style = (node.data?.style as any) || {};
    const line = (node.data as any)?.line || {};
    const pointsN: Array<{ u: number; v: number }> =
      Array.isArray(line.pointsNormalized) && line.pointsNormalized.length >= 2
        ? line.pointsNormalized
        : [
            { u: 0.1, v: 0.9 },
            { u: 0.9, v: 0.1 },
          ];

    const pts: Point[] = pointsN.map((p) => ({ x: x + p.u * width, y: y + p.v * height }));
    if (pts.length < 2) return;

    ctx.save();
    const strokeWidth = style.lineWidth != null ? Number(style.lineWidth) : 2;
    const hasStroke = !!style.stroke && strokeWidth > 0;

    // 构建主路径（包含可选圆角）
    const r: number = Math.max(0, Number(style.borderRadius ?? 0));
    const path = new Path2D();
    path.moveTo(pts[0].x, pts[0].y);
    if (r > 0 && pts.length >= 3) {
      for (let i = 1; i < pts.length - 1; i++) {
        const m = pts[i];
        const n2 = pts[i + 1];
        path.arcTo(m.x, m.y, n2.x, n2.y, r);
      }
      path.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    } else {
      for (let i = 1; i < pts.length; i++) path.lineTo(pts[i].x, pts[i].y);
    }

    const baseAlpha = style.alpha != null ? Number(style.alpha) : 1;
    const strokeAlpha = style.strokeAlpha != null ? Number(style.strokeAlpha) : 1;
    const progress = (line as any)?.progress as
      | undefined
      | {
          enabled?: boolean;
          ratio?: number;
          startRatio?: number;
          endRatio?: number;
          color?: string;
          baseColor?: string;
          baseAlphaScale?: number;
          reverse?: boolean;
        };

    if (hasStroke && progress?.enabled) {
      // 计算折线总长度（不计圆角弧长）
      let totalLen = 0;
      const segLens: number[] = [];
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        const len = Math.hypot(dx, dy);
        segLens.push(len);
        totalLen += len;
      }
      const clamp01 = (v: any) => Math.max(0, Math.min(1, Number(v)));
      const ratio = clamp01(progress.ratio ?? 0);
      const srRaw = (progress as any).startRatio;
      const erRaw = (progress as any).endRatio;
      const hasInterval = Number.isFinite(srRaw as number) && Number.isFinite(erRaw as number);
      const startRatio = hasInterval ? clamp01(srRaw) : 0;
      const endRatio = hasInterval ? clamp01(erRaw) : ratio;
      const aRatio = Math.min(startRatio, endRatio);
      const bRatio = Math.max(startRatio, endRatio);
      const progLen = hasInterval ? Math.max(0, (bRatio - aRatio) * totalLen) : totalLen * ratio;

      // 1) 底色整条线
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = prevAlpha * baseAlpha * strokeAlpha * (progress.baseAlphaScale ?? 0.8);
      ctx.strokeStyle = progress.baseColor ?? style.stroke;
      if (Array.isArray(style.lineDash)) ctx.setLineDash(style.lineDash);
      if (style.lineCap) ctx.lineCap = style.lineCap;
      if (style.lineJoin) ctx.lineJoin = style.lineJoin;
      if (style.miterLimit != null) ctx.miterLimit = style.miterLimit;
      ctx.lineWidth = strokeWidth;
      ctx.stroke(path);
      ctx.globalAlpha = prevAlpha;

      // 2) 进度段（子路径）
      if (progLen > 0) {
        const sub = new Path2D();
        if (hasInterval) {
          // 按区间 [aRatio, bRatio] 渲染
          const startLen = totalLen * aRatio;
          const endLen = totalLen * bRatio;
          let acc = 0;
          let drew = false;
          for (let i = 1; i < pts.length && acc < endLen; i++) {
            const a = pts[i - 1];
            const b = pts[i];
            const seg = segLens[i - 1];
            const nextAcc = acc + seg;
            // 本段和区间无交集
            if (nextAcc <= startLen - 1e-6) {
              acc = nextAcc;
              continue;
            }
            // 进入区间
            const segStart = Math.max(0, startLen - acc);
            const segEnd = Math.min(seg, endLen - acc);
            const t0 = Math.max(0, Math.min(1, segStart / seg));
            const t1 = Math.max(0, Math.min(1, segEnd / seg));
            const x0 = a.x + (b.x - a.x) * t0;
            const y0 = a.y + (b.y - a.y) * t0;
            const x1 = a.x + (b.x - a.x) * t1;
            const y1 = a.y + (b.y - a.y) * t1;
            if (!drew) {
              sub.moveTo(x0, y0);
              drew = true;
            }
            sub.lineTo(x1, y1);
            acc = nextAcc;
          }
        } else {
          // 旧逻辑：从首/尾开始累进至 ratio 所代表的长度
          let remain = progLen;
          if (!progress.reverse) {
            // 从起点开始
            sub.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length && remain > 0; i++) {
              const a = pts[i - 1];
              const b = pts[i];
              const seg = segLens[i - 1];
              if (seg <= remain + 1e-6) {
                sub.lineTo(b.x, b.y);
                remain -= seg;
              } else {
                const t = remain / seg;
                sub.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
                remain = 0;
                break;
              }
            }
          } else {
            // 从终点开始
            const last = pts.length - 1;
            sub.moveTo(pts[last].x, pts[last].y);
            for (let i = last; i >= 1 && remain > 0; i--) {
              const a = pts[i];
              const b = pts[i - 1];
              const seg = segLens[i - 1];
              if (seg <= remain + 1e-6) {
                sub.lineTo(b.x, b.y);
                remain -= seg;
              } else {
                const t = remain / seg;
                sub.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
                remain = 0;
                break;
              }
            }
          }
        }
        const prevDash = ctx.getLineDash();
        ctx.setLineDash([]);
        const prevAlpha2 = ctx.globalAlpha;
        ctx.globalAlpha = baseAlpha * strokeAlpha;
        ctx.strokeStyle = progress.color ?? style.stroke;
        ctx.lineWidth = strokeWidth;
        if (style.lineCap) ctx.lineCap = style.lineCap;
        if (style.lineJoin) ctx.lineJoin = style.lineJoin;
        if (style.miterLimit != null) ctx.miterLimit = style.miterLimit;
        ctx.stroke(sub);
        ctx.globalAlpha = prevAlpha2;
        ctx.setLineDash(prevDash);
      }
    } else if (hasStroke) {
      // 常规整条线描边
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = baseAlpha * strokeAlpha;
      ctx.strokeStyle = style.stroke;
      if (Array.isArray(style.lineDash)) ctx.setLineDash(style.lineDash);
      if (style.lineCap) ctx.lineCap = style.lineCap;
      if (style.lineJoin) ctx.lineJoin = style.lineJoin;
      if (style.miterLimit != null) ctx.miterLimit = style.miterLimit;
      ctx.lineWidth = strokeWidth;
      ctx.stroke(path);
      ctx.globalAlpha = prevAlpha;
    }
    ctx.restore();
  }

  renderEdge(_ctx: CanvasRenderingContext2D, _edge: EdgeData, _graph: Graph): void {
    // not used for edges
  }
}
