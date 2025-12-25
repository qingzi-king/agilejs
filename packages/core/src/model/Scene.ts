/*
 * @Description: 画布（canvas）+ 图（graph）的场景序列化与装载
 * @Author: qingzi.wang
 * @Date: 2025-10-15 19:16:31
 * @LastEditTime: 2025-10-15 19:16:31
 */
import type { CanvasEngine, InteractionConfig, DprDegradationConfig } from "../core/CanvasEngine";
import type { GraphJSON } from "./Serialize";
import { toJSON as graphToJSON, fromJSON as graphFromJSON } from "./Serialize";

export interface CanvasState {
  background?: string;
  theme?: "light" | "dark";
  viewport?: { scale?: number; translation?: { x: number; y: number } };
  edgeSnapshotMode?: "auto" | "off" | "always";
  interactionConfig?: InteractionConfig;
  dprDegradation?: DprDegradationConfig;
  grid?: { size?: number; color?: string; alpha?: number; type?: "line" | "dot"; visible?: boolean };
  guides?: { threshold?: number; color?: string; visible?: boolean };
  minimap?: Record<string, any>; // 直接透传 MinimapPlugin 的 opts 子集
}

export interface SceneJSON extends GraphJSON {
  canvas?: CanvasState;
}

// 导出：从引擎采集完整场景（canvas + graph）
export function toScene(engine: CanvasEngine): SceneJSON {
  const graphData = graphToJSON(engine.graph);
  const pm: any = (engine.plugins as any).plugins;
  const grid = pm?.get?.("grid");
  const guides = pm?.get?.("guides");
  const minimap = pm?.get?.("minimap");
  const canvas: CanvasState = {
    background: (engine as any).background,
    theme: engine.getTheme?.() ?? "light",
    viewport: { scale: engine.getScale?.(), translation: engine.getTranslation?.() },
    edgeSnapshotMode: engine.getEdgeSnapshotMode?.(),
    interactionConfig: engine.getInteractionConfig?.(),
    dprDegradation: (engine as any).getDprDegradation ? (engine as any).getDprDegradation() : undefined,
    grid: grid
      ? {
          size: grid.size ?? grid.opts?.size,
          color: grid.color ?? grid.opts?.color,
          alpha: grid.alpha ?? grid.opts?.alpha,
          type: grid.type ?? grid.opts?.type,
          visible: grid.visible ?? grid.opts?.visible,
        }
      : undefined,
    guides: guides
      ? {
          threshold: guides.threshold ?? guides.opts?.threshold,
          color: guides.color ?? guides.opts?.color,
          visible: guides.visible ?? guides.opts?.visible,
        }
      : undefined,
    minimap: (() => {
      if (!minimap) return undefined;
      const mo: any = (minimap as any).opts || {};
      // 直接打平透传（保持与保存端一致）
      return { ...mo };
    })(),
  };
  return { canvas, ...graphData } as SceneJSON;
}

// 装载：将场景应用到引擎（canvas 有且有效时应用），再装载图数据
export function fromScene(engine: CanvasEngine, scene: Partial<SceneJSON>): void {
  const canvasInfo = scene.canvas;
  if (canvasInfo) {
    // 背景与主题
    const theme = canvasInfo.theme as "light" | "dark" | undefined;
    if (theme && (engine as any).setTheme) (engine as any).setTheme(theme);
    if (canvasInfo.background != null) (engine as any).background = canvasInfo.background;
    // 视口
    if (canvasInfo.viewport) {
      const { scale, translation } = canvasInfo.viewport;
      if (typeof scale === "number") (engine as any).setScale?.(scale);
      if (translation && typeof translation.x === "number" && typeof translation.y === "number") {
        (engine as any).setTranslation?.(translation.x, translation.y);
      }
    }
    // 边快照模式
    if (canvasInfo.edgeSnapshotMode && (engine as any).setEdgeSnapshotMode) {
      (engine as any).setEdgeSnapshotMode(canvasInfo.edgeSnapshotMode);
    }
    // 交互配置
    if (canvasInfo.interactionConfig && engine.setInteractionConfig) {
      engine.setInteractionConfig(canvasInfo.interactionConfig);
    }
    // DPR 降级配置
    if (canvasInfo.dprDegradation && (engine as any).setDprDegradation) {
      (engine as any).setDprDegradation(canvasInfo.dprDegradation);
    }
    // 插件：网格/导轨/迷你地图
    const pm: any = (engine.plugins as any).plugins;
    const grid = pm?.get?.("grid");
    if (grid && canvasInfo.grid) {
      if (canvasInfo.grid.size != null) grid.size = canvasInfo.grid.size;
      if (canvasInfo.grid.color != null) grid.color = canvasInfo.grid.color;
      if (canvasInfo.grid.alpha != null) grid.alpha = canvasInfo.grid.alpha;
      if (canvasInfo.grid.type != null) grid.type = canvasInfo.grid.type;
      if (canvasInfo.grid.visible != null) grid.visible = canvasInfo.grid.visible;
    }
    const guides = pm?.get?.("guides");
    if (guides && canvasInfo.guides) {
      if (canvasInfo.guides.threshold != null) guides.threshold = canvasInfo.guides.threshold;
      if (canvasInfo.guides.color != null) guides.color = canvasInfo.guides.color;
      if (canvasInfo.guides.visible != null) guides.visible = canvasInfo.guides.visible;
    }
    const minimap = pm?.get?.("minimap");
    if (minimap && canvasInfo.minimap) {
      const mo: any = (minimap as any).opts || {};
      const src = canvasInfo.minimap || {};
      Object.keys(src).forEach((k) => {
        const v = (src as any)[k];
        if (v !== undefined) mo[k] = v;
      });
    }
  }

  // 装载图数据（兼容缺失情况）
  const nodes = Array.isArray(scene.nodes) ? scene.nodes : [];
  const edges = Array.isArray(scene.edges) ? scene.edges : [];
  // 清空现有图：优先使用 Graph.clear()，避免缓存未同步
  const g: any = engine.graph as any;
  if (typeof g.clear === "function") {
    g.clear();
  } else {
    if (g.nodes && typeof g.nodes.clear === "function") g.nodes.clear();
    if (g.edges && typeof g.edges.clear === "function") g.edges.clear();
    if ("nodesCache" in g) g.nodesCache = null;
    if ("edgesCache" in g) g.edgesCache = null;
    engine.graph.markDirty();
  }
  graphFromJSON(engine.graph, { nodes, edges } as any);
  // graphFromJSON 内部会触发 addNode/addEdge，从而维护缓存并 bump 版本；
  // 若无边时不会触发 addEdge，这里补一次 markDirty 以稳定使渲染失效
  engine.graph.markDirty();
}
