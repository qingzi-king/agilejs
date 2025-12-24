/*
 * @Description: 盒选插件
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-12-03 18:42:55
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import { hitTestNodes } from "../utils/hittest";

export class BoxSelectPlugin implements Plugin {
  readonly id = "box-select";
  private engine!: CanvasEngine;
  private active = false;
  private startX = 0;
  private startY = 0;
  private endX = 0;
  private endY = 0;
  private additive = false;

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    const c = engine.canvas;
    c.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
  }

  dispose(): void {
    const c = this.engine.canvas;
    c.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
  }

  private onMouseDown = (e: MouseEvent) => {
    // 检查引擎是否禁用选中
    const interactionConfig = this.engine.getInteractionConfig();
    if (!interactionConfig.enableSelection) return;

    // 仅当 Cmd/Ctrl + 左键 且 点击在空白处时，启动框选；Shift 为叠加
    if (e.button !== 0) return;
    if (!(e.metaKey || e.ctrlKey)) return;
    const rect = this.engine.canvas.getBoundingClientRect();
    const s = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const w = this.engine.toWorld(s);
    const hit = hitTestNodes(w, this.engine.graph.getNodes(), { scale: this.engine.getScale(), pixelThresholdPx: 10 });
    if (hit) return; // 点击到节点由 Drag/Resize 等插件处理
    this.active = true;
    this.additive = !!e.shiftKey; // 叠加选择仅由 Shift 控制
    this.startX = this.endX = w.x;
    this.startY = this.endY = w.y;
    // 事件：框选开始
    this.engine.events.emit("canvas:box-select-start" as any, {
      start: { x: this.startX, y: this.startY },
      additive: this.additive,
    });
    // 避免触发其他插件（如选择清空、平移等）
    e.preventDefault();
    e.stopPropagation();
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.active) return;
    const rect = this.engine.canvas.getBoundingClientRect();
    const s = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const w = this.engine.toWorld(s);
    this.endX = w.x;
    this.endY = w.y;
    // 事件：框选进行中（变化）
    const x = Math.min(this.startX, this.endX);
    const y = Math.min(this.startY, this.endY);
    const width = Math.abs(this.endX - this.startX);
    const height = Math.abs(this.endY - this.startY);
    this.engine.events.emit("canvas:box-select-change" as any, {
      start: { x: this.startX, y: this.startY },
      current: { x: this.endX, y: this.endY },
      rect: { x, y, width, height },
      additive: this.additive,
    });
    // 触发重绘以更新框选框
    this.engine.graph.markDirty('style');
  };

  private onMouseUp = (e?: MouseEvent) => {
    if (!this.active) return;
    this.active = false;
    const x = Math.min(this.startX, this.endX);
    const y = Math.min(this.startY, this.endY);
    const width = Math.abs(this.endX - this.startX);
    const height = Math.abs(this.endY - this.startY);
    // 微小拖动（点击）不触发框选，但仍派发结束事件（canceled）
    if (width < 2 && height < 2) {
      this.engine.events.emit("canvas:box-select-end" as any, {
        start: { x: this.startX, y: this.startY },
        end: { x: this.endX, y: this.endY },
        rect: { x, y, width, height },
        additive: this.additive,
        canceled: true,
        selected: [],
      });
      // 触发画布点击事件
      if (e) {
        this.engine.events.emit("canvas:click", { event: e });
      }
      return;
    }
    const selection = { x, y, width, height };
    const nodes = this.engine.graph.getNodes();
    if (!this.additive) nodes.forEach((n) => (n.selected = false));
    let changed = false;
    nodes.forEach((n) => {
      if ((n as any).selectable === false) return; // 不可选节点不参与框选
      if (n.visible === false) return; // 隐藏节点不参与框选
      const nx = n.position.x;
      const ny = n.position.y;
      const nw = n.size.width;
      const nh = n.size.height;
      const fullyContained =
        selection.x <= nx &&
        selection.y <= ny &&
        selection.x + selection.width >= nx + nw &&
        selection.y + selection.height >= ny + nh;
      if (fullyContained && !n.selected) {
        n.selected = true;
        changed = true;
      }
    });
    if (changed) this.engine.events.emit("graph:change", { reason: "box-select" });
    // 事件：框选结束
    const selectedIds = this.engine.graph
      .getNodes()
      .filter((n) => n.selected)
      .map((n) => n.id);
    this.engine.events.emit("canvas:box-select-end" as any, {
      start: { x: this.startX, y: this.startY },
      end: { x: this.endX, y: this.endY },
      rect: { x, y, width, height },
      additive: this.additive,
      canceled: false,
      selected: selectedIds,
    });
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  afterRender(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const x = Math.min(this.startX, this.endX);
    const y = Math.min(this.startY, this.endY);
    const width = Math.abs(this.endX - this.startX);
    const height = Math.abs(this.endY - this.startY);

    // draw in screen space but using world->screen conversion
    const s0 = this.engine.toScreen({ x, y });
    const s1 = this.engine.toScreen({ x: x + width, y: y + height });
    const sx = Math.min(s0.x, s1.x);
    const sy = Math.min(s0.y, s1.y);
    const sw = Math.abs(s1.x - s0.x);
    const sh = Math.abs(s1.y - s0.y);

    ctx.save();
    ctx.strokeStyle = "#1d4ed8";
    ctx.fillStyle = "rgba(29,78,216,0.1)";
    ctx.lineWidth = 1.5; // 以屏幕像素绘制，避免缩放影响线宽
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(sx + 0.5, sy + 0.5, sw, sh); // 0.5 对齐像素边
    ctx.fillRect(sx, sy, sw, sh);
    ctx.restore();
  }
}
