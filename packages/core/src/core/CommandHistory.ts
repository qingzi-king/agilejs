/*
 * @Description: 命令历史管理
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-10-17 09:27:43
 */
export type ChangeItem = {
  entity: "node" | "edge" | "group" | "canvas" | "plugin" | "misc";
  id?: string; // 节点/边/分组 id，或插件 key
  path: string; // 变更的属性路径，如 'position.x'、'size.width'、'data.foo'
  prev: unknown;
  next: unknown;
  note?: string; // 可选备注（如采样/截断说明）
};

export type CommandDebugInfo = {
  // 受影响的节点/边/组
  nodes?: string[];
  edges?: string[];
  groups?: string[];
  // 画布级或插件级（如 grid、guides）
  canvas?: boolean;
  plugins?: string[];
  // 变更明细（通用 schema）
  changes?: ChangeItem[];
  // 其他可选元信息（如计数、备注）
  extra?: Record<string, unknown>;
};

export interface ICommand {
  do(): void;
  undo(): void;
  label?: string;
  // 可选：命令自行提供调试信息，优先于反射提取
  debugInfo?: () => CommandDebugInfo | undefined;
}

/**
 * 复合命令：将多个命令作为一个整体执行和撤销
 */
class CompositeCommand implements ICommand {
  label?: string;
  private commands: ICommand[];
  constructor(
    cmds: ICommand[],
    label?: string,
    public key?: string,
  ) {
    this.commands = cmds.slice();
    this.label = label;
  }
  add(cmd: ICommand) {
    this.commands.push(cmd);
  }
  do(): void {
    for (const c of this.commands) c.do();
  }
  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) this.commands[i].undo();
  }
}

type ExecuteOptions = { merge?: boolean; mergeKey?: string; mergeWindowMs?: number; label?: string };

/**
 * 命令历史栈，支持执行、撤销、重做、合并命令以及事务
 */
export class CommandHistory {
  private done: ICommand[] = [];
  private undone: ICommand[] = [];
  private max = 100;
  // 合并：记录最近一个 key 的时间戳以及 last item 是否可合并
  private lastMergeAt: Map<string, number> = new Map();
  private mergeKeyMap: WeakMap<ICommand, string> = new WeakMap();
  // 事务支持：允许将一批命令作为一个 CompositeCommand 推入历史
  private txnStack: Array<{ cmds: ICommand[]; label?: string; key?: string }> = [];
  // 变更订阅：当历史可用性变化（或执行、撤销、重做、合并等）时通知监听者
  private listeners: Set<() => void> = new Set();

  constructor(max = 200) {
    this.max = max;
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyChange(): void {
    for (const l of this.listeners) {
      try {
        l();
      } catch {}
    }
  }

  beginTransaction(label?: string, key?: string): void {
    this.txnStack.push({ cmds: [], label, key });
  }
  commitTransaction(): void {
    const tx = this.txnStack.pop();
    if (!tx) return;
    if (tx.cmds.length === 0) return;
    const composite = new CompositeCommand(tx.cmds, tx.label, tx.key);
    // 不要在 commit 时再次 do()，因为 tx 内的命令已经执行完成
    this.pushDone(composite);
    // pushDone 已清空 redo 栈，通知变化
    this.notifyChange();
  }
  rollbackTransaction(): void {
    const tx = this.txnStack.pop();
    if (!tx) return;
    // 撤销已执行的 tx 命令
    for (let i = tx.cmds.length - 1; i >= 0; i--) tx.cmds[i].undo();
    // 回滚事务不会改变历史栈（仅撤销了尚未入栈的命令），一般无需通知
  }

  execute(command: ICommand, options?: ExecuteOptions): void {
    // 执行命令本体
    command.do();
    // 事务模式：仅记录到当前事务，不直接进入历史栈
    if (this.txnStack.length > 0) {
      this.txnStack[this.txnStack.length - 1].cmds.push(command);
      return;
    }
    const { merge, mergeKey, mergeWindowMs = 400, label } = options ?? {};
    if (!merge || !mergeKey) {
      this.pushDone(command);
      if (mergeKey) this.mergeKeyMap.set(command, mergeKey);
      this.notifyChange();
      return;
    }
    const now = Date.now();
    const last = this.done[this.done.length - 1];
    const lastKey = last instanceof CompositeCommand ? last.key : last ? this.mergeKeyMap.get(last) : undefined;
    const lastAt = lastKey ? (this.lastMergeAt.get(lastKey) ?? 0) : 0;
    const withinWindow = now - lastAt <= mergeWindowMs;

    if (last && lastKey === mergeKey && withinWindow) {
      // 追加到已有的 Composite 或将 last+current 包成一个 Composite
      if (last instanceof CompositeCommand) {
        last.add(command);
      } else {
        // 替换最后一个为 Composite
        const prev = this.done.pop()!;
        const cc = new CompositeCommand([prev, command], label ?? prev.label, mergeKey);
        this.done.push(cc);
      }
      this.undone.length = 0;
      this.lastMergeAt.set(mergeKey, now);
      this.mergeKeyMap.set(command, mergeKey);
      this.notifyChange();
      return;
    }
    // 无法合并：作为新条目入栈
    this.pushDone(command);
    this.mergeKeyMap.set(command, mergeKey);
    this.lastMergeAt.set(mergeKey, now);
    this.notifyChange();
  }

  canUndo(): boolean {
    return this.done.length > 0;
  }

  canRedo(): boolean {
    return this.undone.length > 0;
  }

  undo(): void {
    const cmd = this.done.pop();
    if (!cmd) return;
    cmd.undo();
    this.undone.push(cmd);
    this.notifyChange();
  }

  redo(): void {
    const cmd = this.undone.pop();
    if (!cmd) return;
    cmd.do();
    this.done.push(cmd);
    this.notifyChange();
  }

  private pushDone(command: ICommand): void {
    this.done.push(command);
    this.undone.length = 0;
    if (this.done.length > this.max) this.done.shift();
  }

  /**
   * 获取历史堆栈的可读快照，便于调试
   */
  debugSnapshot(): {
    done: Array<{
      type: "command" | "composite";
      label: string;
      className: string;
      mergeKey?: string;
      targets?: CommandDebugInfo;
      changes?: ChangeItem[];
      children?: Array<{
        label: string;
        className: string;
        mergeKey?: string;
        targets?: CommandDebugInfo;
        changes?: ChangeItem[];
      }>;
    }>;
    undone: Array<{
      type: "command" | "composite";
      label: string;
      className: string;
      mergeKey?: string;
      targets?: CommandDebugInfo;
      changes?: ChangeItem[];
      children?: Array<{
        label: string;
        className: string;
        mergeKey?: string;
        targets?: CommandDebugInfo;
        changes?: ChangeItem[];
      }>;
    }>;
    canUndo: boolean;
    canRedo: boolean;
    size: { done: number; undone: number; max: number };
    txnDepth: number;
    lastMergeKeys: string[];
  } {
    const getLabel = (cmd: ICommand) => (cmd.label ?? (cmd as any).label ?? cmd.constructor.name) as string;
    const getMergeKey = (cmd: ICommand) => this.mergeKeyMap.get(cmd);
    const extractTargets = (cmd: ICommand): CommandDebugInfo | undefined => {
      try {
        // 1) 命令自报调试信息
        if (typeof (cmd as any).debugInfo === "function") {
          const info = (cmd as any).debugInfo();
          if (info) return info;
        }
        // 2) 通过已知属性名反射提取
        const nodes: Set<string> = new Set();
        const edges: Set<string> = new Set();
        const groups: Set<string> = new Set();
        let canvas = false;
        const plugins: Set<string> = new Set();

        const anyCmd = cmd as any;
        // 常见字段
        if (typeof anyCmd.nodeId === "string") nodes.add(anyCmd.nodeId);
        if (Array.isArray(anyCmd.nodeIds))
          anyCmd.nodeIds.forEach((id: string) => typeof id === "string" && nodes.add(id));
        if (Array.isArray(anyCmd.ids)) anyCmd.ids.forEach((id: string) => typeof id === "string" && nodes.add(id));
        if (typeof anyCmd.edgeId === "string") edges.add(anyCmd.edgeId);
        if (Array.isArray(anyCmd.edgeIds))
          anyCmd.edgeIds.forEach((id: string) => typeof id === "string" && edges.add(id));
        // 分组命令（可能使用 groupId/ids）
        if (Array.isArray(anyCmd.groupIds))
          anyCmd.groupIds.forEach((id: string) => typeof id === "string" && groups.add(id));

        // 特例：GroupTransformCommand 持有 backup[{id,...}]
        if (Array.isArray(anyCmd.backup)) {
          anyCmd.backup.forEach((u: any) => {
            if (u && typeof u.id === "string") nodes.add(u.id);
          });
        }

        // 特例：ReorderZIndexCommand 使用 prev/next 映射
        if (cmd.constructor?.name === "ReorderZIndexCommand") {
          const keys = Object.keys((anyCmd.next ?? anyCmd.prev ?? {}) as Record<string, unknown>);
          keys.forEach((k) => nodes.add(k));
        }

        // 画布/插件类命令识别
        const cls = cmd.constructor?.name as string;
        if (cls === "SetCanvasBackgroundCommand") canvas = true;
        if (cls === "SetGridOptionsCommand") plugins.add("grid");
        if (cls === "SetGuidesOptionsCommand") plugins.add("guides");

        const info: CommandDebugInfo = {};
        if (nodes.size) info.nodes = Array.from(nodes);
        if (edges.size) info.edges = Array.from(edges);
        if (groups.size) info.groups = Array.from(groups);
        if (canvas) info.canvas = true;
        if (plugins.size) info.plugins = Array.from(plugins);
        return Object.keys(info).length ? info : undefined;
      } catch {
        return undefined;
      }
    };

    const aggregateChildrenTargets = (
      children?: Array<{ targets?: CommandDebugInfo }>,
    ): CommandDebugInfo | undefined => {
      if (!children || children.length === 0) return undefined;
      const nodes = new Set<string>();
      const edges = new Set<string>();
      const groups = new Set<string>();
      let canvas = false;
      const plugins = new Set<string>();
      for (const c of children) {
        const t = c.targets;
        if (!t) continue;
        t.nodes?.forEach((id) => nodes.add(id));
        t.edges?.forEach((id) => edges.add(id));
        t.groups?.forEach((id) => groups.add(id));
        canvas = canvas || !!t.canvas;
        t.plugins?.forEach((p) => plugins.add(p));
      }
      const info: CommandDebugInfo = {};
      if (nodes.size) info.nodes = Array.from(nodes);
      if (edges.size) info.edges = Array.from(edges);
      if (groups.size) info.groups = Array.from(groups);
      if (canvas) info.canvas = true;
      if (plugins.size) info.plugins = Array.from(plugins);
      return Object.keys(info).length ? info : undefined;
    };

    const extractChangesFallback = (cmd: ICommand): ChangeItem[] | undefined => {
      // 轻量反射：若存在 from/to 或 prev/next 且为浅层数值/字符串，生成基本变更项。
      try {
        const anyCmd = cmd as any;
        const changes: ChangeItem[] = [];
        const cls = cmd.constructor?.name as string;
        const add = (
          entity: ChangeItem["entity"],
          id: string | undefined,
          path: string,
          prev: unknown,
          next: unknown,
        ) => {
          if (prev === next) return;
          changes.push({ entity, id, path, prev, next });
        };
        // MoveNodeCommand: from/to + nodeId
        if (anyCmd.from && anyCmd.to && typeof anyCmd.nodeId === "string") {
          if (typeof anyCmd.from.x === "number" && typeof anyCmd.to.x === "number")
            add("node", anyCmd.nodeId, "position.x", anyCmd.from.x, anyCmd.to.x);
          if (typeof anyCmd.from.y === "number" && typeof anyCmd.to.y === "number")
            add("node", anyCmd.nodeId, "position.y", anyCmd.from.y, anyCmd.to.y);
        }
        // SetNodeRotationCommand: prev/rotation + nodeId
        if (
          cls === "SetNodeRotationCommand" &&
          typeof anyCmd.nodeId === "string" &&
          typeof anyCmd.prev === "number" &&
          typeof anyCmd.rotation === "number"
        ) {
          add("node", anyCmd.nodeId, "rotation", anyCmd.prev, anyCmd.rotation);
        }
        return changes.length ? changes : undefined;
      } catch {
        return undefined;
      }
    };

    const describe = (
      cmd: ICommand,
    ): {
      type: "command" | "composite";
      label: string;
      className: string;
      mergeKey?: string;
      targets?: CommandDebugInfo;
      changes?: ChangeItem[];
      children?: Array<{
        label: string;
        className: string;
        mergeKey?: string;
        targets?: CommandDebugInfo;
        changes?: ChangeItem[];
      }>;
    } => {
      if (cmd instanceof CompositeCommand) {
        // Composite 内部没有直接暴露列表，这里用 toString 不可靠，遍历内部需要调整：
        // 由于 CompositeCommand 在本文件中定义且 commands 是私有，这里利用类型断言访问
        const composite = cmd as unknown as { commands?: ICommand[]; key?: string };
        const children = (composite.commands ?? []).map((c) => ({
          label: getLabel(c),
          className: c.constructor.name,
          mergeKey: getMergeKey(c),
          targets: extractTargets(c),
          changes:
            (typeof (c as any).debugInfo === "function"
              ? ((c as any).debugInfo()?.changes as ChangeItem[] | undefined)
              : undefined) ?? extractChangesFallback(c),
        }));
        // 聚合 children 的 changes（适量，不做截断，交由命令端控制大小）
        const aggChanges: ChangeItem[] | undefined = (() => {
          const list: ChangeItem[] = [];
          for (const c of children) if (c.changes?.length) list.push(...c.changes);
          return list.length ? list : undefined;
        })();
        return {
          type: "composite",
          label: getLabel(cmd),
          className: cmd.constructor.name,
          mergeKey: composite.key,
          children,
          targets: aggregateChildrenTargets(children),
          changes: aggChanges,
        };
      }
      return {
        type: "command",
        label: getLabel(cmd),
        className: cmd.constructor.name,
        mergeKey: getMergeKey(cmd),
        targets: extractTargets(cmd),
        changes:
          (typeof (cmd as any).debugInfo === "function"
            ? ((cmd as any).debugInfo()?.changes as ChangeItem[] | undefined)
            : undefined) ?? extractChangesFallback(cmd),
      };
    };

    return {
      done: this.done.map(describe),
      undone: this.undone.map(describe),
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      size: { done: this.done.length, undone: this.undone.length, max: this.max },
      txnDepth: this.txnStack.length,
      lastMergeKeys: Array.from(this.lastMergeAt.keys()),
    };
  }

  /**
   * 返回历史数据（不做任何日志输出）
   * - 'object': 与 debugSnapshot 相同的结构化对象
   * - 'array':  扁平数组 + meta，便于表格/上报
   */
  debugData(format: "object" | "array" = "object"):
    | ReturnType<CommandHistory["debugSnapshot"]>
    | {
        meta: {
          canUndo: boolean;
          canRedo: boolean;
          size: { done: number; undone: number; max: number };
          txnDepth: number;
          lastMergeKeys: string[];
        };
        items: Array<{
          stack: "done" | "undone";
          index: number;
          type: "command" | "composite";
          label: string;
          className: string;
          mergeKey?: string;
          targets?: CommandDebugInfo;
          changes?: ChangeItem[];
          children?: Array<{
            label: string;
            className: string;
            mergeKey?: string;
            targets?: CommandDebugInfo;
            changes?: ChangeItem[];
          }>;
        }>;
      } {
    const snap = this.debugSnapshot();
    if (format === "object") return snap;
    const items: Array<{
      stack: "done" | "undone";
      index: number;
      type: "command" | "composite";
      label: string;
      className: string;
      mergeKey?: string;
      targets?: CommandDebugInfo;
      changes?: ChangeItem[];
      children?: Array<{
        label: string;
        className: string;
        mergeKey?: string;
        targets?: CommandDebugInfo;
        changes?: ChangeItem[];
      }>;
    }> = [];
    snap.done.forEach((item, idx) => items.push({ stack: "done", index: idx, ...item }));
    snap.undone.forEach((item, idx) => items.push({ stack: "undone", index: idx, ...item }));
    return {
      meta: {
        canUndo: snap.canUndo,
        canRedo: snap.canRedo,
        size: snap.size,
        txnDepth: snap.txnDepth,
        lastMergeKeys: snap.lastMergeKeys,
      },
      items,
    };
  }
}
