/*
 * @Description:  数据悬停提示（编辑模式）
 * @Author: qingzi.wang
 * @Date: 2025-10-31 11:32:24
 * @LastEditTime: 2025-10-31 11:40:50
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";

export interface DataTooltipOptions {
  delayMs?: number; // 悬停延时
  maxWidthPx?: number; // 文字换行最大宽度
  maxLines?: number; // 最大行数
  pixelThresholdPx?: number; // 命中阈值（像素）
  includeEdges?: boolean; // 预留：是否支持边悬停（当前仅节点）
  formatter?: (data: Record<string, unknown>) => string | string[];
}

export class DataTooltipPlugin implements Plugin {
  readonly id = "data-tooltip";
  private engine!: CanvasEngine;
  private opts: Required<DataTooltipOptions>;

  private hoverTimer: number | null = null;
  private currentNodeId: string | null = null;
  private pendingNodeId: string | null = null;
  private show = false;
  private screenPos = { x: 0, y: 0 };
  private lines: string[] = [];

  constructor(options: DataTooltipOptions = {}) {
    this.opts = {
      delayMs: options.delayMs ?? 300,
      maxWidthPx: options.maxWidthPx ?? 260,
      maxLines: options.maxLines ?? 8,
      pixelThresholdPx: options.pixelThresholdPx ?? 10,
      includeEdges: options.includeEdges ?? false,
      formatter: options.formatter ?? undefined,
    } as Required<DataTooltipOptions>;
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    const c = engine.canvas;
    c.addEventListener("mousemove", this.onMouseMove, { capture: true });
    c.addEventListener("mouseleave", this.onMouseLeave, { capture: true });
  }

  private requestRender(): void {
    // CanvasEngine 使用按需渲染：tooltip 的显示/位置更新必须显式请求下一帧
    this.engine.requestRender();
  }

  dispose(): void {
    const c = this.engine.canvas;
    c.removeEventListener("mousemove", this.onMouseMove, { capture: true } as any);
    c.removeEventListener("mouseleave", this.onMouseLeave, { capture: true } as any);
    this.clearTimer();
  }

  private onMouseMove = (e: MouseEvent) => {
    if (this.engine.getMode() !== "edit") {
      const wasShowing = this.show;
      this.hide();
      if (wasShowing) this.requestRender();
      return;
    }
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const node = this.engine.pickNodeAtWorld(world as any, {
      scale: this.engine.getScale(),
      pixelThresholdPx: this.opts.pixelThresholdPx,
    });

    this.screenPos = screen;
    const custom = node && node.data ? (node.data as any).custom : undefined;
    // 仅当存在 data.custom 时展示；否则隐藏
    if (
      !node ||
      custom == null ||
      (typeof custom === "string" && custom.trim() === "") ||
      (Array.isArray(custom) && custom.length === 0) ||
      (typeof custom === "object" && !Array.isArray(custom) && Object.keys(custom).length === 0)
    ) {
      // 无目标或无自定义数据 -> 隐藏
      this.pendingNodeId = null;
      const wasShowing = this.show;
      if (this.currentNodeId !== null) this.hide();
      this.clearTimer();
      if (wasShowing) this.requestRender();
      return;
    }

    if (node.id === this.currentNodeId && this.show) {
      // 已显示当前节点的数据，仅更新位置即可
      this.requestRender();
      return;
    }

    // 切换目标：重置计时器
    this.pendingNodeId = node.id;
    this.clearTimer();
    this.hoverTimer = window.setTimeout(() => {
      // 检查是否仍停留在同一节点
      if (this.pendingNodeId !== node.id) return;
      this.currentNodeId = node.id;
      this.lines = this.formatCustom(custom);
      this.show = this.lines.length > 0;
      // 鼠标停住不动时也要能显示 tooltip：请求下一帧重绘
      this.requestRender();
    }, this.opts.delayMs);
  };

  private onMouseLeave = () => {
    const wasShowing = this.show;
    this.hide();
    this.clearTimer();
    if (wasShowing) this.requestRender();
  };

  private hide() {
    this.show = false;
    this.currentNodeId = null;
    this.pendingNodeId = null;
  }

  private clearTimer() {
    if (this.hoverTimer != null) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
  }

  private formatCustom(custom: unknown): string[] {
    try {
      // 自定义格式器优先：传入 data.custom
      if (this.opts.formatter) {
        const res = this.opts.formatter(custom as any);
        return Array.isArray(res) ? res : res ? String(res).split(/\n/g) : [];
      }
      // 默认：仅展示 data.custom
      const flat: string[] = [];
      const v = custom as any;
      if (v == null) return [];
      const t = typeof v;
      if (t === "string" || t === "number" || t === "boolean") {
        flat.push(String(v));
      } else if (Array.isArray(v)) {
        // 简单展开前几项或只显示长度
        if (v.length === 0) return [];
        const head = v.slice(0, 5).map((x: any) => (typeof x === "object" ? JSON.stringify(x) : String(x)));
        flat.push(...head);
        if (v.length > head.length) flat.push(`… (${v.length - head.length} more)`);
      } else if (t === "object") {
        const entries = Object.entries(v);
        if (entries.length === 0) return [];
        for (const [k, val] of entries) {
          const tv = typeof val;
          if (tv === "string" || tv === "number" || tv === "boolean") flat.push(`${k}: ${String(val)}`);
          else if (Array.isArray(val)) flat.push(`${k}: [${val.length}]`);
          else if (tv === "object")
            flat.push(
              `${k}: { ${Object.keys(val as any)
                .slice(0, 4)
                .join(", ")}${Object.keys(val as any).length > 4 ? ", …" : ""} }`,
            );
          if (flat.length >= this.opts.maxLines) break;
        }
        if (flat.length === 0) {
          const json = JSON.stringify(v);
          if (json) flat.push(json.length > 240 ? json.slice(0, 237) + "…" : json);
        }
      }
      // 软换行：按 maxWidth 估计字符宽（近似，每字符 ~7px 在 12px 字号下）
      const wrapped: string[] = [];
      const maxChars = Math.max(8, Math.floor(this.opts.maxWidthPx / 7));
      for (const line of flat) {
        if (line.length <= maxChars) {
          wrapped.push(line);
          continue;
        }
        let i = 0;
        while (i < line.length && wrapped.length < this.opts.maxLines) {
          wrapped.push(line.slice(i, i + maxChars));
          i += maxChars;
        }
        if (wrapped.length >= this.opts.maxLines) break;
      }
      return wrapped.slice(0, this.opts.maxLines);
    } catch {
      return [];
    }
  }

  afterRender(ctx: CanvasRenderingContext2D): void {
    if (!this.show || this.engine.getMode() !== "edit" || this.lines.length === 0) return;
    // 以屏幕空间绘制气泡
    ctx.save();
    const padX = 8,
      padY = 6,
      gap = 12;
    const x = Math.round(this.screenPos.x + 14);
    const y = Math.round(this.screenPos.y + 18);
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    const lineH = 16;
    let w = 0;
    for (const s of this.lines) w = Math.max(w, ctx.measureText(s).width);
    w = Math.min(this.opts.maxWidthPx, Math.ceil(w));
    const h = this.lines.length * lineH + padY * 2;
    // 背景与边框
    ctx.fillStyle = "rgba(255,255,255,0.9)"; // gray-900 90%
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w + padX * 2, h, 2);
    ctx.fill();
    ctx.stroke();
    // 文字
    ctx.fillStyle = "#000"; // slate-50
    let ty = y + padY + 12;
    for (const s of this.lines) {
      ctx.fillText(s, x + padX, ty);
      ty += lineH;
    }
  }
}
