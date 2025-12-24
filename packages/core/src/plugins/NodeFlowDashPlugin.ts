/*
 * @Description: 基础图形（节点）描边虚线流动效果（推进 lineDashOffset）
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import type { Plugin } from "./Plugin";

export interface NodeFlowDashPluginOptions {
  defaultDash?: number[]; // 当未指定 dash 时的默认虚线样式
  defaultSpeed?: number; // px/s
}

/**
 * 节点版流动虚线插件：
 * - 读取 node.data.style.flow 配置：{ enabled, speed, direction, dash? }
 * - 依据 elapsed 推进 flow._offset；引擎在绘制每个节点前会应用该 offset
 * - 方向：'cw'（顺时针，正向）|'ccw'（逆时针，反向）
 */
export class NodeFlowDashPlugin implements Plugin {
  readonly id = "node-flow-dash";
  private engine!: CanvasEngine;
  private startTime: number | null = null;
  private options: Required<NodeFlowDashPluginOptions>;

  constructor(opts: NodeFlowDashPluginOptions = {}) {
    this.options = {
      defaultDash: opts.defaultDash ?? [12, 10],
      defaultSpeed: opts.defaultSpeed ?? 120,
    };
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;
  }

  dispose(): void {
    this.startTime = null;
  }

  beforeRender(): void {
    const time = performance.now();
    if (this.startTime == null) {
      this.startTime = time;
    }
    const elapsed = Math.max(0, (time - this.startTime) / 1000); // s

    for (const n of this.engine.graph.getNodes()) {
      const style: any = n.data?.style;
      if (!style) continue;
      const flow = style.flow;
      if (!flow || !flow.enabled) continue;
      // dash: style.lineDash > default
      const dash: number[] = style.lineDash ?? this.options.defaultDash;
      if (!dash || dash.length === 0) continue;
      const period = dash.reduce((a, b) => a + Math.max(0, b), 0) || 1;
      const speed = typeof flow.speed === "number" ? flow.speed : this.options.defaultSpeed;
      const phase = typeof flow._phase === "number" ? flow._phase : 0;
      const dir = flow.direction || "cw"; // 'cw' | 'ccw'
      let offset = -((((elapsed * speed + phase) % period) + period) % period);
      if (dir === "ccw") offset = -offset; // 逆时针：反向偏移
      flow._offset = offset;
    }
  }
}
