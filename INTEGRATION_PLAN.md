# Agent Firewall 集成计划

## 目标

将 **agent-scan** 和 **explorer** 的功能集成到 **agent-firewall** 中，创建一个统一的 AI Agent 安全平台。

## 项目概述

### 1. agent-scan (Snyk Agent Scan)

- **功能**: 扫描 MCP 服务器和 Skills 中的安全威胁
- **核心能力**:
  - 自动发现 MCP 配置、agent 工具、skills
  - 检测 15+ 种安全风险（Prompt Injection、Tool Poisoning、Toxic Flows 等）
  - 支持 Claude、Cursor、Windsurf、Gemini CLI 等
- **技术栈**: Python, Snyk API
- **位置**: `/Users/yingwu/main/projects/agent-firewall/agent-scan`

### 2. explorer (Invariant Explorer)

- **功能**: 可视化和探索 agent traces
- **核心能力**:
  - TraceView 组件（高级轨迹可视化）
  - 策略测试环境（Playground）
  - 数据集管理
  - 注释系统
  - Monaco 编辑器集成
- **技术栈**: React, PostgreSQL, Docker Compose
- **位置**: `/Users/yingwu/main/projects/agent-firewall/explorer`

### 3. agent-firewall (当前项目)

- **功能**: 零信任安全网关，实时拦截 MCP 流量
- **核心能力**:
  - 双层分析引擎（L1 Static + L2 Semantic）
  - 实时拦截和策略执行
  - WebSocket 实时监控
  - 审计日志
- **技术栈**: FastAPI, Vue 3, SQLite
- **位置**: `/Users/yingwu/main/projects/agent-firewall/extensions/agent-firewall`

## 集成策略

### Phase 0: Agent-Scan 集成（优先级：P0）

**目标**: 将 agent-scan 的安全检测能力集成到 agent-firewall 的策略引擎中

#### 实施步骤

1. **安装 agent-scan 作为依赖**

   ```bash
   cd extensions/agent-firewall
   pip install snyk-agent-scan
   ```

2. **创建 Agent-Scan 集成层**
   - 文件: `src/engine/agent_scan_integration.py`
   - 功能: 封装 agent-scan 的扫描 API
   - 方法:
     - `scan_mcp_server()` - 扫描 MCP 服务器
     - `analyze_tool()` - 分析单个工具
     - `detect_toxic_flows()` - 检测 Toxic Flows

3. **增强威胁等级决策矩阵**
   - 文件: `src/engine/interceptor.py`
   - 集成 agent-scan 的 Issue Codes (E001-E006, W001-W013, TF001-TF002)
   - 新增决策逻辑:
     ```python
     if agent_scan_result.has_critical_issues():
         return Verdict(action="BLOCK", threat_level="CRITICAL")
     if agent_scan_result.toxic_flows:
         return Verdict(action="ESCALATE", threat_level="HIGH")
     ```

4. **前端展示**
   - 在 Traffic 页面显示 agent-scan 的 Issue Codes
   - 添加 Toxic Flow 警告标识
   - 创建 Agent-Scan 配置页面

#### 配置选项

```bash
# .env
AF_AGENT_SCAN_ENABLED=true
AF_AGENT_SCAN_MODE=local  # local | remote
AF_AGENT_SCAN_API_KEY=...  # Snyk API Key (remote 模式)
AF_AGENT_SCAN_CACHE_TTL=3600
```

### Phase 1-6: Explorer UI 组件集成（优先级：P1）

**目标**: 将 explorer 的 UI 组件移植到 agent-firewall 的 Vue 3 前端

#### Phase 1: 数据持久化层（已完成 ✅）

- SQLite 存储后端
- 数据模型（Trace, Dataset, Annotation, Policy）

#### Phase 2: TraceView 组件（需要完善）

- **当前状态**: 已创建基础组件
- **需要做的**:
  1. 从 explorer 移植完整的 TraceView 功能
  2. 添加到路由中（新增 `/traces` 页面）
  3. 集成到 Traffic 页面（点击事件查看详情）

#### Phase 3: Playground 策略测试（需要完善）

- **当前状态**: 已创建 Playground.vue
- **需要做的**:
  1. 添加到路由和导航
  2. 集成 Monaco 编辑器
  3. 实现策略实时评估

#### Phase 4: 数据集管理（需要完善）

- **当前状态**: 已创建 DatasetList.vue 和 DatasetDetail.vue
- **需要做的**:
  1. 添加到路由和导航
  2. 实现批量策略检查
  3. 集成到主应用

#### Phase 5: 注释系统（需要完善）

- **当前状态**: 已创建 API 和组件
- **需要做的**:
  1. 在 TraceView 中启用注释功能
  2. 测试地址定位系统

#### Phase 6: UI 组件库（已完成 ✅）

- Modal, Toast, Spinner 组件
- useToast composable

## 集成架构

```
agent-firewall (统一平台)
├── Backend (FastAPI)
│   ├── 实时拦截引擎 (现有)
│   ├── L1 + L2 分析 (现有)
│   ├── Agent-Scan 集成 (新增)
│   │   ├── MCP 服务器扫描
│   │   ├── Skills 扫描
│   │   └── Toxic Flow 检测
│   ├── 存储层 (SQLite)
│   └── API 路由
│       ├── /api/v1/trace (新增)
│       ├── /api/v1/dataset (新增)
│       ├── /api/v1/policy (新增)
│       └── /api/v1/agent-scan (新增)
│
└── Frontend (Vue 3)
    ├── 现有页面
    │   ├── Chat Lab
    │   ├── Traffic Waterfall
    │   ├── Rules Config
    │   ├── Engine Settings
    │   ├── Security Test
    │   └── Audit Log
    │
    └── 新增页面 (从 explorer 移植)
        ├── Traces (TraceView)
        ├── Playground (策略测试)
        ├── Datasets (数据集管理)
        └── Agent Scan (扫描结果)
```

## 实施优先级

### P0 - 立即实施

1. ✅ 修复当前路由问题（dataset, trace）
2. ✅ 安装 aiosqlite
3. ✅ 添加 get_config() 函数
4. 🔄 集成 agent-scan 核心功能
5. 🔄 在导航中添加新页面

### P1 - 短期目标（1-2周）

1. 完善 TraceView 组件
2. 启用 Playground 页面
3. 启用 Dataset 管理页面
4. 集成 Monaco 编辑器

### P2 - 中期目标（2-4周）

1. 完整的 agent-scan UI
2. 高级策略 DSL
3. 批量扫描功能
4. 数据导入/导出

## 技术债务

### 需要解决的问题

1. **存储层未完全实现**
   - `get_storage_backend()` 已存在，但部分方法未实现
   - 需要完善 SQLite 的 CRUD 操作

2. **路由未注册**
   - Playground, DatasetList, DatasetDetail 组件已创建但未添加到路由
   - 需要在 App.vue 中添加导航项

3. **组件未使用**
   - Modal, Toast, Spinner 已创建但未在实际页面中使用
   - 需要替换现有的 alert/confirm 调用

4. **Explorer 依赖 PostgreSQL**
   - Explorer 使用 PostgreSQL，我们使用 SQLite
   - 需要适配数据模型

## 下一步行动

### 立即执行（今天）

1. **添加导航项到 App.vue**

   ```typescript
   const navItems = computed(() => [
     // ... 现有项
     { id: "traces", label: "Traces", icon: icons.traces, group: "analysis", separator: true },
     { id: "playground", label: "Playground", icon: icons.playground, group: "analysis" },
     { id: "datasets", label: "Datasets", icon: icons.datasets, group: "analysis" },
     { id: "agent-scan", label: "Agent Scan", icon: icons.scan, group: "security" },
   ]);
   ```

2. **注册组件到路由**

   ```vue
   <TraceView v-if="currentSection === 'traces'" />
   <Playground v-if="currentSection === 'playground'" />
   <DatasetList v-if="currentSection === 'datasets'" />
   <AgentScanView v-if="currentSection === 'agent-scan'" />
   ```

3. **安装 agent-scan**

   ```bash
   pip install snyk-agent-scan
   ```

4. **创建 agent-scan 集成层**
   - 文件: `src/engine/agent_scan_integration.py`

### 本周完成

1. 完善 TraceView 功能
2. 启用 Playground 页面
3. 实现基础的 agent-scan 集成
4. 测试所有新功能

### 下周完成

1. 完整的 agent-scan UI
2. 数据集批量操作
3. 策略 DSL 高级功能
4. 文档更新

## 成功标准

- ✅ 所有新页面可以通过导航访问
- ✅ TraceView 可以显示完整的轨迹信息
- ✅ Playground 可以实时测试策略
- ✅ Agent-Scan 可以扫描并显示结果
- ✅ 数据集可以创建、编辑、删除
- ✅ 所有功能有完整的文档

## 参考资料

- [agent-scan README](../agent-scan/README.md)
- [explorer README](../explorer/README.md)
- [PLAN.md](./PLAN.md) - 原始开发计划
- [PHASE6_UI_ENHANCEMENT.md](./frontend/PHASE6_UI_ENHANCEMENT.md)
