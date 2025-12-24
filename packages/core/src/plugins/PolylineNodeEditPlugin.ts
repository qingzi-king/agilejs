/*
 * @Description: 折线节点编辑插件（用于 node.shape = 'line'，而非边中的折线）
 * 交互：
 *  - 悬停/拖拽顶点：拖动修改折点（归一化存储，随尺寸缩放）
 *  - Shift+点击线段：在该线段处新增折点
 *  - Alt(Option)+点击顶点：删除该折点（保留至少两个点）
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import type { NodeData, Point } from "../model/Graph";
import { UpdateLineNodePointsCommand } from "../commands/GraphCommands";

function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const l2 = dist2(a, b);
  if (l2 === 0) return Math.sqrt(dist2(p, a));
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  return Math.hypot(p.x - proj.x, p.y - proj.y);
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export interface PolylineNodeEditOptions {
  handleSize?: number;
  handleColor?: string;
  handleHoverColor?: string;
  hitThreshold?: number; // 屏幕像素
  /** 触摸命中阈值（屏幕像素或 'auto' 自适应 DPR） */
  touchHitThreshold?: number | "auto";
}

export class PolylineNodeEditPlugin implements Plugin {
  readonly id = "polyline-node-edit";
  private engine!: CanvasEngine;
  private options: Required<PolylineNodeEditOptions>;
  private activeNodeId: string | null = null;
  private hovered: { nodeId: string; kind: "vertex" | "segment"; index: number } | null = null;
  private dragging: { nodeId: string; index: number } | null = null;
  // 记录最近一次通过 Shift 插入的点，以便按 Esc 撤销
  private pendingInsert: { nodeId: string; index: number } | null = null;
  // 记录拖拽开始时的点集快照，支持 Esc 撤销拖拽
  private dragStartSnapshot: { nodeId: string; points: Array<{ u: number; v: number }> } | null = null;

  constructor(options: PolylineNodeEditOptions = {}) {
    this.options = {
      handleSize: options.handleSize ?? 8,
      handleColor: options.handleColor ?? "#16a34a",
      handleHoverColor: options.handleHoverColor ?? "#22c55e",
      hitThreshold: options.hitThreshold ?? 8,
      touchHitThreshold: options.touchHitThreshold ?? "auto",
    };
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    const c = engine.canvas;
    c.addEventListener("mousedown", this.onMouseDown, { capture: true });
    c.addEventListener("mousemove", this.onMouseMove, { capture: true });
    window.addEventListener("mouseup", this.onMouseUp, { capture: true });
    window.addEventListener("keydown", this.onKeyDown, { capture: true });
    // Touch 支持（移动端折线点编辑）
    c.addEventListener("touchstart", this.onTouchStart, { passive: false, capture: true });
    c.addEventListener("touchmove", this.onTouchMove, { passive: false, capture: true });
    window.addEventListener("touchend", this.onTouchEnd, { capture: true });
    window.addEventListener("touchcancel", this.onTouchEnd, { capture: true });
  }

  dispose(): void {
    const c = this.engine.canvas;
    c.removeEventListener("mousedown", this.onMouseDown, { capture: true } as any);
    c.removeEventListener("mousemove", this.onMouseMove, { capture: true } as any);
    window.removeEventListener("mouseup", this.onMouseUp, { capture: true } as any);
    window.removeEventListener("keydown", this.onKeyDown, { capture: true } as any);
    c.removeEventListener("touchstart", this.onTouchStart as any, { capture: true } as any);
    c.removeEventListener("touchmove", this.onTouchMove as any, { capture: true } as any);
    window.removeEventListener("touchend", this.onTouchEnd as any, { capture: true } as any);
    window.removeEventListener("touchcancel", this.onTouchEnd as any, { capture: true } as any);
  }

  private isLineNode(n: NodeData | undefined | null): n is NodeData {
    return !!n && n.shape === "line";
  }

  private getPointsWorld(n: NodeData): Point[] {
    const style = (n.data?.style as any) || {};
    const cfg = (n.data as any)?.line || {};
    const ptsN: Array<{ u: number; v: number }> =
      Array.isArray(cfg.pointsNormalized) && cfg.pointsNormalized.length >= 2
        ? cfg.pointsNormalized
        : [
            { u: 0.1, v: 0.9 },
            { u: 0.9, v: 0.1 },
          ];
    // 将局部归一化点映射到世界坐标，并考虑旋转
    const { x, y } = n.position;
    const { width: w, height: h } = n.size;
    const cx = x + w / 2,
      cy = y + h / 2;
    const rad = ((n.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(rad),
      sin = Math.sin(rad);
    const toWorld = (px: number, py: number) => {
      const dx = px - cx,
        dy = py - cy;
      return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
    };
    return ptsN.map((p) => toWorld(x + p.u * w, y + p.v * h));
  }

  private worldToNormalized(n: NodeData, world: Point): { u: number; v: number } {
    const { x, y } = n.position;
    const { width: w, height: h } = n.size;
    // 反旋转到局部
    const cx = x + w / 2,
      cy = y + h / 2;
    const rad = -((n.rotation || 0) * Math.PI) / 180; // 逆旋转
    const cos = Math.cos(rad),
      sin = Math.sin(rad);
    const dx = world.x - cx,
      dy = world.y - cy;
    const lx = dx * cos - dy * sin + cx;
    const ly = dx * sin + dy * cos + cy;
    // 不再夹紧到 [0,1]，以便越界拖拽；后续在 mouseup 中统一自适应包围盒
    return { u: (lx - x) / w, v: (ly - y) / h };
  }

  private onMouseDown = (e: MouseEvent) => {
    // 检查引擎是否允许拖拽（编辑折线节点属于拖拽操作）
    const interactionConfig = this.engine.getInteractionConfig();
    if (!interactionConfig.enableDrag || !interactionConfig.enableResize) return; // 不允许拖拽或调整尺寸时禁用折点编辑

    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    // 仅在选中 line 节点时启用
    const node = this.engine.graph.getNodes().find((n) => n.selected && n.shape === "line");
    if (!this.isLineNode(node)) return;
    if (node.resizable === false) return; // 不允许调整尺寸时禁用折点编辑

    this.activeNodeId = node.id;
    const pts = this.getPointsWorld(node);
    const th = this.options.hitThreshold / Math.max(0.0001, this.engine.getScale());
    // 顶点命中
    for (let i = 0; i < pts.length; i++) {
      if (Math.hypot(world.x - pts[i].x, world.y - pts[i].y) <= th) {
        // Alt 删除
        if (e.altKey && pts.length > 2) {
          const data: any = node.data || {};
          data.line = data.line || {};
          const arr = (data.line.pointsNormalized as Array<{ u: number; v: number }>) || [];
          if (i > 0 && i < pts.length - 1) {
            const next = arr.slice();
            next.splice(i, 1);
            data.line.pointsNormalized = next;
            node.data = data;
            this.engine.graph.markDirty();
          }
          e.preventDefault();
          e.stopPropagation();
          (e as any).stopImmediatePropagation?.();
          return;
        }
        this.dragging = { nodeId: node.id, index: i };
        // 记录拖拽起始快照
        const data: any = node.data || {};
        data.line = data.line || {};
        const arr = Array.isArray(data.line.pointsNormalized)
          ? data.line.pointsNormalized
          : [
              { u: 0.1, v: 0.9 },
              { u: 0.9, v: 0.1 },
            ];
        this.dragStartSnapshot = {
          nodeId: node.id,
          points: (arr as Array<{ u: number; v: number }>).map((p) => ({ u: p.u, v: p.v })),
        };
        this.engine.history.beginTransaction("Polyline Node Edit");
        e.preventDefault();
        e.stopPropagation();
        (e as any).stopImmediatePropagation?.();
        return;
      }
    }
    // 线段命中：Shift 新增
    for (let i = 0; i < pts.length - 1; i++) {
      if (distancePointToSegment(world, pts[i], pts[i + 1]) <= th) {
        if (e.shiftKey) {
          const data: any = node.data || {};
          data.line = data.line || {};
          const arr = Array.isArray(data.line.pointsNormalized)
            ? (data.line.pointsNormalized as Array<{ u: number; v: number }>)
            : [
                { u: 0.1, v: 0.9 },
                { u: 0.9, v: 0.1 },
              ];
          // 计算投影点插入
          const a = pts[i],
            b = pts[i + 1];
          const l2 = dist2(a, b);
          let t = l2 === 0 ? 0 : ((world.x - a.x) * (b.x - a.x) + (world.y - a.y) * (b.y - a.y)) / l2;
          t = Math.max(0, Math.min(1, t));
          const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
          const nv = this.worldToNormalized(node, proj);
          const insertIndex = i + 1;
          const next = arr.slice();
          next.splice(insertIndex, 0, nv);
          data.line.pointsNormalized = next;
          node.data = data;
          this.engine.graph.markDirty();
          // 记录可撤销插入
          this.pendingInsert = { nodeId: node.id, index: insertIndex };
          e.preventDefault();
          e.stopPropagation();
          (e as any).stopImmediatePropagation?.();
          return;
        }
      }
    }
  };

  private resolveHitThreshold(isTouch: boolean): number {
    if (!isTouch) return this.options.hitThreshold;
    const t = this.options.touchHitThreshold;
    if (t === "auto" || t == null) {
      const dpr = typeof window !== "undefined" && window.devicePixelRatio ? window.devicePixelRatio : 1;
      return Math.round(28 * Math.min(Math.max(dpr, 1), 2));
    }
    return t as number;
  }

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const interactionConfig = this.engine.getInteractionConfig();
    if (!interactionConfig.enableDrag || !interactionConfig.enableResize) return; // 不允许拖拽或调整尺寸时禁用折点编辑
    const touch = e.touches[0];
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const node = this.engine.graph.getNodes().find((n) => n.selected && n.shape === "line");
    if (!this.isLineNode(node)) return;
    if (node.resizable === false) return; // 不允许调整尺寸时禁用折点编辑
    this.activeNodeId = node.id;
    const pts = this.getPointsWorld(node);
    const thWorld = this.resolveHitThreshold(true) / Math.max(0.0001, this.engine.getScale());
    // 顶点命中（移动端不支持 Alt 删除，保留一个长按策略未来扩展）
    for (let i = 0; i < pts.length; i++) {
      if (Math.hypot(world.x - pts[i].x, world.y - pts[i].y) <= thWorld) {
        this.dragging = { nodeId: node.id, index: i };
        const data: any = node.data || {};
        data.line = data.line || {};
        const arr: Array<{ u: number; v: number }> = Array.isArray(data.line.pointsNormalized)
          ? data.line.pointsNormalized
          : [
              { u: 0.1, v: 0.9 },
              { u: 0.9, v: 0.1 },
            ];
        this.dragStartSnapshot = {
          nodeId: node.id,
          points: arr.map((p: { u: number; v: number }) => ({ u: p.u, v: p.v })),
        };
        this.engine.history.beginTransaction("Polyline Node Edit");
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
    // 线段命中：移动端用双击或未来手势插入，这里暂不支持；若需要可在后续加逻辑
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    if (!this.dragging) return;
    const node = this.activeNodeId ? this.engine.graph.getNode(this.activeNodeId) : null;
    if (!node || node.shape !== "line" || this.dragging.nodeId !== node.id) return;
    const touch = e.touches[0];
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const data: any = node.data || {};
    data.line = data.line || {};
    const arr = Array.isArray(data.line.pointsNormalized)
      ? data.line.pointsNormalized
      : [
          { u: 0.1, v: 0.9 },
          { u: 0.9, v: 0.1 },
        ];
    const nv = this.worldToNormalized(node, world);
    const next = arr.slice();
    next[this.dragging.index] = nv;
    data.line.pointsNormalized = next;
    node.data = data;
    this.engine.graph.markDirty();
    e.preventDefault();
    e.stopPropagation();
  };

  private onTouchEnd = (_e: TouchEvent) => {
    // 复用 mouseUp 逻辑
    this.onMouseUp(new MouseEvent("mouseup"));
  };

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const node = this.activeNodeId
      ? this.engine.graph.getNode(this.activeNodeId)
      : this.engine.graph.getNodes().find((n) => n.selected && n.shape === "line");
    if (this.dragging && node && this.dragging.nodeId === node.id) {
      // 更新折点（直接修改用于实时预览，mouseup时统一提交Command）
      const data: any = node.data || {};
      data.line = data.line || {};
      const arr = Array.isArray(data.line.pointsNormalized)
        ? (data.line.pointsNormalized as Array<{ u: number; v: number }>)
        : [
            { u: 0.1, v: 0.9 },
            { u: 0.9, v: 0.1 },
          ];
      const nv = this.worldToNormalized(node, world);
      const next = arr.slice();
      next[this.dragging.index] = nv;
      data.line.pointsNormalized = next;
      node.data = data;
      this.engine.graph.markDirty();
      e.preventDefault();
      return;
    }

    // 更新 hover 状态
    this.hovered = null;
    if (!node || node.shape !== "line") return;
    if (node.resizable === false) return; // 不允许调整尺寸时禁用 hover

    const pts = this.getPointsWorld(node);
    const th = this.options.hitThreshold / Math.max(0.0001, this.engine.getScale());
    for (let i = 0; i < pts.length; i++) {
      if (Math.hypot(world.x - pts[i].x, world.y - pts[i].y) <= th) {
        this.hovered = { nodeId: node.id, kind: "vertex", index: i };
        return;
      }
    }
    for (let i = 0; i < pts.length - 1; i++) {
      if (distancePointToSegment(world, pts[i], pts[i + 1]) <= th) {
        this.hovered = { nodeId: node.id, kind: "segment", index: i };
        return;
      }
    }
  };

  private onMouseUp = (_e: MouseEvent) => {
    if (this.dragging) {
      // 拖拽结束：计算世界坐标点集，固定未拖拽的端点，调整包围盒
      const node = this.activeNodeId ? this.engine.graph.getNode(this.activeNodeId) : null;
      if (node && node.shape === "line" && this.dragStartSnapshot && this.dragStartSnapshot.nodeId === node.id) {
        const data: any = node.data || {};
        data.line = data.line || {};
        const arr: Array<{ u: number; v: number }> = Array.isArray(data.line.pointsNormalized)
          ? data.line.pointsNormalized
          : [];
        if (arr.length >= 2) {
          // 将所有点转换为世界坐标（当前状态）
          const { x, y } = node.position;
          const { width: w, height: h } = node.size;
          const ptsWorld: Point[] = arr.map((p) => ({ x: x + p.u * w, y: y + p.v * h }));

          // 计算新的包围盒（基于世界坐标）
          let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
          for (const pt of ptsWorld) {
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
          }

          // 新的position和size（保留两位小数，减少精度冗余）
          const newX = Math.round(minX * 100) / 100;
          const newY = Math.round(minY * 100) / 100;
          const newW = Math.max(0.01, Math.round((maxX - minX) * 100) / 100);
          const newH = Math.max(0.01, Math.round((maxY - minY) * 100) / 100);

          // 重新归一化所有点（基于新包围盒）
          const finalPoints: Array<{ u: number; v: number }> = ptsWorld.map((pt) => ({
            u: (pt.x - newX) / newW,
            v: (pt.y - newY) / newH,
          }));

          // 记录变化前的状态（用于事件）
          const prevPos = { x: node.position.x, y: node.position.y };
          const prevSize = { width: node.size.width, height: node.size.height };

          // 回滚到起始状态
          data.line.pointsNormalized = this.dragStartSnapshot.points.map((p) => ({ u: p.u, v: p.v }));
          node.data = data;
          this.engine.graph.markDirty();

          // 提交Command
          try {
            this.engine.history.execute(
              new UpdateLineNodePointsCommand(
                this.engine.graph,
                node.id,
                finalPoints,
                { x: newX, y: newY },
                { width: newW, height: newH },
              ),
            );
            this.engine.history.commitTransaction();

            // 触发事件通知属性面板更新（类似resizeEnd）
            this.engine.events.emit("node:resize-end", {
              nodeId: node.id,
              handle: "line-point-edit",
              prev: { position: prevPos, size: prevSize },
              next: { position: { x: newX, y: newY }, size: { width: newW, height: newH } },
            });
          } catch (err) {
            console.warn("Failed to commit line edit:", err);
            try {
              this.engine.history.rollbackTransaction();
            } catch {}
          }
        }
      }
      this.dragStartSnapshot = null;
    }
    this.dragging = null;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    // 优先：若正在拖拽，撤销拖拽并回滚事务
    if (this.dragging && this.dragStartSnapshot && this.dragging.nodeId === this.dragStartSnapshot.nodeId) {
      const node = this.engine.graph.getNode(this.dragging.nodeId);
      if (node && node.shape === "line") {
        const data: any = node.data || {};
        data.line = data.line || {};
        data.line.pointsNormalized = this.dragStartSnapshot.points.map((p) => ({ u: p.u, v: p.v }));
        node.data = data;
        this.engine.graph.markDirty();
        try {
          this.engine.history.rollbackTransaction();
        } catch {
          /* ignore */
        }
      }
      this.dragging = null;
      this.dragStartSnapshot = null;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 次之：撤销最近一次 Shift 插点
    if (this.pendingInsert) {
      const node = this.engine.graph.getNode(this.pendingInsert.nodeId);
      if (!node || node.shape !== "line") {
        this.pendingInsert = null;
        return;
      }
      const data: any = node.data || {};
      data.line = data.line || {};
      const arr: Array<{ u: number; v: number }> = Array.isArray(data.line.pointsNormalized)
        ? data.line.pointsNormalized
        : [];
      const idx = this.pendingInsert.index;
      if (idx >= 1 && idx <= arr.length - 2 && arr.length > 2) {
        const next = arr.slice();
        next.splice(idx, 1);
        data.line.pointsNormalized = next;
        node.data = data;
        this.engine.graph.markDirty();
        this.pendingInsert = null;
        e.preventDefault();
        e.stopPropagation();
      } else {
        this.pendingInsert = null;
      }
    }
  };

  afterRender(ctx: CanvasRenderingContext2D): void {
    // 绘制句柄
    const node = this.engine.graph.getNodes().find((n) => n.selected && n.shape === "line");
    if (!this.isLineNode(node)) return;
    // 即使不允许调整尺寸，也绘制句柄以显示选中状态（但不可交互）
    // if (node.resizable === false) return;

    const ptsWorld = this.getPointsWorld(node);
    // afterRender 处于屏幕坐标系（未应用 world 变换），需将世界坐标转换为屏幕坐标
    const pts = ptsWorld.map((p) => this.engine.toScreen(p));
    const hs = this.options.handleSize; // 句柄大小按屏幕像素固定
    ctx.save();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const isEndpoint = i === 0 || i === pts.length - 1;
      const fill =
        this.hovered && this.hovered.kind === "vertex" && this.hovered.index === i
          ? this.options.handleHoverColor
          : this.options.handleColor;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1; // 屏幕空间固定线宽
      ctx.fillStyle = fill;

      if (isEndpoint) {
        // 端点：圆形柄
        ctx.beginPath();
        ctx.arc(p.x, p.y, hs / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // 拐点：方块柄，更易于识别与选中
        const size = hs * 1.2; // 略大于圆柄
        const half = size / 2;
        ctx.beginPath();
        ctx.rect(p.x - half, p.y - half, size, size);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
