/*
 * @Description: 插件接口定义
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-17 19:43:11
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import type { NodeData } from "../model/Graph";

export interface PluginHooks {
  setup?(engine: CanvasEngine): void;
  dispose?(): void;
  beforeRender?(ctx: CanvasRenderingContext2D): void;
  /** 在节点渲染之前、边渲染之后（world transform 内）绘制正交/其它边的标签，以保证被节点遮挡 */
  renderEdgeLabels?(ctx: CanvasRenderingContext2D): void;
  /** 对每个节点，在该节点绘制完成后（world transform 内）绘制与其绑定的标签/文本，使其与节点 zIndex 保持一致 */
  renderNodeLabels?(ctx: CanvasRenderingContext2D, node: NodeData): void;
  afterRender?(ctx: CanvasRenderingContext2D): void;
}

export interface Plugin extends PluginHooks {
  readonly id: string;
}
