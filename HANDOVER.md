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
├── SKILL.md            # skill 主文档，~150 行单语（v1.2.0 时 482 行双语）
├── skill-card.md       # 56 行，展示卡片文案（ClawHub 平台刷新，勿手改）
├── scripts/
│   ├── manager.js          # ~640 行，核心：report（命名参数）/tokens/balance/estimate/providers/history
│   ├── scheduler.js        # ~210 行，定时余额告警（阈值+冷却+币种符号）
│   └── session-tracker.js  # ~240 行，跨会话用量（sessions 单一真相源，币种分组）
├── test/smoke.test.js  # node --test 冒烟（11 测试）
├── _meta.json          # ClawHub 注册表元数据（ownerId/slug/version 1.2.0）
├── .clawhub/origin.json # 安装来源与 fingerprint，勿手改
└── HANDOVER.md         # 本文档
```

## 3. 已产出清单

- git 仓：commit `8d996f2`（v1.2.0 原样基线，路径为嵌套旧布局）→ `c63d961`（扁平化到根，内容同 v1.2.0）。diff 基线用 `git diff c63d961`。
- `3c07904`：交接模式（agent_hook.py/AGENTS.md/.agent-handoff.json，项目工具非 skill 内容，发布时排除）。
- `80345a4`（2026-11-09）：缺陷修复 + 价格刷新 + DeepSeek + SKILL.md 瘦身（详见 §3.1）。`node --test test/` 11/11 绿。

### §3.1 迭代记录（80345a4）

- 核心机制核查结论：balance/estimate 端点、数据结构均正确，缺陷在实现层。核查依据：Kimi 官方 API 一览/估价/余额文档（platform.kimi.com/docs，支持 URL+.md 直取 markdown，价格表数字只能 wigolo extract mode:"tables" 拿）、DeepSeek zh-cn 定价页与余额 API、BIG3 现价经 openrouter.ai 厂商页（第一方牌价）。
- A1 scheduler `nextCheck` 字符串拼接致 Invalid Date 崩溃 → 时间戳算术；A2 env 回退改为按 provider（ENV_KEYS 表）；A3 report 去 history 副作用；A4 价格只精确匹配、未知模型报错+列已知模型（绝不猜价）；A5 sessions 单一真相源、币种分组不混算、daily 废弃；A6 近似估算 CJK 0.6 token/字（官方口径 1 token≈1.5-2 汉字）+拉丁 /4；A7 新增 `tokens` CLI（官方 API 优先、无 key/失败回落本地）；A8 文档安全说法与代码一致。
- B1 价格表全部换 2026-11-09 现价：Kimi K3 系（k3.1-pro 13/26 等，K2 系标注 2026-12 下线）、DeepSeek flash 2/8 峰价、GPT-6.1 terra 1/5、Claude sonnet-5.5 2/10、haiku-5.5 0.1/0.5、opus-5.5 4/20、Gemini 4 argon 2/10、3.8 flash 0.75/3.75；B2 新增 deepseek provider（余额解析 balance_infos[0].total_balance）。
- C1 SKILL.md 482→~150 行单语；C2 多 agent 接入章节（OpenClaw cron + Claude Code/Codex/pi 通用）；D1 report 改命名参数；D2 .gitignore + test/smoke.test.js（11 测试，TOKEN_MANAGER_DATA_DIR 隔离数据目录）。
- API 变更点：`analyzeUsage(sessionData, provider)`（去 history 参数）、`getPricing` 未知模型返 null、`estimateCost` 可返 null、`formatAlert(balance, threshold, provider, currency)`、exports 增 approxTokens/getDefaultModel/getEnvKey/BALANCE_PARSERS。

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
