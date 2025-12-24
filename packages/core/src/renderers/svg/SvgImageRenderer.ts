/*
 * @Description: 基于原生 SVG 光栅化的渲染器（shape = 'svg-image'）
 * @Author: qingzi.wang
 * @Date: 2025-10-11 20:55:23
 * @LastEditTime: 2025-10-11 20:59:39
 */

import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

type FitMode = "stretch" | "contain" | "cover";

function computeFit(nodeW: number, nodeH: number, viewW: number, viewH: number, fit: FitMode) {
  const sx = nodeW / viewW;
  const sy = nodeH / viewH;
  if (fit === "stretch") return { dw: nodeW, dh: nodeH, dx: 0, dy: 0 };
  const s = fit === "contain" ? Math.min(sx, sy) : Math.max(sx, sy);
  const dw = viewW * s;
  const dh = viewH * s;
  const dx = (nodeW - dw) / 2;
  const dy = (nodeH - dh) / 2;
  return { dw, dh, dx, dy };
}

export class SvgImageRenderer implements ShapeRenderer {
  readonly shape = "svg-image";

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;
    const { x, y } = node.position;
    const { width, height } = node.size;
    const style: any = (node.data as any)?.style || {};
    const baseAlpha: number = style.alpha != null ? Number(style.alpha) : 1;
    const svg: any = (node.data as any)?.svg || {};
    const xml: string | undefined = svg.xml; // 完整 SVG 文本
    if (!xml) return;
    const viewBox = svg.viewBox || { x: 0, y: 0, width: 100, height: 100 };
    const fit: FitMode = svg.fit || "contain";

    // 缓存图片对象，避免每帧重建
    const cacheKey = (node as any)._svgImageCacheKey as string | undefined;
    const nextKey = `${xml.length}_${viewBox.width}x${viewBox.height}`;
    let img: HTMLImageElement | undefined = (node as any)._svgImage as HTMLImageElement | undefined;
    if (!img || cacheKey !== nextKey) {
      const svgText = xml.includes("<svg")
        ? xml
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}">${xml}</svg>`;
      const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      img = new Image();
      // 重要：使用匿名模式避免 taint canvas
      img.crossOrigin = "anonymous";
      img.src = url;
      // 使用不可枚举属性保存运行期缓存，避免序列化
      Object.defineProperty(node as any, "_svgImage", { value: img, writable: true, configurable: true });
      Object.defineProperty(node as any, "_svgImageCacheKey", { value: nextKey, writable: true, configurable: true });
      // 预加载：由于渲染在帧中调用，若未加载完成，本帧跳过，下一帧将绘制
      img.onload = () => {
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
      };
    }

    // 若图片尚未加载完成，直接返回，避免闪烁
    if (!img || !img.complete) return;

    ctx.save();
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = prevAlpha * baseAlpha;
    ctx.translate(x, y);
    const { dw, dh, dx, dy } = computeFit(width, height, viewBox.width, viewBox.height, fit);
    // 在节点矩形中绘制位图
    try {
      ctx.drawImage(img, dx, dy, dw, dh);
    } catch {
      /* ignore draw errors */
    }
    ctx.globalAlpha = prevAlpha;
    ctx.restore();
  }

  renderEdge(_ctx: CanvasRenderingContext2D, _edge: EdgeData, _graph: Graph): void {
    /* no-op */
  }
}
