/*
 * @Description: 选择框覆盖插件
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-17 19:43:59
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import { hitTestNodes } from "../utils/hittest";

export interface SelectionOverlayOptions {
  /**
   * 选择框的颜色
   * @default "#2563eb" (蓝色)
   */
  strokeColor?: string;

  /**
   * 选择框的线宽
   * @default 2
   */
  lineWidth?: number;

  /**
   * 选择框的虚线样式
   * @default [6, 4]
   */
  lineDash?: number[];

  /**
   * 选择框的边距（相对于节点边缘）
   * @default 2
   */
  padding?: number;

  /**
   * 是否在空白区域点击时清除选择
   * @default true
   */
  clearSelectionOnCanvasClick?: boolean;

  /**
   * 保护尺寸/旋转/组合句柄的屏幕像素外扩边界，点击该扩展区域内不清除选择。
   * 解决句柄附近点击被误判为空白导致交互失效的问题。
   * @default 40 (px)
   */
  handleGuardMarginPx?: number;
}

export class SelectionOverlayPlugin implements Plugin {
  readonly id = "selection-overlay";
  private engine!: CanvasEngine;
  private options: Required<SelectionOverlayOptions>;

  constructor(options: SelectionOverlayOptions = {}) {
    this.options = {
      strokeColor: options.strokeColor ?? "#2563eb",
      lineWidth: options.lineWidth ?? 2,
      lineDash: options.lineDash ?? [6, 4],
      // 默认给虚线框增加 2px 内边距（像素恒定）
      padding: options.padding ?? 2,
      clearSelectionOnCanvasClick: options.clearSelectionOnCanvasClick ?? true,
      handleGuardMarginPx: options.handleGuardMarginPx ?? 40,
    };
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;

    // 监听图形变化事件，确保选择框随图形变化而更新
    this.engine.events.on("graph:change", () => {
      // 图形变化时会自动触发重绘
    });

    // 添加鼠标/触摸事件监听，处理空白区域点击取消选择
    if (this.options.clearSelectionOnCanvasClick) {
      engine.canvas.addEventListener("mousedown", this.onCanvasMouseDown);
      engine.canvas.addEventListener("touchstart", this.onCanvasTouchStart);
    }
  }

  dispose(): void {
    if (this.options.clearSelectionOnCanvasClick) {
      this.engine.canvas.removeEventListener("mousedown", this.onCanvasMouseDown);
      this.engine.canvas.removeEventListener("touchstart", this.onCanvasTouchStart);
    }
  }

  private onCanvasMouseDown = (e: MouseEvent) => {
    this.handlePointerCanvasDown(e);
  };

  private onCanvasTouchStart = (e: TouchEvent) => {
    this.handlePointerCanvasDown(e);
  };

  private handlePointerCanvasDown = (e: MouseEvent | TouchEvent) => {
    // 检查引擎是否禁用选中
    const interactionConfig = this.engine.getInteractionConfig();
    if (!interactionConfig.enableSelection) return;

    // 获取鼠标点击位置在画布坐标系中的位置
    const rect = this.engine.canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if (e instanceof MouseEvent) {
      // 只处理鼠标左键
      if (e.button !== 0) return;
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      const te = e as TouchEvent;
      if (te.touches.length !== 1) return;
      clientX = te.touches[0].clientX;
      clientY = te.touches[0].clientY;
    }

    // 转换为世界坐标
    const worldPos = this.engine.toWorld({ x: clientX - rect.left, y: clientY - rect.top });

    // 检查是否点击到了任何节点
    const hitNode = hitTestNodes(worldPos, this.engine.graph.getNodes(), {
      scale: this.engine.getScale(),
      pixelThresholdPx: 10,
    });

    // 如果没有点击到节点，则清除所有选择
    if (!hitNode) {
      this.clearAllSelections();
    }
  };

  // 删除本地命中检测，统一复用 utils/hittest 中的旋转感知逻辑

  private clearAllSelections(): void {
    const nodes = this.engine.graph.getNodes();
    const edges = this.engine.graph.getEdges();
    let selectionChanged = false;

    for (const node of nodes) {
      if (node.selected) {
        node.selected = false;
        selectionChanged = true;
      }
    }
    for (const edge of edges) {
      if (edge.selected) {
        edge.selected = false;
        selectionChanged = true;
      }
    }

    if (selectionChanged) {
      // 先触发更细粒度的 selectionChanged 事件，供外部属性面板等使用
      const selectedNodeIds: string[] = []; // 清空后为空
      const selectedEdgeIds: string[] = []; // 清空后为空
      this.engine.events.emit("graph:selection-change", {
        nodes: selectedNodeIds,
        edges: selectedEdgeIds,
        reason: "clear",
      });
      // 兼容旧逻辑：仍发出 graphChanged 保持重绘与历史兼容
      this.engine.events.emit("graph:change", { reason: "selection-cleared" });
    }
  }

  afterRender(ctx: CanvasRenderingContext2D): void {
    const nodes = this.engine.graph.getNodes();

    ctx.save();

    // 应用当前画布变换，确保选择框在正确的位置
    const { x: translateX, y: translateY } = this.engine.getTranslation();
    const scale = this.engine.getScale();

    // 使用与主画布相同的变换
    ctx.translate(translateX, translateY);
    ctx.scale(scale, scale);

    const { strokeColor } = this.options;

    // 若当前为“组合选择”（所有选中节点的 groupId 相同且非空），则不绘制组内每个节点的选中框，
    // 统一由 GroupResizeRotatePlugin 绘制组级边框与控制点。
    const selected = nodes.filter((n) => n.selected);
    const sameGroupSelected =
      selected.length >= 2 ? selected.every((n) => !!n.groupId && n.groupId === selected[0]!.groupId) : false;
    if (sameGroupSelected) {
      ctx.restore();
      return;
    }

    for (const n of nodes) {
      if (!n.selected) continue;
      if (n.visible === false) continue; // 隐藏节点不绘制选择高亮
      // 直线（line）不绘制选择框与句柄，改由 PolylineNodeEditPlugin 的端点/拐点交互提供反馈
      if (n.shape === "line") continue;
      const { x, y } = n.position;
      const { width, height } = n.size;
      const rotation = n.rotation ?? 0;

      // 像素恒定配置：将像素值转换为世界单位
      const px = Math.max(0.0001, scale);
      // 对直线（line）不留内边距，其他形状沿用配置
      const paddingCfg = n.shape === "line" ? 0 : (this.options.padding ?? 0);
      const paddingWorld = paddingCfg / px;
      const dashWorld = (this.options.lineDash ?? [6, 4]).map((v) => v / px);
      const lwWorld = (this.options.lineWidth ?? 2) / px;

      ctx.strokeStyle = strokeColor;
      ctx.setLineDash(dashWorld);
      ctx.lineWidth = lwWorld; // 像素恒定线宽

      if (rotation) {
        const cx = x + width / 2;
        const cy = y + height / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
        ctx.strokeRect(x - paddingWorld, y - paddingWorld, width + paddingWorld * 2, height + paddingWorld * 2);
        ctx.restore();
      } else {
        ctx.strokeRect(x - paddingWorld, y - paddingWorld, width + paddingWorld * 2, height + paddingWorld * 2);
      }
    }

    ctx.restore();
  }
}
