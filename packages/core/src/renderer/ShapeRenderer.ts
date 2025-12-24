/*
 * @Description: 形状渲染器接口
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-17 19:44:58
 */
import { Graph, NodeData, EdgeData } from "../model/Graph";

export interface ShapeRenderer {
  readonly shape: string;
  renderNode(ctx: CanvasRenderingContext2D, node: NodeData, graph: Graph): void;
  renderEdge(ctx: CanvasRenderingContext2D, edge: EdgeData, graph: Graph): void;
}
