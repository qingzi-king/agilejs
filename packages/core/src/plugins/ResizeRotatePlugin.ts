/*
 * @Description: 尺寸调整和旋转插件
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-12-03 18:51:27
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { ICommand } from "../core/CommandHistory";
import { Graph, NodeData, Point } from "../model/Graph";
import { GroupTransformCommand } from "../commands/GraphCommands";
import { Plugin } from "./Plugin";
import { getDeviceDpr } from "../utils/dpr";

export interface ResizeRotatePluginOptions {
  /**
   * 控制点的大小（像素）
   * @default 8
   */
  handleSize?: number;
  /**
   * 控制点的颜色
   * @default "#2563eb" (蓝色)
   */
  handleColor?: string;
  /**
   * 旋转控制点的颜色
   * @default "#ef4444" (红色)
   */
  rotateHandleColor?: string;
  /**
   * 控制点的悬停颜色
   * @default "#3b82f6" (浅蓝色)
   */
  handleHoverColor?: string;
  /**
   * 是否启用角度调整
   * @default true
   */
  enableRotation?: boolean;
  /**
   * 是否启用尺寸调整
   * @default true
   */
  enableResize?: boolean;
  /**
   * 旋转控制点距离节点顶部的偏移量（像素）
   * @default 30
   */
  rotateHandleOffset?: number;
  /**
   * 句柄向外偏移（屏幕像素）。避免句柄视觉上“靠内”。
   * @default 1
   */
  outwardOffsetPx?: number;
  /**
   * 用于让“边中”句柄中心对齐到选择虚线框的内边距（屏幕像素）。
   * 应与 SelectionOverlayPlugin 的 padding 保持一致。
   * @default 2
   */
  selectionPaddingPx?: number;
  /**
   * 鼠标命中阈值（像素）。若未配置，默认等于 handleSize。
   */
  hitTargetPx?: number;
  /**
   * 触摸命中阈值（像素）。可为 'auto' 启用基于 DPR 的自适应，未配置则为 'auto'。
   */
  touchHitTargetPx?: number | "auto";
}

// 控制点类型
export enum HandleType {
  None = "none",
  TopLeft = "tl",
  TopCenter = "tc",
  TopRight = "tr",
  MiddleLeft = "ml",
  MiddleRight = "mr",
  BottomLeft = "bl",
  BottomCenter = "bc",
  BottomRight = "br",
  Rotate = "rotate",
}

// 定义尺寸调整操作的命令
export class PluginResizeNodeCommand implements ICommand {
  private oldWidth: number;
  private oldHeight: number;
  private oldPortOffsets: Map<string, Point> = new Map();

  constructor(
    private graph: Graph,
    private nodeId: string,
    private newWidth: number,
    private newHeight: number,
  ) {
    const node = graph.getNode(nodeId);
    if (node) {
      this.oldWidth = node.size.width;
      this.oldHeight = node.size.height;
      // 保存原始端口位置
      if (node.ports && node.ports.length > 0) {
        node.ports.forEach((port) => {
          this.oldPortOffsets.set(port.id, { ...port.offset });
        });
      }
    } else {
      this.oldWidth = 0;
      this.oldHeight = 0;
    }
  }

  do(): void {
    const node = this.graph.getNode(this.nodeId);
    if (!node) return;

    // 应用新尺寸
    this.graph.setNodeSize(this.nodeId, this.newWidth, this.newHeight);

    // 更新端口位置（按比例缩放）
    if (node.ports && node.ports.length > 0) {
      const widthRatio = this.newWidth / this.oldWidth;
      const heightRatio = this.newHeight / this.oldHeight;
      node.ports.forEach((port) => {
        const oldOffset = this.oldPortOffsets.get(port.id);
        if (oldOffset) {
          port.offset = { x: oldOffset.x * widthRatio, y: oldOffset.y * heightRatio };
        }
      });
    }
  }

  undo(): void {
    const node = this.graph.getNode(this.nodeId);
    if (!node) return;

    // 恢复原始尺寸
    this.graph.setNodeSize(this.nodeId, this.oldWidth, this.oldHeight);

    // 恢复原始端口位置
    if (node.ports && node.ports.length > 0) {
      node.ports.forEach((port) => {
        const oldOffset = this.oldPortOffsets.get(port.id);
        if (oldOffset) {
          port.offset = { ...oldOffset };
        }
      });
    }
  }
}

// 定义旋转操作的命令
export class RotateNodeCommand implements ICommand {
  private oldRotation: number;
  private oldPortOffsets: Map<string, Point> = new Map();

  constructor(
    private graph: Graph,
    private nodeId: string,
    private newRotation: number,
  ) {
    const node = graph.getNode(nodeId);
    if (node) {
      this.oldRotation = node.rotation ?? 0;
      // 保存原始端口位置
      if (node.ports && node.ports.length > 0) {
        node.ports.forEach((port) => {
          this.oldPortOffsets.set(port.id, { ...port.offset });
        });
      }
    } else {
      this.oldRotation = 0;
    }
  }

  do(): void {
    const node = this.graph.getNode(this.nodeId);
    if (!node) return;

    // 应用旋转
    node.rotation = this.newRotation;

    // 在端口需要根据旋转调整位置时，可以在这里添加相应逻辑
    this.updatePortsForRotation(node, this.oldRotation, this.newRotation);
  }

  undo(): void {
    const node = this.graph.getNode(this.nodeId);
    if (!node) return;

    // 恢复原始旋转
    node.rotation = this.oldRotation;

    // 恢复原始端口位置
    if (node.ports && node.ports.length > 0) {
      node.ports.forEach((port) => {
        const oldOffset = this.oldPortOffsets.get(port.id);
        if (oldOffset) {
          port.offset = { ...oldOffset };
        }
      });
    }
  }

  // 根据旋转角度更新端口位置（如有必要）
  private updatePortsForRotation(_node: NodeData, _oldRotation: number, _newRotation: number): void {
    // 回退：保持端口相对节点局部坐标不变，不在命令中修改端口
  }
}

export class ResizeRotatePlugin implements Plugin {
  readonly id = "resize-rotate";
  private engine!: CanvasEngine;
  private options: Required<ResizeRotatePluginOptions>;
  private activeHandle: HandleType = HandleType.None;
  private hoveredHandle: HandleType = HandleType.None;
  private activeNodeId: string | null = null;
  private startX = 0;
  private startY = 0;
  private startPosX = 0;
  private startPosY = 0;
  private startWidth = 0;
  private startHeight = 0;
  private startRotation = 0;
  private startMouseX = 0;
  private startMouseY = 0;
  private centerX = 0;
  private centerY = 0;
  private startPortPositions = new Map<string, { x: number; y: number }>();
  private startPortAbsOffsets = new Map<string, { x: number; y: number }>();
  // Shift 等比缩放：锁定主轴，避免在快速缩放时宽/高来回切换导致跳变
  private aspectLockAxis: "width" | "height" | null = null;

  constructor(options: ResizeRotatePluginOptions = {}) {
    this.options = {
      handleSize: options.handleSize ?? 8,
      handleColor: options.handleColor ?? "#2563eb",
      rotateHandleColor: options.rotateHandleColor ?? "#ef4444",
      handleHoverColor: options.handleHoverColor ?? "#3b82f6",
      enableRotation: options.enableRotation ?? true,
      enableResize: options.enableResize ?? true,
      rotateHandleOffset: options.rotateHandleOffset ?? 30,
      outwardOffsetPx: options.outwardOffsetPx ?? 1,
      selectionPaddingPx: options.selectionPaddingPx ?? 2,
      hitTargetPx: options.hitTargetPx ?? options.handleSize ?? 8,
      touchHitTargetPx: options.touchHitTargetPx ?? "auto",
    };
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    const c = engine.canvas;
    c.addEventListener("mousedown", this.onMouseDown, true); // 使用捕获阶段，优先处理
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
    // Touch 事件（移动端尺寸/旋转控制）
    c.addEventListener("touchstart", this.onTouchStart, { passive: false, capture: true });
    window.addEventListener("touchmove", this.onTouchMove, { passive: false });
    window.addEventListener("touchend", this.onTouchEnd);
    window.addEventListener("touchcancel", this.onTouchEnd);

    // 修改基础渲染器，应用旋转变换
    this.patchRenderers();
  }

  dispose(): void {
    const c = this.engine.canvas;
    c.removeEventListener("mousedown", this.onMouseDown, true); // 匹配捕获阶段
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
    c.removeEventListener("touchstart", this.onTouchStart, true as any);
    window.removeEventListener("touchmove", this.onTouchMove as any);
    window.removeEventListener("touchend", this.onTouchEnd as any);
    window.removeEventListener("touchcancel", this.onTouchEnd as any);
  }

  // 为基础渲染器添加旋转支持
  private patchRenderers(): void {
    const registry = this.engine.renderers;
    const WRAPPED = Symbol.for("agilejs.renderer.wrappedForRotation");

    for (const renderer of registry.all()) {
      const r = renderer as any;
      if (r[WRAPPED]) continue;
      const originalRenderNode = renderer.renderNode?.bind(renderer);
      if (!originalRenderNode) continue;
      r[WRAPPED] = true;
      r.renderNode = (ctx: CanvasRenderingContext2D, node: NodeData, graph: Graph) => {
        ctx.save();
        if (node.rotation) {
          const cx = node.position.x + node.size.width / 2;
          const cy = node.position.y + node.size.height / 2;
          ctx.translate(cx, cy);
          ctx.rotate((node.rotation * Math.PI) / 180);
          ctx.translate(-cx, -cy);
        }
        originalRenderNode(ctx, node, graph);
        ctx.restore();
      };
    }
  }

  private hitTestHandle(x: number, y: number, node: NodeData, minHitPx?: number): HandleType {
    if (!node.selected) return HandleType.None;

    const { handleSize, hitTargetPx } = this.options;
    const scale = this.engine.getScale();
    const s = Math.max(0.0001, scale);
    // 在世界坐标中的半尺寸；触摸可扩大命中框（例如 28px）
    const targetPx = Math.max(handleSize, minHitPx ?? handleSize);
    const halfHandle = targetPx / 2 / s;
    const outward = (this.options.outwardOffsetPx ?? 1) / s; // 世界单位下的通用外移距离（角点）
    const selPad = (this.options.selectionPaddingPx ?? 2) / s; // 世界单位下的选择 padding（边中）

    // 获取节点中心和四角坐标
    const { width, height } = node.size;
    const { x: nodeX, y: nodeY } = node.position;

    // 旋转后的坐标需要特殊处理
    const rotation = node.rotation ?? 0;
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const centerX = nodeX + width / 2;
    const centerY = nodeY + height / 2;

    // 将未旋转下的局部点转换到世界坐标（应用节点旋转）
    const toWorldPoint = (px: number, py: number) => {
      const dx = px - centerX;
      const dy = py - centerY;
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      return { x: rx + centerX, y: ry + centerY };
    };

    const interactionConfig = this.engine.getInteractionConfig();

    // 先检查旋转控制点（优先）
    if (this.options.enableRotation && interactionConfig.enableRotate && node.rotatable !== false) {
      const rLocalX = nodeX + width / 2;
      const rLocalY = nodeY - this.options.rotateHandleOffset / Math.max(0.0001, scale);
      const { x: rtx, y: rty } = toWorldPoint(rLocalX, rLocalY);
      if (x >= rtx - halfHandle && x <= rtx + halfHandle && y >= rty - halfHandle && y <= rty + halfHandle) {
        return HandleType.Rotate;
      }
    }

    // 检查点击是否在控制点范围内（考虑向外偏移后的中心）
    const outwardOffset = (t: HandleType): { dx: number; dy: number } => {
      // 角点：使用轻微外移；边中：使用选择框 padding 对齐到虚线框
      const hCorner = outward;
      const hSide = selPad;
      switch (t) {
        case HandleType.TopLeft:
          return { dx: -hCorner, dy: -hCorner };
        case HandleType.TopCenter:
          return { dx: 0, dy: -hSide };
        case HandleType.TopRight:
          return { dx: +hCorner, dy: -hCorner };
        case HandleType.MiddleLeft:
          return { dx: -hSide, dy: 0 };
        case HandleType.MiddleRight:
          return { dx: +hSide, dy: 0 };
        case HandleType.BottomLeft:
          return { dx: -hCorner, dy: +hCorner };
        case HandleType.BottomCenter:
          return { dx: 0, dy: +hSide };
        case HandleType.BottomRight:
          return { dx: +hCorner, dy: +hCorner };
        default:
          return { dx: 0, dy: 0 };
      }
    };
    const checkHandle = (hx: number, hy: number, t: HandleType): boolean => {
      const off = outwardOffset(t);
      const { x: tx, y: ty } = toWorldPoint(hx + off.dx, hy + off.dy);
      return x >= tx - halfHandle && x <= tx + halfHandle && y >= ty - halfHandle && y <= ty + halfHandle;
    };

    // 检查各个控制点
    if (this.options.enableResize && interactionConfig.enableResize && node.resizable !== false) {
      // 左上角
      if (checkHandle(nodeX, nodeY, HandleType.TopLeft)) {
        return HandleType.TopLeft;
      }

      // 上中
      if (checkHandle(nodeX + width / 2, nodeY, HandleType.TopCenter)) {
        return HandleType.TopCenter;
      }

      // 右上角
      if (checkHandle(nodeX + width, nodeY, HandleType.TopRight)) {
        return HandleType.TopRight;
      }

      // 左中
      if (checkHandle(nodeX, nodeY + height / 2, HandleType.MiddleLeft)) {
        return HandleType.MiddleLeft;
      }

      // 右中
      if (checkHandle(nodeX + width, nodeY + height / 2, HandleType.MiddleRight)) {
        return HandleType.MiddleRight;
      }

      // 左下角
      if (checkHandle(nodeX, nodeY + height, HandleType.BottomLeft)) {
        return HandleType.BottomLeft;
      }

      // 下中
      if (checkHandle(nodeX + width / 2, nodeY + height, HandleType.BottomCenter)) {
        return HandleType.BottomCenter;
      }

      // 右下角
      if (checkHandle(nodeX + width, nodeY + height, HandleType.BottomRight)) {
        return HandleType.BottomRight;
      }
    }

    return HandleType.None;
  }

  private onMouseDown = (e: MouseEvent) => {
    // 检查引擎是否允许拖拽（调整大小和旋转属于拖拽操作）
    const interactionConfig = this.engine.getInteractionConfig();
    if (!interactionConfig.enableDrag) return;

    // 多选场景下由 GroupResizeRotatePlugin 接管，单节点插件不处理
    const selCount = this.engine.graph.getNodes().filter((n) => n.selected).length;
    if (selCount >= 2) return;

    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);

    // 先检查是否点击在控制点上
    const nodes = this.engine.graph.getNodes();
    for (const node of nodes) {
      if (node.selected) {
        // 直线（line）不使用通用的尺寸/旋转句柄，由 PolylineNodeEditPlugin 负责端点/拐点编辑
        if (node.shape === "line") continue;
        const handleType = this.hitTestHandle(world.x, world.y, node);

        if (handleType !== HandleType.None) {
          this.activeHandle = handleType;
          this.activeNodeId = node.id;
          this.startX = world.x;
          this.startY = world.y;
          this.startWidth = node.size.width;
          this.startHeight = node.size.height;
          this.startRotation = node.rotation ?? 0;
          this.startPosX = node.position.x;
          this.startPosY = node.position.y;
          this.aspectLockAxis = null; // 新一次拖动开始时重置

          // 记录中心点
          this.centerX = node.position.x + node.size.width / 2;
          this.centerY = node.position.y + node.size.height / 2;

          // 记录原始端口位置（用于调整期间计算新位置）
          if (node.ports && node.ports.length > 0) {
            this.startPortPositions = new Map();
            this.startPortAbsOffsets = new Map();
            node.ports.forEach((port) => {
              // 存储原始端口偏移量
              this.startPortPositions.set(port.id, {
                x: port.offset.x / node.size.width, // 相对宽度的比例
                y: port.offset.y / node.size.height, // 相对高度的比例
              });
              this.startPortAbsOffsets.set(port.id, { x: port.offset.x, y: port.offset.y });
            });
          }

          // 阻止事件传播，防止触发其他插件
          e.stopPropagation();
          e.preventDefault();
          // 通知引擎开始 resize（用于降质渲染优化）
          this.engine.setResizingNodes(true);
          // 事件：开始（旋转/缩放）
          if (this.activeHandle === HandleType.Rotate) {
            this.engine.events.emit("node:rotate-start", {
              nodeId: this.activeNodeId,
              center: { x: this.centerX, y: this.centerY },
              startRotation: this.startRotation,
              screen,
              world,
            });
          } else {
            this.engine.events.emit("node:resize-start", {
              nodeId: this.activeNodeId,
              handle: this.activeHandle,
              start: {
                position: { x: this.startPosX, y: this.startPosY },
                size: { width: this.startWidth, height: this.startHeight },
                rotation: this.startRotation,
              },
              screen,
              world,
            });
          }
          this.updateCursor(true);
          return;
        }
      }
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this.engine.toWorld(screen);

    // 处理控制点悬停
    if (this.activeHandle === HandleType.None) {
      const nodes = this.engine.graph.getNodes();
      let found = false;

      for (const node of nodes) {
        if (node.selected) {
          // 跳过直线：不提供通用句柄的悬停态
          if (node.shape === "line") continue;
          const handleType = this.hitTestHandle(world.x, world.y, node);

          if (handleType !== HandleType.None) {
            this.hoveredHandle = handleType;
            found = true;
            break;
          }
        }
      }

      if (!found && this.hoveredHandle !== HandleType.None) {
        this.hoveredHandle = HandleType.None;
      }
      // 更新鼠标样式（仅在未拖动时）
      this.updateCursor();
    }

    // 处理拖动调整
    if (this.activeHandle !== HandleType.None && this.activeNodeId) {
      const node = this.engine.graph.getNode(this.activeNodeId);
      if (!node) return;

      // 将鼠标移动增量转换到节点局部坐标系（考虑旋转）
      const dxw = world.x - this.startX;
      const dyw = world.y - this.startY;
      const rad = (this.startRotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = dxw * cos + dyw * sin; // 局部x
      const dy = -dxw * sin + dyw * cos; // 局部y

      // 处理旋转
      if (this.activeHandle === HandleType.Rotate) {
        const startAngle = Math.atan2(this.startY - this.centerY, this.startX - this.centerX);
        const currentAngle = Math.atan2(world.y - this.centerY, world.x - this.centerX);
        // 预览阶段角度步长=1°（Shift 则 15°）
        let deltaDeg = ((currentAngle - startAngle) * 180) / Math.PI;
        if (e.shiftKey) deltaDeg = Math.round(deltaDeg / 15) * 15;
        else deltaDeg = Math.round(deltaDeg);
        const rotation = this.startRotation + deltaDeg;

        // 应用旋转（不修改端口偏移，端口世界坐标通过 getPortWorldPosition 考虑旋转）
        node.rotation = rotation;
        // 在旋转过程中，通常不需要调整端口的相对位置
        // 但如果需要对端口应用特殊处理，可以在这里添加代码
        this.engine.canvas.style.cursor = "grabbing";
        // 事件：旋转进行中
        this.engine.events.emit("node:rotate-move", {
          nodeId: this.activeNodeId,
          rotation,
          deltaDeg,
          center: { x: this.centerX, y: this.centerY },
          screen,
          world,
        });
      } else if (this.options.enableResize) {
        // 处理调整大小
        let newWidth = this.startWidth;
        let newHeight = this.startHeight;
        let newX = node.position.x;
        let newY = node.position.y;

        const minSize = 5; // 最小尺寸

        // 根据不同控制点调整尺寸
        switch (this.activeHandle) {
          case HandleType.TopLeft:
            newWidth = this.startWidth - dx;
            newHeight = this.startHeight - dy;
            break;
          case HandleType.TopCenter:
            newHeight = this.startHeight - dy;
            break;
          case HandleType.TopRight:
            newWidth = this.startWidth + dx;
            newHeight = this.startHeight - dy;
            break;
          case HandleType.MiddleLeft:
            newWidth = this.startWidth - dx;
            break;
          case HandleType.MiddleRight:
            newWidth = this.startWidth + dx;
            break;
          case HandleType.BottomLeft:
            newWidth = this.startWidth - dx;
            newHeight = this.startHeight + dy;
            break;
          case HandleType.BottomCenter:
            newHeight = this.startHeight + dy;
            break;
          case HandleType.BottomRight:
            newWidth = this.startWidth + dx;
            newHeight = this.startHeight + dy;
            break;
        }

        // Shift 等比：仅对四角控制点生效；引入主轴锁定避免跳变
        const isCornerHandle =
          this.activeHandle === HandleType.TopLeft ||
          this.activeHandle === HandleType.TopRight ||
          this.activeHandle === HandleType.BottomLeft ||
          this.activeHandle === HandleType.BottomRight;

        if (e.shiftKey && isCornerHandle) {
          const ratio = this.startWidth / this.startHeight;
          // 首次锁定：根据当前局部位移选择主轴
          if (!this.aspectLockAxis) {
            this.aspectLockAxis =
              Math.abs(newWidth - this.startWidth) >= Math.abs(newHeight - this.startHeight) ? "width" : "height";
          }
          // 依据锁定主轴计算等比尺寸（先不处理最小尺寸）
          if (this.aspectLockAxis === "width") {
            newHeight = newWidth / ratio;
          } else {
            newWidth = newHeight * ratio;
          }
          // 统一最小尺寸：按比例缩放，保持 ratio
          const sW = newWidth / this.startWidth;
          const sH = newHeight / this.startHeight;
          // 由于等比，sW 与 sH 应接近；选其平均/或锁定轴对应值
          let s = this.aspectLockAxis === "width" ? sW : sH;
          const sMin = Math.max(minSize / this.startWidth, minSize / this.startHeight);
          if (s < sMin) s = sMin;
          newWidth = this.startWidth * s;
          newHeight = this.startHeight * s;
        } else {
          // 非等比：分别对宽高应用最小尺寸
          newWidth = Math.max(minSize, newWidth);
          newHeight = Math.max(minSize, newHeight);
        }

        // 预览阶段：将宽高量化为整数步长 1，然后基于量化后的尺寸计算后续位移/坐标
        const qWidth = Math.max(minSize, Math.round(newWidth));
        const qHeight = Math.max(minSize, Math.round(newHeight));

        // 根据最终尺寸与起始尺寸，计算“中心点的局部位移”，以保证未被拖动的对侧边/角作为锚点保持不动
        // 思路：在节点局部坐标中，若拖右边（或右下角等），中心向 +ΔW/2 移动；拖左边则向 -ΔW/2；同理纵向按 ±ΔH/2。
        const affectsLeft =
          this.activeHandle === HandleType.TopLeft ||
          this.activeHandle === HandleType.MiddleLeft ||
          this.activeHandle === HandleType.BottomLeft;
        const affectsRight =
          this.activeHandle === HandleType.TopRight ||
          this.activeHandle === HandleType.MiddleRight ||
          this.activeHandle === HandleType.BottomRight;
        const affectsTop =
          this.activeHandle === HandleType.TopLeft ||
          this.activeHandle === HandleType.TopCenter ||
          this.activeHandle === HandleType.TopRight;
        const affectsBottom =
          this.activeHandle === HandleType.BottomLeft ||
          this.activeHandle === HandleType.BottomCenter ||
          this.activeHandle === HandleType.BottomRight;

        const dW = qWidth - this.startWidth;
        const dH = qHeight - this.startHeight;

        // 局部坐标中的中心位移（以起始中心为参考）
        let shiftLocalX = 0;
        let shiftLocalY = 0;
        if (affectsRight) shiftLocalX = +dW / 2;
        else if (affectsLeft) shiftLocalX = -dW / 2;
        if (affectsBottom) shiftLocalY = +dH / 2;
        else if (affectsTop) shiftLocalY = -dH / 2;

        // 将局部位移旋转回世界坐标
        const rad2 = (this.startRotation * Math.PI) / 180;
        const cos2 = Math.cos(rad2);
        const sin2 = Math.sin(rad2);
        const shiftWorldX = shiftLocalX * cos2 - shiftLocalY * sin2;
        const shiftWorldY = shiftLocalX * sin2 + shiftLocalY * cos2;

        // 以“起始中心”为基准计算新中心（避免累计误差）
        const startCenterX = this.startPosX + this.startWidth / 2;
        const startCenterY = this.startPosY + this.startHeight / 2;
        const newCenterX = startCenterX + shiftWorldX;
        const newCenterY = startCenterY + shiftWorldY;
        newX = newCenterX - qWidth / 2;
        newY = newCenterY - qHeight / 2;

        // 获取原始尺寸和新尺寸的比例，用于更新端口位置
        const widthRatio = qWidth / this.startWidth;
        const heightRatio = qHeight / this.startHeight;

        // 应用新尺寸和位置
        node.position = { x: newX, y: newY };
        node.size = { width: qWidth, height: qHeight };

        // 更新端口位置（稳定策略：始终按起始相对比例线性缩放）
        if (node.ports && node.ports.length > 0) {
          node.ports.forEach((port) => {
            const rel = this.startPortPositions.get(port.id);
            if (!rel) return;
            port.offset = { x: rel.x * newWidth, y: rel.y * newHeight };
          });
        }

        // 更新中心点位置（用于旋转手柄与后续计算）
        this.centerX = newCenterX;
        this.centerY = newCenterY;
        // 事件：缩放进行中
        this.engine.events.emit("node:resize-move", {
          nodeId: this.activeNodeId,
          handle: this.activeHandle,
          position: { x: node.position.x, y: node.position.y },
          size: { width: node.size.width, height: node.size.height },
          rotation: node.rotation ?? 0,
          screen,
          world,
        });
      }
      // 正在拖动时的鼠标样式
      this.updateCursor(true);
    }
  };

  private updateCursor(dragging = false) {
    const c = this.engine.canvas;
    const h = this.activeHandle !== HandleType.None ? this.activeHandle : this.hoveredHandle;
    if (h === HandleType.Rotate) {
      c.style.cursor = dragging ? "grabbing" : "grab";
      return;
    }
    if (h === HandleType.None) {
      c.style.cursor = "default";
      return;
    }
    const rot = this.getCurrentNodeRotation();
    c.style.cursor = this.getCursorForHandle(h, rot);
  }

  private getCurrentNodeRotation(): number {
    if (this.activeNodeId) {
      const n = this.engine.graph.getNode(this.activeNodeId);
      if (n) return n.rotation ?? 0;
    }
    const sel = this.engine.graph.getNodes().find((n) => n.selected);
    return sel?.rotation ?? 0;
  }

  private getCursorForHandle(handle: HandleType, rotation: number): string {
    const norm180 = (deg: number) => {
      let a = deg % 180;
      if (a < 0) a += 180;
      return a;
    };
    const nearAxis = (deg: number) => {
      const a = norm180(deg);
      // 与 0/180 更接近 => ns，否则 ew
      return a < 45 || a >= 135 ? "ns-resize" : "ew-resize";
    };
    const diagType = (deg: number) => {
      const a = norm180(deg);
      // 0..90 使用 nwse，90..180 使用 nesw（每 90° 翻转一次）
      return a < 90 ? "nwse-resize" : "nesw-resize";
    };

    switch (handle) {
      // 顶/底：轴为本地 Y 轴 => 角度 = rotation
      case HandleType.TopCenter:
      case HandleType.BottomCenter:
        return nearAxis(rotation);
      // 左/右：轴为本地 X 轴 => 角度 = rotation + 90
      case HandleType.MiddleLeft:
      case HandleType.MiddleRight:
        return nearAxis(rotation + 90);
      // 左上/右下：对角线为本地 45° => 角度 = rotation + 45
      case HandleType.TopLeft:
      case HandleType.BottomRight:
        return diagType(rotation + 45);
      // 右上/左下：对角线为本地 -45° => 角度 = rotation - 45
      case HandleType.TopRight:
      case HandleType.BottomLeft:
        return diagType(rotation - 45);
      default:
        return "default";
    }
  }

  private onMouseUp = () => {
    if (this.activeHandle !== HandleType.None && this.activeNodeId) {
      const node = this.engine.graph.getNode(this.activeNodeId);
      if (node) {
        // 是否为缩放操作（非旋转把手）
        const isResizeOp = this.activeHandle !== HandleType.Rotate;
        const angle = node.rotation ?? 0;
        const angNorm = ((angle % 360) + 360) % 360; // [0,360)
        const distToAxis = Math.min(
          Math.abs(angNorm - 0),
          Math.abs(angNorm - 90),
          Math.abs(angNorm - 180),
          Math.abs(angNorm - 270),
        );
        const isAxisAligned = distToAxis < 1e-6; // 近似与轴对齐
        // 使用 GroupTransformCommand 统一提交（即便单节点），确保 prev/next 捕获完整的几何与端口信息
        const prev = {
          position: { x: this.startPosX, y: this.startPosY },
          size: { width: this.startWidth, height: this.startHeight },
          rotation: this.startRotation,
          ports: (() => {
            const map: Record<string, { x: number; y: number }> = {};
            for (const [id, off] of this.startPortAbsOffsets.entries()) map[id] = { x: off.x, y: off.y };
            return map;
          })(),
        };
        const nextRaw = {
          position: { x: node.position.x, y: node.position.y },
          size: { width: node.size.width, height: node.size.height },
          rotation: node.rotation ?? 0,
          ports: node.ports?.reduce(
            (acc, p) => {
              acc[p.id] = { x: p.offset.x, y: p.offset.y };
              return acc;
            },
            {} as Record<string, { x: number; y: number }>,
          ),
        };
        // 提交时取整：
        // - 尺寸与角度：统一整数（宽高≥1）
        // - 坐标：若为缩放且处于非 90° 对齐旋转，保持预览浮点，避免松手跳动；其余场景取整
        const posX = isResizeOp && !isAxisAligned ? nextRaw.position.x : Math.round(nextRaw.position.x);
        const posY = isResizeOp && !isAxisAligned ? nextRaw.position.y : Math.round(nextRaw.position.y);
        const next = {
          position: { x: posX, y: posY },
          size: {
            width: Math.max(1, Math.round(nextRaw.size.width)),
            height: Math.max(1, Math.round(nextRaw.size.height)),
          },
          rotation: Math.round(nextRaw.rotation ?? 0),
          ports: nextRaw.ports
            ? (Object.fromEntries(
                Object.entries(nextRaw.ports).map(([id, p]) => [
                  id,
                  { x: Math.round((p as any).x), y: Math.round((p as any).y) },
                ]),
              ) as Record<string, { x: number; y: number }>)
            : undefined,
        } as typeof nextRaw;
        const noMove =
          Math.abs(next.position.x - prev.position.x) < 0.01 && Math.abs(next.position.y - prev.position.y) < 0.01;
        const noSize =
          Math.abs(next.size.width - prev.size.width) < 0.01 && Math.abs(next.size.height - prev.size.height) < 0.01;
        const noRot = Math.abs((next.rotation ?? 0) - (prev.rotation ?? 0)) < 0.01;
        if (!(noMove && noSize && noRot)) {
          this.engine.history.execute(new GroupTransformCommand(this.engine.graph, [{ id: node.id, prev, next }]));
        }
        // 事件：结束（旋转/缩放）
        if (this.activeHandle === HandleType.Rotate) {
          this.engine.events.emit("node:rotate-end", {
            nodeId: this.activeNodeId,
            prev,
            next,
          });
        } else {
          this.engine.events.emit("node:resize-end", {
            nodeId: this.activeNodeId,
            handle: this.activeHandle,
            prev,
            next,
          });
        }
      }
    }

    // 通知引擎结束 resize（无论是否有实际操作，都应重置状态）
    this.engine.setResizingNodes(false);
    this.activeHandle = HandleType.None;
    this.activeNodeId = null;
    this.aspectLockAxis = null;
    this.hoveredHandle = HandleType.None;
    this.engine.canvas.style.cursor = "default";
  };

  // ===== Touch 支持 =====
  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    // 检查交互配置（与 mouse 保持一致）
    const interactionConfig = this.engine.getInteractionConfig();
    if (!interactionConfig.enableDrag) return;
    // 多选场景由 GroupResizeRotatePlugin 接管
    const selCount = this.engine.graph.getNodes().filter((n) => n.selected).length;
    if (selCount >= 2) return;
    const touch = e.touches[0];
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    const nodes = this.engine.graph.getNodes();
    for (const node of nodes) {
      if (node.selected) {
        if (node.shape === "line") continue;
        const handleType = this.hitTestHandle(world.x, world.y, node, 28);
        if (handleType !== HandleType.None) {
          this.activeHandle = handleType;
          this.activeNodeId = node.id;
          this.startX = world.x;
          this.startY = world.y;
          this.startWidth = node.size.width;
          this.startHeight = node.size.height;
          this.startRotation = node.rotation ?? 0;
          this.startPosX = node.position.x;
          this.startPosY = node.position.y;
          this.aspectLockAxis = null;
          this.centerX = node.position.x + node.size.width / 2;
          this.centerY = node.position.y + node.size.height / 2;
          if (node.ports && node.ports.length > 0) {
            this.startPortPositions = new Map();
            this.startPortAbsOffsets = new Map();
            node.ports.forEach((port) => {
              this.startPortPositions.set(port.id, {
                x: port.offset.x / node.size.width,
                y: port.offset.y / node.size.height,
              });
              this.startPortAbsOffsets.set(port.id, { x: port.offset.x, y: port.offset.y });
            });
          }
          e.stopPropagation();
          e.preventDefault();
          // 通知引擎开始 resize（用于降质渲染优化）
          this.engine.setResizingNodes(true);
          if (this.activeHandle === HandleType.Rotate) {
            this.engine.events.emit("node:rotate-start", {
              nodeId: this.activeNodeId,
              center: { x: this.centerX, y: this.centerY },
              startRotation: this.startRotation,
              screen,
              world,
            });
          } else {
            this.engine.events.emit("node:resize-start", {
              nodeId: this.activeNodeId,
              handle: this.activeHandle,
              start: {
                position: { x: this.startPosX, y: this.startPosY },
                size: { width: this.startWidth, height: this.startHeight },
                rotation: this.startRotation,
              },
              screen,
              world,
            });
          }
          this.updateCursor(true);
          return;
        }
      }
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = this.engine.canvas.getBoundingClientRect();
    const screen = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    const world = this.engine.toWorld(screen);
    // 悬停逻辑：移动端不显示 hover 状态，直接跳过
    if (this.activeHandle === HandleType.None) return;
    if (this.activeNodeId) {
      const node = this.engine.graph.getNode(this.activeNodeId);
      if (!node) return;
      const dxw = world.x - this.startX;
      const dyw = world.y - this.startY;
      const rad = (this.startRotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = dxw * cos + dyw * sin;
      const dy = -dxw * sin + dyw * cos;
      if (this.activeHandle === HandleType.Rotate) {
        const startAngle = Math.atan2(this.startY - this.centerY, this.startX - this.centerX);
        const currentAngle = Math.atan2(world.y - this.centerY, world.x - this.centerX);
        let deltaDeg = ((currentAngle - startAngle) * 180) / Math.PI;
        deltaDeg = Math.round(deltaDeg); // 移动端不支持 Shift 精细控制
        const rotation = this.startRotation + deltaDeg;
        node.rotation = rotation;
        this.engine.events.emit("node:rotate-move", {
          nodeId: this.activeNodeId,
          rotation,
          deltaDeg,
          center: { x: this.centerX, y: this.centerY },
          screen,
          world,
        });
      } else if (this.options.enableResize) {
        let newWidth = this.startWidth;
        let newHeight = this.startHeight;
        let newX = node.position.x;
        let newY = node.position.y;
        const minSize = 5;
        switch (this.activeHandle) {
          case HandleType.TopLeft:
            newWidth = this.startWidth - dx;
            newHeight = this.startHeight - dy;
            break;
          case HandleType.TopCenter:
            newHeight = this.startHeight - dy;
            break;
          case HandleType.TopRight:
            newWidth = this.startWidth + dx;
            newHeight = this.startHeight - dy;
            break;
          case HandleType.MiddleLeft:
            newWidth = this.startWidth - dx;
            break;
          case HandleType.MiddleRight:
            newWidth = this.startWidth + dx;
            break;
          case HandleType.BottomLeft:
            newWidth = this.startWidth - dx;
            newHeight = this.startHeight + dy;
            break;
          case HandleType.BottomCenter:
            newHeight = this.startHeight + dy;
            break;
          case HandleType.BottomRight:
            newWidth = this.startWidth + dx;
            newHeight = this.startHeight + dy;
            break;
        }
        // 量化与最小尺寸
        newWidth = Math.max(minSize, newWidth);
        newHeight = Math.max(minSize, newHeight);
        const qWidth = Math.round(newWidth);
        const qHeight = Math.round(newHeight);
        const affectsLeft =
          this.activeHandle === HandleType.TopLeft ||
          this.activeHandle === HandleType.MiddleLeft ||
          this.activeHandle === HandleType.BottomLeft;
        const affectsRight =
          this.activeHandle === HandleType.TopRight ||
          this.activeHandle === HandleType.MiddleRight ||
          this.activeHandle === HandleType.BottomRight;
        const affectsTop =
          this.activeHandle === HandleType.TopLeft ||
          this.activeHandle === HandleType.TopCenter ||
          this.activeHandle === HandleType.TopRight;
        const affectsBottom =
          this.activeHandle === HandleType.BottomLeft ||
          this.activeHandle === HandleType.BottomCenter ||
          this.activeHandle === HandleType.BottomRight;
        const dW = qWidth - this.startWidth;
        const dH = qHeight - this.startHeight;
        let shiftLocalX = 0,
          shiftLocalY = 0;
        if (affectsRight) shiftLocalX = +dW / 2;
        else if (affectsLeft) shiftLocalX = -dW / 2;
        if (affectsBottom) shiftLocalY = +dH / 2;
        else if (affectsTop) shiftLocalY = -dH / 2;
        const rad2 = (this.startRotation * Math.PI) / 180;
        const cos2 = Math.cos(rad2);
        const sin2 = Math.sin(rad2);
        const shiftWorldX = shiftLocalX * cos2 - shiftLocalY * sin2;
        const shiftWorldY = shiftLocalX * sin2 + shiftLocalY * cos2;
        const startCenterX = this.startPosX + this.startWidth / 2;
        const startCenterY = this.startPosY + this.startHeight / 2;
        const newCenterX = startCenterX + shiftWorldX;
        const newCenterY = startCenterY + shiftWorldY;
        newX = newCenterX - qWidth / 2;
        newY = newCenterY - qHeight / 2;
        node.position = { x: newX, y: newY };
        node.size = { width: qWidth, height: qHeight };
        if (node.ports && node.ports.length > 0) {
          node.ports.forEach((port) => {
            const rel = this.startPortPositions.get(port.id);
            if (!rel) return;
            port.offset = { x: rel.x * newWidth, y: rel.y * newHeight };
          });
        }
        this.centerX = newCenterX;
        this.centerY = newCenterY;
        this.engine.events.emit("node:resize-move", {
          nodeId: this.activeNodeId,
          handle: this.activeHandle,
          position: { x: node.position.x, y: node.position.y },
          size: { width: node.size.width, height: node.size.height },
          rotation: node.rotation ?? 0,
          screen,
          world,
        });
      }
      this.updateCursor(true);
      // 使用 'style' 模式避免触发边快照重建和四叉树重建（resize 预览期间的性能优化）
      if (this.engine.graph) this.engine.graph.markDirty("style");
    }
    e.preventDefault();
  };

  private onTouchEnd = (_e: TouchEvent) => {
    // 复用 mouseUp 逻辑
    this.onMouseUp();
  };

  private resolveHitPx(isTouch: boolean): number {
    if (isTouch) {
      const t = this.options.touchHitTargetPx;
      if (t === "auto" || t == null) {
        // 复用引擎对原生 DPR 的获取逻辑（避免重复、保持一致）
        const dpr = getDeviceDpr();
        const factor = Math.min(Math.max(dpr, 1), 2);
        return Math.round(28 * factor);
      }
      return t as number;
    }
    return this.options.hitTargetPx ?? this.options.handleSize;
  }

  afterRender(ctx: CanvasRenderingContext2D): void {
    const nodes = this.engine.graph.getNodes();
    const selCount = nodes.filter((n) => n.selected).length;

    ctx.save();

    // 应用画布变换
    const { x: translateX, y: translateY } = this.engine.getTranslation();
    const scale = this.engine.getScale();
    ctx.translate(translateX, translateY);
    ctx.scale(scale, scale);

    // 多选时由 GroupResizeRotatePlugin 统一绘制与处理，单节点插件不画手柄
    if (selCount < 2) {
      for (const node of nodes) {
        if (!node.selected) continue;
        // 直线（line）不绘制尺寸/旋转控制点
        if (node.shape === "line") continue;
        this.drawHandles(ctx, node);
      }
    }

    ctx.restore();
  }

  private drawHandles(ctx: CanvasRenderingContext2D, node: NodeData): void {
    const { handleSize, handleColor, rotateHandleColor, handleHoverColor } = this.options;
    const scale = this.engine.getScale();
    // 在屏幕像素恒定尺寸，世界坐标下尺寸应除以 scale
    const s = Math.max(0.0001, scale);
    const hsWorld = handleSize / s;
    const halfHandle = hsWorld / 2;
    const outward = (this.options.outwardOffsetPx ?? 1) / s;
    const selPad = (this.options.selectionPaddingPx ?? 2) / s;

    // 获取节点位置和尺寸
    const { x, y } = node.position;
    const { width, height } = node.size;

    // 节点中心点
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // 获取旋转角度
    const rotation = node.rotation ?? 0;
    const rad = (rotation * Math.PI) / 180;

    // 保存当前状态
    ctx.save();

    // 移动到节点中心
    ctx.translate(centerX, centerY);
    // 应用旋转
    ctx.rotate(rad);
    // 移回原点
    ctx.translate(-centerX, -centerY);

    const interactionConfig = this.engine.getInteractionConfig();

    // 绘制调整大小的控制点
    if (this.options.enableResize && interactionConfig.enableResize && node.resizable !== false) {
      // 控制点位置数组
      const handlePositions = [
        { x, y, type: HandleType.TopLeft },
        { x: x + width / 2, y, type: HandleType.TopCenter },
        { x: x + width, y, type: HandleType.TopRight },
        { x, y: y + height / 2, type: HandleType.MiddleLeft },
        { x: x + width, y: y + height / 2, type: HandleType.MiddleRight },
        { x, y: y + height, type: HandleType.BottomLeft },
        { x: x + width / 2, y: y + height, type: HandleType.BottomCenter },
        { x: x + width, y: y + height, type: HandleType.BottomRight },
      ];

      // 向外偏移映射
      const outwardOffset = (t: HandleType): { dx: number; dy: number } => {
        const hCorner = outward;
        const hSide = selPad;
        switch (t) {
          case HandleType.TopLeft:
            return { dx: -hCorner, dy: -hCorner };
          case HandleType.TopCenter:
            return { dx: 0, dy: -hSide };
          case HandleType.TopRight:
            return { dx: +hCorner, dy: -hCorner };
          case HandleType.MiddleLeft:
            return { dx: -hSide, dy: 0 };
          case HandleType.MiddleRight:
            return { dx: +hSide, dy: 0 };
          case HandleType.BottomLeft:
            return { dx: -hCorner, dy: +hCorner };
          case HandleType.BottomCenter:
            return { dx: 0, dy: +hSide };
          case HandleType.BottomRight:
            return { dx: +hCorner, dy: +hCorner };
          default:
            return { dx: 0, dy: 0 };
        }
      };

      // 绘制每个控制点
      for (const pos of handlePositions) {
        const off = outwardOffset(pos.type);
        const isHovered = this.hoveredHandle === pos.type || this.activeHandle === pos.type;
        ctx.fillStyle = isHovered ? handleHoverColor : handleColor;
        ctx.fillRect(pos.x + off.dx - halfHandle, pos.y + off.dy - halfHandle, hsWorld, hsWorld);
      }
    }

    // 绘制旋转控制点
    if (this.options.enableRotation && interactionConfig.enableRotate && node.rotatable !== false) {
      const rotateX = x + width / 2;
      const rotateY = y - this.options.rotateHandleOffset / Math.max(0.0001, scale);

      // 绘制旋转控制点
      const isRotateHovered = this.hoveredHandle === HandleType.Rotate || this.activeHandle === HandleType.Rotate;
      ctx.fillStyle = isRotateHovered ? handleHoverColor : rotateHandleColor;
      ctx.beginPath();
      ctx.arc(rotateX, rotateY, halfHandle, 0, Math.PI * 2);
      ctx.fill();

      // 绘制连接线
      ctx.beginPath();
      ctx.moveTo(rotateX, y);
      ctx.lineTo(rotateX, rotateY);
      ctx.strokeStyle = rotateHandleColor;
      ctx.lineWidth = 1 / Math.max(0.0001, scale);
      ctx.stroke();
    }

    ctx.restore();
  }
}
