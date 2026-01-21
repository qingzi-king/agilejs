/*
 * @Description: 标签覆盖插件
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:07:53
 * @LastEditTime: 2025-12-22 21:34:27
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import {
  edgeLabelPositionStraight,
  edgeLabelPositionBezier,
  edgeLabelPositionOrthogonal,
  edgeLabelPositionPolyline,
} from "../utils/edgeLabel";
import { MoveNodeCommand, MoveNodesCommand } from "../commands/GraphCommands";
import type { NodeData, Point } from "../model/Graph";

export class LabelOverlayPlugin implements Plugin {
  readonly id = "label-overlay";
  private engine!: CanvasEngine;
  private draggingNodeId: string | null = null;
  private startPositions: Map<string, { x: number; y: number }> = new Map();
  private offsetX = 0;
  private offsetY = 0;
  private isDragging = false; // 是否实际发生拖拽
  private _rafMarkDirty: number | null = null;
  // 文本布局/宽度缓存（按字体、约束等关键参数区分），降低反复 measure 与分行成本
  private layoutCache = new Map<string, { lines: string[]; maxLineWidth: number; lineHeight: number }>();
  private widthCache = new Map<string, number>();
  private static readonly MAX_LAYOUT_CACHE = 3000;
  private static readonly MAX_WIDTH_CACHE = 3000;
  private makeLayoutKey(text: string, font: string, overflow: string, maxWidth?: number, lineHeight?: number): string {
    return `${font}|${overflow}|${maxWidth ?? -1}|${lineHeight ?? -1}|${text}`;
  }
  private getLayoutCached(
    ctx: CanvasRenderingContext2D,
    text: string,
    font: string,
    overflow: "wrap" | "ellipsis" | "scale-down" | "clip",
    maxWidth: number | undefined,
    lineHeight: number,
  ): { lines: string[]; maxLineWidth: number; lineHeight: number } {
    const key = this.makeLayoutKey(text, font, overflow, maxWidth, lineHeight);
    const hit = this.layoutCache.get(key);
    if (hit) return hit;
    const prev = ctx.font;
    ctx.font = font;
    const measure = (t: string) => ctx.measureText(t).width;
    const sizeMatch = /(\d+)px/.exec(font);
    const fs = sizeMatch ? parseInt(sizeMatch[1], 10) : 12;
    const layout = buildLabelLines(text, {
      fontSize: fs,
      fontWeight: "normal",
      fontFamily: "system-ui",
      measure,
      overflow,
      maxWidth,
      lineHeight,
    });
    ctx.font = prev;
    if (this.layoutCache.size >= LabelOverlayPlugin.MAX_LAYOUT_CACHE) {
      // 简单 LRU：删除最早插入项
      const k = this.layoutCache.keys().next().value;
      if (k) this.layoutCache.delete(k);
    }
    this.layoutCache.set(key, layout);
    return layout;
  }
  private getTextWidthCached(ctx: CanvasRenderingContext2D, text: string, font: string): number {
    const key = `${font}|${text}`;
    const hit = this.widthCache.get(key);
    if (hit != null) return hit;
    const prev = ctx.font;
    ctx.font = font;
    const w = ctx.measureText(text).width;
    ctx.font = prev;
    if (this.widthCache.size >= LabelOverlayPlugin.MAX_WIDTH_CACHE) {
      const k = this.widthCache.keys().next().value;
      if (k) this.widthCache.delete(k);
    }
    this.widthCache.set(key, w);
    return w;
  }
  setup(engine: CanvasEngine): void {
    this.engine = engine;
    // 捕获阶段拦截：点击标签不透传给其他插件；单击选中节点
    this.engine.canvas.addEventListener("mousedown", this.onMouseDownCapture, true);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
  }

  dispose(): void {
    this.engine.canvas.removeEventListener("mousedown", this.onMouseDownCapture, true);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);

    if (this._rafMarkDirty != null) {
      cancelAnimationFrame(this._rafMarkDirty);
      this._rafMarkDirty = null;
    }
  }

  private requestMarkDirtyStructure(): void {
    if (this._rafMarkDirty != null) return;
    this._rafMarkDirty = requestAnimationFrame(() => {
      this._rafMarkDirty = null;
      this.engine.graph.markDirty("structure");
    });
  }

  private markDirtyForPreview(): void {
    // 边快照模式下，边几何的更新依赖 Graph 的结构版本（structureVersion）。
    // 从 label 区域发起的拖拽不会经过 DragPlugin 的节流 markDirty，因此这里需要补齐。
    if (this.engine.getEdgeSnapshotMode() === "off") {
      this.engine.graph.markDirty("style");
    } else {
      this.requestMarkDirtyStructure();
    }
  }

  renderEdgeLabels(ctx: CanvasRenderingContext2D): void {
    // world-space 内：ctx 已经应用了 world transform，此时直接绘制世界坐标中的标签，使其被节点覆盖
    const g = this.engine.graph;
    const scale = this.engine.getScale();
    for (const e of g.getEdges()) {
      const content = String(e.data?.label ?? "");
      if (!content) continue;
      const style: any = e.data?.style || {};
      const edgeLabelStyle: any = style.label || {};
      let pos: Point | undefined;
      if (e.shape === "edge-straight") pos = edgeLabelPositionStraight(e, g);
      else if (e.shape === "edge-bezier") pos = edgeLabelPositionBezier(e, g);
      else if (e.shape === "edge-orthogonal") pos = edgeLabelPositionOrthogonal(e, g);
      else if (e.shape === "edge-polyline") pos = edgeLabelPositionPolyline(e, g);
      if (!pos) continue;
      ctx.save();
      const color = edgeLabelStyle.color || "#111827";
      const edgeFontSize = edgeLabelStyle.fontSize ?? 12; // world-space 固定字号
      const fontFamily = edgeLabelStyle.fontFamily || "system-ui, -apple-system, Segoe UI, Roboto";
      const fontWeight = edgeLabelStyle.fontWeight || 400;
      const fontStyle = edgeLabelStyle.fontStyle || "normal";
      ctx.fillStyle = color;
      ctx.font = `${fontStyle} ${fontWeight} ${edgeFontSize}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // 背景：根据文本测量结果绘制包裹矩形
      const font = `${fontStyle} ${fontWeight} ${edgeFontSize}px ${fontFamily}`;
      const textW = this.getTextWidthCached(ctx, content, font);
      const textH = edgeFontSize; // 简化估算高度
      const paddingX = 4; // 边标签使用轻量 padding
      const paddingY = 2;
      const bg = edgeLabelStyle.background || "";
      const bgAlpha = edgeLabelStyle.backgroundAlpha ?? 1;
      if (bg) {
        ctx.save();
        ctx.globalAlpha = bgAlpha;
        ctx.fillStyle = bg;
        // 以 center/middle 为参考，计算背景左上角
        const bx = pos.x - textW / 2 - paddingX;
        const by = pos.y - textH / 2 - paddingY;
        ctx.fillRect(bx, by, textW + paddingX * 2, textH + paddingY * 2);
        ctx.restore();
      }
      ctx.fillText(content, pos.x, pos.y);
      ctx.restore();
    }
  }

  afterRender(_ctx: CanvasRenderingContext2D): void {
    // 迁移：节点文本与标签的绘制已移至 renderNodeLabels（world-space 按 zIndex 紧随节点绘制）
  }

  // 新增：每节点绘制其主文本与标签（world-space），保证与节点层级一致
  renderNodeLabels(ctx: CanvasRenderingContext2D, n: NodeData): void {
    const scale = this.engine.getScale();
    // 1) 主文本（style.text）
    const styleAll = (n.data?.style as any) || {};
    const textCfg = (styleAll.text as any) || {};
    const mainText = String(n.data?.text ?? "");
    if (mainText) {
      const center = { x: n.position.x + n.size.width / 2, y: n.position.y + n.size.height / 2 };
      const fontSize = textCfg.fontSize ?? 14; // world-space：不乘 scale，随节点缩放
      const fontFamily = textCfg.fontFamily ?? "system-ui, -apple-system, Segoe UI, Roboto";
      const fontWeight = textCfg.fontWeight ?? "normal";
      const fontStyle = textCfg.fontStyle ?? "normal";
      const color = textCfg.color ?? "#111827";
      const alpha = textCfg.alpha ?? 1;
      const align = (textCfg.textAlign ?? "center") as CanvasTextAlign;
      const baseline = (textCfg.textBaseline ?? "middle") as CanvasTextBaseline;
      const paddingX = textCfg.paddingX ?? 0;
      const paddingY = textCfg.paddingY ?? 0;
      const overflow = (textCfg.textOverflow ?? "wrap") as "wrap" | "ellipsis" | "scale-down" | "clip";
      const lineHeight = textCfg.lineHeightPx
        ? textCfg.lineHeightPx
        : Math.round(fontSize * (textCfg.lineHeight ?? 1.2));
      // 容器尺寸（world 坐标）
      const containerW = n.size.width;
      const containerH = n.size.height;
      const contentW = Math.max(0, containerW - paddingX * 2);
      const desiredMax = textCfg.maxWidth != null ? textCfg.maxWidth : contentW;
      const maxWidth = Math.min(desiredMax, contentW);
      ctx.save();
      ctx.globalAlpha = alpha;
      const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.font = font;
      // 使用 "div 语义" 的对齐：以容器为参考
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const layout = this.getLayoutCached(ctx, mainText, font, overflow, maxWidth, lineHeight);
      const follow = textCfg.rotateWithNode !== false;
      // 切换至节点中心（world-space）
      ctx.translate(center.x, center.y);
      if (follow && (n.rotation ?? 0)) ctx.rotate(((n.rotation ?? 0) * Math.PI) / 180);
      const blockW = layout.maxLineWidth;
      const blockH = layout.lines.length ? (layout.lines.length - 1) * layout.lineHeight + fontSize : 0;
      // 以容器为参考：计算对齐锚点
      const hor =
        align === "left" || align === "start"
          ? -containerW / 2
          : align === "right" || align === "end"
            ? containerW / 2
            : 0;
      const ver =
        baseline === "top" || baseline === "hanging"
          ? -containerH / 2
          : baseline === "bottom" || baseline === "ideographic" || baseline === "alphabetic"
            ? containerH / 2
            : 0;
      const ax = hor + (textCfg.offsetX ?? 0);
      const ay = ver + (textCfg.offsetY ?? 0);
      const axAdj =
        ax + (align === "left" || align === "start" ? paddingX : align === "right" || align === "end" ? -paddingX : 0);
      const ayAdj =
        ay +
        (baseline === "top" || baseline === "hanging"
          ? paddingY
          : baseline === "bottom" || baseline === "ideographic" || baseline === "alphabetic"
            ? -paddingY
            : 0);
      const localOrigin = computeLabelRectTopLeft(axAdj, ayAdj, blockW, blockH, paddingX, paddingY, align, baseline);
      // 背景（可选）
      const bg = textCfg.background || "";
      const bgAlpha = textCfg.backgroundAlpha ?? 1;
      if (bg) {
        ctx.save();
        ctx.globalAlpha = bgAlpha;
        ctx.fillStyle = bg;
        ctx.fillRect(localOrigin.x, localOrigin.y, blockW + paddingX * 2, blockH + paddingY * 2);
        ctx.restore();
      }
      // 绘制文本
      ctx.textAlign = align;
      const drawX =
        align === "left" || align === "start"
          ? localOrigin.x + paddingX
          : align === "right" || align === "end"
            ? localOrigin.x + paddingX + blockW
            : localOrigin.x + paddingX + blockW / 2;
      const startYTop = localOrigin.y + paddingY;
      ctx.fillStyle = color;
      layout.lines.forEach((line, i) => {
        const ly = startYTop + i * layout.lineHeight + fontSize / 2;
        ctx.fillText(line, drawX, ly);
      });
      ctx.restore();
    }

    // 2) 标签文本（style.label）
    const { text, style } = getNodeLabelConfig(n);
    if (!text) return;
    const follow = style.rotateWithNode !== false;
    let anchor = resolveNodeLabelAnchor(n, style.position);
    // 对于 line 节点：让标签贴合线条路径的中点，并沿切线方向摆放
    // 优先使用沿线定位（忽略 position 配置），如需保留旧行为，可在未来增加 position:'path' 开关
    let followAngleRad: number | null = null;
    if (n.shape === "line") {
      const pts = getLineNodeWorldPoints(n);
      if (pts.length >= 2) {
        const mid = polylineMidpointAndAngle(pts);
        if (mid) {
          anchor = mid.pos;
          // 使文本朝上（避免倒置）：将角度归一化到 [-90°, 90°]
          let ang = mid.angleRad;
          const deg = (ang * 180) / Math.PI;
          if (deg > 90 || deg < -90) ang = ((deg + 180) * Math.PI) / 180;
          followAngleRad = ang;
        }
      }
    }
    if (followAngleRad == null && follow && (n.rotation ?? 0)) {
      const center = { x: n.position.x + n.size.width / 2, y: n.position.y + n.size.height / 2 };
      anchor = rotateAround(anchor, center, n.rotation!);
    }

    const fontSize = style.fontSize ?? 12; // world-space：不乘 scale
    const fontFamily = style.fontFamily ?? "system-ui, -apple-system, Segoe UI, Roboto";
    const fontWeight = style.fontWeight ?? 400;
    const fontStyle = style.fontStyle ?? "normal";
    const textAlign = (style.textAlign ?? "center") as CanvasTextAlign;
    const textBaseline = (style.textBaseline ?? "middle") as CanvasTextBaseline;
    const color = style.color ?? "#111827";
    const alpha = style.alpha ?? 1;
    const paddingX = style.paddingX ?? 6;
    const paddingY = style.paddingY ?? 3;
    const offsetX = style.offsetX ?? 0;
    const offsetY = style.offsetY ?? 0;
    const background = style.background ?? "";
    const backgroundAlpha = style.backgroundAlpha ?? (background ? 1 : 0);
    const overflow = (style.textOverflow ?? "wrap") as "wrap" | "ellipsis" | "scale-down" | "clip";
    const baseLineHeightPx = style.lineHeightPx ? style.lineHeightPx : undefined;
    const lineHeight = baseLineHeightPx ?? Math.round(fontSize * (style.lineHeight ?? 1.2));
    const baseMaxW: number | undefined =
      style.maxWidth ??
      style.width ??
      (["top", "bottom", "center", undefined].includes(style.position) ? n.size.width : undefined);
    const maxWidth: number | undefined = baseMaxW != null ? baseMaxW : undefined;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    const layout = this.getLayoutCached(ctx, text, font, overflow, maxWidth, lineHeight);
    const blockW = layout.maxLineWidth;
    const blockH = layout.lines.length === 0 ? 0 : (layout.lines.length - 1) * layout.lineHeight + fontSize;

    // 切换到锚点（world-space）并应用旋转
    ctx.translate(anchor.x, anchor.y);
    if (followAngleRad != null) {
      ctx.rotate(followAngleRad);
    } else if (follow && (n.rotation ?? 0)) {
      ctx.rotate(((n.rotation ?? 0) * Math.PI) / 180);
    }

    // 背景
    // 注意：标签的 top/bottom 语义与直觉相反（期望 top=在锚点之上、bottom=在锚点之下）
    // 为保持主文本行为不变，仅对“标签”进行基线翻转处理
    const effBaseline = flipVerticalBaselineForLabel(textBaseline);
    // 先得到未施加外部“与锚点距离”语义（GAP）的内部对齐原点，offsetY 直接参与 baseline 计算
    const localOriginBase = computeLabelRectTopLeft(
      offsetX,
      offsetY,
      blockW,
      blockH,
      paddingX,
      paddingY,
      textAlign,
      effBaseline,
    );
    let bgX = localOriginBase.x,
      bgY = localOriginBase.y;
    const bgW = blockW + paddingX * 2,
      bgH = blockH + paddingY * 2;
    // 统一 GAP 最小距离：语义为锚点与文本块最近边缘的最小像素距离，不再覆盖 offsetY，只在需要时添加额外位移
    const GAP = 5;
    if (style.position === "top") {
      // 标签整体在锚点上方：锚点应位于标签底部下方 GAP 处
      // 当前标签底部 = bgY + bgH；期望标签底部 = -GAP + offsetY（让 offsetY 正值向下靠近锚点，负值远离）
      const desiredBottom = -GAP + offsetY;
      const delta = desiredBottom - (bgY + bgH);
      bgY += delta; // 精确对齐期望底部
    } else if (style.position === "bottom") {
      // 标签整体在锚点下方：期望标签顶部 = GAP + offsetY（正值继续向下，负值向上靠近锚点）
      const desiredTop = GAP + offsetY;
      const delta = desiredTop - bgY;
      bgY += delta;
    } else if (style.position === "left") {
      // 左侧：期望标签右边缘 = -GAP + offsetX（offsetX 已包含于 localOriginBase 中，仅做 GAP 校验）
      const currentRight = bgX + bgW;
      const desiredRight = -GAP + offsetX;
      const delta = desiredRight - currentRight;
      bgX += delta;
    } else if (style.position === "right") {
      // 右侧：期望标签左边缘 = GAP + offsetX
      const desiredLeft = GAP + offsetX;
      const delta = desiredLeft - bgX;
      bgX += delta;
    }
    if (background) {
      ctx.save();
      ctx.globalAlpha = backgroundAlpha;
      ctx.fillStyle = background;
      ctx.fillRect(bgX, bgY, bgW, bgH);
      const bgStroke = style.backgroundStroke ?? "";
      const bgStrokeWidth = style.backgroundStrokeWidth ?? 0;
      if (bgStroke && bgStrokeWidth > 0) {
        ctx.strokeStyle = bgStroke;
        ctx.lineWidth = bgStrokeWidth;
        ctx.strokeRect(bgX, bgY, bgW, bgH);
      }
      ctx.restore();
    }

    // 文本
    const prevBaseline = ctx.textBaseline;
    ctx.textAlign = textAlign;
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    // 按新的背景原点回推文本起点：由于我们精确定位了背景矩形，文本内部起点 = 背景左上 + padding
    const dxText = 0; // 已直接用 bgX 计算
    const dyText = 0;
    let drawX =
      textAlign === "left" || textAlign === "start"
        ? bgX + paddingX
        : textAlign === "right" || textAlign === "end"
          ? bgX + paddingX + blockW
          : bgX + paddingX + blockW / 2;
    // 行距补偿重算：移除 style.leadingBalance，使用行数自适应居中公式
    // totalExtra = (lineHeight - fontSize) * (L - 1) 为所有行间额外空间
    // 为获得更自然的视觉居中，在顶部添加：extraLeading * 0.5 * (L - 1) / L
    // L=1 -> 0, L=2 -> 0.25*extra, L=3 -> ~0.33*extra, L->∞ -> 0.5*extra
    const L = layout.lines.length; // 行数
    const extraLeading = Math.max(0, lineHeight - fontSize);
    const leadingComp = L > 1 ? (extraLeading * 0.5 * (L - 1)) / L : 0.5;
    let startYTop = bgY + paddingY + leadingComp;
    layout.lines.forEach((line, i) => {
      const ly = startYTop + i * layout.lineHeight + fontSize / 2;
      ctx.fillText(line, drawX, ly);
    });
    ctx.textBaseline = prevBaseline;
    ctx.restore();
  }

  private emitSelectionChanged(reason: string) {
    const nodes = this.engine.graph
      .getNodes()
      .filter((n) => n.selected)
      .map((n) => n.id);
    const edges = this.engine.graph
      .getEdges()
      .filter((e) => e.selected)
      .map((e) => e.id);
    this.engine.events.emit("graph:selection-change", { nodes, edges, reason });
  }

  // 捕获阶段命中标签并处理选择
  private onMouseDownCapture = (e: MouseEvent) => {
    // 检查引擎全局交互配置
    const interactionConfig = this.engine.getInteractionConfig();
    const canSelect = interactionConfig.enableSelection;
    const canDrag = interactionConfig.enableDrag;

    // 如果选中和拖拽都被禁用，则不处理标签交互
    if (!canSelect && !canDrag) return;

    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const nodes = this.engine.graph.getNodes();
    const hit = this.hitLabel(nodes, screen);
    if (hit) {
      // 不可选：忽略交互
      if ((hit as any).selectable === false) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 只有在允许选中时才处理选择逻辑
      if (canSelect) {
        const additive = e.metaKey || e.ctrlKey || e.shiftKey;
        // 选择行为优化：
        // - 若已在选集且未按住叠加键：不改变当前选集（避免清空），直接从标签拖动整个选集/组合。
        // - 若按住叠加键：切换该节点的选中状态（支持多选/反选）。
        // - 若未选中且未按叠加键：清空并单选该节点。
        if (hit.selected) {
          if (additive) {
            hit.selected = false;
          } // 非 additive 情况保留当前选集不变
        } else {
          if (!additive) {
            // 互斥：节点与边不可同时选中，清空边选中
            for (const ed of this.engine.graph.getEdges()) ed.selected = false;
            for (const n of nodes) n.selected = false;
            hit.selected = true;
          } else {
            hit.selected = true;
          }
        }
        this.engine.events.emit("graph:change", { reason: "label-click-select" });
        this.emitSelectionChanged("label-click-select");
      }

      // 只有在允许拖拽时才处理拖拽逻辑
      if (canDrag) {
        // 从标签区域发起拖拽（以选集中第一个节点的相对偏移作为初始 offset）
        const world = this.engine.toWorld(screen);
        // 拖拽基准节点：优先使用命中的节点，否则使用任意已选节点
        const baseNode = hit.selected ? hit : (nodes.find((n) => n.selected) ?? hit);
        // 仅当可拖拽时允许从标签发起拖动
        this.draggingNodeId = (baseNode as any).draggable === false ? null : baseNode.id;
        this.offsetX = world.x - baseNode.position.x;
        this.offsetY = world.y - baseNode.position.y;
        this.startPositions.clear();
        for (const n of nodes) if (n.selected) this.startPositions.set(n.id, { x: n.position.x, y: n.position.y });
        this.isDragging = false;
      }

      e.preventDefault();
      e.stopPropagation();
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    // 检查引擎是否允许拖拽
    const interactionConfig = this.engine.getInteractionConfig();
    if (!interactionConfig.enableDrag) {
      // 如果禁用拖拽，清理拖拽状态
      if (this.draggingNodeId) {
        this.draggingNodeId = null;
        this.startPositions.clear();
        this.isDragging = false;
      }
      return;
    }

    if (!this.draggingNodeId) return;
    const node = this.engine.graph.getNode(this.draggingNodeId);
    if (!node) return;
    if ((node as any).draggable === false) return;
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const nx = world.x - this.offsetX;
    const ny = world.y - this.offsetY;
    const start = this.startPositions.get(node.id) ?? { x: node.position.x, y: node.position.y };
    const dx = nx - start.x;
    const dy = ny - start.y;
    // 首次发生实际位移时，触发 dragStart
    if (!this.isDragging && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
      this.isDragging = true;
      // 触发 DPR 降级以提升 Retina 屏幕拖动性能（传递拖动节点数量用于渐进式降级）
      this.engine.setDraggingNodes(true, this.startPositions.size);
      const selectedIds = Array.from(this.startPositions.keys());
      this.engine.events.emit("node:drag-start", {
        nodeId: this.draggingNodeId,
        selectedNodeIds: selectedIds,
        screen,
        world,
      });
    }
    // 拖动过程中持续发 dragMove
    if (this.isDragging) {
      this.engine.events.emit("node:drag-move", {
        nodeId: this.draggingNodeId,
        dx: Math.round(dx),
        dy: Math.round(dy),
        screen,
        world,
      });
    }
    for (const [id, pos] of this.startPositions.entries()) {
      const n = this.engine.graph.getNode(id);
      if (n && (n as any).draggable !== false) {
        n.position.x = pos.x + dx;
        n.position.y = pos.y + dy;
      }
    }

    // 关键：拖拽预览时让边快照失效（未指定锚点时边端点依赖节点中心），确保实时更新
    this.markDirtyForPreview();
  };

  private onMouseUp = () => {
    const EPS = 0.01;

    if (this._rafMarkDirty != null) {
      cancelAnimationFrame(this._rafMarkDirty);
      this._rafMarkDirty = null;
    }

    if (this.draggingNodeId && this.isDragging) {
      // 恢复原生 DPR
      this.engine.setDraggingNodes(false);
      this.engine.events.emit('node:drag-end', {
        nodeId: this.draggingNodeId,
        selectedNodeIds: Array.from(this.startPositions.keys()),
      });
    }
    if (this.draggingNodeId) {
      const ids = Array.from(this.startPositions.keys());
      if (ids.length === 1) {
        const n = this.engine.graph.getNode(ids[0]!);
        if (n && (n as any).draggable !== false) {
          const finalX = n.position.x;
          const finalY = n.position.y;
          const start = this.startPositions.get(n.id);
          if (start) {
            const dx = finalX - start.x;
            const dy = finalY - start.y;
            if (Math.abs(dx) < EPS && Math.abs(dy) < EPS) {
              n.position.x = start.x;
              n.position.y = start.y;
            } else {
              n.position.x = start.x;
              n.position.y = start.y;
              this.engine.history.execute(new MoveNodeCommand(this.engine.graph, n.id, finalX, finalY));
            }
          }
        }
      } else if (ids.length > 1) {
        // 仅对可拖拽节点计算与提交
        const draggableIds = ids.filter((id) => (this.engine.graph.getNode(id) as any)?.draggable !== false);
        let dx = 0,
          dy = 0;
        if (draggableIds.length > 0) {
          const refId = draggableIds[0]!;
          const start = this.startPositions.get(refId)!;
          const cur = this.engine.graph.getNode(refId)!;
          dx = cur.position.x - start.x;
          dy = cur.position.y - start.y;
        }
        // 回滚预览位移仅针对可拖节点
        for (const id of draggableIds) {
          const node = this.engine.graph.getNode(id);
          const s = this.startPositions.get(id);
          if (node && s) {
            node.position.x = s.x;
            node.position.y = s.y;
          }
        }
        if (draggableIds.length > 0 && (Math.abs(dx) >= EPS || Math.abs(dy) >= EPS)) {
          this.engine.history.execute(new MoveNodesCommand(this.engine.graph, draggableIds, dx, dy));
        }
      }
    }
    this.draggingNodeId = null;
    this.isDragging = false;
    this.startPositions.clear();
  };

  private hitLabel(nodes: NodeData[], screen: { x: number; y: number }): NodeData | null {
    const ctx = this.engine.ctx;
    const scale = this.engine.getScale();
    for (const n of nodes) {
      if (n.visible === false) continue;
      // 不可选：标签区域也不命中
      if ((n as any).selectable === false) continue;
      const nstyle2 = (n.data?.style as any) || {};
      const { text, style } = getNodeLabelConfig(n);
      if (!text) continue;
      const fontSize = (style.fontSize ?? 12) * scale;
      const fontFamily = style.fontFamily ?? "system-ui, -apple-system, Segoe UI, Roboto";
      const fontWeight = style.fontWeight ?? 400;
      const fontStyle = style.fontStyle ?? "normal";
      const textAlign = (style.textAlign ?? "center") as CanvasTextAlign;
      const textBaseline = (style.textBaseline ?? "middle") as CanvasTextBaseline;
      const paddingX = (style.paddingX ?? 6) * scale;
      const paddingY = (style.paddingY ?? 3) * scale;
      const offsetX = (style.offsetX ?? 0) * scale;
      const offsetY = (style.offsetY ?? 0) * scale;
      const overflow = (style.textOverflow ?? "wrap") as "wrap" | "ellipsis" | "scale-down" | "clip";
      const baseLineHeightPx = style.lineHeightPx ? style.lineHeightPx * scale : undefined;
      const lineHeight = baseLineHeightPx ?? Math.round(fontSize * (style.lineHeight ?? 1.2));
      const baseMaxW: number | undefined =
        style.maxWidth ??
        style.width ??
        (["top", "bottom", "center", undefined].includes(style.position) ? n.size.width : undefined);
      const maxWidth: number | undefined = baseMaxW != null ? baseMaxW * scale : undefined;
      const follow = style.rotateWithNode !== false;

      // measure + layout
      const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      const layout = this.getLayoutCached(ctx, text, font, overflow, maxWidth, lineHeight);

      let anchor = resolveNodeLabelAnchor(n, style.position);
      // 与渲染一致：line 节点走沿线锚点与角度
      let followAngleRad: number | null = null;
      if (n.shape === "line") {
        const pts = getLineNodeWorldPoints(n);
        if (pts.length >= 2) {
          const mid = polylineMidpointAndAngle(pts);
          if (mid) {
            anchor = mid.pos;
            let ang = mid.angleRad;
            const deg = (ang * 180) / Math.PI;
            if (deg > 90 || deg < -90) ang = ((deg + 180) * Math.PI) / 180;
            followAngleRad = ang;
          }
        }
      }
      if (followAngleRad == null && follow && (n.rotation ?? 0)) {
        const center = { x: n.position.x + n.size.width / 2, y: n.position.y + n.size.height / 2 };
        anchor = rotateAround(anchor, center, n.rotation!);
      }
      const sp = this.engine.toScreen(anchor);
      const blockW = layout.maxLineWidth;
      const blockH = layout.lines.length === 0 ? 0 : (layout.lines.length - 1) * layout.lineHeight + fontSize;
      const effBaseline = flipVerticalBaselineForLabel(textBaseline);
      const local = computeLabelRectTopLeft(
        0 + offsetX,
        0 + offsetY,
        blockW,
        blockH,
        paddingX,
        paddingY,
        textAlign,
        effBaseline,
      );
      let bx = local.x,
        by = local.y;
      const bw = blockW + paddingX * 2,
        bh = blockH + paddingY * 2;
      // 命中检测同样施加外间距，使用屏幕尺度下的像素
      const GAP = 5 * scale;
      if (style.position === "bottom") {
        const minTop = GAP;
        if (by < minTop) by += minTop - by;
      } else if (style.position === "top") {
        const maxBottom = -GAP;
        const bottom = by + bh;
        if (bottom > maxBottom) by += maxBottom - bottom;
      } else if (style.position === "right") {
        const minLeft = GAP;
        if (bx < minLeft) bx += minLeft - bx;
      } else if (style.position === "left") {
        const maxRight = -GAP;
        const right = bx + bw;
        if (right > maxRight) bx += maxRight - right;
      }

      // 转换屏幕点到本地
      let px = screen.x - sp.x;
      let py = screen.y - sp.y;
      if (followAngleRad != null) {
        const rad = -followAngleRad;
        const rx = px * Math.cos(rad) - py * Math.sin(rad);
        const ry = px * Math.sin(rad) + py * Math.cos(rad);
        px = rx;
        py = ry;
      } else if (follow && (n.rotation ?? 0)) {
        const rad = -((n.rotation ?? 0) * Math.PI) / 180;
        const rx = px * Math.cos(rad) - py * Math.sin(rad);
        const ry = px * Math.sin(rad) + py * Math.cos(rad);
        px = rx;
        py = ry;
      }
      if (px >= bx && px <= bx + bw && py >= by && py <= by + bh) {
        return n;
      }
    }
    return null;
  }
}

// 解析节点标签配置
function getNodeLabelConfig(n: NodeData): { text: string; style: any } {
  const text = String((n.data as any)?.label ?? "");
  // 优先 data.style.label，然后 data.labelStyle（兼容）
  const styleFromStyle = ((n.data as any)?.style as any)?.label ?? {};
  const styleLegacy = (n.data as any)?.labelStyle ?? {};
  const style = { ...styleLegacy, ...styleFromStyle };
  return { text, style };
}

// 根据 position 决定标签锚点（未考虑节点旋转，默认不随节点旋转以保证可读性）
function resolveNodeLabelAnchor(n: NodeData, position?: string): Point {
  const x = n.position.x;
  const y = n.position.y;
  const w = n.size.width;
  const h = n.size.height;
  const pos = position ?? "center";
  switch (pos) {
    case "top":
      return { x: x + w / 2, y: y };
    case "bottom":
      return { x: x + w / 2, y: y + h };
    case "left":
      return { x: x, y: y + h / 2 };
    case "right":
      return { x: x + w, y: y + h / 2 };
    case "center":
    default:
      return { x: x + w / 2, y: y + h / 2 };
  }
}

// 依据对齐方式计算背景矩形左上角
function computeLabelRectTopLeft(
  x: number,
  y: number,
  textW: number,
  textH: number,
  paddingX: number,
  paddingY: number,
  textAlign: CanvasTextAlign,
  textBaseline: CanvasTextBaseline,
): { x: number; y: number } {
  // 语义：锚点 (x,y) 与 ctx.textAlign/textBaseline 一致
  // - align:left   => 锚点是文本左边缘
  // - align:center => 锚点是文本中心
  // - align:right  => 锚点是文本右边缘
  // 背景矩形须包含 padding
  let left: number;
  if (textAlign === "left" || textAlign === "start") {
    left = x - paddingX;
  } else if (textAlign === "right" || textAlign === "end") {
    left = x - (textW + paddingX);
  } else {
    // center
    left = x - (textW / 2 + paddingX);
  }

  let top: number;
  if (textBaseline === "top" || textBaseline === "hanging") {
    top = y - paddingY;
  } else if (textBaseline === "middle") {
    top = y - (textH / 2 + paddingY);
  } else if (textBaseline === "bottom" || textBaseline === "ideographic") {
    top = y - (textH + paddingY);
  } else {
    // alphabetic 等：近似为底部
    top = y - (textH + paddingY);
  }
  return { x: left, y: top };
}

// 生成多行文本布局（与 TextRenderer 策略保持一致）
function buildLabelLines(
  content: string,
  opts: {
    fontSize: number;
    fontWeight: string | number;
    fontFamily: string;
    measure: (t: string) => number;
    overflow: "wrap" | "ellipsis" | "scale-down" | "clip";
    maxWidth?: number;
    lineHeight: number;
  },
): { lines: string[]; maxLineWidth: number; lineHeight: number } {
  const { measure, overflow, maxWidth, fontSize } = opts;
  const width = Math.max(0, maxWidth ?? 0);

  const lines: string[] = [];
  const commit = (s: string) => {
    lines.push(s);
  };
  let maxW = 0;

  if (!maxWidth || width === 0) {
    // 无约束：单行
    maxW = measure(content);
    return { lines: [content], maxLineWidth: maxW, lineHeight: opts.lineHeight };
  }

  if (overflow === "ellipsis") {
    const ell = "…";
    if (measure(content) <= width) {
      commit(content);
      maxW = Math.max(maxW, measure(content));
    } else {
      let acc = "";
      for (const ch of content) {
        const next = acc + ch;
        if (measure(next + ell) > width) break;
        acc = next;
      }
      commit(acc + ell);
      maxW = Math.max(maxW, measure(acc + ell));
    }
    return { lines, maxLineWidth: maxW, lineHeight: opts.lineHeight };
  }

  if (overflow === "scale-down") {
    if (measure(content) <= width) {
      commit(content);
      maxW = Math.max(maxW, measure(content));
      return { lines, maxLineWidth: maxW, lineHeight: opts.lineHeight };
    }
    // 简化按像素减小字号直到单行容纳
    // 注意：调用方负责在 ctx 上更新字体
    let fs = opts.fontSize;
    let guard = 40;
    while (guard-- > 0 && fs > 6) {
      fs -= 1;
      // 这里无法直接修改 ctx.font，因此交由上层使用当前字号计算行高
      // 退化为 wrap 的一行处理（不换行）
      if (measure(content) <= width) break;
    }
    commit(content);
    maxW = Math.max(maxW, Math.min(width, measure(content)));
    return { lines, maxLineWidth: maxW, lineHeight: Math.round(fs * 1.2) };
  }

  // wrap：按 token 拆分
  const tokens = content.split(/(\s+)/).filter((t) => t.length > 0);
  let cur = "";
  const flush = () => {
    if (cur) {
      commit(cur);
      maxW = Math.max(maxW, measure(cur));
      cur = "";
    }
  };
  for (const tok of tokens) {
    if (/^\s+$/.test(tok)) {
      const next = cur + tok;
      if (measure(next) <= width) cur = next;
      else flush();
      continue;
    }
    if (!cur) {
      if (measure(tok) <= width) {
        cur = tok;
        continue;
      }
      let seg = "";
      for (const ch of tok) {
        const next = seg + ch;
        if (measure(next) > width) {
          commit(seg);
          maxW = Math.max(maxW, measure(seg));
          seg = ch;
        } else seg = next;
      }
      if (seg) {
        commit(seg);
        maxW = Math.max(maxW, measure(seg));
      }
    } else {
      const next = cur + tok;
      if (measure(next) <= width) cur = next;
      else {
        commit(cur);
        maxW = Math.max(maxW, measure(cur));
        cur = tok;
      }
    }
  }
  flush();
  if (lines.length === 0) {
    commit("");
  }
  return { lines, maxLineWidth: Math.max(maxW, 0), lineHeight: opts.lineHeight };
}

function computeMultilineStartTop(
  baseline: CanvasTextBaseline,
  y: number,
  fontSize: number,
  lineHeight: number,
  lineCount: number,
): number {
  const blockH = lineCount <= 0 ? 0 : (lineCount - 1) * lineHeight + fontSize;
  if (baseline === "top" || baseline === "hanging") return y;
  if (baseline === "bottom" || baseline === "ideographic" || baseline === "alphabetic") return y - blockH;
  // middle
  return y - blockH / 2;
}

function computeAlignedX(align: CanvasTextAlign, x: number, _blockW: number, _paddingX: number): number {
  // 对齐锚点直接使用 x，padding 只体现在背景矩形上
  return x;
}

// 仅用于“节点标签”的垂直对齐语义修正：
// - 期望：top 表示标签整体在锚点之上（文本块向上展开），bottom 表示在锚点之下
// - 现有实现中，Canvas 的 baseline 语义导致 top 使文本从 y 向下排布，和直觉相反
// - 因此仅对标签的 baseline 进行翻转，不影响主文本容器对齐
function flipVerticalBaselineForLabel(baseline: CanvasTextBaseline): CanvasTextBaseline {
  if (baseline === "top" || baseline === "hanging") return "bottom";
  if (baseline === "bottom" || baseline === "ideographic" || baseline === "alphabetic") return "top";
  return baseline; // middle 等保持不变
}

function rotateAround(p: Point, center: Point, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  const x = center.x + dx * Math.cos(rad) - dy * Math.sin(rad);
  const y = center.y + dx * Math.sin(rad) + dy * Math.cos(rad);
  return { x, y };
}

// 计算 line 节点（折线）在世界坐标下的点集（考虑自身旋转）
function getLineNodeWorldPoints(n: NodeData): Point[] {
  const cfg = (n.data as any)?.line || {};
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

// 取折线路径的几何中点以及该处的切线角度（弧度）
function polylineMidpointAndAngle(pts: Point[]): { pos: Point; angleRad: number } | null {
  if (!pts || pts.length < 2) return null;
  // 总长
  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLens.push(len);
    total += len;
  }
  if (total <= 1e-6) {
    // 退化：返回端点与 0 角度
    return { pos: { ...pts[0] }, angleRad: 0 };
  }
  const half = total / 2;
  let acc = 0;
  for (let i = 0; i < segLens.length; i++) {
    const len = segLens[i];
    if (acc + len >= half) {
      const t = (half - acc) / Math.max(len, 1e-6);
      const a = pts[i],
        b = pts[i + 1];
      const pos = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
      const angleRad = Math.atan2(b.y - a.y, b.x - a.x);
      return { pos, angleRad };
    }
    acc += len;
  }
  // 理论不会触发，兜底返回最后一段末端
  const a = pts[pts.length - 2],
    b = pts[pts.length - 1];
  return { pos: { ...b }, angleRad: Math.atan2(b.y - a.y, b.x - a.x) };
}
