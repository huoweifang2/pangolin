# Feishu Integration (Gateway-First)

## Overview

Feishu capability is provided by the gateway and plugin toolchain, with TypeScript as the source of truth.

Runtime path:

1. Agent decides to call a tool.
2. Gateway resolves tool policy and plugin exposure.
3. Feishu tool implementation in `channel/feishu/src/` executes.
4. Result returns through gateway to the caller.

This removes duplicated Feishu tool logic across runtime surfaces.

## Source of Truth

- Feishu tool implementations: `channel/feishu/src/`
- Feishu skill definitions: `channel/feishu/skills/*/SKILL.md`
- Channel and plugin runtime wiring: `src/channels/`, `src/plugins/`
- Gateway HTTP tool endpoint: `POST /tools/invoke`

## Configuration

### 1. Enable Feishu plugin

In your Pangolin user config, ensure Feishu plugin entry is enabled and account credentials are configured.

Compatibility note: the config file path currently remains `~/.openclaw/openclaw.json`.

Example:

```json
{
  "plugins": {
    "entries": {
      "feishu": {
        "enabled": true
      }
    }
  },
  "feishu": {
    "accounts": {
      "default": {
        "appId": "cli_xxx",
        "appSecret": "xxx",
        "enabled": true
      }
    }
  }
}
```

### 2. Start runtime

```bash
pnpm gateway:dev
```

If you also need the web operations UI:

```bash
pnpm pangolin:frontend:dev
```

## Invocation Patterns

### Agent or session path

Prefer normal agent tool calls through existing session flows.

### HTTP automation path

Use gateway HTTP endpoint for controlled automation:

```bash
curl -X POST http://127.0.0.1:18789/tools/invoke \
  -H "Authorization: Bearer <gateway-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "feishu_doc",
    "action": "create",
    "args": {
      "title": "集成测试文档",
      "content": "hello from gateway-first integration"
    }
  }'
```

## Why this model

- Single implementation path for Feishu tools.
- Consistent behavior across channels and automation.
- Fewer integration bugs from duplicated registries.
- Easier policy control via gateway tool policy.

## Troubleshooting

### Tool cannot be found

- Verify Feishu plugin is enabled in user config.
- Restart gateway and inspect startup logs.

### Authentication failure on `/tools/invoke`

- Verify bearer token and gateway auth config.
- Confirm request targets the running gateway port.

### Feishu API errors

- Re-check app credentials and permission scopes.
- Verify tenant and domain configuration (Feishu vs Lark).

## Related Docs

- Channel guide: `docs/channels/feishu.md`
- Chinese channel guide: `docs/zh-CN/channels/feishu.md`
- Consolidation strategy: `docs/refactor/phase6-repo-consolidation.md`
