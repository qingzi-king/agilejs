/*
 * @Description: 插件管理器
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-17 19:43:20
 */
import { Plugin } from "./Plugin";
import type { CanvasEngine } from "../core/CanvasEngine";

export class PluginManager {
  private plugins = new Map<string, Plugin>();

  constructor(private engine: CanvasEngine) {}

  use(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) return;
    this.plugins.set(plugin.id, plugin);
    plugin.setup?.(this.engine);
  }

  eject(id: string): void {
    const p = this.plugins.get(id);
    if (!p) return;
    p.dispose?.();
    this.plugins.delete(id);
  }

  emitHook(hook: keyof Plugin, ...args: any[]): void {
    for (const p of this.plugins.values()) {
      const fn = (p as any)[hook];
      if (typeof fn === "function") fn.apply(p, args);
    }
  }

  get<T extends Plugin = Plugin>(id: string): T | undefined {
    return this.plugins.get(id) as T | undefined;
  }

  has(id: string): boolean {
    return this.plugins.has(id);
  }
}
