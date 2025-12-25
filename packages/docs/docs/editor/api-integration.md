---
sidebar_position: 7
---

# API 集成

:::warning 提示

本指南介绍如何在 AgileJS Web 编辑器中集成后端 API，具体实现需业务自行扩展。

:::

## 数据格式

### 图形数据

```typescript
interface GraphData {
  nodes: NodeData[];
  edges: EdgeData[];
  metadata?: {
    version: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface NodeData {
  id: string;
  shape: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation?: number;
  zIndex?: number;
  data?: Record<string, any>;
}

interface EdgeData {
  id: string;
  shape: string;
  source: string;
  target: string;
  sourcePortId?: string;
  targetPortId?: string;
  points?: Point[];
  data?: Record<string, any>;
}
```

## API 服务

### 基础配置

```typescript
// src/service/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: ApiResponse<T> = await response.json();
  
  if (result.code !== 0) {
    throw new Error(result.message);
  }
  
  return result.data;
}
```

### 图形 API

```typescript
// src/service/graphApi.ts
export const graphApi = {
  // 获取图形列表
  async getGraphList(): Promise<GraphData[]> {
    return request<GraphData[]>('/api/graphs');
  },
  
  // 获取单个图形
  async getGraph(id: string): Promise<GraphData> {
    return request<GraphData>(`/api/graphs/${id}`);
  },
  
  // 创建图形
  async createGraph(data: GraphData): Promise<{ id: string }> {
    return request<{ id: string }>('/api/graphs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  // 更新图形
  async updateGraph(id: string, data: GraphData): Promise<void> {
    return request<void>(`/api/graphs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  // 删除图形
  async deleteGraph(id: string): Promise<void> {
    return request<void>(`/api/graphs/${id}`, {
      method: 'DELETE',
    });
  },
};
```

## 加载数据

### 加载远程数据

```typescript
import { graphApi } from '@/service/graphApi';
import { fromJSON } from '@fnt-agilejs/core';

async function loadGraphFromServer(
  engine: CanvasEngine,
  graphId: string
) {
  try {
    // 显示加载提示
    showLoading();
    
    // 获取数据
    const data = await graphApi.getGraph(graphId);
    
    // 清空现有数据
    engine.graph.clear();
    
    // 加载数据到引擎
    const scene = fromJSON(data);
    scene.nodes.forEach(node => engine.graph.addNode(node));
    scene.edges.forEach(edge => engine.graph.addEdge(edge));
    
    // 适配视图
    engine.fitContent();
    
    showSuccess('加载成功');
  } catch (error) {
    console.error('Failed to load graph:', error);
    showError('加载失败');
  } finally {
    hideLoading();
  }
}
```

### Hook 封装

```typescript
// src/hooks/useGraphData.ts
import { useState, useEffect } from 'react';

interface UseGraphDataResult {
  data: GraphData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

function useGraphData(graphId: string): UseGraphDataResult {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await graphApi.getGraph(graphId);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (graphId) {
      fetchData();
    }
  }, [graphId]);
  
  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}

export default useGraphData;
```

### 使用示例

```typescript
const Editor: React.FC = () => {
  const { graphId } = useParams();
  const { data, loading, error } = useGraphData(graphId);
  const engineRef = useRef<CanvasEngine | null>(null);
  
  // 加载数据到引擎
  useEffect(() => {
    if (!data || !engineRef.current) return;
    
    const engine = engineRef.current;
    engine.graph.clear();
    
    data.nodes.forEach(node => engine.graph.addNode(node));
    data.edges.forEach(edge => engine.graph.addEdge(edge));
    
    engine.fitContent();
  }, [data]);
  
  if (loading) return <div>加载中...</div>;
  if (error) return <div>加载失败: {error.message}</div>;
  
  return <div ref={containerRef} />;
};
```

## 保存数据

### 手动保存

```typescript
async function saveGraphToServer(
  engine: CanvasEngine,
  graphId?: string
) {
  try {
    showLoading('保存中...');
    
    // 序列化数据
    const data: GraphData = {
      nodes: engine.graph.getNodes(),
      edges: engine.graph.getEdges(),
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    
    // 保存到服务器
    if (graphId) {
      await graphApi.updateGraph(graphId, data);
    } else {
      const result = await graphApi.createGraph(data);
      // 更新 URL
      window.history.pushState({}, '', `/editor/${result.id}`);
    }
    
    showSuccess('保存成功');
  } catch (error) {
    console.error('Failed to save graph:', error);
    showError('保存失败');
  } finally {
    hideLoading();
  }
}

// 使用
<button onClick={() => saveGraphToServer(engine, graphId)}>
  保存
</button>
```

### 自动保存

```typescript
import { debounce } from 'lodash';

function useAutoSave(
  engine: CanvasEngine | null,
  graphId: string | undefined,
  interval = 30000 // 30秒
) {
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // 防抖保存
  const debouncedSave = useMemo(
    () => debounce(async () => {
      if (!engine || !graphId) return;
      
      try {
        const data: GraphData = {
          nodes: engine.graph.getNodes(),
          edges: engine.graph.getEdges(),
        };
        
        await graphApi.updateGraph(graphId, data);
        
        setIsDirty(false);
        setLastSaved(new Date());
        showSuccess('自动保存成功', { duration: 1000 });
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 2000),
    [engine, graphId]
  );
  
  // 监听图形变化
  useEffect(() => {
    if (!engine) return;
    
    const handler = () => {
      setIsDirty(true);
      debouncedSave();
    };
    
    engine.events.on('graph:change', handler);
    return () => {
      engine.events.off('graph:change', handler);
      debouncedSave.cancel();
    };
  }, [engine, debouncedSave]);
  
  // 定时保存
  useEffect(() => {
    if (!engine || !graphId || !isDirty) return;
    
    const timer = setInterval(() => {
      debouncedSave.flush();
    }, interval);
    
    return () => clearInterval(timer);
  }, [engine, graphId, isDirty, interval, debouncedSave]);
  
  return { isDirty, lastSaved };
}

// 使用
const { isDirty, lastSaved } = useAutoSave(engine, graphId);

<div className="status-bar">
  {isDirty ? '未保存' : '已保存'}
  {lastSaved && ` - ${formatTime(lastSaved)}`}
</div>
```

## 导入/导出

### 导出 JSON

```typescript
function exportGraphAsJSON(engine: CanvasEngine) {
  const data: GraphData = {
    nodes: engine.graph.getNodes(),
    edges: engine.graph.getEdges(),
    metadata: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `graph-${Date.now()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}
```

### 导入 JSON

```typescript
function importGraphFromJSON(
  engine: CanvasEngine,
  file: File
) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const json = e.target?.result as string;
      const data: GraphData = JSON.parse(json);
      
      // 验证数据
      if (!data.nodes || !data.edges) {
        throw new Error('Invalid graph data');
      }
      
      // 清空并加载
      engine.graph.clear();
      data.nodes.forEach(node => engine.graph.addNode(node));
      data.edges.forEach(edge => engine.graph.addEdge(edge));
      
      engine.fitContent();
      showSuccess('导入成功');
    } catch (error) {
      console.error('Import failed:', error);
      showError('导入失败');
    }
  };
  
  reader.readAsText(file);
}

// 文件选择器
<input
  type="file"
  accept=".json"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      importGraphFromJSON(engine, file);
    }
  }}
/>
```

### 导出图片

```typescript
async function exportGraphAsImage(
  engine: CanvasEngine,
  format: 'png' | 'jpeg' = 'png'
) {
  try {
    // 获取 Canvas 元素
    const canvas = engine.canvas;
    
    // 转换为 Blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), `image/${format}`);
    });
    
    // 下载
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph-${Date.now()}.${format}`;
    a.click();
    
    URL.revokeObjectURL(url);
    showSuccess('导出成功');
  } catch (error) {
    console.error('Export failed:', error);
    showError('导出失败');
  }
}
```

## 错误处理

### 错误拦截

```typescript
// src/service/api.ts
class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, options);
    
    if (!response.ok) {
      throw new ApiError(
        response.status,
        `HTTP ${response.status}: ${response.statusText}`
      );
    }
    
    const result = await response.json();
    
    if (result.code !== 0) {
      throw new ApiError(result.code, result.message, result.data);
    }
    
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      0,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
```

### 全局错误处理

```typescript
// src/utils/errorHandler.ts
export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 401:
        // 未授权，跳转登录
        window.location.href = '/login';
        break;
      case 403:
        showError('无权限访问');
        break;
      case 404:
        showError('资源不存在');
        break;
      case 500:
        showError('服务器错误');
        break;
      default:
        showError(error.message);
    }
  } else {
    showError('未知错误');
  }
  
  // 上报错误
  reportError(error);
}
```

## 认证授权

### Token 管理

```typescript
// src/utils/auth.ts
const TOKEN_KEY = 'auth_token';

export const auth = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  
  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
  
  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

// 请求拦截
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = auth.getToken();
  
  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });
}
```

### 路由守卫

```typescript
// src/components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = auth.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// 使用
<Route
  path="/editor"
  element={
    <ProtectedRoute>
      <Editor />
    </ProtectedRoute>
  }
/>
```

## 最佳实践

### 1. 请求取消

```typescript
function useGraphData(graphId: string) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const abortController = new AbortController();
    
    fetch(`/api/graphs/${graphId}`, {
      signal: abortController.signal
    })
      .then(res => res.json())
      .then(setData)
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      });
    
    return () => abortController.abort();
  }, [graphId]);
  
  return data;
}
```

### 2. 请求缓存

```typescript
const cache = new Map<string, any>();

async function cachedRequest<T>(url: string): Promise<T> {
  if (cache.has(url)) {
    return cache.get(url);
  }
  
  const data = await request<T>(url);
  cache.set(url, data);
  
  return data;
}
```

### 3. 重试机制

```typescript
async function retryRequest<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 4. 数据验证

```typescript
import { z } from 'zod';

const NodeDataSchema = z.object({
  id: z.string(),
  shape: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }),
});

function validateNodeData(data: unknown): NodeData {
  return NodeDataSchema.parse(data);
}
```
