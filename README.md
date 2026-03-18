# Pangolin

Pangolin is a full-stack, secure Multi-Agent Gateway and Firewall Runtime.

It combines a **TypeScript connection gateway and operations frontend** with a powerful **Python-based ML Security Engine** (integrated from `ai-protector`). This repository serves as the definitive hub for building, securing, and operating multi-agent operations and MCP tools in production.

## 🛡️ Core Capabilities

Pangolin unifies two distinct planes of execution:

### 1. Advanced ML Security Engine (Python)

Ported directly from the industry-standard AI Protector, the Pangolin engine deeply sanitizes both raw LLM traffic and granular MCP tool execution:

- **Proxy Firewall (5-Layer Pipeline)**: A LangGraph-powered evaluation pipeline (Static Rules → Semantic Intent → LLM Guard → Presidio PII Redaction → NeMo Guardrails). Native proxy endpoints (e.g., `openai_adapter.py`) ensure safe upstreams.
- **Agent Runtime Gates**:
  - **RBAC**: Strict role-based access control for individual MCP tools.
  - **Budget & Limits**: Token, cost, and rate-limit tracking to prevent abuse.
  - **Schema Validation**: Pydantic-powered tool argument validation and runtime injection sanitization.
- **Native Interception**: All MCP `tools/call` events are intercepted upstream, parsed, and scrubbed through the engine before reaching the agent.

### 2. Operations & Gateway (TypeScript)

- **Channel & Plugin Integrations**: Seamlessly hook into Feishu, Slack, and other enterprise channels.
- **MCP & Automation Skills**: Extensible skill catalog designed for rapid tool deployment.
- **Nuxt Operations Frontend**: A rich dashboard (`apps/pangolin-frontend`) featuring real-time MCP Firewall streams and operations views.

## 🎨 Brand Theme

The Pangolin frontend theme is derived from the icon at `public/pangolin.svg`.

- Brand anchor color: `#364548`
- The visual direction is earthy and security-focused: dark teal surfaces for dense operations views, sand accents for action highlights, and textured gradient backgrounds.

## 🏗️ Architecture Layout

```text
.
├── apps/
│   └── pangolin-frontend/   # Nuxt 3 Operations Dashboard & Firewall UI
├── channel/                 # Channel integrations (e.g., Feishu)
├── skills/                  # Automation skills and legacy MCP wiring
├── src/
│   ├── engine/              # (Python) ML Engine, LangGraph Pipeline, Interceptor, Agent Gates
│   ├── proxy/               # (Python) OpenAI / SSE Adapters for LLM proxy traffic
│   ├── gateway/             # (TypeScript) Core gateway and protocol handling
│   └── security/            # (TypeScript) Audit utilities and dashboards
├── package.json             # Node dependencies (pnpm)
└── pyproject.toml           # Python dependencies (uv)
```

## 🚀 Quick Start

Pangolin requires both Node.js (`pnpm`) for the gateway/frontend and Python (`uv`) for the ML Security Engine.

### 1. Install Dependencies

**TypeScript Gateway & Frontend:**

```bash
pnpm install
```

**Python Security Engine:**

```bash
uv sync
```

### 2. Start the Stack

**Terminal A: Python ML Engine (Firewall & Proxy)**

```bash
uv run python src/main.py
```

_The engine typically listens on port `9090`. Health check: `curl http://127.0.0.1:9090/health`_

**Terminal B: TypeScript Gateway / Frontend**
You can use the multi-service dev command:

```bash
pnpm pangolin:dev:all
```

Or start them individually:

```bash
pnpm gateway:dev
pnpm pangolin:frontend:dev
```

### 3. Access the Dashboard

- Operations Hub: http://localhost:3000
- MCP Firewall Page: http://localhost:3000/mcp-firewall

_(Ensure `NUXT_PUBLIC_FIREWALL_API_BASE=http://localhost:9090` is set so the frontend can stream live audit data from the Python Engine)._

## 🧪 Phase 6 Consolidation & Doctor

Phase 6 focuses on capability retention and removing legacy coupling:

- Keep production capability in active runtime paths.
- Run `pnpm openclaw:doctor` to validate the core capability baseline.
- Expected state is `CORE-ONLY MODE` or `FULL MODE`.
- Run audits via `pnpm phase6:audit:legacy` to ensure structural paths are fully migrated.

## License

MIT
