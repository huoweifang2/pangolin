# Pangolin

Pangolin is a gateway-first runtime for multi-agent operations.

This repository combines:

- a TypeScript gateway and agent runtime,
- channel and plugin integrations,
- a Nuxt operations frontend (including MCP Firewall Ops views),
- security and audit guardrails for production use.

## Brand Theme

Pangolin frontend theme is derived from the icon at `public/pangolin.svg`.

- Brand anchor color: `#364548`
- Frontend public asset: `apps/pangolin-frontend/public/pangolin.svg`
- Theme implementation: Vuetify theme + global SCSS background system

The visual direction is earthy and security-focused, with:

- dark teal surfaces for dense operations views,
- sand accents for action highlights,
- textured gradient backgrounds to improve depth without reducing readability.

## Phase 6 Status (Repo Consolidation)

Phase 6 is focused on capability retention and path cleanup.

- Keep production capability in active runtime paths.
- Remove legacy path coupling from docs and scripts.
- Delete legacy directories only after measurable gates pass.

Use these gates before any structural deletion:

```bash
pnpm phase6:audit:legacy
pnpm phase6:audit:legacy:strict
```

## Core Architecture

### Runtime Core

- Gateway server and protocol handling: `src/gateway/`
- Agent runtime and policies: `src/agents/`
- Channel adapters and plugin wiring: `src/channels/`, `channel/`
- Security and audit utilities: `src/security/`
- Skills catalog and automation skills: `skills/`

### Frontend

- Pangolin frontend app: `apps/pangolin-frontend/`
- MCP Firewall page entry: `apps/pangolin-frontend/app/pages/mcp-firewall.vue`
- Firewall ops state model: `apps/pangolin-frontend/app/composables/useFirewallOpsConsole.ts`

## Quick Start (Core-Only Baseline)

1. Install dependencies.

```bash
pnpm install
```

2. Run capability doctor.

```bash
pnpm openclaw:doctor
```

Note: the `openclaw:*` script prefix is currently retained for backward compatibility.

3. One-click start the local stack.

```bash
pnpm pangolin:dev:all
```

4. Or start services manually in two terminals.

```bash
pnpm gateway:dev
```

```bash
pnpm pangolin:frontend:dev
```

5. Open the app (Nuxt default):

- http://localhost:3000
- MCP Firewall page: http://localhost:3000/mcp-firewall

## Firewall Ops Console

The frontend firewall ops console expects a firewall-compatible API base URL.

- Environment variable: `NUXT_PUBLIC_FIREWALL_API_BASE`
- Default: `http://localhost:9090`
- Dashboard stream endpoint: `<base>/ws/dashboard`

Example:

```bash
NUXT_PUBLIC_FIREWALL_API_BASE=http://127.0.0.1:9090 pnpm pangolin:frontend:dev
```

If the firewall API is unavailable, the page still renders but supplemental datasets and audit feeds will show connectivity errors.

## Common Commands

| Command                           | Purpose                                |
| --------------------------------- | -------------------------------------- |
| `pnpm gateway:dev`                | Start gateway in dev mode              |
| `pnpm gateway:dev:reset`          | Start gateway and reset runtime state  |
| `pnpm pangolin:dev:all`           | One-click start gateway + frontend     |
| `pnpm pangolin:frontend:dev`      | Start Nuxt frontend                    |
| `pnpm check`                      | Format check + type check + lint       |
| `pnpm test`                       | Run test suite                         |
| `pnpm openclaw:doctor`            | Validate core capability baseline      |
| `pnpm phase6:audit:legacy`        | Report legacy path references          |
| `pnpm phase6:audit:legacy:strict` | Fail when legacy path references exist |

## Capability Doctor Results

`pnpm openclaw:doctor` reports one of three states:

- `CORE BROKEN`: required capability paths are missing.
- `CORE-ONLY MODE`: core works; optional legacy surfaces are absent.
- `FULL MODE`: both core and optional legacy surfaces are present.

For the current consolidation stage, `CORE-ONLY MODE` is acceptable.

## Repository Layout (Condensed)

```text
.
├── agent-shield.mjs
├── package.json
├── apps/
│   └── pangolin-frontend/
├── channel/
│   └── feishu/
├── docs/
├── scripts/
├── skills/
├── src/
│   ├── agents/
│   ├── channels/
│   ├── gateway/
│   └── security/
└── test/
```

## Troubleshooting

### `pnpm openclaw:doctor` fails

- Fix missing required paths first.
- Re-run with strict mode only after warnings are addressed.

### Frontend shows no firewall supplement data

- Confirm `NUXT_PUBLIC_FIREWALL_API_BASE` points to a live service.
- Verify API health and WebSocket availability on that base URL.

### Legacy path audit still reports references

- Remove path literals in docs and script examples.
- Re-run `pnpm phase6:audit:legacy` until counts reach zero.

## License

MIT
