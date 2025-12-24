/*
 * @Description: 内联文本编辑插件
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-25 20:23:41
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import { hitTestNodes } from "../utils/hittest";
import { UpdateNodeDataCommand, UpdateEdgeDataCommand } from "../commands/GraphCommands";
import {
  edgeLabelPositionStraight,
  edgeLabelPositionBezier,
  edgeLabelPositionOrthogonal,
  edgeLabelPositionPolyline,
} from "../utils/edgeLabel";
import { getPortWorldPosition } from "../utils/ports";
import type { Point } from "../model/Graph";
import type { NodeData } from "../model/Graph";

function distPointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(p.x - proj.x, p.y - proj.y);
}

export class InlineTextEditPlugin implements Plugin {
  readonly id = "inline-text-edit";
  private engine!: CanvasEngine;
  private input: HTMLInputElement | null = null;
  private editing: { type: "node" | "edge"; id: string; field?: "label" | "text" } | null = null;

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    engine.canvas.addEventListener("dblclick", this.onDblClick);
  }

  dispose(): void {
    this.engine.canvas.removeEventListener("dblclick", this.onDblClick);
    this.destroyInput();
  }

  private createInput(x: number, y: number, value: string): void {
    this.destroyInput();
    const inp = document.createElement("input");
    inp.type = "text";
    inp.value = value;
    inp.style.position = "absolute";
    inp.style.left = `${x}px`;
    inp.style.top = `${y}px`;
    inp.style.transform = "translate(-50%, -50%)";
    inp.style.padding = "2px 6px";
    inp.style.border = "1px solid rgba(0,0,0,0.2)";
    inp.style.borderRadius = "4px";
    inp.style.background = "rgba(255,255,255,0.85)";
    inp.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
    inp.style.zIndex = "20";
    inp.style.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
    inp.style.width = `${Math.max(6, value.length + 1)}ch`;
    this.input = inp;
    this.engine.canvas.parentElement?.appendChild(inp);
    inp.focus();
    inp.select();
    const autoSize = () => {
      inp.style.width = `${Math.max(6, inp.value.length + 1)}ch`;
    };
    const finish = () => {
      const text = inp.value;
      if (this.editing) {
        if (this.editing.type === "node") {
          const field = this.editing.field === "label" ? "label" : "text";
          this.engine.history.execute(
            new UpdateNodeDataCommand(this.engine.graph, this.editing.id, { [field]: text } as any),
          );
        } else
          this.engine.history.execute(new UpdateEdgeDataCommand(this.engine.graph, this.editing.id, { label: text }));
        this.engine.events.emit("graph:change", { reason: "inline-text-edit" });
      }
      this.destroyInput();
    };
    inp.addEventListener("blur", finish, { once: true });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish();
    });
    inp.addEventListener("input", autoSize);
  }

  private destroyInput(): void {
    if (this.input) {
      this.input.remove();
      this.input = null;
    }
    this.editing = null;
  }

  private onDblClick = (e: MouseEvent) => {
    // 检查引擎是否允许编辑操作（文本编辑需要拖拽权限，因为涉及选择和修改）
    const interactionConfig = this.engine.getInteractionConfig();
    if (!interactionConfig.enableDrag) return;

    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const nodes = this.engine.graph.getNodes();
    // 先命中节点标签区域（优先编辑标签）
    const labelHit = this.hitNodeLabel(screen, nodes);
    if (labelHit) {
      e.stopPropagation();
      this.editing = { type: "node", id: labelHit.node.id, field: "label" };
      const initial = String((labelHit.node.data as any)?.label ?? "");
      this.createInput(labelHit.center.x, labelHit.center.y, initial);
      return;
    }
    const node = hitTestNodes(world, nodes, { scale: this.engine.getScale(), pixelThresholdPx: 10 });
    if (node) {
      const s = this.engine.toScreen({
        x: node.position.x + node.size.width / 2,
        y: node.position.y + node.size.height / 2,
      });
      this.editing = { type: "node", id: node.id, field: "text" };
      this.createInput(s.x, s.y, String(node.data?.text ?? ""));
      return;
    }
    // 尝试命中边的标签位置（近似）或任意边线段
    const edges = this.engine.graph.getEdges();
    for (const edge of edges) {
      let pos = null as any;
      if (edge.shape === "edge-straight") pos = edgeLabelPositionStraight(edge, this.engine.graph);
      else if (edge.shape === "edge-bezier") pos = edgeLabelPositionBezier(edge, this.engine.graph);
      else if (edge.shape === "edge-orthogonal") pos = edgeLabelPositionOrthogonal(edge, this.engine.graph);
      else if (edge.shape === "edge-polyline") pos = edgeLabelPositionPolyline(edge, this.engine.graph);
      const s = pos ? this.engine.toScreen(pos) : null;
      const nearLabel = s ? Math.abs(s.x - screen.x) <= 10 && Math.abs(s.y - screen.y) <= 10 : false;
      let nearLine = false;
      if (!nearLabel) {
        // 线段命中：直线/默认用端点直线；折线遍历各段
        const src = this.engine.graph.getNode(edge.source);
        const tgt = this.engine.graph.getNode(edge.target);
        if (src && tgt) {
          const a = edge.sourcePortId
            ? getPortWorldPosition(src, edge.sourcePortId)
            : { x: src.position.x + src.size.width / 2, y: src.position.y + src.size.height / 2 };
          const b = edge.targetPortId
            ? getPortWorldPosition(tgt, edge.targetPortId)
            : { x: tgt.position.x + tgt.size.width / 2, y: tgt.position.y + tgt.size.height / 2 };
          if (a && b) {
            const pts: Point[] = edge.shape === "edge-polyline" ? [a, ...(edge.points ?? []), b] : [a, b];
            for (let i = 0; i < pts.length - 1; i++) {
              const d = distPointToSegment(world, pts[i], pts[i + 1]);
              if (d <= 8) {
                nearLine = true;
                break;
              }
            }
          }
        }
      }
      if (nearLabel || nearLine) {
        // 输入框出现在鼠标处，以便“任意线条位置双击”也能编辑
        this.editing = { type: "edge", id: edge.id };
        this.createInput(screen.x, screen.y, String(edge.data?.label ?? ""));
        return;
      }
    }
  };

  // 命中节点标签（考虑位置、对齐与旋转的包围盒近似）
  private hitNodeLabel(
    screen: { x: number; y: number },
    nodes: NodeData[],
  ): { node: NodeData; center: { x: number; y: number } } | null {
    const engine = this.engine;
    for (const n of nodes) {
      const data: any = n.data ?? {};
      const style = (data.style?.label ?? data.labelStyle ?? {}) as any;
      const label = (data.label ?? data.text ?? "") as string;
      if (!label) continue;
      const follow = !!style.rotateWithNode;
      // 以 LabelOverlay 的 anchor 作为中心，构造一个简单的屏幕空间包围盒（文本大致宽高 估算）
      const fontSize = style.fontSize ?? 12;
      const fontFamily = style.fontFamily ?? "system-ui, -apple-system, Segoe UI, Roboto";
      const fontWeight = style.fontWeight ?? 400;
      const ctx = engine.ctx;
      ctx.save();
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      const textW = Math.max(fontSize, ctx.measureText(label).width);
      const textH = fontSize;
      ctx.restore();
      const anchor = this.resolveNodeLabelAnchor(n, style.position);
      const sp = engine.toScreen(anchor);
      // 近似包围盒
      const padX = (style.paddingX ?? 6) + 4;
      const padY = (style.paddingY ?? 3) + 4;
      const halfW = textW / 2 + padX;
      const halfH = textH / 2 + padY;
      // 若随节点旋转，则将点逆旋转再做 AABB 测试
      let px = screen.x - sp.x - (style.offsetX ?? 0);
      let py = screen.y - sp.y - (style.offsetY ?? 0);
      if (follow && (n.rotation ?? 0)) {
        const rad = -((n.rotation ?? 0) * Math.PI) / 180;
        const rx = px * Math.cos(rad) - py * Math.sin(rad);
        const ry = px * Math.sin(rad) + py * Math.cos(rad);
        px = rx;
        py = ry;
      }
      if (Math.abs(px) <= halfW && Math.abs(py) <= halfH) {
        return { node: n, center: sp };
      }
    }
    return null;
  }

  private resolveNodeLabelAnchor(n: NodeData, position?: string) {
    const x = n.position.x;
    const y = n.position.y;
    const w = n.size.width;
    const h = n.size.height;
    const pos = position ?? "center";
    switch (pos) {
      case "top":
        return { x: x + w / 2, y: y };
      case "bottom":
        return { x: x + w / 2, y: y + h };
      case "left":
        return { x: x, y: y + h / 2 };
      case "right":
        return { x: x + w, y: y + h / 2 };
      default:
        return { x: x + w / 2, y: y + h / 2 };
    }
  }
}
