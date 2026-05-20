import assert from 'node:assert/strict';
import test from 'node:test';

import { Notifier, renderTemplate } from '../src/notifier.js';

test('renderTemplate 支持 {{message}} 和 $MSG', () => {
  assert.equal(renderTemplate('内容：{{message}}', { message: '测试' }), '内容：测试');
  assert.equal(renderTemplate('$MSG', { message: '测试' }), '测试');
});

test('custom webhook 发送通用 JSON 载荷', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response('{}', { status: 200 });
  };
  const notifier = new Notifier({ webhook_url: 'https://hook.example/send', webhook_type: 'custom' }, fetcher, () => 123456);

  const result = await notifier.send('标题', '消息', 'critical');
  assert.equal(result.ok, true);
  assert.equal(calls[0].url, 'https://hook.example/send');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    title: '标题',
    message: '消息',
    level: 'critical',
    timestamp: 123456,
  });
});

test('pushplus webhook 发送 token/title/content/template', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response('{"code":200}', { status: 200 });
  };
  const notifier = new Notifier({
    webhook_url: 'https://www.pushplus.plus/send',
    webhook_type: 'pushplus',
    pushplus_token: 'token-1',
  }, fetcher);

  const result = await notifier.send('Uptimer 告警', '服务器 DOWN', 'critical');
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    token: 'token-1',
    title: 'Uptimer 告警',
    content: '服务器 DOWN',
    template: 'txt',
  });
});

test('pushplus 未填写 Webhook URL 时自动使用固定地址', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response('{"code":200}', { status: 200 });
  };
  const notifier = new Notifier({
    webhook_type: 'pushplus',
    notify_token: 'token-1',
  }, fetcher);

  const result = await notifier.send('告警', '内容', 'critical');
  assert.equal(result.ok, true);
  assert.equal(calls[0].url, 'https://www.pushplus.plus/send');
});

test('更多通知渠道生成对应平台载荷', async () => {
  const cases = [
    {
      name: 'bark',
      settings: { webhook_type: 'bark', notify_token: 'bark-key' },
      url: 'https://api.day.app/bark-key',
      body: { title: '告警标题', body: '告警内容', level: 'critical' },
    },
    {
      name: 'telegram',
      settings: { webhook_type: 'telegram', notify_token: 'bot-token', notify_target: '10086' },
      url: 'https://api.telegram.org/botbot-token/sendMessage',
      body: { chat_id: '10086', text: '告警标题\n\n告警内容' },
    },
    {
      name: 'feishu',
      settings: { webhook_type: 'feishu', webhook_url: 'https://open.feishu.cn/hook' },
      url: 'https://open.feishu.cn/hook',
      body: { msg_type: 'text', content: { text: '告警标题\n\n告警内容' } },
    },
    {
      name: 'wecom',
      settings: { webhook_type: 'wecom', webhook_url: 'https://qyapi.weixin.qq.com/hook' },
      url: 'https://qyapi.weixin.qq.com/hook',
      body: { msgtype: 'text', text: { content: '告警标题\n\n告警内容' } },
    },
    {
      name: 'dingtalk',
      settings: { webhook_type: 'dingtalk', webhook_url: 'https://oapi.dingtalk.com/hook' },
      url: 'https://oapi.dingtalk.com/hook',
      body: { msgtype: 'text', text: { content: '告警标题\n\n告警内容' } },
    },
    {
      name: 'slack',
      settings: { webhook_type: 'slack', webhook_url: 'https://hooks.slack.com/services/1' },
      url: 'https://hooks.slack.com/services/1',
      body: { text: '告警标题\n\n告警内容' },
    },
    {
      name: 'discord',
      settings: { webhook_type: 'discord', webhook_url: 'https://discord.com/api/webhooks/1' },
      url: 'https://discord.com/api/webhooks/1',
      body: { content: '告警标题\n\n告警内容' },
    },
  ];

  for (const item of cases) {
    const calls = [];
    const fetcher = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response('{}', { status: 200 });
    };
    const result = await new Notifier(item.settings, fetcher).send('告警标题', '告警内容', 'critical');
    assert.equal(result.ok, true, item.name);
    assert.equal(calls[0].url, item.url, item.name);
    assert.deepEqual(JSON.parse(calls[0].init.body), item.body, item.name);
  }
});

test('custom webhook 支持 headers 和消息模板', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response('{}', { status: 200 });
  };
  const notifier = new Notifier({
    webhook_url: 'https://hook.example/send',
    webhook_type: 'custom',
    webhook_headers: '{ "X-Token": "abc" }',
    webhook_template: '标题={{title}} 内容={{message}} 等级={{level}}',
  }, fetcher, () => 123456);

  await notifier.send('标题', '消息', 'warning');
  assert.equal(calls[0].init.headers['X-Token'], 'abc');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    title: '标题',
    message: '标题=标题 内容=消息 等级=warning',
    level: 'warning',
    timestamp: 123456,
  });
});
