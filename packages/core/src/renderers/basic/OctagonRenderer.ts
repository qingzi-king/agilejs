/*
 * @Description: 八边形渲染器（上下左右贴边，四角斜切）
 * @Author: qingzi.wang
 * @Date: 2025-10-09 21:35:00
 * @LastEditTime: 2025-10-11 13:04:40
 */
import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

export class OctagonRenderer implements ShapeRenderer {
  readonly shape = "octagon";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;
    if (width <= 0 || height <= 0) return;

    const style = (node.data?.style as any) || {};
    const baseAlpha = style.alpha != null ? Number(style.alpha) : 1;
    const strokeWidth = style.lineWidth != null ? Number(style.lineWidth) : 1.5;
    const hasStroke = !!style.stroke && strokeWidth > 0;

    // 像素切角（显式优先）
    let pxX = Number(style.cornerPxX ?? style.cornerPx);
    let pxY = Number(style.cornerPxY ?? style.cornerPx);

    // 比例（用于初始化与“本帧双轴变化”时重算）
    let rx = Number(style.cornerRatioX ?? style.cornerRatio ?? 0.2);
    let ry = Number(style.cornerRatioY ?? style.cornerRatio ?? 0.2);
    if (!isFinite(rx)) rx = 0.2;
    if (!isFinite(ry)) ry = 0.2;
    rx = Math.min(0.45, Math.max(0.05, rx));
    ry = Math.min(0.45, Math.max(0.05, ry));

    type OctCache = {
      pxX: number;
      pxY: number;
      rx: number;
      ry: number;
      lastCW: number;
      lastCH: number;
      sClampX?: number;
      sClampY?: number;
    };
    const dataAny = (node.data ??= {}) as any;
    let oct: OctCache | undefined = dataAny.__oct;

    const explicitPxX = Number(style.cornerPxX ?? style.cornerPx);
    const explicitPxY = Number(style.cornerPxY ?? style.cornerPx);
    const hasExplicitX = isFinite(explicitPxX) && explicitPxX > 0;
    const hasExplicitY = isFinite(explicitPxY) && explicitPxY > 0;

    // 仅负责初始化缓存（正方形走“等长解”）
    const ensureCornerInit = (W: number, H: number) => {
      if (oct) return;
      let initPxX: number, initPxY: number;
      if (!hasExplicitX && !hasExplicitY) {
        // 等长解：正方形时斜边=直边，长宽不等时尽量平衡
        const sum = W + H;
        const D = sum * sum + 2 * (W * W + H * H);
        let s = 0.5 * (-sum + Math.sqrt(D));
        const sMax = Math.min(W, H) - 1e-3;
        s = Math.max(1e-3, Math.min(sMax, s));
        initPxX = (W - s) / 2;
        initPxY = (H - s) / 2;
      } else {
        initPxX = hasExplicitX ? explicitPxX : W * rx;
        initPxY = hasExplicitY ? explicitPxY : H * ry;
      }
      oct = {
        pxX: initPxX,
        pxY: initPxY,
        rx: hasExplicitX ? initPxX / W : rx,
        ry: hasExplicitY ? initPxY / H : ry,
        lastCW: W,
        lastCH: H,
      };
      try {
        dataAny.__oct = oct;
      } catch {}
    };

    // 初始化（仅一次）
    ensureCornerInit(width, height);

    // 基于“上一帧容器尺寸”判断本帧是否双轴同时变化
    const cW = width,
      cH = height;
    const EPS = 0.25;
    const lastCW = (oct as any)?.lastCW;
    const lastCH = (oct as any)?.lastCH;
    const changedW = !isFinite(lastCW) ? false : Math.abs(cW - lastCW) > EPS;
    const changedH = !isFinite(lastCH) ? false : Math.abs(cH - lastCH) > EPS;

    // 本帧是否允许重算切角像素（仅当宽高同帧都变化）
    const allowRecalc = changedW && changedH;

    if (allowRecalc) {
      // 双轴变化：按缓存比例重算（显式像素仍保持显式值）
      if (!hasExplicitX) {
        pxX = cW * (oct!.rx ?? rx);
        oct!.pxX = pxX;
      } else {
        pxX = explicitPxX;
      }
      if (!hasExplicitY) {
        pxY = cH * (oct!.ry ?? ry);
        oct!.pxY = pxY;
      } else {
        pxY = explicitPxY;
      }
    } else {
      // 单轴变化：保持像素不变（仅后续按轴夹紧）
      pxX = hasExplicitX ? explicitPxX : oct!.pxX;
      pxY = hasExplicitY ? explicitPxY : oct!.pxY;
    }

    const buildPath = (inset: number) => {
      const sx0 = x + inset,
        sy0 = y + inset;
      const sx1 = x + width - inset,
        sy1 = y + height - inset;
      const W = sx1 - sx0,
        H = sy1 - sy0;
      if (W <= 0 || H <= 0) return false;

      const wantX = Math.max(0, pxX || 0);
      const wantY = Math.max(0, pxY || 0);

      // 上限与最小直边（用容器尺寸，避免 inset 影响），最小直边=5
      const capRatio = 0.5 - 1e-3;
      const capX = Math.max(0, cW * capRatio);
      const capY = Math.max(0, cH * capRatio);
      const minEdgeX = Math.max(0, Number((style as any).minEdgePxX ?? (style as any).minEdgePx ?? 5));
      const minEdgeY = Math.max(0, Number((style as any).minEdgePxY ?? (style as any).minEdgePx ?? 5));

      // 分轴候选夹紧比例（仅收缩）
      const sCapX = wantX > 0 ? Math.min(1, capX / wantX) : 1;
      const sCapY = wantY > 0 ? Math.min(1, capY / wantY) : 1;
      const sMinX = wantX > 0 ? Math.min(1, (cW - minEdgeX) / (2 * wantX)) : 1;
      const sMinY = wantY > 0 ? Math.min(1, (cH - minEdgeY) / (2 * wantY)) : 1;

      let sXcand = Math.max(0, Math.min(1, Math.min(sCapX, sMinX)));
      let sYcand = Math.max(0, Math.min(1, Math.min(sCapY, sMinY)));

      // 黏性按轴：仅当该轴本帧有变化才更新该轴比例，否则沿用上帧，避免换轴时反弹/跳变
      const sXprev = isFinite((oct as any)?.sClampX) ? Number((oct as any).sClampX) : 1;
      const sYprev = isFinite((oct as any)?.sClampY) ? Number((oct as any).sClampY) : 1;
      const sX = changedW ? sXcand : sXprev;
      const sY = changedH ? sYcand : sYprev;

      const ox = wantX * sX;
      const oy = wantY * sY;

      // 记录黏性比例
      if (oct) {
        (oct as any).sClampX = sX;
        (oct as any).sClampY = sY;
        try {
          (node.data as any).__oct = oct;
        } catch {}
      }

      ctx.beginPath();
      ctx.moveTo(sx0 + ox, sy0);
      ctx.lineTo(sx1 - ox, sy0);
      ctx.lineTo(sx1, sy0 + oy);
      ctx.lineTo(sx1, sy1 - oy);
      ctx.lineTo(sx1 - ox, sy1);
      ctx.lineTo(sx0 + ox, sy1);
      ctx.lineTo(sx0, sy1 - oy);
      ctx.lineTo(sx0, sy0 + oy);
      ctx.closePath();
      return true;
    };

    ctx.save();

    // 填充：若有描边，用同一内缩路径避免斜边溢出
    {
      const hasFill = !!style.fill && String(style.fill).toLowerCase() !== "transparent";
      if (hasFill) {
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = baseAlpha * (style.fillAlpha != null ? Number(style.fillAlpha) : 1);
        ctx.fillStyle = style.fill;
        const insetForFill = hasStroke ? strokeWidth / 2 : 0;
        if (buildPath(insetForFill)) ctx.fill();
        ctx.globalAlpha = prevAlpha;
      }
    }

    // 描边：内缩 strokeWidth/2
    if (hasStroke) {
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = baseAlpha * (style.strokeAlpha != null ? Number(style.strokeAlpha) : 1);
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = strokeWidth;
      if (Array.isArray(style.lineDash)) ctx.setLineDash(style.lineDash);
      if (style.lineCap) ctx.lineCap = style.lineCap;
      if (style.lineJoin) ctx.lineJoin = style.lineJoin; // 建议 miter
      if (style.miterLimit != null) ctx.miterLimit = style.miterLimit;
      if (buildPath(strokeWidth / 2)) ctx.stroke();
      ctx.globalAlpha = prevAlpha;
    }

    ctx.restore();

    // 渲染后更新“上一帧容器尺寸”
    if (oct) {
      (oct as any).lastCW = cW;
      (oct as any).lastCH = cH;
      try {
        (node.data as any).__oct = oct;
      } catch {}
    }
  }

  renderEdge(_ctx: CanvasRenderingContext2D, _edge: EdgeData, _graph: Graph): void {}
}
