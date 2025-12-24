/*
 * @Description: 对齐线插件
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-17 19:42:28
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";

interface GuideLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GuidesPluginOptions {
  /**
   * 对齐线判定阈值（像素）
   * @default 6
   */
  threshold?: number;

  /**
   * 对齐线颜色
   * @default "#ef4444" (红色)
   */
  color?: string;

  /**
   * 对齐线宽度
   * @default 1
   */
  lineWidth?: number;

  /**
   * 对齐线样式
   * @default [4, 3]
   */
  lineDash?: number[];

  /**
   * 是否启用对齐线
   * @default true
   */
  visible?: boolean;
}

export class GuidesPlugin implements Plugin {
  readonly id = "guides";
  private engine!: CanvasEngine;
  private threshold: number;
  private color: string;
  private lineWidth: number;
  private lineDash: number[];
  public visible: boolean;
  private guides: GuideLine[] = [];
  private active = false;
  private isDragging = false;

  constructor(opts?: GuidesPluginOptions) {
    this.threshold = opts?.threshold ?? 6;
    this.color = opts?.color ?? "#ef4444";
    this.lineWidth = opts?.lineWidth ?? 1;
    this.lineDash = opts?.lineDash ?? [4, 3];
    this.visible = opts?.visible ?? true;
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("mousedown", this.onMouseDown);
  }

  dispose(): void {
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("mousedown", this.onMouseDown);
  }

  private onMouseDown = (e: MouseEvent) => {
    // 检查是否点击在节点上，如果是，则标记开始拖动
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);

    // 使用简单的碰撞检测
    const nodes = this.engine.graph.getNodes();
    for (const node of nodes) {
      const { x, y } = node.position;
      const { width, height } = node.size;

      if (world.x >= x && world.x <= x + width && world.y >= y && world.y <= y + height) {
        this.isDragging = true;
        return;
      }
    }

    // 点击在空白区域，重置状态
    this.guides = [];
    this.active = false;
    this.isDragging = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.visible) {
      this.guides = [];
      this.active = false;
      return;
    }
    // 只有在拖动时才显示对齐线
    if (!this.isDragging) {
      this.guides = [];
      this.active = false;
      return;
    }
    // 检测是否有节点被选中
    const moving = this.engine.graph.getNodes().filter((n) => n.selected);
    if (moving.length === 0) {
      this.guides = [];
      this.active = false;
      return;
    }
    // 大量节点拖动时（例如 > 50），临时禁用对齐线，避免卡顿
    if (moving.length > 50) {
      this.guides = [];
      this.active = false;
      return;
    }

    const others = this.engine.graph.getNodes().filter((n) => !n.selected);
    const thr = this.threshold;
    // 参考线延伸长度：固定屏幕像素40转换为世界坐标
    const lineExtend = 40;
    this.guides = [];

    // 仅在每个轴选取一个"最小位移"的吸附候选，避免多次叠加
    let bestXDelta: number | undefined;
    let bestXLine: GuideLine | undefined;
    let bestYDelta: number | undefined;
    let bestYLine: GuideLine | undefined;

    for (const m of moving) {
      const mx = m.position.x,
        my = m.position.y,
        mw = m.size.width,
        mh = m.size.height;
      const mCenters = { x: mx + mw / 2, y: my + mh / 2 };
      const mEdges = { l: mx, r: mx + mw, t: my, b: my + mh };
      for (const o of others) {
        const ox = o.position.x,
          oy = o.position.y,
          ow = o.size.width,
          oh = o.size.height;
        const oCenters = { x: ox + ow / 2, y: oy + oh / 2 };
        const oEdges = { l: ox, r: ox + ow, t: oy, b: oy + oh };

        // X轴吸附候选（垂直参考线）
        const considerX = (delta: number, xLine: number) => {
          if (Math.abs(delta) <= thr) {
            const line: GuideLine = {
              x1: xLine,
              y1: Math.min(oy, my) - lineExtend,
              x2: xLine,
              y2: Math.max(oy + oh, my + mh) + lineExtend,
            };
            if (bestXDelta === undefined || Math.abs(delta) < Math.abs(bestXDelta)) {
              bestXDelta = delta;
              bestXLine = line;
            }
          }
        };
        // Y轴吸附候选（水平参考线）
        const considerY = (delta: number, yLine: number) => {
          if (Math.abs(delta) <= thr) {
            const line: GuideLine = {
              x1: Math.min(ox, mx) - lineExtend,
              y1: yLine,
              x2: Math.max(ox + ow, mx + mw) + lineExtend,
              y2: yLine,
            };
            if (bestYDelta === undefined || Math.abs(delta) < Math.abs(bestYDelta)) {
              bestYDelta = delta;
              bestYLine = line;
            }
          }
        };

        // 水平中心对齐 -> 影响X
        considerX(oCenters.x - mCenters.x, oCenters.x);
        // 左/右边缘对齐 -> 影响X
        considerX(oEdges.l - mEdges.l, oEdges.l);
        considerX(oEdges.r - mEdges.r, oEdges.r);

        // 垂直中心对齐 -> 影响Y
        considerY(oCenters.y - mCenters.y, oCenters.y);
        // 上/下边缘对齐 -> 影响Y
        considerY(oEdges.t - mEdges.t, oEdges.t);
        considerY(oEdges.b - mEdges.b, oEdges.b);
      }
    }

    // 根据候选生成参考线；为减少与拖拽预览的冲突，这里仅绘制引导线，不强行修改位置
    if (bestXDelta !== undefined || bestYDelta !== undefined) {
      if (bestXLine) this.guides.push(bestXLine);
      if (bestYLine) this.guides.push(bestYLine);
      this.active = true;
    } else {
      this.active = false;
    }
  };

  /**
   * 计算一组移动节点（作为整体）相对于其它节点的最佳吸附 delta（dx, dy）以及对应引导线
   */
  computeSnapFor(
    movingNodes: { x: number; y: number; width: number; height: number }[],
    others: { x: number; y: number; width: number; height: number }[],
  ): { dx?: number; dy?: number; xLine?: GuideLine; yLine?: GuideLine } {
    if (!this.visible) return {};
    const thr = this.threshold;
    // 参考线延伸长度：固定屏幕像素40转换为世界坐标
    const lineExtend = 40 / this.engine.getScale();
    let bestXDelta: number | undefined;
    let bestXLine: GuideLine | undefined;
    let bestYDelta: number | undefined;
    let bestYLine: GuideLine | undefined;

    // 将移动节点整体包围盒作为参考（整体对齐）
    const mx = Math.min(...movingNodes.map((n) => n.x));
    const my = Math.min(...movingNodes.map((n) => n.y));
    const mr = Math.max(...movingNodes.map((n) => n.x + n.width));
    const mb = Math.max(...movingNodes.map((n) => n.y + n.height));
    const mw = mr - mx;
    const mh = mb - my;
    const mCenters = { x: mx + mw / 2, y: my + mh / 2 };
    const mEdges = { l: mx, r: mr, t: my, b: mb };

    for (const o of others) {
      const ox = o.x,
        oy = o.y,
        ow = o.width,
        oh = o.height;
      const oCenters = { x: ox + ow / 2, y: oy + oh / 2 };
      const oEdges = { l: ox, r: ox + ow, t: oy, b: oy + oh };
      const considerX = (delta: number, xLine: number) => {
        if (Math.abs(delta) <= thr) {
          const line: GuideLine = {
            x1: xLine,
            y1: Math.min(oy, my) - lineExtend,
            x2: xLine,
            y2: Math.max(oy + oh, mb) + lineExtend,
          };
          if (bestXDelta === undefined || Math.abs(delta) < Math.abs(bestXDelta)) {
            bestXDelta = delta;
            bestXLine = line;
          }
        }
      };
      const considerY = (delta: number, yLine: number) => {
        if (Math.abs(delta) <= thr) {
          const line: GuideLine = {
            x1: Math.min(ox, mx) - lineExtend,
            y1: yLine,
            x2: Math.max(ox + ow, mr) + lineExtend,
            y2: yLine,
          };
          if (bestYDelta === undefined || Math.abs(delta) < Math.abs(bestYDelta)) {
            bestYDelta = delta;
            bestYLine = line;
          }
        }
      };
      // 水平中心/左右边缘对齐（整体）
      considerX(oCenters.x - mCenters.x, oCenters.x);
      considerX(oEdges.l - mEdges.l, oEdges.l);
      considerX(oEdges.r - mEdges.r, oEdges.r);
      // 垂直中心/上下边缘对齐（整体）
      considerY(oCenters.y - mCenters.y, oCenters.y);
      considerY(oEdges.t - mEdges.t, oEdges.t);
      considerY(oEdges.b - mEdges.b, oEdges.b);
    }
    return { dx: bestXDelta, dy: bestYDelta, xLine: bestXLine, yLine: bestYLine };
  }

  private onMouseUp = () => {
    this.guides = [];
    this.active = false;
    this.isDragging = false;
  };

  afterRender(ctx: CanvasRenderingContext2D): void {
    if (!this.visible || !this.active || this.guides.length === 0) return;

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.setLineDash(this.lineDash);

    // 画在 world -> screen
    for (const g of this.guides) {
      const s1 = this.engine.toScreen({ x: g.x1, y: g.y1 });
      const s2 = this.engine.toScreen({ x: g.x2, y: g.y2 });
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 引擎主题系统回调
  setTheme(theme: { color?: string }): void {
    if (theme.color) this.color = theme.color;
  }
}
