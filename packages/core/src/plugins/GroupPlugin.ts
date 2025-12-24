/*
 * @Description: 组合/解组插件（分配 groupId，支持组选择与整体移动）
 * @Author: qingzi.wang
 * @Date: 2025-09-18 16:42:47
 * @LastEditTime: 2025-09-18 18:12:05
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import type { NodeData } from "../model/Graph";
import { GroupNodesCommand, UngroupNodesCommand } from "../commands/GraphCommands";

export interface GroupPluginOptions {
  idPrefix?: string; // 组ID前缀
}

export class GroupPlugin implements Plugin {
  readonly id = "group";
  private engine!: CanvasEngine;
  private opts: Required<GroupPluginOptions>;

  constructor(opts: GroupPluginOptions = {}) {
    this.opts = { idPrefix: opts.idPrefix ?? "g" };
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    // 可根据需要绑定快捷键，这里先留空，供外部通过方法调用
  }

  dispose(): void {}

  // 生成唯一组ID
  private newGroupId(): string {
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 6);
    return `${this.opts.idPrefix}_${t}_${r}`;
  }

  groupSelected(): string | null {
    const nodes = this.engine.graph.getNodes().filter((n) => n.selected);
    if (nodes.length < 2) return null;
    const gid = this.newGroupId();
    const ids = nodes.map((n) => n.id);
    this.engine.history.execute(new GroupNodesCommand(this.engine.graph, ids, gid));
    return gid;
  }

  // 逐层解组（默认行为）：移除最内层组
  ungroupSelected(): void {
    const nodes = this.engine.graph.getNodes().filter((n) => n.selected);
    if (nodes.length === 0) return;
    const ids = nodes.map((n) => n.id);
    this.engine.history.execute(new UngroupNodesCommand(this.engine.graph, ids));
  }

  // 完全展平：移除所有层级的组
  ungroupAllLevels(): void {
    const nodes = this.engine.graph.getNodes().filter((n) => n.selected);
    if (nodes.length === 0) return;

    // 直接清除 groupId 和 groupPath（不可撤销，或者可封装为新命令）
    nodes.forEach((n) => {
      delete n.groupId;
      delete n.groupPath;
    });
    this.engine.graph.markDirty();
    this.engine.events.emit("graph:change", { reason: "ungroup-all" });
  }

  // 根据 groupId 选择整组（用于点击组内任何一个节点时一并选择）
  // 更新：支持通过 groupPath 检测嵌套关系
  selectGroupOf(node: NodeData, additive = false): void {
    if (!node.groupId) return;
    const nodes = this.engine.graph.getNodes();
    if (!additive) nodes.forEach((n) => (n.selected = false));

    // 选择所有具有相同最内层 groupId 的节点
    nodes.forEach((n) => {
      if (n.groupId === node.groupId) {
        n.selected = true;
      }
    });

    this.engine.events.emit("graph:change", { reason: "group-select" });
  }
}
