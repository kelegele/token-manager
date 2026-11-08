## 多 Agent 交接
- 开始时读取 HANDOVER.md 与对应任务记录，沿用原任务编号，登记负责人、目标和状态。
- 有进展、阻塞或用户新决定时更新任务记录；结束前补齐产物、证据、未完成项和下一步，在 HANDOVER.md 同步摘要和入口。
- 自动记录只反映会话状态。Agent 核对并填写业务结果；最终回复附记录路径，无法写入时标记「待同步」。

## ClawHub 发布
- 发布前必跑 `publish . --version X.Y.Z --dry-run --json` 核对 fileCount（应为 4：SKILL.md + 3 个核心脚本）；包排除用 `.clawhubignore`，scripts/ 子目录的本地工具须显式列出（agent_hook.py 曾混包导致重发 1.3.1）。
- 版本号一经发布不可覆盖（HTTP 400），发错只能递增重发；发布后 pending 扫描约 3-5 分钟，用 `clawhub install token-manager --dir /tmp/x` 验证包内容。
- clawhub 命令走代理：`HTTPS_PROXY=$(webget --proxy-url) npx -y clawhub@latest ...`；登录态已存（whoami=kelegele），skill-card.md 不进发布包（平台卡片存档）。

## 数据口径与测试
- 内置价格表为 2026-11-09 快照（manager.js DEFAULT_CONFIG）；更新价格查官方渠道：Kimi platform.kimi.com/docs（价格表数字须 wigolo extract mode:"tables"）、DeepSeek 仅 zh-cn 定价页、BIG3 走 openrouter.ai 厂商页；用户侧价格覆盖改 .data/config.json，不改源码。
- 测试 `node --test test/`：须设 TOKEN_MANAGER_DATA_DIR 隔离数据目录，全程不外联。
