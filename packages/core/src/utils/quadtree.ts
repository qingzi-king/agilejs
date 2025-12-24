/*
 * Simple Quadtree for axis-aligned bounding boxes
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface QTItem<T = any> {
  x: number;
  y: number;
  width: number;
  height: number;
  data: T;
}

function intersects(a: Rect, b: Rect): boolean {
  return !(a.x + a.width < b.x || a.y + a.height < b.y || a.x > b.x + b.width || a.y > b.y + b.height);
}

function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

class QTNode<T = any> {
  items: QTItem<T>[] = [];
  children: QTNode<T>[] | null = null;
  constructor(
    public bounds: Rect,
    public level: number,
  ) {}
}

export class Quadtree<T = any> {
  private root: QTNode<T>;
  private maxItems: number;
  private maxDepth: number;

  constructor(bounds: Rect, opts: { maxItems?: number; maxDepth?: number } = {}) {
    this.root = new QTNode<T>(bounds, 0);
    this.maxItems = opts.maxItems ?? 16;
    this.maxDepth = opts.maxDepth ?? 8;
  }

  clear(): void {
    this.root = new QTNode<T>({ ...this.root.bounds }, 0);
  }

  insert(item: QTItem<T>): void {
    this._insert(this.root, item);
  }

  query(range: Rect, out: QTItem<T>[] = []): QTItem<T>[] {
    this._query(this.root, range, out);
    return out;
  }

  private _split(node: QTNode<T>): void {
    const { x, y, width, height } = node.bounds;
    const hw = width / 2,
      hh = height / 2;
    node.children = [
      new QTNode<T>({ x, y, width: hw, height: hh }, node.level + 1),
      new QTNode<T>({ x: x + hw, y, width: hw, height: hh }, node.level + 1),
      new QTNode<T>({ x, y: y + hh, width: hw, height: hh }, node.level + 1),
      new QTNode<T>({ x: x + hw, y: y + hh, width: hw, height: hh }, node.level + 1),
    ];
  }

  private _getIndex(node: QTNode<T>, rect: Rect): number {
    if (!node.children) return -1;
    for (let i = 0; i < 4; i++) {
      if (contains(node.children[i]!.bounds, rect)) return i;
    }
    return -1;
  }

  private _insert(node: QTNode<T>, item: QTItem<T>): void {
    if (node.children) {
      const idx = this._getIndex(node, item);
      if (idx !== -1) {
        this._insert(node.children[idx]!, item);
        return;
      }
    }
    node.items.push(item);
    if (node.items.length > this.maxItems && node.level < this.maxDepth) {
      if (!node.children) this._split(node);
      // re-distribute
      for (let i = node.items.length - 1; i >= 0; i--) {
        const it = node.items[i]!;
        const idx = this._getIndex(node, it);
        if (idx !== -1) {
          node.items.splice(i, 1);
          this._insert(node.children![idx]!, it);
        }
      }
    }
  }

  private _query(node: QTNode<T>, range: Rect, out: QTItem<T>[]): void {
    if (!intersects(node.bounds, range)) return;
    for (const it of node.items) {
      if (intersects(it, range)) out.push(it);
    }
    if (node.children) {
      for (let i = 0; i < 4; i++) this._query(node.children[i]!, range, out);
    }
  }
}

export function buildQuadtreeFromNodes<
  T extends { position: { x: number; y: number }; size: { width: number; height: number } },
>(nodes: T[], opts: { maxItems?: number; maxDepth?: number; padding?: number } = {}): Quadtree<T> {
  if (nodes.length === 0) {
    return new Quadtree<T>({ x: 0, y: 0, width: 1, height: 1 }, { maxItems: opts.maxItems, maxDepth: opts.maxDepth });
  }
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of nodes) {
    const l = n.position.x,
      t = n.position.y,
      r = l + n.size.width,
      b = t + n.size.height;
    if (l < minX) minX = l;
    if (t < minY) minY = t;
    if (r > maxX) maxX = r;
    if (b > maxY) maxY = b;
  }
  const pad = opts.padding ?? 32;
  const bounds = {
    x: minX - pad,
    y: minY - pad,
    width: Math.max(1, maxX - minX + 2 * pad),
    height: Math.max(1, maxY - minY + 2 * pad),
  };
  const qt = new Quadtree<T>(bounds, { maxItems: opts.maxItems, maxDepth: opts.maxDepth });
  for (const n of nodes) {
    qt.insert({ x: n.position.x, y: n.position.y, width: n.size.width, height: n.size.height, data: n });
  }
  return qt;
}
