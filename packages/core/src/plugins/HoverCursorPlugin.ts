/*
 * @Description: 悬停节点时将鼠标指针设为 move，移出恢复默认
 * @Author: qingzi.wang
 * @Date: 2025-10-13 15:05:07
 * @LastEditTime: 2025-10-29 17:19:53
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import type { Plugin } from "./Plugin";
import { hitTestNodes } from "../utils/hittest";
import { getNearestPort, getPortWorldPosition } from "../utils/ports";

export class HoverCursorPlugin implements Plugin {
  readonly id = "hover-cursor";
  private engine!: CanvasEngine;
  private appliedByMe = false; // 记录是否由本插件设置了 cursor
  private lastApplied: "none" | "move" | "crosshair" = "none";

  private onMouseMove = (e: MouseEvent) => {
    if (!this.engine) return;

    // 若处于平移/拖拽/其它插件已设置特殊光标，则不干预
    const c = this.engine.canvas;
    const current = c.style.cursor;
    if (this.engine.isCurrentlyPanning() || this.engine.isCurrentlyDraggingNodes()) return;

    const rect = c.getBoundingClientRect();
    const sx = (e.clientX ?? 0) - rect.left;
    const sy = (e.clientY ?? 0) - rect.top;
    const world = this.engine.toWorld({ x: sx, y: sy });
    const hovered = hitTestNodes(world, this.engine.graph.getNodes(), {
      scale: this.engine.getScale(),
      pixelThresholdPx: 10,
    });

    // 目标样式优先级：端口 (crosshair) > 节点 (move) > 默认
    let target: "default" | "move" | "crosshair" = "default";

    if (hovered) {
      // 尝试判定是否处于端口命中半径内（屏幕空间）
      const nearest = getNearestPort(hovered, world);
      if (nearest) {
        const wp = getPortWorldPosition(hovered, nearest.id);
        if (wp) {
          const sp = this.engine.toScreen(wp);
          const dx = sx - sp.x;
          const dy = sy - sp.y;
          // 优先使用 ConnectPlugin 的端口命中半径（已考虑 scale），否则使用默认（16px * scale）
          const connect: any = (this.engine.plugins as any).get?.("connect");
          const hitR = typeof connect?.getPortHitRadius === "function" ? connect.getPortHitRadius() : 8; // 固定像素半径
          if (dx * dx + dy * dy <= hitR * hitR) {
            target = "crosshair";
          } else {
            target = "move";
          }
        } else {
          target = "move";
        }
      } else {
        target = "move";
      }
    }

    // 仅当当前为默认或之前由本插件设置时，才应用目标样式，避免覆盖其他交互插件的光标
    const canApply = current === "" || current === "default" || this.appliedByMe;
    if (canApply) {
      if (target === "default") {
        if (this.appliedByMe) {
          c.style.cursor = "default";
          this.appliedByMe = false;
          this.lastApplied = "none";
        }
      } else {
        const nextCursor = target === "crosshair" ? "crosshair" : "move";
        // 若当前已由本插件设定，但不同于目标，也允许更新
        if (!this.appliedByMe || current !== nextCursor) {
          c.style.cursor = nextCursor;
        }
        this.appliedByMe = true;
        this.lastApplied = target;
      }
    }
  };

  private onMouseLeave = () => {
    if (!this.engine) return;
    const c = this.engine.canvas;
    if (this.appliedByMe) {
      c.style.cursor = "default";
      this.appliedByMe = false;
      this.lastApplied = "none";
    }
  };

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    const c = engine.canvas;
    // 使用 window 的 mousemove（冒泡阶段），确保在其它插件（也用 window 监听）的回调之后注册，从而最后生效
    window.addEventListener("mousemove", this.onMouseMove);
    // 离开画布时恢复
    c.addEventListener("mouseleave", this.onMouseLeave);
  }

  dispose(): void {
    if (!this.engine) return;
    const c = this.engine.canvas;
    window.removeEventListener("mousemove", this.onMouseMove);
    c.removeEventListener("mouseleave", this.onMouseLeave);
  }
}
