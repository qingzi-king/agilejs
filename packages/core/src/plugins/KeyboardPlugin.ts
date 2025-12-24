/*
 * @Description: 键盘插件
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-12-03 18:47:34
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import {
  RemoveNodeCommand,
  RemoveEdgeCommand,
  MoveNodesCommand,
  bringNodesToFront,
  sendNodesToBack,
  moveNodesUp,
  moveNodesDown,
} from "../commands/GraphCommands";

type KeyboardOptions = {
  nudgeStep?: number; // base step in px
  fastMultiplier?: number; // when holding Shift
};

export class KeyboardPlugin implements Plugin {
  readonly id = "keyboard";
  private engine!: CanvasEngine;
  private opts: Required<KeyboardOptions>;

  constructor(options?: KeyboardOptions) {
    this.opts = {
      nudgeStep: options?.nudgeStep ?? 1,
      fastMultiplier: options?.fastMultiplier ?? 10,
    };
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    window.addEventListener("keydown", this.onKeyDown);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    // ignore when typing in inputs/contentEditable
    const ae = document.activeElement as HTMLElement | null;
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) return;

    // Ctrl+A: 全选所有节点
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      const nodes = this.engine.graph.getNodes();
      for (const n of nodes) {
        if (n.selectable !== false) {
          n.selected = true;
        }
      }
      // 取消所有边的选中
      const edges = this.engine.graph.getEdges();
      for (const ed of edges) {
        ed.selected = false;
      }
      const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
      this.engine.events.emit("graph:selection-change", {
        nodes: selectedIds,
        edges: [],
        reason: "keyboard-select-all",
      });
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      if (e.shiftKey) this.engine.history.redo();
      else this.engine.history.undo();
    }
    // 图层（zIndex）快捷键（避免干扰上面的文本输入）
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      const selectedIds = this.engine.graph
        .getNodes()
        .filter((n) => n.selected)
        .map((n) => n.id);
      if (selectedIds.length) {
        if (e.key === "]") {
          // bring to front
          e.preventDefault();
          bringNodesToFront(this.engine.graph, selectedIds, this.engine.history);
          return;
        }
        if (e.key === "[") {
          // send to back
          e.preventDefault();
          sendNodesToBack(this.engine.graph, selectedIds, this.engine.history);
          return;
        }
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey) {
      const selectedIds = this.engine.graph
        .getNodes()
        .filter((n) => n.selected)
        .map((n) => n.id);
      if (selectedIds.length) {
        if (e.key === "]") {
          // move up one step
          e.preventDefault();
          moveNodesUp(this.engine.graph, selectedIds, this.engine.history);
          return;
        }
        if (e.key === "[") {
          // move down one step
          e.preventDefault();
          moveNodesDown(this.engine.graph, selectedIds, this.engine.history);
          return;
        }
      }
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      const selectedNodes = this.engine.graph.getNodes().filter((n) => n.selected);
      const selectedEdges = this.engine.graph.getEdges().filter((ed) => ed.selected);
      if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
      // 先删边，再删节点（避免重复/依赖顺序问题）
      for (const ed of selectedEdges) {
        this.engine.history.execute(new RemoveEdgeCommand(this.engine.graph, ed.id));
      }
      for (const n of selectedNodes) {
        this.engine.history.execute(new RemoveNodeCommand(this.engine.graph, n.id));
      }
    }

    // Arrow keys: move selected nodes by nudge step (pixel-level placement)
    const selectedNodes = this.engine.graph.getNodes().filter((n) => n.selected);
    if (selectedNodes.length > 0) {
      let dx = 0,
        dy = 0;
      if (e.key === "ArrowLeft") dx = -1;
      else if (e.key === "ArrowRight") dx = 1;
      else if (e.key === "ArrowUp") dy = -1;
      else if (e.key === "ArrowDown") dy = 1;
      if (dx !== 0 || dy !== 0) {
        const step = this.opts.nudgeStep * (e.shiftKey ? this.opts.fastMultiplier : 1);
        e.preventDefault();
        const ids = selectedNodes.map((n) => n.id);
        // 将短时间内的多次轻推合并到一条历史记录，提升可操作性
        this.engine.history.execute(new MoveNodesCommand(this.engine.graph, ids, dx * step, dy * step), {
          merge: true,
          mergeKey: "nudge-move",
          mergeWindowMs: 350,
          label: "Nudge Move",
        });
      }
    }
  };
}
