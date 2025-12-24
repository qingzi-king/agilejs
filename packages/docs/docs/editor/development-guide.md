---
sidebar_position: 6
---

# 开发指南

本指南介绍如何开发和调试 AgileJS Web 编辑器。

## 环境准备

### 系统要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **浏览器**: Chrome/Edge/Firefox/Safari 最新版

### 安装依赖

```bash
# 进入项目目录
cd packages/web

# 安装依赖
pnpm install
```

## 开发流程

### 启动开发服务器

```bash
# 开发模式
pnpm dev

# 指定端口
pnpm dev --port 3001

# 外部访问
pnpm dev --host 0.0.0.0
```

访问 http://localhost:5173

### 构建生产版本

```bash
# 生产构建
pnpm pro

# 预览构建结果
pnpm preview
```

### 代码检查

```bash
# ESLint 检查
pnpm lint

# 自动修复
pnpm lint --fix
```

## 项目结构

```
packages/web/
├── src/
│   ├── app.tsx              # 应用根组件
│   ├── main.tsx             # 入口文件
│   ├── components/          # 组件
│   │   ├── toolbar/         # 工具栏
│   │   ├── panel/           # 面板
│   │   ├── common/          # 通用组件
│   │   └── ...
│   ├── pages/               # 页面
│   │   ├── editor/          # 编辑器页面
│   │   ├── viewer/          # 查看器页面
│   │   └── home.tsx
│   ├── hooks/               # 自定义 Hooks
│   ├── store/               # 状态管理
│   ├── config/              # 配置
│   ├── types/               # TypeScript 类型
│   ├── utils/               # 工具函数
│   ├── mock/                # Mock 数据
│   └── assets/              # 静态资源
├── index.html               # HTML 模板
├── vite.config.ts           # Vite 配置
├── tailwind.config.js       # Tailwind 配置
├── tsconfig.json            # TypeScript 配置
└── package.json
```

## 添加新功能

### 1. 创建组件

```typescript
// src/components/MyComponent.tsx
import React from 'react';

interface MyComponentProps {
  title: string;
}

const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  return (
    <div className="my-component">
      <h2>{title}</h2>
    </div>
  );
};

export default MyComponent;
```

### 2. 添加路由

```typescript
// src/routes/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import MyPage from '@/pages/MyPage';

export const routes = createBrowserRouter([
  {
    path: '/my-page',
    element: <MyPage />,
  },
]);
```

### 3. 创建 Hook

```typescript
// src/hooks/useMyHook.ts
import { useState, useEffect } from 'react';

function useMyHook() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // 副作用逻辑
  }, []);
  
  return { data };
}

export default useMyHook;
```

### 4. 添加工具函数

```typescript
// src/utils/myUtil.ts
export function myUtilFunction(input: string): string {
  return input.toUpperCase();
}
```

## 调试技巧

### 1. React DevTools

安装浏览器扩展：
- [React DevTools for Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [React DevTools for Firefox](https://addons.mozilla.org/firefox/addon/react-devtools/)

**功能：**
- 查看组件树
- 检查 props 和 state
- 性能分析

### 2. Zustand DevTools

```typescript
import { devtools } from 'zustand/middleware';

const useStore = create(
  devtools(
    (set) => ({
      // state
    }),
    { name: 'MyStore' }
  )
);
```

### 3. Vite 热更新

Vite 支持快速热更新（HMR），修改代码后自动刷新。

```typescript
// 保留状态的热更新
if (import.meta.hot) {
  import.meta.hot.accept();
}
```

### 4. 日志调试

```typescript
// 条件日志
if (process.env.NODE_ENV === 'development') {
  console.log('Debug:', data);
}

// 分组日志
console.group('Engine Init');
console.log('Container:', container);
console.log('Options:', options);
console.groupEnd();

// 表格日志
console.table(nodes);
```

### 5. 性能分析

```typescript
// Performance API
console.time('render');
render();
console.timeEnd('render');

// React Profiler
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number
) {
  console.log(`${id} (${phase}): ${actualDuration}ms`);
}

<Profiler id="Editor" onRender={onRenderCallback}>
  <Editor />
</Profiler>
```

### 6. 断点调试

```typescript
// 代码断点
debugger;

// 条件断点
if (node.id === 'problematic-node') {
  debugger;
}
```

## 常见问题

### Q: 如何清除缓存？

```bash
# 删除 node_modules
rm -rf node_modules

# 删除 pnpm lock
rm pnpm-lock.yaml

# 重新安装
pnpm install
```

### Q: 热更新不生效？

检查：
1. Vite 版本
2. 浏览器缓存
3. 文件保存是否成功

```bash
# 重启开发服务器
pnpm dev
```

### Q: TypeScript 类型错误？

```bash
# 重新生成类型
pnpm tsc --noEmit
```

### Q: TailwindCSS 样式不生效？

检查：
1. `tailwind.config.js` 配置
2. CSS 导入顺序
3. 类名拼写

```typescript
// 确保导入 Tailwind CSS（当前位于src/assets/styles/index.css）
@import "tailwindcss";
```

### Q: 引擎初始化失败？

检查：
1. 容器元素是否存在
2. 引擎是否已销毁
3. 浏览器控制台错误

```typescript
useEffect(() => {
  if (!containerRef.current) {
    console.error('Container not found');
    return;
  }
  
  const engine = new CanvasEngine({
    container: containerRef.current
  });
  
  return () => {
    engine.dispose();
  };
}, []);
```

## 代码规范

### ESLint 配置

```javascript
// eslint.config.js
export default [
  {
    rules: {
      'no-console': 'warn',
      'no-debugger': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
```

### 命名规范

```typescript
// 组件：PascalCase
const MyComponent = () => {};

// 函数：camelCase
function handleClick() {}

// 常量：UPPER_SNAKE_CASE
const MAX_SIZE = 100;

// 接口：PascalCase + I前缀（可选）
interface NodeData {}

// 类型：PascalCase
type Theme = 'light' | 'dark';
```

### 文件命名

```
components/
  MyComponent.tsx        # 组件
  MyComponent.module.css # 模块样式
  index.tsx              # 导出文件

hooks/
  useMyHook.ts           # Hook

utils/
  myUtil.ts              # 工具函数

types/
  index.ts               # 类型定义
```

### 注释规范

```typescript
/**
 * 组件描述
 * @param props - 属性说明
 * @returns React 元素
 */
const MyComponent: React.FC<MyComponentProps> = (props) => {
  // 单行注释
  
  /* 多行注释 */
  
  return <div />;
};
```

## Git 工作流

### 分支策略

```
main        # 主分支（生产环境）
├── develop # 开发分支
    ├── feature/my-feature  # 功能分支
    ├── fix/bug-fix         # 修复分支
    └── refactor/cleanup    # 重构分支
```

### Commit 规范

```bash
# 格式
<type>(<scope>): <subject>

# 类型
feat: 新功能
fix: 修复
docs: 文档
style: 格式
refactor: 重构
test: 测试
chore: 构建/工具

# 示例
feat(editor): 添加撤销/重做功能
fix(toolbar): 修复缩放按钮样式
docs(readme): 更新安装说明
```

### Pre-commit Hook

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

## 性能优化

### 1. 代码分割

```typescript
// 路由懒加载
const Editor = lazy(() => import('@/pages/editor'));

// 组件懒加载
const PropertyPanel = lazy(() => import('@/components/PropertyPanel'));
```

### 2. Memo 优化

```typescript
// 避免重渲染
const MyComponent = React.memo<Props>(
  ({ data }) => {
    return <div>{data}</div>;
  },
  (prev, next) => prev.data === next.data
);
```

### 3. useMemo/useCallback

```typescript
// 缓存计算结果
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// 缓存回调函数
const handleClick = useCallback(() => {
  doSomething(data);
}, [data]);
```

### 4. 虚拟化

```typescript
// 大列表虚拟化
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
>
  {({ index, style }) => (
    <div style={style}>{items[index]}</div>
  )}
</FixedSizeList>
```

## 部署

### 构建配置

```typescript
// vite.config.ts
export default defineConfig({
  base: './', // 相对路径
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'canvas-vendor': ['@agilejs/core'],
        },
      },
    },
  },
});
```

### 环境变量

```bash
# .env.development
VITE_API_URL=http://localhost:3000

# .env.production
VITE_API_URL=https://api.example.com
```

```typescript
// 使用环境变量
const apiUrl = import.meta.env.VITE_API_URL;
```

### Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "preview"]
```

## 测试

### 单元测试

```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### 集成测试

```typescript
import { renderHook, act } from '@testing-library/react';
import useCanvasStore from '@/store/canvasStore';

describe('canvasStore', () => {
  it('should set engine', () => {
    const { result } = renderHook(() => useCanvasStore());
    
    act(() => {
      result.current.setEngine({} as CanvasEngine);
    });
    
    expect(result.current.engine).toBeDefined();
  });
});
```

## 最佳实践

1. **组件化**: 保持组件小而专注
2. **类型安全**: 充分利用 TypeScript
3. **性能优化**: 避免不必要的渲染
4. **错误处理**: 添加错误边界
5. **代码复用**: 使用 Hooks 和工具函数
6. **测试覆盖**: 编写单元测试
7. **文档完善**: 添加注释和文档
8. **代码审查**: 提交前自查
