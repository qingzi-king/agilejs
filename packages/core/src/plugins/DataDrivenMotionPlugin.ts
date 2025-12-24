/*
 * @Description: 数据驱动动画插件
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:43
 * @LastEditTime: 2025-12-10 18:10:30
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import { EasingFns } from "../core/Animation";

type Motion = {
  type: "move" | "resize" | "zIndex" | "edge-style";
  to: any;
  duration?: number;
  easing?: keyof typeof EasingFns;
};

export class DataDrivenMotionPlugin implements Plugin {
  readonly id = "data-driven-motion";
  private engine!: CanvasEngine;
  setup(engine: CanvasEngine): void {
    this.engine = engine;
  }

  // 读取 node/edge.data.motion 并触发动画或立即应用
  beforeRender(): void {
    const g = this.engine.graph;
    for (const n of g.getNodes()) {
      const m = n.data?.motion as Motion | Motion[] | undefined;
      if (!m) continue;
      const motions = Array.isArray(m) ? m : [m];
      // 清空，避免每帧重复执行；真实系统可加入版本/队列
      delete (n as any).data.motion;
      for (const mo of motions) {
        const dur = mo.duration ?? 300;
        const easing = EasingFns[mo.easing ?? "easeInOutQuad"];
        if (mo.type === "move") {
          const from = { x: n.position.x, y: n.position.y };
          const to = { x: mo.to.x, y: mo.to.y };
          this.engine.animations.add({
            duration: dur,
            easing,
            onUpdate: (p) => {
              n.position.x = from.x + (to.x - from.x) * p;
              n.position.y = from.y + (to.y - from.y) * p;
              // 位置变更：结构变更（影响边快照、空间索引）
              this.engine.graph.markDirty("structure");
            },
          });
        } else if (mo.type === "resize") {
          const from = { w: n.size.width, h: n.size.height };
          const to = { w: mo.to.width, h: mo.to.height };
          // 记录端口相对比例，确保尺寸动画期间端口随节点尺寸按比例变化
          const rel =
            n.ports && n.ports.length > 0
              ? new Map(
                  n.ports.map((port) => [
                    port.id,
                    {
                      x: from.w > 0 ? port.offset.x / from.w : 0,
                      y: from.h > 0 ? port.offset.y / from.h : 0,
                    },
                  ]),
                )
              : undefined;
          this.engine.animations.add({
            duration: dur,
            easing,
            onUpdate: (p) => {
              const newW = from.w + (to.w - from.w) * p;
              const newH = from.h + (to.h - from.h) * p;
              n.size.width = newW;
              n.size.height = newH;
              if (rel && n.ports) {
                for (const port of n.ports) {
                  const r = rel.get(port.id);
                  if (!r) continue;
                  port.offset = { x: r.x * newW, y: r.y * newH };
                }
              }
              // 尺寸变更：结构变更（影响边快照、空间索引）
              this.engine.graph.markDirty("structure");
            },
          });
        } else if (mo.type === "zIndex") {
          // 层次变化即时应用（影响渲染顺序）
          n.zIndex = Number(mo.to) || 0;
          this.engine.graph.markDirty("structure");
        } else if (mo.type === "edge-style") {
          // 如果节点数据中要求驱动特定边样式变化，可通过 to = { edgeId, lineWidth, stroke, alpha, linedash }
          const e = this.engine.graph.getEdge(mo.to.edgeId);
          if (!e) continue;

          // 获取初始状态，给予默认值防止 undefined 导致动画失效
          const currentStyle = (e.data?.style ?? {}) as { lineWidth?: number; alpha?: number; [key: string]: any };
          const from = {
            lineWidth: typeof currentStyle.lineWidth === "number" ? currentStyle.lineWidth : 1,
            alpha: typeof currentStyle.alpha === "number" ? currentStyle.alpha : 1,
            ...currentStyle,
          };

          const to = mo.to;

          this.engine.animations.add({
            duration: dur,
            easing,
            onUpdate: (p) => {
              const style: any = { ...(e.data?.style ?? {}) };

              if (typeof to.lineWidth === "number") {
                style.lineWidth = from.lineWidth + (to.lineWidth - from.lineWidth) * p;
              }
              if (typeof to.alpha === "number") {
                style.alpha = from.alpha + (to.alpha - from.alpha) * p;
              }

              if (to.stroke) style.stroke = to.stroke; // 颜色补间略，直接切换或可引入颜色插值
              if (to.lineDash) style.lineDash = to.lineDash;
              if (to.flow) style.flow = { ...(style.flow ?? {}), ...to.flow };

              e.data = { ...(e.data ?? {}), style };
              // 边样式变更：仅样式变更，不影响边快照
              this.engine.graph.markDirty("style");
            },
          });
        }
      }
    }
  }
}
