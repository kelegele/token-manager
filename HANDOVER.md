# HANDOVER — token-manager skill 迭代

## 0. 启动与坑位（先读）

- 新会话启动：`cd ~/Projects/token-manager && pi`。若续接会话 cwd 落在别处（如 `~`），cd 过来再干活。
- clawhub CLI 不装全局，用 `npx -y clawhub@latest <cmd>`。
- Agent 非交互 bash 无代理环境变量：npm/npx 网络卡住时用 `HTTPS_PROXY=$(webget --proxy-url) npx ...`（`webget` 在 `~/bin/webget`）。
- GitHub 已登录为 `kelegele`（gh CLI keyring）；ClawHub 账号同为 `kelegele`，但 clawhub CLI 尚未 login（publish 前需 device flow 登录一次）。

## 1. 背景与去向

- 目标对象：线上 skill `https://clawhub.ai/kelegele/skills/token-manager`（v1.2.0，latest）。此前本地与 GitHub 均无副本。
- 用户意图：把该 skill 迁到本地迭代，之后发新版本回 ClawHub。
- 迁移去向：本目录 `~/Projects/token-manager`（git 仓，skill 位于根目录，扁平结构，方便直接编辑与 publish）。
- 旧中间目录 `~/Projects/clawhub-skills` 已 `mv` 为本目录，无残留副本。

## 2. 目录地图

```
~/Projects/token-manager/
├── SKILL.md            # skill 主文档，482 行（frontmatter name/description + 功能说明）
├── skill-card.md       # 56 行，展示卡片文案
├── scripts/
│   ├── manager.js          # 585 行，核心：report/监控/成本建议
│   ├── scheduler.js        # 205 行，定时余额告警（P0）
│   └── session-tracker.js  # 272 行，跨会话用量追踪
├── _meta.json          # ClawHub 注册表元数据（ownerId/slug/version 1.2.0）
├── .clawhub/origin.json # 安装来源与 fingerprint，勿手改
└── HANDOVER.md         # 本文档
```

## 3. 已产出清单

- git 仓：commit `8d996f2`（v1.2.0 原样基线，路径为嵌套旧布局）→ `c63d961`（扁平化到根，内容同 v1.2.0）。diff 基线用 `git diff c63d961`。
- 无代码改动、无 GitHub 远端（可选，见 §6）。

## 4. 数据口径与勿动约定

- 线上 latest = **1.2.0**（Updated 2026-05-11，Moderate: CLEAN，License MIT-0）。
- `.clawhub/origin.json` 与 `_meta.json` 是 ClawHub 工具链状态：不手改、不删（发布/更新比对要用）。
- skill 功能口径（来自 SKILL.md）：LLM token 用量监控 + 省钱建议，支持 Kimi/OpenAI/Anthropic/Gemini/本地模型；P0 定时告警、P1 OpenClaw 内置工具注册、P2 跨会话分析。
- 运行时依赖 env：`MOONSHOT_API_KEY` 等（SKILL.md Quick Start 所列）；本机未配置，静态检查用 `node --check scripts/*.js`。

## 5. 迭代与发布流程

1. 改 `SKILL.md` / `scripts/*.js`，常规 git 提交。
2. 验证：`node --check scripts/*.js`；功能测试需配 API key 后手动跑 `node scripts/manager.js report ...`（参数见 SKILL.md）。
3. 发布：`npx -y clawhub@latest publish --help` 先看参数（publish 子命令存在但本次未实跑过，参数以 help 为准）；首次发布先 `npx -y clawhub@latest login`（device flow，浏览器确认一次），`whoami` 验证。
4. 发布后线上版本号应递增（当前 1.2.0 → 1.2.1/1.3.0），用 `clawhub inspect kelegele/token-manager` 核对。

## 6. 可继续方向（未指派，候选）

- 读 SKILL.md 全文找改进点后迭代（用户尚未说改什么——这是第一件要做的事：问用户迭代目标）。
- 可选：`gh repo create kelegele/token-manager --private` 推远端备份（用户之前未拍板）。
- 可选：Skill 文件结构与 pi/claude 等本地 agent 的 `~/.agents/skills` 联动安装测试。

## 7. 协作红线

- 遵循 `/Users/fh/AGENTS.md` 全局规范（迁移交接、代理环境、删除须确认等）。
- 不动 `.clawhub/`、`_meta.json`；发布前必 diff 基线确认改动范围。
