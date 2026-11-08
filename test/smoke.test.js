// Token Manager 冒烟测试：node --test test/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// 独立数据目录（脚本在 require 时读取该环境变量），不污染真实 .data/
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'token-manager-test-'));
process.env.TOKEN_MANAGER_DATA_DIR = tmp;

const manager = require('../scripts/manager.js');
// patch 必须在 scheduler 加载前（scheduler 解构引用 exports 上的函数）
manager.queryBalance = async () => ({ success: true, balance: 0.5, currency: 'CNY' });
const scheduler = require('../scripts/scheduler.js');
const tracker = require('../scripts/session-tracker.js');

test('approxTokens: 中文按 0.6 token/字，拉丁按 4 字符/token', () => {
  assert.strictEqual(manager.approxTokens('你好世界'), 3);
  assert.strictEqual(manager.approxTokens('hello world'), 3);
});

test('getPricing: 精确匹配，未知模型返回 null（绝不猜价）', () => {
  const p = manager.getPricing('moonshot', 'kimi-k3.1-pro');
  assert.strictEqual(p.input, 13);
  assert.strictEqual(p.output, 26);
  assert.strictEqual(manager.getPricing('moonshot', 'kimi-k2.5-turbo'), null);
  assert.strictEqual(manager.getPricing('ollama').unit, 'FREE');
});

test('estimateCost: 数学正确，未知模型 → null', () => {
  const c = manager.estimateCost(1000000, 0, 'deepseek', 'deepseek-flash');
  assert.strictEqual(c.total, 2);
  assert.strictEqual(c.currency, 'CNY');
  assert.strictEqual(manager.estimateCost(1, 1, 'moonshot', 'nope'), null);
});

test('余额解析：moonshot/deepseek 官方响应样例', () => {
  const m = manager.BALANCE_PARSERS.moonshot({
    code: 0,
    data: { available_balance: 49.58894, voucher_balance: 46.58893, cash_balance: 3.00001 },
    status: true
  });
  assert.strictEqual(m.balance, 49.58894);
  assert.strictEqual(m.currency, 'CNY');

  const d = manager.BALANCE_PARSERS.deepseek({
    is_available: true,
    balance_infos: [{ currency: 'CNY', total_balance: '110.00', granted_balance: '10.00', topped_up_balance: '100.00' }]
  });
  assert.strictEqual(d.balance, 110);
  assert.strictEqual(d.isAvailable, true);
});

test('session-tracker: 分币种聚合，不混算', () => {
  tracker.recordSession({ provider: 'moonshot', model: 'kimi-k3.1-pro', tokensIn: 1000, tokensOut: 100, cost: 3, currency: 'CNY' });
  tracker.recordSession({ provider: 'openai', model: 'gpt-6.1-terra', tokensIn: 1000, tokensOut: 100, cost: 1, currency: 'USD' });
  const daily = tracker.generateDailyReport();
  assert.strictEqual(daily.success, true);
  assert.strictEqual(daily.summary.totalCost.CNY, 3);
  assert.strictEqual(daily.summary.totalCost.USD, 1);
  assert.strictEqual(daily.summary.totalTokens, 2200);
  assert.strictEqual(daily.summary.providers.moonshot.totalCost.CNY, 3);
});

test('calculateTrend: 全零成本不产生 NaN', () => {
  const trend = tracker.calculateTrend([
    { date: '2026-11-01', cost: 0, currency: 'CNY' },
    { date: '2026-11-02', cost: 0, currency: 'CNY' },
    { date: '2026-11-03', cost: 0, currency: 'CNY' }
  ]);
  assert.strictEqual(trend.CNY.direction, 'stable');
  assert.strictEqual(Number.isNaN(Number(trend.CNY.changePercent)), false);
});

test('calculateTrend: 成本上升能识别', () => {
  const trend = tracker.calculateTrend([
    { date: '2026-10-30', cost: 1, currency: 'CNY' },
    { date: '2026-10-31', cost: 1, currency: 'CNY' },
    { date: '2026-11-01', cost: 1, currency: 'CNY' },
    { date: '2026-11-02', cost: 1, currency: 'CNY' },
    { date: '2026-11-03', cost: 5, currency: 'CNY' }
  ]);
  assert.strictEqual(trend.CNY.direction, 'up');
});

test('scheduler: 冷却期内 nextCheck 不崩溃（A1 回归测试）', async () => {
  process.env.MOONSHOT_API_KEY = 'test-key'; // 有 key 才走到余额检查分支
  const state = {
    lastAlert: new Date(Date.now() - 60000).toISOString(), // 1 分钟前刚告警 → 冷却中
    alertCount: 1,
    lastBalance: 1,
    history: []
  };
  fs.writeFileSync(path.join(tmp, 'alert-state.json'), JSON.stringify(state));
  const r = await scheduler.checkAndAlert('moonshot', 5);
  assert.strictEqual(r.alert, false);
  assert.ok(r.nextCheck); // 修复前此处抛 RangeError: Invalid time value
});

test('formatAlert: 币种符号正确', () => {
  const cn = scheduler.formatAlert(0.5, 5, 'moonshot', 'CNY');
  assert.ok(cn.cn.includes('¥0.50'));
  const us = scheduler.formatAlert(0.5, 5, 'openai', 'USD');
  assert.ok(us.en.includes('$0.50'));
});

test('CLI e2e: report 命名参数（无 key，不外联）', () => {
  const { execFileSync } = require('node:child_process');
  const root = path.join(__dirname, '..');
  const out = execFileSync('node', [
    'scripts/manager.js', 'report',
    '--tokens-in', '1000', '--tokens-out', '50',
    '--provider', 'moonshot', '--model', 'kimi-k3.1-pro'
  ], {
    cwd: root,
    env: { ...process.env, MOONSHOT_API_KEY: '', DEEPSEEK_API_KEY: '', TOKEN_MANAGER_DATA_DIR: tmp }
  }).toString();
  const report = JSON.parse(out);
  assert.strictEqual(report.session.model, 'kimi-k3.1-pro');
  assert.ok(Math.abs(report.session.cost.total - 0.0143) < 1e-9);
  assert.strictEqual(report.session.cost.totalFormatted, '¥0.0143');
  assert.ok(report.balance.note); // 无 key → note 而非报错
});

test('CLI e2e: tokens 命令无 key 时本地兜底', () => {
  const { execFileSync } = require('node:child_process');
  const root = path.join(__dirname, '..');
  const out = execFileSync('node', [
    'scripts/manager.js', 'tokens', 'moonshot', '你好世界 hello'
  ], {
    cwd: root,
    env: { ...process.env, MOONSHOT_API_KEY: '', TOKEN_MANAGER_DATA_DIR: tmp }
  }).toString();
  const est = JSON.parse(out);
  assert.strictEqual(est.method, 'approximation');
  assert.strictEqual(est.total_tokens, 4); // 4*0.6 + 6/4 = 3.9 → 4
});
