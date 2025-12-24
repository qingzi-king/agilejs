/*
 * @Description: 边渲染通用工具
 * @Author: qingzi.wang
 * @Date: 2025-12-03
 */
import { Graph, EdgeData, Point } from "../model/Graph";

export interface NormalizedEdgeStyle {
  stroke: string;
  lineWidth: number;
  lineDash?: number[];
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  miterLimit?: number;
  alpha?: number;

  // Flow
  flow?: {
    enabled: boolean;
    color: string;
    speed: number;
    offset: number;
    width?: number;
  };

  // Pipeline
  pipeline?: {
    outerColor: string;
    innerColor: string;
    outerWidth: number;
    innerWidth: number;
    gap?: number;
    cornerRadius?: number;
  };

  // Arrows
  sourceArrowType: "none" | "solid" | "hollow";
  targetArrowType: "none" | "solid" | "hollow";
  arrowSize: number;
  arrowColor: string;

  // Misc
  endpointGap?: number;
}

/**
 * 归一化边样式配置
 */
export function getEdgeStyle(edge: EdgeData, graph: Graph): NormalizedEdgeStyle {
  const dataStyle = (edge.data?.style as any) || {};
  const selected = !!edge.selected;

  // 1. Pipeline 解析
  const rawPipeline = dataStyle.pipeline;
  let pipeline: NormalizedEdgeStyle["pipeline"] | undefined;

  if (rawPipeline) {
    const outerW = rawPipeline.outerWidth ?? 6;
    const gap = typeof rawPipeline.gap === "number" ? Math.max(0, rawPipeline.gap) : undefined;
    // 计算 innerWidth
    const innerW =
      typeof rawPipeline.innerWidth === "number"
        ? rawPipeline.innerWidth
        : gap != null
          ? Math.max(1, outerW - 2 * gap)
          : Math.max(1, outerW - 4);

    pipeline = {
      outerColor: rawPipeline.outerColor ?? (selected ? "#dc2626" : "#6b7280"),
      innerColor: rawPipeline.innerColor ?? "#ffffff",
      outerWidth: outerW,
      innerWidth: innerW,
      gap: gap,
      cornerRadius: rawPipeline.cornerRadius,
    };
  }

  // 2. Flow 解析
  // 优先使用 style.flow，其次 pipeline.flow
  const rawFlow = dataStyle.flow ?? rawPipeline?.flow;
  let flow: NormalizedEdgeStyle["flow"] | undefined;
  if (rawFlow) {
    flow = {
      enabled: rawFlow.enabled !== false,
      color: rawFlow.color ?? dataStyle.stroke ?? "#3B82F6",
      speed: rawFlow.speed ?? 1,
      offset: rawFlow._offset ?? 0,
      width: rawFlow.width,
    };
  }

  // 3. 基础样式
  // 如果有 pipeline，基础 stroke/width 通常被 pipeline 覆盖，但在非 pipeline 模式下需要
  const baseStroke = flow?.color ?? dataStyle.stroke ?? (selected ? "#dc2626" : "#6b7280");
  const baseWidth = (typeof flow?.width === "number" ? flow.width : dataStyle.lineWidth) ?? 2;

  // 4. 箭头样式
  const arrowColor = dataStyle.arrowColor ?? baseStroke;

  // 计算 lineDash：优先使用 dataStyle.lineDash
  // 如果开启了 flow 且是 pipeline 模式，但未指定 lineDash，则使用默认虚线 [12, 10]
  let lineDash = dataStyle.lineDash;
  if (flow && pipeline && !lineDash) {
    lineDash = [12, 10];
  }

  return {
    stroke: baseStroke,
    lineWidth: baseWidth,
    lineDash: lineDash,
    lineCap: dataStyle.lineCap ?? "butt",
    lineJoin: dataStyle.lineJoin ?? "miter",
    miterLimit: dataStyle.miterLimit,
    alpha: dataStyle.alpha,
    flow,
    pipeline,
    sourceArrowType: dataStyle.sourceArrowType ?? "none",
    targetArrowType: dataStyle.targetArrowType ?? "solid",
    arrowSize: dataStyle.arrowSize ?? 8,
    arrowColor: arrowColor,
    endpointGap: typeof dataStyle.endpointGap === "number" ? Math.max(0, dataStyle.endpointGap) : undefined,
  };
}

/**
 * 计算节点描边带来的间隙（用于端点缩进）
 */
export function getNodeStrokeGap(graph: Graph, nodeId?: string): number {
  if (!nodeId) return 0;
  const n = graph.getNode(nodeId);
  if (!n) return 0;
  const s: any = n.data?.style || {};
  const lw = typeof s.lineWidth === "number" ? s.lineWidth : 1.5;
  const hasStroke = !!s.stroke && String(s.stroke).toLowerCase() !== "transparent";
  return hasStroke ? lw / 2 + 1 : 0;
}

/**
 * 计算修正后的端点（考虑间隙）
 */
export function getGapPoints(p1: Point, p2: Point, gap: number): Point {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  // 从 p1 向 p2 移动 gap 距离
  return {
    x: p1.x + (dx / len) * gap,
    y: p1.y + (dy / len) * gap,
  };
}

/**
 * 绘制路径（支持普通、Pipeline、Flow）
 */
export function drawEdgePath(ctx: CanvasRenderingContext2D, path: Path2D, style: NormalizedEdgeStyle) {
  ctx.save();

  if (style.alpha != null) ctx.globalAlpha = style.alpha;
  ctx.lineCap = style.lineCap || "butt";
  ctx.lineJoin = style.lineJoin || "miter";
  if (style.miterLimit != null) ctx.miterLimit = style.miterLimit;

  if (style.pipeline) {
    // === Pipeline Mode ===
    const p = style.pipeline;

    // 1. Outer Pipe
    ctx.strokeStyle = p.outerColor;
    ctx.lineWidth = p.outerWidth;
    ctx.setLineDash([]);
    ctx.stroke(path);

    // 2. Inner Pipe
    ctx.strokeStyle = p.innerColor;
    ctx.lineWidth = p.innerWidth;
    ctx.setLineDash([]);
    ctx.stroke(path);

    // 3. Flow Overlay (Pipeline)
    if (style.flow) {
      const f = style.flow;
      ctx.strokeStyle = f.color;
      ctx.setLineDash(style.lineDash || []);
      ctx.lineDashOffset = f.offset;

      // 计算叠加层宽度
      // 逻辑：如果有显式 flow.width 则用之；否则如果 gap 存在则填满内层；否则默认 0.75 倍内层
      let overlayW = f.width;
      if (!overlayW || overlayW <= 0) {
        overlayW = p.gap != null ? p.innerWidth : Math.max(1, p.innerWidth * 0.75);
      }
      ctx.lineWidth = overlayW;
      ctx.globalAlpha = 0.9; // 叠加层稍微透明一点？保持原逻辑
      ctx.stroke(path);
    }
  } else {
    // === Normal Mode ===
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth;

    if (style.flow) {
      // Flow 模式下，基础线条可能就是 flow 颜色，或者 flow 是叠加？
      // 原逻辑：如果 flow 存在，baseStroke 优先取 flow.color。
      // 且 dash 由 flow 控制。
      ctx.setLineDash(style.lineDash || []);
      ctx.lineDashOffset = style.flow.offset;
    } else if (style.lineDash) {
      ctx.setLineDash(style.lineDash);
    } else {
      ctx.setLineDash([]);
    }

    ctx.stroke(path);
  }

  ctx.restore();
}

/**
 * 绘制箭头
 */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  tip: Point, // 箭头尖端（接触节点处）
  angle: number, // 箭头指向的角度（从线指向端点）
  type: "solid" | "hollow",
  size: number,
  color: string,
  lineWidth: number,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, lineWidth * 0.9);
  ctx.fillStyle = color;

  // 计算箭头后两点
  // angle 是指向 tip 的方向。箭头两翼应该向后张开。
  // p1 = tip - size * cos(angle ± 30deg)
  const p1 = {
    x: tip.x - size * Math.cos(angle - Math.PI / 6),
    y: tip.y - size * Math.sin(angle - Math.PI / 6),
  };
  const p2 = {
    x: tip.x - size * Math.cos(angle + Math.PI / 6),
    y: tip.y - size * Math.sin(angle + Math.PI / 6),
  };

  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();

  if (type === "solid") {
    // 实心：白底遮罩 + 颜色填充 + 描边
    const prevFill = ctx.fillStyle;
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.fillStyle = prevFill;
    ctx.fill();
    ctx.stroke();
  } else {
    // 空心：白底遮罩 + 描边
    const prevFill = ctx.fillStyle;
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.fillStyle = prevFill;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * 构建带拐点圆角的路径（当 r>0 时使用 arcTo）
 */
export function buildRoundedPath(points: Point[], r: number): Path2D {
  const path = new Path2D();
  if (points.length === 0) return path;
  path.moveTo(points[0].x, points[0].y);
  if (points.length === 1) return path;
  if (r <= 0 || points.length === 2) {
    for (let i = 1; i < points.length; i++) path.lineTo(points[i].x, points[i].y);
    return path;
  }
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1],
      p1 = points[i],
      p2 = points[i + 1];
    // 判断是否共线（避免 arcTo 生成冗余弧）
    const v1x = p1.x - p0.x,
      v1y = p1.y - p0.y;
    const v2x = p2.x - p1.x,
      v2y = p2.y - p1.y;
    const colinear = v1x * v2y - v1y * v2x === 0;
    if (colinear) {
      path.lineTo(p1.x, p1.y);
    } else {
      // 限制圆角半径不超过两段长度的一半
      const len1 = Math.hypot(v1x, v1y);
      const len2 = Math.hypot(v2x, v2y);
      const rr = Math.min(r, len1 / 2, len2 / 2);
      path.arcTo(p1.x, p1.y, p2.x, p2.y, rr);
    }
  }
  // 末端
  const last = points[points.length - 1];
  path.lineTo(last.x, last.y);
  return path;
}
