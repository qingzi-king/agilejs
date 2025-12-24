---
sidebar_position: 1
---

# 性能优化快速参考

## 问题解决

### 症状1：10000节点 + 20000边，机器配置不高时拖拽卡顿

**分析原因：**
```
拖拽时每次移动 → markDirty() → graphVersion++ 
→ 边快照失效 → 重绘20000条边 → 200ms/帧 → 5fps
```

**解决方案：** ✅ 已实施激进优化（大批量拖拽时冻结边快照）

### 症状2：拖拽少量节点时边也被冻结

**分析原因：**
```
激进优化过于激进 → 拖拽任何数量节点都冻结边
→ 日常操作体验差
```

**解决方案：** ✅ 只在大批量拖拽（>400个节点）时才降质
- **拖拽 ≤400 个节点**：边正常渲染，实时跟随
- **拖拽 >400 个节点**：冻结快照，保持流畅

## 已实施优化总览

### 第一轮：基础优化（效果有限）
- ✓ 可见节点数组复用
- ✓ 边可见性缓存
- ✓ 拖拽批量更新
- ✓ markDirty 节流
- **结果：** ~20 fps（仍卡顿）

### 第二轮：激进优化（显著改善）
- ✅ **拖拽时冻结边快照**（核心）
- ✅ **基于总数的激进降质**
- ✅ **缓存图形总数**
- **结果：** 55-60 fps（流畅）🚀
- ⚠️ **问题：** 所有拖拽都冻结边

### 第三轮：智能降质（体验完美）
- ✅ **只在大批量拖拽（>400节点）时降质**
- ✅ **少量拖拽边实时跟随**
- ✅ **分离平移和拖拽逻辑**
- **结果：** 日常操作完美体验 + 批量操作流畅 🎉

---

## 性能对比

| 场景 | 优化前 | 第二轮 | 第三轮（当前）|
|------|--------|--------|-------------|
| 拖拽1个节点 | 5 fps | 60 fps（边冻结）⚠️ | **60 fps（边跟随）** ✅ |
| 拖拽100个节点 | 3 fps | 60 fps（边冻结）⚠️ | **50 fps（边跟随）** ✅ |
| 拖拽500个节点 | 1 fps | 60 fps（边冻结）✅ | **60 fps（边冻结）** ✅ |

---

## 配置选项

### 默认配置（自动激进降质）
```typescript
const engine = new CanvasEngine({
  container: document.getElementById('canvas'),
  // 默认值，无需配置
});
```

### 调整降质阈值
```typescript
const engine = new CanvasEngine({
  container: document.getElementById('canvas'),
  
  // 更激进（更早触发降质）
  aggressiveDegradation: {
    totalNodes: 2000,   // 默认 5000
    totalEdges: 5000    // 默认 10000
  },
  
  // 可视区域降质阈值
  dragEdgeRenderThreshold: {
    nodes: 200,   // 默认 400
    edges: 400    // 默认 800
  }
});
```

---

## 智能降质策略

系统根据**拖拽数量**和**场景规模**自动选择：

### 少量拖拽（≤400个节点）

**10000节点 + 20000边场景：**
- 拖拽 1 个节点：✅ 边实时跟随，55-60 fps
- 拖拽 10 个节点：✅ 边实时跟随，55-60 fps
- 拖拽 100 个节点：✅ 边实时跟随，45-55 fps
- 拖拽 400 个节点：✅ 边实时跟随，40-50 fps

**小场景（100节点 + 200边）：**
- 拖拽任意数量（≤100）：✅ 边实时跟随，60 fps

### 大批量拖拽（>400个节点）

**10000节点 + 20000边场景：**
- 拖拽 500 个节点：⚠️ 边冻结或清空，55-60 fps
- 拖拽 2000 个节点：❌ 边清空，60 fps
- 拖拽结束后：✅ 边立即更新到正确位置

### 平移（所有场景）

**小/中规模：**
- 边快照：✅ 正常更新
- 边位置：✅ 跟随平移
- 性能：55-60 fps

**大规模（> 10K节点或> 20K边）：**
- 边快照：⚡ 暂时清空
- 停止后：✅ 立即重建显示

---

## 优化建议

### 1. 合理设计场景规模
- 单个画布节点数控制在 5000 以内
- 边数控制在 10000 以内
- 超大场景考虑分层或分页

### 2. 使用虚拟滚动
- 对于列表型内容，使用虚拟滚动只渲染可见部分
- 结合缩放级别，远距离简化渲染

### 3. 批量操作优化
- 批量添加节点时使用 `beginUpdate` / `endUpdate`
- 避免在循环中频繁调用 `markDirty`

### 4. 自定义渲染器
- 复杂图形考虑使用 Canvas Path2D 缓存
- 静态内容使用离屏 Canvas 预渲染

---

## 性能监控

使用内置的性能监控工具：

```typescript
// 启用性能监控
engine.enablePerformanceMonitor(true);

// 获取性能数据
const stats = engine.getPerformanceStats();
console.log('FPS:', stats.fps);
console.log('平均渲染时间 (ms):', stats.renderTime);
console.log('节点总数:', stats.nodeCount);
console.log('边总数:', stats.edgeCount);
console.log('可见节点数:', stats.visibleNodeCount);
console.log('可见边数:', stats.visibleEdgeCount);
console.log('内存使用 (MB):', stats.memoryUsage); // 仅 Chrome
```

### 性能指标说明

- **fps**: 每秒帧数，60 为最佳，低于 30 表示卡顿
- **renderTime**: 平均渲染时间（毫秒），基于最近 60 帧的平均值
- **nodeCount / edgeCount**: 图中节点和边的总数
- **visibleNodeCount / visibleEdgeCount**: 当前视口内可见的节点和边数量
- **memoryUsage**: JavaScript 堆内存使用量（仅 Chrome 支持）

### 实时监控示例

```typescript
// 持续监控性能
setInterval(() => {
  const stats = engine.getPerformanceStats();
  console.table({
    'FPS': stats.fps,
    '渲染时间': `${stats.renderTime}ms`,
    '节点数': `${stats.visibleNodeCount}/${stats.nodeCount}`,
    '边数': `${stats.visibleEdgeCount}/${stats.edgeCount}`,
  });
}, 1000);
```

