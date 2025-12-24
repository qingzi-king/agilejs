/*
 * @Description: 边标签相关工具
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-17 19:47:06
 */
import { EdgeData, Graph, Point } from "../model/Graph";
import { getPortWorldPosition } from "./ports";
import { buildOrthogonalPathPoints } from "./orthogonal";

function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function nodeCenter(graph: Graph, id: string): Point | undefined {
  const n = graph.getNode(id);
  if (!n) return undefined;
  return { x: n.position.x + n.size.width / 2, y: n.position.y + n.size.height / 2 };
}

export function edgeLabelPositionStraight(edge: EdgeData, graph: Graph): Point | undefined {
  const a = edge.sourcePortId
    ? getPortWorldPosition(graph.getNode(edge.source)!, edge.sourcePortId)
    : nodeCenter(graph, edge.source);
  const b = edge.targetPortId
    ? getPortWorldPosition(graph.getNode(edge.target)!, edge.targetPortId)
    : nodeCenter(graph, edge.target);
  if (!a || !b) return undefined;
  return mid(a, b);
}

export function edgeLabelPositionBezier(edge: EdgeData, graph: Graph): Point | undefined {
  // 近似使用端点中点
  return edgeLabelPositionStraight(edge, graph);
}

export function edgeLabelPositionOrthogonal(edge: EdgeData, graph: Graph): Point | undefined {
  const pts = buildOrthogonalPathPoints(edge, graph);
  if (pts.length < 2) return undefined;
  // 按路径长度找 50% 处
  let total = 0;
  const segLen: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLen.push(d);
    total += d;
  }
  if (total === 0) return pts[0];
  let target = total / 2;
  for (let i = 0; i < segLen.length; i++) {
    if (target <= segLen[i]) {
      const t = target / segLen[i];
      return { x: pts[i].x + t * (pts[i + 1].x - pts[i].x), y: pts[i].y + t * (pts[i + 1].y - pts[i].y) };
    }
    target -= segLen[i];
  }
  return pts[pts.length - 1];
}

export function edgeLabelPositionPolyline(edge: EdgeData, graph: Graph): Point | undefined {
  const a = edge.sourcePortId
    ? getPortWorldPosition(graph.getNode(edge.source)!, edge.sourcePortId)
    : nodeCenter(graph, edge.source);
  const b = edge.targetPortId
    ? getPortWorldPosition(graph.getNode(edge.target)!, edge.targetPortId)
    : nodeCenter(graph, edge.target);
  if (!a || !b) return undefined;
  const pts: Point[] = [a, ...(edge.points ?? []), b];
  if (pts.length < 2) return undefined;
  // 计算总长度
  let total = 0;
  const segLen: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const d = Math.hypot(dx, dy);
    segLen.push(d);
    total += d;
  }
  if (total === 0) return pts[0];
  let target = total / 2;
  for (let i = 0; i < segLen.length; i++) {
    if (target <= segLen[i]) {
      const t = target / segLen[i];
      return {
        x: pts[i].x + t * (pts[i + 1].x - pts[i].x),
        y: pts[i].y + t * (pts[i + 1].y - pts[i].y),
      };
    }
    target -= segLen[i];
  }
  return pts[pts.length - 1];
}
