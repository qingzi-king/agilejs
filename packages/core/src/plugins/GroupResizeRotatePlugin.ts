/*
 * @Description: 多选组统一控制点（缩放/旋转）
 * @Author: qingzi.wang
 * @Date: 2025-09-18 16:42:47
 * @LastEditTime: 2025-10-16 18:54:06
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import type { NodeData, Point } from "../model/Graph";
import { GroupTransformCommand } from "../commands/GraphCommands";
import { Plugin } from "./Plugin";

export interface GroupResizeRotatePluginOptions {
  handleSize?: number;
  handleColor?: string;
  handleHoverColor?: string;
  rotateHandleColor?: string;
  enableRotation?: boolean;
  enableResize?: boolean;
  rotateHandleOffset?: number;
  groupFillEnabled?: boolean;
  groupFillColor?: string;
  /** 鼠标命中阈值（像素），默认等于 handleSize */
  hitTargetPx?: number;
  /** 触摸命中阈值（像素），'auto' 时基于 DPR 自适应 */
  touchHitTargetPx?: number | "auto";
}

enum HandleType {
  None = "none",
  TopLeft = "tl",
  TopCenter = "tc",
  TopRight = "tr",
  MiddleLeft = "ml",
  MiddleRight = "mr",
  BottomLeft = "bl",
  BottomCenter = "bc",
  BottomRight = "br",
  Rotate = "rotate",
}

export class GroupResizeRotatePlugin implements Plugin {
  readonly id = "group-resize-rotate";
  private engine!: CanvasEngine;
  private options: Required<GroupResizeRotatePluginOptions>;

  private active: HandleType = HandleType.None;
  private hover: HandleType = HandleType.None;

  private startRect: { x: number; y: number; w: number; h: number } | null = null;
  private startCenter: Point = { x: 0, y: 0 };
  private startAngle = 0; // 鼠标起始角
  private groupAngle = 0; // 累计组角度（弧度）
  private previewAngleDelta: number | null = null; // 旋转预览增量（弧度）

  private startObb: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  private resizeAngle: number | null = null; // 缩放时固定的角度（弧度）

  private nodeStarts: Array<{
    id: string;
    pos: { x: number; y: number };
    size: { w: number; h: number };
    rotation: number;
    ports?: Record<string, { x: number; y: number }>;
  }> = [];

  constructor(opts: GroupResizeRotatePluginOptions = {}) {
    this.options = {
      handleSize: opts.handleSize ?? 8,
      handleColor: opts.handleColor ?? "#2563eb",
      handleHoverColor: opts.handleHoverColor ?? "#3b82f6",
      rotateHandleColor: opts.rotateHandleColor ?? "#ef4444",
      enableRotation: opts.enableRotation ?? true,
      enableResize: opts.enableResize ?? true,
      rotateHandleOffset: opts.rotateHandleOffset ?? 30,
      groupFillEnabled: opts.groupFillEnabled ?? true,
      groupFillColor: opts.groupFillColor ?? "rgba(37,99,235,0.08)",
      hitTargetPx: opts.hitTargetPx ?? opts.handleSize ?? 8,
      touchHitTargetPx: opts.touchHitTargetPx ?? "auto",
    };
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    const c = engine.canvas;
    c.addEventListener("mousedown", this.onMouseDown, true);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
    // Touch 事件支持（多选组缩放/旋转）
    c.addEventListener("touchstart", this.onTouchStart, { passive: false, capture: true });
    window.addEventListener("touchmove", this.onTouchMove, { passive: false });
    window.addEventListener("touchend", this.onTouchEnd);
    window.addEventListener("touchcancel", this.onTouchEnd);
  }

  dispose(): void {
    const c = this.engine.canvas;
    c.removeEventListener("mousedown", this.onMouseDown, true);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
    c.removeEventListener("touchstart", this.onTouchStart as any, true as any);
    window.removeEventListener("touchmove", this.onTouchMove as any);
    window.removeEventListener("touchend", this.onTouchEnd as any);
    window.removeEventListener("touchcancel", this.onTouchEnd as any);
  }

  private getSelectionBBox(): { x: number; y: number; w: number; h: number } | null {
    const sel = this.engine.graph.getNodes().filter((n) => n.selected);
    if (sel.length < 2) return null;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of sel) {
      const aabb = this.nodeAABB(n);
      minX = Math.min(minX, aabb.x);
      minY = Math.min(minY, aabb.y);
      maxX = Math.max(maxX, aabb.x + aabb.w);
      maxY = Math.max(maxY, aabb.y + aabb.h);
    }
    if (!isFinite(minX)) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  private rotatePoint(p: Point, c: Point, rad: number): Point {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const cos = Math.cos(rad),
      sin = Math.sin(rad);
    return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
  }

  private nodeAABB(n: NodeData): { x: number; y: number; w: number; h: number } {
    const x = n.position.x,
      y = n.position.y,
      w = n.size.width,
      h = n.size.height;
    const rot = (n.rotation ?? 0) % 360;
    if (!rot) return { x, y, w, h };
    const rad = (rot * Math.PI) / 180;
    const cx = x + w / 2,
      cy = y + h / 2;
    const corners = [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ].map((p) => this.rotatePoint(p, { x: cx, y: cy }, rad));
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of corners) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  private getSelectedRotatedCorners(): Point[] {
    const pts: Point[] = [];
    const sel = this.engine.graph.getNodes().filter((n) => n.selected);
    for (const n of sel) {
      const x = n.position.x,
        y = n.position.y,
        w = n.size.width,
        h = n.size.height;
      const cx = x + w / 2,
        cy = y + h / 2;
      const rad = ((n.rotation ?? 0) * Math.PI) / 180;
      const corners = [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ].map((p) => this.rotatePoint(p, { x: cx, y: cy }, rad));
      pts.push(...corners);
    }
    return pts;
  }

  private getOrientedBBox(angleRad: number): { minX: number; minY: number; maxX: number; maxY: number } | null {
    const pts = this.getSelectedRotatedCorners();
    if (pts.length === 0) return null;
    const cos = Math.cos(-angleRad),
      sin = Math.sin(-angleRad);
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of pts) {
      const rx = p.x * cos - p.y * sin;
      const ry = p.x * sin + p.y * cos;
      if (rx < minX) minX = rx;
      if (ry < minY) minY = ry;
      if (rx > maxX) maxX = rx;
      if (ry > maxY) maxY = ry;
    }
    return { minX, minY, maxX, maxY };
  }

  private resolveHitPx(isTouch: boolean): number {
    const { hitTargetPx, touchHitTargetPx, handleSize } = this.options;
    if (isTouch) {
      if (touchHitTargetPx === "auto") {
        const dpr =
          typeof window !== "undefined" && (window as any).devicePixelRatio ? (window as any).devicePixelRatio : 1;
        return Math.round(28 * dpr);
      }
      return (touchHitTargetPx as number) ?? Math.max(28, handleSize);
    }
    return hitTargetPx ?? handleSize;
  }

  private hitHandle(world: Point, minHitPx?: number): HandleType {
    const bbox = this.getSelectionBBox();
    if (!bbox) return HandleType.None;
    const scale = this.engine.getScale();
    const s = Math.max(0.0001, scale);
    const targetPx = Math.max(this.options.handleSize, minHitPx ?? this.options.handleSize);
    const half = targetPx / s / 2;

    const angle = this.previewAngleDelta != null ? this.groupAngle + this.previewAngleDelta : this.groupAngle;
    const obb = this.getOrientedBBox(angle);
    if (!obb) return HandleType.None;
    const { minX, minY, maxX, maxY } = obb;
    const cos = Math.cos(angle),
      sin = Math.sin(angle);
    const toWorld = (px: number, py: number) => ({ x: px * cos - py * sin, y: px * sin + py * cos });
    const TLr = { x: minX, y: minY },
      TRr = { x: maxX, y: minY },
      BRr = { x: maxX, y: maxY },
      BLr = { x: minX, y: maxY };
    const TCr = { x: (minX + maxX) / 2, y: minY };
    const BCr = { x: (minX + maxX) / 2, y: maxY };
    const MLr = { x: minX, y: (minY + maxY) / 2 };
    const MRr = { x: maxX, y: (minY + maxY) / 2 };
    const spotsWorld: Array<{ x: number; y: number; t: HandleType }> = [];

    const interactionConfig = this.engine.getInteractionConfig();
    const sel = this.engine.graph.getNodes().filter((n) => n.selected);
    const allResizable = sel.every((n) => (n as any).resizable !== false);
    const allRotatable = sel.every((n) => (n as any).rotatable !== false);

    if (this.options.enableResize && interactionConfig.enableResize && allResizable) {
      spotsWorld.push(
        { ...toWorld(TLr.x, TLr.y), t: HandleType.TopLeft },
        { ...toWorld(TCr.x, TCr.y), t: HandleType.TopCenter },
        { ...toWorld(TRr.x, TRr.y), t: HandleType.TopRight },
        { ...toWorld(MLr.x, MLr.y), t: HandleType.MiddleLeft },
        { ...toWorld(MRr.x, MRr.y), t: HandleType.MiddleRight },
        { ...toWorld(BLr.x, BLr.y), t: HandleType.BottomLeft },
        { ...toWorld(BCr.x, BCr.y), t: HandleType.BottomCenter },
        { ...toWorld(BRr.x, BRr.y), t: HandleType.BottomRight },
      );
    }
    // 旋转手柄
    if (this.options.enableRotation && interactionConfig.enableRotate && allRotatable) {
      const upX = Math.sin(angle),
        upY = -Math.cos(angle);
      const TCw = toWorld(TCr.x, TCr.y);
      const rotOffsetWorld = this.options.rotateHandleOffset / Math.max(0.0001, scale);
      spotsWorld.push({ x: TCw.x + upX * rotOffsetWorld, y: TCw.y + upY * rotOffsetWorld, t: HandleType.Rotate });
    }

    for (const s of spotsWorld) {
      if (world.x >= s.x - half && world.x <= s.x + half && world.y >= s.y - half && world.y <= s.y + half) return s.t;
    }
    return HandleType.None;
  }

  private onMouseDown = (e: MouseEvent) => {
    // 检查引擎是否允许拖拽（调整大小和旋转属于拖拽操作）
    const interactionConfig = this.engine.getInteractionConfig();
    if (!interactionConfig.enableDrag) return;

    if (e.button !== 0) return;
    const bbox = this.getSelectionBBox();
    if (!bbox) return; // 由单节点插件处理
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const h = this.hitHandle(world, this.resolveHitPx(false));
    if (h === HandleType.None) return;

    this.active = h;
    this.startRect = { ...bbox };
    this.startCenter = { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h / 2 };
    this.startAngle = Math.atan2(world.y - this.startCenter.y, world.x - this.startCenter.x);
    if (h !== HandleType.Rotate) {
      this.resizeAngle = this.groupAngle;
      const obb0 = this.getOrientedBBox(this.resizeAngle);
      this.startObb = obb0 ? { ...obb0 } : null;
    } else {
      this.startObb = null;
    }
    this.nodeStarts = this.engine.graph
      .getNodes()
      .filter((n) => n.selected)
      .map((n) => ({
        id: n.id,
        pos: { x: n.position.x, y: n.position.y },
        size: { w: n.size.width, h: n.size.height },
        rotation: n.rotation ?? 0,
        ports: n.ports?.reduce(
          (acc, p) => {
            acc[p.id] = { x: p.offset.x, y: p.offset.y };
            return acc;
          },
          {} as Record<string, { x: number; y: number }>,
        ),
      }));

    e.stopPropagation();
    e.preventDefault();
    // 通知引擎开始 resize（用于降质渲染优化）
    this.engine.setResizingNodes(true);
    // 事件：组交互开始（resize/rotate）
    const ids = this.nodeStarts.map((s) => s.id);
    if (this.active === HandleType.Rotate) {
      this.engine.events.emit("group:rotate-start" as any, {
        nodeIds: ids,
        center: { ...this.startCenter },
        angleRad: this.groupAngle,
      });
    } else {
      this.engine.events.emit("group:resize-start" as any, {
        nodeIds: ids,
        handle: this.active,
        startRect: { ...this.startRect! },
        angleRad: this.resizeAngle,
      });
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    const bbox = this.getSelectionBBox();
    if (!bbox) return;
    const rect = this.engine.canvas.getBoundingClientRect();
    const world = this.engine.toWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (this.active === HandleType.None) {
      this.hover = this.hitHandle(world, this.resolveHitPx(false));
      this.updateCursor();
      return;
    }

    if (this.active === HandleType.Rotate && this.options.enableRotation) {
      const curAngle = Math.atan2(world.y - this.startCenter.y, world.x - this.startCenter.x);
      let delta = curAngle - this.startAngle;
      if (e.shiftKey) {
        const deg = Math.round((delta * 180) / Math.PI / 15) * 15;
        delta = (deg * Math.PI) / 180;
      } else {
        const deg = Math.round((delta * 180) / Math.PI);
        delta = (deg * Math.PI) / 180;
      }
      const cos = Math.cos(delta),
        sin = Math.sin(delta);
      this.previewAngleDelta = delta;
      for (const s of this.nodeStarts) {
        const n = this.engine.graph.getNode(s.id);
        if (!n) continue;
        const cx0 = s.pos.x + s.size.w / 2;
        const cy0 = s.pos.y + s.size.h / 2;
        const vx = cx0 - this.startCenter.x;
        const vy = cy0 - this.startCenter.y;
        const cx = this.startCenter.x + vx * cos - vy * sin;
        const cy = this.startCenter.y + vx * sin + vy * cos;
        n.position.x = cx - s.size.w / 2;
        n.position.y = cy - s.size.h / 2;
        n.rotation = s.rotation + (delta * 180) / Math.PI;
      }
      this.engine.canvas.style.cursor = "grabbing";
      // 事件：组旋转进行中
      this.engine.events.emit("group:rotate-move" as any, {
        nodeIds: this.nodeStarts.map((s) => s.id),
        deltaRad: delta,
        center: { ...this.startCenter },
      });
      return;
    }

    if (this.options.enableResize) {
      const rad = this.resizeAngle || 0;
      const minSize = 10;
      const cos = Math.cos(-rad),
        sin = Math.sin(-rad);
      const toRot = (x: number, y: number) => ({ x: x * cos - y * sin, y: x * sin + y * cos });
      const fromRot = (rx: number, ry: number) => {
        const c = Math.cos(rad),
          s2 = Math.sin(rad);
        return { x: rx * c - ry * s2, y: rx * s2 + ry * c };
      };

      const obb0 = this.startObb;
      if (!obb0) return;
      const baseW = obb0.maxX - obb0.minX;
      const baseH = obb0.maxY - obb0.minY;
      const mR = toRot(world.x, world.y);

      let minX = obb0.minX,
        minY = obb0.minY,
        maxX = obb0.maxX,
        maxY = obb0.maxY;
      switch (this.active) {
        case HandleType.TopLeft:
          minX = mR.x;
          minY = mR.y;
          break;
        case HandleType.TopCenter:
          minY = mR.y;
          break;
        case HandleType.TopRight:
          maxX = mR.x;
          minY = mR.y;
          break;
        case HandleType.MiddleLeft:
          minX = mR.x;
          break;
        case HandleType.MiddleRight:
          maxX = mR.x;
          break;
        case HandleType.BottomLeft:
          minX = mR.x;
          maxY = mR.y;
          break;
        case HandleType.BottomCenter:
          maxY = mR.y;
          break;
        case HandleType.BottomRight:
          maxX = mR.x;
          maxY = mR.y;
          break;
        default:
          break;
      }
      if (maxX - minX < minSize) {
        if (
          this.active === HandleType.MiddleLeft ||
          this.active === HandleType.TopLeft ||
          this.active === HandleType.BottomLeft
        )
          minX = maxX - minSize;
        else maxX = minX + minSize;
      }
      if (maxY - minY < minSize) {
        if (
          this.active === HandleType.TopCenter ||
          this.active === HandleType.TopLeft ||
          this.active === HandleType.TopRight
        )
          minY = maxY - minSize;
        else maxY = minY + minSize;
      }

      if (
        e.shiftKey &&
        (this.active === HandleType.TopLeft ||
          this.active === HandleType.TopRight ||
          this.active === HandleType.BottomLeft ||
          this.active === HandleType.BottomRight)
      ) {
        const sUni = Math.min((maxX - minX) / baseW, (maxY - minY) / baseH);
        const newW = Math.max(minSize, Math.round(baseW * sUni));
        const newH = Math.max(minSize, Math.round(baseH * sUni));
        const anchorR = (() => {
          switch (this.active) {
            case HandleType.TopLeft:
              return { x: obb0.maxX, y: obb0.maxY };
            case HandleType.TopRight:
              return { x: obb0.minX, y: obb0.maxY };
            case HandleType.BottomLeft:
              return { x: obb0.maxX, y: obb0.minY };
            case HandleType.BottomRight:
              return { x: obb0.minX, y: obb0.minY };
            default:
              return { x: (obb0.minX + obb0.maxX) / 2, y: (obb0.minY + obb0.maxY) / 2 };
          }
        })();
        minX = anchorR.x - (this.active === HandleType.TopRight || this.active === HandleType.BottomRight ? 0 : newW);
        maxX = anchorR.x + (this.active === HandleType.TopRight || this.active === HandleType.BottomRight ? newW : 0);
        minY = anchorR.y - (this.active === HandleType.BottomLeft || this.active === HandleType.BottomRight ? 0 : newH);
        maxY = anchorR.y + (this.active === HandleType.BottomLeft || this.active === HandleType.BottomRight ? newH : 0);
      }

      const qW = Math.max(minSize, Math.round(maxX - minX));
      const qH = Math.max(minSize, Math.round(maxY - minY));
      const sx = qW / baseW;
      const sy = qH / baseH;

      const anchorR = (() => {
        switch (this.active) {
          case HandleType.TopLeft:
            return { x: obb0.maxX, y: obb0.maxY };
          case HandleType.TopRight:
            return { x: obb0.minX, y: obb0.maxY };
          case HandleType.BottomLeft:
            return { x: obb0.maxX, y: obb0.minY };
          case HandleType.BottomRight:
            return { x: obb0.minX, y: obb0.minY };
          case HandleType.TopCenter:
            return { x: (obb0.minX + obb0.maxX) / 2, y: obb0.maxY };
          case HandleType.BottomCenter:
            return { x: (obb0.minX + obb0.maxX) / 2, y: obb0.minY };
          case HandleType.MiddleLeft:
            return { x: obb0.maxX, y: (obb0.minY + obb0.maxY) / 2 };
          case HandleType.MiddleRight:
            return { x: obb0.minX, y: (obb0.minY + obb0.maxY) / 2 };
          default:
            return { x: (obb0.minX + obb0.maxX) / 2, y: (obb0.minY + obb0.maxY) / 2 };
        }
      })();

      for (const s of this.nodeStarts) {
        const n = this.engine.graph.getNode(s.id);
        if (!n) continue;
        const scx = s.pos.x + s.size.w / 2;
        const scy = s.pos.y + s.size.h / 2;
        const cR = toRot(scx, scy);
        const ncxR = anchorR.x + (cR.x - anchorR.x) * sx;
        const ncyR = anchorR.y + (cR.y - anchorR.y) * sy;
        const nc = fromRot(ncxR, ncyR);
        const nwN = Math.max(2, Math.round(s.size.w * sx));
        const nhN = Math.max(2, Math.round(s.size.h * sy));
        n.position.x = nc.x - nwN / 2;
        n.position.y = nc.y - nhN / 2;
        n.size.width = nwN;
        n.size.height = nhN;
        if (n.ports && s.ports) {
          n.ports.forEach((p) => {
            const sp = s.ports![p.id];
            if (sp) p.offset = { x: Math.round(sp.x * sx), y: Math.round(sp.y * sy) };
          });
        }
      }
      this.engine.canvas.style.cursor = this.cursorForHandle(this.active);
      // 事件：组缩放进行中（报告当前 OBB 缩放比例）
      this.engine.events.emit("group:resize-move" as any, {
        nodeIds: this.nodeStarts.map((s) => s.id),
        handle: this.active,
        scale: { sx, sy },
        angleRad: rad,
      });
    }
  };

  private onMouseUp = () => {
    if (this.active === HandleType.None) return;
    const updates = this.nodeStarts
      .map((s) => {
        const n = this.engine.graph.getNode(s.id);
        if (!n) return null;
        const angle = n.rotation ?? 0;
        const angNorm = ((angle % 360) + 360) % 360;
        const distToAxis = Math.min(
          Math.abs(angNorm - 0),
          Math.abs(angNorm - 90),
          Math.abs(angNorm - 180),
          Math.abs(angNorm - 270),
        );
        const isAxisAligned = distToAxis < 1e-6;
        const isResizeOp = this.active !== HandleType.Rotate;
        const nextRaw = {
          position: { x: n.position.x, y: n.position.y },
          size: { width: n.size.width, height: n.size.height },
          rotation: n.rotation ?? 0,
          ports: n.ports?.reduce(
            (acc, p) => {
              acc[p.id] = { x: p.offset.x, y: p.offset.y };
              return acc;
            },
            {} as Record<string, { x: number; y: number }>,
          ),
        };
        const posX = isResizeOp && !isAxisAligned ? nextRaw.position.x : Math.round(nextRaw.position.x);
        const posY = isResizeOp && !isAxisAligned ? nextRaw.position.y : Math.round(nextRaw.position.y);
        const next = {
          position: { x: posX, y: posY },
          size: {
            width: Math.max(1, Math.round(nextRaw.size.width)),
            height: Math.max(1, Math.round(nextRaw.size.height)),
          },
          rotation: Math.round(nextRaw.rotation ?? 0),
          ports: nextRaw.ports
            ? (Object.fromEntries(
                Object.entries(nextRaw.ports).map(([id, p]) => [
                  id,
                  { x: Math.round((p as any).x), y: Math.round((p as any).y) },
                ]),
              ) as Record<string, { x: number; y: number }>)
            : undefined,
        };
        const prev = {
          position: { x: s.pos.x, y: s.pos.y },
          size: { width: s.size.w, height: s.size.h },
          rotation: s.rotation,
          ports: s.ports,
        };
        return { id: s.id, prev, next };
      })
      .filter(Boolean) as Array<{ id: string; prev: any; next: any }>;
    if (updates.length > 0) {
      this.engine.history.execute(new GroupTransformCommand(this.engine.graph, updates));
    }
    // 事件：组交互结束（resize/rotate）
    const ids = this.nodeStarts.map((s) => s.id);
    if (this.active === HandleType.Rotate) {
      this.engine.events.emit("group:rotate-end" as any, { nodeIds: ids, updates });
    } else {
      this.engine.events.emit("group:resize-end" as any, { nodeIds: ids, updates, handle: this.active });
    }
    // 通知引擎结束 resize（用于降质渲染优化）
    this.engine.setResizingNodes(false);
    this.active = HandleType.None;
    this.nodeStarts = [];
    if (this.previewAngleDelta != null) {
      this.groupAngle += this.previewAngleDelta;
      if (this.groupAngle > Math.PI) this.groupAngle -= Math.PI * 2;
      if (this.groupAngle <= -Math.PI) this.groupAngle += Math.PI * 2;
    }
    this.previewAngleDelta = null;
    this.updateCursor();
  };

  // ===== Touch 支持 =====
  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const interactionConfig = this.engine.getInteractionConfig();
    if (!interactionConfig.enableDrag) return;
    const bbox = this.getSelectionBBox();
    if (!bbox) return;
    const touch = e.touches[0];
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const h = this.hitHandle(world, this.resolveHitPx(true));
    if (h === HandleType.None) return;
    this.active = h;
    this.startRect = { ...bbox };
    this.startCenter = { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h / 2 };
    this.startAngle = Math.atan2(world.y - this.startCenter.y, world.x - this.startCenter.x);
    if (h !== HandleType.Rotate) {
      this.resizeAngle = this.groupAngle;
      const obb0 = this.getOrientedBBox(this.resizeAngle!);
      this.startObb = obb0 ? { ...obb0 } : null;
    } else {
      this.startObb = null;
    }
    this.nodeStarts = this.engine.graph
      .getNodes()
      .filter((n) => n.selected)
      .map((n) => ({
        id: n.id,
        pos: { x: n.position.x, y: n.position.y },
        size: { w: n.size.width, h: n.size.height },
        rotation: n.rotation ?? 0,
        ports: n.ports?.reduce(
          (acc, p) => {
            acc[p.id] = { x: p.offset.x, y: p.offset.y };
            return acc;
          },
          {} as Record<string, { x: number; y: number }>,
        ),
      }));
    e.stopPropagation();
    e.preventDefault();
    // 通知引擎开始 resize（用于降质渲染优化）
    this.engine.setResizingNodes(true);
    const ids = this.nodeStarts.map((s) => s.id);
    if (this.active === HandleType.Rotate) {
      this.engine.events.emit("group:rotate-start" as any, {
        nodeIds: ids,
        center: { ...this.startCenter },
        angleRad: this.groupAngle,
      });
    } else {
      this.engine.events.emit("group:resize-start" as any, {
        nodeIds: ids,
        handle: this.active,
        startRect: { ...this.startRect! },
        angleRad: this.resizeAngle,
      });
    }
    this.updateCursor();
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const bbox = this.getSelectionBBox();
    if (!bbox) return;
    const touch = e.touches[0];
    const rect = this.engine.canvas.getBoundingClientRect();
    const world = this.engine.toWorld({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    if (this.active === HandleType.None) return; // 不处理 hover
    if (this.active === HandleType.Rotate && this.options.enableRotation) {
      const curAngle = Math.atan2(world.y - this.startCenter.y, world.x - this.startCenter.x);
      let delta = curAngle - this.startAngle;
      // 移动端：整数角度预览
      const deg = Math.round((delta * 180) / Math.PI);
      delta = (deg * Math.PI) / 180;
      const cos = Math.cos(delta),
        sin = Math.sin(delta);
      this.previewAngleDelta = delta;
      for (const s of this.nodeStarts) {
        const n = this.engine.graph.getNode(s.id);
        if (!n) continue;
        const cx0 = s.pos.x + s.size.w / 2;
        const cy0 = s.pos.y + s.size.h / 2;
        const vx = cx0 - this.startCenter.x;
        const vy = cy0 - this.startCenter.y;
        const cx = this.startCenter.x + vx * cos - vy * sin;
        const cy = this.startCenter.y + vx * sin + vy * cos;
        n.position.x = cx - s.size.w / 2;
        n.position.y = cy - s.size.h / 2;
        n.rotation = s.rotation + (delta * 180) / Math.PI;
      }
      this.engine.canvas.style.cursor = "grabbing";
      this.engine.events.emit("group:rotate-move" as any, {
        nodeIds: this.nodeStarts.map((s) => s.id),
        deltaRad: delta,
        center: { ...this.startCenter },
      });
      // 使用 'style' 模式避免触发边快照重建和四叉树重建（resize 预览期间的性能优化）
      this.engine.graph.markDirty("style");
      e.preventDefault();
      return;
    }
    if (this.options.enableResize) {
      const rad = this.resizeAngle || 0;
      const minSize = 10;
      const cos = Math.cos(-rad),
        sin = Math.sin(-rad);
      const toRot = (x: number, y: number) => ({ x: x * cos - y * sin, y: x * sin + y * cos });
      const fromRot = (rx: number, ry: number) => {
        const c = Math.cos(rad),
          s2 = Math.sin(rad);
        return { x: rx * c - ry * s2, y: rx * s2 + ry * c };
      };
      const obb0 = this.startObb;
      if (!obb0) return;
      const baseW = obb0.maxX - obb0.minX;
      const baseH = obb0.maxY - obb0.minY;
      const mR = toRot(world.x, world.y);
      let minX = obb0.minX,
        minY = obb0.minY,
        maxX = obb0.maxX,
        maxY = obb0.maxY;
      switch (this.active) {
        case HandleType.TopLeft:
          minX = mR.x;
          minY = mR.y;
          break;
        case HandleType.TopCenter:
          minY = mR.y;
          break;
        case HandleType.TopRight:
          maxX = mR.x;
          minY = mR.y;
          break;
        case HandleType.MiddleLeft:
          minX = mR.x;
          break;
        case HandleType.MiddleRight:
          maxX = mR.x;
          break;
        case HandleType.BottomLeft:
          minX = mR.x;
          maxY = mR.y;
          break;
        case HandleType.BottomCenter:
          maxY = mR.y;
          break;
        case HandleType.BottomRight:
          maxX = mR.x;
          maxY = mR.y;
          break;
      }
      if (maxX - minX < minSize) {
        if (
          this.active === HandleType.MiddleLeft ||
          this.active === HandleType.TopLeft ||
          this.active === HandleType.BottomLeft
        )
          minX = maxX - minSize;
        else maxX = minX + minSize;
      }
      if (maxY - minY < minSize) {
        if (
          this.active === HandleType.TopCenter ||
          this.active === HandleType.TopLeft ||
          this.active === HandleType.TopRight
        )
          minY = maxY - minSize;
        else maxY = minY + minSize;
      }
      const qW = Math.max(minSize, Math.round(maxX - minX));
      const qH = Math.max(minSize, Math.round(maxY - minY));
      const sx = qW / baseW;
      const sy = qH / baseH;
      const anchorR = (() => {
        switch (this.active) {
          case HandleType.TopLeft:
            return { x: obb0.maxX, y: obb0.maxY };
          case HandleType.TopRight:
            return { x: obb0.minX, y: obb0.maxY };
          case HandleType.BottomLeft:
            return { x: obb0.maxX, y: obb0.minY };
          case HandleType.BottomRight:
            return { x: obb0.minX, y: obb0.minY };
          case HandleType.TopCenter:
            return { x: (obb0.minX + obb0.maxX) / 2, y: obb0.maxY };
          case HandleType.BottomCenter:
            return { x: (obb0.minX + obb0.maxX) / 2, y: obb0.minY };
          case HandleType.MiddleLeft:
            return { x: obb0.maxX, y: (obb0.minY + obb0.maxY) / 2 };
          case HandleType.MiddleRight:
            return { x: obb0.minX, y: (obb0.minY + obb0.maxY) / 2 };
          default:
            return { x: (obb0.minX + obb0.maxX) / 2, y: (obb0.minY + obb0.maxY) / 2 };
        }
      })();
      for (const s of this.nodeStarts) {
        const n = this.engine.graph.getNode(s.id);
        if (!n) continue;
        const scx = s.pos.x + s.size.w / 2;
        const scy = s.pos.y + s.size.h / 2;
        const cR = toRot(scx, scy);
        const ncxR = anchorR.x + (cR.x - anchorR.x) * sx;
        const ncyR = anchorR.y + (cR.y - anchorR.y) * sy;
        const nc = fromRot(ncxR, ncyR);
        const nwN = Math.max(2, Math.round(s.size.w * sx));
        const nhN = Math.max(2, Math.round(s.size.h * sy));
        n.position.x = nc.x - nwN / 2;
        n.position.y = nc.y - nhN / 2;
        n.size.width = nwN;
        n.size.height = nhN;
        if (n.ports && s.ports) {
          n.ports.forEach((p) => {
            const sp = s.ports![p.id];
            if (sp) p.offset = { x: Math.round(sp.x * sx), y: Math.round(sp.y * sy) };
          });
        }
      }
      this.engine.canvas.style.cursor = this.cursorForHandle(this.active);
      this.engine.events.emit("group:resize-move" as any, {
        nodeIds: this.nodeStarts.map((s) => s.id),
        handle: this.active,
        scale: { sx, sy },
        angleRad: rad,
      });
      // 使用 'style' 模式避免触发边快照重建和四叉树重建（resize 预览期间的性能优化）
      this.engine.graph.markDirty("style");
    }
    e.preventDefault();
  };

  private onTouchEnd = (_e: TouchEvent) => {
    this.onMouseUp();
  };

  private updateCursor() {
    const c = this.engine.canvas;
    c.style.cursor = this.cursorForHandle(this.active !== HandleType.None ? this.active : this.hover);
  }

  private cursorForHandle(h: HandleType): string {
    switch (h) {
      case HandleType.TopCenter:
      case HandleType.BottomCenter:
        return "ns-resize";
      case HandleType.MiddleLeft:
      case HandleType.MiddleRight:
        return "ew-resize";
      case HandleType.TopLeft:
      case HandleType.BottomRight:
        return "nwse-resize";
      case HandleType.TopRight:
      case HandleType.BottomLeft:
        return "nesw-resize";
      case HandleType.Rotate:
        return "grab";
      default:
        return "default";
    }
  }

  afterRender(ctx: CanvasRenderingContext2D): void {
    const bbox = this.getSelectionBBox();
    if (!bbox) return;
    const { x, y, w, h } = bbox;
    const sel = this.engine.graph.getNodes().filter((n) => n.selected);
    const sameGroupId = sel.length >= 2 ? sel.every((n) => !!n.groupId && n.groupId === sel[0]!.groupId) : false;
    const shouldFill = this.options.groupFillEnabled && sameGroupId;

    ctx.save();
    const { x: tx, y: ty } = this.engine.getTranslation();
    const scale = this.engine.getScale();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);

    ctx.strokeStyle = this.options.handleColor;
    const px = Math.max(0.0001, scale);
    ctx.setLineDash([4 / px, 3 / px]);
    ctx.lineWidth = 1 / px;

    const hsPx = this.options.handleSize;
    const hs = hsPx / Math.max(0.0001, scale);
    const half = hs / 2;

    const hasPreview = this.active === HandleType.Rotate && this.previewAngleDelta != null;
    const rad = hasPreview ? this.groupAngle + (this.previewAngleDelta as number) : this.groupAngle;
    if (hasPreview || Math.abs(rad) > 1e-6) {
      const obb = this.getOrientedBBox(rad);
      if (!obb) {
        ctx.restore();
        return;
      }
      const { minX, minY, maxX, maxY } = obb;
      const cos = Math.cos(rad),
        sin = Math.sin(rad);
      const toWorld = (px2: number, py2: number) => ({ x: px2 * cos - py2 * sin, y: px2 * sin + py2 * cos });
      const TL = toWorld(minX, minY);
      const TR = toWorld(maxX, minY);
      const BR = toWorld(maxX, maxY);
      const BL = toWorld(minX, maxY);
      const TC = toWorld((minX + maxX) / 2, minY);
      const BC = toWorld((minX + maxX) / 2, maxY);
      const ML = toWorld(minX, (minY + maxY) / 2);
      const MR = toWorld(maxX, (minY + maxY) / 2);

      if (shouldFill) {
        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = this.options.groupFillColor;
        ctx.beginPath();
        ctx.moveTo(TL.x, TL.y);
        ctx.lineTo(TR.x, TR.y);
        ctx.lineTo(BR.x, BR.y);
        ctx.lineTo(BL.x, BL.y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.moveTo(TL.x, TL.y);
      ctx.lineTo(TR.x, TR.y);
      ctx.lineTo(BR.x, BR.y);
      ctx.lineTo(BL.x, BL.y);
      ctx.closePath();
      ctx.stroke();

      const interactionConfig = this.engine.getInteractionConfig();
      const allResizable = sel.every((n) => (n as any).resizable !== false);
      const allRotatable = sel.every((n) => (n as any).rotatable !== false);

      if (this.options.enableResize && interactionConfig.enableResize && allResizable) {
        const spots: Array<{ p: { x: number; y: number }; t: HandleType }> = [
          { p: TL, t: HandleType.TopLeft },
          { p: TC, t: HandleType.TopCenter },
          { p: TR, t: HandleType.TopRight },
          { p: ML, t: HandleType.MiddleLeft },
          { p: MR, t: HandleType.MiddleRight },
          { p: BL, t: HandleType.BottomLeft },
          { p: BC, t: HandleType.BottomCenter },
          { p: BR, t: HandleType.BottomRight },
        ];
        for (const s of spots) {
          const hovered = this.hover === s.t || this.active === s.t;
          ctx.fillStyle = hovered ? this.options.handleHoverColor : this.options.handleColor;
          ctx.fillRect(s.p.x - half, s.p.y - half, hs, hs);
        }
      }
      if (this.options.enableRotation && interactionConfig.enableRotate && allRotatable) {
        const upX = Math.sin(rad);
        const upY = -Math.cos(rad);
        const off = this.options.rotateHandleOffset / Math.max(0.0001, scale);
        const rx = TC.x + upX * off;
        const ry = TC.y + upY * off;
        ctx.fillStyle =
          this.hover === HandleType.Rotate || this.active === HandleType.Rotate
            ? this.options.handleHoverColor
            : this.options.rotateHandleColor;
        ctx.beginPath();
        ctx.arc(rx, ry, half, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(TC.x, TC.y);
        ctx.lineTo(rx, ry);
        ctx.strokeStyle = this.options.rotateHandleColor;
        ctx.lineWidth = 1 / px;
        ctx.stroke();
      }
    } else {
      // 常规：轴对齐包围盒
      if (shouldFill) {
        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = this.options.groupFillColor;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
      }
      ctx.strokeRect(x, y, w, h);

      const interactionConfig = this.engine.getInteractionConfig();
      const allResizable = sel.every((n) => (n as any).resizable !== false);
      const allRotatable = sel.every((n) => (n as any).rotatable !== false);

      if (this.options.enableResize && interactionConfig.enableResize && allResizable) {
        const spots: { x: number; y: number; t: HandleType }[] = [
          { x, y, t: HandleType.TopLeft },
          { x: x + w / 2, y, t: HandleType.TopCenter },
          { x: x + w, y, t: HandleType.TopRight },
          { x, y: y + h / 2, t: HandleType.MiddleLeft },
          { x: x + w, y: y + h / 2, t: HandleType.MiddleRight },
          { x, y: y + h, t: HandleType.BottomLeft },
          { x: x + w / 2, y: y + h, t: HandleType.BottomCenter },
          { x: x + w, y: y + h, t: HandleType.BottomRight },
        ];
        for (const s of spots) {
          const hovered = this.hover === s.t || this.active === s.t;
          ctx.fillStyle = hovered ? this.options.handleHoverColor : this.options.handleColor;
          ctx.fillRect(s.x - half, s.y - half, hs, hs);
        }
      }
      if (this.options.enableRotation && interactionConfig.enableRotate && allRotatable) {
        const rx = x + w / 2;
        const ry = y - this.options.rotateHandleOffset / Math.max(0.0001, scale);
        ctx.fillStyle =
          this.hover === HandleType.Rotate || this.active === HandleType.Rotate
            ? this.options.handleHoverColor
            : this.options.rotateHandleColor;
        ctx.beginPath();
        ctx.arc(rx, ry, half, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(rx, y);
        ctx.lineTo(rx, ry);
        ctx.strokeStyle = this.options.rotateHandleColor;
        ctx.lineWidth = 1 / Math.max(0.0001, scale);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
