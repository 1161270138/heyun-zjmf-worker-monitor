import assert from 'node:assert/strict';
import test from 'node:test';

import { KVRepository } from '../src/kv-repository.js';

class MemoryKV {
  constructor() {
    this.map = new Map();
  }

  async get(key) {
    return this.map.get(key) || null;
  }

  async put(key, value) {
    this.map.set(key, value);
  }
}

test('KVRepository 保存服务商、服务器和设置', async () => {
  const repo = new KVRepository(new MemoryKV());
  await repo.setSetting('setup_completed', '1');
  await repo.upsertProvider({
    name: 'heyunidc',
    display_name: '核云',
    api_base_url: 'https://api.example/v1',
    api_account: 'account',
    api_password: 'secret',
  }, 100);
  await repo.upsertServer({
    id: '1001',
    name: '测试服务器',
    provider: 'heyunidc',
    check_method: 'api_only',
    enabled: true,
  }, 100);

  assert.equal(await repo.getSetting('setup_completed'), '1');
  assert.equal((await repo.listProviders())[0].name, 'heyunidc');
  assert.equal((await repo.listEnabledServers())[0].id, 'heyunidc:1001');
  assert.equal((await repo.listEnabledServers())[0].host_id, '1001');
});

test('KVRepository 生成状态页所需历史和事件', async () => {
  const repo = new KVRepository(new MemoryKV());
  await repo.addCheckResult({ server_id: '1001', ok: true, latency_ms: 23, created_at: 1700000000 });
  await repo.addEvent({ server_id: '1001', old_state: 'healthy', new_state: 'suspect', label: '检测异常', level: 'warning', message: '异常', created_at: 1700000000 });

  const recent = await repo.listRecentChecks('1001');
  const daily = await repo.listDailyHistory(['1001'], 30, 1700000300);
  const events = await repo.listPublicEvents(['1001']);

  assert.equal(recent[0].ok, true);
  assert.equal(daily.get('1001')[0].checks, 1);
  assert.equal(events.get('1001')[0].label, '检测异常');
});
