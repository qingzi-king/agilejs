/*
 * @Description: 迷你地图（Minimap）插件（支持鼠标和触摸）
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import { PointerEventAdapter } from "../utils/pointer";

export interface MinimapOptions {
  width?: number; // 迷你图宽（px，屏幕坐标）
  height?: number; // 迷你图高（px，屏幕坐标）
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  margin?: number; // 距离画布边缘的外边距
  padding?: number; // 迷你内容边距
  background?: string;
  borderColor?: string;
  nodeColor?: string;
  edgeColor?: string;
  viewportStroke?: string;
  viewportFill?: string;
  showNodes?: boolean;
  showEdges?: boolean;
  clickToCenter?: boolean;
  draggableViewport?: boolean;
  maxEdgeCountForDraw?: number; // 防止超大图在 minimap 内绘制过慢
  // 聚焦模式：
  // - 'fit'   始终全图适配
  // - 'follow'始终跟随当前视口附近区域（视口在 minimap 中不至于太小）
  // - 'auto'  视口占全图面积比例低于阈值时进入跟随模式，否则全图
  focusMode?: "fit" | "follow" | "auto";
  // 当 focusMode 为 'auto' 时使用的阈值（视口面积/全图面积），低于该值开启跟随
  focusViewportAreaThreshold?: number; // 默认 0.08 = 8%
  // 跟随模式下以视口为中心向四周扩展的比例（按视口宽高的比例扩展）
  focusPadding?: number; // 默认 0.25 = 25%
  // Auto 平滑：在 [autoBlendLow, autoBlendHigh] 区间内按比例在 fit 与 follow 之间插值
  autoBlendLow?: number; // 默认与 focusViewportAreaThreshold 相同（0.08）
  autoBlendHigh?: number; // 默认 0.16
  // 响应式尺寸：当画布缩小时，minimap 按比例缩小，保持宽高比
  responsive?: boolean; // 默认 true
  widthRatio?: number; // 相对画布宽度的比例（默认 0.22）
  minWidth?: number; // 最小宽度（默认 120）
  maxWidth?: number; // 最大宽度（默认为初始 width）
  // 内容缩放同步：当主画布缩放时，minimap 节点内容按相同比例收缩（仅在缩小时生效，放大不超过 fit 尺寸，避免溢出）
  syncContentWithZoom?: boolean; // 默认 true
}

type Rect = { x: number; y: number; w: number; h: number };

export class MinimapPlugin implements Plugin {
  readonly id = "minimap";
  private engine!: CanvasEngine;
  private opts: Required<MinimapOptions>;

  // 最近一帧的几何映射缓存（用于交互命中与拖拽计算）
  private miniRect: Rect | null = null; // 迷你图整体矩形（屏幕坐标）
  private contentRect: Rect | null = null; // 迷你图内容区域（去掉 padding）
  private worldBounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  private scaleMini = 1; // world -> minimap 的缩放
  private viewportMini: Rect | null = null; // 当前视口在 minimap 中的矩形
  // 用于绘制/映射的当前展示范围（可能是全图，也可能是“视口聚焦”后的子范围）
  private displayBounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  // 当前内容在 minimap 内容区域内的居中原点（左上角），配合 scaleMini 使用
  private contentOrigin = { x: 0, y: 0 };

  // 交互状态
  private dragging = false;
  private dragOffsetMini = { dx: 0, dy: 0 }; // 鼠标相对 viewportMini 左上角的偏移（minimap 坐标）

  constructor(options: MinimapOptions = {}) {
    this.opts = {
      width: options.width ?? 200,
      height: options.height ?? 140,
      position: options.position ?? "bottom-right",
      margin: options.margin ?? 12,
      padding: options.padding ?? 6,
      background: options.background ?? "rgba(0,0,0,0.04)",
      borderColor: options.borderColor ?? "#F4F4F4",
      nodeColor: options.nodeColor ?? "#CCC",
      edgeColor: options.edgeColor ?? "#94a3b8",
      viewportStroke: options.viewportStroke ?? "#3b82f6",
      viewportFill: options.viewportFill ?? "rgba(59,130,246,0.18)",
      showNodes: options.showNodes ?? true,
      showEdges: options.showEdges ?? false,
      clickToCenter: options.clickToCenter ?? true,
      draggableViewport: options.draggableViewport ?? true,
      maxEdgeCountForDraw: options.maxEdgeCountForDraw ?? 1500,
      focusMode: options.focusMode ?? "auto",
      focusViewportAreaThreshold: options.focusViewportAreaThreshold ?? 0.08,
      focusPadding: options.focusPadding ?? 0.25,
      autoBlendLow: options.autoBlendLow ?? options.focusViewportAreaThreshold ?? 0.08,
      autoBlendHigh: options.autoBlendHigh ?? 0.16,
      responsive: options.responsive ?? true,
      widthRatio: options.widthRatio ?? 0.22,
      minWidth: options.minWidth ?? 120,
      maxWidth: options.maxWidth ?? options.width ?? 200,
      syncContentWithZoom: options.syncContentWithZoom ?? true,
    };
  }

  // 供引擎主题系统调用：仅更新颜色相关字段，保持几何配置不变
  setTheme(theme: {
    background?: string;
    borderColor?: string;
    nodeColor?: string;
    edgeColor?: string;
    viewportStroke?: string;
    viewportFill?: string;
  }): void {
    if (theme.background) this.opts.background = theme.background;
    if (theme.borderColor) this.opts.borderColor = theme.borderColor;
    if (theme.nodeColor) this.opts.nodeColor = theme.nodeColor;
    if (theme.edgeColor) this.opts.edgeColor = theme.edgeColor;
    if (theme.viewportStroke) this.opts.viewportStroke = theme.viewportStroke;
    if (theme.viewportFill) this.opts.viewportFill = theme.viewportFill;
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    const c = engine.canvas;

    // 鼠标事件
    c.addEventListener("mousedown", this.onMouseDown, true);
    window.addEventListener("mousemove", this.onMouseMove, true);
    window.addEventListener("mouseup", this.onMouseUp, true);

    // 触摸事件
    c.addEventListener("touchstart", this.onTouchStart, { capture: true, passive: false });
    c.addEventListener("touchmove", this.onTouchMove, { capture: true, passive: false });
    c.addEventListener("touchend", this.onTouchEnd, { capture: true });
    c.addEventListener("touchcancel", this.onTouchEnd, { capture: true });
  }

  dispose(): void {
    const c = this.engine.canvas;

    // 清理鼠标事件
    c.removeEventListener("mousedown", this.onMouseDown, true);
    window.removeEventListener("mousemove", this.onMouseMove, true);
    window.removeEventListener("mouseup", this.onMouseUp, true);

    // 清理触摸事件
    c.removeEventListener("touchstart", this.onTouchStart as any);
    c.removeEventListener("touchmove", this.onTouchMove as any);
    c.removeEventListener("touchend", this.onTouchEnd as any);
    c.removeEventListener("touchcancel", this.onTouchEnd as any);
  }

  // === 事件 ===
  private onMouseDown = (e: MouseEvent) => {
    const mini = this.miniRect;
    if (!mini) return;
    const rect = this.engine.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    if (!(sx >= mini.x && sx <= mini.x + mini.w && sy >= mini.y && sy <= mini.y + mini.h)) return;

    // 命中 minimap
    const vp = this.viewportMini;
    if (this.opts.draggableViewport && vp && sx >= vp.x && sx <= vp.x + vp.w && sy >= vp.y && sy <= vp.y + vp.h) {
      // 拖拽视口
      this.dragging = true;
      this.dragOffsetMini.dx = sx - vp.x;
      this.dragOffsetMini.dy = sy - vp.y;
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    if (this.opts.clickToCenter) {
      // 点击居中：将点击处映射到世界坐标，然后让其居于主视口中心
      this.centerViewportAtScreenPoint(sx, sy);
      e.stopPropagation();
      e.preventDefault();
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.dragging) return;
    const mini = this.miniRect,
      content = this.contentRect,
      bounds = this.displayBounds,
      vp = this.viewportMini;
    if (!mini || !content || !bounds || !vp) return;

    const rect = this.engine.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    let targetMiniX = sx - this.dragOffsetMini.dx; // 目标 viewport 左上角（minimap坐标）
    let targetMiniY = sy - this.dragOffsetMini.dy;

    // 约束：viewport 不应移出 content 区域
    if (vp.w >= content.w) {
      targetMiniX = content.x + (content.w - vp.w) / 2;
    } else {
      const minX = content.x;
      const maxX = content.x + content.w - vp.w;
      targetMiniX = Math.max(minX, Math.min(targetMiniX, maxX));
    }
    if (vp.h >= content.h) {
      targetMiniY = content.y + (content.h - vp.h) / 2;
    } else {
      const minY = content.y;
      const maxY = content.y + content.h - vp.h;
      targetMiniY = Math.max(minY, Math.min(targetMiniY, maxY));
    }

    // 将 minimap 视口左上角转换到世界坐标（使用当前展示范围 displayBounds）
    const worldMinX = bounds.minX + (targetMiniX - this.contentOrigin.x) / this.scaleMini;
    const worldMinY = bounds.minY + (targetMiniY - this.contentOrigin.y) / this.scaleMini;

    // 应用到引擎平移（保持当前缩放不变）
    const s = this.engine.getScale();
    this.engine.setTranslation(-worldMinX * s, -worldMinY * s);

    e.stopPropagation();
    e.preventDefault();
  };

  private onMouseUp = () => {
    this.dragging = false;
  };

  // ========== 触摸事件处理 ==========

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;

    const mini = this.miniRect;
    if (!mini) return;

    const touch = e.touches[0];
    const rect = this.engine.canvas.getBoundingClientRect();
    const sx = touch.clientX - rect.left;
    const sy = touch.clientY - rect.top;

    // 检查是否在 minimap 区域内
    if (!(sx >= mini.x && sx <= mini.x + mini.w && sy >= mini.y && sy <= mini.y + mini.h)) return;

    // 命中 minimap
    const vp = this.viewportMini;
    if (this.opts.draggableViewport && vp && sx >= vp.x && sx <= vp.x + vp.w && sy >= vp.y && sy <= vp.y + vp.h) {
      // 拖拽视口
      this.dragging = true;
      this.dragOffsetMini.dx = sx - vp.x;
      this.dragOffsetMini.dy = sy - vp.y;
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    if (this.opts.clickToCenter) {
      // 触摸点击居中
      this.centerViewportAtScreenPoint(sx, sy);
      e.stopPropagation();
      e.preventDefault();
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (!this.dragging || e.touches.length !== 1) return;

    const mini = this.miniRect,
      content = this.contentRect,
      bounds = this.displayBounds,
      vp = this.viewportMini;
    if (!mini || !content || !bounds || !vp) return;

    const touch = e.touches[0];
    const rect = this.engine.canvas.getBoundingClientRect();
    const sx = touch.clientX - rect.left;
    const sy = touch.clientY - rect.top;

    let targetMiniX = sx - this.dragOffsetMini.dx;
    let targetMiniY = sy - this.dragOffsetMini.dy;

    // 约束：viewport 不应移出 content 区域
    if (vp.w >= content.w) {
      targetMiniX = content.x + (content.w - vp.w) / 2;
    } else {
      const minX = content.x;
      const maxX = content.x + content.w - vp.w;
      targetMiniX = Math.max(minX, Math.min(targetMiniX, maxX));
    }
    if (vp.h >= content.h) {
      targetMiniY = content.y + (content.h - vp.h) / 2;
    } else {
      const minY = content.y;
      const maxY = content.y + content.h - vp.h;
      targetMiniY = Math.max(minY, Math.min(targetMiniY, maxY));
    }

    // 将 minimap 视口左上角转换到世界坐标
    const worldMinX = bounds.minX + (targetMiniX - this.contentOrigin.x) / this.scaleMini;
    const worldMinY = bounds.minY + (targetMiniY - this.contentOrigin.y) / this.scaleMini;

    // 应用到引擎平移
    const s = this.engine.getScale();
    this.engine.setTranslation(-worldMinX * s, -worldMinY * s);

    e.stopPropagation();
    e.preventDefault();
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) {
      this.dragging = false;
    }
  };

  private centerViewportAtScreenPoint(sx: number, sy: number) {
    const content = this.contentRect,
      bounds = this.displayBounds;
    if (!content || !bounds) return;
    // minimap -> world
    let worldX = bounds.minX + (sx - this.contentOrigin.x) / this.scaleMini;
    let worldY = bounds.minY + (sy - this.contentOrigin.y) / this.scaleMini;
    const s = this.engine.getScale();
    // 使用引擎提供的 CSS 尺寸
    const cssSize = (this.engine as any).getCssSize?.() || { width: 0, height: 0 };
    let cssW = cssSize.width;
    let cssH = cssSize.height;
    if (cssW <= 0 || cssH <= 0) {
      const dpr = (window as any).devicePixelRatio || 1;
      cssW = this.engine.canvas.width / dpr;
      cssH = this.engine.canvas.height / dpr;
    }
    const cx = cssW / 2, cy = cssH / 2;
    // 约束：将视口居中到点击点，但不允许视口超出内容边界
    const invS = 1 / s;
    const worldViewW = cssW * invS;
    const worldViewH = cssH * invS;
    // 用当前展示范围约束点击后的中心，但最终的 setTranslation 仍然受整个 worldBounds 限制
    const worldW = bounds.maxX - bounds.minX;
    const worldH = bounds.maxY - bounds.minY;
    if (worldViewW < worldW) {
      const minCX = bounds.minX + worldViewW / 2;
      const maxCX = bounds.maxX - worldViewW / 2;
      worldX = Math.max(minCX, Math.min(worldX, maxCX));
    } else {
      worldX = (bounds.minX + bounds.maxX) / 2;
    }
    if (worldViewH < worldH) {
      const minCY = bounds.minY + worldViewH / 2;
      const maxCY = bounds.maxY - worldViewH / 2;
      worldY = Math.max(minCY, Math.min(worldY, maxCY));
    } else {
      worldY = (bounds.minY + bounds.maxY) / 2;
    }
    this.engine.setTranslation(cx - worldX * s, cy - worldY * s);
  }

  // === 绘制 ===
  afterRender(ctx: CanvasRenderingContext2D): void {
    // 使用引擎提供的 CSS 尺寸，避免 DPR 降级时计算错误
    const cssSize = (this.engine as any).getCssSize?.() || { width: 0, height: 0 };
    let cssW = cssSize.width;
    let cssH = cssSize.height;
    // 兜底：如果 getCssSize 返回 0，使用传统计算方式
    if (cssW <= 0 || cssH <= 0) {
      const dpr = (window as any).devicePixelRatio || 1;
      cssW = this.engine.canvas.width / dpr;
      cssH = this.engine.canvas.height / dpr;
    }

    const baseW = this.opts.width;
    const baseH = this.opts.height;
    const aspect = baseW / Math.max(1, baseH);
    const availW = Math.max(20, cssW - this.opts.margin * 2);
    const availH = Math.max(20, cssH - this.opts.margin * 2);

    let w = baseW;
    let h = baseH;
    if (this.opts.responsive) {
      // 先基于画布宽度按比例得到目标宽度（不放大到超过 base/maxWidth）
      const wByRatio = Math.max(0, this.opts.widthRatio) * cssW;
      w = Math.min(this.opts.maxWidth, Math.min(baseW, Math.max(this.opts.minWidth, wByRatio)));
      h = Math.max(1, w / aspect);
      // 再确保能放入可用区域（必要时进一步缩小）
      if (h > availH) {
        h = availH;
        w = Math.max(1, h * aspect);
      }
      if (w > availW) {
        w = availW;
        h = Math.max(1, w / aspect);
      }
    }
    const margin = this.opts.margin;
    let x = margin,
      y = margin;
    switch (this.opts.position) {
      case "top-right":
        x = cssW - w - margin;
        y = margin;
        break;
      case "bottom-left":
        x = margin;
        y = cssH - h - margin;
        break;
      case "bottom-right":
        x = cssW - w - margin;
        y = cssH - h - margin;
        break;
      case "top-left":
      default:
        x = margin;
        y = margin;
        break;
    }
    this.miniRect = { x, y, w, h };

    // 背板
    ctx.save();
    ctx.fillStyle = this.opts.background;
    ctx.strokeStyle = this.opts.borderColor;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.restore();

    // 图形总 bounds（世界坐标）
    const bounds = this.computeWorldBounds();
    if (!bounds) return; // 无内容
    this.worldBounds = bounds;

    const contentPad = this.opts.padding;
    const content = {
      x: x + contentPad,
      y: y + contentPad,
      w: Math.max(1, w - contentPad * 2),
      h: Math.max(1, h - contentPad * 2),
    };
    this.contentRect = content;

    // 计算主视口在世界坐标中的矩形（不受 displayBounds 影响）
    const sMain = this.engine.getScale();
    const invSMain = 1 / sMain;
    const viewMinXWorld = -this.engine.getTranslation().x * invSMain;
    const viewMinYWorld = -this.engine.getTranslation().y * invSMain;
    const viewWWorld = cssW * invSMain;
    const viewHWorld = cssH * invSMain;
    const viewportWorld = { x: viewMinXWorld, y: viewMinYWorld, w: viewWWorld, h: viewHWorld };

    // 根据 focus 模式确定展示范围 displayBounds（auto 支持平滑插值）
    const worldW = Math.max(1, bounds.maxX - bounds.minX);
    const worldH = Math.max(1, bounds.maxY - bounds.minY);
    const areaWorld = worldW * worldH;
    const areaView = Math.max(1, viewWWorld * viewHWorld);
    const frac = Math.min(1, areaView / areaWorld);
    // 计算 followBounds（视口中心 + padding 扩展，并夹在 worldBounds 内）
    const focusPad = this.opts.focusPadding;
    const padX = viewportWorld.w * focusPad;
    const padY = viewportWorld.h * focusPad;
    let fMinX = viewportWorld.x - padX;
    let fMinY = viewportWorld.y - padY;
    let fMaxX = viewportWorld.x + viewportWorld.w + padX;
    let fMaxY = viewportWorld.y + viewportWorld.h + padY;
    fMinX = Math.max(bounds.minX, fMinX);
    fMinY = Math.max(bounds.minY, fMinY);
    fMaxX = Math.min(bounds.maxX, fMaxX);
    fMaxY = Math.min(bounds.maxY, fMaxY);
    if (fMaxX - fMinX < 1) {
      const c = (fMinX + fMaxX) / 2;
      fMinX = c - 0.5;
      fMaxX = c + 0.5;
    }
    if (fMaxY - fMinY < 1) {
      const c = (fMinY + fMaxY) / 2;
      fMinY = c - 0.5;
      fMaxY = c + 0.5;
    }

    let disp = bounds;
    if (this.opts.syncContentWithZoom) {
      // 同步内容缩放时，minimap 始终以全图为展示范围，避免“内容放大溢出”的问题
      disp = bounds;
    } else if (this.opts.focusMode === "fit") {
      disp = bounds;
    } else if (this.opts.focusMode === "follow") {
      disp = { minX: fMinX, minY: fMinY, maxX: fMaxX, maxY: fMaxY };
    } else {
      // auto：在 [autoBlendLow, autoBlendHigh] 区间内平滑混合 fit 与 follow
      const low = Math.max(0, Math.min(1, this.opts.autoBlendLow));
      const high = Math.max(low, Math.min(1, this.opts.autoBlendHigh));
      let t: number;
      if (frac <= low)
        t = 0; // 完全 follow
      else if (frac >= high)
        t = 1; // 完全 fit
      else t = (frac - low) / Math.max(1e-6, high - low); // 0..1
      const lerp = (a: number, b: number, k: number) => a * k + b * (1 - k);
      disp = {
        minX: lerp(bounds.minX, fMinX, t),
        minY: lerp(bounds.minY, fMinY, t),
        maxX: lerp(bounds.maxX, fMaxX, t),
        maxY: lerp(bounds.maxY, fMaxY, t),
      };
    }
    this.displayBounds = disp;

    const dispW = Math.max(1, disp.maxX - disp.minX);
    const dispH = Math.max(1, disp.maxY - disp.minY);
    const scaleX = content.w / dispW;
    const scaleY = content.h / dispH;
    let scaleFit = Math.min(scaleX, scaleY);
    if (this.opts.syncContentWithZoom) {
      // 与主画布缩放同步：当主画布缩小时（s<1），minimap 内容按比例缩小；
      // 当主画布放大时（s>=1），避免内容超过 fit 尺寸（不溢出）。
      const s = this.engine.getScale();
      this.scaleMini = Math.min(scaleFit, scaleFit * s);
    } else {
      this.scaleMini = scaleFit;
    }
    // 在内容区域内居中显示（防止左上角顶满），保持相对位置
    const scaledW = dispW * this.scaleMini;
    const scaledH = dispH * this.scaleMini;
    this.contentOrigin.x = content.x + (content.w - scaledW) / 2;
    this.contentOrigin.y = content.y + (content.h - scaledH) / 2;

    const toMini = (wx: number, wy: number) => ({
      x: this.contentOrigin.x + (wx - disp.minX) * this.scaleMini,
      y: this.contentOrigin.y + (wy - disp.minY) * this.scaleMini,
    });

    // 画边（优化：edge-polyline 使用折线近似；其他类型仍用中心直线）
    if (this.opts.showEdges) {
      const edges = this.engine.graph.getEdges();
      if (edges.length <= this.opts.maxEdgeCountForDraw) {
        ctx.save();
        ctx.strokeStyle = this.opts.edgeColor;
        ctx.lineWidth = 1;
        for (const e of edges) {
          const s = this.engine.graph.getNode(e.source);
          const t = this.engine.graph.getNode(e.target);
          if (!s || !t) continue;
          const start = { x: s.position.x + s.size.width / 2, y: s.position.y + s.size.height / 2 };
          const end = { x: t.position.x + t.size.width / 2, y: t.position.y + t.size.height / 2 };
          // 对于折线边，拼接中间点以更贴近真实形状（端点仍近似为中心点，性能友好）
          if (e.shape === "edge-polyline" && Array.isArray(e.points) && e.points.length > 0) {
            ctx.beginPath();
            const p0 = toMini(start.x, start.y);
            ctx.moveTo(p0.x, p0.y);
            const maxSeg = 512; // 安全上限，避免异常大数据
            const cnt = Math.min(maxSeg, e.points.length);
            for (let i = 0; i < cnt; i++) {
              const p = toMini(e.points[i].x, e.points[i].y);
              ctx.lineTo(p.x, p.y);
            }
            const p1 = toMini(end.x, end.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          } else {
            // 其他类型维持原有中心直线，成本最低
            const p0 = toMini(start.x, start.y);
            const p1 = toMini(end.x, end.y);
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }

    // 画节点
    if (this.opts.showNodes) {
      ctx.save();
      ctx.fillStyle = this.opts.nodeColor;
      ctx.strokeStyle = this.opts.nodeColor;
      ctx.lineWidth = 1;
      for (const n of this.engine.graph.getNodes()) {
        // 特化：line 节点按折线绘制，更贴近真实形状
        if (n.shape === "line") {
          const pointsWorld = this.getLineNodePointsWorld(n);
          if (pointsWorld.length >= 2) {
            // 转到 minimap 坐标并绘制
            ctx.beginPath();
            const p0m = toMini(pointsWorld[0].x, pointsWorld[0].y);
            ctx.moveTo(p0m.x, p0m.y);
            const maxSeg = 256;
            for (let i = 1; i < Math.min(maxSeg, pointsWorld.length); i++) {
              const pm = toMini(pointsWorld[i].x, pointsWorld[i].y);
              ctx.lineTo(pm.x, pm.y);
            }
            ctx.stroke();
            continue;
          }
          // 若异常退化则回退为点
          const center = toMini(n.position.x + n.size.width / 2, n.position.y + n.size.height / 2);
          ctx.fillRect(Math.round(center.x), Math.round(center.y), 1, 1);
          continue;
        }

        // 其余节点：使用旋转后的四角多边形（原逻辑）
        const x = n.position.x,
          y = n.position.y,
          wN = n.size.width,
          hN = n.size.height;
        const rot = (n.rotation ?? 0) % 360;
        const cx = x + wN / 2,
          cy = y + hN / 2;
        const rad = (rot * Math.PI) / 180;
        const corners = [
          { x, y },
          { x: x + wN, y },
          { x: x + wN, y: y + hN },
          { x, y: y + hN },
        ]
          .map((p) => this.rotatePoint(p, { x: cx, y: cy }, rad))
          .map((p) => toMini(p.x, p.y));
        const minX = Math.min(corners[0].x, corners[1].x, corners[2].x, corners[3].x);
        const maxX = Math.max(corners[0].x, corners[1].x, corners[2].x, corners[3].x);
        const minY = Math.min(corners[0].y, corners[1].y, corners[2].y, corners[3].y);
        const maxY = Math.max(corners[0].y, corners[1].y, corners[2].y, corners[3].y);
        const ww = maxX - minX,
          hh = maxY - minY;
        if (ww < 1 && hh < 1) {
          ctx.fillRect(Math.round((minX + maxX) / 2), Math.round((minY + maxY) / 2), 1, 1);
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        ctx.lineTo(corners[1].x, corners[1].y);
        ctx.lineTo(corners[2].x, corners[2].y);
        ctx.lineTo(corners[3].x, corners[3].y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // 画视口矩形
    const invS = 1 / this.engine.getScale();
    const viewMinX = -this.engine.getTranslation().x * invS;
    const viewMinY = -this.engine.getTranslation().y * invS;
    const viewW = cssW * invS;
    const viewH = cssH * invS;
    const v0 = toMini(viewMinX, viewMinY);
    const v1 = toMini(viewMinX + viewW, viewMinY + viewH);
    // 原始视口框（未约束）
    let left = Math.min(v0.x, v1.x);
    let right = Math.max(v0.x, v1.x);
    let top = Math.min(v0.y, v1.y);
    let bottom = Math.max(v0.y, v1.y);
    // 约束在内容区内
    const minCx = content.x,
      maxCx = content.x + content.w;
    const minCy = content.y,
      maxCy = content.y + content.h;
    left = Math.max(minCx, Math.min(left, maxCx));
    right = Math.max(minCx, Math.min(right, maxCx));
    top = Math.max(minCy, Math.min(top, maxCy));
    bottom = Math.max(minCy, Math.min(bottom, maxCy));
    let vw = Math.max(4, right - left);
    let vh = Math.max(4, bottom - top);
    if (vw > content.w) {
      vw = content.w;
      left = content.x;
    }
    if (vh > content.h) {
      vh = content.h;
      top = content.y;
    }
    // 若被压成 0 宽（完全在外侧），给最小尺寸并贴边
    if (right - left < 4) {
      left = Math.max(content.x, Math.min(left - 2, content.x + content.w - 4));
      vw = 4;
    }
    if (bottom - top < 4) {
      top = Math.max(content.y, Math.min(top - 2, content.y + content.h - 4));
      vh = 4;
    }
    const vp = { x: left, y: top, w: vw, h: vh };
    this.viewportMini = vp;

    ctx.save();
    ctx.fillStyle = this.opts.viewportFill;
    ctx.strokeStyle = this.opts.viewportStroke;
    ctx.lineWidth = 1;
    ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
    ctx.strokeRect(vp.x + 0.5, vp.y + 0.5, vp.w - 1, vp.h - 1);
    ctx.restore();
  }

  // 计算包含旋转的节点 AABB
  private nodeAABB(n: import("../model/Graph").NodeData): { x: number; y: number; w: number; h: number } {
    const x = n.position.x,
      y = n.position.y,
      w = n.size.width,
      h = n.size.height;
    const rot = (n.rotation ?? 0) % 360;
    if (!rot) return { x, y, w, h };
    const rad = (rot * Math.PI) / 180;
    const cx = x + w / 2,
      cy = y + h / 2;
    const corners = [
      { x: x, y: y },
      { x: x + w, y: y },
      { x: x + w, y: y + h },
      { x: x, y: y + h },
    ].map((p) => this.rotatePoint(p, { x: cx, y: cy }, rad));
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of corners) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  private rotatePoint(p: { x: number; y: number }, c: { x: number; y: number }, rad: number) {
    const dx = p.x - c.x,
      dy = p.y - c.y;
    const cos = Math.cos(rad),
      sin = Math.sin(rad);
    return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
  }

  // 计算 line 节点的世界坐标折线点（按节点 data.line.pointsNormalized + 旋转）
  private getLineNodePointsWorld(n: import("../model/Graph").NodeData): Array<{ x: number; y: number }> {
    const data: any = n.data || {};
    const cfg = data.line || {};
    const arr: Array<{ u: number; v: number }> =
      Array.isArray(cfg.pointsNormalized) && cfg.pointsNormalized.length >= 2
        ? cfg.pointsNormalized
        : [
            { u: 0.1, v: 0.9 },
            { u: 0.9, v: 0.1 },
          ];
    const { x, y } = n.position;
    const { width: w, height: h } = n.size;
    const cx = x + w / 2,
      cy = y + h / 2;
    const rad = ((n.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(rad),
      sin = Math.sin(rad);
    const toWorld = (px: number, py: number) => {
      const dx = px - cx,
        dy = py - cy;
      return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
    };
    return arr.map((p) => toWorld(x + p.u * w, y + p.v * h));
  }

  private computeWorldBounds(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    const nodes = this.engine.graph.getNodes();
    if (!nodes.length) return null;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      const a = this.nodeAABB(n);
      if (a.w <= 0 || a.h <= 0) continue;
      if (a.x < minX) minX = a.x;
      if (a.y < minY) minY = a.y;
      if (a.x + a.w > maxX) maxX = a.x + a.w;
      if (a.y + a.h > maxY) maxY = a.y + a.h;
    }
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return null;
    return { minX, minY, maxX, maxY };
  }
}
