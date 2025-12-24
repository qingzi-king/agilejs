/*
 * @Description: 平移缩放插件（支持鼠标和触摸）
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-11-18
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import { hitTestNodes } from "../utils/hittest";
import { PointerEventAdapter } from "../utils/pointer";

export class PanZoomPlugin implements Plugin {
  readonly id = "pan-zoom";
  private engine!: CanvasEngine;
  private panning = false;
  private startX = 0;
  private startY = 0;
  private origTX = 0;
  private origTY = 0;

  // 触摸缩放状态
  private pinching = false;
  private initialPinchDistance = 0;
  private initialScale = 1;
  private pinchCenterX = 0;
  private pinchCenterY = 0;

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    const c = engine.canvas;

    // 鼠标事件
    c.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
    c.addEventListener("wheel", this.onWheel, { passive: true });

    // 触摸事件
    c.addEventListener("touchstart", this.onTouchStart, { passive: false });
    c.addEventListener("touchmove", this.onTouchMove, { passive: false });
    c.addEventListener("touchend", this.onTouchEnd);
    c.addEventListener("touchcancel", this.onTouchEnd);
  }

  dispose(): void {
    const c = this.engine.canvas;

    // 清理鼠标事件
    c.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
    c.removeEventListener("wheel", this.onWheel as any);

    // 清理触摸事件
    c.removeEventListener("touchstart", this.onTouchStart);
    c.removeEventListener("touchmove", this.onTouchMove);
    c.removeEventListener("touchend", this.onTouchEnd);
    c.removeEventListener("touchcancel", this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent) => {
    // 检查引擎是否禁用平移
    const interactionConfig = this.engine.getInteractionConfig();
    if (!interactionConfig.enablePan) return;

    // 改为：左键在空白区域按下即进入平移（去掉中键/Alt）
    if (e.button !== 0) return;
    // 若按住 Cmd/Ctrl，则可能用于框选或其它快捷键，不触发平移
    if (e.metaKey || e.ctrlKey) return;
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    // 点击到节点则不处理（交由拖拽/编辑插件）
    const hit = hitTestNodes(world, this.engine.graph.getNodes(), {
      scale: this.engine.getScale(),
      pixelThresholdPx: 10,
    });
    if (hit) return;
    this.panning = true;
    this.startX = screen.x;
    this.startY = screen.y;
    const t = this.engine.getTranslation();
    this.origTX = t.x;
    this.origTY = t.y;
    this.engine.setPanning(true);
  };

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.engine.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (this.panning) {
      this.engine.setTranslation(this.origTX + (x - this.startX), this.origTY + (y - this.startY));
      return;
    }
  };

  private onMouseUp = () => {
    this.panning = false;
    this.engine.setPanning(false);
  };

  private onWheel = (e: WheelEvent) => {
    // 检查引擎是否禁用缩放
    const interactionConfig = this.engine.getInteractionConfig();
    if (!interactionConfig.enableZoom) return;

    const rect = this.engine.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // 将默认缩放步长调整为 5%
    const factor = e.deltaY < 0 ? 1.05 : 0.95;
    this.engine.zoomAt(factor, x, y);
  };

  // ========== 触摸事件处理 ==========

  private onTouchStart = (e: TouchEvent) => {
    const config = this.engine.getInteractionConfig();

    if (e.touches.length === 1 && config.enablePan) {
      // 单指平移
      const touch = e.touches[0];
      const rect = this.engine.canvas.getBoundingClientRect();
      const screen = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      const world = this.engine.toWorld(screen);

      // 检查是否点击到节点（交由拖拽插件处理）
      const hit = hitTestNodes(world, this.engine.graph.getNodes(), {
        scale: this.engine.getScale(),
        pixelThresholdPx: 10,
      });
      if (hit) return;

      this.panning = true;
      this.startX = screen.x;
      this.startY = screen.y;
      const t = this.engine.getTranslation();
      this.origTX = t.x;
      this.origTY = t.y;
      this.engine.setPanning(true);
      e.preventDefault();
    } else if (e.touches.length === 2 && config.enableZoom) {
      // 双指缩放
      this.panning = false; // 取消平移
      this.engine.setPanning(false);

      this.pinching = true;
      this.initialPinchDistance = PointerEventAdapter.getPinchDistance(e)!;
      this.initialScale = this.engine.getScale();

      const center = PointerEventAdapter.getPinchCenter(e)!;
      const rect = this.engine.canvas.getBoundingClientRect();
      this.pinchCenterX = center.x - rect.left;
      this.pinchCenterY = center.y - rect.top;

      e.preventDefault();
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (this.panning && e.touches.length === 1) {
      // 单指平移
      const touch = e.touches[0];
      const rect = this.engine.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      this.engine.setTranslation(this.origTX + (x - this.startX), this.origTY + (y - this.startY));
      e.preventDefault();
    } else if (this.pinching && e.touches.length === 2) {
      // 双指缩放
      const distance = PointerEventAdapter.getPinchDistance(e);
      if (!distance) return;

      const scale = (distance / this.initialPinchDistance) * this.initialScale;
      const factor = scale / this.engine.getScale();

      // 更新缩放中心（跟随手指移动）
      const center = PointerEventAdapter.getPinchCenter(e);
      if (center) {
        const rect = this.engine.canvas.getBoundingClientRect();
        this.pinchCenterX = center.x - rect.left;
        this.pinchCenterY = center.y - rect.top;
      }

      this.engine.zoomAt(factor, this.pinchCenterX, this.pinchCenterY);
      e.preventDefault();
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) {
      // 所有手指离开
      this.panning = false;
      this.pinching = false;
      this.engine.setPanning(false);
    } else if (e.touches.length === 1 && this.pinching) {
      // 从双指变为单指，结束缩放
      this.pinching = false;
    }
  };
}
