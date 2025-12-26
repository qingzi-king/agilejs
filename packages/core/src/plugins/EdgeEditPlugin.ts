/*
 * @Description: 边编辑插件
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-12-10 12:18:59
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import { EdgeData, Point } from "../model/Graph";
import { ReconnectEdgeCommand, SetEdgePointsCommand } from "../commands/GraphCommands";
import { hitTestNodes } from "../utils/hittest";
import { getNearestPort, getPortWorldPosition } from "../utils/ports";
import { buildOrthogonalPathPoints } from "../utils/orthogonal";

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

function bezierPoint(a: Point, c1: Point, c2: Point, b: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const x = mt2 * mt * a.x + 3 * mt2 * t * c1.x + 3 * mt * t2 * c2.x + t2 * t * b.x;
  const y = mt2 * mt * a.y + 3 * mt2 * t * c1.y + 3 * mt * t2 * c2.y + t2 * t * b.y;
  return { x, y };
}

function manhattanPath(a: Point, b: Point): Point[] {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  if (dx > dy) {
    const mid: Point = { x: (a.x + b.x) / 2, y: a.y };
    const mid2: Point = { x: (a.x + b.x) / 2, y: b.y };
    return [a, mid, mid2, b];
  } else {
    const mid: Point = { x: a.x, y: (a.y + b.y) / 2 };
    const mid2: Point = { x: b.x, y: (a.y + b.y) / 2 };
    return [a, mid, mid2, b];
  }
}

// 推断端口法线方向（与 OrthogonalEdgeRenderer 中逻辑一致）
function inferPortNormalFor(node: any, portId?: string): Point | null {
  if (!portId) return null;
  const port = (node.ports ?? []).find((p: any) => p.id === portId);
  if (!port) return null;
  const w = node.size.width;
  const h = node.size.height;
  const tol = Math.max(1, Math.min(w, h) * 0.001);
  if (Math.abs(port.offset.x - 0) <= tol) return { x: -1, y: 0 };
  if (Math.abs(port.offset.x - w) <= tol) return { x: 1, y: 0 };
  if (Math.abs(port.offset.y - 0) <= tol) return { x: 0, y: -1 };
  if (Math.abs(port.offset.y - h) <= tol) return { x: 0, y: 1 };
  const dxLeft = Math.abs(port.offset.x - 0);
  const dxRight = Math.abs(port.offset.x - w);
  const dyTop = Math.abs(port.offset.y - 0);
  const dyBottom = Math.abs(port.offset.y - h);
  const min = Math.min(dxLeft, dxRight, dyTop, dyBottom);
  if (min === dxLeft) return { x: -1, y: 0 };
  if (min === dxRight) return { x: 1, y: 0 };
  if (min === dyTop) return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

// 计算正交边在“管道模式”下用于命中检测的折点序列，尽量与渲染器保持一致
function getOrthogonalPipelinePointsForHit(edge: EdgeData, engine: CanvasEngine, a: Point, b: Point): Point[] {
  // 优先使用手动调整过的点序列（如果存在）
  if ((edge.data as any)?._orthogonalManual && Array.isArray(edge.points) && edge.points.length > 0) {
    return [a, ...(edge.points as Point[]), b];
  }

  // 基础曼哈顿路径（无管道修饰）
  let pts: Point[] = manhattanPath(a, b);
  const style = (edge.data?.style as any) || {};
  const pipeline = style.pipeline as
    | undefined
    | {
        outerWidth?: number;
        innerWidth?: number;
        gap?: number;
        cornerRadius?: number;
        stub?: number;
        clearance?: number;
        avoidSelfMargin?: number;
      };
  if (!pipeline || pts.length < 2) return pts;

  const src = engine.graph.getNode(edge.source);
  const tgt = engine.graph.getNode(edge.target);
  if (!src || !tgt) return pts;

  const outerW = pipeline.outerWidth ?? 6;
  const stub =
    typeof (pipeline as any).stub === "number"
      ? Math.max(1, (pipeline as any).stub)
      : typeof (pipeline as any).clearance === "number"
        ? Math.max(1, (pipeline as any).clearance)
        : Math.max(3, outerW / 2);

  // 推断端口法线
  const nA =
    inferPortNormalFor(src, edge.sourcePortId) ??
    (() => {
      const dx = b.x - a.x,
        dy = b.y - a.y;
      return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
    })();
  const nB =
    inferPortNormalFor(tgt, edge.targetPortId) ??
    (() => {
      const dx = a.x - b.x,
        dy = a.y - b.y;
      return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
    })();

  const a1 = { x: a.x + nA.x * stub, y: a.y + nA.y * stub };
  const b1 = { x: b.x + nB.x * stub, y: b.y + nB.y * stub };
  let midPath = manhattanPath(a1, b1); // [a1, m1, m2, b1]

  if (midPath.length === 4) {
    const m1 = { ...midPath[1] };
    const m2 = { ...midPath[2] };
    const avoid =
      typeof (pipeline as any).avoidSelfMargin === "number"
        ? Math.max(0, (pipeline as any).avoidSelfMargin)
        : Math.max(stub, outerW);
    const srcLeft = src.position.x,
      srcRight = src.position.x + src.size.width;
    const srcTop = src.position.y,
      srcBottom = src.position.y + src.size.height;
    const tgtLeft = tgt.position.x,
      tgtRight = tgt.position.x + tgt.size.width;
    const tgtTop = tgt.position.y,
      tgtBottom = tgt.position.y + tgt.size.height;
    const horizontalFirst = a1.y === m1.y && m1.x === m2.x;
    if (horizontalFirst) {
      // 共享 x
      let sharedX = m1.x;
      if (nA.x !== 0) {
        const boundX = nA.x > 0 ? srcRight + avoid : srcLeft - avoid;
        sharedX = nA.x > 0 ? Math.max(sharedX, boundX) : Math.min(sharedX, boundX);
      }
      if (nB.x !== 0) {
        const tgtBoundX = nB.x > 0 ? tgtRight + avoid : tgtLeft - avoid;
        const cand = nB.x > 0 ? Math.max(sharedX, tgtBoundX) : Math.min(sharedX, tgtBoundX);
        if (Math.abs(cand - m1.x) <= Math.abs(sharedX - m1.x)) sharedX = cand;
      }
      m1.x = sharedX;
      m2.x = sharedX;
    } else {
      // 共享 y
      let sharedY = m1.y;
      if (nA.y !== 0) {
        const boundY = nA.y > 0 ? srcBottom + avoid : srcTop - avoid;
        sharedY = nA.y > 0 ? Math.max(sharedY, boundY) : Math.min(sharedY, boundY);
      }
      if (nB.y !== 0) {
        const tgtBoundY = nB.y > 0 ? tgtBottom + avoid : tgtTop - avoid;
        const cand = nB.y > 0 ? Math.max(sharedY, tgtBoundY) : Math.min(sharedY, tgtBoundY);
        if (Math.abs(cand - m1.y) <= Math.abs(sharedY - m1.y)) sharedY = cand;
      }
      m1.y = sharedY;
      m2.y = sharedY;
    }
    midPath = [a1, m1, m2, b1];
  }

  if (midPath.length >= 2) {
    pts = [a, a1, ...midPath.slice(1, -1), b1, b];
  }
  return pts;
}

export interface EdgeEditOptions {
  handleSize?: number;
  handleColor?: string;
  handleHoverColor?: string;
  hitThreshold?: number; // pixel units (screen-space)
  /** 触摸命中阈值（屏幕像素或 'auto' 基于 DPR 自适应） */
  touchHitThreshold?: number | "auto";
  /** 顶点（折线中间点）触摸命中阈值（单独覆盖），默认 'auto' */
  touchVertexHitThreshold?: number | "auto";
  /** 线段触摸命中阈值（单独覆盖），默认 'auto' */
  touchSegmentHitThreshold?: number | "auto";
  /** 端点（source/target）触摸命中阈值（单独覆盖），默认 'auto' */
  touchEndpointHitThreshold?: number | "auto";
}

export class EdgeEditPlugin implements Plugin {
  readonly id = "edge-edit";
  private engine!: CanvasEngine;
  private options: Required<EdgeEditOptions>;
  private activeEdgeId: string | null = null;
  private hovered: { edgeId: string; kind: "vertex" | "segment" | "source" | "target"; index?: number } | null = null;
  private dragging: { edgeId: string; index: number } | null = null; // dragging vertex index in points
  private draggingEndpoint: { edgeId: string; kind: "source" | "target"; pt: Point } | null = null;
  private startPointsSnapshot: Point[] | undefined; // points before a drag/insert/delete operation

  // 正交边拖拽状态
  private draggingOrthogonalSegment: {
    edgeId: string;
    iStart: number;
    iEnd: number;
    startPoints: Point[];
    startMouse: Point;
    direction: "vertical" | "horizontal";
  } | null = null;
  private hoveredOrthogonalSegment: {
    edgeId: string;
    iStart: number;
    iEnd: number;
    center: Point;
    direction: "vertical" | "horizontal";
  } | null = null;

  constructor(options: EdgeEditOptions = {}) {
    this.options = {
      handleSize: options.handleSize ?? 8,
      handleColor: options.handleColor ?? "#2563eb",
      handleHoverColor: options.handleHoverColor ?? "#3b82f6",
      hitThreshold: options.hitThreshold ?? 8,
      touchHitThreshold: options.touchHitThreshold ?? "auto",
      touchVertexHitThreshold: options.touchVertexHitThreshold ?? "auto",
      touchSegmentHitThreshold: options.touchSegmentHitThreshold ?? "auto",
      touchEndpointHitThreshold: options.touchEndpointHitThreshold ?? "auto",
    };
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    const c = engine.canvas;
    // 使用捕获阶段，优先于其他插件处理事件，避免与节点尺寸/选择句柄冲突
    c.addEventListener("mousedown", this.onMouseDown, { capture: true });
    c.addEventListener("mousemove", this.onMouseMove, { capture: true });
    window.addEventListener("mouseup", this.onMouseUp, { capture: true });
    // Touch 事件支持（移动端边选中与折线编辑）
    c.addEventListener("touchstart", this.onTouchStart, { passive: false, capture: true });
    c.addEventListener("touchmove", this.onTouchMove, { passive: false, capture: true });
    window.addEventListener("touchend", this.onTouchEnd, { capture: true });
    window.addEventListener("touchcancel", this.onTouchEnd, { capture: true });
  }

  // 将正交路径的中段（排除两端 stub）按方向合并为“逻辑直线段”，避免同一直线出现多个句柄
  private computeOrthogonalRuns(
    pts: Point[],
  ): Array<{ iStart: number; iEnd: number; dir: "horizontal" | "vertical"; p1: Point; p2: Point; mid: Point }> {
    const res: Array<{
      iStart: number;
      iEnd: number;
      dir: "horizontal" | "vertical";
      p1: Point;
      p2: Point;
      mid: Point;
    }> = [];
    if (pts.length < 4) return res;
    const tol = 5 / Math.max(0.0001, this.engine.getScale());
    const start = 1,
      end = pts.length - 2; // 点索引范围，段范围为 [1..len-3]
    let i = start;
    while (i <= end - 1) {
      const a = pts[i];
      const b = pts[i + 1];
      const isH = Math.abs(a.y - b.y) <= tol; // 近似水平视为水平
      const dir = isH ? "horizontal" : "vertical";
      let j = i + 1;
      // 合并后续同方向且共线的段
      while (j <= end - 1) {
        const p = pts[j];
        const q = pts[j + 1];
        const same = isH
          ? Math.abs(p.y - a.y) <= tol && Math.abs(q.y - a.y) <= tol
          : Math.abs(p.x - a.x) <= tol && Math.abs(q.x - a.x) <= tol;
        if (!same) break;
        j++;
      }
      const p1 = pts[i];
      const p2 = pts[j];
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      res.push({ iStart: i, iEnd: j, dir, p1, p2, mid });
      i = j;
    }
    return res;
  }

  // 计算句柄位置：在靠近 a1/b1 的中段上，句柄向段内偏移一个安全距离，避免与端部标记重叠
  private getRunHandlePos(
    pts: Point[],
    run: { iStart: number; iEnd: number; dir: "horizontal" | "vertical"; p1: Point; p2: Point; mid: Point },
    hsWorld: number,
  ): Point {
    const len = pts.length;
    const safe = Math.max(hsWorld, 6 / Math.max(0.0001, this.engine.getScale()));
    const nearStartStub = run.iStart === 1; // 紧邻 a1
    const nearEndStub = run.iEnd === len - 2; // 紧邻 b1
    const p1 = run.p1;
    const p2 = run.p2;
    // 默认使用中点
    let x = run.mid.x;
    let y = run.mid.y;
    // 总是将句柄限制在当前段的安全边界内，避免跑到段外（不只靠近 stub 时）
    if (run.dir === "horizontal") {
      const minX = Math.min(p1.x, p2.x) + safe;
      const maxX = Math.max(p1.x, p2.x) - safe;
      x = Math.min(maxX, Math.max(minX, x));
    } else {
      const minY = Math.min(p1.y, p2.y) + safe;
      const maxY = Math.max(p1.y, p2.y) - safe;
      y = Math.min(maxY, Math.max(minY, y));
    }
    return { x, y };
  }

  dispose(): void {
    const c = this.engine.canvas;
    c.removeEventListener("mousedown", this.onMouseDown, { capture: true } as any);
    c.removeEventListener("mousemove", this.onMouseMove, { capture: true } as any);
    window.removeEventListener("mouseup", this.onMouseUp, { capture: true } as any);
    c.removeEventListener("touchstart", this.onTouchStart as any, { capture: true } as any);
    c.removeEventListener("touchmove", this.onTouchMove as any, { capture: true } as any);
    window.removeEventListener("touchend", this.onTouchEnd as any, { capture: true } as any);
    window.removeEventListener("touchcancel", this.onTouchEnd as any, { capture: true } as any);
  }

  private getPolylinePoints(edge: EdgeData): Point[] | null {
    if (edge.shape !== "edge-polyline") return null;
    const src = this.engine.graph.getNode(edge.source);
    const tgt = this.engine.graph.getNode(edge.target);
    if (!src || !tgt) return null;
    // 端点由端口/中心决定，中间点由 edge.points
    const start = edge.sourcePortId
      ? getPortWorldPosition(src, edge.sourcePortId)
      : { x: src.position.x + src.size.width / 2, y: src.position.y + src.size.height / 2 };
    const end = edge.targetPortId
      ? getPortWorldPosition(tgt, edge.targetPortId)
      : { x: tgt.position.x + tgt.size.width / 2, y: tgt.position.y + tgt.size.height / 2 };
    if (!start || !end) return null;
    return [start, ...(edge.points ?? []), end];
  }

  private getEdgeEndpoints(edge: EdgeData): { start: Point; end: Point } | null {
    const src = this.engine.graph.getNode(edge.source);
    const tgt = this.engine.graph.getNode(edge.target);
    if (!src || !tgt) return null;
    const start = edge.sourcePortId
      ? getPortWorldPosition(src, edge.sourcePortId)
      : { x: src.position.x + src.size.width / 2, y: src.position.y + src.size.height / 2 };
    const end = edge.targetPortId
      ? getPortWorldPosition(tgt, edge.targetPortId)
      : { x: tgt.position.x + tgt.size.width / 2, y: tgt.position.y + tgt.size.height / 2 };
    if (!start || !end) return null;
    return { start, end };
  }

  private resolveHitThreshold(isTouch: boolean, kind?: "vertex" | "segment" | "endpoint"): number {
    if (!isTouch) return this.options.hitThreshold;
    // 专用覆盖优先，其次统一 touchHitThreshold
    let raw: number | "auto" | undefined;
    if (kind === "vertex") raw = this.options.touchVertexHitThreshold;
    else if (kind === "segment") raw = this.options.touchSegmentHitThreshold;
    else if (kind === "endpoint") raw = this.options.touchEndpointHitThreshold;
    if (raw == null || raw === "auto") raw = this.options.touchHitThreshold;
    if (raw === "auto" || raw == null) {
      const dpr = typeof window !== "undefined" && window.devicePixelRatio ? window.devicePixelRatio : 1;
      // 基准：endpoint 24, vertex 20, segment 16（乘 DPR，限制 1~2）
      const base = kind === "endpoint" ? 24 : kind === "vertex" ? 20 : 18;
      const factor = Math.min(Math.max(dpr, 1), 2);
      return Math.round(base * factor);
    }
    return raw as number;
  }

  private hitTest(
    world: Point,
    isTouch = false,
  ): { edgeId: string; kind: "vertex" | "segment" | "source" | "target"; index?: number } | null {
    // 优先检查已选中的边，确保共享端口时操作落在当前选中边上
    const edgesAll = this.engine.graph.getEdges();
    const edges = [...edgesAll].sort((a, b) => (b.selected ? 1 : 0) - (a.selected ? 1 : 0));
    // 将像素阈值换算为世界单位
    const scale = this.engine.getScale();
    const tvWorld = this.resolveHitThreshold(isTouch, "vertex") / Math.max(0.0001, scale);
    const tsWorld = this.resolveHitThreshold(isTouch, "segment") / Math.max(0.0001, scale);
    const teWorld = this.resolveHitThreshold(isTouch, "endpoint") / Math.max(0.0001, scale);
    for (const e of edges) {
      const endpoints = this.getEdgeEndpoints(e);
      if (!endpoints) continue;
      if (Math.hypot(world.x - endpoints.start.x, world.y - endpoints.start.y) <= teWorld)
        return { edgeId: e.id, kind: "source" };
      if (Math.hypot(world.x - endpoints.end.x, world.y - endpoints.end.y) <= teWorld)
        return { edgeId: e.id, kind: "target" };

      // 折线专属：拐点与线段命中（正交边使用与渲染一致的路径点）
      const pts =
        e.shape === "edge-orthogonal" ? buildOrthogonalPathPoints(e, this.engine.graph) : this.getPolylinePoints(e);
      if (pts) {
        // 顶点命中：仅针对可见拐点（正交构建返回包含端点，顶点从 1..len-2）
        for (let i = 1; i < pts.length - 1; i++) {
          if (Math.hypot(world.x - pts[i].x, world.y - pts[i].y) <= tvWorld)
            return { edgeId: e.id, kind: "vertex", index: i - 1 };
        }
        // 线段命中：使用当前绘制路径（包含 stub 与避让）
        for (let i = 0; i < pts.length - 1; i++) {
          if (distancePointToSegment(world, pts[i], pts[i + 1]) <= tsWorld)
            return { edgeId: e.id, kind: "segment", index: i };
        }
      }
      // 直线边：线段命中
      if (e.shape === "edge-straight") {
        if (distancePointToSegment(world, endpoints.start, endpoints.end) <= tsWorld)
          return { edgeId: e.id, kind: "segment", index: 0 };
      }
      // 正交边额外命中逻辑不再需要：已统一到上面 pts
      // 贝塞尔边：采样判定
      if (e.shape === "edge-bezier") {
        const a = endpoints.start;
        const b = endpoints.end;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const k = Math.max(40, Math.hypot(dx, dy) * 0.3);
        const c1: Point = { x: a.x + k, y: a.y };
        const c2: Point = { x: b.x - k, y: b.y };
        const steps = 24;
        let prev = a;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const pt = bezierPoint(a, c1, c2, b, t);
          if (distancePointToSegment(world, prev, pt) <= tsWorld)
            return { edgeId: e.id, kind: "segment", index: i - 1 };
          prev = pt;
        }
      }
    }
    return null;
  }

  private emitSelectionChanged(reason: string) {
    const nodes = this.engine.graph
      .getNodes()
      .filter((n) => n.selected)
      .map((n) => n.id);
    const edges = this.engine.graph
      .getEdges()
      .filter((e) => e.selected)
      .map((e) => e.id);
    this.engine.events.emit("graph:selection-change", { nodes, edges, reason });
  }

  private onMouseDown = (e: MouseEvent) => {
    // 检查引擎全局交互配置
    const interactionConfig = this.engine.getInteractionConfig();
    // 边编辑需要选中功能（拖拽功能在具体操作时检查）
    if (!interactionConfig.enableSelection) return;

    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);

    const hit = this.hitTest(world, false);

    // 如果上层有节点，默认让节点优先；但以下边句柄应当置顶：
    // 1) 已选中边的端点（source/target）
    // 2) 正交边的中段拖拽句柄（this.hoveredOrthogonalSegment）
    // 3) 折线边的拐点（hit.kind === 'vertex'）
    // 4) 正交边的段（hit.kind === 'segment' 且该边为 edge-orthogonal）
    const nodeHit = hitTestNodes(world, this.engine.graph.getNodes(), {
      scale: this.engine.getScale(),
      pixelThresholdPx: 10,
    });
    if (nodeHit) {
      const isSelectedEndpoint = !!(
        hit &&
        (hit.kind === "source" || hit.kind === "target") &&
        this.engine.graph.getEdge(hit.edgeId)?.selected
      );
      const allowOrthoHandle = !!this.hoveredOrthogonalSegment;
      const allowPolylineVertex = !!(hit && hit.kind === "vertex");
      const allowOrthoSegmentByHit = !!(
        hit &&
        hit.kind === "segment" &&
        this.engine.graph.getEdge(hit.edgeId)?.shape === "edge-orthogonal"
      );
      const allowEdgeHandle = isSelectedEndpoint || allowOrthoHandle || allowPolylineVertex || allowOrthoSegmentByHit;
      if (!allowEdgeHandle) {
        return; // 不拦截，交由其他插件处理节点
      }
    }

    // 检查是否有选中的节点，如果有则不允许调整边的端点
    const hasSelectedNode = this.engine.graph.getNodes().some((n) => n.selected);
    if (!hit) {
      // 空白点击：取消所有边的选中（释放边控制）
      let changed = false;
      for (const ed of this.engine.graph.getEdges()) {
        if (ed.selected) {
          ed.selected = false;
          changed = true;
        }
      }
      this.hovered = null;
      this.dragging = null;
      this.draggingEndpoint = null;
      // transient overlays may need a repaint even if selection didn't change
      this.engine.requestRender();
      if (changed) {
        this.engine.graph.markDirty(); // 确保取消选中后立即重绘（清除高亮颜色）
        this.engine.events.emit("graph:change", { reason: "edge-selection-cleared" });
        this.emitSelectionChanged("edge-selection-cleared");
      }
      return; // 不阻止冒泡，其他插件可处理节点选择
    }

    const edge = this.engine.graph.getEdge(hit.edgeId);
    if (!edge) return;

    // 选择该边：保持节点与边的互斥选中
    for (const other of this.engine.graph.getEdges()) other.selected = false;
    for (const n of this.engine.graph.getNodes()) n.selected = false;
    edge.selected = true;
    this.engine.graph.markDirty(); // 确保选中后立即重绘（显示高亮颜色）
    this.engine.events.emit("graph:change", { reason: "edge-selection" });
    this.emitSelectionChanged("edge-click");

    // 触发边点击事件
    this.engine.events.emit("edge:click", { edgeId: edge.id, event: e });

    // 阻止事件传播，防止 SelectionOverlayPlugin 清除选中状态
    e.stopPropagation();

    // 检查是否允许编辑（拖拽+调整尺寸）
    // 1. 全局 enableDrag 必须开启
    // 2. 全局 enableResize 必须开启（针对形状调整）
    // 3. 边数据中 resizable !== false (保持与节点一致的控制逻辑)
    const canEdit = interactionConfig.enableDrag && interactionConfig.enableResize && edge.data?.resizable !== false;

    if (!canEdit) return;

    // 1) 删除顶点（优先于拖动）：支持折线与正交的手动点
    if (hit.kind === "vertex" && (e.metaKey || e.ctrlKey)) {
      // 对于正交边：只有在手动模式下才允许删除（避免破坏自动路由）
      if (edge.shape === "edge-orthogonal" && !(edge as any).data?._orthogonalManual) return;
      if (!edge.points || edge.points.length === 0) return;
      const i = hit.index!;
      const prev = edge.points ? edge.points.map((p) => ({ x: p.x, y: p.y })) : [];
      // 保护首末两端的 stub 对齐：删除中点即可，首末由路由函数生成
      const next = prev.filter((_, idx) => idx !== i);
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        this.engine.history.execute(new SetEdgePointsCommand(this.engine.graph, edge.id, prev, next));
      }
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // 2) 在段上插入新点（Alt/Shift）
    if (hit.kind === "segment" && (e.altKey || e.shiftKey)) {
      // 在段上插入一个新点
      const pts = this.getPolylinePoints(edge);
      if (!pts) return;
      const idx = hit.index!; // 插入到 idx 与 idx+1 之间，对应 edge.points 的 idx
      const newPt = world;
      const prev = edge.points ? edge.points.map((p) => ({ x: p.x, y: p.y })) : [];
      const next = [...prev];
      next.splice(idx, 0, { x: newPt.x, y: newPt.y });
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        this.engine.history.execute(new SetEdgePointsCommand(this.engine.graph, edge.id, prev, next));
      }
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // 3) 拖动顶点
    if (hit.kind === "vertex" && hit.index != null) {
      // 禁止拖动正交边的顶点，防止破坏正交性（应通过拖动线段调整）
      if (edge.shape === "edge-orthogonal") return;

      this.dragging = { edgeId: edge.id, index: hit.index };
      this.startPointsSnapshot = edge.points ? edge.points.map((p) => ({ x: p.x, y: p.y })) : undefined;
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // 4) 拖动端点以重连到其他锚点（仅当没有选中节点时允许）
    if ((hit.kind === "source" || hit.kind === "target") && !hasSelectedNode) {
      this.draggingEndpoint = { edgeId: edge.id, kind: hit.kind, pt: { x: world.x, y: world.y } };
      this.engine.requestRender();
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // 5) 拖动正交边中段（仅中段，排除两端 stub；不进行首尾分裂）
    if (this.hoveredOrthogonalSegment) {
      const edge = this.engine.graph.getEdge(this.hoveredOrthogonalSegment.edgeId);
      if (edge) {
        const startPoints = buildOrthogonalPathPoints(edge, this.engine.graph);
        const iStart = this.hoveredOrthogonalSegment.iStart;
        const iEnd = this.hoveredOrthogonalSegment.iEnd;
        if (iStart <= 0 || iEnd >= startPoints.length - 1) return;
        const dragDirection = this.hoveredOrthogonalSegment.direction === "horizontal" ? "vertical" : "horizontal";

        this.draggingOrthogonalSegment = {
          edgeId: edge.id,
          iStart,
          iEnd,
          startPoints: startPoints,
          startMouse: world,
          direction: dragDirection,
        };
        e.stopPropagation();
        e.preventDefault();
        return;
      }
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    const interactionConfig = this.engine.getInteractionConfig();
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);

    const prevHoveredKey = this.hovered ? `${this.hovered.edgeId}:${this.hovered.kind}:${(this.hovered as any).index ?? -1}` : "";
    const prevOrthoKey = this.hoveredOrthogonalSegment
      ? `${this.hoveredOrthogonalSegment.edgeId}:${this.hoveredOrthogonalSegment.iStart}-${this.hoveredOrthogonalSegment.iEnd}`
      : "";

    this.hovered = this.hitTest(world, false);

    // 正交边中段控制点 Hover 检测（仅中段：排除两端 stub；同一直线仅一个句柄）
    this.hoveredOrthogonalSegment = null;
    if (!this.dragging && !this.draggingEndpoint) {
      const scale = this.engine.getScale();
      const threshold = this.options.handleSize / scale / 2 + 5 / scale;

      for (const edge of this.engine.graph.getEdges()) {
        if (!edge.selected || edge.shape !== "edge-orthogonal") continue;
        const pts = buildOrthogonalPathPoints(edge, this.engine.graph);
        const runs = this.computeOrthogonalRuns(pts);
        for (const run of runs) {
          const mid = this.getRunHandlePos(pts, run, this.options.handleSize / Math.max(0.0001, scale));
          if (Math.abs(mid.x - world.x) < threshold && Math.abs(mid.y - world.y) < threshold) {
            this.hoveredOrthogonalSegment = {
              edgeId: edge.id,
              iStart: run.iStart,
              iEnd: run.iEnd,
              center: mid,
              direction: run.dir,
            };
            break;
          }
        }
        if (this.hoveredOrthogonalSegment) break;
      }
    }

    // hover：默认节点优先，但以下边句柄应当置顶（见 onMouseDown 同步逻辑）
    const nodeHitMove = hitTestNodes(world, this.engine.graph.getNodes(), {
      scale: this.engine.getScale(),
      pixelThresholdPx: 10,
    });
    if (nodeHitMove && !this.dragging && !this.draggingEndpoint && !this.draggingOrthogonalSegment) {
      const isSelectedEndpoint = !!(
        this.hovered &&
        (this.hovered.kind === "source" || this.hovered.kind === "target") &&
        this.engine.graph.getEdge(this.hovered.edgeId)?.selected
      );
      const allowOrthoHandle = !!this.hoveredOrthogonalSegment;
      const allowPolylineVertex = !!(this.hovered && this.hovered.kind === "vertex");
      const allowOrthoSegmentByHit = !!(
        this.hovered &&
        this.hovered.kind === "segment" &&
        this.engine.graph.getEdge(this.hovered.edgeId)?.shape === "edge-orthogonal"
      );
      const allowEdgeHandle = isSelectedEndpoint || allowOrthoHandle || allowPolylineVertex || allowOrthoSegmentByHit;
      if (!allowEdgeHandle) {
        this.hovered = null;
        return; // 不拦截，交由节点相关插件
      }
    }
    if (this.dragging) {
      const edge = this.engine.graph.getEdge(this.dragging.edgeId);
      if (edge && edge.points) {
        const mid = [...edge.points];
        const i = this.dragging.index;
        if (i >= 0 && i < mid.length) {
          mid[i] = { x: world.x, y: world.y };
          edge.points = mid;
          this.engine.graph.markDirty(); // 确保拖动过程中实时重绘边
          this.engine.events.emit("graph:change", { reason: "edge-drag-point" });
        }
      }
      e.preventDefault();
      return;
    }

    if (this.draggingOrthogonalSegment) {
      const { edgeId, iStart, iEnd, startPoints, startMouse, direction } = this.draggingOrthogonalSegment;
      const edge = this.engine.graph.getEdge(edgeId);
      if (edge) {
        let dx = world.x - startMouse.x;
        let dy = world.y - startMouse.y;

        // 约束检查：首尾段长度保持至少 20px
        const applyConstraint = (currentVal: number, anchorVal: number, min: number) => {
          if (Math.abs(currentVal - anchorVal) < min) {
            return currentVal > anchorVal ? anchorVal + min : anchorVal - min;
          }
          return currentVal;
        };

        // 约束 1: 若本次拖动的逻辑段起点紧邻首段 (iStart=1)，则第一段长度不能小于 20
        if (iStart === 1) {
          const p0 = startPoints[0];
          const p1 = startPoints[1];
          if (direction === "vertical") {
            const targetY = p1.y + dy;
            const constrainedY = applyConstraint(targetY, p0.y, 20);
            dy = constrainedY - p1.y;
          } else {
            const targetX = p1.x + dx;
            const constrainedX = applyConstraint(targetX, p0.x, 20);
            dx = constrainedX - p1.x;
          }
        }

        // 约束 2: 若本次拖动的逻辑段终点紧邻尾段 (iEnd=len-2)，则最后一段长度不能小于 20
        if (iEnd === startPoints.length - 2) {
          const pn = startPoints[startPoints.length - 2];
          const end = startPoints[startPoints.length - 1];
          if (direction === "vertical") {
            const targetY = pn.y + dy;
            const constrainedY = applyConstraint(targetY, end.y, 20);
            dy = constrainedY - pn.y;
          } else {
            const targetX = pn.x + dx;
            const constrainedX = applyConstraint(targetX, end.x, 20);
            dx = constrainedX - pn.x;
          }
        }

        // 复制一份新的点
        const newPts = startPoints.map((p) => ({ ...p }));

        if (direction === "vertical") {
          // 垂直移动 (修改 y)：移动整个逻辑直线段
          for (let k = iStart; k <= iEnd; k++) newPts[k].y += dy;
        } else {
          // 水平移动 (修改 x)
          for (let k = iStart; k <= iEnd; k++) newPts[k].x += dx;
        }

        // 更新 edge.points (去掉首尾)
        edge.points = newPts.slice(1, -1);
        (edge.data as any)._orthogonalManual = true;

        this.engine.graph.markDirty();
        this.engine.events.emit("graph:change", { reason: "edge-drag-segment" });
      }
      e.preventDefault();
      return;
    }

    if (this.draggingEndpoint) {
      // 更新预览端点位置
      this.draggingEndpoint.pt = { x: world.x, y: world.y };
      const c = this.engine.canvas;
      c.style.cursor = "grabbing";
      // demand-render mode: endpoint preview is transient and must request repaint
      this.engine.requestRender();
      // 允许事件继续冒泡，这样 PortOverlayPlugin 等仍可根据鼠标位置显示锚点/高亮
      e.preventDefault();
      return;
    }

    // 检查是否有选中的节点，如果有则不设置边端点的鼠标样式（避免与尺寸调整句柄冲突）
    const hasSelectedNode = this.engine.graph.getNodes().some((n) => n.selected);

    // hover feedback
    // this.hovered = this.hitTest(world, false); // 已提前执行
    const c = this.engine.canvas;

    const edge = this.hovered ? this.engine.graph.getEdge(this.hovered.edgeId) : null;
    const canEdit = interactionConfig.enableDrag && interactionConfig.enableResize && edge?.data?.resizable !== false;

    if (this.hoveredOrthogonalSegment) {
      // 根据逻辑段方向显示不同的鼠标样式（仅中段句柄）
      const dir = this.hoveredOrthogonalSegment.direction;
      c.style.cursor = dir === "horizontal" ? "ns-resize" : "ew-resize";
    } else if (this.hovered?.kind === "segment") c.style.cursor = canEdit ? "pointer" : "default";
    else if (this.hovered?.kind === "vertex") c.style.cursor = canEdit ? "move" : "default";
    // 当有节点选中时，不显示端点调整的鼠标样式（调整图形尺寸优先）
    else if (!hasSelectedNode && (this.hovered?.kind === "source" || this.hovered?.kind === "target"))
      c.style.cursor = canEdit ? "alias" : "default";
    else c.style.cursor = "default";
    // 命中任何边句柄时，拦截事件，避免节点/选择插件改变指针或开始交互
    // 但如果有节点选中且命中的是端点，则不拦截（让 ResizeRotatePlugin 处理）
    if (this.hovered && !(hasSelectedNode && (this.hovered.kind === "source" || this.hovered.kind === "target"))) {
      e.stopPropagation();
    }

    // demand-render mode: hover feedback (handles/highlight) needs explicit repaint
    const nextHoveredKey = this.hovered ? `${this.hovered.edgeId}:${this.hovered.kind}:${(this.hovered as any).index ?? -1}` : "";
    const nextOrthoKey = this.hoveredOrthogonalSegment
      ? `${this.hoveredOrthogonalSegment.edgeId}:${this.hoveredOrthogonalSegment.iStart}-${this.hoveredOrthogonalSegment.iEnd}`
      : "";
    if (nextHoveredKey !== prevHoveredKey || nextOrthoKey !== prevOrthoKey) {
      this.engine.requestRender();
    }
  };

  private onMouseUp = () => {
    // 顶点拖动结束 -> 写入历史
    if (this.dragging) {
      const { edgeId } = this.dragging;
      const edge = this.engine.graph.getEdge(edgeId);
      if (edge) {
        const prev = this.startPointsSnapshot ? this.startPointsSnapshot.map((p) => ({ x: p.x, y: p.y })) : undefined;
        const next = edge.points ? edge.points.map((p) => ({ x: p.x, y: p.y })) : undefined;
        if (JSON.stringify(prev) !== JSON.stringify(next)) {
          this.engine.history.execute(new SetEdgePointsCommand(this.engine.graph, edge.id, prev, next), {
            merge: true,
            mergeKey: `edge-drag-${edge.id}`,
            mergeWindowMs: 500,
            label: "Edit Edge Points",
          });
        }
      }
      this.dragging = null;
      this.startPointsSnapshot = undefined;
    }

    // 正交边段拖动结束
    if (this.draggingOrthogonalSegment) {
      const { edgeId, startPoints } = this.draggingOrthogonalSegment;
      const edge = this.engine.graph.getEdge(edgeId);
      if (edge) {
        // 记录历史
        const prev = startPoints.slice(1, -1);
        let next = edge.points ? edge.points.map((p) => ({ x: p.x, y: p.y })) : undefined;
        // 收尾优化：同一直线上超过2个拐点时，仅保留两端点（避免重叠/冗余）
        if (next && next.length > 0) {
          const withEnds = [startPoints[0], ...next, startPoints[startPoints.length - 1]];
          const simplified = this.simplifyCollinear(withEnds);
          next = simplified.slice(1, -1);
          edge.points = next;
        }
        if (JSON.stringify(prev) !== JSON.stringify(next)) {
          this.engine.history.execute(new SetEdgePointsCommand(this.engine.graph, edge.id, prev, next), {
            merge: true,
            mergeKey: `edge-drag-ortho-${edge.id}`,
            mergeWindowMs: 500,
            label: "Edit Orthogonal Edge",
          });
        }
      }
      this.draggingOrthogonalSegment = null;
    }

    // 端点拖动结束：吸附到全局最近的锚点（可跨节点）
    if (this.draggingEndpoint) {
      const { edgeId, kind, pt } = this.draggingEndpoint;
      const edge = this.engine.graph.getEdge(edgeId);
      if (edge) {
        const nearest = this.getGlobalNearestPort(pt);
        if (nearest) {
          // disallow node self-loop regardless of ports
          const prev = {
            source: edge.source,
            target: edge.target,
            sourcePortId: edge.sourcePortId,
            targetPortId: edge.targetPortId,
          };
          if (kind === "source") {
            const sameNode = nearest.nodeId === edge.target;
            if (!sameNode) {
              const next = { ...prev, source: nearest.nodeId, sourcePortId: nearest.portId };
              this.engine.history.execute(new ReconnectEdgeCommand(this.engine.graph, edge.id, prev, next), {
                merge: true,
                mergeKey: `edge-reconnect-${edge.id}`,
                mergeWindowMs: 800,
                label: "Reconnect Edge",
              });
              // 端点重连后：正交边清除手动点，避免旧拐点未随端点移动导致重叠
              if (edge.shape === "edge-orthogonal") {
                edge.points = [];
                if ((edge.data as any)._orthogonalManual) delete (edge.data as any)._orthogonalManual;
                this.engine.graph.markDirty();
                this.engine.events.emit("graph:change", { reason: "edge-reconnect-reset-orthogonal" });
              }
            }
          } else {
            const sameNode = nearest.nodeId === edge.source;
            if (!sameNode) {
              const next = { ...prev, target: nearest.nodeId, targetPortId: nearest.portId };
              this.engine.history.execute(new ReconnectEdgeCommand(this.engine.graph, edge.id, prev, next), {
                merge: true,
                mergeKey: `edge-reconnect-${edge.id}`,
                mergeWindowMs: 800,
                label: "Reconnect Edge",
              });
              // 端点重连后：正交边清除手动点，避免旧拐点未随端点移动导致重叠
              if (edge.shape === "edge-orthogonal") {
                edge.points = [];
                if ((edge.data as any)._orthogonalManual) delete (edge.data as any)._orthogonalManual;
                this.engine.graph.markDirty();
                this.engine.events.emit("graph:change", { reason: "edge-reconnect-reset-orthogonal" });
              }
            }
          }
        }
      }
      this.draggingEndpoint = null;
      // 恢复指针
      this.engine.canvas.style.cursor = "default";
      // clear ghost preview in demand-render mode
      this.engine.requestRender();
    }
  };

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const interactionConfig = this.engine.getInteractionConfig();
    if (!interactionConfig.enableSelection) return;

    const touch = e.touches[0];
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const hit = this.hitTest(world, true);
    const nodeHit = hitTestNodes(world, this.engine.graph.getNodes(), {
      scale: this.engine.getScale(),
      pixelThresholdPx: 14,
    });
    if (nodeHit) {
      // 触摸端优先级与鼠标一致：当命中边的句柄时（端点/正交中段句柄/折线拐点/正交段），不让节点拦截
      const isSelectedEndpoint = !!(
        hit &&
        (hit.kind === "source" || hit.kind === "target") &&
        this.engine.graph.getEdge(hit.edgeId)?.selected
      );
      const allowOrthoHandle = !!this.hoveredOrthogonalSegment; // 触摸开始前上一帧已计算；若为空则用命中段兜底
      const allowPolylineVertex = !!(hit && hit.kind === "vertex");
      const allowOrthoSegmentByHit = !!(
        hit &&
        hit.kind === "segment" &&
        this.engine.graph.getEdge(hit.edgeId)?.shape === "edge-orthogonal"
      );
      const allowEdgeHandle = isSelectedEndpoint || allowOrthoHandle || allowPolylineVertex || allowOrthoSegmentByHit;
      if (!allowEdgeHandle) return;
    }

    const hasSelectedNode = this.engine.graph.getNodes().some((n) => n.selected);

    if (!hit) {
      let changed = false;
      for (const ed of this.engine.graph.getEdges()) {
        if (ed.selected) {
          ed.selected = false;
          changed = true;
        }
      }
      this.hovered = null;
      this.dragging = null;
      this.draggingEndpoint = null;
      this.engine.requestRender();
      if (changed) {
        this.engine.graph.markDirty();
        this.engine.events.emit("graph:change", { reason: "edge-selection-cleared" });
        this.emitSelectionChanged("edge-selection-cleared");
      }
      return;
    }

    const edge = this.engine.graph.getEdge(hit.edgeId);
    if (!edge) return;
    // 选择该边：保持节点与边的互斥选中
    for (const other of this.engine.graph.getEdges()) other.selected = false;
    for (const n of this.engine.graph.getNodes()) n.selected = false;
    edge.selected = true;
    this.engine.graph.markDirty();
    this.engine.events.emit("graph:change", { reason: "edge-selection" });
    this.emitSelectionChanged("edge-click");
    // 触发边点击事件
    this.engine.events.emit("edge:click", { edgeId: edge.id, event: e });

    // 阻止事件传播，防止 SelectionOverlayPlugin 清除选中状态
    e.stopPropagation();

    // 阻止默认行为，防止触发模拟鼠标事件导致 SelectionOverlayPlugin 误清除选择
    if (e.cancelable) e.preventDefault();

    // 检查是否允许编辑
    const canEdit = interactionConfig.enableDrag && interactionConfig.enableResize && edge.data?.resizable !== false;
    if (!canEdit) return;

    // 移动端不支持组合键新增/删除点，先支持拖动顶点与端点重连与正交中段拖拽
    if (hit.kind === "vertex" && hit.index != null) {
      this.dragging = { edgeId: edge.id, index: hit.index };
      this.startPointsSnapshot = edge.points ? edge.points.map((p) => ({ x: p.x, y: p.y })) : undefined;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // 正交中段：基于句柄位置检测并启用拖拽
    if (edge.shape === "edge-orthogonal") {
      const scale = this.engine.getScale();
      const hsWorld = this.options.handleSize / Math.max(0.0001, scale);
      const pts = buildOrthogonalPathPoints(edge, this.engine.graph);
      const runs = this.computeOrthogonalRuns(pts);
      // 近邻检测（使用与鼠标相同的阈值）
      const threshold = this.options.handleSize / scale / 2 + 6 / scale;
      for (const run of runs) {
        const mid = this.getRunHandlePos(pts, run, hsWorld);
        if (Math.abs(mid.x - world.x) < threshold && Math.abs(mid.y - world.y) < threshold) {
          const dragDirection = run.dir === "horizontal" ? "vertical" : "horizontal";
          this.draggingOrthogonalSegment = {
            edgeId: edge.id,
            iStart: run.iStart,
            iEnd: run.iEnd,
            startPoints: pts,
            startMouse: world,
            direction: dragDirection,
          };
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
    }
    if ((hit.kind === "source" || hit.kind === "target") && !hasSelectedNode) {
      this.draggingEndpoint = { edgeId: edge.id, kind: hit.kind, pt: { x: world.x, y: world.y } };
      this.engine.requestRender();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    const world = this.engine.toWorld(screen);

    if (this.dragging) {
      const edge = this.engine.graph.getEdge(this.dragging.edgeId);
      if (edge && edge.points) {
        const mid = [...edge.points];
        const i = this.dragging.index;
        if (i >= 0 && i < mid.length) {
          mid[i] = { x: world.x, y: world.y };
          edge.points = mid;
          this.engine.graph.markDirty();
          this.engine.events.emit("graph:change", { reason: "edge-drag-point" });
        }
      }
      e.preventDefault();
      return;
    }
    if (this.draggingEndpoint) {
      this.draggingEndpoint.pt = { x: world.x, y: world.y };
      this.engine.canvas.style.cursor = "grabbing";
      e.preventDefault();
      return;
    }
    // 正交中段拖拽（移动端）
    if (this.draggingOrthogonalSegment) {
      const { edgeId, iStart, iEnd, startPoints, startMouse, direction } = this.draggingOrthogonalSegment;
      const edge = this.engine.graph.getEdge(edgeId);
      if (edge) {
        let dx = world.x - startMouse.x;
        let dy = world.y - startMouse.y;
        const applyConstraint = (currentVal: number, anchorVal: number, min: number) => {
          if (Math.abs(currentVal - anchorVal) < min) {
            return currentVal > anchorVal ? anchorVal + min : anchorVal - min;
          }
          return currentVal;
        };
        if (iStart === 1) {
          const p0 = startPoints[0];
          const p1 = startPoints[1];
          if (direction === "vertical") {
            const targetY = p1.y + dy;
            const constrainedY = applyConstraint(targetY, p0.y, 20);
            dy = constrainedY - p1.y;
          } else {
            const targetX = p1.x + dx;
            const constrainedX = applyConstraint(targetX, p0.x, 20);
            dx = constrainedX - p1.x;
          }
        }
        if (iEnd === startPoints.length - 2) {
          const pn = startPoints[startPoints.length - 2];
          const end = startPoints[startPoints.length - 1];
          if (direction === "vertical") {
            const targetY = pn.y + dy;
            const constrainedY = applyConstraint(targetY, end.y, 20);
            dy = constrainedY - pn.y;
          } else {
            const targetX = pn.x + dx;
            const constrainedX = applyConstraint(targetX, end.x, 20);
            dx = constrainedX - pn.x;
          }
        }
        const newPts = startPoints.map((p) => ({ ...p }));
        if (direction === "vertical") {
          for (let k = iStart; k <= iEnd; k++) newPts[k].y += dy;
        } else {
          for (let k = iStart; k <= iEnd; k++) newPts[k].x += dx;
        }
        edge.points = newPts.slice(1, -1);
        (edge.data as any)._orthogonalManual = true;
        this.engine.graph.markDirty();
        this.engine.events.emit("graph:change", { reason: "edge-drag-segment-touch" });
      }
      e.preventDefault();
      return;
    }
    // 移动端不做 hover 高亮（避免抖动），可后续加长按显示
  };

  private onTouchEnd = (_e: TouchEvent) => {
    this.onMouseUp();
  };

  // 在所有节点中找到距离世界坐标最近的端口
  private getGlobalNearestPort(world: Point): { nodeId: string; portId: string } | null {
    let best: { nodeId: string; portId: string; d2: number } | null = null;
    for (const node of this.engine.graph.getNodes()) {
      if (!node.ports || node.ports.length === 0) continue;
      const p = getNearestPort(node, world);
      if (!p) continue;
      const wp = getPortWorldPosition(node, p.id);
      if (!wp) continue;
      const dx = wp.x - world.x;
      const dy = wp.y - world.y;
      const d2 = dx * dx + dy * dy;
      if (!best || d2 < best.d2) best = { nodeId: node.id, portId: p.id, d2 };
    }
    return best ? { nodeId: best.nodeId, portId: best.portId } : null;
  }

  // 共线精简：三点同 x 或同 y 时移除中间点，保留两端
  private simplifyCollinear(pts: Point[]): Point[] {
    if (pts.length <= 2) return pts;
    const out: Point[] = [];
    const tol = 5 / Math.max(0.0001, this.engine.getScale());
    let i = 0;
    while (i < pts.length) {
      const startPt = pts[i];
      out.push({ x: startPt.x, y: startPt.y });
      const j = i + 1;
      if (j >= pts.length) break;
      if (j >= pts.length - 1) {
        // 最后一个直接入栈
        out.push({ x: pts[j].x, y: pts[j].y });
        break;
      }
      // 判断走向（近似垂直或水平）
      const isVert = Math.abs(pts[i].x - pts[j].x) <= tol;
      const isHori = Math.abs(pts[i].y - pts[j].y) <= tol;
      let k = j;
      if (isVert || isHori) {
        // 扫描近似共线 run
        while (k + 1 < pts.length) {
          const p = pts[k];
          const q = pts[k + 1];
          const nearCol = isVert
            ? Math.abs(p.x - q.x) <= tol && Math.abs(p.x - pts[i].x) <= tol
            : Math.abs(p.y - q.y) <= tol && Math.abs(p.y - pts[i].y) <= tol;
          if (!nearCol) break;
          k++;
        }
        // 将该 run 对齐到统一坐标并只保留末端
        const endPt = pts[k];
        if (isVert) {
          const xRef = pts[i].x; // 统一到起始的 x
          out[out.length - 1].x = xRef;
          const alignedEnd = { x: xRef, y: endPt.y };
          out.push(alignedEnd);
        } else {
          const yRef = pts[i].y; // 统一到起始的 y
          out[out.length - 1].y = yRef;
          const alignedEnd = { x: endPt.x, y: yRef };
          out.push(alignedEnd);
        }
        i = k;
        continue;
      }
      // 非近似共线，推进一个点
      i = j;
    }
    // 去重
    const dedup: Point[] = [];
    for (const p of out) {
      const last = dedup[dedup.length - 1];
      if (!last || last.x !== p.x || last.y !== p.y) dedup.push(p);
    }
    return dedup;
  }

  afterRender(ctx: CanvasRenderingContext2D): void {
    const edges = this.engine.graph.getEdges();
    const { handleSize, handleColor, handleHoverColor } = this.options;
    const { x: tx, y: ty } = this.engine.getTranslation();
    const scale = this.engine.getScale();
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);
    for (const e of edges) {
      if (!e.selected) continue;
      // 检查是否允许调整尺寸（若不允许，则不绘制句柄）
      const interactionConfig = this.engine.getInteractionConfig();
      const canEdit = interactionConfig.enableResize && e.data?.resizable !== false;
      // 即使不可编辑，也需要绘制选中样式（句柄），只是不响应交互
      // if (!canEdit) continue;

      const pts = this.getPolylinePoints(e);
      const endpoints = this.getEdgeEndpoints(e);
      if (!endpoints) continue;

      // 端点拖动预览：折线用替换首/末点绘制路径；其他类型用直线预览
      if (this.draggingEndpoint && this.draggingEndpoint.edgeId === e.id) {
        ctx.save();
        ctx.strokeStyle = "rgba(37, 99, 235, 0.7)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        if (pts) {
          const ghost = [...pts];
          if (this.draggingEndpoint.kind === "source") ghost[0] = this.draggingEndpoint.pt;
          else ghost[ghost.length - 1] = this.draggingEndpoint.pt;
          ctx.moveTo(ghost[0].x, ghost[0].y);
          for (let i = 1; i < ghost.length; i++) ctx.lineTo(ghost[i].x, ghost[i].y);
        } else {
          const a = this.draggingEndpoint.kind === "source" ? this.draggingEndpoint.pt : endpoints.start;
          const b = this.draggingEndpoint.kind === "target" ? this.draggingEndpoint.pt : endpoints.end;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
        ctx.restore();
      }
      const hs = handleSize / Math.max(0.0001, scale);
      const half = hs / 2;
      // draw vertices (polyline only)
      if (pts) {
        for (let i = 1; i < pts.length - 1; i++) {
          const p = pts[i];
          const hover =
            canEdit &&
            this.hovered &&
            this.hovered.edgeId === e.id &&
            this.hovered.kind === "vertex" &&
            this.hovered.index === i - 1;
          ctx.fillStyle = hover ? handleHoverColor : handleColor;
          ctx.fillRect(p.x - half, p.y - half, hs, hs);
        }
      }
      // draw endpoints handles (all edge types)
      const ends: Array<{ p: Point; kind: "source" | "target" }> = [
        { p: endpoints.start, kind: "source" },
        { p: endpoints.end, kind: "target" },
      ];
      for (const it of ends) {
        const hover = canEdit && this.hovered && this.hovered.edgeId === e.id && this.hovered.kind === it.kind;
        ctx.beginPath();
        ctx.arc(it.p.x, it.p.y, half, 0, Math.PI * 2);
        ctx.fillStyle = hover ? handleHoverColor : handleColor;
        ctx.fill();
        ctx.stroke();
      }

      // 绘制正交线段的拖拽手柄
      if (e.shape === "edge-orthogonal") {
        // hs 已是世界坐标下的句柄尺寸，避免再次按缩放系数缩小
        this.renderOrthogonalHandles(ctx, e, hs, handleColor, handleHoverColor);
      }
    }
    ctx.restore();
  }

  private renderOrthogonalHandles(
    ctx: CanvasRenderingContext2D,
    edge: EdgeData,
    hs: number,
    color: string,
    hoverColor: string,
  ) {
    const pts = buildOrthogonalPathPoints(edge, this.engine.graph);
    // 需要至少 [a, a1, ..., b1, b]，中间段范围为 1..len-3
    if (pts.length < 4) return;
    const runs = this.computeOrthogonalRuns(pts);
    const onlyRunStart =
      this.draggingOrthogonalSegment && this.draggingOrthogonalSegment.edgeId === edge.id
        ? this.draggingOrthogonalSegment.iStart
        : null;
    for (const run of runs) {
      if (onlyRunStart != null && run.iStart !== onlyRunStart) continue; // 拖拽时仅显示当前句柄
      // 传入 hs（世界单位）直接用于安全边距计算，避免双重缩放导致位置漂移
      const mid = this.getRunHandlePos(pts, run, hs);
      const isHover =
        this.hoveredOrthogonalSegment &&
        this.hoveredOrthogonalSegment.edgeId === edge.id &&
        this.hoveredOrthogonalSegment.iStart === run.iStart;
      ctx.fillStyle = isHover ? hoverColor : color;
      ctx.beginPath();
      ctx.arc(mid.x, mid.y, hs / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1 / this.engine.getScale();
      ctx.stroke();
    }
  }
}
