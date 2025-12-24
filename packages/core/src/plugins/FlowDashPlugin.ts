/*
 * @Description: 让开启 flow 的边产生虚线流动效果（推进 lineDashOffset）
 * @Author: qingzi.wang
 * @Date: 2025-09-17 20:29:30
 * @LastEditTime: 2025-09-26 10:56:22
 */

import type { CanvasEngine } from "../core/CanvasEngine";
import type { Plugin } from "./Plugin";

export interface FlowDashPluginOptions {
  defaultDash?: number[]; // 当未指定 dash 时的默认虚线样式
  defaultSpeed?: number; // px/s
}

export class FlowDashPlugin implements Plugin {
  readonly id = "flow-dash";
  private engine!: CanvasEngine;
  private startTime: number | null = null;
  private options: Required<FlowDashPluginOptions>;

  constructor(opts: FlowDashPluginOptions = {}) {
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

    for (const e of this.engine.graph.getEdges()) {
      const style: any = e.data?.style;
      if (!style) continue;
      // prefer style.flow; fallback to pipeline.flow for compatibility
      const flow = style.flow ?? style.pipeline?.flow;
      if (!flow || !flow.enabled) continue;
      // unify dash resolution: style.lineDash -> plugin default
      const dash: number[] = style.lineDash ?? this.options.defaultDash;
      if (!dash || dash.length === 0) continue;
      const period = dash.reduce((a, b) => a + Math.max(0, b), 0) || 1;
      const speed = typeof flow.speed === "number" ? flow.speed : this.options.defaultSpeed;
      const phase = typeof flow._phase === "number" ? flow._phase : 0;
      const direction = flow.direction || "forward";
      let offset = -((((elapsed * speed + phase) % period) + period) % period);

      // 根据方向调整偏移
      if (direction === "reverse") {
        offset = -offset;
      } else if (direction === "both") {
        // 双向流动：使用正弦波产生往复效果
        const cycle = ((elapsed * speed) / period) % 2;
        offset = cycle < 1 ? offset : -offset;
      }

      flow._offset = offset;
    }
  }
}
