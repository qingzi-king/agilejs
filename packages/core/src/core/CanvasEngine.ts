/*
 * @Description:  Canvas 引擎核心
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-12-22 21:37:33
 */
import { EventBus } from "./EventBus";
import { CommandHistory } from "./CommandHistory";
import { Graph } from "../model/Graph";
import { RendererRegistry } from "../renderer/RendererRegistry";
import { PluginManager } from "../plugins/PluginManager";
import { AnimationManager } from "./Animation";
import { THEME_PALETTES, CoreThemeName, mergePalette } from "./Themes";
import { buildQuadtreeFromNodes, Quadtree } from "../utils/quadtree";
import { PerformanceMonitor, PerformanceStats } from "./PerformanceMonitor";

export interface EngineEvents {
  "engine:tick": { time: number };
  "engine:resize": { width: number; height: number };
  "engine:theme-change": { theme: string };
  "graph:change": { reason: string };
  "graph:selection-change": { nodes: string[]; edges: string[]; reason: string };

  // Node interaction
  "node:click": { nodeId: string; event: MouseEvent | TouchEvent };
  "node:removed": { node: import("../model/Graph").NodeData };
  "node:drag-start": {
    nodeId: string;
    selectedNodeIds: string[];
    screen: { x: number; y: number };
    world: { x: number; y: number };
  };
  "node:drag-move": {
    nodeId: string;
    dx: number;
    dy: number;
    screen: { x: number; y: number };
    world: { x: number; y: number };
  };
  "node:drag-end": { nodeId: string; selectedNodeIds: string[] };

  // Edge interaction
  "edge:click": { edgeId: string; event: MouseEvent | TouchEvent };
  "edge:removed": { edge: import("../model/Graph").EdgeData };

  // Canvas interaction
  "canvas:click": { event: MouseEvent | TouchEvent };
  "canvas:box-select-start": { start: { x: number; y: number }; additive: boolean };
  "canvas:box-select-change": {
    start: { x: number; y: number };
    current: { x: number; y: number };
    rect: { x: number; y: number; width: number; height: number };
    additive: boolean;
  };
  "canvas:box-select-end": {
    start: { x: number; y: number };
    end: { x: number; y: number };
    rect: { x: number; y: number; width: number; height: number };
    additive: boolean;
    canceled: boolean;
    selected: string[];
  };

  // Group interaction
  "group:resize-start": {
    nodeIds: string[];
    handle: string;
    startRect: { x: number; y: number; w: number; h: number };
    angleRad: number | null;
  };
  "group:resize-move": { nodeIds: string[]; handle: string; scale: { sx: number; sy: number }; angleRad: number };
  "group:resize-end": { nodeIds: string[]; updates: any[]; handle: string };
  "group:rotate-start": { nodeIds: string[]; center: { x: number; y: number }; angleRad: number };
  "group:rotate-move": { nodeIds: string[]; deltaRad: number; center: { x: number; y: number } };
  "group:rotate-end": { nodeIds: string[]; updates: any[] };
}

export type EngineMode = "edit" | "view" | "none";

/**
 * 交互控制配置：全局禁用/启用特定交互功能
 */
export interface InteractionConfig {
  /** 是否允许缩放操作（鼠标滚轮缩放）。默认 true */
  enableZoom?: boolean;
  /** 是否允许平移操作（拖动画布）。默认 true */
  enablePan?: boolean;
  /** 是否允许选中节点。默认 true */
  enableSelection?: boolean;
  /** 是否允许拖拽节点。默认 true */
  enableDrag?: boolean;
  /** 是否允许调整节点尺寸。默认 true */
  enableResize?: boolean;
  /** 是否允许旋转节点。默认 true */
  enableRotate?: boolean;
  /** 最小缩放比例。默认 0.1 */
  minScale?: number;
  /** 最大缩放比例。默认 10 */
  maxScale?: number;
}

export interface EngineOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
  background?: string;
  /** 运行模式：编辑/预览/无。影响交互类插件（如数据提示）是否启用。默认 'edit' */
  mode?: EngineMode;
  /** 交互控制配置：全局控制缩放、平移、选中、拖拽等功能 */
  interactionConfig?: InteractionConfig;
  /**
   * 边快照模式：
   * - 'auto'（默认）：无动态流动效果时使用快照；有 flow 动画时每帧重建
   * - 'off'：关闭快照，改为每帧在 world-space 绘制边
   * - 'always'：始终使用快照（即使存在 flow 动画，动画会被“冻结”）
   */
  edgeSnapshot?: "auto" | "off" | "always";
  /**
   * 拖拽时边渲染的降质阈值：当可视范围内的节点/边数量超过阈值时，拖动过程不渲染边。
   * @default { nodes: 400, edges: 800 }
   */
  dragEdgeRenderThreshold?: { nodes?: number; edges?: number };
  /**
   * 在重负载场景中（平移/拖动或总体数量过大）标签的绘制阈值。
   * 满足任一阈值将跳过对应的标签绘制，以保障交互帧率。
   * @default { nodes: 1500, edges: 3000 }
   */
  labelRenderThreshold?: { nodes?: number; edges?: number };
  /**
   * 性能优化：大规模场景降质阈值（基于总数量，而非可视数量）
   * 当图形总数超过此阈值时，拖拽/平移自动采用激进降质策略
   * @default { totalNodes: 5000, totalEdges: 10000 }
   */
  aggressiveDegradation?: { totalNodes?: number; totalEdges?: number };
  /**
   * 空间索引（四叉树）参数：用于可视裁剪与计数。默认启用；拖拽中默认禁用以避免频繁重建开销。
   */
  spatialIndex?: {
    enabled?: boolean;
    maxItems?: number;
    maxDepth?: number;
    disableDuringDrag?: boolean;
    padding?: number;
  };
  /**
   * DPR 动态降级配置：在高 DPR 设备（如 Retina 屏幕）上，交互时自动降低渲染分辨率以提升流畅度。
   * @default { enabled: true, threshold: 1.5, panTarget: 1.5, dragTarget: 1 }
   */
  dprDegradation?: {
    /** 是否启用 DPR 降级。默认 true */
    enabled?: boolean;
    /** 触发降级的 DPR 阈值，低于此值不降级。默认 1.5 */
    threshold?: number;
    /** 平移画布时的目标 DPR（较高，减少模糊）。默认 1.5 */
    panTarget?: number;
    /** 拖动节点时的目标 DPR（较低，优先流畅）。默认 1 */
    dragTarget?: number;
  };
}

export class CanvasEngine {
  static readonly defaultTheme: CoreThemeName = "light";
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly events = new EventBus<EngineEvents & { [key: string]: any }>();
  readonly history = new CommandHistory();
  readonly graph = new Graph();
  readonly renderers = new RendererRegistry();
  readonly plugins = new PluginManager(this);
  readonly animations = new AnimationManager();
  private performanceMonitor = new PerformanceMonitor();

  private animationHandle: number | null = null;
  private running = false;
  private background: string | undefined;
  private isPanning = false; // 是否处于平移中（用于降质渲染）
  private isDraggingNodes = false; // 是否处于节点拖动中（用于降质渲染）
  private draggingNodeCount = 0; // 当前拖拽的节点数量
  // viewport
  private scale = 1;
  private translateX = 0;
  private translateY = 0;
  private resizeObserver?: ResizeObserver;
  private resizeRaf: number | null = null;
  private pendingW: number | null = null;
  private pendingH: number | null = null;
  private edgeSnapshotMode: "auto" | "off" | "always" = "auto";
  private currentTheme: CoreThemeName = CanvasEngine.defaultTheme;
  private onWindowResize = () => {
    const w = this.options.width || this.options.container.clientWidth;
    const h = this.options.height || this.options.container.clientHeight;
    this.scheduleResize(w, h);
  };

  // 离屏边层（屏幕空间）与快照元数据
  private edgesCanvas: HTMLCanvasElement | null = null;
  private edgesCtx: CanvasRenderingContext2D | null = null;
  private edgesSnapshot: {
    graphVersion: number;
    scale: number;
    translateX: number;
    translateY: number;
    dpr: number;
  } | null = null;
  // 拖拽时的边渲染阈值（视口内数量超过则降质：不渲染边）
  private dragRenderNodesMax = 400;
  private dragRenderEdgesMax = 800;
  private labelNodesMax = 1500;
  private labelEdgesMax = 3000;
  // 性能优化：大规模场景激进降质阈值（基于总数量）
  private aggressiveTotalNodes = 5000;
  private aggressiveTotalEdges = 10000;
  // 四叉树空间索引
  private spatialEnabled = true;
  private spatialDisableDuringDrag = true;
  private spatialMaxItems = 16;
  private spatialMaxDepth = 8;
  private spatialPadding = 32;
  private qt: Quadtree<import("../model/Graph").NodeData> | null = null;
  private qtVersion: number = -1;
  private mode: EngineMode = "edit";
  private interactionConfig: Required<InteractionConfig> = {
    enableZoom: true,
    enablePan: true,
    enableSelection: true,
    enableDrag: true,
    enableResize: true,
    enableRotate: true,
    minScale: 0.1,
    maxScale: 10,
  };

  // 性能优化：复用的数组和Set，避免每帧分配
  private _visibleNodesCache: import("../model/Graph").NodeData[] = [];
  private _visibleNodeIds = new Set<string>();
  private _qtResultCache: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    data: import("../model/Graph").NodeData;
  }> = [];
  private _visibleEdgesCache = new Set<string>();
  private _visibleEdgeCacheVersion = -1;
  private _visibleEdgeCacheView = { minX: 0, minY: 0, maxX: 0, maxY: 0, scale: 1 };

  // 性能优化：拖拽时的特殊处理
  private _lastDragSnapshot: HTMLCanvasElement | null = null;  // 拖拽前的边快照
  private _isDraggingModeActive = false;  // 拖拽降质模式激活标志
  private _cachedTotalNodes = 0;  // 缓存的节点总数
  private _cachedTotalEdges = 0;  // 缓存的边总数
  private _cachedCountVersion = -1;  // 缓存版本号
  
  // 性能优化：按需渲染（只在需要时渲染）
  private _needsRender = true;  // 是否需要渲染
  private _lastRenderVersion = -1;  // 上次渲染时的图版本号
  private _lastRenderScale = 1;  // 上次渲染时的缩放
  private _lastRenderTranslateX = 0;  // 上次渲染时的平移X
  private _lastRenderTranslateY = 0;  // 上次渲染时的平移Y
  
  // 性能优化：动态 DPR（高 DPR 设备在交互时降级）
  private _effectiveDpr = 1;  // 当前生效的 DPR
  private _cssWidth = 0;  // CSS 宽度缓存
  private _cssHeight = 0;  // CSS 高度缓存
  private _dprDegradeEnabled = true;  // 是否启用 DPR 降级
  private _dprDegradeThreshold = 1.5;  // 触发降级的 DPR 阈值
  private _dprDegradePanTarget = 1.5;  // 平移时的降级目标 DPR（较高，减少模糊）
  private _dprDegradeDragTarget = 1;  // 拖动时的降级目标 DPR（较低，优先流畅）

  constructor(private options: EngineOptions) {
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D context not available");
    this.ctx = ctx;
    this.options.container.appendChild(this.canvas);
    this.background = options.background;
    this.mode = options.mode ?? "edit";
    this.edgeSnapshotMode = options.edgeSnapshot ?? "auto";
    // 初始化交互配置
    if (options.interactionConfig) {
      if (typeof options.interactionConfig.enableZoom === "boolean")
        this.interactionConfig.enableZoom = options.interactionConfig.enableZoom;
      if (typeof options.interactionConfig.enablePan === "boolean")
        this.interactionConfig.enablePan = options.interactionConfig.enablePan;
      if (typeof options.interactionConfig.enableSelection === "boolean")
        this.interactionConfig.enableSelection = options.interactionConfig.enableSelection;
      if (typeof options.interactionConfig.enableDrag === "boolean")
        this.interactionConfig.enableDrag = options.interactionConfig.enableDrag;
      if (typeof options.interactionConfig.enableResize === "boolean")
        this.interactionConfig.enableResize = options.interactionConfig.enableResize;
      if (typeof options.interactionConfig.enableRotate === "boolean")
        this.interactionConfig.enableRotate = options.interactionConfig.enableRotate;
      if (typeof options.interactionConfig.minScale === "number")
        this.interactionConfig.minScale = options.interactionConfig.minScale;
      if (typeof options.interactionConfig.maxScale === "number")
        this.interactionConfig.maxScale = options.interactionConfig.maxScale;
    }
    if (options.dragEdgeRenderThreshold) {
      if (typeof options.dragEdgeRenderThreshold.nodes === "number")
        this.dragRenderNodesMax = options.dragEdgeRenderThreshold.nodes;
      if (typeof options.dragEdgeRenderThreshold.edges === "number")
        this.dragRenderEdgesMax = options.dragEdgeRenderThreshold.edges;
    }
    if (options.labelRenderThreshold) {
      if (typeof options.labelRenderThreshold.nodes === "number")
        this.labelNodesMax = options.labelRenderThreshold.nodes;
      if (typeof options.labelRenderThreshold.edges === "number")
        this.labelEdgesMax = options.labelRenderThreshold.edges;
    }
    if (options.aggressiveDegradation) {
      if (typeof options.aggressiveDegradation.totalNodes === "number")
        this.aggressiveTotalNodes = options.aggressiveDegradation.totalNodes;
      if (typeof options.aggressiveDegradation.totalEdges === "number")
        this.aggressiveTotalEdges = options.aggressiveDegradation.totalEdges;
    }
    if (options.spatialIndex) {
      const si = options.spatialIndex;
      if (typeof si.enabled === "boolean") this.spatialEnabled = si.enabled;
      if (typeof si.disableDuringDrag === "boolean") this.spatialDisableDuringDrag = si.disableDuringDrag;
      if (typeof si.maxItems === "number") this.spatialMaxItems = si.maxItems;
      if (typeof si.maxDepth === "number") this.spatialMaxDepth = si.maxDepth;
      if (typeof si.padding === "number") this.spatialPadding = si.padding;
    }

    // DPR 降级配置
    if (options.dprDegradation) {
      const dpr = options.dprDegradation;
      if (typeof dpr.enabled === 'boolean') this._dprDegradeEnabled = dpr.enabled;
      if (typeof dpr.threshold === 'number') this._dprDegradeThreshold = dpr.threshold;
      if (typeof dpr.panTarget === 'number') this._dprDegradePanTarget = dpr.panTarget;
      if (typeof dpr.dragTarget === 'number') this._dprDegradeDragTarget = dpr.dragTarget;
    }
    this.resize(options.width ?? this.options.container.clientWidth, options.height ?? this.options.container.clientHeight);
    this.attachDefaultEvents();
    this.attachGraphEvents();

    // 监听容器尺寸变化，自动适配父级节点大小
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        const w = this.options.width || this.options.container.clientWidth;
        const h = this.options.height || this.options.container.clientHeight;
        this.scheduleResize(w, h);
      });
      this.resizeObserver.observe(this.options.container);
    }
  }

  resize(width: number, height: number, forceDpr?: number): void {
    const nativeDpr = window.devicePixelRatio || 1;
    const dpr = forceDpr ?? nativeDpr;
    this._effectiveDpr = dpr;
    this._cssWidth = width;
    this._cssHeight = height;
    
    this.canvas.width = Math.max(1, Math.floor(width * dpr));
    this.canvas.height = Math.max(1, Math.floor(height * dpr));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 同步离屏边画布
    if (!this.edgesCanvas) {
      this.edgesCanvas = document.createElement("canvas");
      const ect = this.edgesCanvas.getContext("2d");
      if (!ect) throw new Error("2D context not available for edgesCanvas");
      this.edgesCtx = ect;
    }
    if (this.edgesCanvas && this.edgesCtx) {
      this.edgesCanvas.width = Math.max(1, Math.floor(width * dpr));
      this.edgesCanvas.height = Math.max(1, Math.floor(height * dpr));
      // 屏幕空间渲染，同样设置 DPR 变换
      this.edgesCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 尺寸变化使快照失效
      this.edgesSnapshot = null;
    }
    // 立刻渲染一帧，避免因尺寸变化导致的瞬时空白（闪动）
    this.render(performance.now());
    this.events.emit("engine:resize", { width, height });
  }
  
  /**
   * 切换到低 DPR 模式（用于拖拽等高频交互）
   * @param mode 交互模式：'pan' 平移（使用较高 DPR 减少模糊），'drag' 拖动（使用较低 DPR 优先流畅）
   */
  private switchToLowDpr(mode: 'pan' | 'drag' = 'drag'): void {
    const nativeDpr = window.devicePixelRatio || 1;
    if (!this._dprDegradeEnabled || nativeDpr <= this._dprDegradeThreshold) return;
    
    // 根据交互模式选择目标 DPR
    const targetDpr = mode === 'pan' ? this._dprDegradePanTarget : this._dprDegradeDragTarget;
    // 确保目标 DPR 不超过原生 DPR
    const finalTarget = Math.min(targetDpr, nativeDpr);
    
    if (this._effectiveDpr === finalTarget) return;  // 已经是目标 DPR
    // 如果当前是拖动模式且已经在更低的 DPR，保持不变
    if (mode === 'pan' && this._effectiveDpr <= this._dprDegradeDragTarget) return;
    
    this.resize(this._cssWidth, this._cssHeight, finalTarget);
  }
  
  /**
   * 恢复到原生 DPR 模式
   */
  private switchToNativeDpr(): void {
    const nativeDpr = window.devicePixelRatio || 1;
    if (this._effectiveDpr === nativeDpr) return;  // 已经是原生 DPR
    this.resize(this._cssWidth, this._cssHeight, nativeDpr);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this._needsRender = true;  // 启动时需要首次渲染
    const loop = (time: number) => {
      if (!this.running) return;
      this.animationHandle = requestAnimationFrame(loop);
      
      // 按需渲染：检查是否真的需要重绘
      const currentVersion = this.graph.getRenderVersion();
      const hasAnimations = this.animations.hasActive();
      const viewportChanged = 
        this.scale !== this._lastRenderScale ||
        this.translateX !== this._lastRenderTranslateX ||
        this.translateY !== this._lastRenderTranslateY;
      const graphChanged = currentVersion !== this._lastRenderVersion;
      // 检测是否有流动动画（边或节点的 flow.enabled）
      const hasDynamicEffects = this.hasDynamicEdgeEffects() || this.hasDynamicNodeEffects();
      
      // 只在以下情况渲染：
      // 1. 显式标记需要渲染
      // 2. 图版本变化
      // 3. 视口变化
      // 4. 有活跃动画或流动效果
      // 5. 正在拖拽或平移（需要持续更新）
      const shouldRender = this._needsRender || 
                           graphChanged || 
                           viewportChanged || 
                           hasAnimations ||
                           hasDynamicEffects ||
                           this.isDraggingNodes ||
                           this.isPanning;
      
      if (shouldRender) {
        this.render(time);
        this._needsRender = false;
        this._lastRenderVersion = currentVersion;
        this._lastRenderScale = this.scale;
        this._lastRenderTranslateX = this.translateX;
        this._lastRenderTranslateY = this.translateY;
      }
      
      this.animations.tick(time);
      this.events.emit("engine:tick", { time });
    };
    this.animationHandle = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    if (this.animationHandle) cancelAnimationFrame(this.animationHandle);
    this.animationHandle = null;
  }

  destroy(): void {
    this.stop();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
    if (this.resizeRaf) {
      cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = null;
    }
    window.removeEventListener("resize", this.onWindowResize);
  }

  /**
   * 获取历史数据（不打印）：
   * - format='object' 返回结构化对象（与 debugSnapshot 一致）
   * - format='array' 返回 { meta, items[] } 扁平数据
   */
  getHistoryData(format: "object" | "array" = "object") {
    return this.history.debugData(format);
  }

  private render(_time: number): void {
    this.performanceMonitor.beginFrame();

    const { ctx, canvas } = this;
    if (this.background) {
      ctx.save();
      ctx.fillStyle = this.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Plugins can draw behind content (screen space)
    this.plugins.emitHook("beforeRender", this.ctx);

    // 计算可视区域（世界坐标）用于裁剪
    const dpr = this._effectiveDpr || (window as any).devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    const invScale = 1 / this.scale;
    const viewMinX = -this.translateX * invScale;
    const viewMinY = -this.translateY * invScale;
    const viewMaxX = viewMinX + cssW * invScale;
    const viewMaxY = viewMinY + cssH * invScale;
    // 确保四叉树（若启用且非拖拽或允许拖拽期间也启用）
    const canUseSpatial = this.spatialEnabled && !(this.spatialDisableDuringDrag && this.isDraggingNodes);
    if (canUseSpatial) this.rebuildSpatialIndexIfNeeded();
    else this.qt = null;
    const viewRect = { x: viewMinX, y: viewMinY, width: viewMaxX - viewMinX, height: viewMaxY - viewMinY };

    // 性能优化：复用数组和Set，避免每帧分配
    this._visibleNodesCache.length = 0;
    this._visibleNodeIds.clear();

    if (canUseSpatial && this.qt) {
      // 使用 quadtree 得到候选节点 id 集合，然后按 graph.getNodes() 的排序过滤（避免每帧排序）
      // 复用查询结果数组
      this._qtResultCache.length = 0;
      this.qt.query(viewRect, this._qtResultCache);

      if (this._qtResultCache.length > 0) {
        // 使用复用的Set标记可见id
        for (let i = 0; i < this._qtResultCache.length; i++) {
          this._visibleNodeIds.add(this._qtResultCache[i].data.id);
        }

        // 只遍历一次节点列表，按原始顺序收集可见节点
        const all = this.graph.getNodes();
        for (let i = 0; i < all.length; i++) {
          const n = all[i];
          if (n.visible === false) continue;
          if (this._visibleNodeIds.has(n.id)) {
            this._visibleNodesCache.push(n);
          }
        }
      }
    } else {
      // 不使用 spatial 时直接用 getNodes 的稳定顺序并做 AABB 裁剪
      const all = this.graph.getNodes();
      for (let i = 0; i < all.length; i++) {
        const n = all[i];
        if (n.visible === false) continue;
        const l = n.position.x,
          t = n.position.y,
          r = l + n.size.width,
          b = t + n.size.height;
        if (!(r < viewMinX || b < viewMinY || l > viewMaxX || t > viewMaxY)) {
          this._visibleNodesCache.push(n);
        }
      }
    }

    // Pass 1: 绘制容器节点（作为背景，位于边层之下）
    ctx.save();
    ctx.translate(this.translateX, this.translateY);
    ctx.scale(this.scale, this.scale);
    for (const node of this._visibleNodesCache) {
      if (node.isContainer) {
        const renderer = this.renderers.get(node.shape);
        const style: any = node.data?.style;
        const flow = style?.flow;
        const needDashOffset = !!(flow && flow.enabled && typeof flow._offset === "number");
        if (needDashOffset) {
          ctx.save();
          try {
            (ctx as any).lineDashOffset = flow._offset;
          } catch {}
          renderer?.renderNode(ctx, node, this.graph);
          ctx.restore();
        } else {
          try {
            (ctx as any).lineDashOffset = 0;
          } catch {}
          renderer?.renderNode(ctx, node, this.graph);
        }
      }
    }
    ctx.restore();

    // Pass 2: 绘制边层（屏幕空间），若使用快照模式
    if (this.edgeSnapshotMode !== "off") {
      this.drawEdgesLayer();
    }

    // Pass 3: 绘制普通节点、边（非快照模式）、以及所有标签（位于最上层）
    ctx.save();
    ctx.translate(this.translateX, this.translateY);
    ctx.scale(this.scale, this.scale);

    // 边渲染（world-space）：当关闭快照模式时在此绘制
    if (this.edgeSnapshotMode === "off") {
      let allowEdges = true;
      if (this.isPanning || this.isDraggingNodes) {
        const dpr2 = this._effectiveDpr || 1;
        const cssW2 = canvas.width / dpr2;
        const cssH2 = canvas.height / dpr2;
        const { visibleNodes, visibleEdges } = this.measureVisibleCounts(cssW2, cssH2);
        allowEdges = visibleNodes <= this.dragRenderNodesMax && visibleEdges <= this.dragRenderEdgesMax;
      }
      if (allowEdges) {
        for (const edge of this.graph.getEdges()) {
          if (!this.edgeIntersectsView(edge, viewMinX, viewMinY, viewMaxX, viewMaxY)) continue;
          const er = this.renderers.get(edge.shape);
          er?.renderEdge(ctx, edge, this.graph);
        }
      }
    }

    // 在节点绘制前调用插件的边标签绘制钩子（world-space）
    // 当可视元素数量超过阈值，跳过边标签渲染
    let skipEdgeLabels = false;
    let visStats: { visibleNodes: number; visibleEdges: number } | null = null;
    {
      const dpr2 = this._effectiveDpr || 1;
      const cssW2 = canvas.width / dpr2;
      const cssH2 = canvas.height / dpr2;
      const counts = this.measureVisibleCounts(cssW2, cssH2);
      visStats = counts;
      const busy = this.isPanning || this.isDraggingNodes;
      skipEdgeLabels = busy && (counts.visibleEdges > this.labelEdgesMax || counts.visibleNodes > this.labelNodesMax);
    }
    if (!skipEdgeLabels) this.plugins.emitHook("renderEdgeLabels", ctx);

    // 在顶部渲染普通节点（尊重zIndex：getNodes 已稳定排序）
    // 性能优化：使用缓存的可见节点数组
    for (const node of this._visibleNodesCache) {
      // 容器节点已在 Pass 1 绘制，此处跳过
      if (node.isContainer) {
        // 仅绘制容器的标签（确保标签在边之上）
        const skipNodeLabel = visStats
          ? (this.isPanning || this.isDraggingNodes) && visStats.visibleNodes > this.labelNodesMax
          : false;
        if (!skipNodeLabel) this.plugins.emitHook("renderNodeLabels", ctx, node);
        continue;
      }

      const renderer = this.renderers.get(node.shape);
      // 预应用节点级 flow 的 lineDashOffset（若渲染器内部设置了 dash，offset 仍然生效）
      const style: any = node.data?.style;
      const flow = style?.flow;
      const needDashOffset = !!(flow && flow.enabled && typeof flow._offset === "number");
      // 只有当需要 dashOffset 时才保存/恢复上下文
      if (needDashOffset) {
        ctx.save();
        try {
          (ctx as any).lineDashOffset = flow._offset;
        } catch {}
        renderer?.renderNode(ctx, node, this.graph);
        ctx.restore();
      } else {
        // 避免不必要的 save/restore
        try {
          (ctx as any).lineDashOffset = 0;
        } catch {}
        renderer?.renderNode(ctx, node, this.graph);
      }
      // 在每个节点绘制后触发节点标签绘制（world-space），重负载时跳过
      const skipNodeLabel = visStats
        ? (this.isPanning || this.isDraggingNodes) && visStats.visibleNodes > this.labelNodesMax
        : false;
      if (!skipNodeLabel) this.plugins.emitHook("renderNodeLabels", ctx, node);
    }

    ctx.restore();

    // Plugins can draw overlays (screen space)
    this.plugins.emitHook("afterRender", this.ctx);

    this.performanceMonitor.endFrame();
  }

  // 判断是否存在会破坏边快照的动态效果（如流动动画）
  private hasDynamicEdgeEffects(): boolean {
    if (this.edgeSnapshotMode === "always") return false; // 强制忽略动态，始终使用快照
    // 简单扫描：若任一边存在 style.flow?.enabled 则认为需要每帧更新
    for (const e of this.graph.getEdges()) {
      const style: any = e.data?.style;
      const flow = style?.flow ?? style?.pipeline?.flow;
      if (flow?.enabled) return true;
    }
    return false;
  }
  
  // 判断是否存在需要每帧更新的节点动态效果（如节点流动动画）
  private hasDynamicNodeEffects(): boolean {
    // 扫描节点：若任一节点存在 style.flow?.enabled 则需要每帧更新
    for (const n of this.graph.getNodes()) {
      const style: any = n.data?.style;
      const flow = style?.flow;
      if (flow?.enabled) return true;
    }
    return false;
  }

  // 边层绘制：优先复用快照；必要时重绘并更新快照
  // 性能优化：拖拽时冻结快照，避免因 markDirty 导致的频繁重绘
  private drawEdgesLayer(): void {
    const ect = this.edgesCtx;
    const eCanvas = this.edgesCanvas;
    if (!ect || !eCanvas) return;
    if (this.edgeSnapshotMode === "off") return; // 关闭快照时不使用边层

    const dpr = this._effectiveDpr || 1;
    const cssW = this.canvas.width / dpr;
    const cssH = this.canvas.height / dpr;

    // 性能优化：只在拖拽大批量节点时使用降质模式（>400个），平移时保持正常渲染
    // 平移时边应该跟随移动（因为整个场景一起平移）
    // 少量节点拖拽时边应该正常更新（因为边数量不多，重绘成本可控）
    // 大批量节点拖拽时边可以冻结（因为会导致大量边重绘）
    const shouldUseDragMode = this.isDraggingNodes && this.draggingNodeCount > 400;

    if (shouldUseDragMode && !this._isDraggingModeActive) {
      // 进入拖拽降质模式：检查是否需要降质
      // 性能优化：缓存节点和边的总数，避免重复调用 getNodes/getEdges
      const gv = this.graph.getVersion();
      if (this._cachedCountVersion !== gv) {
        this._cachedTotalNodes = this.graph.getNodes().length;
        this._cachedTotalEdges = this.graph.getEdges().length;
        this._cachedCountVersion = gv;
      }

      // 激进降质：总数量超过阈值，直接跳过边渲染
      const isHugeScene =
        this._cachedTotalNodes >= this.aggressiveTotalNodes || this._cachedTotalEdges >= this.aggressiveTotalEdges;

      if (isHugeScene) {
        // 大规模场景：完全跳过边渲染，清空边层
        this._isDraggingModeActive = true;
        this._lastDragSnapshot = null;
        ect.clearRect(0, 0, cssW, cssH);
        this.edgesSnapshot = null;
        return;
      }

      // 中等规模场景：检查可视区域数量
      const { visibleNodes, visibleEdges } = this.measureVisibleCounts(cssW, cssH);
      const heavy = visibleNodes > this.dragRenderNodesMax || visibleEdges > this.dragRenderEdgesMax;

      if (heavy) {
        // 可视数量较多：跳过边渲染
        this._isDraggingModeActive = true;
        this._lastDragSnapshot = null;
        ect.clearRect(0, 0, cssW, cssH);
        this.edgesSnapshot = null;
        return;
      } else if (this.edgesSnapshot) {
        // 小规模场景：冻结当前快照，避免因节点移动导致的重绘
        this._isDraggingModeActive = true;
        if (!this._lastDragSnapshot) {
          this._lastDragSnapshot = document.createElement("canvas");
        }
        this._lastDragSnapshot.width = eCanvas.width;
        this._lastDragSnapshot.height = eCanvas.height;
        const snapCtx = this._lastDragSnapshot.getContext("2d");
        if (snapCtx) {
          snapCtx.clearRect(0, 0, this._lastDragSnapshot.width, this._lastDragSnapshot.height);
          snapCtx.drawImage(eCanvas, 0, 0);
        }
      }
    }

    if (!shouldUseDragMode && this._isDraggingModeActive) {
      // 退出拖拽降质模式：恢复正常渲染
      this._isDraggingModeActive = false;
      this._lastDragSnapshot = null;
      this.edgesSnapshot = null; // 强制重建快照
    }

    // 拖拽降质模式激活时：使用冻结的快照
    if (this._isDraggingModeActive) {
      if (this._lastDragSnapshot) {
        // 绘制冻结的快照（边的位置不会更新，保持拖拽前的状态）
        const dpr2 = this._effectiveDpr || 1;
        const cssW2 = this.canvas.width / dpr2;
        const cssH2 = this.canvas.height / dpr2;
        this.ctx.drawImage(this._lastDragSnapshot, 0, 0, cssW2, cssH2);
      }
      // 跳过所有快照更新逻辑
      return;
    }

    // 平移时的降质策略：对于大规模场景，临时清空边层
    if (this.isPanning) {
      // 性能优化：缓存总数（复用上面的逻辑）
      const gv = this.graph.getVersion();
      if (this._cachedCountVersion !== gv) {
        this._cachedTotalNodes = this.graph.getNodes().length;
        this._cachedTotalEdges = this.graph.getEdges().length;
        this._cachedCountVersion = gv;
      }

      const isHugeScene =
        this._cachedTotalNodes >= this.aggressiveTotalNodes || this._cachedTotalEdges >= this.aggressiveTotalEdges;

      if (isHugeScene) {
        // 大规模平移：清空边层，停止平移时会重建
        ect.clearRect(0, 0, cssW, cssH);
        this.edgesSnapshot = null;
        return;
      }

      // 中小规模平移：检查可视数量
      const { visibleNodes, visibleEdges } = this.measureVisibleCounts(cssW, cssH);
      const heavy = visibleNodes > this.dragRenderNodesMax || visibleEdges > this.dragRenderEdgesMax;

      if (heavy) {
        // 可视区域较多：清空边层
        ect.clearRect(0, 0, cssW, cssH);
        this.edgesSnapshot = null;
        return;
      }
      // 否则继续正常快照流程（边会跟随平移）
    }

    // 正常模式：原有的快照逻辑
    const needDynamic = this.hasDynamicEdgeEffects();
    const gv = this.graph.getVersion();
    const snapshotValid =
      this.edgesSnapshot &&
      !needDynamic &&
      this.edgesSnapshot.graphVersion === gv &&
      this.edgesSnapshot.scale === this.scale &&
      this.edgesSnapshot.translateX === this.translateX &&
      this.edgesSnapshot.translateY === this.translateY &&
      this.edgesSnapshot.dpr === dpr;

    if (!snapshotValid) {
      // 重新绘制边到离屏（世界->屏幕变换与主画布一致）
      ect.save();
      ect.clearRect(0, 0, cssW, cssH);
      ect.translate(this.translateX, this.translateY);
      ect.scale(this.scale, this.scale);

      // 可视区域裁剪与主渲染一致
      const invScale = 1 / this.scale;
      const viewMinX = -this.translateX * invScale;
      const viewMinY = -this.translateY * invScale;
      const viewMaxX = viewMinX + cssW * invScale;
      const viewMaxY = viewMinY + cssH * invScale;
      for (const edge of this.graph.getEdges()) {
        if (!this.edgeIntersectsView(edge, viewMinX, viewMinY, viewMaxX, viewMaxY)) continue;
        const renderer = this.renderers.get(edge.shape);
        renderer?.renderEdge(ect, edge, this.graph);
      }

      ect.restore();
      this.edgesSnapshot = {
        graphVersion: gv,
        scale: this.scale,
        translateX: this.translateX,
        translateY: this.translateY,
        dpr,
      };
    }

    // 将离屏边层绘制到主画布（屏幕空间 1:1）。
    // 注意：主 ctx 已有 DPR 变换，必须指定目标尺寸为 CSS 尺寸，避免二次缩放导致位置偏移或不显示。
    const dpr2 = this._effectiveDpr || 1;
    const cssW2 = this.canvas.width / dpr2;
    const cssH2 = this.canvas.height / dpr2;
    this.ctx.drawImage(eCanvas, 0, 0, cssW2, cssH2);
  }

  // 统计当前视口内的节点/边数量（用于拖拽时阈值判断）
  // 性能优化：使用边可见性缓存，避免重复遍历
  private measureVisibleCounts(cssW: number, cssH: number): { visibleNodes: number; visibleEdges: number } {
    const invScale = 1 / this.scale;
    const viewMinX = -this.translateX * invScale;
    const viewMinY = -this.translateY * invScale;
    const viewMaxX = viewMinX + cssW * invScale;
    const viewMaxY = viewMinY + cssH * invScale;

    // 节点数量：如果已经在render中计算过，直接复用
    const visibleNodes =
      this._visibleNodesCache.length > 0
        ? this._visibleNodesCache.length
        : this.countVisibleNodes(viewMinX, viewMinY, viewMaxX, viewMaxY);

    // 边数量：使用缓存机制
    const visibleEdges = this.getVisibleEdgesCount(viewMinX, viewMinY, viewMaxX, viewMaxY);

    return { visibleNodes, visibleEdges };
  }

  // 计算可见节点数量（仅在需要时调用）
  private countVisibleNodes(viewMinX: number, viewMinY: number, viewMaxX: number, viewMaxY: number): number {
    const canUseSpatial = this.spatialEnabled && !(this.spatialDisableDuringDrag && this.isDraggingNodes);
    if (canUseSpatial) this.rebuildSpatialIndexIfNeeded();
    else this.qt = null;
    const viewRect = { x: viewMinX, y: viewMinY, width: viewMaxX - viewMinX, height: viewMaxY - viewMinY };

    if (canUseSpatial && this.qt) {
      this._qtResultCache.length = 0;
      this.qt.query(viewRect, this._qtResultCache);
      return this._qtResultCache.reduce((acc, it) => acc + (it.data.visible === false ? 0 : 1), 0);
    } else {
      const all = this.graph.getNodes();
      let count = 0;
      for (let i = 0; i < all.length; i++) {
        const n = all[i];
        if (n.visible === false) continue;
        const l = n.position.x,
          t = n.position.y,
          r = l + n.size.width,
          b = t + n.size.height;
        if (!(r < viewMinX || b < viewMinY || l > viewMaxX || t > viewMaxY)) count++;
      }
      return count;
    }
  }

  // 获取可见边数量（带缓存）
  private getVisibleEdgesCount(viewMinX: number, viewMinY: number, viewMaxX: number, viewMaxY: number): number {
    // 检查缓存是否有效：视口变化不大且图形版本未变
    const dx = Math.abs(viewMinX - this._visibleEdgeCacheView.minX);
    const dy = Math.abs(viewMinY - this._visibleEdgeCacheView.minY);
    const dScale = Math.abs(this.scale - this._visibleEdgeCacheView.scale);
    const cacheValid =
      this._visibleEdgeCacheVersion === this.graph.getVersion() && dx < 100 && dy < 100 && dScale < 0.1; // 小幅平移和缩放时复用缓存

    if (cacheValid) {
      return this._visibleEdgesCache.size;
    }

    // 重建缓存
    this._visibleEdgesCache.clear();
    for (const edge of this.graph.getEdges()) {
      if (this.edgeIntersectsView(edge, viewMinX, viewMinY, viewMaxX, viewMaxY)) {
        this._visibleEdgesCache.add(edge.id);
      }
    }

    this._visibleEdgeCacheVersion = this.graph.getVersion();
    this._visibleEdgeCacheView = { minX: viewMinX, minY: viewMinY, maxX: viewMaxX, maxY: viewMaxY, scale: this.scale };

    return this._visibleEdgesCache.size;
  }

  private attachDefaultEvents(): void {
    window.addEventListener("resize", this.onWindowResize);
  }

  private attachGraphEvents(): void {
    this.graph.on((e) => {
      switch (e.type) {
        case "node:added":
          this.events.emit("graph:change", { reason: "node-added" });
          break;
        case "node:removed":
          this.events.emit("node:removed", { node: e.data });
          this.events.emit("graph:change", { reason: "node-removed" });
          break;
        case "edge:added":
          this.events.emit("graph:change", { reason: "edge-added" });
          break;
        case "edge:removed":
          this.events.emit("edge:removed", { edge: e.data });
          this.events.emit("graph:change", { reason: "edge-removed" });
          break;
        case "graph:cleared":
          this.events.emit("graph:change", { reason: "clear" });
          break;
      }
    });
  }

  // 在下一帧合并尺寸变更，减少重复 resize 触发造成的抖动
  private scheduleResize(w: number, h: number): void {
    this.pendingW = w;
    this.pendingH = h;
    if (this.resizeRaf != null) return;
    this.resizeRaf = requestAnimationFrame(() => {
      this.resizeRaf = null;
      const width = this.pendingW ?? this.options.container.clientWidth;
      const height = this.pendingH ?? this.options.container.clientHeight;
      this.pendingW = this.pendingH = null;
      this.resize(width, height);
    });
  }

  // viewport api
  getScale(): number {
    return this.scale;
  }
  getTranslation(): { x: number; y: number } {
    return { x: this.translateX, y: this.translateY };
  }
  setScale(next: number): void {
    this.scale = Math.max(this.interactionConfig.minScale, Math.min(this.interactionConfig.maxScale, next));
  }
  setTranslation(x: number, y: number): void {
    this.translateX = x;
    this.translateY = y;
  }
  zoomAt(factor: number, screenX: number, screenY: number): void {
    const preWorld = this.toWorld({ x: screenX, y: screenY });
    const nextScale = Math.max(
      this.interactionConfig.minScale,
      Math.min(this.interactionConfig.maxScale, this.scale * factor),
    );
    this.scale = nextScale;
    this.translateX = screenX - preWorld.x * this.scale;
    this.translateY = screenY - preWorld.y * this.scale;
  }
  toScreen(world: { x: number; y: number }): { x: number; y: number } {
    return { x: world.x * this.scale + this.translateX, y: world.y * this.scale + this.translateY };
  }
  toWorld(screen: { x: number; y: number }): { x: number; y: number } {
    return { x: (screen.x - this.translateX) / this.scale, y: (screen.y - this.translateY) / this.scale };
  }

  // 运行模式 api
  getMode(): EngineMode {
    return this.mode;
  }
  setMode(mode: EngineMode): void {
    this.mode = mode;
  }

  // 交互配置 api
  getInteractionConfig(): Readonly<InteractionConfig> {
    return this.interactionConfig;
  }
  setInteractionConfig(config: Partial<InteractionConfig>): void {
    if (typeof config.enableZoom === "boolean") this.interactionConfig.enableZoom = config.enableZoom;
    if (typeof config.enablePan === "boolean") this.interactionConfig.enablePan = config.enablePan;
    if (typeof config.enableSelection === "boolean") this.interactionConfig.enableSelection = config.enableSelection;
    if (typeof config.enableDrag === "boolean") this.interactionConfig.enableDrag = config.enableDrag;
    if (typeof config.enableResize === "boolean") this.interactionConfig.enableResize = config.enableResize;
    if (typeof config.enableRotate === "boolean") this.interactionConfig.enableRotate = config.enableRotate;
    if (typeof config.minScale === "number") this.interactionConfig.minScale = config.minScale;
    if (typeof config.maxScale === "number") this.interactionConfig.maxScale = config.maxScale;
  }

  getTheme(): "light" | "dark" {
    return this.currentTheme;
  }
  /**
   * 设置主题（仅影响画布核心：背景、内置插件的颜色）。外部 UI 自行处理 body / root class。
   * @param theme 'light' | 'dark'
   * @param overrides 可选覆盖调色板（局部）
   */
  setTheme(
    theme: "light" | "dark",
    overrides?: Partial<{
      background: string;
      grid: { color?: string; alpha?: number };
      guides: { color?: string };
      minimap: {
        background?: string;
        borderColor?: string;
        nodeColor?: string;
        edgeColor?: string;
        viewportStroke?: string;
        viewportFill?: string;
      };
    }>,
  ): void {
    if (this.currentTheme === theme && !overrides) return;
    this.currentTheme = theme;
    const palette = mergePalette(THEME_PALETTES[theme], overrides as any);
    // 应用背景
    this.background = palette.background;
    // 应用插件（若插件支持 setTheme 方法）
    const pm: any = (this.plugins as any).plugins;
    if (pm?.get) {
      const grid = pm.get("grid");
      if (grid && typeof grid.setTheme === "function") grid.setTheme(palette.grid);
      const guides = pm.get("guides");
      if (guides && typeof guides.setTheme === "function") guides.setTheme(palette.guides);
      const minimap = pm.get("minimap");
      if (minimap && typeof minimap.setTheme === "function") minimap.setTheme(palette.minimap);
    }
    this.graph.markDirty();
    this.events.emit("engine:theme-change", { theme });
  }

  /**
   * 视口适配（缩放 + 平移）以适配全部节点或当前选中节点集合。
   * 算法：计算目标节点集合的外接矩形 -> 以给定 padding 预留边距 -> 计算 scale 并限制在[minScale,maxScale] -> 居中平移。
   * @param opts 选项
   *  - selectionOnly: 仅适配当前选中节点（默认 false -> 全部节点）
   *  - padding: 边距（像素，默认 40）
   *  - minScale / maxScale: 缩放限制（默认 0.1 / 10，与 setScale 保持一致）
   * @returns 是否成功执行（无节点或尺寸异常返回 false）
   */
  fitView(opts: { selectionOnly?: boolean; padding?: number; minScale?: number; maxScale?: number } = {}): boolean {
    const { selectionOnly = false, padding = 40 } = opts;
    // 优先使用参数传入的限制，否则使用全局配置，最后兜底默认值
    const minScale = opts.minScale ?? this.interactionConfig.minScale ?? 0.1;
    const maxScale = opts.maxScale ?? this.interactionConfig.maxScale ?? 10;

    const target = selectionOnly ? this.graph.getNodes().filter((n) => n.selected) : this.graph.getNodes();
    if (!target.length) return false;
    let minX = Number.POSITIVE_INFINITY,
      minY = Number.POSITIVE_INFINITY,
      maxX = Number.NEGATIVE_INFINITY,
      maxY = Number.NEGATIVE_INFINITY;
    for (const n of target) {
      const l = n.position.x,
        t = n.position.y;
      const r = l + n.size.width,
        b = t + n.size.height;
      if (l < minX) minX = l;
      if (t < minY) minY = t;
      if (r > maxX) maxX = r;
      if (b > maxY) maxY = b;
    }
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return false;
    const contentW = Math.max(1, maxX - minX);
    const contentH = Math.max(1, maxY - minY);
    const cssW = Math.max(1, this.canvas.clientWidth);
    const cssH = Math.max(1, this.canvas.clientHeight);
    const pad = Math.max(0, padding);
    const scaleX = (cssW - 2 * pad) / contentW;
    const scaleY = (cssH - 2 * pad) / contentH;
    const scale = Math.max(minScale, Math.min(maxScale, Math.min(scaleX, scaleY)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const tx = cssW / 2 - cx * scale;
    const ty = cssH / 2 - cy * scale;
    this.setScale(scale);
    this.setTranslation(tx, ty);
    return true;
  }

  // 交互状态：平移中
  setPanning(flag: boolean): void { 
    const wasInteracting = this.isPanning || this.isDraggingNodes;
    this.isPanning = flag;
    const isInteracting = this.isPanning || this.isDraggingNodes;
    
    // DPR 动态降级：平移使用较高 DPR 减少模糊
    if (flag && !wasInteracting) {
      this.switchToLowDpr('pan');
    } else if (!isInteracting && wasInteracting) {
      this.switchToNativeDpr();
    }
  }
  isCurrentlyPanning(): boolean { return this.isPanning; }
  setDraggingNodes(flag: boolean, count: number = 0): void { 
    const wasInteracting = this.isPanning || this.isDraggingNodes;
    const wasDragging = this.isDraggingNodes;
    this.isDraggingNodes = flag; 

    this.draggingNodeCount = count;
    const isInteracting = this.isPanning || this.isDraggingNodes;
    // DPR 动态降级：拖动节点使用较低 DPR 优先流畅
    if (flag && !wasDragging) {
      this.switchToLowDpr('drag');
    } else if (!isInteracting && wasInteracting) {
      this.switchToNativeDpr();
    }
  }
  isCurrentlyDraggingNodes(): boolean { return this.isDraggingNodes; }
  getDraggingNodeCount(): number { return this.draggingNodeCount; }
  
  /**
   * 获取画布的 CSS 尺寸（与 DPR 无关）
   */
  getCssSize(): { width: number; height: number } {
    return { width: this._cssWidth, height: this._cssHeight };
  }
  
  /**
   * 请求重绘（下一帧）
   * 用于插件或外部代码需要触发重绘时调用
   */
  requestRender(): void {
    this._needsRender = true;
  }

  // 快照模式切换
  setEdgeSnapshotMode(mode: "auto" | "off" | "always"): void {
    this.edgeSnapshotMode = mode;
    // 切换模式应使当前快照失效
    this.edgesSnapshot = null;
  }
  getEdgeSnapshotMode(): "auto" | "off" | "always" {
    return this.edgeSnapshotMode;
  }

  // 重建四叉树（按需）：当图版本更新或索引未建立时
  private rebuildSpatialIndexIfNeeded(): void {
    const gv = this.graph.getVersion();
    if (this.qt && this.qtVersion === gv) return;
    const nodes = this.graph.getNodes();
    if (!this.spatialEnabled || nodes.length === 0) {
      this.qt = null;
      this.qtVersion = gv;
      return;
    }
    this.qt = buildQuadtreeFromNodes(nodes, {
      maxItems: this.spatialMaxItems,
      maxDepth: this.spatialMaxDepth,
      padding: this.spatialPadding,
    });
    this.qtVersion = gv;
  }

  // 判断一条边的近似包围盒是否与视口相交（避免每帧生成闭包）
  private edgeIntersectsView(
    e: import("../model/Graph").EdgeData,
    viewMinX: number,
    viewMinY: number,
    viewMaxX: number,
    viewMaxY: number,
  ): boolean {
    const s = this.graph.getNode(e.source);
    const t = this.graph.getNode(e.target);
    if (!s || !t) return true;
    if (s.visible === false || t.visible === false) return false;
    const sx = s.position.x + s.size.width / 2;
    const sy = s.position.y + s.size.height / 2;
    const tx = t.position.x + t.size.width / 2;
    const ty = t.position.y + t.size.height / 2;
    const minX = Math.min(sx, tx);
    const minY = Math.min(sy, ty);
    const maxX = Math.max(sx, tx);
    const maxY = Math.max(sy, ty);
    return !(maxX < viewMinX || maxY < viewMinY || minX > viewMaxX || minY > viewMaxY);
  }

  /**
   * 启用或禁用性能监控
   */
  enablePerformanceMonitor(enabled: boolean): void {
    if (enabled) {
      this.performanceMonitor.enable();
    } else {
      this.performanceMonitor.disable();
    }
  }

  /**
   * 获取性能统计数据
   */
  getPerformanceStats(): PerformanceStats {
    const dpr = (window as any).devicePixelRatio || 1;
    const cssW = this.canvas.width / dpr;
    const cssH = this.canvas.height / dpr;
    const { visibleNodes, visibleEdges } = this.measureVisibleCounts(cssW, cssH);

    return this.performanceMonitor.getStats(
      this.graph.getNodes().length,
      this.graph.getEdges().length,
      visibleNodes,
      visibleEdges,
      { width: cssW, height: cssH, dpr }
    );
  }
}
