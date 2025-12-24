/*
 * @Description: 连接边的端点位置相关工具
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-11-14 10:44:34
 */
import { NodeData, Point, PortData, AnchorPosition } from "../model/Graph";

/**
 * 根据 anchorPosition 计算相对于节点的局部偏移（不含旋转）
 * @param anchorPosition 锚点位置枚举
 * @param width 节点宽度
 * @param height 节点高度
 * @returns 局部坐标偏移
 */
function getAnchorOffset(anchorPosition: AnchorPosition, width: number, height: number): Point {
  const hw = width / 2;
  const hh = height / 2;
  const q = 0.25; // 1/4 位置比例

  switch (anchorPosition) {
    // 边中心点
    case "top":
      return { x: hw, y: 0 };
    case "right":
      return { x: width, y: hh };
    case "bottom":
      return { x: hw, y: height };
    case "left":
      return { x: 0, y: hh };
    case "center":
      return { x: hw, y: hh };
    // 四角（真正的角点）
    case "top-left":
      return { x: 0, y: 0 };
    case "top-right":
      return { x: width, y: 0 };
    case "bottom-left":
      return { x: 0, y: height };
    case "bottom-right":
      return { x: width, y: height };
    // 边上的偏移点（1/4 和 3/4 位置）
    case "left-top":
      return { x: 0, y: height * q }; // 左边 1/4 高度处
    case "left-bottom":
      return { x: 0, y: height * (1 - q) }; // 左边 3/4 高度处
    case "right-top":
      return { x: width, y: height * q }; // 右边 1/4 高度处
    case "right-bottom":
      return { x: width, y: height * (1 - q) }; // 右边 3/4 高度处
    default:
      return { x: hw, y: hh };
  }
}

export function getPortWorldPosition(node: NodeData | undefined, portId: string): Point | undefined {
  if (!node || !node.ports || node.ports.length === 0) return undefined;
  const p = node.ports.find((pt) => pt.id === portId);
  if (!p) return undefined;

  const nx = node.position.x;
  const ny = node.position.y;
  const cx = node.size.width / 2;
  const cy = node.size.height / 2;
  const rot = ((node.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);

  // 计算局部偏移：优先使用相对锚点，否则使用绝对偏移
  let localOffset: Point;
  if (p.anchorMode === "relative" && p.anchorPosition) {
    localOffset = getAnchorOffset(p.anchorPosition, node.size.width, node.size.height);
  } else {
    localOffset = p.offset;
  }

  // 将端口局部坐标绕节点中心旋转
  const lx = localOffset.x - cx;
  const ly = localOffset.y - cy;
  const rx = lx * cos - ly * sin;
  const ry = lx * sin + ly * cos;
  return { x: nx + cx + rx, y: ny + cy + ry };
}

export function getNearestPort(node: NodeData, worldPoint: Point): PortData | undefined {
  if (!node.ports || node.ports.length === 0) return undefined;
  let best: { p: PortData; d: number } | undefined;
  for (const port of node.ports) {
    const wp = getPortWorldPosition(node, port.id);
    if (!wp) continue;
    const dx = worldPoint.x - wp.x;
    const dy = worldPoint.y - wp.y;
    const d = dx * dx + dy * dy;
    if (!best || d < best.d) best = { p: port, d };
  }
  return best?.p;
}
