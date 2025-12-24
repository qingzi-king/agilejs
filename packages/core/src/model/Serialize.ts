/*
 * @Description: 图形数据序列化
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:05:54
 * @LastEditTime: 2025-10-15 18:59:45
 */
import { EdgeData, Graph, NodeData } from "./Graph";

export interface GraphJSON {
  nodes: NodeData[];
  edges: EdgeData[];
}

// 深拷贝仅保留可 JSON 序列化的数据，避免把运行期缓存（如 DOM/Image 对象）带入
function safeJsonClone<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    // 兜底：浅拷贝（尽量不抛错）
    if (obj && typeof obj === "object") return { ...(obj as any) } as T;
    return obj;
  }
}

export function toJSON(graph: Graph): GraphJSON {
  return {
    nodes: graph.getNodes().map(
      (n) =>
        ({
          id: n.id,
          shape: n.shape,
          position: { ...n.position },
          size: { ...n.size },
          rotation: n.rotation,
          zIndex: n.zIndex,
          selected: n.selected,
          visible: n.visible,
          selectable: (n as any).selectable,
          draggable: (n as any).draggable,
          resizable: (n as any).resizable,
          rotatable: (n as any).rotatable,
          groupId: n.groupId,
          groupPath: n.groupPath ? [...n.groupPath] : undefined, // 新增：序列化 groupPath
          parentId: n.parentId,
          isContainer: n.isContainer,
          data: n.data ? safeJsonClone(n.data) : undefined,
          ports: n.ports
            ? n.ports.map((p) => ({
                id: p.id,
                offset: { ...p.offset },
                radius: p.radius,
                label: p.label,
                anchorMode: p.anchorMode,
                anchorPosition: p.anchorPosition,
              }))
            : undefined,
        }) as NodeData,
    ),
    edges: graph.getEdges().map(
      (e) =>
        ({
          id: e.id,
          shape: e.shape,
          source: e.source,
          target: e.target,
          sourcePortId: e.sourcePortId,
          targetPortId: e.targetPortId,
          selected: e.selected,
          data: e.data ? safeJsonClone(e.data) : undefined,
          points: e.points ? e.points.map((p) => ({ ...p })) : undefined,
        }) as EdgeData,
    ),
  };
}

export function fromJSON(graph: Graph, json: GraphJSON): void {
  json.nodes.forEach((n) =>
    graph.addNode({
      id: n.id,
      shape: n.shape,
      position: { ...n.position },
      size: { ...n.size },
      rotation: n.rotation,
      zIndex: n.zIndex,
      selected: n.selected,
      visible: (n as any).visible,
      selectable: (n as any).selectable,
      draggable: (n as any).draggable,
      resizable: (n as any).resizable,
      rotatable: (n as any).rotatable,
      groupId: (n as any).groupId,
      groupPath: (n as any).groupPath ? [...(n as any).groupPath] : undefined, // 新增：反序列化 groupPath
      parentId: (n as any).parentId,
      isContainer: (n as any).isContainer,
      data: n.data ? safeJsonClone(n.data) : undefined,
      ports: n.ports
        ? n.ports.map((p) => ({
            id: p.id,
            offset: { ...p.offset },
            radius: p.radius,
            label: p.label,
            anchorMode: p.anchorMode,
            anchorPosition: p.anchorPosition,
          }))
        : undefined,
    }),
  );
  json.edges.forEach((e) =>
    graph.addEdge({
      id: e.id,
      shape: e.shape,
      source: e.source,
      target: e.target,
      sourcePortId: e.sourcePortId,
      targetPortId: e.targetPortId,
      selected: e.selected,
      data: e.data ? safeJsonClone(e.data) : undefined,
      points: e.points ? e.points.map((p) => ({ ...p })) : undefined,
    }),
  );
}
