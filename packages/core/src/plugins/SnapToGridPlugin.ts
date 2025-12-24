/*
 * @Description: 吸附网格插件
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-17 19:44:27
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";

type Modifier = "none" | "shift" | "alt" | "meta" | "ctrl" | "cmdOrCtrl";

export interface SnapToGridOptions {
  size?: number;
  requireModifier?: Modifier; // 需要修饰键时才吸附，默认 cmdOrCtrl
}

export class SnapToGridPlugin implements Plugin {
  readonly id = "snap-to-grid";
  private engine!: CanvasEngine;
  private size: number;
  private require: Modifier;
  constructor(opts: number | SnapToGridOptions = 20) {
    if (typeof opts === "number") {
      this.size = opts;
      this.require = "cmdOrCtrl";
    } else {
      this.size = opts.size ?? 20;
      this.require = opts.requireModifier ?? "cmdOrCtrl";
    }
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    window.addEventListener("mouseup", this.onMouseUp);
  }
  dispose(): void {
    window.removeEventListener("mouseup", this.onMouseUp);
  }

  private shouldSnap(e: MouseEvent): boolean {
    switch (this.require) {
      case "none":
        return true;
      case "shift":
        return e.shiftKey;
      case "alt":
        return e.altKey;
      case "meta":
        return e.metaKey;
      case "ctrl":
        return e.ctrlKey;
      case "cmdOrCtrl":
      default:
        return e.metaKey || e.ctrlKey;
    }
  }

  private onMouseUp = (e: MouseEvent) => {
    // 仅在节点拖拽结束时执行吸附：避免框选（也在 mouseup）导致位置偏移
    if (!this.engine.isCurrentlyDraggingNodes()) return;
    if (!this.shouldSnap(e)) return;
    const s = this.size;
    for (const n of this.engine.graph.getNodes()) {
      if (!n.selected) continue;
      const nx = Math.round(n.position.x / s) * s;
      const ny = Math.round(n.position.y / s) * s;
      n.position.x = nx;
      n.position.y = ny;
    }
    this.engine.graph.markDirty();
  };
}
