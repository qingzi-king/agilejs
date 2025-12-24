/*
 * 主题调色板集中定义
 * 可在这里扩展更多主题或做深浅色的自定义覆盖。
 */
export type CoreThemeName = "light" | "dark";

export interface CoreThemePalette {
  background: string;
  grid: { color: string; alpha: number };
  guides: { color: string };
  minimap: {
    background: string;
    borderColor: string;
    nodeColor: string;
    edgeColor: string;
    viewportStroke: string;
    viewportFill: string;
  };
}

export const THEME_PALETTES: Record<CoreThemeName, CoreThemePalette> = {
  light: {
    background: "#ffffff",
    grid: { color: "#f3f4f6", alpha: 1 },
    guides: { color: "#ef4444" },
    minimap: {
      background: "rgba(0,0,0,0.04)",
      borderColor: "#F3F3F3",
      nodeColor: "#64748b",
      edgeColor: "#94a3b8",
      viewportStroke: "#3b82f6",
      viewportFill: "rgba(59,130,246,0.18)",
    },
  },
  dark: {
    background: "#0f172a",
    grid: { color: "#1f2937", alpha: 1 },
    guides: { color: "#f43f5e" },
    minimap: {
      background: "rgba(255,255,255,0.06)",
      borderColor: "#475569",
      nodeColor: "#94a3b8",
      edgeColor: "#94a3b8",
      viewportStroke: "#38bdf8",
      viewportFill: "rgba(56,189,248,0.18)",
    },
  },
};

export function mergePalette(base: CoreThemePalette, overrides?: Partial<CoreThemePalette>): CoreThemePalette {
  if (!overrides) return base;
  return {
    background: overrides.background ?? base.background,
    grid: { ...base.grid, ...(overrides.grid || {}) },
    guides: { ...base.guides, ...(overrides.guides || {}) },
    minimap: { ...base.minimap, ...(overrides.minimap || {}) },
  };
}
