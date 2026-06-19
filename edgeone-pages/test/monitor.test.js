import assert from 'node:assert/strict';
import test from 'node:test';

import { runMonitorOnce } from '../src/monitor.js';
import { extractStatus } from '../src/zjmf-client.js';

class FakeRepo {
  constructor(data) {
    this.data = data;
    this.events = [];
  }

  async getSettings() { return this.data.settings; }
  async listEnabledServers() { return this.data.servers; }
  async getProvider(name) { return this.data.providers[name]; }
  async updateProvider(provider) { this.updatedProvider = { ...provider }; }
  async getRuntime(id) { return this.data.runtimes[id]; }
  async saveRuntime(id, runtime) { this.data.runtimes[id] = runtime; }
  async addEvent(event) { this.events.push(event); }
  async countRecentReboots(id, since) { this.recentRebootQuery = { id, since }; return this.data.recentReboots?.[id] ?? 0; }
  async addCheckResult(result) { this.lastCheckResult = result; }
}

const settings = {
  suspect_threshold: 3,
  reboot_cooldown: 300,
  recover_timeout: 300,
  default_daily_reboot_limit: 3,
  api_timeout: 60,
  timezone: 'Asia/Shanghai',
  check_interval: 300,
};

function suspectRuntime() {
  return {
    state: 'suspect',
    consecutive_failures: 2,
    consecutive_successes: 0,
    last_check_time: 0,
    last_reboot_time: 1000,
    reboot_count_today: 0,
    reboot_date: '',
    last_status_value: '',
    state_changed_at: 1000,
    first_failure_at: 1000,
    reboot_initiated_at: 0,
    scheduled_reboot_date: '',
  };
}

test('EdgeOne 兼容纯文本 on/off 状态', () => {
  assert.equal(extractStatus('on'), 'on');
  assert.equal(extractStatus(' off '), 'off');
});

test('EdgeOne HTTP+API 在 HTTP 失败但 API 为 on 时判定正常', async () => {
  const repo = new FakeRepo({
    settings,
    providers: { heyun: { name: 'heyun', api_base_url: 'https://api.example/v1', jwt_token: 'jwt', jwt_expire_at: 9999999999 } },
    servers: [{ id: '4075', name: '二步HTTP', provider: 'heyun', check_method: 'http_then_api', http_url: 'https://web.example/health', daily_reboot_limit: 3 }],
    runtimes: { 4075: suspectRuntime() },
  });
  const fetcher = async (url) => {
    if (String(url).includes('web.example')) return new Response('down', { status: 503 });
    if (String(url).includes('/module/status')) return new Response('on');
    return new Response(JSON.stringify({ jwt: 'jwt' }));
  };

  await runMonitorOnce({ repo, fetcher, now: 1778382000 });

  assert.equal(repo.data.runtimes['4075'].state, 'healthy');
  assert.equal(repo.data.runtimes['4075'].last_status_value, 'HTTP 503 -> on');
});

test('EdgeOne 三步检测在 HTTP TCP 失败但 API 为 on 时判定正常', async () => {
  const repo = new FakeRepo({
    settings,
    providers: { heyun: { name: 'heyun', api_base_url: 'https://api.example/v1', jwt_token: 'jwt', jwt_expire_at: 9999999999 } },
    servers: [{ id: '4075', name: '三步', provider: 'heyun', check_method: 'service_then_power', http_url: 'https://web.example/health', tcp_host: 'tcp.example', tcp_port: 996, daily_reboot_limit: 3 }],
    runtimes: { 4075: suspectRuntime() },
  });
  const calls = [];
  const fetcher = async (url) => {
    calls.push(String(url));
    if (String(url).includes('web.example')) return new Response('down', { status: 503 });
    if (String(url).includes('/module/status')) return new Response(JSON.stringify({ data: { status: 'on' } }));
    if (String(url).includes('/hard_reboot')) return new Response(JSON.stringify({ msg: '成功' }));
    return new Response(JSON.stringify({ jwt: 'jwt' }));
  };

  await runMonitorOnce({ repo, fetcher, tcpConnector: async () => false, now: 1778382000 });

  assert.equal(repo.data.runtimes['4075'].state, 'healthy');
  assert.equal(calls.some((url) => url.includes('/hard_reboot')), false);
});

test('EdgeOne 三步检测在 HTTP 正常但 API 为 off 时执行开机', async () => {
  const repo = new FakeRepo({
    settings,
    providers: { heyun: { name: 'heyun', api_base_url: 'https://api.example/v1', jwt_token: 'jwt', jwt_expire_at: 9999999999 } },
    servers: [{ id: '4075', name: '三步', provider: 'heyun', check_method: 'service_then_power', http_url: 'https://web.example/health', tcp_host: 'tcp.example', tcp_port: 996, daily_reboot_limit: 3 }],
    runtimes: { 4075: suspectRuntime() },
  });
  const calls = [];
  const fetcher = async (url) => {
    calls.push(String(url));
    if (String(url).includes('web.example')) return new Response('ok', { status: 200 });
    if (String(url).includes('/module/status')) return new Response(JSON.stringify({ data: { status: 'off' } }));
    if (String(url).includes('/module/on')) return new Response(JSON.stringify({ msg: '成功' }));
    return new Response(JSON.stringify({ jwt: 'jwt' }));
  };

  await runMonitorOnce({ repo, fetcher, tcpConnector: async () => false, now: 1778382000 });

  assert.equal(calls.some((url) => url.includes('/module/on')), true);
  assert.equal(calls.some((url) => url.includes('/hard_reboot')), false);
  assert.equal(repo.data.runtimes['4075'].state, 'recovering');
});

test('EdgeOne 三步检测在 TCP 正常但 API 失败时判定异常且不误发命令', async () => {
  const repo = new FakeRepo({
    settings,
    providers: { heyun: { name: 'heyun', api_base_url: 'https://api.example/v1', jwt_token: 'jwt', jwt_expire_at: 9999999999 } },
    servers: [{ id: '4075', name: '三步', provider: 'heyun', check_method: 'service_then_power', http_url: 'https://web.example/health', tcp_host: 'tcp.example', tcp_port: 996, daily_reboot_limit: 3 }],
    runtimes: { 4075: suspectRuntime() },
  });
  const calls = [];
  const fetcher = async (url) => {
    calls.push(String(url));
    if (String(url).includes('web.example')) return new Response('forbidden', { status: 403 });
    if (String(url).includes('/module/status')) return new Response('timeout', { status: 522 });
    if (String(url).includes('/module/on')) return new Response(JSON.stringify({ msg: '成功' }));
    if (String(url).includes('/hard_reboot')) return new Response(JSON.stringify({ msg: '成功' }));
    return new Response(JSON.stringify({ jwt: 'jwt' }));
  };

  await runMonitorOnce({ repo, fetcher, tcpConnector: async () => true, now: 1778382000 });

  assert.equal(repo.data.runtimes['4075'].state, 'down');
  assert.equal(repo.data.runtimes['4075'].last_status_value, 'HTTP 403 -> TCP 996 open -> ERROR: HTTP 522');
  assert.equal(calls.some((url) => url.includes('/module/on')), false);
  assert.equal(calls.some((url) => url.includes('/hard_reboot')), false);
});

test('EdgeOne API 请求失败时返回 null 且不推进异常计数', async () => {
  const repo = new FakeRepo({
    settings,
    providers: { heyun: { name: 'heyun', api_base_url: 'https://api.example/v1', jwt_token: 'jwt', jwt_expire_at: 9999999999 } },
    servers: [{ id: '4075', name: 'API', provider: 'heyun', check_method: 'api_only', daily_reboot_limit: 3 }],
    runtimes: { 4075: null },
  });
  const fetcher = async (url) => {
    if (String(url).includes('/module/status')) throw new Error('network down');
    return new Response(JSON.stringify({ jwt: 'jwt' }));
  };

  await runMonitorOnce({ repo, fetcher, now: 1778382000 });

  assert.equal(repo.data.runtimes['4075'].state, 'healthy');
  assert.equal(repo.events.length, 0);
});

test('EdgeOne 勾选失败阶段静默后只推送触发开机通知', async () => {
  const repo = new FakeRepo({
    settings: { ...settings, notify_failure_silence: true, webhook_url: 'https://hook.example/send', webhook_type: 'custom' },
    providers: { heyun: { name: 'heyun', api_base_url: 'https://api.example/v1', jwt_token: 'jwt', jwt_expire_at: 9999999999 } },
    servers: [{ id: '4075', name: 'API', provider: 'heyun', check_method: 'tcp_then_api', tcp_host: 'tcp.example', tcp_port: 996, daily_reboot_limit: 3 }],
    runtimes: { 4075: { ...suspectRuntime(), consecutive_failures: 2, last_reboot_time: 0 } },
  });
  const hookBodies = [];
  const fetcher = async (url, init) => {
    if (String(url) === 'https://hook.example/send') {
      hookBodies.push(JSON.parse(init.body));
      return new Response('{}');
    }
    if (String(url).includes('/module/status')) return new Response('off');
    return new Response(JSON.stringify({ jwt: 'jwt' }));
  };

  await runMonitorOnce({ repo, fetcher, tcpConnector: async () => false, now: 1100 });

  assert.deepEqual(repo.events.map((event) => event.label), ['确认宕机', '触发开机', '开机指令已发送']);
  assert.deepEqual(hookBodies.map((body) => body.title), ['【严重】API - 触发开机']);
});

test('EdgeOne 默认按每小时统计重启次数', async () => {
  const repo = new FakeRepo({
    settings: { ...settings, reboot_limit_window: 'hour' },
    providers: { heyun: { name: 'heyun', api_base_url: 'https://api.example/v1', jwt_token: 'jwt', jwt_expire_at: 9999999999 } },
    servers: [{ id: '4075', name: 'API', provider: 'heyun', check_method: 'api_only', daily_reboot_limit: 3 }],
    runtimes: { 4075: { ...suspectRuntime(), last_reboot_time: 0 } },
    recentReboots: { 4075: 1 },
  });
  const fetcher = async (url) => {
    if (String(url).includes('/module/status')) return new Response('off');
    if (String(url).includes('/power_on')) return new Response(JSON.stringify({ msg: '成功' }));
    return new Response(JSON.stringify({ jwt: 'jwt' }));
  };

  await runMonitorOnce({ repo, fetcher, now: 1778382000 });

  assert.equal(repo.recentRebootQuery.since, 1778382000 - 3600);
});

test('EdgeOne 重启上限由管理面板设置决定', async () => {
  const repo = new FakeRepo({
    settings: { ...settings, default_daily_reboot_limit: 1, reboot_limit_window: 'hour' },
    providers: { heyun: { name: 'heyun', api_base_url: 'https://api.example/v1', jwt_token: 'jwt', jwt_expire_at: 9999999999 } },
    servers: [{ id: '4075', name: 'API', provider: 'heyun', check_method: 'api_only', daily_reboot_limit: 99 }],
    runtimes: { 4075: { ...suspectRuntime(), last_reboot_time: 0 } },
    recentReboots: { 4075: 1 },
  });
  const calls = [];
  const fetcher = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/module/status')) return new Response('off');
    if (String(url).includes('/power_on')) return new Response(JSON.stringify({ msg: '成功' }));
    return new Response(JSON.stringify({ jwt: 'jwt' }));
  };

  await runMonitorOnce({ repo, fetcher, now: 1778382000 });

  assert.equal(repo.recentRebootQuery.since, 1778382000 - 3600);
  assert.equal(calls.some((url) => url.includes('/power_on')), false);
});
