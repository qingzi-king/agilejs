/*
 * @Description: 性能监控器
 * @Author: qingzi.wang
 * @Date: 2025-11-28
 */

export interface PerformanceStats {
  fps: number;
  renderTime: number;
  nodeCount: number;
  edgeCount: number;
  visibleNodeCount: number;
  visibleEdgeCount: number;
  memoryUsage?: number;
  // 新增：诊断字段
  dpr?: number;
  canvasPixels?: number;  // 实际渲染像素数量
  cssSize?: { width: number; height: number };
}

export class PerformanceMonitor {
  private enabled = false;
  private frameCount = 0;
  private lastFpsTime = 0;
  private fps = 0;
  private renderStartTime = 0;
  private renderTime = 0;
  private renderTimes: number[] = [];
  private maxSamples = 60;

  constructor() {
    this.lastFpsTime = performance.now();
  }

  enable(): void {
    this.enabled = true;
    this.reset();
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  reset(): void {
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.fps = 0;
    this.renderTime = 0;
    this.renderTimes = [];
  }

  beginFrame(): void {
    if (!this.enabled) return;
    this.renderStartTime = performance.now();
  }

  endFrame(): void {
    if (!this.enabled) return;

    const now = performance.now();
    const frameTime = now - this.renderStartTime;

    this.renderTimes.push(frameTime);
    if (this.renderTimes.length > this.maxSamples) {
      this.renderTimes.shift();
    }

    this.renderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;

    this.frameCount++;
    const elapsed = now - this.lastFpsTime;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  getStats(
    nodeCount: number, 
    edgeCount: number, 
    visibleNodeCount: number, 
    visibleEdgeCount: number,
    canvasInfo?: { width: number; height: number; dpr: number }
  ): PerformanceStats {
    const stats: PerformanceStats = {
      fps: this.fps,
      renderTime: Math.round(this.renderTime * 100) / 100,
      nodeCount,
      edgeCount,
      visibleNodeCount,
      visibleEdgeCount,
    };

    if (typeof (performance as any).memory !== "undefined") {
      const mem = (performance as any).memory;
      stats.memoryUsage = Math.round((mem.usedJSHeapSize / 1024 / 1024) * 100) / 100;
    }
    
    // 添加画布诊断信息
    if (canvasInfo) {
      stats.dpr = canvasInfo.dpr;
      stats.canvasPixels = canvasInfo.width * canvasInfo.height * canvasInfo.dpr * canvasInfo.dpr;
      stats.cssSize = { width: canvasInfo.width, height: canvasInfo.height };
    }

    return stats;
  }
}
