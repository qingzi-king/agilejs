/*
 * @Description: 连线插件
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-12-08 17:26:24
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import { hitTestNodes } from "../utils/hittest";
import { getNearestPort, getPortWorldPosition } from "../utils/ports";
import { AddEdgeCommand } from "../commands/GraphCommands";

export class ConnectPlugin implements Plugin {
  readonly id = "connect";
  private engine!: CanvasEngine;
  private dragging = false;
  private temp: { x: number; y: number } | null = null;
  private sourceNodeId: string | null = null;
  private sourcePortId: string | null = null;
  private portHitRadius: number; // screen-space radius (px)
  private requireModifier: boolean;

  constructor(opts?: { portHitRadius?: number; requireModifier?: boolean }) {
    this.portHitRadius = opts?.portHitRadius ?? 8; // default port hit radius (px)
    this.requireModifier = opts?.requireModifier ?? false; // default: allow port click without modifier
  }

  // 对外暴露当前用于吸附/命中的端口屏幕半径（随缩放变化），供覆盖层绘制提示圈
  getPortHitRadius(): number {
    // 返回屏幕像素半径（恒定 px，不随缩放改变）
    return this.portHitRadius;
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    const c = engine.canvas;
    // capture to avoid node selection when starting from a port
    c.addEventListener("mousedown", this.onMouseDown, true);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
  }

  dispose(): void {
    const c = this.engine.canvas;
    c.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
  }

  private onMouseDown = (e: MouseEvent) => {
    // 检查引擎是否允许拖拽（连接操作需要拖拽功能）
    const interactionConfig = this.engine.getInteractionConfig();
    if (!interactionConfig.enableDrag) return;

    if (e.button !== 0) return; // only left button
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const hit = hitTestNodes(world, this.engine.graph.getNodes(), {
      scale: this.engine.getScale(),
      pixelThresholdPx: 10,
    });
    if (!hit) return;
    const p = getNearestPort(hit, world);
    if (!p) return;
    let canStart = false;
    if (this.requireModifier) {
      canStart = e.metaKey || e.ctrlKey;
    } else {
      // allow start when clicking near a port, or with modifiers anywhere on node
      if (e.metaKey || e.ctrlKey) canStart = true;
      else {
        const wp = getPortWorldPosition(hit, p.id);
        if (wp) {
          // 以屏幕坐标进行命中，避免缩放影响点击区域
          const sp = this.engine.toScreen(wp);
          const dx = screen.x - sp.x;
          const dy = screen.y - sp.y;
          const hitR = this.getPortHitRadius();
          canStart = dx * dx + dy * dy <= hitR * hitR;
        }
      }
    }
    // if a selected edge already uses this node/port, let EdgeEditPlugin handle endpoint dragging
    const hasSelectedAtPort = this.engine.graph
      .getEdges()
      .some(
        (e) =>
          e.selected &&
          ((e.source === hit.id && e.sourcePortId === p.id) || (e.target === hit.id && e.targetPortId === p.id)),
      );
    if (hasSelectedAtPort) return;
    if (!canStart) return;
    this.dragging = true;
    this.sourceNodeId = hit.id;
    this.sourcePortId = p.id;
    this.temp = world;
    // prevent selection/drag handlers
    e.preventDefault();
    e.stopPropagation();
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.dragging) return;
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.temp = this.engine.toWorld(screen);
  };

  private onMouseUp = (e: MouseEvent) => {
    if (!this.dragging) return;
    this.dragging = false;
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const hit = hitTestNodes(world, this.engine.graph.getNodes(), {
      scale: this.engine.getScale(),
      pixelThresholdPx: 10,
    });
    if (hit && this.sourceNodeId) {
      const p = getNearestPort(hit, world);
      if (p) {
        // disallow node self-loop regardless of ports
        if (hit.id === this.sourceNodeId) {
          this.sourceNodeId = this.sourcePortId = null;
          this.temp = null;
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        // 宽松判定：只要命中节点且存在最近端口，即允许连接（与 PortOverlay 的高亮逻辑保持一致）
        // 原逻辑要求鼠标必须在端口 hitR 范围内，导致“看到高亮却连不上”的问题
        /*
        if (!this.requireModifier && !(e.metaKey || e.ctrlKey)) {
          const wp = getPortWorldPosition(hit, p.id);
          if (wp) {
            const sp = this.engine.toScreen(wp);
            const dx = screen.x - sp.x; const dy = screen.y - sp.y;
            const hitR = this.getPortHitRadius();
            if ((dx * dx + dy * dy) > (hitR * hitR)) {
              this.sourceNodeId = this.sourcePortId = null; this.temp = null; return;
            }
          }
        }
        */

        const id = `e_${Date.now()}`;
        const edge = {
          id,
          shape: "edge-straight",
          source: this.sourceNodeId,
          target: hit.id,
          sourcePortId: this.sourcePortId!,
          targetPortId: p.id,
          data: { style: { sourceArrowType: "none", targetArrowType: "solid" } },
        } as const;
        this.engine.history.execute(new AddEdgeCommand(this.engine.graph, edge));
      }
    }
    this.sourceNodeId = this.sourcePortId = null;
    this.temp = null;
    e.preventDefault();
    e.stopPropagation();
  };

  afterRender(ctx: CanvasRenderingContext2D): void {
    if (!this.dragging || !this.temp || !this.sourceNodeId || !this.sourcePortId) return;
    const src = this.engine.graph.getNode(this.sourceNodeId);
    if (!src) return;
    const sp = src.ports?.find((p) => p.id === this.sourcePortId);
    if (!sp) return;
    // 使用世界坐标中的端口位置（考虑节点旋转），避免预览起点偏移
    const aWorld = getPortWorldPosition(src, sp.id) ?? {
      x: src.position.x + sp.offset.x,
      y: src.position.y + sp.offset.y,
    };
    const aS = this.engine.toScreen(aWorld);
    const bS = this.engine.toScreen(this.temp);
    ctx.save();
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(aS.x, aS.y);
    ctx.lineTo(bS.x, bS.y);
    ctx.stroke();
    ctx.restore();
  }
}
