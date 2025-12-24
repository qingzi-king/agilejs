/*
 * @Description: 动画管理
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-17 19:39:37
 */
export type Easing = (t: number) => number;

export const EasingFns = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
} satisfies Record<string, Easing>;

export interface TweenOptions {
  duration: number; // ms
  easing?: Easing;
  onUpdate: (progress: number) => void;
  onComplete?: () => void;
}

class Tween {
  private startTime = 0;
  private active = true;
  constructor(private opts: TweenOptions) {}
  tick(now: number): boolean {
    if (!this.startTime) this.startTime = now;
    const t = Math.min(1, (now - this.startTime) / this.opts.duration);
    const e = (this.opts.easing ?? EasingFns.linear)(t);
    this.opts.onUpdate(e);
    if (t >= 1) {
      this.active = false;
      this.opts.onComplete?.();
    }
    return this.active;
  }
}

export class AnimationManager {
  private tweens: Set<Tween> = new Set();
  add(opts: TweenOptions): void {
    this.tweens.add(new Tween(opts));
  }
  tick(now: number): void {
    for (const tw of Array.from(this.tweens)) {
      const alive = tw.tick(now);
      if (!alive) this.tweens.delete(tw);
    }
  }
  /**
   * 检查是否有活跃的动画
   */
  hasActive(): boolean {
    return this.tweens.size > 0;
  }
}
