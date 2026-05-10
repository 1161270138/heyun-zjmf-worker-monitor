const baseUrl = process.argv[2];
const adminToken = process.env.ADMIN_TOKEN || '';

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${adminToken}`,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

function required(name) {
  const value = process.env[name] || '';
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

if (!baseUrl) throw new Error('Missing worker URL');

const apiAccount = process.env.ZJMF_API_ACCOUNT || '';
const apiPassword = process.env.ZJMF_API_PASSWORD || '';
const serverId = process.env.ZJMF_SERVER_ID || '';

required('ZJMF_API_ACCOUNT');
required('ZJMF_API_PASSWORD');
required('ZJMF_SERVER_ID');

const provider = process.env.ZJMF_PROVIDER || 'heyunidc';
const serverIp = process.env.ZJMF_SERVER_IP || '';

await post('/api/admin/providers', {
  name: provider,
  display_name: process.env.ZJMF_PROVIDER_NAME || '核云',
  api_base_url: process.env.ZJMF_API_BASE_URL || 'https://www.heyunidc.cn/v1',
  api_account: apiAccount,
  api_password: apiPassword,
});

await post('/api/admin/servers', {
  id: serverId,
  name: process.env.ZJMF_SERVER_NAME || serverIp || serverId,
  ip: serverIp,
  provider,
  check_method: 'api_only',
  enabled: true,
  daily_reboot_limit: Number(process.env.ZJMF_DAILY_REBOOT_LIMIT || 3),
  scheduled_reboot: process.env.ZJMF_SCHEDULED_REBOOT || '',
});

if (process.env.PUSHPLUS_TOKEN) {
  await post('/api/admin/settings', {
    webhook_url: 'https://www.pushplus.plus/send',
    webhook_type: 'pushplus',
    pushplus_token: process.env.PUSHPLUS_TOKEN,
    timezone: process.env.TIMEZONE || 'Asia/Shanghai',
  });
}

const run = await post('/api/admin/run', {});
console.log(`Seed complete. Checked ${run.checked} server(s).`);
