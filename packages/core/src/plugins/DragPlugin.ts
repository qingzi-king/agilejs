/*
 * @Description: 拖拽插件（支持鼠标和触摸）
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-12-08 12:18:16
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import { hitTestNodes } from "../utils/hittest";
import { MoveNodeCommand, MoveNodesCommand, UpdateNodePropsCommand, SetZIndexCommand } from "../commands/GraphCommands";
import { GuidesPlugin } from "./GuidesPlugin";
import { SetEdgePointsCommand } from "../commands/GraphCommands";
import type { Point } from "../model/Graph";
import { PointerEventAdapter } from "../utils/pointer";

export class DragPlugin implements Plugin {
  readonly id = "drag";
  private engine!: CanvasEngine;
  private draggingNodeId: string | null = null;
  private startPositions: Map<string, { x: number; y: number }> = new Map();
  private offsetX = 0;
  private offsetY = 0;
  private edgePointsStart: Map<string, { points?: Point[] }> = new Map();
  private isDragging = false; // 是否实际发生拖拽
  // 延迟激活拖拽降质模式所需的待拖拽节点数量（仅当发生实际位移后才启用）
  private _pendingDragNodeCount = 0;

  // 性能优化：批量更新缓存和节流
  private _updateBatch: Array<{ node: import("../model/Graph").NodeData; x: number; y: number }> = [];
  private _throttleMarkDirty: (() => void) | null = null;

  // 组成员缓存（key: groupId, value: nodeIds[]）
  private _groupMembersCache = new Map<string, string[]>();
  private _groupMembersCacheDirty = true;

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    const c = engine.canvas;

    // 鼠标事件
    c.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);

    // 触摸事件
    c.addEventListener("touchstart", this.onTouchStart, { passive: false });
    c.addEventListener("touchmove", this.onTouchMove, { passive: false });
    c.addEventListener("touchend", this.onTouchEnd);
    c.addEventListener("touchcancel", this.onTouchEnd);

    // 初始化节流函数
    this._throttleMarkDirty = this.createThrottledMarkDirty();

    // 监听图变化，标记缓存失效
    this.engine.events.on("graphChanged", () => {
      this._groupMembersCacheDirty = true;
    });
  }

  // 创建节流的 markDirty 函数
  private createThrottledMarkDirty(): () => void {
    // 移除 requestAnimationFrame 节流，确保位置更新与图版本更新在同一帧
    // 解决拖拽时边与节点不同步（"脱节"）的问题
    return () => {
      this.engine.graph.markDirty();
    };
  }

  /**
   * 获取指定组ID的所有成员节点ID（支持嵌套，使用缓存优化性能）
   * @param groupId 组ID
   * @returns 组内所有节点ID数组
   */
  private getGroupMembers(groupId: string): string[] {
    // 刷新缓存
    if (this._groupMembersCacheDirty) {
      this._groupMembersCache.clear();
      this._groupMembersCacheDirty = false;
    }

    // 查询缓存
    const cached = this._groupMembersCache.get(groupId);
    if (cached) return cached;

    // 计算成员：检查 groupPath 中是否包含 groupId（支持嵌套）
    const nodes = this.engine.graph.getNodes();
    const members = nodes
      .filter((n) => {
        // 最内层组匹配
        if (n.groupId === groupId) return true;
        // 检查 groupPath 是否包含此 groupId（可能是外层组）
        if (n.groupPath && n.groupPath.includes(groupId)) return true;
        return false;
      })
      .map((n) => n.id);

    // 缓存结果
    this._groupMembersCache.set(groupId, members);
    return members;
  }

  dispose(): void {
    const c = this.engine.canvas;

    // 清理鼠标事件
    c.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);

    // 清理触摸事件
    c.removeEventListener("touchstart", this.onTouchStart);
    c.removeEventListener("touchmove", this.onTouchMove);
    c.removeEventListener("touchend", this.onTouchEnd);
    c.removeEventListener("touchcancel", this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent) => {
    // 检查引擎全局交互配置
    const interactionConfig = this.engine.getInteractionConfig();
    const canSelect = interactionConfig.enableSelection;
    const canDrag = interactionConfig.enableDrag;

    // 如果选择和拖拽都被禁用，则不处理
    if (!canSelect && !canDrag) return;

    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const nodes = this.engine.graph.getNodes();
    const hit = hitTestNodes(world, nodes, { scale: this.engine.getScale(), pixelThresholdPx: 10 });
    if (hit) {
      // 不可选：直接忽略交互
      if ((hit as any).selectable === false) return;

      // 只有在允许选择时才处理选择逻辑
      if (canSelect) {
        // 点击到节点：清除所有边的选中状态，避免节点与边同时保持选中
        {
          const edges = this.engine.graph.getEdges();
          let edgeCleared = false;
          for (const ed of edges) {
            if (ed.selected) {
              ed.selected = false;
              edgeCleared = true;
            }
          }
          if (edgeCleared) this.engine.events.emit("graph:change", { reason: "edge-selection-cleared" });
        }
      }

      // 只有在允许拖拽时才设置拖拽节点ID
      if (canDrag) {
        // 仅当可拖拽时允许开始拖动
        this.draggingNodeId = (hit as any).draggable === false ? null : hit.id;
      } else {
        this.draggingNodeId = null;
      }
      this.offsetX = world.x - hit.position.x;
      this.offsetY = world.y - hit.position.y;

      // 只有在允许选择时才处理选择逻辑
      if (canSelect) {
        // 若已有"多选"且命中的节点本身就在当前选集内，则不改变现有选集，直接进入整体拖动
        const selectedCount = nodes.reduce((acc, n) => acc + (n.selected ? 1 : 0), 0);
        const keepMultiSelection = selectedCount > 1 && !!hit.selected;

        if (!keepMultiSelection) {
          // 未处于多选整体拖动场景：根据命中节点/组更新选集
          if (hit.groupId) {
            const additive = e.shiftKey || e.metaKey || e.ctrlKey;
            if (!additive) nodes.forEach((n) => (n.selected = false));

            // 使用 getGroupMembers 获取组成员（支持嵌套）
            const groupMemberIds = this.getGroupMembers(hit.groupId);
            nodes.forEach((n) => {
              if (groupMemberIds.includes(n.id)) {
                if ((n as any).selectable === false) return;
                n.selected = true;
              }
            });
          } else {
            // 非组内节点：点击已选节点保持选择集，避免多选拖动"跳跃"
            if (!hit.selected) {
              if (e.shiftKey || e.metaKey || e.ctrlKey) {
                hit.selected = true; // 命中已通过 selectable 检查
              } else {
                nodes.forEach(
                  (n) => (n.selected = n.id === hit.id ? true : n.selectable === false ? n.selected : false),
                );
              }
            }
          }
        }
      }

      // 只有在允许拖拽时才记录起始位置
      if (canDrag) {
        // 记录所有选中节点的起始位置
        this.startPositions.clear();
        // 递归查找所有需要移动的节点（包括容器内的子节点）
        const nodesToMove = new Set<string>();
        const addWithDescendants = (n: any) => {
          if (nodesToMove.has(n.id)) return;
          nodesToMove.add(n.id);
          // 如果是容器，递归添加所有子节点
          if (n.isContainer) {
            const children = nodes.filter((child) => child.parentId === n.id);
            children.forEach(addWithDescendants);
          }
        };
        nodes.filter((n) => n.selected).forEach(addWithDescendants);

        for (const id of nodesToMove) {
          const n = this.engine.graph.getNode(id);
          if (n) this.startPositions.set(n.id, { x: n.position.x, y: n.position.y });
        }
        // 记录需要随组整体移动的折线边（两端都在选择集中，且两端均可拖拽）
        this.edgePointsStart.clear();
        const edges = this.engine.graph.getEdges();
        for (const ed of edges) {
          if (ed.shape !== "edge-polyline") continue;
          if (!this.startPositions.has(ed.source) || !this.startPositions.has(ed.target)) continue;
          const sNode = this.engine.graph.getNode(ed.source);
          const tNode = this.engine.graph.getNode(ed.target);
          if (!sNode || !tNode) continue;
          if ((sNode as any).draggable === false || (tNode as any).draggable === false) continue;
          const prev = ed.points ? ed.points.map((p) => ({ x: p.x, y: p.y })) : undefined;
          this.edgePointsStart.set(ed.id, { points: prev });
        }
        // 拖拽降质模式：延迟到首次实际移动（mousemove 判定 isDragging 为 true 时）再启用
        if (this.draggingNodeId) {
          this._pendingDragNodeCount = this.startPositions.size;
        } else {
          this._pendingDragNodeCount = 0;
        }
        // 拖拽开始事件延迟到 mousemove 首次发生
        this.isDragging = false;
      }

      // 节点选中可能变化：发出 selectionChanged + 兼容 graphChanged（若未变化则反映当前选集）
      if (canSelect) {
        const selectedNodeIds = this.engine.graph
          .getNodes()
          .filter((n) => n.selected)
          .map((n) => n.id);
        const selectedEdgeIds: string[] = []; // 此处未处理边选中
        this.engine.events.emit("graph:selection-change", {
          nodes: selectedNodeIds,
          edges: selectedEdgeIds,
          reason: "node-click",
        });
        this.engine.events.emit("graph:change", { reason: "node-selection" });
      }
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
        this.edgePointsStart.clear();
        this.isDragging = false;
        this.engine.setDraggingNodes(false, 0);
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
    // 当前主节点位移量
    const dx = nx - (this.startPositions.get(node.id)?.x ?? node.position.x);
    const dy = ny - (this.startPositions.get(node.id)?.y ?? node.position.y);
    // 首次发生实际位移时，触发 dragStart
    if (!this.isDragging && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
      this.isDragging = true;
      // 首次发生实际位移：此刻才开启引擎的拖拽降质模式（避免“仅选中即冻结边层”导致动画暂停）
      if (this._pendingDragNodeCount > 0) {
        this.engine.setDraggingNodes(true, this._pendingDragNodeCount);
      }
      const selectedIds = Array.from(this.startPositions.keys());
      this.engine.events.emit("node:drag-start" as any, {
        nodeId: this.draggingNodeId,
        selectedNodeIds: selectedIds,
        screen,
        world,
      });
    }

    // 性能优化：批量更新节点位置，减少临时数组分配
    // line节点保留小数精度，其他节点取整
    const qdx = Math.round(dx);
    const qdy = Math.round(dy);
    this._updateBatch.length = 0;

    // 收集需要更新的节点
    for (const [id, pos] of this.startPositions.entries()) {
      const n = this.engine.graph.getNode(id);
      if (n && (n as any).draggable !== false) {
        // line节点不取整，避免微跳动
        const isLineNode = n.shape === "line";
        const offsetX = isLineNode ? dx : qdx;
        const offsetY = isLineNode ? dy : qdy;
        this._updateBatch.push({ node: n, x: pos.x + offsetX, y: pos.y + offsetY });

        // 检查连接的正交边，若存在手动调整过的正交边，则重置（恢复自动路由）
        // 只有当节点实际移动时才触发
        if (Math.abs(offsetX) > 0 || Math.abs(offsetY) > 0) {
          const connectedEdges = this.engine.graph.connectedEdges(n.id);
          for (const edge of connectedEdges) {
            // 只要有 _orthogonalManual 标记，就说明是手动调整过的正交边（或类似逻辑的边）
            // 不严格检查 shape 名称，防止自定义 shape 导致失效
            if ((edge.data as any)?._orthogonalManual) {
              delete (edge.data as any)._orthogonalManual;
              edge.points = undefined; // 显式置空，确保恢复自动计算
            }
          }
        }
      }
    }

    // 批量应用位置更新
    for (let i = 0; i < this._updateBatch.length; i++) {
      const { node, x, y } = this._updateBatch[i];
      node.position.x = x;
      node.position.y = y;
    }

    // 组级吸附（整体对齐）：从 GuidesPlugin 计算最佳 delta 并叠加到预览
    const guides = (this.engine.plugins as any).get?.("guides") as GuidesPlugin | undefined;
    let sdx = 0,
      sdy = 0;
    if (guides) {
      // 性能优化：复用已经计算好的 _updateBatch，避免重复遍历和分配数组
      const moving = this._updateBatch.map((item) => ({
        x: item.x,
        y: item.y,
        width: item.node.size.width,
        height: item.node.size.height,
      }));
      const others = this.engine.graph
        .getNodes()
        .filter((n) => !this.startPositions.has(n.id))
        .map((n) => ({ x: n.position.x, y: n.position.y, width: n.size.width, height: n.size.height }));
      const snap = guides.computeSnapFor(moving, others);
      sdx = snap.dx ?? 0;
      sdy = snap.dy ?? 0;
      if (sdx !== 0 || sdy !== 0) {
        // 应用吸附偏移（line节点保持小数精度）
        for (let i = 0; i < this._updateBatch.length; i++) {
          const item = this._updateBatch[i];
          const pos = this.startPositions.get(item.node.id);
          if (pos) {
            const isLineNode = item.node.shape === "line";
            const offsetX = isLineNode ? dx + sdx : Math.round(dx + sdx);
            const offsetY = isLineNode ? dy + sdy : Math.round(dy + sdy);
            item.node.position.x = pos.x + offsetX;
            item.node.position.y = pos.y + offsetY;
          }
        }
      }
    }

    // 预览期：整体平移符合条件的折线边点位（保持相对形状）
    if (this.edgePointsStart.size > 0) {
      const tdx = dx + sdx,
        tdy = dy + sdy;
      const qtdx = Math.round(tdx),
        qtdy = Math.round(tdy);
      if (Math.abs(qtdx) > 0 || Math.abs(qtdy) > 0) {
        for (const [eid, snap] of this.edgePointsStart.entries()) {
          const e = this.engine.graph.getEdge(eid);
          if (!e) continue;
          const prev = snap.points;
          e.points = prev ? prev.map((p) => ({ x: p.x + qtdx, y: p.y + qtdy })) : undefined;
        }
      }
    }

    // 事件：拖动进行中
    this.engine.events.emit("node:drag-move" as any, {
      nodeId: this.draggingNodeId,
      dx: Math.round(dx + sdx),
      dy: Math.round(dy + sdy),
      screen,
      world,
    });

    // 性能优化：使用节流的 markDirty，降低调用频率
    if (this._throttleMarkDirty) {
      this._throttleMarkDirty();
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    const EPS = 0.01;
    if (this.draggingNodeId) {
      const ids = Array.from(this.startPositions.keys());
      if (ids.length === 1) {
        const node = this.engine.graph.getNode(ids[0]!);
        if (node && (node as any).draggable !== false) {
          // line节点不取整，避免调整端点时产生微跳动；其他节点取整为像素步长 1
          const isLineNode = node.shape === "line";
          const finalX = isLineNode ? node.position.x : Math.round(node.position.x);
          const finalY = isLineNode ? node.position.y : Math.round(node.position.y);
          const start = this.startPositions.get(node.id);
          if (start) {
            const dx = finalX - start.x;
            const dy = finalY - start.y;
            // 零位移：不入历史
            if (Math.abs(dx) < EPS && Math.abs(dy) < EPS) {
              node.position.x = start.x;
              node.position.y = start.y;
              // 触发点击事件
              this.engine.events.emit("node:click", { nodeId: node.id, event: e });
            } else {
              node.position.x = start.x;
              node.position.y = start.y;
              // 拖拽产生的一次连续移动，历史上合并为一条记录
              this.engine.history.execute(new MoveNodeCommand(this.engine.graph, node.id, finalX, finalY), {
                merge: true,
                mergeKey: "drag-move",
                mergeWindowMs: 500,
                label: "Drag Move",
              });
            }
          }
          this.handleContainerDrop([node.id]);
          this.engine.graph.markDirty();
        }
      } else if (ids.length > 1) {
        // 仅针对可拖拽节点提交变更
        const draggableIds = ids.filter((id) => (this.engine.graph.getNode(id) as any)?.draggable !== false);
        // 使用一个可拖节点计算 dx,dy；若不存在则无需提交
        let dx = 0,
          dy = 0;
        if (draggableIds.length > 0) {
          const refId = draggableIds[0]!;
          const start = this.startPositions.get(refId)!;
          const cur = this.engine.graph.getNode(refId)!;
          // 如果所有选中节点都是line节点，不取整；否则取整
          const allLineNodes = draggableIds.every((id) => this.engine.graph.getNode(id)?.shape === "line");
          if (allLineNodes) {
            dx = cur.position.x - start.x;
            dy = cur.position.y - start.y;
          } else {
            // 提交时位移取整，保证步长 1
            dx = Math.round(cur.position.x - start.x);
            dy = Math.round(cur.position.y - start.y);
          }
        }
        // 回滚预览位移：仅回滚可拖节点（不可拖节点未变更）
        for (const id of draggableIds) {
          const n = this.engine.graph.getNode(id);
          const s = this.startPositions.get(id);
          if (n && s) {
            n.position.x = s.x;
            n.position.y = s.y;
          }
        }
        // 回滚折线边点位预览
        for (const [eid, snap] of this.edgePointsStart.entries()) {
          const e = this.engine.graph.getEdge(eid);
          if (e) e.points = snap.points ? snap.points.map((p) => ({ x: p.x, y: p.y })) : undefined;
        }
        // 保证正交边在节点移动后恢复自动路由：清理所有涉及移动节点的连接边的手动状态
        for (const id of draggableIds) {
          const n = this.engine.graph.getNode(id);
          if (!n) continue;
          const connectedEdges = this.engine.graph.connectedEdges(n.id);
          for (const edge of connectedEdges) {
            if ((edge.data as any)?._orthogonalManual) {
              delete (edge.data as any)._orthogonalManual;
              edge.points = undefined;
            }
          }
        }
        if (draggableIds.length > 0 && (Math.abs(dx) >= EPS || Math.abs(dy) >= EPS)) {
          // 将节点移动与相关折线边点位移动作为一个事务提交（仅可拖节点）
          this.engine.history.beginTransaction("Drag Move");
          this.engine.history.execute(new MoveNodesCommand(this.engine.graph, draggableIds, dx, dy));
          // 对每条符合条件的折线边，推送点位平移命令
          for (const [eid, snap] of this.edgePointsStart.entries()) {
            const prev = snap.points ? snap.points.map((p) => ({ x: p.x, y: p.y })) : undefined;
            if (!prev) continue; // 没有中间点则无需记录
            const next = prev.map((p) => ({ x: p.x + dx, y: p.y + dy }));
            this.engine.history.execute(new SetEdgePointsCommand(this.engine.graph, eid, prev, next));
          }
          this.engine.history.commitTransaction();
          // 节点移动后的图变化：触发一次 graph:change，确保重新路由正交边
          this.engine.events.emit("graph:change", { reason: "nodes-moved-reroute-orthogonal" });
        }
        if (draggableIds.length > 0) this.handleContainerDrop(draggableIds);
        this.engine.graph.markDirty();
        // 事件：仅在实际发生拖拽时才触发 dragEnd
        if (this.draggingNodeId && this.isDragging) {
          this.engine.events.emit("node:drag-end" as any, {
            nodeId: this.draggingNodeId,
            selectedNodeIds: Array.from(this.startPositions.keys()),
          });
        }
        this.draggingNodeId = null;
      }
      this.draggingNodeId = null;
      this.isDragging = false;
      this._pendingDragNodeCount = 0;
      this.startPositions.clear();
      this.edgePointsStart.clear();
      // 批量拖动降质渲染：结束
      this.engine.setDraggingNodes(false, 0);
    }
  };

  // ========== 触摸事件处理 ==========

  private onTouchStart = (e: TouchEvent) => {
    // 仅处理单指触摸
    if (e.touches.length !== 1) return;

    const config = this.engine.getInteractionConfig();
    const canSelect = config.enableSelection;
    const canDrag = config.enableDrag;

    if (!canSelect && !canDrag) return;

    const touch = e.touches[0];
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const nodes = this.engine.graph.getNodes();
    const hit = hitTestNodes(world, nodes, { scale: this.engine.getScale(), pixelThresholdPx: 10 });

    if (hit) {
      // 清除边的选中状态
      if (canSelect) {
        const edges = this.engine.graph.getEdges();
        let edgeCleared = false;
        for (const ed of edges) {
          if (ed.selected) {
            ed.selected = false;
            edgeCleared = true;
          }
        }
        if (edgeCleared) this.engine.events.emit("graph:change", { reason: "edge-selection-cleared" });
      }

      // 设置拖拽节点
      if (canDrag) {
        this.draggingNodeId = (hit as any).draggable === false ? null : hit.id;
      } else {
        this.draggingNodeId = null;
      }

      this.offsetX = world.x - hit.position.x;
      this.offsetY = world.y - hit.position.y;
      this.isDragging = false;

      // 处理选择逻辑（与鼠标事件相同）
      if (canSelect) {
        const selectedCount = nodes.reduce((acc, n) => acc + (n.selected ? 1 : 0), 0);
        const keepMultiSelection = selectedCount > 1 && !!hit.selected;

        if (!keepMultiSelection) {
          // 检查组插件并选中组内所有节点
          let groupId: string | undefined;
          const groupPlugin = this.engine.plugins.get("group") as any;
          if (groupPlugin && typeof groupPlugin.findTopmostGroup === "function") {
            groupId = groupPlugin.findTopmostGroup(hit.id);
          }
          if (groupId) {
            const members = this.getGroupMembers(groupId);
            for (const n of nodes) n.selected = members.includes(n.id);
          } else {
            for (const n of nodes) n.selected = n.id === hit.id;
          }
          this.engine.events.emit("graph:change", { reason: "selection" });
        }

        // 触发 selectionChanged 事件，确保 UI 同步
        const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
        const selectedEdgeIds = this.engine.graph
          .getEdges()
          .filter((e) => e.selected)
          .map((e) => e.id);
        this.engine.events.emit("graph:selection-change", {
          nodes: selectedNodeIds,
          edges: selectedEdgeIds,
          reason: "node-touch",
        });
      }

      this.startPositions.clear();
      this.edgePointsStart.clear();

      // 递归查找所有需要移动的节点（包括容器内的子节点）
      const nodesToMove = new Set<string>();
      const addWithDescendants = (n: any) => {
        if (nodesToMove.has(n.id)) return;
        nodesToMove.add(n.id);
        // 如果是容器，递归添加所有子节点
        if (n.isContainer) {
          const children = nodes.filter((child) => child.parentId === n.id);
          children.forEach(addWithDescendants);
        }
      };
      nodes.filter((n) => n.selected && (n as any).draggable !== false).forEach(addWithDescendants);

      for (const id of nodesToMove) {
        const n = this.engine.graph.getNode(id);
        if (n) this.startPositions.set(n.id, { x: n.position.x, y: n.position.y });
      }

      // 对于 polyline 类型的边，在拖拽开始时记录 points
      const selectedIds = nodesToMove;
      const edges = this.engine.graph.getEdges();
      for (const e of edges) {
        if (e.shape === "edge-polyline" && e.points && e.points.length > 0) {
          const sourceSelected = selectedIds.has(e.source);
          const targetSelected = selectedIds.has(e.target);
          if (sourceSelected && targetSelected) {
            this.edgePointsStart.set(e.id, { points: e.points.map((p) => ({ x: p.x, y: p.y })) });
          }
        }
      }
      // 拖拽降质模式：延迟到首次实际移动再启用
      this._pendingDragNodeCount = nodesToMove.size;

      this.engine.events.emit("node:drag-start" as any, {
        nodeId: hit.id,
        position: { x: hit.position.x, y: hit.position.y },
      });

      e.preventDefault();
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (!this.draggingNodeId || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    const world = this.engine.toWorld(screen);

    // 检查是否有正在拖拽的节点
    if (this.startPositions.size === 0) return;

    this.isDragging = true;
    // 触摸场景：首次实际位移时启动引擎降质模式
    if (this._pendingDragNodeCount > 0) {
      this.engine.setDraggingNodes(true, this._pendingDragNodeCount);
    }
    const refNode = this.engine.graph.getNode(this.draggingNodeId);
    if (!refNode) return;

    const newX = world.x - this.offsetX;
    const newY = world.y - this.offsetY;
    const start = this.startPositions.get(this.draggingNodeId);
    if (!start) return;

    let dx = newX - start.x;
    let dy = newY - start.y;

    // 移动端拖动时不做吸附，直接跟随手指

    // 更新所有正在拖拽的节点位置
    this._updateBatch.length = 0;
    for (const [id, s] of this.startPositions.entries()) {
      const n = this.engine.graph.getNode(id);
      if (!n) continue;
      const nx = s.x + dx;
      const ny = s.y + dy;
      n.position.x = nx;
      n.position.y = ny;
      this._updateBatch.push({ node: n, x: nx, y: ny });
    }

    // 同步更新折线边的点位
    for (const [eid, snap] of this.edgePointsStart.entries()) {
      const e = this.engine.graph.getEdge(eid);
      if (e && snap.points) {
        e.points = snap.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      }
    }
    // 移动端：拖动节点时，连接的正交边回到自动路由（清除手动点与标记）
    for (const id of Array.from(this.startPositions.keys())) {
      const n = this.engine.graph.getNode(id);
      if (!n) continue;
      const edges = this.engine.graph.getEdges().filter((ed) => ed.source === id || ed.target === id);
      for (const edge of edges) {
        if (edge.shape === "edge-orthogonal") {
          if (edge.points && edge.points.length > 0) {
            edge.points = [];
            if ((edge.data as any)._orthogonalManual) delete (edge.data as any)._orthogonalManual;
          }
        }
      }
    }
    if (this._throttleMarkDirty) this._throttleMarkDirty();

    this.engine.events.emit("node:drag-move" as any, {
      nodeId: this.draggingNodeId,
      position: { x: refNode.position.x, y: refNode.position.y },
      delta: { x: dx, y: dy },
    });

    e.preventDefault();
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (!this.draggingNodeId) return;

    const nodes = this.engine.graph.getNodes();
    const refNode = this.engine.graph.getNode(this.draggingNodeId);

    // 提交历史命令（与鼠标事件相同的逻辑），并在提交前（如需要）应用网格吸附到目标位移
    if (this.isDragging) {
      const EPS = 1e-6;
      const ids = Array.from(this.startPositions.keys());

      if (ids.length === 1) {
        const id = ids[0];
        const start = this.startPositions.get(id)!;
        const cur = this.engine.graph.getNode(id);
        if (cur) {
          const isLineNode = cur.shape === "line";
          // 触摸端的网格吸附策略：仅当 snap-to-grid.require === 'none' 时生效
          const snap = this.engine.plugins.get("snap-to-grid") as any;
          const shouldSnap = !!snap && typeof snap.require === "string" && snap.require === "none";
          const gridSize = shouldSnap ? snap.size || 20 : undefined;

          // 计算目标位置（可能包含吸附）
          const targetX = shouldSnap && gridSize ? Math.round(cur.position.x / gridSize) * gridSize : cur.position.x;
          const targetY = shouldSnap && gridSize ? Math.round(cur.position.y / gridSize) * gridSize : cur.position.y;

          // 计算最终位移（line 节点不取整，其他节点按照像素步长取整，除非已吸附）
          let dx: number, dy: number;
          if (isLineNode) {
            dx = targetX - start.x;
            dy = targetY - start.y;
          } else {
            const rawDx = targetX - start.x;
            const rawDy = targetY - start.y;
            dx = shouldSnap ? rawDx : Math.round(rawDx);
            dy = shouldSnap ? rawDy : Math.round(rawDy);
          }
          cur.position.x = start.x;
          cur.position.y = start.y;

          for (const [eid, snap] of this.edgePointsStart.entries()) {
            const e = this.engine.graph.getEdge(eid);
            if (e) e.points = snap.points ? snap.points.map((p) => ({ x: p.x, y: p.y })) : undefined;
          }

          if (Math.abs(dx) >= EPS || Math.abs(dy) >= EPS) {
            this.engine.history.beginTransaction("Drag Move");
            const finalAbsX = start.x + dx;
            const finalAbsY = start.y + dy;
            this.engine.history.execute(new MoveNodeCommand(this.engine.graph, id, finalAbsX, finalAbsY));

            for (const [eid, snap] of this.edgePointsStart.entries()) {
              const prev = snap.points ? snap.points.map((p) => ({ x: p.x, y: p.y })) : undefined;
              if (!prev) continue;
              const next = prev.map((p) => ({ x: p.x + dx, y: p.y + dy }));
              this.engine.history.execute(new SetEdgePointsCommand(this.engine.graph, eid, prev, next));
            }

            this.engine.history.commitTransaction();
          }
          this.handleContainerDrop([id]);
          this.engine.graph.markDirty();
        }
      } else if (ids.length > 1) {
        const draggableIds = ids.filter((id) => (this.engine.graph.getNode(id) as any)?.draggable !== false);
        let dx = 0,
          dy = 0;

        if (draggableIds.length > 0) {
          const refId = draggableIds[0]!;
          const start = this.startPositions.get(refId)!;
          const cur = this.engine.graph.getNode(refId)!;
          const allLineNodes = draggableIds.every((id) => this.engine.graph.getNode(id)?.shape === "line");

          // 触摸端网格吸附（参考节点位置）
          const snap = this.engine.plugins.get("snap-to-grid") as any;
          const shouldSnap = !!snap && typeof snap.require === "string" && snap.require === "none";
          const gridSize = shouldSnap ? snap.size || 20 : undefined;
          const curX = cur.position.x;
          const curY = cur.position.y;
          const targetX = shouldSnap && gridSize ? Math.round(curX / gridSize) * gridSize : curX;
          const targetY = shouldSnap && gridSize ? Math.round(curY / gridSize) * gridSize : curY;

          if (allLineNodes) {
            dx = targetX - start.x;
            dy = targetY - start.y;
          } else {
            const rawDx = targetX - start.x;
            const rawDy = targetY - start.y;
            dx = shouldSnap ? rawDx : Math.round(rawDx);
            dy = shouldSnap ? rawDy : Math.round(rawDy);
          }
        }

        for (const id of draggableIds) {
          const n = this.engine.graph.getNode(id);
          const s = this.startPositions.get(id);
          if (n && s) {
            n.position.x = s.x;
            n.position.y = s.y;
          }
        }

        for (const [eid, snap] of this.edgePointsStart.entries()) {
          const e = this.engine.graph.getEdge(eid);
          if (e) e.points = snap.points ? snap.points.map((p) => ({ x: p.x, y: p.y })) : undefined;
        }

        if (draggableIds.length > 0 && (Math.abs(dx) >= EPS || Math.abs(dy) >= EPS)) {
          this.engine.history.beginTransaction("Drag Move");
          this.engine.history.execute(new MoveNodesCommand(this.engine.graph, draggableIds, dx, dy));

          for (const [eid, snap] of this.edgePointsStart.entries()) {
            const prev = snap.points ? snap.points.map((p) => ({ x: p.x, y: p.y })) : undefined;
            if (!prev) continue;
            const next = prev.map((p) => ({ x: p.x + dx, y: p.y + dy }));
            this.engine.history.execute(new SetEdgePointsCommand(this.engine.graph, eid, prev, next));
          }

          this.engine.history.commitTransaction();
        }
        if (draggableIds.length > 0) this.handleContainerDrop(draggableIds);
        this.engine.graph.markDirty();
      }
    }
    // 事件：仅在实际发生拖拽时才触发 dragEnd
    if (this.draggingNodeId && this.isDragging) {
      this.engine.events.emit("node:drag-end" as any, {
        nodeId: this.draggingNodeId,
        selectedNodeIds: Array.from(this.startPositions.keys()),
      });
    } else if (this.draggingNodeId && !this.isDragging) {
      // 触摸点击（无拖拽）
      this.engine.events.emit("node:click", { nodeId: this.draggingNodeId, event: e });
    }

    // 触摸端：不在提交后再做二次吸附，避免重复位移与跳变

    this.draggingNodeId = null;
    this.isDragging = false;
    this.startPositions.clear();
    this.edgePointsStart.clear();
    // 批量拖动降质渲染：结束
    this.engine.setDraggingNodes(false, 0);
  };

  private isInside(inner: any, outer: any): boolean {
    return (
      inner.position.x >= outer.position.x &&
      inner.position.y >= outer.position.y &&
      inner.position.x + inner.size.width <= outer.position.x + outer.size.width &&
      inner.position.y + inner.size.height <= outer.position.y + outer.size.height
    );
  }

  private handleContainerDrop(movedNodeIds: string[]) {
    const containers = this.engine.graph.getNodes().filter((n) => n.isContainer);
    if (containers.length === 0) return;

    const reparentUpdates: Array<{ nodeId: string; parentId: string | undefined }> = [];

    for (const id of movedNodeIds) {
      const n = this.engine.graph.getNode(id);
      if (!n) continue;

      let newParentId: string | undefined = undefined;
      const candidates = containers.filter((c) => c.id !== n.id && this.isInside(n, c));
      candidates.sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));

      if (candidates.length > 0) {
        newParentId = candidates[0].id;
      }

      if (n.parentId !== newParentId) {
        reparentUpdates.push({ nodeId: n.id, parentId: newParentId });
      }
    }

    if (reparentUpdates.length > 0) {
      this.engine.history.beginTransaction("Reparent Nodes");
      for (const update of reparentUpdates) {
        this.engine.history.execute(
          new UpdateNodePropsCommand(this.engine.graph, update.nodeId, { parentId: update.parentId }),
        );

        if (update.parentId) {
          const parent = this.engine.graph.getNode(update.parentId);
          const child = this.engine.graph.getNode(update.nodeId);
          if (parent && child && (child.zIndex ?? 0) <= (parent.zIndex ?? 0)) {
            this.engine.history.execute(
              new SetZIndexCommand(this.engine.graph, update.nodeId, (parent.zIndex ?? 0) + 1),
            );
          }
        }
      }
      this.engine.history.commitTransaction();
    }
  }
}
