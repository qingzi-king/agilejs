/*
 * @Description: 形状渲染器注册接口
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-09-17 19:44:41
 */
import { ShapeRenderer } from "./ShapeRenderer";

export class RendererRegistry {
  private map = new Map<string, ShapeRenderer>();

  register(renderer: ShapeRenderer): void {
    this.map.set(renderer.shape, renderer);
  }

  unregister(shape: string): void {
    this.map.delete(shape);
  }

  get(shape: string): ShapeRenderer | undefined {
    return this.map.get(shape);
  }

  /**
   * 返回所有已注册的渲染器（只读快照）
   */
  all(): ReadonlyArray<ShapeRenderer> {
    return Array.from(this.map.values());
  }
}
