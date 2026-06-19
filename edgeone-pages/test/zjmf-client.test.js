import assert from 'node:assert/strict';
import test from 'node:test';

import { ZjmfClient } from '../src/zjmf-client.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('核云 API 请求默认使用同区解析覆盖避开 522 链路', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('login_api')) return jsonResponse({ jwt: 'token-override' });
    return jsonResponse({ data: { status: 'off' } });
  };
  const provider = { api_base_url: 'https://www.heyunidc.cn/v1', api_account: 'acct', api_password: 'key' };

  const client = new ZjmfClient(provider, fetcher, 60);
  assert.equal(await client.getStatus('4075', 1000), 'off');
  assert.equal(calls[0].init.cf.resolveOverride, 'heyun-origin.jk.webf.top');
  assert.equal(calls[1].init.cf.resolveOverride, 'heyun-origin.jk.webf.top');
});
