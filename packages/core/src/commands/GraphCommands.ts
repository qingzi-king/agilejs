/*
 * @Description: 图形命令实现
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-10-17 09:52:13
 */
import { ICommand, type CommandDebugInfo, type ChangeItem } from "../core/CommandHistory";
import { EdgeData, Graph, NodeData, Point } from "../model/Graph";
import type { CanvasEngine } from "../core/CanvasEngine";

export class AddNodeCommand implements ICommand {
  constructor(
    private graph: Graph,
    private node: NodeData,
  ) {}
  label = "Add Node";
  do(): void {
    this.graph.addNode(this.node);
  }
  undo(): void {
    this.graph.removeNode(this.node.id);
  }
  debugInfo(): CommandDebugInfo {
    return {
      nodes: [this.node.id],
      changes: [
        {
          entity: "node" as const,
          id: this.node.id,
          path: "create",
          prev: undefined,
          next: { id: this.node.id, shape: this.node.shape },
        },
      ],
    };
  }
}

export class RemoveNodeCommand implements ICommand {
  private backupNode?: NodeData;
  private backupEdges?: EdgeData[];
  constructor(
    private graph: Graph,
    private nodeId: string,
  ) {}
  label = "Remove Node";
  do(): void {
    this.backupNode = this.graph.getNode(this.nodeId);
    this.backupEdges = this.graph.connectedEdges(this.nodeId).map((e) => ({ ...e }));
    this.graph.removeNode(this.nodeId);
  }
  undo(): void {
    if (!this.backupNode) return;
    this.graph.addNode(this.backupNode);
    for (const e of this.backupEdges ?? []) this.graph.addEdge(e);
  }
  debugInfo(): CommandDebugInfo {
    return {
      nodes: [this.nodeId],
      edges: this.backupEdges?.map((e) => e.id),
      changes: [
        { entity: "node" as const, id: this.nodeId, path: "delete", prev: { id: this.nodeId }, next: undefined },
      ],
    };
  }
}

export class AddEdgeCommand implements ICommand {
  constructor(
    private graph: Graph,
    private edge: EdgeData,
  ) {}
  label = "Add Edge";
  do(): void {
    this.graph.addEdge(this.edge);
  }
  undo(): void {
    this.graph.removeEdge(this.edge.id);
  }
  debugInfo(): CommandDebugInfo {
    return {
      edges: [this.edge.id],
      changes: [
        {
          entity: "edge" as const,
          id: this.edge.id,
          path: "create",
          prev: undefined,
          next: { id: this.edge.id, shape: this.edge.shape },
        },
      ],
    };
  }
}

export class RemoveEdgeCommand implements ICommand {
  private backup?: EdgeData;
  constructor(
    private graph: Graph,
    private edgeId: string,
  ) {}
  label = "Remove Edge";
  do(): void {
    this.backup = this.graph.getEdge(this.edgeId);
    this.graph.removeEdge(this.edgeId);
  }
  undo(): void {
    if (this.backup) this.graph.addEdge(this.backup);
  }
  debugInfo(): CommandDebugInfo {
    return {
      edges: [this.edgeId],
      changes: [
        { entity: "edge" as const, id: this.edgeId, path: "delete", prev: { id: this.edgeId }, next: undefined },
      ],
    };
  }
}

export class MoveNodeCommand implements ICommand {
  private from: { x: number; y: number } | null = null;
  private to: { x: number; y: number } | null = null;
  constructor(
    private graph: Graph,
    private nodeId: string,
    private nextX: number,
    private nextY: number,
  ) {}
  label = "Move Node";
  do(): void {
    const n = this.graph.getNode(this.nodeId);
    if (!n) return;
    this.from = { x: n.position.x, y: n.position.y };
    this.to = { x: this.nextX, y: this.nextY };
    this.graph.setNodePosition(this.nodeId, this.nextX, this.nextY);
  }
  undo(): void {
    if (!this.from) return;
    this.graph.setNodePosition(this.nodeId, this.from.x, this.from.y);
  }
  debugInfo(): CommandDebugInfo {
    const to = this.to ?? { x: this.nextX, y: this.nextY };
    const from = this.from ?? undefined;
    const ch = [] as NonNullable<CommandDebugInfo["changes"]>;
    if (from?.x !== undefined)
      ch.push({ entity: "node" as const, id: this.nodeId, path: "position.x", prev: from.x, next: to.x });
    if (from?.y !== undefined)
      ch.push({ entity: "node" as const, id: this.nodeId, path: "position.y", prev: from.y, next: to.y });
    return { nodes: [this.nodeId], changes: ch.length ? ch : undefined };
  }
}

export class MoveNodesCommand implements ICommand {
  private from: Record<string, { x: number; y: number }> = {};
  private to: Record<string, { x: number; y: number }> = {};
  constructor(
    private graph: Graph,
    private nodeIds: string[],
    private dx: number,
    private dy: number,
  ) {}
  label = "Move Nodes";
  do(): void {
    for (const id of this.nodeIds) {
      const n = this.graph.getNode(id);
      if (!n) continue;
      this.from[id] = { x: n.position.x, y: n.position.y };
      const nx = n.position.x + this.dx;
      const ny = n.position.y + this.dy;
      this.to[id] = { x: nx, y: ny };
      this.graph.setNodePosition(id, nx, ny);
    }
  }
  undo(): void {
    for (const id of Object.keys(this.from)) {
      const p = this.from[id];
      this.graph.setNodePosition(id, p.x, p.y);
    }
  }
  debugInfo(): CommandDebugInfo {
    return {
      nodes: this.nodeIds.slice(),
      changes: this.nodeIds.map((id) => ({
        entity: "node" as const,
        id,
        path: "position.(x,y)",
        prev: "delta-applied",
        next: { dx: this.dx, dy: this.dy },
      })) as ChangeItem[],
    };
  }
}

export class ResizeNodeCommand implements ICommand {
  private prev?: { w: number; h: number };
  constructor(
    private graph: Graph,
    private nodeId: string,
    private width: number,
    private height: number,
  ) {}
  label = "Resize Node";
  do(): void {
    const n = this.graph.getNode(this.nodeId);
    if (!n) return;
    this.prev = { w: n.size.width, h: n.size.height };
    this.graph.setNodeSize(this.nodeId, this.width, this.height);
  }
  undo(): void {
    if (this.prev) this.graph.setNodeSize(this.nodeId, this.prev.w, this.prev.h);
  }
  debugInfo(): CommandDebugInfo {
    return {
      nodes: [this.nodeId],
      changes: [
        { entity: "node" as const, id: this.nodeId, path: "size.width", prev: this.prev?.w, next: this.width },
        { entity: "node" as const, id: this.nodeId, path: "size.height", prev: this.prev?.h, next: this.height },
      ],
    };
  }
}

// 面板尺寸调整：带端口等比缩放，且可撤销端口偏移
export class ResizeNodeWithPortsCommand implements ICommand {
  label = "Resize Node (with ports)";
  private prev?: { w: number; h: number; ports?: Record<string, { x: number; y: number }> };
  constructor(
    private graph: Graph,
    private nodeId: string,
    private width: number,
    private height: number,
  ) {}
  do(): void {
    const n = this.graph.getNode(this.nodeId);
    if (!n) return;
    const prevPorts: Record<string, { x: number; y: number }> = {};
    if (n.ports && n.ports.length > 0) {
      for (const p of n.ports) prevPorts[p.id] = { x: p.offset.x, y: p.offset.y };
    }
    this.prev = { w: n.size.width, h: n.size.height, ports: Object.keys(prevPorts).length ? prevPorts : undefined };
    const prevW = n.size.width || 1;
    const prevH = n.size.height || 1;
    const wRatio = this.width / prevW;
    const hRatio = this.height / prevH;
    n.size.width = this.width;
    n.size.height = this.height;
    if (n.ports && n.ports.length > 0) {
      for (const p of n.ports) {
        p.offset = { x: p.offset.x * wRatio, y: p.offset.y * hRatio };
      }
    }
    this.graph.markDirty();
  }
  undo(): void {
    const n = this.graph.getNode(this.nodeId);
    if (!n || !this.prev) return;
    n.size.width = this.prev.w;
    n.size.height = this.prev.h;
    if (n.ports && this.prev.ports) {
      for (const p of n.ports) {
        const bk = this.prev.ports[p.id];
        if (bk) p.offset = { x: bk.x, y: bk.y };
      }
    }
    this.graph.markDirty();
  }
  debugInfo(): CommandDebugInfo {
    const ch: NonNullable<CommandDebugInfo["changes"]> = [
      { entity: "node" as const, id: this.nodeId, path: "size.width", prev: this.prev?.w, next: this.width },
      { entity: "node" as const, id: this.nodeId, path: "size.height", prev: this.prev?.h, next: this.height },
    ];
    if (this.prev?.ports)
      ch.push({ entity: "node" as const, id: this.nodeId, path: "ports.*.offset", prev: "various", next: "scaled" });
    return { nodes: [this.nodeId], changes: ch };
  }
}

export class SetZIndexCommand implements ICommand {
  private prev?: number;
  constructor(
    private graph: Graph,
    private nodeId: string,
    private z: number,
  ) {}
  label = "Set Node ZIndex";
  do(): void {
    const n = this.graph.getNode(this.nodeId);
    if (n) {
      this.prev = n.zIndex ?? 0;
      this.graph.setNodeZIndex(this.nodeId, this.z);
    }
  }
  undo(): void {
    if (this.prev !== undefined) this.graph.setNodeZIndex(this.nodeId, this.prev);
  }
  debugInfo(): CommandDebugInfo {
    return {
      nodes: [this.nodeId],
      changes: [{ entity: "node" as const, id: this.nodeId, path: "zIndex", prev: this.prev, next: this.z }],
    };
  }
}

export class SetNodeRotationCommand implements ICommand {
  label = "Set Node Rotation";
  private prev?: number;
  constructor(
    private graph: Graph,
    private nodeId: string,
    private rotation: number,
  ) {}
  do(): void {
    const n = this.graph.getNode(this.nodeId);
    if (!n) return;
    this.prev = n.rotation ?? 0;
    n.rotation = this.rotation;
    this.graph.markDirty();
  }
  undo(): void {
    const n = this.graph.getNode(this.nodeId);
    if (!n || this.prev === undefined) return;
    n.rotation = this.prev;
    this.graph.markDirty();
  }
  debugInfo(): CommandDebugInfo {
    return {
      nodes: [this.nodeId],
      changes: [{ entity: "node" as const, id: this.nodeId, path: "rotation", prev: this.prev, next: this.rotation }],
    };
  }
}

// 批量重排所有节点的 zIndex（根据提供的 nextOrder，按序从 0 递增设置）
export class ReorderZIndexCommand implements ICommand {
  label = "Reorder ZIndex";
  private prev: Record<string, number> = {};
  private next: Record<string, number> = {};
  /**
   * @param graph 图
   * @param nextOrder 节点 id 的最终顺序（长度应包含所有节点，以保证顺序唯一）
   */
  constructor(
    private graph: Graph,
    nextOrder: string[],
  ) {
    // 记录当前所有节点的 zIndex，构建目标 zIndex 映射
    const all = this.graph.getNodes();
    for (const n of all) this.prev[n.id] = n.zIndex ?? 0;
    // 目标顺序：按 nextOrder 从 0 开始递增，保证无重复、无跳号
    nextOrder.forEach((id, i) => {
      this.next[id] = i;
    });
    // 若存在遗漏的节点（未在 nextOrder 中），按当前顺序追加到末尾
    const missed = all.map((n) => n.id).filter((id) => !(id in this.next));
    const base = nextOrder.length;
    missed.forEach((id, k) => {
      this.next[id] = base + k;
    });
  }
  do(): void {
    // 应用目标 zIndex
    for (const id in this.next) this.graph.setNodeZIndex(id, this.next[id]);
  }
  undo(): void {
    // 恢复之前的 zIndex
    for (const id in this.prev) this.graph.setNodeZIndex(id, this.prev[id]);
  }
  debugInfo(): CommandDebugInfo {
    return {
      nodes: Object.keys(this.next),
      changes: Object.keys(this.next).map((id) => ({
        entity: "node" as const,
        id,
        path: "zIndex",
        prev: this.prev[id],
        next: this.next[id],
      })) as ChangeItem[],
    };
  }
}

// ---- Z-Index 便捷操作 (不可撤销的辅助函数 ReorderZIndexCommand) ----
// 注意：我们使用一种稳定的重新分配方法：重建严格的0..N-1顺序，然后执行一个ReordZIndex命令以获得撤消支持。

function buildCurrentOrder(graph: Graph): string[] {
  return [...graph.getNodes()]
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0) || a.id.localeCompare(b.id))
    .map((n) => n.id);
}

export function bringNodesToFront(
  graph: Graph,
  ids: string[],
  history?: { execute: (cmd: ICommand, opts?: any) => void },
): void {
  if (!ids.length) return;
  const order = buildCurrentOrder(graph);
  // remove selected ids from order
  const set = new Set(ids);
  const remaining = order.filter((id) => !set.has(id));
  // append selected at end (preserve relative order they had among themselves in original order)
  const selectedOrdered = order.filter((id) => set.has(id));
  const next = [...remaining, ...selectedOrdered];
  const cmd = new ReorderZIndexCommand(graph, next);
  (history as any)?.execute ? (history as any).execute(cmd) : cmd.do();
  graph.markDirty();
}

export function sendNodesToBack(
  graph: Graph,
  ids: string[],
  history?: { execute: (cmd: ICommand, opts?: any) => void },
): void {
  if (!ids.length) return;
  const order = buildCurrentOrder(graph);
  const set = new Set(ids);
  const remaining = order.filter((id) => !set.has(id));
  const selectedOrdered = order.filter((id) => set.has(id));
  const next = [...selectedOrdered, ...remaining];
  const cmd = new ReorderZIndexCommand(graph, next);
  (history as any)?.execute ? (history as any).execute(cmd) : cmd.do();
  graph.markDirty();
}

export function moveNodesUp(
  graph: Graph,
  ids: string[],
  history?: { execute: (cmd: ICommand, opts?: any) => void },
): void {
  if (!ids.length) return;
  const order = buildCurrentOrder(graph);
  const set = new Set(ids);
  // Iterate from end (top) downward so swaps don't affect upcoming indices
  for (let i = order.length - 2; i >= 0; i--) {
    const a = order[i];
    const b = order[i + 1];
    if (set.has(a) && !set.has(b)) {
      // swap upward
      order[i] = b;
      order[i + 1] = a;
      i--; // skip one further to avoid double-processing swap partner
    }
  }
  const cmd = new ReorderZIndexCommand(graph, order);
  (history as any)?.execute ? (history as any).execute(cmd, { label: "Move Up" }) : cmd.do();
  graph.markDirty();
}

export function moveNodesDown(
  graph: Graph,
  ids: string[],
  history?: { execute: (cmd: ICommand, opts?: any) => void },
): void {
  if (!ids.length) return;
  const order = buildCurrentOrder(graph);
  const set = new Set(ids);
  // Iterate from start upward so swaps are consistent
  for (let i = 1; i < order.length; i++) {
    const a = order[i - 1];
    const b = order[i];
    if (!set.has(a) && set.has(b)) {
      // move b downward (swap with a)
      order[i - 1] = b;
      order[i] = a;
      i++; // skip next
    }
  }
  const cmd = new ReorderZIndexCommand(graph, order);
  (history as any)?.execute ? (history as any).execute(cmd, { label: "Move Down" }) : cmd.do();
  graph.markDirty();
}
export class UpdateNodeDataCommand implements ICommand {
  private prev: Record<string, unknown> | undefined;
  constructor(
    private graph: Graph,
    private nodeId: string,
    private next: Record<string, unknown>,
  ) {}
  label = "Update Node Data";
  do(): void {
    const n = this.graph.getNode(this.nodeId);
    if (!n) return;
    this.prev = { ...(n.data ?? {}) };
    n.data = { ...(n.data ?? {}), ...this.next };
    this.graph.markDirty();
  }
  undo(): void {
    const n = this.graph.getNode(this.nodeId);
    if (!n) return;
    n.data = this.prev ? { ...this.prev } : undefined;
    this.graph.markDirty();
  }
  debugInfo(): CommandDebugInfo {
    return {
      nodes: [this.nodeId],
      changes: Object.keys(this.next ?? {}).map((k) => ({
        entity: "node" as const,
        id: this.nodeId,
        path: `data.${k}`,
        prev: this.prev?.[k],
        next: this.next?.[k],
      })) as ChangeItem[],
    };
  }
}

export class UpdateEdgeDataCommand implements ICommand {
  private prev: Record<string, unknown> | undefined;
  constructor(
    private graph: Graph,
    private edgeId: string,
    private next: Record<string, unknown>,
  ) {}
  label = "Update Edge Data";
  do(): void {
    const e = this.graph.getEdge(this.edgeId);
    if (!e) return;
    this.prev = { ...(e.data ?? {}) };
    e.data = { ...(e.data ?? {}), ...this.next };
    this.graph.markDirty();
  }
  undo(): void {
    const e = this.graph.getEdge(this.edgeId);
    if (!e) return;
    e.data = this.prev ? { ...this.prev } : undefined;
    this.graph.markDirty();
  }
  debugInfo(): CommandDebugInfo {
    return {
      edges: [this.edgeId],
      changes: Object.keys(this.next ?? {}).map((k) => ({
        entity: "edge" as const,
        id: this.edgeId,
        path: `data.${k}`,
        prev: this.prev?.[k],
        next: this.next?.[k],
      })) as ChangeItem[],
    };
  }
}

// 更新节点的基础属性（非 data）：如 selectable/draggable/groupId/parentId/resizable/rotatable
export class UpdateNodePropsCommand implements ICommand {
  label = "Update Node Props";
  private prev: {
    selectable?: boolean;
    draggable?: boolean;
    resizable?: boolean;
    rotatable?: boolean;
    groupId?: string | undefined;
    parentId?: string | undefined;
    isContainer?: boolean;
  } | null = null;
  private next: {
    selectable?: boolean;
    draggable?: boolean;
    resizable?: boolean;
    rotatable?: boolean;
    groupId?: string | undefined;
    parentId?: string | undefined;
    isContainer?: boolean;
  };
  constructor(
    private graph: Graph,
    private nodeId: string,
    patch: {
      selectable?: boolean;
      draggable?: boolean;
      resizable?: boolean;
      rotatable?: boolean;
      groupId?: string | undefined;
      parentId?: string | undefined;
      isContainer?: boolean;
    },
  ) {
    this.next = { ...patch };
  }
  do(): void {
    const n = this.graph.getNode(this.nodeId);
    if (!n) return;
    this.prev = {
      selectable: (n as any).selectable,
      draggable: (n as any).draggable,
      resizable: (n as any).resizable,
      rotatable: (n as any).rotatable,
      groupId: (n as any).groupId,
      parentId: (n as any).parentId,
      isContainer: (n as any).isContainer,
    };
    if ("selectable" in this.next) (n as any).selectable = !!this.next.selectable;
    if ("draggable" in this.next) (n as any).draggable = !!this.next.draggable;
    if ("resizable" in this.next) (n as any).resizable = !!this.next.resizable;
    if ("rotatable" in this.next) (n as any).rotatable = !!this.next.rotatable;
    if ("isContainer" in this.next) (n as any).isContainer = !!this.next.isContainer;
    if ("groupId" in this.next) {
      if (this.next.groupId) (n as any).groupId = this.next.groupId;
      else delete (n as any).groupId;
    }
    if ("parentId" in this.next) {
      if (this.next.parentId) (n as any).parentId = this.next.parentId;
      else delete (n as any).parentId;
    }
    this.graph.markDirty();
  }
  undo(): void {
    const n = this.graph.getNode(this.nodeId);
    if (!n || !this.prev) return;
    if ("selectable" in this.prev) (n as any).selectable = !!this.prev.selectable;
    if ("draggable" in this.prev) (n as any).draggable = !!this.prev.draggable;
    if ("resizable" in this.prev) (n as any).resizable = !!this.prev.resizable;
    if ("rotatable" in this.prev) (n as any).rotatable = !!this.prev.rotatable;
    if ("isContainer" in this.prev) (n as any).isContainer = !!this.prev.isContainer;
    if ("groupId" in this.prev) {
      const gid = this.prev.groupId;
      if (gid) (n as any).groupId = gid;
      else delete (n as any).groupId;
    }
    if ("parentId" in this.prev) {
      const pid = this.prev.parentId;
      if (pid) (n as any).parentId = pid;
      else delete (n as any).parentId;
    }
    this.graph.markDirty();
  }
  debugInfo(): CommandDebugInfo {
    const ch: NonNullable<CommandDebugInfo["changes"]> = [];
    if ("selectable" in (this as any).next)
      ch.push({
        entity: "node" as const,
        id: this.nodeId,
        path: "props.selectable",
        prev: this.prev?.selectable,
        next: (this as any).next?.selectable,
      });
    if ("draggable" in (this as any).next)
      ch.push({
        entity: "node" as const,
        id: this.nodeId,
        path: "props.draggable",
        prev: this.prev?.draggable,
        next: (this as any).next?.draggable,
      });
    if ("isContainer" in (this as any).next)
      ch.push({
        entity: "node" as const,
        id: this.nodeId,
        path: "props.isContainer",
        prev: this.prev?.isContainer,
        next: (this as any).next?.isContainer,
      });
    if ("groupId" in (this as any).next)
      ch.push({
        entity: "node" as const,
        id: this.nodeId,
        path: "props.groupId",
        prev: this.prev?.groupId,
        next: (this as any).next?.groupId,
      });
    if ("parentId" in (this as any).next)
      ch.push({
        entity: "node" as const,
        id: this.nodeId,
        path: "props.parentId",
        prev: this.prev?.parentId,
        next: (this as any).next?.parentId,
      });
    return { nodes: [this.nodeId], changes: ch };
  }
}

// 切换边的形状（并在需要时清理/保留 points）
export class SetEdgeShapeCommand implements ICommand {
  label = "Set Edge Shape";
  private prev?: { shape: string; points?: Point[] };
  constructor(
    private graph: Graph,
    private edgeId: string,
    private shape: string,
  ) {}
  do(): void {
    const e = this.graph.getEdge(this.edgeId);
    if (!e) return;
    this.prev = { shape: e.shape, points: e.points ? e.points.map((p) => ({ x: p.x, y: p.y })) : undefined };
    e.shape = this.shape;
    // 当 polyline 与其它类型切换时，清理 points；交互或渲染器会重建
    if (this.prev.shape !== this.shape) {
      if (this.prev.shape === "edge-polyline" || this.shape === "edge-polyline") {
        e.points = undefined;
      }
    }
    this.graph.markDirty();
  }
  undo(): void {
    const e = this.graph.getEdge(this.edgeId);
    if (!e || !this.prev) return;
    e.shape = this.prev.shape;
    e.points = this.prev.points ? this.prev.points.map((p) => ({ x: p.x, y: p.y })) : undefined;
    this.graph.markDirty();
  }
  debugInfo(): CommandDebugInfo {
    return {
      edges: [this.edgeId],
      changes: [{ entity: "edge" as const, id: this.edgeId, path: "shape", prev: this.prev?.shape, next: this.shape }],
    };
  }
}

export class GroupTransformCommand implements ICommand {
  label = "Group Transform";
  private backup: Array<{ id: string; prev: any; next: any }>;
  constructor(
    private graph: Graph,
    updates: Array<{ id: string; prev: any; next: any }>,
  ) {
    // 深拷贝存储，避免后续被引用修改
    this.backup = updates.map((u) => ({
      id: u.id,
      prev: JSON.parse(JSON.stringify(u.prev)),
      next: JSON.parse(JSON.stringify(u.next)),
    }));
  }
  do(): void {
    for (const u of this.backup) {
      const n = this.graph.getNode(u.id);
      if (!n) continue;
      n.position.x = u.next.position.x;
      n.position.y = u.next.position.y;
      n.size.width = u.next.size.width;
      n.size.height = u.next.size.height;
      n.rotation = u.next.rotation;
      if (n.ports && u.next.ports) {
        n.ports.forEach((p) => {
          const np = u.next.ports[p.id];
          if (np) p.offset = { x: np.x, y: np.y };
        });
      }
    }
  }
  undo(): void {
    for (const u of this.backup) {
      const n = this.graph.getNode(u.id);
      if (!n) continue;
      n.position.x = u.prev.position.x;
      n.position.y = u.prev.position.y;
      n.size.width = u.prev.size.width;
      n.size.height = u.prev.size.height;
      n.rotation = u.prev.rotation;
      if (n.ports && u.prev.ports) {
        n.ports.forEach((p) => {
          const pp = u.prev.ports[p.id];
          if (pp) p.offset = { x: pp.x, y: pp.y };
        });
      }
    }
  }
  debugInfo(): CommandDebugInfo {
    const changes: ChangeItem[] = this.backup.map((u) => ({
      entity: "node" as const,
      id: u.id,
      path: "transform",
      prev: { position: u.prev.position, size: u.prev.size, rotation: u.prev.rotation },
      next: { position: u.next.position, size: u.next.size, rotation: u.next.rotation },
    }));
    return { nodes: this.backup.map((u) => u.id), changes };
  }
}

// 设置边折线点（或清空）的命令：显式持有 prev/next，避免在 do() 时读取被实时拖动修改后的状态
export class SetEdgePointsCommand implements ICommand {
  label = "Set Edge Points";
  constructor(
    private graph: Graph,
    private edgeId: string,
    private prevPoints: Point[] | undefined,
    private nextPoints: Point[] | undefined,
  ) {}
  do(): void {
    const e = this.graph.getEdge(this.edgeId);
    if (!e) return;
    e.points = this.nextPoints ? this.nextPoints.map((p) => ({ x: p.x, y: p.y })) : undefined;
    this.graph.markDirty();
  }
  undo(): void {
    const e = this.graph.getEdge(this.edgeId);
    if (!e) return;
    e.points = this.prevPoints ? this.prevPoints.map((p) => ({ x: p.x, y: p.y })) : undefined;
    this.graph.markDirty();
  }
  debugInfo(): CommandDebugInfo {
    const prevCount = this.prevPoints?.length ?? 0;
    const nextCount = this.nextPoints?.length ?? 0;
    return {
      edges: [this.edgeId],
      changes: [
        { entity: "edge" as const, id: this.edgeId, path: "points", prev: `(${prevCount})`, next: `(${nextCount})` },
      ],
      extra: { points: { prev: prevCount, next: nextCount } },
    };
  }
}

// 重连边的命令（变更 source/target 及其端口）
export class ReconnectEdgeCommand implements ICommand {
  label = "Reconnect Edge";
  private prev: { source: string; target: string; sourcePortId?: string; targetPortId?: string };
  private next: { source: string; target: string; sourcePortId?: string; targetPortId?: string };
  constructor(
    private graph: Graph,
    private edgeId: string,
    prev: { source: string; target: string; sourcePortId?: string; targetPortId?: string },
    next: { source: string; target: string; sourcePortId?: string; targetPortId?: string },
  ) {
    // 复制，避免外部引用修改
    this.prev = { ...prev };
    this.next = { ...next };
  }
  do(): void {
    const e = this.graph.getEdge(this.edgeId);
    if (!e) return;
    e.source = this.next.source;
    e.target = this.next.target;
    e.sourcePortId = this.next.sourcePortId;
    e.targetPortId = this.next.targetPortId;
    this.graph.markDirty();
  }
  undo(): void {
    const e = this.graph.getEdge(this.edgeId);
    if (!e) return;
    e.source = this.prev.source;
    e.target = this.prev.target;
    e.sourcePortId = this.prev.sourcePortId;
    e.targetPortId = this.prev.targetPortId;
    this.graph.markDirty();
  }
  debugInfo(): CommandDebugInfo {
    const nodes = new Set<string>();
    if (this.prev?.source) nodes.add(this.prev.source);
    if (this.prev?.target) nodes.add(this.prev.target);
    if (this.next?.source) nodes.add(this.next.source);
    if (this.next?.target) nodes.add(this.next.target);
    return { edges: [this.edgeId], nodes: Array.from(nodes) };
  }
}

// 分组/解组命令：将一批节点的 groupId 设置为指定值或移除（支持嵌套分组）
export class GroupNodesCommand implements ICommand {
  label = "Group Nodes";
  private ids: string[];
  private gid: string;
  // 保存每个节点的原始 groupId 和 groupPath
  private prevGroupInfo: Record<string, { groupId?: string; groupPath?: string[] }> = {};
  // 是否为嵌套分组（选中节点中存在已组合的节点）
  private isNesting = false;

  constructor(
    private graph: Graph,
    nodeIds: string[],
    groupId: string,
  ) {
    this.ids = [...nodeIds];
    this.gid = groupId;

    // 保存原始状态并检测是否为嵌套
    for (const id of this.ids) {
      const n = this.graph.getNode(id);
      if (n) {
        this.prevGroupInfo[id] = {
          groupId: n.groupId,
          groupPath: n.groupPath ? [...n.groupPath] : undefined,
        };
        // 如果任一节点已在组中，标记为嵌套
        if (n.groupId || (n.groupPath && n.groupPath.length > 0)) {
          this.isNesting = true;
        }
      }
    }
  }

  do(): void {
    for (const id of this.ids) {
      const n = this.graph.getNode(id);
      if (!n) continue;

      if (this.isNesting) {
        // 嵌套分组：将新 groupId 追加到现有 groupPath 末尾
        const currentPath = n.groupPath || (n.groupId ? [n.groupId] : []);
        n.groupPath = [...currentPath, this.gid];
        n.groupId = this.gid; // groupId 始终指向最内层组
      } else {
        // 首次分组：直接设置 groupId 和 groupPath
        n.groupId = this.gid;
        n.groupPath = [this.gid];
      }
    }
    this.graph.markDirty();
  }

  undo(): void {
    for (const id of this.ids) {
      const n = this.graph.getNode(id);
      if (!n) continue;

      const prev = this.prevGroupInfo[id];
      if (prev) {
        if (prev.groupId) {
          n.groupId = prev.groupId;
        } else {
          delete n.groupId;
        }
        if (prev.groupPath) {
          n.groupPath = [...prev.groupPath];
        } else {
          delete n.groupPath;
        }
      } else {
        delete n.groupId;
        delete n.groupPath;
      }
    }
    this.graph.markDirty();
  }

  debugInfo(): CommandDebugInfo {
    return {
      nodes: this.ids.slice(),
      groups: [this.gid],
      changes: this.ids.map((id) => ({
        entity: "node" as const,
        id,
        path: "props.groupId",
        prev: this.prevGroupInfo[id]?.groupId,
        next: this.gid,
      })) as ChangeItem[],
    };
  }
}

export class UngroupNodesCommand implements ICommand {
  label = "Ungroup Nodes";
  private ids: string[];
  private prev: Record<string, { groupId?: string; groupPath?: string[] }> = {};
  private prevSelected: Record<string, boolean> = {};

  constructor(
    private graph: Graph,
    nodeIds: string[],
  ) {
    this.ids = [...nodeIds];
    for (const id of this.ids) {
      const n = this.graph.getNode(id);
      if (n) {
        this.prev[id] = {
          groupId: n.groupId,
          groupPath: n.groupPath ? [...n.groupPath] : undefined,
        };
        this.prevSelected[id] = !!n.selected;
      }
    }
  }

  do(): void {
    for (const id of this.ids) {
      const n = this.graph.getNode(id);
      if (!n) continue;

      // 逐层解组：从 groupPath 移除最后一项
      if (n.groupPath && n.groupPath.length > 0) {
        const newPath = [...n.groupPath];
        newPath.pop(); // 移除最内层组ID

        if (newPath.length > 0) {
          // 仍在其他组中，更新 groupPath 和 groupId
          n.groupPath = newPath;
          n.groupId = newPath[newPath.length - 1]; // groupId 指向新的最内层组
        } else {
          // 已完全解组
          delete n.groupPath;
          delete n.groupId;
        }
      } else if (n.groupId) {
        // 兼容旧数据（只有 groupId 没有 groupPath）
        delete n.groupId;
        delete n.groupPath;
      }

      // 解组后显式选中这些节点，便于直观确认
      n.selected = true;
    }
    this.graph.markDirty();
  }

  undo(): void {
    for (const id of this.ids) {
      const n = this.graph.getNode(id);
      if (!n) continue;

      const prev = this.prev[id];
      if (prev) {
        if (prev.groupId) {
          n.groupId = prev.groupId;
        } else {
          delete n.groupId;
        }
        if (prev.groupPath) {
          n.groupPath = [...prev.groupPath];
        } else {
          delete n.groupPath;
        }
      } else {
        delete n.groupId;
        delete n.groupPath;
      }

      // 恢复原先的选中状态
      if (id in this.prevSelected) {
        n.selected = this.prevSelected[id];
      }
    }
    this.graph.markDirty();
  }

  debugInfo(): CommandDebugInfo {
    const groups = new Set<string>();
    Object.values(this.prev).forEach((info) => {
      if (info.groupId) groups.add(info.groupId);
      if (info.groupPath) info.groupPath.forEach((g) => groups.add(g));
    });
    return {
      nodes: this.ids.slice(),
      groups: Array.from(groups),
      changes: this.ids.map((id) => ({
        entity: "node" as const,
        id,
        path: "props.groupId",
        prev: this.prev[id]?.groupId,
        next: undefined,
      })) as ChangeItem[],
    };
  }
}

// ===== Canvas/Plugins setting commands =====

/**
 * 更新 line 节点的 pointsNormalized 数组（支持撤销/重做）
 * 同时记录 position/size 的变化（用于包围盒自适应）
 */
export class UpdateLineNodePointsCommand implements ICommand {
  private prevPoints: Array<{ u: number; v: number }> | undefined;
  private prevPosition: Point | undefined;
  private prevSize: { width: number; height: number } | undefined;
  constructor(
    private graph: Graph,
    private nodeId: string,
    private nextPoints: Array<{ u: number; v: number }>,
    private nextPosition?: Point,
    private nextSize?: { width: number; height: number },
  ) {}
  label = "Edit Line Node";
  do(): void {
    const n = this.graph.getNode(this.nodeId);
    if (!n || n.shape !== "line") return;
    const data: any = n.data || {};
    data.line = data.line || {};
    // 备份
    this.prevPoints = Array.isArray(data.line.pointsNormalized)
      ? (data.line.pointsNormalized as Array<{ u: number; v: number }>).map((p) => ({ u: p.u, v: p.v }))
      : undefined;
    this.prevPosition = { x: n.position.x, y: n.position.y };
    this.prevSize = { width: n.size.width, height: n.size.height };
    // 应用
    data.line.pointsNormalized = this.nextPoints.map((p) => ({ u: p.u, v: p.v }));
    n.data = data;
    if (this.nextPosition) {
      n.position.x = this.nextPosition.x;
      n.position.y = this.nextPosition.y;
    }
    if (this.nextSize) {
      n.size.width = this.nextSize.width;
      n.size.height = this.nextSize.height;
    }
    this.graph.markDirty();
  }
  undo(): void {
    const n = this.graph.getNode(this.nodeId);
    if (!n || !this.prevPoints) return;
    const data: any = n.data || {};
    data.line = data.line || {};
    data.line.pointsNormalized = this.prevPoints.map((p) => ({ u: p.u, v: p.v }));
    n.data = data;
    if (this.prevPosition) {
      n.position.x = this.prevPosition.x;
      n.position.y = this.prevPosition.y;
    }
    if (this.prevSize) {
      n.size.width = this.prevSize.width;
      n.size.height = this.prevSize.height;
    }
    this.graph.markDirty();
  }
  debugInfo(): CommandDebugInfo {
    return {
      nodes: [this.nodeId],
      changes: [
        {
          entity: "node" as const,
          id: this.nodeId,
          path: "data.line.pointsNormalized",
          prev: this.prevPoints,
          next: this.nextPoints,
        },
      ],
    };
  }
}

export class SetCanvasBackgroundCommand implements ICommand {
  label = "Set Canvas Background";
  private prev?: string | undefined;
  constructor(
    private engine: CanvasEngine,
    private color: string | undefined,
  ) {}
  do(): void {
    this.prev = (this.engine as any).background;
    (this.engine as any).background = this.color;
    this.engine.graph.markDirty();
  }
  undo(): void {
    (this.engine as any).background = this.prev;
    this.engine.graph.markDirty();
  }
  debugInfo(): CommandDebugInfo {
    return {
      canvas: true,
      changes: [{ entity: "canvas" as const, path: "background", prev: this.prev, next: this.color }],
    };
  }
}

export class SetGridOptionsCommand implements ICommand {
  label = "Set Grid Options";
  private prev?: { size?: number; color?: string; alpha?: number; type?: "line" | "dot"; visible?: boolean };
  constructor(
    private engine: CanvasEngine,
    private next: { size?: number; color?: string; alpha?: number; type?: "line" | "dot"; visible?: boolean },
  ) {}
  do(): void {
    const grid: any = this.engine.plugins.get("grid");
    if (!grid) return;
    this.prev = { size: grid.size, color: grid.color, alpha: grid.alpha, type: grid.type, visible: grid.visible };
    if (typeof this.next.size === "number") grid.size = this.next.size;
    if (typeof this.next.color === "string") grid.color = this.next.color;
    if (typeof this.next.alpha === "number") grid.alpha = this.next.alpha;
    if (typeof this.next.type === "string") grid.type = this.next.type;
    if (typeof this.next.visible === "boolean") grid.visible = this.next.visible;
    this.engine.graph.markDirty();
  }
  undo(): void {
    const grid: any = this.engine.plugins.get("grid");
    if (!grid || !this.prev) return;
    if (this.prev.size !== undefined) grid.size = this.prev.size;
    if (this.prev.color !== undefined) grid.color = this.prev.color;
    if (this.prev.alpha !== undefined) grid.alpha = this.prev.alpha;
    if (this.prev.type !== undefined) grid.type = this.prev.type;
    if (this.prev.visible !== undefined) grid.visible = this.prev.visible;
    this.engine.graph.markDirty();
  }
  debugInfo(): CommandDebugInfo {
    const ch: NonNullable<CommandDebugInfo["changes"]> = [];
    if (this.prev) {
      if ("size" in this.next)
        ch.push({ entity: "plugin" as const, id: "grid", path: "size", prev: this.prev.size, next: this.next.size });
      if ("color" in this.next)
        ch.push({ entity: "plugin" as const, id: "grid", path: "color", prev: this.prev.color, next: this.next.color });
      if ("alpha" in this.next)
        ch.push({ entity: "plugin" as const, id: "grid", path: "alpha", prev: this.prev.alpha, next: this.next.alpha });
      if ("type" in this.next)
        ch.push({ entity: "plugin" as const, id: "grid", path: "type", prev: this.prev.type, next: this.next.type });
      if ("visible" in this.next)
        ch.push({
          entity: "plugin" as const,
          id: "grid",
          path: "visible",
          prev: this.prev.visible,
          next: this.next.visible,
        });
    }
    return { plugins: ["grid"], changes: ch };
  }
}

export class SetGuidesOptionsCommand implements ICommand {
  label = "Set Guides Options";
  private prev?: { threshold?: number; visible?: boolean };
  constructor(
    private engine: CanvasEngine,
    private next: { threshold?: number; visible?: boolean },
  ) {}
  do(): void {
    const guides: any = this.engine.plugins.get("guides");
    if (!guides) return;
    this.prev = { threshold: guides.threshold, visible: guides.visible };
    if (typeof this.next.threshold === "number") guides.threshold = this.next.threshold;
    if (typeof this.next.visible === "boolean") guides.visible = this.next.visible;
    this.engine.graph.markDirty();
  }
  undo(): void {
    const guides: any = this.engine.plugins.get("guides");
    if (!guides || !this.prev) return;
    if (this.prev.threshold !== undefined) guides.threshold = this.prev.threshold;
    if (this.prev.visible !== undefined) guides.visible = this.prev.visible;
    this.engine.graph.markDirty();
  }
  debugInfo(): CommandDebugInfo {
    const ch: NonNullable<CommandDebugInfo["changes"]> = [];
    if (this.prev) {
      if ("threshold" in this.next)
        ch.push({
          entity: "plugin" as const,
          id: "guides",
          path: "threshold",
          prev: this.prev.threshold,
          next: this.next.threshold,
        });
      if ("visible" in this.next)
        ch.push({
          entity: "plugin" as const,
          id: "guides",
          path: "visible",
          prev: this.prev.visible,
          next: this.next.visible,
        });
    }
    return { plugins: ["guides"], changes: ch };
  }
}

export class UpdateNodePortsCommand implements ICommand {
  label = "Update Node Ports";
  private prevPorts?: Array<{
    id: string;
    offset: Point;
    anchorMode?: "relative" | "absolute";
    anchorPosition?: any;
    radius?: number;
    label?: string;
  }>;
  private prevShowPorts?: boolean;
  constructor(
    private graph: Graph,
    private nodeId: string,
    private nextPorts: Array<{
      id: string;
      offset: Point;
      anchorMode?: "relative" | "absolute";
      anchorPosition?: any;
      radius?: number;
      label?: string;
    }>,
    private nextShowPorts?: boolean,
  ) {}

  do(): void {
    const node = this.graph.getNode(this.nodeId);
    if (!node) return;

    // 保存旧状态
    this.prevPorts = node.ports?.map((p) => ({
      id: p.id,
      offset: { ...p.offset },
      anchorMode: p.anchorMode,
      anchorPosition: p.anchorPosition,
      radius: p.radius,
      label: p.label,
    }));
    this.prevShowPorts = node.data?.showPorts;

    // 应用新状态
    node.ports = this.nextPorts.map((p) => ({
      id: p.id,
      offset: { ...p.offset },
      anchorMode: p.anchorMode,
      anchorPosition: p.anchorPosition,
      radius: p.radius,
      label: p.label,
    }));
    if (this.nextShowPorts !== undefined) {
      if (!node.data) node.data = {};
      node.data.showPorts = this.nextShowPorts;
    }

    this.graph.markDirty();
  }

  undo(): void {
    const node = this.graph.getNode(this.nodeId);
    if (!node) return;

    // 恢复旧状态
    if (this.prevPorts !== undefined) {
      node.ports = this.prevPorts.map((p) => ({
        id: p.id,
        offset: { ...p.offset },
        anchorMode: p.anchorMode,
        anchorPosition: p.anchorPosition,
        radius: p.radius,
        label: p.label,
      }));
    }
    if (this.prevShowPorts !== undefined) {
      if (!node.data) node.data = {};
      node.data.showPorts = this.prevShowPorts;
    }

    this.graph.markDirty();
  }

  debugInfo(): CommandDebugInfo {
    return {
      nodes: [this.nodeId],
      changes: [
        { entity: "node" as const, id: this.nodeId, path: "ports", prev: this.prevPorts, next: this.nextPorts },
        {
          entity: "node" as const,
          id: this.nodeId,
          path: "data.showPorts",
          prev: this.prevShowPorts,
          next: this.nextShowPorts,
        },
      ],
    };
  }
}
