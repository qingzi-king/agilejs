/*
 * @Description: 节点闪烁插件（引擎内置）
 * 提供 API：start/stop/stopAll/isBlinking/onChange，并支持从数据 data.blink 自动驱动
 * @Author: qingzi.wang
 * @Date: 2025-09-26 21:55:00
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { EasingFns } from "../core/Animation";
import type { Plugin } from "./Plugin";

export interface BlinkOptions {
  period?: number; // ms, full cycle
  min?: number; // min alpha
  max?: number; // max alpha
}

type State = { running: boolean; origAlpha: number | undefined; rev: number };

export class BlinkPlugin implements Plugin {
  readonly id = "blink";
  private engine!: CanvasEngine;
  private maps = new Map<string, State>();
  private listeners = new Set<(payload: { id: string; running: boolean }) => void>();
  private autoFromData = true; // 允许从 data.blink 自动驱动

  setup(engine: CanvasEngine): void {
    this.engine = engine;
  }
  dispose(): void {
    this.stopAll();
    this.listeners.clear();
  }

  onChange(listener: (payload: { id: string; running: boolean }) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private emit(id: string, running: boolean) {
    for (const l of this.listeners) l({ id, running });
  }

  isBlinking(id?: string): boolean {
    if (!id) return false;
    return !!this.maps.get(id)?.running;
  }

  start(ids: string[], opts?: BlinkOptions): void {
    if (!ids.length) return;
    const period = Math.max(1, Math.min(4000, opts?.period ?? 800));
    const aMin = Math.max(0, Math.min(1, opts?.min ?? 0.25));
    const aMax = Math.max(aMin, Math.min(1, opts?.max ?? 1));
    const half = period / 2;
    const map = this.maps;
    const engine = this.engine;

    const kick = (id: string, toHigh: boolean, rev: number) => {
      const item = map.get(id);
      if (!item || !item.running || item.rev !== rev) return; // generation guard
      const node = engine.graph.getNode(id);
      if (!node) {
        item.running = false;
        map.delete(id);
        return;
      }
      const style: any = { ...(node.data?.style ?? {}) };
      if (item.origAlpha === undefined) item.origAlpha = typeof style.alpha === "number" ? style.alpha : 1;
      const from = typeof style.alpha === "number" ? Number(style.alpha) : toHigh ? aMin : aMax;
      const to = toHigh ? aMax : aMin;
      engine.animations.add({
        duration: half,
        easing: EasingFns.easeInOutQuad,
        onUpdate: (p) => {
          const curState = map.get(id);
          if (!curState || curState.rev !== rev) return; // outdated tween, ignore updates
          const cur = from + (to - from) * p;
          // 在变化过程中：透明度按两位小数量化（并限制在 [0,1]）
          const q = Math.round(Math.max(0, Math.min(1, cur)) * 100) / 100;
          const n = engine.graph.getNode(id);
          if (!n) return;
          const st: any = { ...(n.data?.style ?? {}) };
          st.alpha = q;
          n.data = { ...(n.data ?? {}), style: st } as any;
          // 样式变更：仅递增渲染版本，不影响边快照等结构缓存
          engine.graph.markDirty("style");
        },
        onComplete: () => {
          const it = map.get(id);
          if (!it || it.rev !== rev) {
            return;
          }
          if (it.running) {
            kick(id, !toHigh, rev);
          } else {
            // stopped for this generation, restore alpha and cleanup
            const n2 = engine.graph.getNode(id);
            if (n2) {
              const st2: any = { ...(n2.data?.style ?? {}) };
              st2.alpha = it.origAlpha ?? 1;
              n2.data = { ...(n2.data ?? {}), style: st2 } as any;
              // 样式恢复：仅递增渲染版本
              engine.graph.markDirty("style");
            }
            map.delete(id);
          }
        },
      });
    };

    ids.forEach((id) => {
      const cur = map.get(id);
      if (cur?.running) return;
      const nextRev = (cur?.rev ?? 0) + 1;
      map.set(id, { running: true, origAlpha: cur?.origAlpha, rev: nextRev });
      this.emit(id, true);
      kick(id, false, nextRev);
    });
  }

  stop(ids: string[]): void {
    const map = this.maps;
    ids.forEach((id) => {
      const it = map.get(id);
      if (it) {
        it.running = false;
        this.emit(id, false);
      }
    });
  }

  stopAll(): void {
    for (const [id, it] of this.maps.entries()) {
      it.running = false;
      this.emit(id, false);
    }
  }

  /**
   * 可选：在渲染前检查 data.blink 并自动与内部状态对齐
   * 仅在 autoFromData 为 true 时生效
   */
  beforeRender(): void {
    if (!this.autoFromData) return;
    const g = this.engine.graph;
    for (const n of g.getNodes()) {
      const b: any = (n.data as any)?.blink;
      // 修复：没有blink数据时视为disabled（支持撤销删除blink配置后正确停止）
      const enabled = b ? !!b.enabled : false;
      const isOn = this.isBlinking(n.id);
      if (enabled && !isOn) {
        const period = Math.max(1, Math.min(4000, Number(b.period ?? 800)));
        const min = Math.max(0, Math.min(1, Number(b.min ?? 0.25)));
        const max = Math.max(min, Math.min(1, Number(b.max ?? 1)));
        this.start([n.id], { period, min, max });
      } else if (!enabled && isOn) {
        this.stop([n.id]);
      }
      // 若已开启且正在运行，不在每帧重启；参数变更时请显式 stop+start（UI 已处理）
    }
  }
}
