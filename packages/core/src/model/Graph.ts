/*
 * @Description: 图形数据模型
 * @Author: qingzi.wang
 * @Date: 2025-09-16 17:43:49
 * @LastEditTime: 2025-11-20 20:02:47
 */
export type NodeId = string;
export type EdgeId = string;

export interface Point {
  x: number;
  y: number;
}
export interface Size {
  width: number;
  height: number;
}

// 锚点位置枚举：相对于节点边界的位置
export type AnchorPosition =
  | "top"
  | "top-left"
  | "top-right"
  | "right"
  | "right-top"
  | "right-bottom"
  | "bottom"
  | "bottom-left"
  | "bottom-right"
  | "left"
  | "left-top"
  | "left-bottom"
  | "center";

export interface PortData {
  id: string;
  // 锚点模式：'relative' 使用相对位置（不受缩放影响），'absolute' 使用绝对像素偏移
  anchorMode?: "relative" | "absolute";
  // 相对锚点位置（当 anchorMode='relative' 时使用）
  anchorPosition?: AnchorPosition;
  // 相对节点左上角的位置（世界坐标系中的相对偏移，当 anchorMode='absolute' 或未指定时使用）
  offset: Point;
  // 可选：可视半径（用于端口可视化），单位为"基础像素"，实际绘制会乘以缩放比
  radius?: number;
  // 可选：显示名称（与 id 区分，若不需要可忽略）
  label?: string;
}

export interface NodeData {
  id: NodeId;
  shape: string;
  position: Point;
  size: Size;
  /** 是否可见（默认可见）。为 false 时不渲染也不可交互 */
  visible?: boolean;
  /** 是否允许被选中（默认 true）。为 false 时点击/框选都不会改变其选中态 */
  selectable?: boolean;
  /** 是否允许被拖拽（默认 true）。为 false 时不参与拖动预览与提交 */
  draggable?: boolean;
  /** 是否允许调整尺寸（默认 true）。为 false 时不显示调整手柄 */
  resizable?: boolean;
  /** 是否允许旋转（默认 true）。为 false 时不显示旋转手柄 */
  rotatable?: boolean;
  rotation?: number;
  zIndex?: number;
  selected?: boolean;
  parentId?: string; // 父节点ID（容器）
  isContainer?: boolean; // 是否为容器节点
  groupId?: string; // 直接所属组ID（向后兼容，表示最内层组）
  groupPath?: string[]; // 新增：完整组路径（从最外层到最内层），支持嵌套分组
  ports?: PortData[];
  data?: Record<string, unknown> & {
    /** 是否显示锚点（默认 true）。为 false 时锚点不可见但仍可连线 */
    showPorts?: boolean;
  };
}

export interface EdgeData {
  id: EdgeId;
  shape: string;
  source: NodeId;
  target: NodeId;
  sourcePortId?: string;
  targetPortId?: string;
  points?: Point[];
  selected?: boolean;
  data?: Record<string, unknown>;
}

export type GraphEventType = "node:added" | "node:removed" | "edge:added" | "edge:removed" | "graph:cleared";
export interface GraphEvent {
  type: GraphEventType;
  data?: any;
}

export class Graph {
  private nodes = new Map<NodeId, NodeData>();
  private edges = new Map<EdgeId, EdgeData>();
  private nodesCache: NodeData[] | null = null;
  private edgesCache: EdgeData[] | null = null;
  // 结构版本：节点/边增删、位置/尺寸变化时递增（影响边快照、空间索引）
  private structureVersion = 0;
  // 渲染版本：任何变更（包括样式变更）都递增（影响渲染）
  private renderVersion = 0;

  private _listeners: ((e: GraphEvent) => void)[] = [];

  on(listener: (e: GraphEvent) => void): () => void {
    this._listeners.push(listener);
    return () => {
      const index = this._listeners.indexOf(listener);
      if (index > -1) this._listeners.splice(index, 1);
    };
  }

  private emit(type: GraphEventType, data?: any) {
    this._listeners.forEach((l) => l({ type, data }));
  }

  addNode(node: NodeData): void {
    this.nodes.set(node.id, node);
    this.nodesCache = null;
    this.bump("structure");
    this.emit("node:added", node);
  }

  addEdge(edge: EdgeData): void {
    this.edges.set(edge.id, edge);
    this.edgesCache = null;
    this.bump("structure");
    this.emit("edge:added", edge);
  }

  getNode(id: NodeId): NodeData | undefined {
    return this.nodes.get(id);
  }
  getEdge(id: EdgeId): EdgeData | undefined {
    return this.edges.get(id);
  }

  getNodes(): NodeData[] {
    if (!this.nodesCache) {
      // 只在缓存失效时复制+排序；增加稳定次关键字（id），避免上层重复排序
      this.nodesCache = Array.from(this.nodes.values()).sort((a, b) => {
        const dz = (a.zIndex ?? 0) - (b.zIndex ?? 0);
        return dz !== 0 ? dz : a.id.localeCompare(b.id);
      });
    }
    return this.nodesCache;
  }
  getEdges(): EdgeData[] {
    if (!this.edgesCache) {
      this.edgesCache = Array.from(this.edges.values());
    }
    return this.edgesCache;
  }

  removeNode(id: NodeId): void {
    const node = this.nodes.get(id);
    if (!node) return;

    this.nodes.delete(id);
    // also remove connected edges
    const removedEdges: EdgeData[] = [];
    for (const e of Array.from(this.edges.values())) {
      if (e.source === id || e.target === id) {
        this.edges.delete(e.id);
        removedEdges.push(e);
      }
    }
    this.nodesCache = null;
    this.edgesCache = null;
    this.bump("structure");

    this.emit("node:removed", node);
    removedEdges.forEach((edge) => this.emit("edge:removed", edge));
  }

  removeEdge(id: EdgeId): void {
    const edge = this.edges.get(id);
    if (!edge) return;

    this.edges.delete(id);
    this.edgesCache = null;
    this.bump("structure");
    this.emit("edge:removed", edge);
  }

  /**
   * 清空图中所有节点与边，并重置缓存与版本（自增一次）。
   * 提供给装载/重置场景使用，避免外部直接访问私有 Map 导致缓存不同步。
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.nodesCache = null;
    this.edgesCache = null;
    this.bump("structure");
    this.emit("graph:cleared");
  }

  connectedEdges(nodeId: NodeId): EdgeData[] {
    return Array.from(this.edges.values()).filter((e) => e.source === nodeId || e.target === nodeId);
  }

  setNodePosition(id: NodeId, x: number, y: number): void {
    const n = this.nodes.get(id);
    if (n) {
      n.position.x = x;
      n.position.y = y;
      this.nodesCache = null;
      this.bump("structure");
    }
  }

  setNodeSize(id: NodeId, width: number, height: number): void {
    const n = this.nodes.get(id);
    if (n) {
      n.size.width = width;
      n.size.height = height;
      this.nodesCache = null;
      this.bump("structure");
    }
  }

  setNodeZIndex(id: NodeId, zIndex: number): void {
    const n = this.nodes.get(id);
    if (n) {
      n.zIndex = zIndex;
      this.nodesCache = null;
      this.bump("structure");
    }
  }

  /**
   * 强制标记图为已变更（用于直接改写节点/边属性导致的缓存不一致情况）
   * @param type 'structure' - 结构变更（影响边快照、空间索引）| 'style' - 样式变更（仅影响渲染）
   */
  markDirty(type: "structure" | "style" = "structure"): void {
    this.bump(type);
  }

  /**
   * 获取当前图版本号（结构版本，用于边快照、空间索引等结构相关缓存）
   */
  getVersion(): number {
    return this.structureVersion;
  }

  /**
   * 获取渲染版本号（包含所有变更，用于渲染失效判断）
   */
  getRenderVersion(): number {
    return this.renderVersion;
  }

  private bump(type: "structure" | "style" = "structure"): void {
    if (type === "structure") {
      this.structureVersion++;
      this.renderVersion++;
    } else {
      // 仅样式变更：只递增渲染版本，不影响结构版本
      this.renderVersion++;
    }
  }
}
