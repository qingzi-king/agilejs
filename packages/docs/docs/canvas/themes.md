---
sidebar_position: 5
---

# 主题

## 概述

Canvas 引擎内置了亮色 `light` 和暗色 `dark` 两套主题，支持主题切换和自定义配置。

## 内置主题

### 亮色主题（light）

```typescript
{
  background: '#ffffff',
  grid: {
    color: '#f3f4f6',
    alpha: 1
  },
  guides: {
    color: '#ef4444'
  },
  minimap: {
    background: 'rgba(0,0,0,0.04)',
    borderColor: '#F3F3F3',
    nodeColor: '#64748b',
    edgeColor: '#94a3b8',
    viewportStroke: '#3b82f6',
    viewportFill: 'rgba(59,130,246,0.18)'
  }
}
```

### 暗色主题（dark）

```typescript
{
  background: '#0f172a',
  grid: {
    color: '#1f2937',
    alpha: 1
  },
  guides: {
    color: '#f43f5e'
  },
  minimap: {
    background: 'rgba(255,255,255,0.06)',
    borderColor: '#475569',
    nodeColor: '#94a3b8',
    edgeColor: '#94a3b8',
    viewportStroke: '#38bdf8',
    viewportFill: 'rgba(56,189,248,0.18)'
  }
}
```

## 使用主题

### 初始化时设置

```typescript
const engine = new CanvasEngine({
  container,
  background: '#ffffff'  // 亮色背景
});
```

### 运行时切换

```typescript
// 切换到暗色主题
engine.setTheme('dark');

// 切换到亮色主题
engine.setTheme('light');

// 获取当前主题
const currentTheme = engine.getTheme();  // 'light' | 'dark'
```

### 监听主题变化

```typescript
engine.events.on('themeChanged', ({ theme }) => {
  console.log(`主题已切换到: ${theme}`);
  
  // 更新应用的其他部分
  document.body.className = theme === 'dark' ? 'dark-mode' : 'light-mode';
});
```

## 主题配置

### 主题接口

```typescript
interface CoreThemePalette {
  background: string;              // 画布背景色
  grid: {
    color: string;                // 网格颜色
    alpha: number;                // 网格透明度
  };
  guides: {
    color: string;                // 辅助线颜色
  };
  minimap: {
    background: string;           // 小地图背景
    borderColor: string;          // 小地图边框
    nodeColor: string;            // 小地图节点颜色
    edgeColor: string;            // 小地图边颜色
    viewportStroke: string;       // 视口边框
    viewportFill: string;         // 视口填充
  };
}
```

### 获取主题配置

```typescript
import { THEME_PALETTES } from '@agilejs/core';

// 获取亮色主题配置
const lightTheme = THEME_PALETTES.light;

// 获取暗色主题配置
const darkTheme = THEME_PALETTES.dark;
```

### 自定义主题

```typescript
import { mergePalette, THEME_PALETTES } from '@agilejs/core';

// 基于亮色主题自定义
const customTheme = mergePalette(THEME_PALETTES.light, {
  background: '#f8fafc',
  grid: {
    color: '#e2e8f0',
    alpha: 0.8
  },
  guides: {
    color: '#10b981'
  }
});

// 应用自定义主题
engine.setTheme('light');
// 注意：当前版本需要在初始化时设置背景色
// 后续版本会支持完整的自定义主题切换
```

## 主题适配

### 节点样式适配

根据主题调整节点颜色：

```typescript
function getNodeColor(theme: 'light' | 'dark'): string {
  return theme === 'light' ? '#3b82f6' : '#60a5fa';
}

engine.events.on('themeChanged', ({ theme }) => {
  const nodes = engine.graph.getNodes();
  nodes.forEach(node => {
    node.data = {
      ...node.data,
      style: {
        ...node.data?.style,
        fill: getNodeColor(theme as 'light' | 'dark')
      }
    };
  });
  engine.graph.markDirty('style');
});
```

### 边样式适配

```typescript
function getEdgeColor(theme: 'light' | 'dark'): string {
  return theme === 'light' ? '#64748b' : '#94a3b8';
}

engine.events.on('themeChanged', ({ theme }) => {
  const edges = engine.graph.getEdges();
  edges.forEach(edge => {
    edge.data = {
      ...edge.data,
      style: {
        ...edge.data?.style,
        stroke: getEdgeColor(theme as 'light' | 'dark')
      }
    };
  });
  engine.graph.markDirty('style');
});
```

### 响应系统主题

```typescript
// 检测系统主题偏好
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

// 初始化时应用系统主题
engine.setTheme(prefersDark.matches ? 'dark' : 'light');

// 监听系统主题变化
prefersDark.addEventListener('change', (e) => {
  engine.setTheme(e.matches ? 'dark' : 'light');
});
```

## 完整示例

### 主题切换组件

```typescript
class ThemeManager {
  private engine: CanvasEngine;
  private currentTheme: 'light' | 'dark';
  
  constructor(engine: CanvasEngine) {
    this.engine = engine;
    this.currentTheme = 'light';
    
    // 从本地存储恢复主题
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      this.setTheme(savedTheme);
    }
  }
  
  setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme = theme;
    this.engine.setTheme(theme);
    
    // 保存到本地存储
    localStorage.setItem('theme', theme);
    
    // 更新页面样式
    document.body.setAttribute('data-theme', theme);
    
    // 更新图形样式
    this.updateGraphStyles(theme);
  }
  
  toggleTheme(): void {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }
  
  getTheme(): 'light' | 'dark' {
    return this.currentTheme;
  }
  
  private updateGraphStyles(theme: 'light' | 'dark'): void {
    const nodeColor = theme === 'light' ? '#3b82f6' : '#60a5fa';
    const edgeColor = theme === 'light' ? '#64748b' : '#94a3b8';
    
    // 更新所有节点
    this.engine.graph.getNodes().forEach(node => {
      node.data = {
        ...node.data,
        style: {
          ...node.data?.style,
          fill: nodeColor,
          stroke: theme === 'light' ? '#1e40af' : '#3b82f6'
        }
      };
    });
    
    // 更新所有边
    this.engine.graph.getEdges().forEach(edge => {
      edge.data = {
        ...edge.data,
        style: {
          ...edge.data?.style,
          stroke: edgeColor
        }
      };
    });
    
    this.engine.graph.markDirty('style');
  }
}

// 使用
const themeManager = new ThemeManager(engine);

// 切换主题
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  themeManager.toggleTheme();
});
```

### React 集成

```typescript
import { useState, useEffect } from 'react';

function ThemeToggle({ engine }: { engine: CanvasEngine }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    engine.setTheme(theme);
  }, [theme, engine]);
  
  const toggle = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  return (
    <button onClick={toggle}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

## 最佳实践

### 1. 提供主题切换选项

```typescript
// ✅ 提供易于访问的主题切换按钮
<button onclick="engine.setTheme('light')">亮色</button>
<button onclick="engine.setTheme('dark')">暗色</button>
<button onclick="engine.setTheme(engine.getTheme() === 'light' ? 'dark' : 'light')">
  切换
</button>
```

### 2. 保存用户偏好

```typescript
// ✅ 保存到本地存储
engine.events.on('themeChanged', ({ theme }) => {
  localStorage.setItem('canvas-theme', theme);
});

// 初始化时恢复
const savedTheme = localStorage.getItem('canvas-theme');
if (savedTheme === 'light' || savedTheme === 'dark') {
  engine.setTheme(savedTheme);
}
```

### 3. 响应系统主题

```typescript
// ✅ 跟随系统主题
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
engine.setTheme(prefersDark.matches ? 'dark' : 'light');

prefersDark.addEventListener('change', (e) => {
  engine.setTheme(e.matches ? 'dark' : 'light');
});
```

### 4. 平滑过渡

```typescript
// ✅ 添加过渡动画
engine.events.on('themeChanged', () => {
  engine.canvas.style.transition = 'background-color 0.3s ease';
});
```

## 扩展主题

### 自定义插件主题

如果你的自定义插件需要主题支持：

```typescript
class CustomPlugin implements Plugin {
  readonly id = 'custom';
  private engine!: CanvasEngine;
  private theme: 'light' | 'dark' = 'light';
  
  setup(engine: CanvasEngine): void {
    this.engine = engine;
    this.theme = engine.getTheme();
    
    // 监听主题变化
    engine.events.on('themeChanged', ({ theme }) => {
      this.theme = theme as 'light' | 'dark';
      engine.render();  // 触发重绘
    });
  }
  
  afterRender(ctx: CanvasRenderingContext2D): void {
    // 根据主题使用不同颜色
    ctx.fillStyle = this.theme === 'light' ? '#000000' : '#ffffff';
    ctx.fillText('Custom Text', 10, 10);
  }
}
```

## 主题颜色参考

### 推荐的主题颜色

```typescript
const themeColors = {
  light: {
    // 主要颜色
    primary: '#3b82f6',
    secondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    
    // 背景颜色
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9'
    },
    
    // 文本颜色
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8'
    },
    
    // 边框颜色
    border: {
      primary: '#e2e8f0',
      secondary: '#cbd5e1'
    }
  },
  
  dark: {
    // 主要颜色
    primary: '#60a5fa',
    secondary: '#94a3b8',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    
    // 背景颜色
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155'
    },
    
    // 文本颜色
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      tertiary: '#64748b'
    },
    
    // 边框颜色
    border: {
      primary: '#334155',
      secondary: '#475569'
    }
  }
};
```

## 常见问题

### Q: 如何完全自定义主题？

当前版本支持通过配置背景色和网格样式实现基础自定义。完整的主题系统正在开发中。

### Q: 主题切换会影响性能吗？

主题切换只更新配置和触发一次重绘，对性能影响极小。

### Q: 可以为不同节点设置不同主题吗？

节点样式独立于全局主题，可以为每个节点设置自定义颜色。

### Q: 如何实现主题动画过渡？

可以通过监听 `themeChanged` 事件并使用 Canvas 动画实现平滑过渡。
