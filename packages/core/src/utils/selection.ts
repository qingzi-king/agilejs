/*
 * @Description: 选择相关工具
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-17 19:48:06
 */
import { Graph } from "../model/Graph";

export function selectOnly(graph: Graph, nodeIds: string[]): void {
  const set = new Set(nodeIds);
  graph.getNodes().forEach((n) => (n.selected = set.has(n.id)));
}

export function selectAdd(graph: Graph, nodeIds: string[]): void {
  const set = new Set(nodeIds);
  graph.getNodes().forEach((n) => {
    if (set.has(n.id)) n.selected = true;
  });
}

export function selectNone(graph: Graph): void {
  graph.getNodes().forEach((n) => (n.selected = false));
}
