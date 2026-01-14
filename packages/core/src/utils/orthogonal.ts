/*
 * @Description: 正交边路径构建
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-17 19:42:13
 */
import { EdgeData, Graph, Point } from "../model/Graph";
import { getDeviceDpr } from "./dpr";
import { getPortWorldPosition } from "./ports";

function nodeCenter(graph: Graph, id: string): Point | undefined {
  const n = graph.getNode(id);
  if (!n) return undefined;
  return { x: n.position.x + n.size.width / 2, y: n.position.y + n.size.height / 2 };
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

function inferPortNormal(node: any, portId?: string): Point | null {
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

/**
 * 构建正交边折点序列（含 pipeline stub 与自避让）。
 * 若无 pipeline，返回简单曼哈顿路径。
 * 返回的数组包含端点在首尾。
 */
function buildOrthogonalPathPointsLegacy(edge: EdgeData, graph: Graph): Point[] {
  const src = graph.getNode(edge.source);
  const tgt = graph.getNode(edge.target);
  if (!src || !tgt) return [];
  const a = edge.sourcePortId ? getPortWorldPosition(src, edge.sourcePortId) : nodeCenter(graph, edge.source);
  const b = edge.targetPortId ? getPortWorldPosition(tgt, edge.targetPortId) : nodeCenter(graph, edge.target);
  if (!a || !b) return [];
  // 局部默认：以 DPR 近似换算到世界单位，避免引用未定义的 options
  const dpr = getDeviceDpr();
  const stubWorld = 20 * (1 / dpr);
  const tolWorld = 5 * (1 / dpr);
  // 手动正交：保留两端 stub，并将首末手动点沿 stub 轴向对齐，避免出现斜线
  if ((edge as any).data?._orthogonalManual && Array.isArray(edge.points) && edge.points.length > 0) {
    const style = (edge.data?.style as any) || {};
    const pipelineConf = (style.pipeline || { stub: 20 }) as { stub?: number };
    const stubLen = Math.max(stubWorld, pipelineConf.stub ?? stubWorld);

    const manual = (edge.points as Point[]).map((p) => ({ x: p.x, y: p.y }));
    const first = { ...manual[0] };
    const last = { ...manual[manual.length - 1] };

    const nA =
      inferPortNormal(src, edge.sourcePortId) ??
      (() => {
        const dx = first.x - a.x,
          dy = first.y - a.y;
        return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
      })();
    const nB =
      inferPortNormal(tgt, edge.targetPortId) ??
      (() => {
        const dx = last.x - b.x,
          dy = last.y - b.y;
        return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
      })();

    const a1 = { x: a.x + nA.x * stubLen, y: a.y + nA.y * stubLen };
    const b1 = { x: b.x + nB.x * stubLen, y: b.y + nB.y * stubLen };

    // 轴向对齐：保证 a1->first 与 last->b1 为纯水平或纯垂直
    if (nA.x !== 0) first.y = a1.y;
    else first.x = a1.x;
    if (nB.x !== 0) last.y = b1.y;
    else last.x = b1.x;

    if (manual.length === 1) {
      const out = [a, a1, first, b1, b];
      return simplifyCollinear(out, tolWorld);
    } else {
      // 对所有中间手动点进行轴对齐，确保每段为水平或垂直
      const mids = manual.slice(1, -1);
      const aligned: Point[] = [];
      let prev = first;
      for (const m of mids) {
        const cand1 = { x: m.x, y: prev.y }; // 水平段后转垂直
        const cand2 = { x: prev.x, y: m.y }; // 垂直段后转水平
        const d1 = Math.hypot(cand1.x - m.x, cand1.y - m.y);
        const d2 = Math.hypot(cand2.x - m.x, cand2.y - m.y);
        const pick = d1 <= d2 ? cand1 : cand2;
        aligned.push(pick);
        prev = pick;
      }
      // 末点与 b1 轴向对齐，并确保 prev->last 为正交
      let lastAligned: Point;
      if (nB.x !== 0) {
        // 末段水平到 b1：保证 prev->last 垂直
        lastAligned = { x: prev.x, y: last.y };
      } else {
        // 末段垂直到 b1：保证 prev->last 水平
        lastAligned = { x: last.x, y: prev.y };
      }
      const out = [a, a1, first, ...aligned, lastAligned, b1, b];
      return simplifyCollinear(out, tolWorld);
    }
  }

  const style = (edge.data?.style as any) || {};
  // 即使是普通正交线，也默认启用 stub 逻辑（虚拟拐点），默认 20px
  const pipeline = (style.pipeline || { stub: 20 }) as {
    outerWidth?: number;
    innerWidth?: number;
    gap?: number;
    cornerRadius?: number;
    stub?: number;
    clearance?: number;
    avoidSelfMargin?: number;
  };
  let ptsBase = manhattanPath(a, b);
  if (ptsBase.length < 2) return ptsBase;

  const outerW = pipeline.outerWidth ?? 6;
  const stub =
    typeof (pipeline as any).stub === "number"
      ? Math.max(1, (pipeline as any).stub)
      : typeof (pipeline as any).clearance === "number"
        ? Math.max(1, (pipeline as any).clearance)
        : Math.max(3, outerW / 2);
  const nA =
    inferPortNormal(src, edge.sourcePortId) ??
    (() => {
      const dx = b.x - a.x,
        dy = b.y - a.y;
      return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
    })();
  const nB =
    inferPortNormal(tgt, edge.targetPortId) ??
    (() => {
      const dx = a.x - b.x,
        dy = a.y - b.y;
      return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
    })();
  const a1 = { x: a.x + nA.x * stub, y: a.y + nA.y * stub };
  const b1 = { x: b.x + nB.x * stub, y: b.y + nB.y * stub };
  let midPath = manhattanPath(a1, b1);
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
    return simplifyCollinear([a, a1, ...midPath.slice(1, -1), b1, b], tolWorld);
  }
  return simplifyCollinear(ptsBase, tolWorld);
}

export function buildOrthogonalPathPoints(edge: EdgeData, graph: Graph): Point[] {
  const built = buildOrthogonalPath(edge, graph);
  return built.pts;
}

// 统一构建管线：基于旧版逻辑先返回 pts，并推断 a1/b1 索引
export interface OrthogonalBuildOptions {
  stubPx?: number;
  mergeTolerancePx?: number;
}

export function buildOrthogonalPath(
  edge: EdgeData,
  graph: Graph,
  _options: OrthogonalBuildOptions = {},
): { pts: Point[]; a1Index: number; b1Index: number } {
  // 使用旧版构建（legacy）生成路径点
  const pts = buildOrthogonalPathPointsLegacy(edge, graph);
  // 推断 a1/b1 索引：当包含 stub 时为 1 与 len-2，否则做保护性回退
  const a1Index = pts.length >= 4 ? 1 : Math.min(1, Math.max(0, pts.length - 2));
  const b1Index = pts.length >= 4 ? pts.length - 2 : Math.max(pts.length - 2, 0);
  return { pts, a1Index, b1Index };
}

// 将共线的中间点精简（超过2个拐点在同一直线时只保留两端点）
function simplifyCollinear(pts: Point[], tolWorld = 0): Point[] {
  if (pts.length <= 2) return pts;
  const out: Point[] = [];
  let i = 0;
  while (i < pts.length) {
    const start = pts[i];
    out.push(start);
    const j = i + 1;
    if (j >= pts.length - 1) {
      // 倒数第二或最后一个直接推入并结束
      if (j < pts.length) out.push(pts[j]);
      break;
    }
    // 扫描共线 run：[i..k]
    let k = j;
    const axisX = Math.abs(pts[i].x - pts[j].x) <= tolWorld;
    const axisY = Math.abs(pts[i].y - pts[j].y) <= tolWorld;
    while (
      k + 1 < pts.length &&
      ((axisX && Math.abs(pts[k].x - pts[k + 1].x) <= tolWorld) ||
        (axisY && Math.abs(pts[k].y - pts[k + 1].y) <= tolWorld))
    ) {
      k++;
    }
    if (k === j) {
      // 非共线，正常推进
      i = j;
      continue;
    }
    // 共线段：保留该 run 的末端点（避免一条直线上超过2个拐点），跳过中间
    const endOfRun = pts[k];
    // 替换刚刚推入的 start（已在 out）与 endOfRun 之间的中间点为只保留 endOfRun
    out.push(endOfRun);
    i = k;
  }
  // 去重：可能因为末尾处理导致连续重复点
  const dedup: Point[] = [];
  for (const p of out) {
    const last = dedup[dedup.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) dedup.push(p);
  }
  return dedup;
}
