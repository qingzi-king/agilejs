/*
 * @Description: 剪贴板插件
 * @Author: qingzi.wang
 * @Date: 2025-09-16 18:25:05
 * @LastEditTime: 2025-11-22 22:42:57
 */
import type { CanvasEngine } from "../core/CanvasEngine";
import { Plugin } from "./Plugin";
import { toJSON, fromJSON } from "../model/Serialize";
import { AddNodeCommand, AddEdgeCommand } from "../commands/GraphCommands";

/**
 * 图片粘贴配置接口
 */
export interface ImagePasteConfig {
  /** 图片最大宽度（像素） */
  maxWidth?: number;
  /** 图片最大高度（像素） */
  maxHeight?: number;
  /** 图片最大文件大小（字节） */
  maxSize?: number;
  /** 压缩质量 (0-1) */
  quality?: number;
  /** 默认节点尺寸 */
  defaultSize?: { width: number; height: number };
  /**
   * 严格大小限制：开启后，若最终图片仍超过 maxSize，则拒绝粘贴
   * @default false
   */
  strictMaxSize?: boolean;
  /**
   * 优先使用 WebP 编码；不支持或失败时回退 JPEG
   * @default false（为兼容旧逻辑，默认关闭）
   */
  preferWebP?: boolean;
  /**
   * 压缩时的最低质量阈值（0-1），用于 while 逐步降低质量
   * @default 0.5
   */
  minQuality?: number;
  /**
   * 质量递减步长
   * @default 0.1
   */
  qualityStep?: number;
}

/**
 * 默认图片粘贴配置
 */
const DEFAULT_IMAGE_CONFIG: Required<ImagePasteConfig> = {
  maxWidth: 800,
  maxHeight: 800,
  maxSize: 1024 * 1024, // 1MB
  quality: 0.85,
  defaultSize: { width: 200, height: 150 },
  strictMaxSize: false,
  preferWebP: false,
  minQuality: 0.5,
  qualityStep: 0.1,
};

export class ClipboardPlugin implements Plugin {
  readonly id = "clipboard";
  private engine!: CanvasEngine;
  private nodeMemory: any | null = null; // 存储复制的节点
  private imageConfig: Required<ImagePasteConfig>;
  // 仅当画布被"聚焦/激活"时才响应复制/粘贴（避免属性面板等输入框触发画布粘贴）
  private canvasActive = false;
  private offList: Array<() => void> = [];
  // 标记是否刚刚通过快捷键粘贴了节点，用于避免 paste 事件重复处理
  private justPastedNode = false;

  constructor(config?: ImagePasteConfig) {
    this.imageConfig = { ...DEFAULT_IMAGE_CONFIG, ...config };
  }

  setup(engine: CanvasEngine): void {
    this.engine = engine;
    // 键盘事件：全局监听，但只在 canvasActive 且非输入场景下生效
    window.addEventListener("keydown", this.onKeyDown, true);
    // 粘贴事件：监听剪贴板粘贴（支持图片）
    window.addEventListener("paste", this.onPaste, true);
    // 指针按下：基于事件路径判断是否点击在画布内，从而更新 canvasActive
    const onDocPointerDown = (ev: Event) => {
      const path = (ev.composedPath && ev.composedPath()) || [];
      this.canvasActive = path.includes(this.engine.canvas);
    };
    const onCanvasPointerDown = () => {
      this.canvasActive = true;
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    this.engine.canvas.addEventListener("pointerdown", onCanvasPointerDown, true);
    this.offList.push(() => document.removeEventListener("pointerdown", onDocPointerDown, true));
    this.offList.push(() => this.engine.canvas.removeEventListener("pointerdown", onCanvasPointerDown, true));
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown, true);
    window.removeEventListener("paste", this.onPaste, true);
    if (this.offList.length) {
      for (const off of this.offList) {
        try {
          off();
        } catch {
          /* ignore */
        }
      }
      this.offList = [];
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    // 仅当画布被激活（最近一次指针按下发生在画布上）时，才处理 Cmd/Ctrl+C/V
    if (!this.canvasActive) return;

    const isMac = navigator.platform.toLowerCase().includes("mac");
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (mod && e.key.toLowerCase() === "c") {
      // 复制选中节点及相关边
      const selected = new Set(
        this.engine.graph
          .getNodes()
          .filter((n) => n.selected)
          .map((n) => n.id),
      );
      const json = toJSON(this.engine.graph);
      const nodes = json.nodes.filter((n) => selected.has(n.id));
      const edges = json.edges.filter((e2) => selected.has(e2.source) && selected.has(e2.target));
      this.nodeMemory = { nodes, edges };
    }
    if (mod && e.key.toLowerCase() === "v") {
      if (!this.nodeMemory) return;

      // 阻止默认粘贴行为，避免触发 paste 事件
      e.preventDefault();

      // 标记刚刚粘贴了节点，用于 onPaste 中判断
      this.justPastedNode = true;
      setTimeout(() => {
        this.justPastedNode = false;
      }, 100);

      // 粘贴：生成短 ID（不再基于原 ID 叠加后缀），并建立 old->new 映射，保持边引用正确
      const pasted = JSON.parse(JSON.stringify(this.nodeMemory));
      const idMap = new Map<string, string>();
      const genShortId = (prefix: "n" | "e" | "g"): string => {
        // 约 1~2e7 空间，足够避免冲突；必要时循环检查
        const t = Date.now().toString(36).slice(-4);
        const r = Math.random().toString(36).slice(2, 6);
        return `${prefix}${t}${r}`;
      };
      // 若存在 groupId，需要为粘贴出来的节点重建 groupId，避免与原组混淆
      const groupIdMap = new Map<string, string>();
      const allocGroupId = (old?: string) => {
        if (!old) return undefined;
        if (!groupIdMap.has(old)) {
          let gid = genShortId("g");
          // 简单避免与现有节点组冲突（图模型未集中存储组，只需确保字符串短小且随机即可）
          groupIdMap.set(old, gid);
        }
        return groupIdMap.get(old);
      };

      // 重新映射 groupPath（保持层级结构）
      const remapGroupPath = (oldPath?: string[]): string[] | undefined => {
        if (!oldPath || oldPath.length === 0) return undefined;
        return oldPath.map((oldGid) => allocGroupId(oldGid)!);
      };

      // 使用统一定位逻辑计算粘贴位置
      if (pasted.nodes.length > 0) {
        const { offsetX, offsetY } = this.calculatePasteOffset(pasted.nodes);
        // 应用偏移
        for (const n of pasted.nodes) {
          n.position.x += offsetX;
          n.position.y += offsetY;
        }
      }

      // 计算当前最大 zIndex，使粘贴内容置顶显示
      let maxZ = 0;
      for (const n of this.engine.graph.getNodes()) maxZ = Math.max(maxZ, n.zIndex ?? 0);
      for (const n of pasted.nodes) {
        // 生成全新短 ID，避免叠加原 ID
        let newId = genShortId("n");
        while (this.engine.graph.getNode(newId)) newId = genShortId("n");
        idMap.set(n.id, newId);
        n.id = newId;
        n.selected = true;
        // 将粘贴的节点置顶（并保持相对顺序）
        n.zIndex = ++maxZ;
        // 重建 groupId 和 groupPath（若原节点属于某组）
        if (n.groupId) n.groupId = allocGroupId(n.groupId);
        if (n.groupPath) n.groupPath = remapGroupPath(n.groupPath);
      }
      for (const ed of pasted.edges) {
        // 也为边生成短 ID
        let eid = genShortId("e");
        while (this.engine.graph.getEdge(eid)) eid = genShortId("e");
        ed.id = eid;
        ed.source = idMap.get(ed.source) ?? ed.source;
        ed.target = idMap.get(ed.target) ?? ed.target;
      }
      // 通过命令历史纳入撤销/重做：作为一次"粘贴"事务
      const hist: any = (this.engine as any).history;
      if (hist && typeof hist.beginTransaction === "function") {
        hist.beginTransaction("Paste");
        try {
          for (const n of pasted.nodes) {
            hist.execute(new AddNodeCommand(this.engine.graph, n));
          }
          for (const e2 of pasted.edges) {
            hist.execute(new AddEdgeCommand(this.engine.graph, e2));
          }
          hist.commitTransaction();
        } catch (err) {
          try {
            hist.rollbackTransaction();
          } catch {}
          // 回退到非历史路径（保险）
          fromJSON(this.engine.graph, pasted);
          this.engine.graph.markDirty();
        }
      } else {
        // 兜底：没有历史对象时，直接写入
        fromJSON(this.engine.graph, pasted);
        this.engine.graph.markDirty();
      }
    }
  };

  /**
   * 处理粘贴事件（支持图片）
   */
  private onPaste = async (e: ClipboardEvent) => {
    if (!this.canvasActive) return;

    // 如果刚刚通过快捷键粘贴了节点，忽略此次 paste 事件
    if (this.justPastedNode) {
      return;
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    // 检查是否包含图片
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await this.handleImagePaste(file);
        }
        return;
      }
    }
  };

  /**
   * 处理粘贴的图片文件
   */
  private async handleImagePaste(file: File): Promise<void> {
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      // 触发加载开始事件
      this.engine.events.emit("clipboard:image-processing-start", {
        fileSize: file.size,
        fileType: file.type,
        preferWebP: this.imageConfig.preferWebP,
        maxSize: this.imageConfig.maxSize,
        strict: this.imageConfig.strictMaxSize,
      });
      // 读取图片
      const dataUrl = await this.readFileAsDataURL(file);

      // 加载图片以获取尺寸
      const img = await this.loadImage(dataUrl);

      // 计算图片尺寸和压缩
      const { width, height, compressedDataUrl, sizeBytes, mimeType } = await this.processImage(
        img,
        dataUrl,
        file.size,
      );

      // 严格模式：若压缩后的图片仍超过 maxSize，则拒绝粘贴（使用 Blob.size 精确判定）
      if (this.imageConfig.strictMaxSize) {
        const estimatedBytes = sizeBytes ?? (await this.getDataUrlSizeBytes(compressedDataUrl));
        if (estimatedBytes > this.imageConfig.maxSize) {
          console.warn(
            `ClipboardPlugin: image rejected by strictMaxSize. size=${estimatedBytes} > maxSize=${this.imageConfig.maxSize}`,
          );
          // 发出事件，便于外层 UI 提示
          const tEnd = typeof performance !== "undefined" ? performance.now() : Date.now();
          // 结束事件（拒绝）
          this.engine.events.emit("clipboard:image-processing-end", {
            success: false,
            reason: "oversize",
            sourceSize: file.size,
            resultSize: estimatedBytes,
            durationMs: tEnd - t0,
          });
          this.engine.events.emit("clipboard:image-rejected", {
            reason: "oversize",
            size: estimatedBytes,
            maxSize: this.imageConfig.maxSize,
          });
          return;
        }
      }

      // 使用统一定位逻辑计算粘贴位置
      const tempNode = {
        position: { x: 0, y: 0 },
        size: { width, height },
      };
      const { offsetX, offsetY } = this.calculatePasteOffset([tempNode]);

      // 计算当前最大 zIndex
      let maxZ = 0;
      for (const n of this.engine.graph.getNodes()) {
        maxZ = Math.max(maxZ, n.zIndex ?? 0);
      }

      // 生成短 ID
      const genShortId = (): string => {
        const t = Date.now().toString(36).slice(-4);
        const r = Math.random().toString(36).slice(2, 6);
        return `n${t}${r}`;
      };

      let newId = genShortId();
      while (this.engine.graph.getNode(newId)) {
        newId = genShortId();
      }

      // 创建图片节点
      const node = {
        id: newId,
        shape: "image",
        position: {
          x: offsetX,
          y: offsetY,
        },
        size: { width, height },
        data: {
          image: {
            src: compressedDataUrl,
            fit: "fill",
          },
          style: {
            stroke: "#e5e7eb",
            lineWidth: 1,
            borderRadius: 4,
          },
        },
        zIndex: maxZ + 1,
        selected: true,
      };

      // 使用命令历史添加节点
      const hist: any = (this.engine as any).history;
      if (hist && typeof hist.execute === "function") {
        try {
          hist.beginTransaction("Paste Image");
          hist.execute(new AddNodeCommand(this.engine.graph, node));
          hist.commitTransaction();
          const tEnd = typeof performance !== "undefined" ? performance.now() : Date.now();
          this.engine.events.emit("clipboard:image-processing-end", {
            success: true,
            reason: "ok",
            sourceSize: file.size,
            resultSize: sizeBytes,
            mimeType,
            durationMs: tEnd - t0,
          });
        } catch (err) {
          try {
            hist.rollbackTransaction();
          } catch {}
          // 回退：直接添加
          (this.engine.graph as any).addNode(node);
          this.engine.graph.markDirty();
          const tEnd = typeof performance !== "undefined" ? performance.now() : Date.now();
          this.engine.events.emit("clipboard:image-processing-end", {
            success: true,
            reason: "ok-fallback",
            sourceSize: file.size,
            resultSize: sizeBytes,
            mimeType,
            durationMs: tEnd - t0,
          });
        }
      } else {
        (this.engine.graph as any).addNode(node);
        this.engine.graph.markDirty();
        const tEnd = typeof performance !== "undefined" ? performance.now() : Date.now();
        this.engine.events.emit("clipboard:image-processing-end", {
          success: true,
          reason: "ok",
          sourceSize: file.size,
          resultSize: sizeBytes,
          mimeType,
          durationMs: tEnd - t0,
        });
      }
    } catch (err) {
      console.error("Failed to paste image:", err);
      const tEnd = typeof performance !== "undefined" ? performance.now() : Date.now();
      this.engine.events.emit("clipboard:image-processing-end", {
        success: false,
        reason: "error",
        error: String(err),
        durationMs: tEnd - t0,
      });
    }
  }

  /**
   * 读取文件为 DataURL
   */
  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * 加载图片
   */
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * 处理图片（压缩和调整尺寸）
   */
  private async processImage(
    img: HTMLImageElement,
    originalDataUrl: string,
    fileSize: number,
  ): Promise<{ width: number; height: number; compressedDataUrl: string; sizeBytes: number; mimeType?: string }> {
    let width = img.width;
    let height = img.height;

    // 限制最大尺寸
    if (width > this.imageConfig.maxWidth || height > this.imageConfig.maxHeight) {
      const ratio = Math.min(this.imageConfig.maxWidth / width, this.imageConfig.maxHeight / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    // 如果文件过大或尺寸被调整，需要压缩
    const needsCompression = fileSize > this.imageConfig.maxSize || width !== img.width || height !== img.height;

    if (!needsCompression) {
      // 计算节点尺寸（保持比例，但限制在合理范围）
      const nodeSize = this.calculateNodeSize(width, height);
      // 非压缩路径：估算大小（DataURL 头可能非 jpeg/webp，使用精确转换）
      const sizeBytes = await this.getDataUrlSizeBytes(originalDataUrl);
      // 尝试解析原 DataURL 的 mimeType
      const head = originalDataUrl.slice(0, originalDataUrl.indexOf(",") + 1);
      const m = head.match(/data:(.*?);base64,/);
      const mimeType = m?.[1];
      return {
        width: nodeSize.width,
        height: nodeSize.height,
        compressedDataUrl: originalDataUrl,
        sizeBytes,
        mimeType,
      };
    }

    // 压缩图片（先缩放，再编码）
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    ctx.drawImage(img, 0, 0, width, height);
    // 质量循环：优先 WebP（若配置），失败/不支持则回退 JPEG
    const preferWebP = !!this.imageConfig.preferWebP;
    let quality = this.imageConfig.quality;
    const minQ = Math.max(0, Math.min(1, this.imageConfig.minQuality));
    const step = Math.max(0.01, Math.min(0.25, this.imageConfig.qualityStep));

    // 编码助手：Promise-化 toBlob
    const toBlobAsync = (type: string, q?: number): Promise<Blob | null> =>
      new Promise((resolve) => {
        // Safari 会在不支持类型时返回 null
        canvas.toBlob((b) => resolve(b), type, q);
      });

    const blobToDataURL = (blob: Blob): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

    // 选择编码类型并逐步降低质量直到满足大小或达到下限
    let finalBlob: Blob | null = null;
    let usedType = "";

    const tryEncodeWithFallback = async (q: number): Promise<{ blob: Blob | null; type: string }> => {
      if (preferWebP) {
        const webp = await toBlobAsync("image/webp", q);
        if (webp && webp.size > 0 && webp.type.includes("webp")) return { blob: webp, type: "image/webp" };
        const jpg = await toBlobAsync("image/jpeg", q);
        if (jpg && jpg.size > 0) return { blob: jpg, type: "image/jpeg" };
        return { blob: null, type: "" };
      } else {
        const jpg = await toBlobAsync("image/jpeg", q);
        if (jpg && jpg.size > 0) return { blob: jpg, type: "image/jpeg" };
        const webp = await toBlobAsync("image/webp", q);
        if (webp && webp.size > 0 && webp.type.includes("webp")) return { blob: webp, type: "image/webp" };
        return { blob: null, type: "" };
      }
    };

    let prevSize = Number.POSITIVE_INFINITY;
    while (true) {
      const { blob, type } = await tryEncodeWithFallback(quality);
      if (!blob) break;
      const size = blob.size;
      finalBlob = blob;
      usedType = type;
      // 满足大小或到达质量下限，或没有明显改进时停止
      const meets = size <= this.imageConfig.maxSize;
      const stuck = size >= prevSize - 16; // 几乎无改进（阈值 16B）
      if (meets || quality <= minQ || stuck) {
        break;
      }
      prevSize = size;
      quality = Math.max(minQ, +(quality - step).toFixed(3));
    }

    // 若编码失败，退回到原始 DataURL（极少数情况）
    if (!finalBlob) {
      const nodeSize = this.calculateNodeSize(width, height);
      const sizeBytes = await this.getDataUrlSizeBytes(originalDataUrl);
      return { width: nodeSize.width, height: nodeSize.height, compressedDataUrl: originalDataUrl, sizeBytes };
    }

    const compressedDataUrl = await blobToDataURL(finalBlob);
    const sizeBytes = finalBlob.size;

    // 计算节点尺寸
    const nodeSize = this.calculateNodeSize(width, height);

    return {
      width: nodeSize.width,
      height: nodeSize.height,
      compressedDataUrl,
      sizeBytes,
      mimeType: usedType || finalBlob.type,
    };
  }

  /**
   * 计算节点尺寸（保持比例，限制在合理范围）
   */
  private calculateNodeSize(imgWidth: number, imgHeight: number): { width: number; height: number } {
    const maxNodeWidth = 400;
    const maxNodeHeight = 300;
    const minNodeSize = 100;

    let width = imgWidth;
    let height = imgHeight;

    // 如果图片很小，使用默认尺寸
    if (width < minNodeSize && height < minNodeSize) {
      return this.imageConfig.defaultSize;
    }

    // 限制节点最大尺寸（保持比例）
    if (width > maxNodeWidth || height > maxNodeHeight) {
      const ratio = Math.min(maxNodeWidth / width, maxNodeHeight / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    return { width, height };
  }

  /**
   * 估算 DataURL 的字节大小（去除头部后按 base64 计算）
   */
  private estimateDataUrlBytes(dataUrl: string): number {
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return 0;
    const b64 = dataUrl.slice(comma + 1);
    const len = b64.length;
    const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
    return Math.floor((len / 4) * 3) - padding;
  }

  /**
   * 更精确地获取 DataURL 的字节大小：优先转为 Blob 读取 size；失败时回退 base64 估算。
   */
  private async getDataUrlSizeBytes(dataUrl: string): Promise<number> {
    try {
      const blob = await this.dataUrlToBlob(dataUrl);
      return blob.size;
    } catch {
      return this.estimateDataUrlBytes(dataUrl);
    }
  }

  /**
   * 将 DataURL 转换为 Blob（不依赖网络）
   */
  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const comma = dataUrl.indexOf(",");
    if (comma < 0) throw new Error("Invalid data URL");
    const header = dataUrl.slice(0, comma);
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch?.[1] || "application/octet-stream";
    const b64 = dataUrl.slice(comma + 1);
    // 解码 base64 为二进制
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  /**
   * 统一定位逻辑：计算粘贴内容的偏移量
   * 规则：如果内容不在可视区域，则放到视口中心；否则使用固定偏移支持连续粘贴
   */
  private calculatePasteOffset(nodes: any[]): { offsetX: number; offsetY: number } {
    if (nodes.length === 0) return { offsetX: 0, offsetY: 0 };

    // 计算内容包围盒
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + (n.size?.width || 0));
      maxY = Math.max(maxY, n.position.y + (n.size?.height || 0));
    }

    // 获取视口的世界坐标范围
    const canvas = this.engine.canvas;
    const viewTopLeft = this.engine.toWorld({ x: 0, y: 0 });
    const viewBottomRight = this.engine.toWorld({ x: canvas.width, y: canvas.height });

    // 判断内容是否在可视区域（包围盒有交集）
    const isVisible = !(
      maxX < viewTopLeft.x ||
      minX > viewBottomRight.x ||
      maxY < viewTopLeft.y ||
      minY > viewBottomRight.y
    );

    if (isVisible) {
      // 在可视区域：使用固定偏移(+20, +20)，支持连续粘贴
      return { offsetX: 20, offsetY: 20 };
    } else {
      // 不在可视区域：将内容中心放到视口中心
      const contentCenterX = (minX + maxX) / 2;
      const contentCenterY = (minY + maxY) / 2;
      const viewCenterX = (viewTopLeft.x + viewBottomRight.x) / 2;
      const viewCenterY = (viewTopLeft.y + viewBottomRight.y) / 2;
      return {
        offsetX: viewCenterX - contentCenterX,
        offsetY: viewCenterY - contentCenterY,
      };
    }
  }
}
