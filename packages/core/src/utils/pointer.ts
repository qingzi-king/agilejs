/*
 * @Description: 统一指针事件适配器 - 支持鼠标和触摸事件
 * @Author: qingzi.wang
 * @Date: 2025-11-18
 */

/**
 * 统一的指针事件接口
 */
export interface PointerEvent {
  clientX: number;
  clientY: number;
  button?: number;
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

/**
 * 指针事件适配器 - 统一处理鼠标和触摸事件
 */
export class PointerEventAdapter {
  /**
   * 将原生鼠标或触摸事件归一化为统一的指针事件
   * @param e 原生事件
   * @returns 归一化后的指针事件，如果无法处理则返回 null
   */
  static normalize(e: MouseEvent | TouchEvent): PointerEvent | null {
    if (e instanceof MouseEvent) {
      return {
        clientX: e.clientX,
        clientY: e.clientY,
        button: e.button,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
      };
    }

    if (e instanceof TouchEvent && e.touches.length > 0) {
      const touch = e.touches[0];
      return {
        clientX: touch.clientX,
        clientY: touch.clientY,
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
      };
    }

    return null;
  }

  /**
   * 获取触摸结束时的最后一个触摸点位置（用于 touchend 事件）
   */
  static normalizeEnd(e: TouchEvent): PointerEvent | null {
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      return {
        clientX: touch.clientX,
        clientY: touch.clientY,
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
      };
    }
    return null;
  }

  /**
   * 计算两个触摸点之间的距离（用于捏合缩放手势）
   * @param e 触摸事件
   * @returns 距离值，如果触摸点数不为 2 则返回 null
   */
  static getPinchDistance(e: TouchEvent): number | null {
    if (e.touches.length !== 2) return null;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 计算两个触摸点的中心点坐标（用于捏合缩放的中心点）
   * @param e 触摸事件
   * @returns 中心点坐标，如果触摸点数不为 2 则返回 null
   */
  static getPinchCenter(e: TouchEvent): { x: number; y: number } | null {
    if (e.touches.length !== 2) return null;
    return {
      x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
    };
  }

  /**
   * 判断是否为移动设备（基于 touch 事件支持）
   */
  static isTouchDevice(): boolean {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  /**
   * 为元素同时添加鼠标和触摸事件监听器
   * @param element 目标元素
   * @param handlers 事件处理器映射
   * @returns 清理函数
   */
  static addUnifiedListeners(
    element: HTMLElement | Window,
    handlers: {
      onStart?: (e: MouseEvent | TouchEvent) => void;
      onMove?: (e: MouseEvent | TouchEvent) => void;
      onEnd?: (e: MouseEvent | TouchEvent) => void;
      onCancel?: (e: TouchEvent) => void;
    },
    options?: AddEventListenerOptions,
  ): () => void {
    const cleanups: Array<() => void> = [];

    if (handlers.onStart) {
      element.addEventListener("mousedown", handlers.onStart as any, options);
      element.addEventListener("touchstart", handlers.onStart as any, options);
      cleanups.push(() => {
        element.removeEventListener("mousedown", handlers.onStart as any);
        element.removeEventListener("touchstart", handlers.onStart as any);
      });
    }

    if (handlers.onMove) {
      element.addEventListener("mousemove", handlers.onMove as any, options);
      element.addEventListener("touchmove", handlers.onMove as any, options);
      cleanups.push(() => {
        element.removeEventListener("mousemove", handlers.onMove as any);
        element.removeEventListener("touchmove", handlers.onMove as any);
      });
    }

    if (handlers.onEnd) {
      element.addEventListener("mouseup", handlers.onEnd as any, options);
      element.addEventListener("touchend", handlers.onEnd as any, options);
      cleanups.push(() => {
        element.removeEventListener("mouseup", handlers.onEnd as any);
        element.removeEventListener("touchend", handlers.onEnd as any);
      });
    }

    if (handlers.onCancel) {
      element.addEventListener("touchcancel", handlers.onCancel as any, options);
      cleanups.push(() => {
        element.removeEventListener("touchcancel", handlers.onCancel as any);
      });
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }
}
