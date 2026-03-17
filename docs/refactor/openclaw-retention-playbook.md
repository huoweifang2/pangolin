# OpenClaw 功能保留执行手册

## 目标

本手册用于解决一个常见问题：仓库里还有 OpenClaw 残留痕迹，但希望保留 OpenClaw 的核心能力。

保留的对象应是能力，不是历史目录。

- 要保留：运行入口、网关、Agent、渠道、防火墙、技能体系
- 可选恢复：移动端、UI 工作区、Docker E2E 脚本

## 当前结论

当前仓库是 Core-Only 可运行状态：

- 核心模块存在：scripts/run-node.mjs、src/gateway、src/agents、src/channels、extensions/agent-firewall、skills
- 可选 legacy 面缺失：apps/\*、ui、scripts/e2e、部分 test:docker 脚本

## 当前决策

- 已确认采用路径 A（Core-Only）。
- 移动端、UI 工作区、Docker E2E 脚本不在当前阶段范围内。

### 路径 A 的执行基线（本仓库默认）

1. 诊断与运行：
   - pnpm openclaw:doctor
   - pnpm gateway:dev
   - pnpm test:fast
2. 聚合脚本按 Core-Only 收敛：
   - `format:all` 只执行 `format`
   - `lint:all` 只执行 `lint`
   - `test:all` 不再包含 docker/live 链路
   - `prepack` 不再依赖 `ui:build`
3. 如果未来要恢复 legacy 面，再走路径 B 并逐项恢复目录。

## 先跑诊断

在仓库根目录运行：

bash scripts/openclaw-doctor.sh

严格模式（有 warn 也失败）：

bash scripts/openclaw-doctor.sh --strict

诊断结果解读：

- CORE BROKEN：核心能力缺失，先修复核心路径
- CORE-ONLY MODE：核心能力可用，legacy 面缺失但不影响主链路
- FULL MODE：核心和 legacy 面都齐全

## 推荐执行路径

### 路径 A：保留核心能力（推荐）

适合当前仓库状态，优先保障可运行与可维护。

1. 继续使用核心入口：
   - node scripts/run-node.mjs --help
   - pnpm gateway:dev
   - pnpm test:fast
2. 避免运行依赖缺失目录的命令：
   - android:\*
   - ios:gen
   - test:ui
   - ui:\*
   - test:docker:\*
3. 在后续重构中，仅迁移与核心链路直接相关的能力。

### 路径 B：恢复完整 legacy 面

仅当你确实需要移动端/UI/Docker E2E 时执行。

1. 从你的 OpenClaw 基线来源恢复目录：
   - apps/android
   - apps/ios
   - apps/macos
   - ui
   - scripts/e2e 及缺失的 test docker 脚本
2. 每个目录恢复单独 PR，避免混改。
3. 每次恢复后运行：
   - bash scripts/openclaw-doctor.sh --strict

## 与重构计划的关系

- 本手册不改变 Phase 0 的冻结策略。
- 本手册定义了“如何在清理残留后保留 OpenClaw 功能”的操作方式。
- 当你决定走路径 B 时，再按目录逐项恢复，不要一次性回灌全部历史内容。
