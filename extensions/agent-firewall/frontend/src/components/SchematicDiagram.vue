<template>
  <div class="schematic-page">
    <div class="page-header">
      <h2>架构体系与安全策略分布图 (Schematic Overview)</h2>
      <p class="subtitle">全程可视化项目的核心链路、双层管控引擎与全景防御图谱</p>
    </div>

    <div class="diagrams-grid">
      <!-- Diagram 1: Overall Architecture -->
      <div class="diagram-card">
        <h3>1. 零信任端到端网关架构模型 (System Architecture)</h3>
        <p class="desc">在 AI Agent 和 工具服务底层之间进行强制接管和 MITM 全局流量检查。</p>
        <div class="mermaid-container" ref="archDiagram"></div>
      </div>

      <!-- Diagram 2: Dual Layer Engine -->
      <div class="diagram-card">
        <h3>2. 漏斗式深层审查双引擎分析流 (Dual-Layer Core Pipeline)</h3>
        <p class="desc">运用高低配置算力分配原则，融合超快速静态文本模式匹配 (L1) 与基于 LLM Context 识别 (L2) 相结合的安全判断网关。</p>
        <div class="mermaid-container" ref="engineDiagram"></div>
      </div>

      <!-- Diagram 3: Strategic Vision -->
      <div class="diagram-card">
        <h3>3. 全局防御策略与能力雷达拓扑 (Strategic Mindmap)</h3>
        <p class="desc">宏观拆解组件模块：全自动监控、红蓝攻防对抗（OmniSafeBench-MM集成），和无死角审计的构建框架。</p>
        <div class="mermaid-container" ref="strategyDiagram"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import mermaid from 'mermaid'

const archDiagram = ref<HTMLElement | null>(null)
const engineDiagram = ref<HTMLElement | null>(null)
const strategyDiagram = ref<HTMLElement | null>(null)

const archCode = `
graph LR
    subgraph Client ["External Request Origin"]
        A("AI Agents<br/>Claude/GPT-4 / User Client")
    end
    
    A <-->|"MCP Protocol / JSON-RPC Session Stream"| B("🛡️ Agent-Firewall<br/>Zero-Trust Web/Local Security Gateway")
    B <-->|"Filtered Valid Traffic"| C("Tool Servers<br/>OpenClaw Gateway / Local Exec")
    
    subgraph Core ["Firewall Core Control Matrix"]
        direction TB
        B1("Session Manager & SSE Layer") --> B2("Interceptor Engine Data Plane")
        B2 --> B3("Policy Core Enforcement & Evaluator")
        B3 --> B4("Asynchronous JSONL Audit Data Lake")
    end
    
    B -.->|"Contains components"| Core
    
    classDef firewall fill:#1e293b,stroke:#8b5cf6,stroke-width:2px,color:#fff;
    class B,Core,B1,B2,B3,B4 firewall;
`

const engineCode = `
stateDiagram-v2
    [*] --> Ingress
    Ingress: Unpack Original Request / Event Stream (MCP JSON-RPC Payload)
    Ingress --> L1
    
    state "L1: High-Speed Static Analyzer" as L1 {
        direction LR
        AhoCorasick: 1. Aho-Corasick Multi-Pattern Tree
        Regex: 2. Regular Expression Guardrails
        AhoCorasick --> Regex
    }
    
    L1 --> Blocked: Verification = REJECT / DENY
    L1 --> L2: Verification = PASS 
    
    state "L2: Deep Semantic Analyzer" as L2 {
        direction LR
        Prompt: 1. Assemble Attack Surface & System Context Prompt
        LLM: 2. Specialized Safety LLM Validator
        Output_step: 3. Infer Malicious Intent & Prompt Injection
        Prompt --> LLM
        LLM --> Output_step
    }
    
    L2 --> Blocked: Verification = REJECT / DENY
    L2 --> Allowed: Verification = PASS
    
    Blocked --> [*]
    Allowed --> Forward
    Forward: Send to Tool Server / Model Core (Unrestricted Execution)
`

const strategyCode = `
mindmap
  root((Agent Firewall 核心))
    Security Perimeter
      Zero-Trust Validation Standard
      Man-In-The-Middle Transparent Interception
      Granular Scope Control and Adaptive Limiter
    Twin-Turbo Analysis Base
      L1 Deterministic Static Matcher
      L2 Generative Semantic Profiler
      Live Configurable Rules Execution
    Omni-Observability Matrix
      Vue-backed Reactive Admin Dashboard
      Full-Duplex WS Event Broadcast
      Immutable JSONL Audit Logging Engine
    Evaluation and Adversarial Range
      Multi-modal Vector Injection Scenarios
      3D Assessment Grading
      Red-blue Tactical Iteration Protocol
`

onMounted(async () => {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  })
  
  await nextTick()
  
  try {
    if (archDiagram.value) {
      const { svg } = await mermaid.render('gArch', archCode)
      archDiagram.value.innerHTML = svg
    }
    
    if (engineDiagram.value) {
      const { svg } = await mermaid.render('gEngine', engineCode)
      engineDiagram.value.innerHTML = svg
    }
    
    if (strategyDiagram.value) {
      const { svg } = await mermaid.render('gStrategy', strategyCode)
      strategyDiagram.value.innerHTML = svg
    }
  } catch(e) {
    console.error('Mermaid render error:', e)
  }
})
</script>

<style scoped>
.schematic-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  color: var(--text-color, #e5e7eb);
}

.page-header {
  margin-bottom: 32px;
  border-bottom: 1px solid var(--border-color, #374151);
  padding-bottom: 16px;
}

.page-header h2 {
  font-size: 26px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-color, #f3f4f6);
  letter-spacing: 0.5px;
}

.subtitle {
  color: var(--text-muted, #9ca3af);
  font-size: 15px;
  margin: 0;
}

.diagrams-grid {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.diagram-card {
  background: var(--bg-surface, #1f2937);
  border: 1px solid var(--border-color, #374151);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s, box-shadow 0.2s;
}

.diagram-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.2);
}

.diagram-card h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
  color: var(--primary-color, #818cf8);
}

.diagram-card .desc {
  font-size: 14px;
  color: var(--text-muted, #9ca3af);
  margin-bottom: 24px;
}

.mermaid-container {
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-x: auto;
  background: #0f172a;  /* slightly darker to match mermaid dark theme */
  border-radius: 8px;
  padding: 30px;
  min-height: 250px;
  border: 1px solid rgba(255,255,255,0.05);
}

/* Deep override for mermaid SVGs to fit nicely without cutting off */
:deep(.mermaid-container svg) {
  max-width: 100%;
  height: auto;
  font-family: inherit !important;
}
</style>
