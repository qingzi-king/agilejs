/*
 * @Description: 图像渲染器（支持 URL 和 base64）
 * @Author: qingzi.wang
 * @Date: 2025-11-22 17:30:00
 * @LastEditTime: 2025-12-15 19:31:08
 */

import { Graph, NodeData, EdgeData } from "../../model/Graph";
import { ShapeRenderer } from "../../renderer/ShapeRenderer";

type FitMode = "fill" | "contain" | "cover";

/**
 * 计算图片在节点内的绘制区域
 */
function computeFit(nodeW: number, nodeH: number, imgW: number, imgH: number, fit: FitMode) {
  if (fit === "fill") {
    // 拉伸填充
    return { dw: nodeW, dh: nodeH, dx: 0, dy: 0 };
  }

  const scaleX = nodeW / imgW;
  const scaleY = nodeH / imgH;

  if (fit === "contain") {
    // 完整显示图片，保持比例
    const scale = Math.min(scaleX, scaleY);
    const dw = imgW * scale;
    const dh = imgH * scale;
    return {
      dw,
      dh,
      dx: (nodeW - dw) / 2,
      dy: (nodeH - dh) / 2,
    };
  }

  // cover: 填充满节点，保持比例，可能裁剪
  const scale = Math.max(scaleX, scaleY);
  const dw = imgW * scale;
  const dh = imgH * scale;
  return {
    dw,
    dh,
    dx: (nodeW - dw) / 2,
    dy: (nodeH - dh) / 2,
  };
}

export class ImageRenderer implements ShapeRenderer {
  readonly shape = "image";

  // 图片缓存，避免重复创建 Image 对象
  private imageCache = new Map<string, HTMLImageElement>();
  // 失败图片记录，避免无限重试
  private failedUrls = new Set<string>();
  // 简易 LRU 限制：最多缓存的图片数量与总像素上限（防止内存增长过快）
  private maxCacheItems = 256;
  private maxTotalPixels = 64000000; // ~64MPixel，约256MB RGBA，但大多数情况下会更小
  private currentTotalPixels = 0;

  private evictIfNeeded(): void {
    // 若超出上限，按插入顺序逐出（Map 的迭代顺序为插入顺序）
    while (this.imageCache.size > this.maxCacheItems || this.currentTotalPixels > this.maxTotalPixels) {
      const firstKey = this.imageCache.keys().next().value as string | undefined;
      if (!firstKey) break;
      const img = this.imageCache.get(firstKey);
      if (img) {
        // 从总像素估算中扣除
        if (img.naturalWidth && img.naturalHeight) {
          this.currentTotalPixels = Math.max(0, this.currentTotalPixels - img.naturalWidth * img.naturalHeight);
        }
      }
      this.imageCache.delete(firstKey);
    }
  }

  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, _graph: Graph): void {
    if (node.visible === false) return;

    const { x, y } = node.position;
    const { width, height } = node.size;
    const style: any = (node.data as any)?.style || {};
    const imageData: any = (node.data as any)?.image || {};

    const src: string | undefined = imageData.src;
    if (!src) {
      // 无图片源，绘制占位符
      this.renderPlaceholder(ctx, x, y, width, height, style);
      return;
    }

    // 检查是否已标记为失败
    if (this.failedUrls.has(src)) {
      this.renderPlaceholder(ctx, x, y, width, height, style, true);
      return;
    }

    const baseAlpha: number = style.alpha != null ? Number(style.alpha) : 1;
    const fit: FitMode = imageData.fit || "contain";
    const borderRadius: number = style.borderRadius ?? style.radius ?? 0;

    // 获取或创建图片对象
    let img = this.imageCache.get(src);
    if (!img) {
      img = new Image();
      img.crossOrigin = "anonymous"; // 避免 taint canvas
      img.src = src;
      this.imageCache.set(src, img);
      // 插入后检查是否需要逐出旧项
      this.evictIfNeeded();

      // 加载完成后触发重绘
      img.onload = () => {
        // 记录像素规模，便于 LRU 控制
        if (img && img.naturalWidth && img.naturalHeight) {
          this.currentTotalPixels += img.naturalWidth * img.naturalHeight;
          this.evictIfNeeded();
        }
        _graph.markDirty();
      };

      img.onerror = () => {
        console.warn(`Failed to load image: ${src}`);
        this.imageCache.delete(src);
        this.failedUrls.add(src);
        _graph.markDirty();
      };
    }

    // 图片未加载完成，显示占位符
    if (!img.complete || !img.naturalWidth) {
      this.renderPlaceholder(ctx, x, y, width, height, style);
      return;
    }

    ctx.save();
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = prevAlpha * baseAlpha;

    ctx.translate(x, y);

    // 应用圆角裁剪
    if (borderRadius > 0) {
      const maxR = Math.min(width, height) / 2;
      const r = Math.min(borderRadius, maxR);
      this.drawRoundedRectPath(ctx, 0, 0, width, height, r);
      ctx.clip();
    }

    // 计算绘制区域
    const { dw, dh, dx, dy } = computeFit(width, height, img.naturalWidth, img.naturalHeight, fit);

    // 绘制图片
    try {
      ctx.drawImage(img, dx, dy, dw, dh);
    } catch (err) {
      console.warn("Failed to draw image:", err);
    }

    // 绘制边框
    const strokeWidth = style.lineWidth != null ? Number(style.lineWidth) : 0;
    if (style.stroke && strokeWidth > 0) {
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = strokeWidth;
      if (Array.isArray(style.lineDash)) ctx.setLineDash(style.lineDash);

      if (borderRadius > 0) {
        const maxR = Math.min(width, height) / 2;
        const r = Math.min(borderRadius, maxR);
        this.drawRoundedRectPath(ctx, 0, 0, width, height, r);
      } else {
        ctx.strokeRect(0, 0, width, height);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = prevAlpha;
    ctx.restore();
  }

  renderEdge(_ctx: CanvasRenderingContext2D, _edge: EdgeData, _graph: Graph): void {
    // 图片节点不支持边渲染
  }

  /**
   * 绘制占位符（加载中或加载失败）
   */
  private renderPlaceholder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    style: any,
    isError: boolean = false,
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // 背景
    ctx.fillStyle = style.fill || "#f3f4f6";
    const borderRadius = style.borderRadius ?? style.radius ?? 0;
    if (borderRadius > 0) {
      const maxR = Math.min(width, height) / 2;
      const r = Math.min(borderRadius, maxR);
      this.drawRoundedRectPath(ctx, 0, 0, width, height, r);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, width, height);
    }

    // 绘制图标
    const iconSize = Math.min(width, height) * 0.3;
    const iconX = (width - iconSize) / 2;
    const iconY = (height - iconSize) / 2;

    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 2;
    ctx.strokeRect(iconX, iconY, iconSize, iconSize);

    // 简单的图片图标
    ctx.beginPath();
    ctx.arc(iconX + iconSize * 0.3, iconY + iconSize * 0.3, iconSize * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(iconX, iconY + iconSize);
    ctx.lineTo(iconX + iconSize * 0.4, iconY + iconSize * 0.6);
    ctx.lineTo(iconX + iconSize * 0.7, iconY + iconSize * 0.8);
    ctx.lineTo(iconX + iconSize, iconY + iconSize * 0.5);
    ctx.stroke();

    if (isError) {
      // 绘制错误图标（红色裂开/叉号）
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;

      // 叉号
      ctx.beginPath();
      const crossSize = iconSize * 0.4;
      const cx = iconX + iconSize;
      const cy = iconY;
      ctx.moveTo(cx - crossSize / 2, cy - crossSize / 2);
      ctx.lineTo(cx + crossSize / 2, cy + crossSize / 2);
      ctx.moveTo(cx + crossSize / 2, cy - crossSize / 2);
      ctx.lineTo(cx - crossSize / 2, cy + crossSize / 2);
      ctx.stroke();
    }

    // 边框
    const strokeWidth = style.lineWidth != null ? Number(style.lineWidth) : 1;
    if (style.stroke && strokeWidth > 0) {
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = strokeWidth;
      if (borderRadius > 0) {
        const maxR = Math.min(width, height) / 2;
        const r = Math.min(borderRadius, maxR);
        this.drawRoundedRectPath(ctx, 0, 0, width, height, r);
      } else {
        ctx.strokeRect(0, 0, width, height);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 绘制圆角矩形路径
   */
  private drawRoundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }

  /**
   * 清理图片缓存
   */
  dispose(): void {
    this.imageCache.clear();
    this.failedUrls.clear();
    this.currentTotalPixels = 0;
  }
}
