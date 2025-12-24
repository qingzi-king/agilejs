/*
 * @Description: 网格插件
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-11-13 13:42:01
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";

export type GridType = "line" | "dot";

export interface GridOptions {
  size?: number;
  color?: string;
  alpha?: number;
  type?: GridType;
  visible?: boolean;
}

export class GridPlugin implements Plugin {
  readonly id = "grid";
  public size: number;
  public color: string;
  public alpha: number;
  public type: GridType;
  public visible: boolean;
  private engine!: CanvasEngine;

  constructor(opts?: GridOptions) {
    this.size = opts?.size ?? 20;
    this.color = opts?.color ?? "#e5e7eb";
    this.alpha = opts?.alpha ?? 1;
    this.type = opts?.type ?? "line";
    this.visible = opts?.visible ?? true;
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;
  }

  /**
   * 更新网格配置
   * @param opts 部分配置项
   */
  update(opts: Partial<GridOptions>) {
    Object.assign(this, opts);
    // 标记为 dirty 以触发重绘（这里假设 style 类型的 dirty 会触发重绘）
    this.engine.graph.markDirty("style");
  }

  beforeRender(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    const { size, color, alpha, type } = this;
    const canvas = ctx.canvas;
    const scale = this.engine.getScale();

    // 性能优化：如果网格在屏幕上太密（间距小于 4px），就不绘制，避免卡顿
    if (size * scale < 4) return;

    // 获取当前视口在世界坐标系的范围
    const topLeft = this.engine.toWorld({ x: 0, y: 0 });
    const bottomRight = this.engine.toWorld({ x: canvas.width, y: canvas.height });

    // 计算网格起始位置（对齐到网格）
    const startX = Math.floor(topLeft.x / size) * size;
    const startY = Math.floor(topLeft.y / size) * size;
    const endX = Math.ceil(bottomRight.x / size) * size;
    const endY = Math.ceil(bottomRight.y / size) * size;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (type === "line") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1; // 线宽在屏幕坐标系下固定为 1px

      // 绘制垂直线
      ctx.beginPath();
      for (let x = startX; x <= endX; x += size) {
        const screenPos = this.engine.toScreen({ x, y: topLeft.y });
        // +0.5 为了让 1px 线条在屏幕上显示清晰（避免抗锯齿模糊）
        const sx = Math.floor(screenPos.x) + 0.5;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, canvas.height);
      }

      // 绘制水平线
      for (let y = startY; y <= endY; y += size) {
        const screenPos = this.engine.toScreen({ x: topLeft.x, y });
        const sy = Math.floor(screenPos.y) + 0.5;
        ctx.moveTo(0, sy);
        ctx.lineTo(canvas.width, sy);
      }
      ctx.stroke();
    } else if (type === "dot") {
      ctx.fillStyle = color;
      const dotSize = 2; // 点的大小（屏幕像素）
      const offset = dotSize / 2;

      // 点状网格绘制
      // 使用 fillRect 绘制矩形点，性能通常优于 arc
      for (let x = startX; x <= endX; x += size) {
        for (let y = startY; y <= endY; y += size) {
          const screenPos = this.engine.toScreen({ x, y });
          ctx.fillRect(screenPos.x - offset, screenPos.y - offset, dotSize, dotSize);
        }
      }
    }

    ctx.restore();
  }

  // 由引擎主题系统调用
  setTheme(theme: { color?: string; alpha?: number }): void {
    if (theme.color) this.color = theme.color;
    if (typeof theme.alpha === "number") this.alpha = theme.alpha;
  }
}
