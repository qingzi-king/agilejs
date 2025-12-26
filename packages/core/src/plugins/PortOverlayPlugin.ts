/*
 * @Description: 端口悬浮插件
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-10-29 17:19:44
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import { hitTestNodes } from "../utils/hittest";
import { getPortWorldPosition, getNearestPort } from "../utils/ports";

export class PortOverlayPlugin implements Plugin {
  readonly id = "port-overlay";
  private engine!: CanvasEngine;
  private hoverNodeId: string | null = null;

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    // Use window mousemove so hover state updates during drags
    window.addEventListener("mousemove", this.onMouseMove);
    engine.canvas.addEventListener("mouseleave", this.onMouseLeave);
  }

  dispose(): void {
    window.removeEventListener("mousemove", this.onMouseMove);
    this.engine.canvas.removeEventListener("mouseleave", this.onMouseLeave);
  }

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const hit = hitTestNodes(world, this.engine.graph.getNodes(), {
      scale: this.engine.getScale(),
      pixelThresholdPx: 10,
    });
    const next = hit?.id ?? null;
    if (next !== this.hoverNodeId) {
      this.hoverNodeId = next;
      // demand-render mode: hover overlay needs an explicit repaint
      this.engine.requestRender();
    }
  };

  private onMouseLeave = () => {
    if (this.hoverNodeId != null) {
      this.hoverNodeId = null;
      this.engine.requestRender();
    }
  };

  afterRender(ctx: CanvasRenderingContext2D): void {
    if (!this.hoverNodeId) return;
    const node = this.engine.graph.getNode(this.hoverNodeId);
    if (!node || !node.ports) return;
    // 检查节点是否设置了隐藏锚点
    if (node.data?.showPorts === false) return;
    // 当悬停的图形处于选中状态时，不显示锚点/端口以避免与选中句柄叠加
    if (node.selected) return;
    ctx.save();
    // 固定屏幕像素尺寸绘制（不随缩放变化视觉大小）
    const baseR = 5; // px
    const baseLW = 2; // px
    const defaultR = baseR;
    const lw = baseLW;
    // 检测是否处于“连接创建”或“重连端点”状态，以决定最近端口高亮
    let nearestPortId: string | null = null;
    let draggingWorld: { x: number; y: number } | null = null;
    let snapRadius: number | null = null; // screen-space
    const pluginsAny = (this.engine as any).plugins;
    const connect = pluginsAny?.get?.("connect");
    if (connect && connect.dragging && connect.temp) {
      // ConnectPlugin 公开的临时状态用于预览连线终点
      draggingWorld = connect.temp;
      if (this.hoverNodeId === node.id) {
        const p = getNearestPort(node, connect.temp);
        nearestPortId = p?.id ?? null;
        if (p && typeof connect.getPortHitRadius === "function") {
          snapRadius = connect.getPortHitRadius();
        }
      }
    }
    const edgeEdit = pluginsAny?.get?.("edge-edit");
    if (!nearestPortId && edgeEdit && edgeEdit.draggingEndpoint) {
      draggingWorld = edgeEdit.draggingEndpoint.pt;
      if (this.hoverNodeId === node.id) {
        const p = getNearestPort(node, edgeEdit.draggingEndpoint.pt);
        nearestPortId = p?.id ?? null;
        // 重连端点时复用 ConnectPlugin 半径（若存在）
        if (!snapRadius && connect && typeof connect.getPortHitRadius === "function") {
          snapRadius = connect.getPortHitRadius();
        }
      }
    }
    for (const p of node.ports) {
      const wp = getPortWorldPosition(node, p.id);
      if (!wp) continue;
      const s = this.engine.toScreen(wp);
      const r = Math.max(2, p.radius ?? baseR) || defaultR;
      const isNearest = nearestPortId === p.id;
      // 基础圆
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isNearest ? "#2563eb" : "#ffffff";
      ctx.strokeStyle = isNearest ? "#1d4ed8" : "#2563eb";
      ctx.lineWidth = lw;
      ctx.fill();
      ctx.stroke();
      if (isNearest) {
        // 吸附视觉圈：使用屏幕空间半径，不随 scale“再缩放”
        const visualR = snapRadius ?? r + 4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, visualR, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(37,99,235,0.35)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }
}
