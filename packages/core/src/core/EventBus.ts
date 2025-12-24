/*
 * @Description: 事件总线
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-17 19:40:54
 */
export type EventMap = Record<string, unknown>;

type Listener<T> = (payload: T) => void;

export class EventBus<Events extends EventMap> {
  private listeners: Map<keyof Events, Set<Listener<any>>> = new Map();

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener<any>);
    return () => this.off(event, listener as Listener<any>);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener as Listener<any>);
      if (set.size === 0) this.listeners.delete(event);
    }
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        fn(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[EventBus] listener error for ${String(event)}`, err);
      }
    }
  }
}
